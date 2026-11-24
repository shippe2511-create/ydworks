# YD Works mobile apps (iOS + Android)

Two apps, each shipped two ways:

| App | Bundle / package ID | Icon |
|---|---|---|
| **YD Works** (customers) | `mv.ydworks.app` | white shield on YD blue |
| **YD Driver** (drivers & operators) | `mv.ydworks.driver` | gold shield on night navy |

```
mobile/
  build.py            builds both apps into <app>/www (PWA + native web layer)
  brand/              source icons, splash, bundled fonts
  customer/ driver/
    www/              installable web app (manifest, offline service worker, icons, fonts)
    android/          Android Studio project (Gradle)
    ios/              Xcode project (Swift Package Manager, no CocoaPods)
    assets/           icon + splash sources for `npm run assets`
    capacitor.config.json
```

The app screens themselves live in `../customer-app/index.html` and `../driver-app/index.html`.
Edit those, then run `npm run sync` inside `mobile/customer` or `mobile/driver`.

## Option 1 – Install from the browser (PWA, no app store)

Upload `mobile/customer/www/` and `mobile/driver/www/` to any HTTPS host,
for example `https://yd-mv.com/app/` and `https://yd-mv.com/driver/`.

- **iPhone (Safari):** open the link → Share → *Add to Home Screen*.
- **Android (Chrome):** open the link → *Install app* (or menu → *Add to Home screen*).

They open full-screen with their own icon and work offline.

## Option 2 – Android app (Play Store / APK)

Needs: JDK 21 and the Android SDK (Android Studio installs both).

```bash
cd mobile/customer        # or mobile/driver
npm install
npm run sync
npm run apk               # debug APK → android/app/build/outputs/apk/debug/app-debug.apk
```

For the Play Store: open the project with `npm run android`, then
*Build → Generate Signed App Bundle* and create an upload key (keep it safe; you need it for every update).
Upload the `.aab` to Google Play Console (one-time USD 25 developer fee).

## Option 3 – iPhone app (App Store / TestFlight)

Needs: a Mac with Xcode 16+, and an Apple Developer account (USD 99/year).

```bash
cd mobile/customer        # or mobile/driver
npm install
npm run sync
npm run ios               # opens ios/App/App.xcodeproj in Xcode
```

In Xcode: select the *App* target → *Signing & Capabilities* → choose your team.
Run on a device, or *Product → Archive* → *Distribute App* → App Store Connect → TestFlight.

## Before submitting to the stores

- **Real data:** orders are stored on the device and a demo dispatcher simulates drivers.
  The two native apps cannot see each other's orders until they share a backend
  (orders, driver locations, logins, push notifications).
- **Prices:** all equipment rates and material prices are sample figures.
- **Photos:** the photos are AI-generated placeholders; replace files in `customer-app/assets` and `driver-app/assets`.
- **Store listing:** privacy policy URL, support URL, screenshots (6.7" iPhone, Android phone), app description.
- **Permissions:** the driver app asks for the camera (delivery photos) through the file picker.
  If you add live GPS, add location permission text in `ios/App/App/Info.plist` and `AndroidManifest.xml`.
