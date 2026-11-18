import "server-only";

import { createHash, createHmac, createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { bigBrothersAdminApp } from "@/lib/server/big-brothers-receipts";

export const GOOGLE_CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.events";

export function googleCalendarConfig() {
  const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID || "";
  const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET || "";
  const redirectUri = process.env.GOOGLE_CALENDAR_REDIRECT_URI || "";
  const stateSecret = process.env.GOOGLE_CALENDAR_STATE_SECRET || "";
  const encryptionKey = process.env.GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEY || "";
  return { clientId, clientSecret, redirectUri, stateSecret, encryptionKey, configured: Boolean(clientId && clientSecret && redirectUri && stateSecret && encryptionKey) };
}

export function calendarDb() {
  return getFirestore(bigBrothersAdminApp());
}

export async function requireCalendarCustomer(request: Request) {
  const token = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) throw new Error("Sign in to your Smart Wash account first.");
  const app = bigBrothersAdminApp();
  const decoded = await getAuth(app).verifyIdToken(token, true);
  return { uid: decoded.uid, db: getFirestore(app) };
}

export function signCalendarState(payload: { uid: string; nonce: string; expiresAt: number }) {
  const config = googleCalendarConfig();
  if (!config.stateSecret) throw new Error("Google Calendar OAuth state signing is not configured.");
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", config.stateSecret).update(encoded).digest("base64url");
  return encoded + "." + signature;
}

export function verifyCalendarState(value: string) {
  const config = googleCalendarConfig();
  const [encoded, signature] = value.split(".");
  if (!encoded || !signature || !config.stateSecret) throw new Error("Google Calendar connection could not be verified.");
  const expected = createHmac("sha256", config.stateSecret).update(encoded).digest();
  const actual = Buffer.from(signature, "base64url");
  if (actual.length !== expected.length || !expected.equals(actual)) throw new Error("Google Calendar connection could not be verified.");
  const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as { uid?: unknown; nonce?: unknown; expiresAt?: unknown };
  if (typeof payload.uid !== "string" || typeof payload.nonce !== "string" || typeof payload.expiresAt !== "number" || payload.expiresAt < Date.now()) {
    throw new Error("This Google Calendar connection link has expired. Please try again.");
  }
  return payload as { uid: string; nonce: string; expiresAt: number };
}

function tokenEncryptionKey() {
  const value = googleCalendarConfig().encryptionKey;
  const key = Buffer.from(value, "base64");
  if (key.length !== 32) throw new Error("Google Calendar token encryption key must be a base64-encoded 32-byte key.");
  return key;
}

export function encryptCalendarToken(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", tokenEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map(part => part.toString("base64url")).join(".");
}

export function decryptCalendarToken(value: string) {
  const [ivValue, tagValue, encryptedValue] = value.split(".");
  if (!ivValue || !tagValue || !encryptedValue) throw new Error("Saved Google Calendar connection is unreadable. Reconnect your calendar.");
  const decipher = createDecipheriv("aes-256-gcm", tokenEncryptionKey(), Buffer.from(ivValue, "base64url"));
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(encryptedValue, "base64url")), decipher.final()]).toString("utf8");
}

export async function refreshGoogleCalendarAccessToken(uid: string, connection: Record<string, unknown>) {
  const config = googleCalendarConfig();
  const refreshToken = decryptCalendarToken(String(connection.encryptedRefreshToken || ""));
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: config.clientId, client_secret: config.clientSecret, refresh_token: refreshToken, grant_type: "refresh_token" }),
    cache: "no-store",
  });
  const result = await response.json().catch(() => ({})) as { access_token?: string; expires_in?: number; error?: string };
  if (!response.ok || !result.access_token) throw new Error(result.error === "invalid_grant" ? "Google Calendar access expired. Reconnect your calendar." : "Google Calendar could not refresh its connection.");
  await calendarDb().doc("googleCalendarConnections/" + uid).set({ accessTokenExpiresAt: Date.now() + Number(result.expires_in || 3600) * 1000, lastUsedAt: new Date().toISOString() }, { merge: true });
  return result.access_token;
}


export async function syncGoogleCalendarBooking(uid: string, bookingId: string, booking: {
  status?: string;
  scheduledFor?: string;
  serviceName?: string;
  washChoice?: string;
  addOns?: { serviceName?: string }[];
  serviceMode?: string;
  address?: string;
}) {
  const db = calendarDb();
  const connectionSnap = await db.doc("googleCalendarConnections/" + uid).get();
  if (!connectionSnap.exists) return { connected: false, synced: false, removed: false };
  const connection = connectionSnap.data() || {};
  const accessToken = await refreshGoogleCalendarAccessToken(uid, connection);
  const eventRef = db.collection("googleCalendarEvents").doc(uid).collection("bookings").doc(bookingId);
  const existing = await eventRef.get();
  const eventId = String(existing.data()?.eventId || createHash("sha256").update("smart-wash-" + bookingId).digest("hex").slice(0, 32));
  const endpoint = "https://www.googleapis.com/calendar/v3/calendars/primary/events/" + encodeURIComponent(eventId);

  if (booking.status !== "confirmed") {
    if (["cancelled", "requested"].includes(String(booking.status || ""))) {
      const response = await fetch(endpoint, { method: "DELETE", headers: { Authorization: "Bearer " + accessToken }, cache: "no-store" });
      if (!response.ok && response.status !== 404 && response.status !== 410) throw new Error("A cancelled or reopened visit could not be removed from Google Calendar.");
      if (existing.exists) await eventRef.delete();
      return { connected: true, synced: false, removed: existing.exists || response.status === 204 };
    }
    return { connected: true, synced: false, removed: false };
  }

  const start = new Date(String(booking.scheduledFor || ""));
  if (!Number.isFinite(start.getTime())) throw new Error("A confirmed visit has no valid date and time.");
  const end = new Date(start.getTime() + 30 * 60 * 1000);
  const extras = Array.isArray(booking.addOns) ? booking.addOns.map(item => item.serviceName).filter(Boolean).join(", ") : "";
  const washChoice = booking.washChoice === "outside" ? "Outside wash" : booking.washChoice === "inside" ? "Inside clean" : booking.washChoice === "both" ? "Inside + outside" : "As agreed with the team";
  const details = ["Confirmed Smart Wash visit at G-West, Botswana.", "Main wash: " + washChoice + ".", extras ? "Extra care: " + extras + "." : "", booking.serviceMode === "mobile" ? "Mobile wash: " + String(booking.address || "Address to be confirmed") : "Location: Smart Wash, G-West, Botswana.", "Please use your Smart Wash account for the latest visit details."].filter(Boolean).join("\\n");
  const event = {
    summary: "Smart Wash · " + String(booking.serviceName || "Confirmed wash"),
    description: details,
    location: booking.serviceMode === "mobile" ? String(booking.address || "Mobile location to be confirmed") : "Smart Wash, G-West, Botswana",
    start: { dateTime: start.toISOString(), timeZone: "Africa/Gaborone" },
    end: { dateTime: end.toISOString(), timeZone: "Africa/Gaborone" },
    reminders: { useDefault: false, overrides: [{ method: "popup", minutes: 60 }, { method: "popup", minutes: 10 }] },
  };
  let response: Response;
  if (existing.exists) {
    response = await fetch(endpoint, { method: "PATCH", headers: { Authorization: "Bearer " + accessToken, "Content-Type": "application/json" }, body: JSON.stringify(event), cache: "no-store" });
    if (response.status === 404 || response.status === 410) {
      response = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", { method: "POST", headers: { Authorization: "Bearer " + accessToken, "Content-Type": "application/json" }, body: JSON.stringify({ ...event, id: eventId }), cache: "no-store" });
    }
  } else {
    response = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", { method: "POST", headers: { Authorization: "Bearer " + accessToken, "Content-Type": "application/json" }, body: JSON.stringify({ ...event, id: eventId }), cache: "no-store" });
    if (response.status === 409) response = await fetch(endpoint, { method: "PATCH", headers: { Authorization: "Bearer " + accessToken, "Content-Type": "application/json" }, body: JSON.stringify(event), cache: "no-store" });
  }
  if (!response.ok) throw new Error("A confirmed visit could not be added to Google Calendar.");
  await eventRef.set({ eventId, status: "synced", updatedAt: new Date().toISOString() }, { merge: true });
  return { connected: true, synced: true, removed: false, eventId };
}
