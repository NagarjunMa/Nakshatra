export default function DashboardLoading() {
  return (
    <div className="flex flex-1 flex-col">
      <div className="border-b border-border px-4 py-3">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <div className="h-6 w-24 animate-pulse rounded bg-muted" />
          <div className="h-6 w-16 animate-pulse rounded bg-muted" />
        </div>
      </div>
      <main id="main-content" className="flex-1 px-4 py-8">
        <div className="mx-auto max-w-3xl">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
          <div className="mt-6 h-32 animate-pulse rounded-xl bg-muted" />
        </div>
      </main>
    </div>
  );
}
