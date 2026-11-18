import { NextResponse } from "next/server";
import { calendarDb, encryptCalendarToken, googleCalendarConfig, verifyCalendarState } from "@/lib/server/google-calendar";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const state = url.searchParams.get("state") || "";
  const cookie = request.headers.get("cookie") || "";
  const cookieState = cookie.match(/(?:^|;\s*)sw_google_calendar_state=([^;]+)/)?.[1] || "";
  const clearCookie = (response: NextResponse) => { response.cookies.set("sw_google_calendar_state", "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/api/calendar/google/callback", maxAge: 0 }); return response; };
  try {
    if (!state || decodeURIComponent(cookieState) !== state) throw new Error("Google Calendar connection could not be verified. Please try again.");
    const payload = verifyCalendarState(state);
    const code = url.searchParams.get("code");
    if (!code) throw new Error("Google Calendar permission was not completed.");
    const config = googleCalendarConfig();
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ code, client_id: config.clientId, client_secret: config.clientSecret, redirect_uri: config.redirectUri, grant_type: "authorization_code" }), cache: "no-store",
    });
    const tokens = await tokenResponse.json().catch(() => ({})) as { access_token?: string; refresh_token?: string; expires_in?: number; error?: string };
    if (!tokenResponse.ok || !tokens.access_token || !tokens.refresh_token) throw new Error(tokens.error === "access_denied" ? "Google Calendar access was declined." : "Google did not return a renewable calendar connection. Please try connecting again.");
    const identityResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", { headers: { Authorization: "Bearer " + tokens.access_token }, cache: "no-store" });
    const identity = await identityResponse.json().catch(() => ({})) as { email?: string };
    await calendarDb().doc("googleCalendarConnections/" + payload.uid).set({
      encryptedRefreshToken: encryptCalendarToken(tokens.refresh_token),
      email: String(identity.email || ""),
      connectedAt: new Date().toISOString(),
      accessTokenExpiresAt: Date.now() + Number(tokens.expires_in || 3600) * 1000,
      provider: "google",
      scope: "calendar.events",
    }, { merge: true });
    return clearCookie(NextResponse.redirect(new URL("/account?calendar=connected", url.origin)));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Google Calendar could not be connected.";
    return clearCookie(NextResponse.redirect(new URL("/account?calendar=error&reason=" + encodeURIComponent(message), url.origin)));
  }
}
