import { createHash, timingSafeEqual } from "node:crypto";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function getAdminApp() {
  const existing = getApps().find(app => app.name === "smart-wash-operations");
  if (existing) return existing;
  const raw = process.env.FIREBASE_ADMIN_KEY;
  if (!raw) throw new Error("Missing FIREBASE_ADMIN_KEY environment variable.");
  let serviceAccount: Record<string, unknown>;
  try { serviceAccount = JSON.parse(raw) as Record<string, unknown>; }
  catch { throw new Error("FIREBASE_ADMIN_KEY must contain valid service-account JSON."); }
  if (typeof serviceAccount.private_key === "string") {
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");
  }
  if (typeof serviceAccount.project_id !== "string" || !serviceAccount.project_id) {
    throw new Error("FIREBASE_ADMIN_KEY must include its service-account project_id.");
  }
  // Match the proven JTS setup: infer the Firebase project from the service account.
  return initializeApp({
    credential: cert(serviceAccount as Parameters<typeof cert>[0]),
  }, "smart-wash-operations");
}

function matchesWord(input: string, expected: string) {
  const a = createHash("sha256").update(input).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b) && input.length > 0;
}

export async function POST(request: Request) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return NextResponse.json({ error: "Staff access is not configured. Set ADMIN_PASSWORD on the server." }, { status: 503, headers: { "Cache-Control": "no-store" } });

  const body = await request.json().catch(() => null) as { word?: unknown } | null;
  const word = typeof body?.word === "string" ? body.word : "";
  if (!matchesWord(word, expected)) return NextResponse.json({ error: "Access denied. Check the staff access word and try again." }, { status: 401, headers: { "Cache-Control": "no-store" } });

  const match = (request.headers.get("authorization") || "").match(/^Bearer\s+(.+)$/i);
  if (!match) return NextResponse.json({ error: "Sign-in session missing. Reconnect and try again." }, { status: 401, headers: { "Cache-Control": "no-store" } });

  try {
    const app = getAdminApp();
    const decoded = await getAuth(app).verifyIdToken(match[1]);
    if (!decoded.firebase?.sign_in_provider || !["anonymous", "password", "google.com"].includes(decoded.firebase.sign_in_provider)) {
      return NextResponse.json({ error: "This session cannot be used for staff access." }, { status: 403, headers: { "Cache-Control": "no-store" } });
    }
    const sessionExpiresAt = Date.now() + 24 * 60 * 60 * 1000;
    await getFirestore(app).doc("admins/" + decoded.uid).set({
      role: "owner",
      sessionExpiresAt: Timestamp.fromMillis(sessionExpiresAt),
      accessMethod: "one-word",
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    return NextResponse.json({ ok: true, sessionExpiresAt }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const code = typeof error === "object" && error !== null && "code" in error ? String((error as { code?: unknown }).code ?? "") : "";
    console.error("Smart Wash one-word staff sign-in failed:", { code, message: error instanceof Error ? error.message : "unknown error" });
    return NextResponse.json({ error: "Staff access could not be activated. Check the server Firebase Admin connection and Firestore access." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
