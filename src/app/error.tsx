"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  console.error("App error:", error.message);

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <h1 className="text-2xl font-bold">Something went wrong</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {error.message || "An unexpected error occurred"}
      </p>
      <div className="mt-6 flex gap-3">
        <button
          onClick={reset}
          className="inline-flex h-10 items-center justify-center rounded-lg bg-foreground px-4 text-sm font-medium text-background transition-colors hover:bg-foreground/90"
        >
          Try again
        </button>
        <a
          href="/"
          className="inline-flex h-10 items-center justify-center rounded-lg border border-border px-4 text-sm font-medium transition-colors hover:bg-muted"
        >
          Go home
        </a>
      </div>
    </div>
  );
}
