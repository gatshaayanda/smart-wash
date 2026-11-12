/* eslint-disable react/no-unescaped-entities */
"use client";

import { onAuthStateChanged, signInAnonymously, signOut, type User } from "firebase/auth";
import { doc, onSnapshot, Timestamp } from "firebase/firestore";
import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase/client";
import "@/app/big-brothers.css";

function hasAdminRole(data: Record<string, unknown> | undefined) {
  return ["owner", "staff"].includes(String(data?.role ?? "").toLowerCase());
}

export default function AdminGate({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [word, setWord] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [businessName, setBusinessName] = useState("Smart Wash");

  useEffect(() => {
    let stopAdmin: undefined | (() => void);
    let expiryTimer: ReturnType<typeof setTimeout> | undefined;
    let authGeneration = 0;
    const stopSettings = onSnapshot(doc(db, "businessSettings", "main"), snapshot => {
      const value = snapshot.data()?.businessName;
      if (typeof value === "string" && value.trim()) setBusinessName(value);
    });
    const stopAuth = onAuthStateChanged(auth, next => {
      const generation = ++authGeneration;
      stopAdmin?.();
      stopAdmin = undefined;
      if (expiryTimer) clearTimeout(expiryTimer);
      setUser(next);
      setChecking(Boolean(next));
      setAuthorized(false);
      if (!next) {
        setChecking(false);
        return;
      }

      stopAdmin = onSnapshot(doc(db, "admins", next.uid), snapshot => {
        if (generation !== authGeneration) return;
        const data = snapshot.data();
        const expiryValue = data?.sessionExpiresAt;
        const expiresAt = expiryValue instanceof Timestamp ? expiryValue.toMillis() : Number.NaN;
        const allowed = snapshot.exists() && hasAdminRole(data) && Number.isFinite(expiresAt) && expiresAt > Date.now();
        setAuthorized(allowed);
        setChecking(false);
        if (!allowed) {
          if (!snapshot.exists()) {
            setError("");
            return;
          }
          setError("Your staff session has expired. Enter the staff access word to continue.");
          void signOut(auth);
          return;
        }
        expiryTimer = setTimeout(() => {
          setAuthorized(false);
          setError("Your 24-hour staff session has ended. Sign in again to continue.");
          void signOut(auth);
        }, Math.min(expiresAt - Date.now(), 2_147_000_000));
      }, () => {
        if (generation !== authGeneration) return;
        setAuthorized(false);
        setChecking(false);
        setError("Staff access could not be verified. Reconnect and sign in again.");
      });
    });
    return () => {
      authGeneration++;
      stopAdmin?.();
      stopAuth();
      stopSettings();
      if (expiryTimer) clearTimeout(expiryTimer);
    };
  }, []);

  async function signIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const currentUser = auth.currentUser ?? (await signInAnonymously(auth)).user;
      const response = await fetch("/api/operations-login", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + await currentUser.getIdToken() },
        body: JSON.stringify({ word }),
        cache: "no-store",
      });
      const payload = await response.json() as { ok?: boolean; error?: string };
      if (!response.ok || !payload.ok) throw new Error(payload.error || "Staff sign-in failed.");
      setWord("");
      setError("");
    } catch (cause) {
      const code = typeof cause === "object" && cause !== null && "code" in cause
        ? String((cause as { code?: unknown }).code ?? "")
        : "";
      const message = code === "auth/operation-not-allowed"
        ? "Enable Anonymous sign-in in Firebase Authentication to use the one-word staff access."
        : cause instanceof Error ? cause.message : "Staff sign-in failed.";
      setError(message);
      await signOut(auth).catch(() => undefined);
    } finally {
      setBusy(false);
    }
  }

  if (checking) return <main className="vula"><section className="big-brothers-section"><p className="big-brothers-eyebrow">STAFF ACCESS</p><h1 style={{fontSize:"clamp(36px,6vw,58px)"}}>Checking access…</h1></section></main>;
  if (user && authorized) return <div className="adminAuthorized"><div className="big-brothers-status"><span className="status-dot online"/>Staff signed in · 24-hour session<button style={{marginLeft:12}} onClick={() => void signOut(auth)}>Sign out</button></div>{children}</div>;

  return <main className="vula"><div className="big-brothers-status"><span className="status-dot online"/>{businessName} · Staff access</div><section className="big-brothers-section" style={{maxWidth:620,margin:"40px auto"}}><p className="big-brothers-eyebrow">STAFF ONLY</p><h1 style={{fontSize:"clamp(38px,6vw,62px)"}}>Operations sign in.</h1><p>Use the private staff access word. Do not share it with customers.</p><form className="admin-editor" onSubmit={signIn}><label>Staff access word<input type="password" value={word} onChange={event=>setWord(event.target.value)} required autoComplete="current-password"/></label><button className="big-brothers-button primary" disabled={busy}>{busy ? "Checking…" : "Enter staff workspace"}</button>{error&&<p role="alert" className="big-brothers-notice error">{error}</p>}</form></section></main>;
}
