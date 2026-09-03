"use client";
import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { Download, ShieldCheck } from "lucide-react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export default function PwaShell({ children }: { children: ReactNode }) {
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as InstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setPromptEvent(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);

    if (window.matchMedia("(display-mode: standalone)").matches) setInstalled(true);
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => undefined);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function install() {
    if (!promptEvent) {
      alert("To install: open your browser menu and choose 'Install Secure Authenticator' or 'Add to Home screen'.");
      return;
    }
    await promptEvent.prompt();
    await promptEvent.userChoice.catch(() => undefined);
    setPromptEvent(null);
  }

  return (
    <>
      {!installed && (
        <div className="pwa-bar">
          <span><ShieldCheck size={17} /> Install Secure Authenticator as an app</span>
          <div>
            <button type="button" onClick={install}><Download size={15} /> Install App</button>
            <Link href="/about">About &amp; Privacy</Link>
          </div>
        </div>
      )}
      {children}
    </>
  );
}
