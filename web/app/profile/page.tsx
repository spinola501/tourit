import Link from "next/link";

export default function ProfilePage() {
  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white">
      <nav className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <Link href="/" className="font-bold text-lg tracking-tight">TourIt</Link>
      </nav>

      <div className="max-w-md mx-auto px-6 pt-24 text-center">
        <div className="text-5xl mb-6">👤</div>
        <h1 className="text-2xl font-bold mb-3">Your Profile</h1>
        <p className="text-white/50 mb-8">
          Profiles with saved tours, interest tags and group preferences are coming soon.
          For now you can explore all tours as a guest.
        </p>
        <Link
          href="/discover"
          className="inline-flex items-center gap-2 bg-white text-black px-6 py-3 rounded-full font-semibold hover:bg-white/90 transition-colors"
        >
          Browse tours →
        </Link>
      </div>
    </div>
  );
}
