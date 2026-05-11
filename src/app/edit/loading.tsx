export default function EditLoading() {
  return (
    <div className="flex flex-1 flex-col">
      <div className="border-b border-border px-4 py-3">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-center justify-between">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="h-8 w-8 animate-pulse rounded-full bg-muted" />
            ))}
          </div>
          <div className="mt-3 h-1 w-full animate-pulse rounded-full bg-muted" />
        </div>
      </div>
      <main className="flex-1 px-4 py-6">
        <div className="mx-auto max-w-lg flex flex-col gap-4">
          <div className="h-7 w-32 animate-pulse rounded bg-muted" />
          <div className="h-11 w-full animate-pulse rounded-lg bg-muted" />
          <div className="h-11 w-full animate-pulse rounded-lg bg-muted" />
          <div className="h-11 w-full animate-pulse rounded-lg bg-muted" />
        </div>
      </main>
    </div>
  );
}
