# Secure Authenticator

A privacy-first browser TOTP authenticator built with Next.js and deployable to Vercel. The repository also contains an Android wrapper prepared for Google Play Store AAB builds.

## Web app features
- TOTP generation with SHA-1, SHA-256 and SHA-512
- 6 or 8 digit codes
- Custom period
- `otpauth://` URI import
- QR scanning in supported mobile browsers
- Local browser storage only
- JSON backup/restore
- Search, edit and delete accounts
- Dark mode
- Responsive/PWA UI
- No usernames, passwords or login credentials

## Android app
The `android/` project packages the HTTPS web app at `https://secure-authenticator.vercel.app/` in a hardened Android WebView.

- Package ID: `com.secureauthenticator.app`
- Version: `1.0.0` / versionCode `1`
- minSdk: 24
- targetSdk: 36
- HTTPS-only WebView
- JavaScript + DOM storage enabled for the PWA
- Camera runtime permission for QR scanning
- JSON file picker for backup restore
- External websites open outside the app
- Launcher icon included

The Android project intentionally does not use Firebase or collect account credentials.

## Build an Android AAB with GitHub Actions
A workflow is included at `.github/workflows/android-aab.yml`.

1. Open GitHub → **Actions** → **Android AAB**.
2. Choose **Run workflow**.
3. After the build completes, download the `secure-authenticator-release-aab` artifact.
4. The generated file is `app-release.aab`.

The current workflow produces a release AAB for testing. Before publishing to Google Play, configure a persistent Android upload/release signing key and sign the AAB. Never commit a keystore, passwords, or signing keys to this repository.

## Play Store release checklist
- Create/keep a unique package ID: `com.secureauthenticator.app`
- Create a persistent upload keystore and keep it private
- Configure GitHub Actions signing secrets if CI signing is desired
- Test the signed AAB on physical Android devices
- Provide a public privacy-policy URL in Play Console
- Complete Google Play Data safety and app-content declarations accurately
- Add app icon, screenshots, short description and full description
- Use Google Play App Signing during release setup

## Security
This app is intended for legitimate TOTP secrets provided by services during authenticator-app setup. Never use it to collect, intercept, phish, or obtain another person's authentication codes or credentials.

Web secrets are stored in browser `localStorage`. Backup JSON files contain those secrets in readable form, so protect them. The Android wrapper uses the website's local browser storage and does not intentionally send TOTP secrets to an app backend.

## Run the web app locally
```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Deploy on Vercel
1. Import this GitHub repository into Vercel.
2. Framework preset: Next.js.
3. Build command: `npm run build`.
4. Deploy.

No environment variables are required for the web app.

## Adding an account
Use the service's official security settings to enable an authenticator app. Copy the generated TOTP secret key into this app. Never enter the service password here. You can also import a standard `otpauth://totp/...` URI.
