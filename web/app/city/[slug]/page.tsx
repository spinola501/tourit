export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
export default async function CityRedirect({ params }: { params: Promise<{ slug: string }> }) {
  const [{ slug }, locale] = await Promise.all([params, getLocale()]);
  redirect(`/${locale}/city/${slug}`);
}
