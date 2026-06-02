export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
// Middleware handles / → /en/ but this is a safety fallback
export default function RootPage() {
  redirect("/en");
}
