import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { decryptCalendarToken, requireCalendarCustomer } from "@/lib/server/google-calendar";

export const runtime = "nodejs";

type CalendarConnection = { encryptedRefreshToken?: string; email?: string };
type Booking = { status?: string; scheduledFor?: string; serviceName?: string; washChoice?: string; addOns?: { serviceName?: string }[]; serviceMode?: string; address?: string };

async function refreshAccessToken(refreshToken: string) {
  const config = googleCalendarConfig();
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: config.clientId, client_secret: config.clientSecret, refresh_token: refreshToken, grant_type: "refresh_token" }), cache: "no-store",
  });
  const body = await response.json().catch(() => ({})) as { access_token?: string; error?: string };
  if (!response.ok || !body.access_token) throw new Error(body.error === "invalid_grant" ? "Google Calendar access expired. Reconnect your calendar." : "Google Calendar could not refresh its connection.");
  return body.access_token;
}

export async function POST(request: Request) {
  try {
    const { uid, db } = await requireCalendarCustomer(request);
    const connectionRef = db.doc("googleCalendarConnections/" + uid);
    const connectionSnap = await connectionRef.get();
    if (!connectionSnap.exists) return NextResponse.json({ synced: 0, connected: false });
    const connection = connectionSnap.data() as CalendarConnection;
    const refreshToken = decryptCalendarToken(String(connection.encryptedRefreshToken || ""));
    const accessToken = await refreshAccessToken(refreshToken);
    await connectionRef.set({ lastUsedAt: new Date().toISOString() }, { merge: true });
    const bookings = await db.collection("bookings").where("customerId", "==", uid).get();
    const eventCollection = db.collection("googleCalendarEvents").doc(uid).collection("bookings");
    let synced = 0;
    let removed = 0;
    const errors: string[] = [];
    for (const bookingDoc of bookings.docs) {
      const booking = bookingDoc.data() as Booking;
      const eventRef = eventCollection.doc(bookingDoc.id);
      const existing = await eventRef.get();
      const eventId = String(existing.data()?.eventId || createHash("sha256").update("smart-wash-" + bookingDoc.id).digest("hex").slice(0, 32));
      if (booking.status !== "confirmed") {
        if (existing.exists && ["cancelled", "requested"].includes(String(booking.status || ""))) {
          const deleted = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events/" + encodeURIComponent(eventId), { method: "DELETE", headers: { Authorization: "Bearer " + accessToken }, cache: "no-store" });
          if (!deleted.ok && deleted.status !== 404 && deleted.status !== 410) { errors.push("A cancelled or reopened visit could not be removed from Calendar."); continue; }
          await eventRef.delete(); removed++;
        }
        continue;
      }
      const start = new Date(String(booking.scheduledFor || ""));
      if (!Number.isFinite(start.getTime())) { errors.push("A confirmed visit has no valid date and time."); continue; }
      const end = new Date(start.getTime() + 30 * 60 * 1000);
      const extras = Array.isArray(booking.addOns) ? booking.addOns.map(item => item.serviceName).filter(Boolean).join(", ") : "";
      const details = ["Confirmed Smart Wash visit at G-West, Botswana.", "Main wash: " + String(booking.washChoice || "As agreed with the team") + ".", extras ? "Extra care: " + extras + "." : "", booking.serviceMode === "mobile" ? "Mobile wash: " + String(booking.address || "Address to be confirmed") : "Location: Smart Wash, G-West, Botswana.", "Please use your Smart Wash account for the latest visit details."].filter(Boolean).join("\\n");
      const event = {
        summary: "Smart Wash · " + String(booking.serviceName || "Confirmed wash"),
        description: details,
        location: booking.serviceMode === "mobile" ? String(booking.address || "Mobile location to be confirmed") : "Smart Wash, G-West, Botswana",
        start: { dateTime: start.toISOString(), timeZone: "Africa/Gaborone" },
        end: { dateTime: end.toISOString(), timeZone: "Africa/Gaborone" },
        reminders: { useDefault: false, overrides: [{ method: "popup", minutes: 60 }, { method: "popup", minutes: 10 }] },
      };
      const endpoint = "https://www.googleapis.com/calendar/v3/calendars/primary/events/" + encodeURIComponent(eventId);
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
      if (!response.ok) { errors.push("A confirmed visit could not be added to Google Calendar."); continue; }
      await eventRef.set({ eventId, status: "synced", updatedAt: new Date().toISOString() }, { merge: true });
      synced++;
    }
    return NextResponse.json({ connected: true, synced, removed, errors }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Google Calendar could not be synced." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
}
