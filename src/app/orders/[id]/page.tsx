import { redirect } from "next/navigation";
export const metadata = { title: "Smart Wash account", robots: { index: false, follow: false } };
export default function LegacyOrderPage() { redirect("/account"); }