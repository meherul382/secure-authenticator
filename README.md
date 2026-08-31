# Secure Authenticator

A privacy-first browser TOTP authenticator built with Next.js and deployable to Vercel.

## Features
- TOTP generation with SHA-1, SHA-256 and SHA-512
- 6 or 8 digit codes
- Custom period
- `otpauth://` URI import
- Local browser storage only
- JSON backup/restore
- Search accounts
- Dark mode
- Responsive UI
- No usernames, passwords or login credentials

## Security
This app is intended for legitimate TOTP secrets provided by services during authenticator-app setup. Never use it to collect, intercept, phish, or obtain another person's authentication codes or credentials.

Secrets are stored in browser `localStorage`. Backup JSON files contain those secrets in readable form, so protect them.

## Run locally
```bash
npm install
npm run dev
```
Open http://localhost:3000.

## Deploy on Vercel
1. Import this GitHub repository into Vercel.
2. Framework preset: Next.js.
3. Build command: `npm run build`.
4. Deploy.

No environment variables are required.

## Adding an account
Use the service's official security settings to enable an authenticator app. Copy the generated TOTP secret key into this app. Never enter the service password here. You can also import a standard `otpauth://totp/...` URI.