export function Placeholder({ title }: { title: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-6 py-16 text-center">
      <h1 className="text-lg font-semibold tracking-tight text-slate-900">
        {title}
      </h1>
      <p className="mt-1 text-sm text-slate-400">This view is coming soon.</p>
    </div>
  )
}
