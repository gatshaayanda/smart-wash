import { redirect } from "next/navigation";
export const metadata = { title: "Smart Wash staff operations", robots: { index: false, follow: false } };
export default function LegacyCommunityAdminPage() { redirect("/admin"); }