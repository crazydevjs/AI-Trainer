"use client";

// Top-level fallback that catches errors in the root layout itself.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#050505",
          color: "#f5f5f7",
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
          padding: 24,
        }}
      >
        <h1 style={{ fontSize: 24, marginBottom: 8 }}>Something went wrong</h1>
        <p style={{ color: "#a1a1aa", maxWidth: 420, marginBottom: 24 }}>
          The application hit an unexpected error. Please try again.
        </p>
        <button
          onClick={() => reset()}
          style={{
            background: "linear-gradient(135deg,#ff3b30,#ff7a18)",
            color: "#fff",
            border: "none",
            borderRadius: 14,
            padding: "12px 24px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Try again
        </button>
        {error.digest && (
          <p style={{ color: "#6b6b76", fontSize: 12, marginTop: 16 }}>
            Ref: {error.digest}
          </p>
        )}
      </body>
    </html>
  );
}
