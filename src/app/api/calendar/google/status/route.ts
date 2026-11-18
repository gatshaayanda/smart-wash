import { NextResponse } from "next/server";
import { calendarDb, googleCalendarConfig, requireCalendarCustomer } from "@/lib/server/google-calendar";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { uid } = await requireCalendarCustomer(request);
    const snapshot = await calendarDb().doc("googleCalendarConnections/" + uid).get();
    const value = snapshot.data() || {};
    return NextResponse.json({ configured: googleCalendarConfig().configured, connected: snapshot.exists, email: String(value.email || "") }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Calendar status is unavailable." }, { status: 401 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { uid } = await requireCalendarCustomer(request);
    await calendarDb().doc("googleCalendarConnections/" + uid).delete();
    return NextResponse.json({ disconnected: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Calendar could not be disconnected." }, { status: 400 });
  }
}
