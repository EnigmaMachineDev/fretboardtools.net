import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-24 text-center">
      <h1 className="text-3xl text-brand-bright mb-4">Page Not Found</h1>
      <p className="text-brand-muted mb-8">That page doesn&apos;t exist — but the fingerings do.</p>
      <Link
        to="/"
        className="inline-block px-4 py-2 rounded-lg bg-brand-accent/30 text-brand-bright hover:bg-brand-accent/50 transition-colors"
      >
        Back to the Chord Finder
      </Link>
    </div>
  )
}
