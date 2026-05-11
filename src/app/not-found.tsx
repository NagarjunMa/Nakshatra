import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <h1 className="text-4xl font-bold">404</h1>
      <p className="mt-2 text-muted-foreground">Page not found</p>
      <Link
        href="/dashboard"
        className="mt-6 inline-flex h-10 items-center justify-center rounded-lg bg-foreground px-4 text-sm font-medium text-background transition-colors hover:bg-foreground/90"
      >
        Go to Dashboard
      </Link>
    </div>
  );
}
