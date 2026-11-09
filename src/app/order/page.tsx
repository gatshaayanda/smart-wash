import { redirect } from "next/navigation";
export const metadata = { title: "Book a wash · Smart Wash", description: "Request a Smart Wash service." };
export default function OrderPage() { redirect("/#request"); }