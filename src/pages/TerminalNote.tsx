// A quiet note addressed to Terminal reviewers, linked from the nav as a
// footnote. Deliberately a plain page: no modal, no popup, no interstitial.

const CONTACT_LINKS = [
  {
    label: 'approachimad@gmail.com',
    href: 'mailto:approachimad@gmail.com',
    newTab: false,
  },
  {
    label: 'Source',
    href: 'https://github.com/ImadCreates/fleetbridge',
    newTab: true,
  },
  { label: 'GitHub', href: 'https://github.com/ImadCreates', newTab: true },
  { label: 'LinkedIn', href: 'https://linkedin.com/in/imadsecures', newTab: true },
]

const headingCls = 'text-xs font-medium uppercase tracking-wide text-slate-500'
const proseCls = 'text-sm leading-relaxed text-slate-600'

export function TerminalNote() {
  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-lg font-semibold tracking-tight">
        A note for Terminal
      </h1>

      <section className="space-y-8 rounded-lg border border-slate-200 bg-white p-6 sm:p-8">
        <p className={proseCls}>
          I built FleetBridge after reading your docs. The problem grabbed me:
          every provider speaks its own dialect, and someone has to make
          hundreds of them look like one. This demo is my small version of that
          job. Three mock TSPs with incompatible units, timestamp formats,
          coordinate conventions, and event vocabularies are normalized through
          per provider adapters into one canonical model, with a config driven
          path for onboarding a fourth.
        </p>

        <div className="space-y-2">
          <h2 className={headingCls}>The decisions were the interesting part</h2>
          <p className={proseCls}>
            The safety score uses events per driving hour instead of per 100
            km, because distance based scoring punishes short trips.
            TracPoint's device serial is a VIN that resolves against the fleet
            record, because identity across a provider boundary is never free.
            Heading is derived from consecutive GPS fixes and held while
            stationary. Speed is rounded once, at the adapter boundary, so
            float noise from unit conversion never reaches the model.
          </p>
        </div>

        <div className="space-y-2">
          <h2 className={headingCls}>About me</h2>
          <p className={proseCls}>
            I'm Imad, a fourth year Software Engineering student at York
            University (security specialization) in Toronto, currently a
            software developer intern. I also built Routy, a live dispatch
            platform, and firewarden, a Firestore security rules scanner
            published to npm. I applied to the Backend intern role for a
            winter start.
          </p>
        </div>

        <p className={proseCls}>
          If the way I work here matches how you build, I'd like to talk.
        </p>

        <ul className="flex flex-wrap gap-x-6 gap-y-2 border-t border-slate-100 pt-6">
          {CONTACT_LINKS.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className="text-sm text-indigo-600 outline-none hover:text-indigo-700 focus-visible:underline"
                {...(link.newTab ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
