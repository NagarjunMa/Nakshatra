export default function PreviewLoading() {
  return (
    <div className="flex flex-1 flex-col">
      <div className="border-b border-border bg-muted px-4 py-2">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <div className="h-5 w-32 animate-pulse rounded bg-border" />
          <div className="h-5 w-20 animate-pulse rounded bg-border" />
        </div>
      </div>
      <div className="flex-1 px-4 py-8">
        <div className="mx-auto max-w-2xl flex flex-col items-center gap-4">
          <div className="h-40 w-40 animate-pulse rounded-full bg-muted" />
          <div className="h-8 w-48 animate-pulse rounded bg-muted" />
          <div className="mt-8 w-full flex flex-col gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 w-full animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
