"use client";

import { useCallback, useEffect, useState } from "react";
import { getIdToken } from "firebase/auth";
import type { VulaBooking } from "@/lib/firebase/big-brothers-data";
import { auth } from "@/lib/firebase/client";

type Props = { uid: string; bookings: VulaBooking[] };

export default function GoogleCalendarConnect({ uid, bookings }: Props) {
  const [configured, setConfigured] = useState(true);
  const [connected, setConnected] = useState(false);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const request = useCallback(async (path: string, method = "GET") => {
    const user = auth.currentUser;
    if (!user || user.uid !== uid) throw new Error("Your customer session changed. Refresh and try again.");
    const response = await fetch(path, { method, headers: { Authorization: "Bearer " + await getIdToken(user) }, cache: "no-store" });
    const data = await response.json().catch(() => ({})) as { error?: string; configured?: boolean; connected?: boolean; email?: string; synced?: number; removed?: number; errors?: string[]; authorizationUrl?: string };
    if (!response.ok) throw new Error(data.error || "Google Calendar could not complete that action.");
    return data;
  }, [uid]);

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams(window.location.search);
    if (params.get("calendar") === "error") setError(params.get("reason") || "Google Calendar could not be connected.");
    if (params.get("calendar") === "connected") setMessage("Google Calendar is connected. Confirmed visits will be added automatically.");
    void request("/api/calendar/google/status").then(data => {
      if (!active) return;
      setConfigured(data.configured !== false);
      setConnected(data.connected === true);
      setEmail(data.email || "");
    }).catch(reason => { if (active) setError(reason instanceof Error ? reason.message : "Calendar status could not be loaded."); });
    return () => { active = false; };
  }, [uid, request]);

  const bookingKey = bookings.map(item => [item.id, item.status, item.scheduledFor, item.serviceName].join(":")).join("|");
  useEffect(() => {
    if (!connected) return;
    let active = true;
    void request("/api/calendar/google/sync", "POST").then(data => {
      if (!active) return;
      if (data.errors?.length) setError(data.errors[0]);
      else if ((data.synced || 0) > 0 || (data.removed || 0) > 0) setMessage("Your confirmed Smart Wash visits are up to date in Google Calendar.");
    }).catch(reason => { if (active) setError(reason instanceof Error ? reason.message : "Google Calendar could not be synced."); });
    return () => { active = false; };
  }, [connected, bookingKey, uid, request]);

  async function connect() {
    setBusy(true); setError(""); setMessage("");
    try {
      const data = await request("/api/calendar/google/connect", "POST");
      if (!data.authorizationUrl) throw new Error("Google did not provide a connection link.");
      window.location.assign(data.authorizationUrl);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Google Calendar could not be connected.");
      setBusy(false);
    }
  }

  async function disconnect() {
    setBusy(true); setError(""); setMessage("");
    try {
      await request("/api/calendar/google/status", "DELETE");
      setConnected(false); setEmail("");
      setMessage("Google Calendar disconnected. Events already added to your calendar are left in place.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Google Calendar could not be disconnected.");
    } finally { setBusy(false); }
  }

  return <section className="sw-calendar-connect" aria-label="Google Calendar connection">
    <div className="sw-calendar-copy">
      <span className="sw-calendar-icon" aria-hidden="true">▦</span>
      <div><strong>Google Calendar</strong><p>{connected ? "Connected" + (email ? " · " + email : "") + ". Confirmed visits are added and updated automatically." : "Connect once. Confirmed visits can then appear in your calendar with useful reminders."}</p></div>
    </div>
    {!configured ? <p className="sw-calendar-note">Google Calendar is not configured yet. The Smart Wash team needs to finish the secure Google connection setup.</p> : connected
      ? <button type="button" className="sw-calendar-action secondary" disabled={busy} onClick={()=>void disconnect()}>{busy ? "Working…" : "Disconnect"}</button>
      : <button type="button" className="sw-calendar-action" disabled={busy} onClick={()=>void connect()}>{busy ? "Opening Google…" : "Connect Google Calendar ↗"}</button>}
    {message && <p className="sw-calendar-feedback" role="status">{message}</p>}
    {error && <p className="sw-calendar-feedback error" role="alert">{error}</p>}
    <small>Smart Wash only adds or updates your confirmed wash visits. Requested visits are not added before staff confirmation.</small>
  </section>;
}
