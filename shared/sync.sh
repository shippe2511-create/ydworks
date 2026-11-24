#!/usr/bin/env bash
# Copies the shared YD Works modules, product photos and vendored libraries into every surface.
# Run after changing anything in shared/.
set -e
cd "$(dirname "$0")/.."
for d in website customer-app driver-app admin; do
  cp shared/yd-config.js shared/yd-catalog.js shared/yd-ui.js shared/yd-backend.js shared/yd-docs.js shared/yd-settings.js "$d/"
  mkdir -p "$d/catalog" "$d/vendor"
  cp shared/catalog/*.jpg "$d/catalog/"
  cp shared/vendor/* "$d/vendor/"
done
echo "shared modules synced to website, customer-app, driver-app, admin"
