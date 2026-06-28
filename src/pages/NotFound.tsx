import { Link } from 'react-router-dom'

export function NotFound() {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-6 py-16 text-center">
      <h1 className="text-lg font-semibold tracking-tight text-slate-900">
        Page not found
      </h1>
      <p className="mt-1 text-sm text-slate-400">That page does not exist.</p>
      <Link
        to="/"
        className="mt-4 inline-block rounded-md px-3 py-1.5 text-sm text-indigo-600 outline-none hover:bg-indigo-50 focus-visible:ring-2 focus-visible:ring-indigo-600"
      >
        Back to fleet
      </Link>
    </div>
  )
}
