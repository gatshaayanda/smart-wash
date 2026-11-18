import { NextResponse } from "next/server";
import { requireCalendarCustomer, syncGoogleCalendarBooking } from "@/lib/server/google-calendar";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { uid, db } = await requireCalendarCustomer(request);
    const connection = await db.doc("googleCalendarConnections/" + uid).get();
    if (!connection.exists) return NextResponse.json({ connected: false, synced: 0, removed: 0 });
    const bookings = await db.collection("bookings").where("customerId", "==", uid).get();
    let synced = 0;
    let removed = 0;
    const errors: string[] = [];
    for (const bookingDoc of bookings.docs) {
      try {
        const result = await syncGoogleCalendarBooking(uid, bookingDoc.id, bookingDoc.data());
        if (result.synced) synced++;
        if (result.removed) removed++;
      } catch (error) {
        errors.push(error instanceof Error ? error.message : "A Smart Wash visit could not be synced.");
      }
    }
    return NextResponse.json({ connected: true, synced, removed, errors }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Google Calendar could not be synced." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
}
