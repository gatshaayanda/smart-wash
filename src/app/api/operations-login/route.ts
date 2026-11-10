import { createHash, timingSafeEqual } from "node:crypto";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
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
  const projectId = process.env.FIREBASE_PROJECT_ID;
  if (!projectId) throw new Error("Missing FIREBASE_PROJECT_ID environment variable.");
  if (serviceAccount.project_id !== projectId) throw new Error("FIREBASE_ADMIN_KEY project_id must match FIREBASE_PROJECT_ID.");
  if (typeof serviceAccount.client_email !== "string" || typeof serviceAccount.private_key !== "string") {
    throw new Error("FIREBASE_ADMIN_KEY must include client_email and private_key.");
  }
  const normalizedAccount = {
    ...serviceAccount,
    private_key: serviceAccount.private_key.replace(/\\n/g, "\n"),
  };
  return initializeApp({
    credential: cert(normalizedAccount as Parameters<typeof cert>[0]),
    projectId,
  }, "smart-wash-operations");
}

function matchesWord(input: string, expected: string) {
  const a = createHash("sha256").update(input).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b) && input.length > 0;
}

export async function POST(request: Request) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return NextResponse.json({ error: "Staff sign-in is not configured. Set ADMIN_PASSWORD in the server environment." }, { status: 503 });
  const body = await request.json().catch(() => null) as { word?: unknown } | null;
  const word = typeof body?.word === "string" ? body.word : "";
  if (!matchesWord(word, expected)) {
    return NextResponse.json({ error: "Access denied. Check the staff access word and try again." }, { status: 401 });
  }

  let stage = "FIREBASE_ADMIN_INIT";
  try {
    const app = getAdminApp();
    const adminAuth = getAuth(app);
    const projectId = process.env.FIREBASE_PROJECT_ID!;
    // Stable internal identity; the user signs in through Firebase's standard
    // Email/Password provider. No custom tokens or custom claims are minted.
    const email = "smart-wash-operations@" + projectId + ".firebaseapp.com";
    stage = "FIREBASE_USER_PROVISION";
    let user;
    try {
      user = await adminAuth.getUserByEmail(email);
      user = await adminAuth.updateUser(user.uid, { password: word, disabled: false, emailVerified: true });
    } catch (error) {
      const code = typeof error === "object" && error !== null && "code" in error
        ? String((error as { code?: unknown }).code ?? "")
        : "";
      if (code !== "auth/user-not-found") throw error;
      user = await adminAuth.createUser({ email, password: word, emailVerified: true, disabled: false });
    }

    stage = "FIRESTORE_ADMIN_PROVISION";
    const sessionExpiresAt = Date.now() + 24 * 60 * 60 * 1000;
    await getFirestore(app).doc("admins/" + user.uid).set({
      role: "owner",
      sessionExpiresAt,
      updatedAt: new Date().toISOString(),
    }, { merge: true });

    return NextResponse.json({ email }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "unknown error";
    const code = typeof error === "object" && error !== null && "code" in error
      ? String((error as { code?: unknown }).code ?? "")
      : "";
    console.error("Smart Wash staff login failed:", { stage, code, message: detail });
    const guidance = stage === "FIREBASE_ADMIN_INIT"
      ? "Check that FIREBASE_PROJECT_ID and FIREBASE_ADMIN_KEY are valid matching credentials."
      : stage === "FIREBASE_USER_PROVISION"
        ? "Firebase could not provision the standard staff account. Check Firebase Authentication and service-account permissions."
        : "Firebase Authentication is ready, but the staff session record could not be saved to Firestore.";
    return NextResponse.json({ error: "Staff sign-in failed at " + stage + ". " + guidance, stage }, {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
