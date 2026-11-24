# YD Works – website, customer app, driver app

- `website/index.html` – marketing site (equipment hire, materials estimator, house building, logistics, quote form)
- `customer-app/index.html` – customer app (book machines, order materials, live tracking)
- `driver-app/index.html` – driver app (job requests, trip steps, photo + signature proof, checklist, earnings)

Run locally so the two apps share live orders:

    python3 -m http.server 8080
    # open http://localhost:8080/website/

Open the customer app and driver app in two tabs of the same browser: an order placed
in one appears as a job request in the other.

All equipment rates and material prices are SAMPLE figures. Replace the FLEET / MATS
arrays in each file with real prices. The quote form does not send anywhere yet.
