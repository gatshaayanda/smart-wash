import { redirect } from "next/navigation";
export const metadata = { title: "Book a wash · Smart Wash", description: "Choose a Smart Wash service and request a wash." };
export default function RequestPage() { redirect("/#request"); }