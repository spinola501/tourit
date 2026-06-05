"use client";

import Link from "next/link";

export default function NotFound() {
  // Use "/" — middleware redirects to /{locale} automatically
  return (
    <html>
      <body style={{ background: "#0d0d0d", color: "#fff", fontFamily: "sans-serif", textAlign: "center", padding: "4rem 2rem" }}>
        <h2 style={{ marginBottom: "0.5rem" }}>Page not found</h2>
        <p style={{ color: "#888", marginBottom: "1.5rem" }}>The page you&apos;re looking for doesn&apos;t exist.</p>
        <Link href="/" style={{ background: "#fff", color: "#000", padding: "0.75rem 1.5rem", borderRadius: "0.5rem", textDecoration: "none", fontWeight: 600 }}>
          Go home
        </Link>
      </body>
    </html>
  );
}
