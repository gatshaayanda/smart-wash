import { redirect } from "next/navigation";
export const metadata = { title: "Smart Wash account" };
export default function LegacySavedPage() { redirect("/account"); }