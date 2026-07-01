/** Pretty-printed, scrollable monospace JSON block used by the data views. */
export function JsonBlock({
  value,
  className,
}: {
  value: unknown
  className?: string
}) {
  return (
    <pre
      className={`overflow-auto rounded-md border border-slate-200 bg-slate-50 p-3 font-mono text-xs leading-relaxed tabular-nums text-slate-700 ${
        className ?? ''
      }`}
    >
      {JSON.stringify(value, null, 2)}
    </pre>
  )
}
