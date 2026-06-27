import { providerColor } from '../lib/palette'

export function ProviderTag({
  providerId,
  name,
}: {
  providerId: string
  name: string
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="h-2 w-2 shrink-0 rounded-full"
        style={{ backgroundColor: providerColor(providerId) }}
      />
      <span className="text-sm text-slate-700">{name}</span>
    </span>
  )
}
