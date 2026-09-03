"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Download, ShieldCheck } from "lucide-react";

export default function PwaShell({children}:{children:React.ReactNode}){
 const [prompt,setPrompt]=useState<any>(null); const [installed,setInstalled]=useState(false);
 useEffect(()=>{const onBefore=(e:any)=>{e.preventDefault();setPrompt(e)}; const onApp=()=>setInstalled(true); window.addEventListener("beforeinstallprompt",onBefore); window.addEventListener("appinstalled",onApp); if(window.matchMedia("(display-mode: standalone)").matches)setInstalled(true); if("serviceWorker" in navigator)navigator.serviceWorker.register("/sw.js").catch(()=>{}); return()=>{window.removeEventListener("beforeinstallprompt",onBefore);window.removeEventListener("appinstalled",onApp)}},[]);
 async function install(){if(prompt){await prompt.prompt();setPrompt(null)}else alert("To install: use your browser menu and choose 'Install Secure Authenticator' or 'Add to Home screen'.")}
 return <>{!installed&&<div className="pwa-bar"><span><ShieldCheck size={17}/> Install Secure Authenticator as an app</span><div><button onClick={install}><Download size={15}/> Install App</button><Link href="/about">About & Privacy</Link></div></div>}{children}</>
}