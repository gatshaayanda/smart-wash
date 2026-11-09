import { NextResponse } from "next/server";
import { getFirestore } from "firebase-admin/firestore";
import { readReceiptByToken } from "@/lib/server/big-brothers-receipts";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await context.params;
    const access = await readReceiptByToken(token);
    if (!access) return NextResponse.json({ error: "This receipt link is invalid, expired or revoked." }, { status: 404, headers: { "Cache-Control": "no-store" } });
    const body = await request.json().catch(() => null) as { imageUrl?: unknown; uploadKey?: unknown; mediaType?: unknown; title?: unknown; description?: unknown; publicConsent?: unknown } | null;
    const imageUrl = typeof body?.imageUrl === "string" ? body.imageUrl : "";
    const uploadKey = typeof body?.uploadKey === "string" ? body.uploadKey : "";
    const mediaType = body?.mediaType === "video" ? "video" : body?.mediaType === "image" ? "image" : "";
    const title = typeof body?.title === "string" ? body.title.trim() : "";
    const description = typeof body?.description === "string" ? body.description.trim() : "";
    if (body?.publicConsent !== true) return NextResponse.json({ error: "Give explicit permission before submitting media for public consideration." }, { status: 400 });
    if (!title || title.length > 120 || description.length > 500) return NextResponse.json({ error: "Add a short title and keep the description under 500 characters." }, { status: 400 });
    if (!/^[A-Za-z0-9_-]{8,128}$/.test(uploadKey) || !mediaType) return NextResponse.json({ error: "The UploadThing file reference is invalid." }, { status: 400 });
    let parsed: URL;
    try { parsed = new URL(imageUrl); } catch { return NextResponse.json({ error: "The media upload URL is invalid." }, { status: 400 }); }
    const allowedUploadHost = parsed.hostname === "utfs.io" || parsed.hostname.endsWith(".utfs.io") || parsed.hostname === "ufs.sh" || parsed.hostname.endsWith(".ufs.sh");
    if (parsed.protocol !== "https:" || !allowedUploadHost || !parsed.pathname.includes("/f/")) {
      return NextResponse.json({ error: "The media must come from an approved UploadThing upload." }, { status: 400 });
    }
    const db = getFirestore(access.app);
    const submissionRef = db.collection("gallerySubmissions").doc();
    await submissionRef.create({
      queueEntryId: access.queueEntryId,
      receiptRef: String(access.receipt.receiptRef || ""),
      customerId: String(access.receipt.customerId || ""),
      customerName: String(access.receipt.customerName || ""),
      title,
      description,
      imageUrl,
      mediaType,
      uploadKey,
      publicConsent: true,
      status: "pending",
      createdAt: new Date().toISOString(),
    });
    return NextResponse.json({ submitted: true, message: "Media submitted for staff review. It will not appear publicly unless approved." }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Smart Wash customer media submission failed:", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Media submission could not be saved. Please try again." }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
