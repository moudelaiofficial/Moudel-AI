
import { Link } from 'react-router-dom'

const legalLinks = [
  { label: 'Privacy Policy', path: '/privacy' },
  { label: 'Terms & Conditions', path: '/terms' },
  { label: 'Cookie Policy', path: '/cookies' },
  { label: 'Data Deletion', path: '/data-deletion' },
  { label: 'Research Disclaimer', path: '/research-disclaimer' },
  { label: 'Acceptable Use', path: '/acceptable-use' },
]

export default function LegalLayout({
  title,
  description,
  lastUpdated = '14 November 2026',
  children,
}) {
  return (
    <main className="min-h-screen bg-[#f6f2e8] text-[#1c1b19]">
      <header className="border-b border-[#ded8ca]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
          <Link to="/" className="font-serif text-2xl">
            Moudel AI
          </Link>

          <Link
            to="/"
            className="text-sm text-[#5f5b50] transition hover:text-[#7869a6]"
          >
            Back to home
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-6 py-16">
        <div className="mb-12 border-b border-[#ded8ca] pb-10">
          <p className="mb-4 text-xs uppercase tracking-[0.2em] text-[#7869a6]">
            Moudel AI / Legal
          </p>

          <h1 className="font-serif text-4xl leading-tight md:text-5xl">
            {title}
          </h1>

          <p className="mt-5 max-w-2xl text-sm leading-7 text-[#5f5b50]">
            {description}
          </p>

          <p className="mt-6 text-xs text-[#8a8579]">
            Last updated: {lastUpdated}
          </p>
        </div>

        <article className="legal-content space-y-10">
          {children}
        </article>

        <div className="mt-20 border-t border-[#ded8ca] pt-8">
          <h2 className="mb-5 font-serif text-xl">Other legal information</h2>

          <nav className="flex flex-wrap gap-x-6 gap-y-4">
            {legalLinks.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className="text-sm text-[#716b60] transition hover:text-[#7869a6]"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <p className="mt-10 text-xs leading-6 text-[#8a8579]">
            © {new Date().getFullYear()} Moudel AI. All rights reserved.
          </p>
        </div>
      </div>
    </main>
  )
}
