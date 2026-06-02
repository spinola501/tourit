"use client";

export default function GlobalError({
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <html>
      <body style={{ background: "#0d0d0d", color: "#fff", fontFamily: "sans-serif", textAlign: "center", padding: "4rem 2rem" }}>
        <h2 style={{ marginBottom: "1rem" }}>Something went wrong</h2>
        <button onClick={() => unstable_retry()} style={{ background: "#fff", color: "#000", border: "none", padding: "0.75rem 1.5rem", borderRadius: "0.5rem", cursor: "pointer", fontWeight: 600 }}>
          Try again
        </button>
      </body>
    </html>
  );
}
