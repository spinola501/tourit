import { redirect } from "next/navigation";
export default async function TourRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/en/tour/${id}`);
}
