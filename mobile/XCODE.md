# Run the YD Works apps on iPhone (Xcode)

You need a Mac with **Xcode** (App Store) and **Node.js** (nodejs.org, LTS).

## Customer app
```bash
cd ~/Downloads/YDWorks-iOS/customer
npm install
open ios/App/App.xcodeproj
```

## Driver app
```bash
cd ~/Downloads/YDWorks-iOS/driver
npm install
open ios/App/App.xcodeproj
```

## In Xcode
1. Click **App** in the left sidebar → **Signing & Capabilities** → **Team**: pick your Apple ID
   (Xcode → Settings → Accounts to add it). If the bundle ID is taken, change it slightly
   (e.g. `mv.ydworks.app.test`).
2. At the top, choose an **iPhone simulator** (or your iPhone connected by cable).
3. Press **▶ Run**.

On a real iPhone the first time: Settings → General → VPN & Device Management → trust your developer profile.

Push notifications and App Store release need an Apple Developer account ($99/year).
