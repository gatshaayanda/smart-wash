import { NextResponse } from "next/server";
import { getFirestore } from "firebase-admin/firestore";
import { bigBrothersAdminApp } from "@/lib/server/big-brothers-receipts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// These are the nine clearly legible Smart Wash signboard prices.
// Seed only missing names; never overwrite owner edits, hidden states or deletions.
const VERIFIED_SERVICES = [
  { id: "smart-wash-wash-and-go", name: "Wash & Go", category: "Car wash", description: "Listed on the Smart Wash signboard.", price: 25 },
  { id: "smart-wash-smart-polishing", name: "Smart Polishing", category: "Detailing", description: "Listed on the Smart Wash signboard.", price: 80 },
  { id: "smart-wash-full-smart-polishing-interior", name: "Full Smart Polishing & Interior", category: "Detailing", description: "Listed on the Smart Wash signboard.", price: 100 },
  { id: "smart-wash-mini-valet", name: "Mini Valet", category: "Valet", description: "Listed on the Smart Wash signboard.", price: 200 },
  { id: "smart-wash-full-interior-valet", name: "Full Interior Valet", category: "Valet", description: "Listed on the Smart Wash signboard.", price: 450 },
  { id: "smart-wash-glazing-three-stages", name: "Glazing 3 Stages", category: "Detailing", description: "Listed on the Smart Wash signboard.", price: 480 },
  { id: "smart-wash-leather-care", name: "Leather Care", category: "Interior care", description: "Listed on the Smart Wash signboard.", price: 50 },
  { id: "smart-wash-carpet-cleaning", name: "Carpet Cleaning From", category: "Interior care", description: "Starting price shown on the signboard; final amount confirmed by the team.", price: 80 },
  { id: "smart-wash-sofas-four-sets", name: "Sofas (4 Sets)", category: "Upholstery", description: "Four sets, as listed on the Smart Wash signboard.", price: 400 },
] as const;

export async function POST() {
  try {
    const db = getFirestore(bigBrothersAdminApp());
    const services = db.collection("services");
    const seedMarker = db.doc("system/serviceCatalogueSeedV1");
    const added = await db.runTransaction(async transaction => {
      const marker = await transaction.get(seedMarker);
      if (marker.exists) return [];
      const existing = await transaction.get(services);
      const names = new Set(existing.docs.map(item => String(item.data().name || "").trim().toLowerCase()));
      const missing = VERIFIED_SERVICES.filter(item => !names.has(item.name.toLowerCase()));
      for (const item of missing) {
        transaction.create(services.doc(item.id), {
          ...item,
          active: true,
          updatedAt: new Date().toISOString(),
        });
      }
      transaction.create(seedMarker, { completedAt: new Date().toISOString(), seededNames: missing.map(item => item.name) });
      return missing.map(item => item.name);
    });
    return NextResponse.json({ seeded: true, added, count: added.length }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json({ seeded: false, error: "The service catalogue could not be initialised. Live catalogue access remains unchanged." }, {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
