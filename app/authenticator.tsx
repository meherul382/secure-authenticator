"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  Copy,
  Download,
  Eye,
  EyeOff,
  KeyRound,
  Moon,
  Pencil,
  Plus,
  QrCode,
  Search,
  ShieldCheck,
  Sun,
  Trash2,
  Upload,
  X,
  Zap,
} from "lucide-react";

type Algorithm = "SHA-1" | "SHA-256" | "SHA-512";
type Digits = 6 | 8;
type Account = {
  id: string;
  name: string;
  issuer: string;
  secret: string;
  digits: Digits;
  period: number;
  algorithm: Algorithm;
};
type Token = { code: string; remaining: number };
type ParsedOtp = Omit<Account, "id">;

const STORAGE = "secure-authenticator:v2";

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function base32Decode(input: string): Uint8Array {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const clean = input.toUpperCase().replace(/[\s=-]/g, "");
  let bits = 0;
  let value = 0;
  const out: number[] = [];

  for (const ch of clean) {
    const index = alphabet.indexOf(ch);
    if (index < 0) continue;
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      out.push((value >>> bits) & 255);
    }
  }

  return new Uint8Array(out);
}

function parseOtpUri(uri: string): ParsedOtp | null {
  try {
    const url = new URL(uri);
    if (url.protocol !== "otpauth:" || url.hostname !== "totp") return null;

    const label = decodeURIComponent(url.pathname.replace(/^\/+/, ""));
    const parts = label.includes(":") ? label.split(/:(.*)/, 2) : ["", label];
    const secret = url.searchParams.get("secret")?.replace(/\s+/g, "").toUpperCase() ?? "";
    if (!secret) return null;

    const algorithmParam = (url.searchParams.get("algorithm") || "SHA1")
      .toUpperCase()
      .replace("-", "");
    const algorithm: Algorithm =
      algorithmParam === "SHA256"
        ? "SHA-256"
        : algorithmParam === "SHA512"
          ? "SHA-512"
          : "SHA-1";
    const digits: Digits = url.searchParams.get("digits") === "8" ? 8 : 6;
    const period = Math.max(1, Number(url.searchParams.get("period") || 30) || 30);

    return {
      name: parts[1] || "Account",
      issuer: url.searchParams.get("issuer") || parts[0] || "Authenticator",
      secret,
      digits,
      period,
      algorithm,
    };
  } catch {
    return null;
  }
}

async function makeTotp(
  account: Pick<Account, "secret" | "digits" | "period" | "algorithm">,
  timestamp = Date.now(),
): Promise<Token> {
  const period = Math.max(1, account.period || 30);
  const counter = Math.floor(timestamp / 1000 / period);
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  view.setUint32(0, Math.floor(counter / 4294967296));
  view.setUint32(4, counter >>> 0);

  const raw = base32Decode(account.secret);
  if (!raw.length) throw new Error("Invalid secret");

  const key = await crypto.subtle.importKey(
    "raw",
    raw.buffer as ArrayBuffer,
    { name: "HMAC", hash: account.algorithm },
    false,
    ["sign"],
  );
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", key, buffer));
  const offset = signature[signature.length - 1] & 15;
  const binary =
    ((signature[offset] & 127) << 24) |
    ((signature[offset + 1] & 255) << 16) |
    ((signature[offset + 2] & 255) << 8) |
    (signature[offset + 3] & 255);
  const modulus = account.digits === 8 ? 100000000 : 1000000;
  const code = String(binary % modulus).padStart(account.digits, "0");
  const remaining = period - (Math.floor(timestamp / 1000) % period);

  return { code, remaining };
}

function QuickCode() {
  const [input, setInput] = useState("");
  const [token, setToken] = useState<Token | null>(null);
  const [period, setPeriod] = useState(30);
  const [error, setError] = useState("");

  async function generate() {
    setError("");
    const raw = input.trim();
    const account = raw.toLowerCase().startsWith("otpauth://")
      ? parseOtpUri(raw)
      : raw
        ? {
            name: "One-Time",
            issuer: "Temporary",
            secret: raw.replace(/\s+/g, "").toUpperCase(),
            digits: 6 as Digits,
            period: 30,
            algorithm: "SHA-1" as Algorithm,
          }
        : null;

    if (!account?.secret) {
      setError("Enter a valid TOTP secret key or otpauth:// link.");
      return;
    }

    try {
      setPeriod(account.period);
      setToken(await makeTotp(account));
    } catch {
      setError("Could not generate a code. Check the secret key or URI.");
    }
  }

  useEffect(() => {
    if (!token) return;
    const timer = window.setInterval(() => {
      void generate();
    }, 1000);
    return () => window.clearInterval(timer);
  }, [input, token]);

  return (
    <section className="one-time">
      <div className="one-head">
        <div className="one-icon"><Zap size={23} /></div>
        <div>
          <h2>Quick TOTP Code</h2>
          <p>Paste a TOTP secret key or otpauth:// link and generate the current verification code locally.</p>
        </div>
      </div>

      <label>
        TOTP Secret Key or URI
        <textarea
          value={input}
          onChange={(event) => { setInput(event.target.value); setToken(null); }}
          placeholder="JBSWY3DPEHPK3PXP or otpauth://totp/..."
          autoComplete="off"
          spellCheck={false}
        />
      </label>
      <button className="primary wide" onClick={() => void generate()}>
        <Zap size={17} /> Generate code
      </button>

      {error && <div className="error">{error}</div>}

      {token && (
        <div className="quick-code">
          <span>Current verification code</span>
          <strong>{token.code.length === 6 ? `${token.code.slice(0, 3)} ${token.code.slice(3)}` : token.code}</strong>
          <div className="timer"><span style={{ width: `${(token.remaining / period) * 100}%` }} /></div>
          <div className="quick-row">
            <small>Refreshes in {token.remaining}s</small>
            <button onClick={() => void navigator.clipboard.writeText(token.code)}><Copy size={14} /> Copy code</button>
          </div>
        </div>
      )}

      <div className="temporary-note">
        <ShieldCheck size={16} />
        <span>Your secret is processed locally in this browser and is not sent to our server. Never enter passwords or recovery codes.</span>
      </div>
    </section>
  );
}

export default function Authenticator() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [tokens, setTokens] = useState<Record<string, Token>>({});
  const [query, setQuery] = useState("");
  const [dark, setDark] = useState(false);
  const [modal, setModal] = useState(false);
  const [scanner, setScanner] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [show, setShow] = useState<Record<string, boolean>>({});
  const [notice, setNotice] = useState("");
  const [mode, setMode] = useState<"saved" | "one">("one");
  const [form, setForm] = useState({
    name: "",
    issuer: "",
    secret: "",
    digits: "6",
    period: "30",
    algorithm: "SHA-1" as Algorithm,
  });
  const videoRef = useRef<HTMLVideoElement>(null);
  const scanTimer = useRef<number | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE);
      if (!raw) return;
      const saved = JSON.parse(raw) as { accounts?: unknown; dark?: unknown };
      if (Array.isArray(saved.accounts)) {
        const valid: Account[] = saved.accounts
          .filter((item): item is Partial<Account> => Boolean(item && typeof item === "object"))
          .map((item): Account | null => {
            if (!item.name || !item.secret) return null;
            const digits: Digits = item.digits === 8 ? 8 : 6;
            const algorithm: Algorithm =
              item.algorithm === "SHA-256" || item.algorithm === "SHA-512" ? item.algorithm : "SHA-1";
            return {
              id: typeof item.id === "string" ? item.id : makeId(),
              name: String(item.name),
              issuer: typeof item.issuer === "string" ? item.issuer : "Authenticator",
              secret: String(item.secret).replace(/\s+/g, "").toUpperCase(),
              digits,
              period: Math.max(1, Number(item.period) || 30),
              algorithm,
            };
          })
          .filter((item): item is Account => item !== null);
        setAccounts(valid);
      }
      if (typeof saved.dark === "boolean") setDark(saved.dark);
    } catch {
      // Ignore malformed local storage data.
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE, JSON.stringify({ accounts, dark }));
  }, [accounts, dark]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  useEffect(() => {
    let alive = true;
    async function updateTokens() {
      const next: Record<string, Token> = {};
      await Promise.all(accounts.map(async (account) => {
        try {
          next[account.id] = await makeTotp(account);
        } catch {
          next[account.id] = { code: "------", remaining: account.period };
        }
      }));
      if (alive) setTokens(next);
    }
    void updateTokens();
    const timer = window.setInterval(() => void updateTokens(), 1000);
    return () => { alive = false; window.clearInterval(timer); };
  }, [accounts]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return accounts.filter((account) => !q || account.name.toLowerCase().includes(q) || account.issuer.toLowerCase().includes(q));
  }, [accounts, query]);

  function toast(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2200);
  }

  function openAdd() {
    setEditing(null);
    setForm({ name: "", issuer: "", secret: "", digits: "6", period: "30", algorithm: "SHA-1" });
    setModal(true);
  }

  function openEdit(account: Account) {
    setEditing(account);
    setForm({ name: account.name, issuer: account.issuer, secret: account.secret, digits: String(account.digits), period: String(account.period), algorithm: account.algorithm });
    setModal(true);
  }

  function saveAccount() {
    const secret = form.secret.replace(/\s+/g, "").toUpperCase();
    if (!form.name.trim() || !secret) {
      toast("Enter an account name and secret key.");
      return;
    }

    const next: Omit<Account, "id"> = {
      name: form.name.trim(),
      issuer: form.issuer.trim() || "Authenticator",
      secret,
      digits: form.digits === "8" ? 8 : 6,
      period: Math.max(1, Number(form.period) || 30),
      algorithm: form.algorithm,
    };

    if (editing) {
      setAccounts((previous): Account[] => previous.map((account) => account.id === editing.id ? { ...account, ...next } : account));
      toast("Account updated.");
    } else {
      setAccounts((previous): Account[] => [{ id: makeId(), ...next }, ...previous]);
      toast("Account added.");
    }
    setModal(false);
  }

  function importUri(raw: string) {
    const parsed = parseOtpUri(raw.trim());
    if (!parsed) {
      toast("Invalid TOTP URI.");
      return;
    }
    const account: Account = { id: makeId(), ...parsed };
    setAccounts((previous): Account[] => [account, ...previous]);
    setMode("saved");
    toast("Account imported.");
  }

  async function copyCode(account: Account) {
    try {
      const token = tokens[account.id] || await makeTotp(account);
      await navigator.clipboard.writeText(token.code);
      toast("Code copied.");
    } catch {
      toast("Copy failed. Please try again.");
    }
  }

  function backup() {
    const blob = new Blob([JSON.stringify({ version: 2, accounts }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "secure-authenticator-backup.json";
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 500);
    toast("Backup exported.");
  }

  function restore(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as { accounts?: unknown };
        if (!Array.isArray(parsed.accounts)) throw new Error("Invalid backup");

        const clean: Account[] = parsed.accounts
          .filter((item): item is Partial<Account> => Boolean(item && typeof item === "object"))
          .map((item): Account | null => {
            if (!item.name || !item.secret) return null;
            const digits: Digits = item.digits === 8 ? 8 : 6;
            const algorithm: Algorithm =
              item.algorithm === "SHA-256" || item.algorithm === "SHA-512" ? item.algorithm : "SHA-1";
            return {
              id: makeId(),
              name: String(item.name),
              issuer: typeof item.issuer === "string" ? item.issuer : "Authenticator",
              secret: String(item.secret).replace(/\s+/g, "").toUpperCase(),
              digits,
              period: Math.max(1, Number(item.period) || 30),
              algorithm,
            };
          })
          .filter((item): item is Account => item !== null);

        setAccounts((previous): Account[] => [...clean, ...previous]);
        toast(`${clean.length} account(s) restored.`);
      } catch {
        toast("Invalid backup file.");
      }
    };
    reader.readAsText(file);
  }

  function startScanner() {
    setScanner(true);
    navigator.mediaDevices?.getUserMedia({ video: { facingMode: { ideal: "environment" } } })
      .then((stream) => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play();
        }

        type DetectorConstructor = new (options?: { formats: string[] }) => { detect(video: HTMLVideoElement): Promise<Array<{ rawValue?: string }>> };
        const Detector = (window as Window & { BarcodeDetector?: DetectorConstructor }).BarcodeDetector;
        if (!Detector) {
          toast("QR scanning is not supported in this browser. Paste the otpauth:// URI instead.");
          return;
        }

        const detector = new Detector({ formats: ["qr_code"] });
        const loop = async () => {
          if (!videoRef.current || videoRef.current.readyState < 2) {
            scanTimer.current = window.setTimeout(() => void loop(), 500);
            return;
          }
          try {
            const codes = await detector.detect(videoRef.current);
            const value = codes[0]?.rawValue;
            if (value) {
              stopScanner();
              if (value.toLowerCase().startsWith("otpauth://")) importUri(value);
              else toast("QR found, but it is not a TOTP URI.");
              return;
            }
          } catch {
            // Continue scanning.
          }
          scanTimer.current = window.setTimeout(() => void loop(), 500);
        };
        scanTimer.current = window.setTimeout(() => void loop(), 700);
      })
      .catch(() => toast("Camera permission was not granted."));
  }

  function stopScanner() {
    if (scanTimer.current !== null) window.clearTimeout(scanTimer.current);
    scanTimer.current = null;
    const stream = videoRef.current?.srcObject as MediaStream | null;
    stream?.getTracks().forEach((track) => track.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
    setScanner(false);
  }

  useEffect(() => () => stopScanner(), []);

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand">
          <div className="logo"><ShieldCheck size={24} /></div>
          <div><h1>Secure Authenticator</h1><p>Private TOTP codes in your browser</p></div>
        </div>
        <div className="top-actions">
          <button className="icon-btn" aria-label="Toggle theme" onClick={() => setDark((value) => !value)}>{dark ? <Sun size={19} /> : <Moon size={19} />}</button>
          <button className="secondary" onClick={() => setMode("one")}><Zap size={17} /> Quick Code</button>
          <button className="primary" onClick={openAdd}><Plus size={18} /> Add account</button>
        </div>
      </header>

      <nav className="mode-tabs">
        <button className={mode === "one" ? "active" : ""} onClick={() => setMode("one")}><Zap size={17} /> Quick TOTP Code</button>
        <button className={mode === "saved" ? "active" : ""} onClick={() => setMode("saved")}><KeyRound size={17} /> Saved Authenticator</button>
      </nav>

      {mode === "one" ? <QuickCode /> : <>
        <section className="hero">
          <div><div className="eyebrow"><span className="dot" /> Local-only by default</div><h2>Your codes. <span>On your device.</span></h2><p>Generate standard TOTP 2FA codes without sending your secrets to a server.</p></div>
          <div className="hero-badge"><ShieldCheck size={22} /><b>No passwords</b><small>Never enter a service password here.</small></div>
        </section>

        <section className="toolbar">
          <div className="search"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search accounts..." /></div>
          <button className="secondary" onClick={startScanner}><QrCode size={16} /> Scan QR</button>
          <label className="file-btn"><Upload size={16} /> Restore backup<input type="file" accept="application/json,.json" hidden onChange={(event) => event.target.files?.[0] && restore(event.target.files[0])} /></label>
          <button className="secondary" onClick={backup} disabled={!accounts.length}><Download size={16} /> Backup</button>
        </section>

        {accounts.length === 0 ? <section className="empty"><div className="empty-icon"><KeyRound size={30} /></div><h3>No accounts yet</h3><p>Add a TOTP secret manually, scan a QR code, or import an otpauth:// link.</p><button className="primary" onClick={openAdd}><Plus size={18} /> Add your first account</button></section> : filtered.length === 0 ? <section className="empty"><div className="empty-icon"><Search size={30} /></div><h3>No matching accounts</h3><p>Try a different account name or issuer.</p></section> : <section className="grid">
          {filtered.map((account) => {
            const token = tokens[account.id];
            const percent = token ? (token.remaining / account.period) * 100 : 0;
            return <article className="card" key={account.id}>
              <div className="card-head">
                <div className="account-mark">{account.issuer.slice(0, 1).toUpperCase()}</div>
                <div className="account-title"><b>{account.name}</b><span>{account.issuer}</span></div>
                <button className="icon-btn" aria-label="Edit account" onClick={() => openEdit(account)}><Pencil size={16} /></button>
                <button className="icon-btn danger" aria-label="Delete account" onClick={() => { if (window.confirm(`Delete ${account.name}?`)) setAccounts((previous): Account[] => previous.filter((item) => item.id !== account.id)); }}><Trash2 size={17} /></button>
              </div>
              <div className="code-wrap">
                <div className="code">{token?.code ? `${token.code.slice(0, account.digits / 2)} ${token.code.slice(account.digits / 2)}` : "------"}</div>
                <div className="timer"><span style={{ width: `${percent}%` }} /></div>
                <div className="timer-row"><span>Refreshes in {token?.remaining ?? account.period}s</span><button onClick={() => void copyCode(account)}><Copy size={14} /> Copy</button></div>
              </div>
              <div className="meta"><span>{account.digits}-digit</span><span>{account.algorithm}</span><span>{account.period}s</span></div>
              <div className="secret-row"><code>{show[account.id] ? account.secret : "••••••••••••••••••••"}</code><button className="icon-btn" aria-label="Show secret" onClick={() => setShow((value) => ({ ...value, [account.id]: !value[account.id] }))}>{show[account.id] ? <EyeOff size={16} /> : <Eye size={16} />}</button></div>
            </article>;
          })}
        </section>}
      </>}

      <footer><span><ShieldCheck size={15} /> TOTP secrets stay in this browser.</span><span>Developed by Mehedi</span></footer>
      {notice && <div className="toast"><Check size={16} />{notice}</div>}

      {modal && <div className="overlay" onMouseDown={(event) => event.target === event.currentTarget && setModal(false)}>
        <div className="modal">
          <div className="modal-head"><div><h3>{editing ? "Edit authenticator account" : "Add authenticator account"}</h3><p>Use only a TOTP secret supplied by the service.</p></div><button className="icon-btn" onClick={() => setModal(false)}><X size={19} /></button></div>
          <label>Account name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="My account" /></label>
          <label>Issuer<input value={form.issuer} onChange={(event) => setForm({ ...form, issuer: event.target.value })} placeholder="Google, GitHub, etc." /></label>
          <label>Secret key<input value={form.secret} onChange={(event) => setForm({ ...form, secret: event.target.value })} placeholder="JBSWY3DPEHPK3PXP" autoComplete="off" /></label>
          <div className="import-hint"><button className="secondary" onClick={() => { const raw = window.prompt("Paste an otpauth:// URI:"); if (raw) { const parsed = parseOtpUri(raw); if (parsed) setForm({ ...form, ...parsed, digits: String(parsed.digits), period: String(parsed.period) }); else toast("Invalid TOTP URI."); } }}>Paste otpauth URI</button></div>
          <div className="form-grid"><label>Digits<select value={form.digits} onChange={(event) => setForm({ ...form, digits: event.target.value })}><option value="6">6</option><option value="8">8</option></select></label><label>Period (seconds)<input type="number" min="1" value={form.period} onChange={(event) => setForm({ ...form, period: event.target.value })} /></label></div>
          <label>Algorithm<select value={form.algorithm} onChange={(event) => setForm({ ...form, algorithm: event.target.value as Algorithm })}><option>SHA-1</option><option>SHA-256</option><option>SHA-512</option></select></label>
          <div className="modal-actions"><button className="secondary" onClick={() => setModal(false)}>Cancel</button><button className="primary" onClick={saveAccount}>{editing ? "Save changes" : "Add account"}</button></div>
        </div>
      </div>}

      {scanner && <div className="overlay"><div className="modal scanner-modal"><div className="modal-head"><div><h3>Scan TOTP QR code</h3><p>Point your camera at the QR code from the service.</p></div><button className="icon-btn" onClick={stopScanner}><X size={19} /></button></div><video ref={videoRef} className="scanner-video" playsInline muted /><div className="modal-actions"><button className="secondary" onClick={stopScanner}>Close scanner</button></div></div></div>}
    </main>
  );
}
