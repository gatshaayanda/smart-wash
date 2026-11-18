import "server-only";

import { createHmac, createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
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
  const token = request.headers.get("authorization")?.match(/^Bearer\\s+(.+)$/i)?.[1];
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
