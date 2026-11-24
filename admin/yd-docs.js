/* YD Works documents: GST invoices and quotes, as on-screen HTML and as PDF (jsPDF).
 * One layout shared by the customer app and the console, so a customer's invoice and the
 * counter's copy are identical. Exposes window.YDDOCS.
 */
(function () {
  "use strict";
  const COMPANY = { name: "YD Works", line2: "Hulhumalé, Maldives", phone: "992 0202", email: "yd@yd-mv.com", web: "www.yd-mv.com" };
  const mvr = n => "MVR " + (Math.round(+n * 100) / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  // the PDF font covers Latin-1 (é, ³, ·); anything else is simplified
  const plain = s => String(s == null ? "" : s).replace(/•/g, "·").replace(/[–—]/g, "-").replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/[^\x20-\x7E\xA0-\xFF]/g, "");
  const dmy = t => new Date(t || Date.now()).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

  // normalise an order from the apps (toJob) or the console into one shape
  function invoiceData(o, settings) {
    const pr = (settings && settings.pricing) || {};
    const rate = pr.gst_rate != null ? +pr.gst_rate : 0.08;
    const lines = (o.lines || []).map(l => Array.isArray(l) ? { label: l[0], qty: +l[1], price: +l[2] } : { label: l.label, qty: +l.qty, price: +(l.unit_price ?? l.price) });
    const total = o.total != null ? +o.total : lines.reduce((s, l) => s + l.qty * l.price, 0);
    const gst = o.gst != null ? +o.gst : Math.round(total * rate / (1 + rate) * 100) / 100;
    return {
      kind: "invoice", no: o.invoiceNo || o.invoice_no || ("PRO-" + (o.id || o.ref || "")), ref: o.id && String(o.id).startsWith("YD-") ? o.id : o.ref,
      date: o.doneAt || o.completed_at || o.createdAt || o.created_at || Date.now(),
      customer: (o.customer && o.customer.name) || o.customer || o.customer_name || "", phone: (o.customer && o.customer.phone) || o.phone || o.customer_phone || "",
      site: o.site || "", lines, total, gst, net: total - gst, rate,
      paid: (o.paymentStatus || o.payment_status) === "paid", method: o.paymentMethod || o.payment_method || "cod",
      proforma: !(o.invoiceNo || o.invoice_no)
    };
  }
  function quoteData(q) {
    const lines = (q.lines || []).map(l => ({ label: l.label, qty: +l.qty, price: +(l.unit_price ?? l.price) }));
    const total = lines.reduce((s, l) => s + l.qty * l.price, 0);
    return { kind: "quote", no: q.ref, date: q.created_at || Date.now(), valid: q.valid_until, customer: q.customer_name, phone: q.phone, site: q.site, lines, total, notes: q.notes || "" };
  }
  const METHOD = { cod: "Cash on delivery", cash: "Cash", card: "Card (BML)", transfer: "Bank transfer" };

  // on-screen document; host page supplies colours via its own tokens
  function html(d) {
    const title = d.kind === "quote" ? "Quotation" : d.proforma ? "Pro-forma invoice" : "Tax invoice";
    return `<div class="yd-doc" style="font-variant-numeric:tabular-nums">
      <div style="display:flex;justify-content:space-between;gap:16px;align-items:flex-start;flex-wrap:wrap">
        <div><b style="font-size:18px;letter-spacing:-.02em">${COMPANY.name}</b><div style="opacity:.7;font-size:13px">${COMPANY.line2}<br>${COMPANY.phone} · ${COMPANY.email}</div></div>
        <div style="text-align:right"><div style="font:500 11px var(--mono,monospace);letter-spacing:.12em;text-transform:uppercase;opacity:.7">${title}</div><b style="font-family:var(--mono,monospace)">${esc(d.no)}</b><div style="opacity:.7;font-size:13px">${dmy(d.date)}${d.valid ? " · valid until " + dmy(d.valid) : ""}</div></div>
      </div>
      <div style="margin-top:16px;font-size:14px"><span style="opacity:.7">Bill to</span><br><b>${esc(d.customer)}</b>${d.phone ? " · " + esc(d.phone) : ""}${d.site ? "<br>" + esc(d.site) : ""}${d.ref ? `<br><span style="opacity:.7">Order ${esc(d.ref)}</span>` : ""}</div>
      <table style="width:100%;border-collapse:collapse;margin-top:16px;font-size:13.5px">
        <thead><tr style="text-align:left;opacity:.7;font-size:11px;letter-spacing:.08em;text-transform:uppercase"><th style="padding:8px 0">Item</th><th style="text-align:right">Qty</th><th style="text-align:right">Rate</th><th style="text-align:right">Amount</th></tr></thead>
        <tbody>${d.lines.map(l => `<tr style="border-top:1px solid rgba(127,127,127,.25)"><td style="padding:8px 8px 8px 0">${esc(l.label)}</td><td style="text-align:right">${l.qty}</td><td style="text-align:right">${mvr(l.price)}</td><td style="text-align:right">${mvr(l.qty * l.price)}</td></tr>`).join("")}</tbody>
      </table>
      <div style="margin-top:12px;border-top:1px solid rgba(127,127,127,.35);padding-top:10px;display:grid;gap:4px;font-size:14px">
        ${d.kind === "invoice" ? `<div style="display:flex;justify-content:space-between"><span style="opacity:.7">Amount before GST</span><span>${mvr(d.net)}</span></div><div style="display:flex;justify-content:space-between"><span style="opacity:.7">GST ${Math.round(d.rate * 1000) / 10}% (included)</span><span>${mvr(d.gst)}</span></div>` : ""}
        <div style="display:flex;justify-content:space-between;font-weight:600;font-size:16px"><span>Total</span><span>${mvr(d.total)}</span></div>
        ${d.kind === "invoice" ? `<div style="opacity:.7;font-size:12.5px">${d.paid ? "Paid" : "Payment due"} · ${METHOD[d.method] || d.method}</div>` : ""}
        ${d.notes ? `<div style="opacity:.75;font-size:12.5px;margin-top:6px">${esc(d.notes)}</div>` : ""}
      </div>
    </div>`;
  }

  let jsPdfLoading = null;
  function loadJsPdf() {
    if (window.jspdf) return Promise.resolve(window.jspdf.jsPDF);
    if (jsPdfLoading) return jsPdfLoading;
    jsPdfLoading = new Promise((res, rej) => {
      const s = document.createElement("script");
      s.src = window.YD_JSPDF_SRC || "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
      s.onload = () => res(window.jspdf.jsPDF); s.onerror = () => rej(new Error("PDF library unavailable")); document.head.appendChild(s);
    });
    return jsPdfLoading;
  }

  async function pdf(d) {
    const JsPDF = await loadJsPdf();
    const doc = new JsPDF({ unit: "pt", format: "a4" });
    const W = 595, L = 48, R = W - 48; let y = 60;
    doc.setFillColor(31, 75, 255); doc.roundedRect(L, y - 22, 30, 30, 6, 6, "F");
    doc.setTextColor(255); doc.setFont("helvetica", "bold"); doc.setFontSize(15); doc.text("Y", L + 15, y - 1.5, { align: "center" });
    doc.setTextColor(10, 16, 34); doc.setFontSize(16); doc.text(COMPANY.name, L + 40, y - 6);
    doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(93, 102, 121);
    doc.text(plain(`${COMPANY.line2}  |  ${COMPANY.phone}  |  ${COMPANY.email}  |  ${COMPANY.web}`), L + 40, y + 7);
    const title = d.kind === "quote" ? "QUOTATION" : d.proforma ? "PRO-FORMA INVOICE" : "TAX INVOICE";
    doc.setFontSize(9); doc.text(title, R, y - 10, { align: "right" });
    doc.setTextColor(10, 16, 34); doc.setFont("courier", "bold"); doc.setFontSize(12); doc.text(plain(d.no), R, y + 4, { align: "right" });
    doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(93, 102, 121);
    doc.text(plain(dmy(d.date) + (d.valid ? "   valid until " + dmy(d.valid) : "")), R, y + 17, { align: "right" });
    y += 56;
    doc.text("BILL TO", L, y); y += 14;
    doc.setTextColor(10, 16, 34); doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.text(plain(d.customer || "-"), L, y);
    doc.setFont("helvetica", "normal"); doc.setFontSize(9.5); doc.setTextColor(93, 102, 121);
    const sub = [d.phone, d.site, d.ref ? "Order " + d.ref : ""].filter(Boolean).map(plain).join("   |   ");
    if (sub) { y += 13; doc.text(sub, L, y); }
    y += 26;
    // table
    doc.setFillColor(240, 242, 246); doc.rect(L, y - 12, R - L, 20, "F");
    doc.setFontSize(8.5); doc.setTextColor(93, 102, 121);
    doc.text("ITEM", L + 8, y + 1); doc.text("QTY", 360, y + 1, { align: "right" }); doc.text("RATE (MVR)", 450, y + 1, { align: "right" }); doc.text("AMOUNT (MVR)", R - 8, y + 1, { align: "right" });
    y += 22; doc.setFontSize(10); doc.setTextColor(10, 16, 34);
    const n2 = v => (Math.round(v * 100) / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    for (const l of d.lines) {
      if (y > 740) { doc.addPage(); y = 60; }
      const lab = doc.splitTextToSize(plain(l.label), 280);
      doc.text(lab, L + 8, y); doc.text(String(l.qty), 360, y, { align: "right" }); doc.text(n2(l.price), 450, y, { align: "right" }); doc.text(n2(l.qty * l.price), R - 8, y, { align: "right" });
      y += 14 * lab.length + 6; doc.setDrawColor(228, 231, 238); doc.line(L, y - 10, R, y - 10);
    }
    y += 8; doc.setFontSize(10);
    const row = (a, b, bold) => { doc.setFont("helvetica", bold ? "bold" : "normal"); doc.setTextColor(bold ? 10 : 93, bold ? 16 : 102, bold ? 34 : 121); doc.text(a, 360, y); doc.text(b, R - 8, y, { align: "right" }); y += bold ? 20 : 15; };
    if (d.kind === "invoice") { row("Amount before GST", "MVR " + n2(d.net)); row(`GST ${Math.round(d.rate * 1000) / 10}% (included)`, "MVR " + n2(d.gst)); }
    doc.setFontSize(12); row("Total", "MVR " + n2(d.total), true);
    doc.setFontSize(9.5); doc.setFont("helvetica", "normal"); doc.setTextColor(93, 102, 121);
    if (d.kind === "invoice") doc.text(plain(`${d.paid ? "PAID" : "PAYMENT DUE"}  -  ${METHOD[d.method] || d.method}`), L, y - 20);
    if (d.notes) { y += 10; doc.text(doc.splitTextToSize(plain(d.notes), R - L), L, y); }
    doc.setFontSize(8.5); doc.text(plain(`Thank you for building with ${COMPANY.name}. Questions? Call ${COMPANY.phone}.`), L, 800);
    return doc;
  }

  // save/share: native apps use the share sheet; browsers download
  async function save(doc, filename) {
    const C = window.Capacitor;
    if (C && C.isNativePlatform && C.isNativePlatform()) {
      const FS = C.registerPlugin("Filesystem"), Share = C.registerPlugin("Share");
      const data = doc.output("datauristring").split(",")[1];
      const w = await FS.writeFile({ path: filename, data, directory: "CACHE" });
      await Share.share({ title: filename, url: w.uri });
      return "shared";
    }
    doc.save(filename);
    return "downloaded";
  }

  window.YDDOCS = {
    invoiceData, quoteData, html,
    async invoicePdf(order, settings) { const d = invoiceData(order, settings); return save(await pdf(d), `${d.no}.pdf`); },
    async quotePdf(quote) { const d = quoteData(quote); return save(await pdf(d), `${d.no}.pdf`); },
    _pdf: pdf
  };
})();
