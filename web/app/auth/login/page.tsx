export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
export default function LoginRedirect() {
  redirect("/en/auth/login");
}
