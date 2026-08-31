import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Secure Authenticator",
  description: "Private browser-based TOTP authenticator",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}