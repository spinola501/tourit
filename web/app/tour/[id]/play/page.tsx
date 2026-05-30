import { redirect } from "next/navigation";
export default async function PlayRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/en/tour/${id}/play`);
}
