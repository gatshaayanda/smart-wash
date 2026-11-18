import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { googleCalendarConfig, requireCalendarCustomer, signCalendarState, GOOGLE_CALENDAR_SCOPE } from "@/lib/server/google-calendar";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { uid } = await requireCalendarCustomer(request);
    const config = googleCalendarConfig();
    if (!config.configured) return NextResponse.json({ error: "Google Calendar connection is not configured yet." }, { status: 503 });
    const state = signCalendarState({ uid, nonce: randomBytes(24).toString("base64url"), expiresAt: Date.now() + 10 * 60 * 1000 });
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.search = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      response_type: "code",
      scope: "openid email " + GOOGLE_CALENDAR_SCOPE,
      access_type: "offline",
      prompt: "consent",
      include_granted_scopes: "true",
      state,
    }).toString();
    const response = NextResponse.json({ authorizationUrl: url.toString() }, { headers: { "Cache-Control": "no-store" } });
    response.cookies.set("sw_google_calendar_state", state, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/api/calendar/google/callback", maxAge: 600 });
    return response;
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Google Calendar could not be connected." }, { status: 400 });
  }
}
