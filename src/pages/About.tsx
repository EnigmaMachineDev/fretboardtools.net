/**
 * About / how-it-works. This page doubles as the reserved content section so
 * Mediavine Grow can slot in later without redesign (do NOT wire Grow in —
 * and do not pre-widen the CSP for it).
 */
import { Link } from 'react-router-dom'
import { SITE_NAME } from '../config/site'

const h2 = 'text-xl text-brand-bright mt-10 mb-3'
const p = 'text-sm text-brand-text leading-relaxed mb-3'
const muted = 'text-sm text-brand-muted leading-relaxed mb-3'

export default function About() {
  return (
    <article className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-3xl text-brand-bright mb-4">How {SITE_NAME} Works</h1>

      <p className={p}>
        {SITE_NAME} is a bass fretboard voicing engine. You give it parameters — a tuning, how
        many strings the chord uses, a fret window, whether string skips are allowed, which scale
        degrees you want — and it enumerates <em>every</em> fingering that satisfies them, rates
        each one for playability, and groups the results so you can actually read them.
      </p>

      <h2 className={h2}>The shape is the atom</h2>
      <p className={p}>
        Everything here is built on one abstraction: a <strong>shape</strong> is a set of strings
        plus fret offsets, normalized so the lowest fret used is 0. That makes every shape
        transposition-invariant and position-invariant by construction. You don&apos;t get
        &ldquo;the chord at the 5th fret&rdquo; — you get <em>the fingering</em>, which you can
        slide anywhere on the neck. Sounding pitches, scale degrees, chord names, difficulty, and
        the suggested fingering are all derived from shape + tuning + chosen root, on demand.
      </p>

      <h2 className={h2}>BEAD and EADG are the same shapes — here&apos;s why</h2>
      <p className={p}>
        The engine never sees the absolute pitches of your open strings. Only the semitone gaps{' '}
        <em>between adjacent strings</em> matter to which shapes exist and how they sound
        relative to their own bass note. EADG, BEAD, F♯BEA — every all-fourths 4-string tuning —
        share the gap vector <code className="text-brand-bright">(5,5,5)</code>, so they define
        exactly the same shape space and produce identical results. Drop D is{' '}
        <code className="text-brand-bright">(7,5,5)</code>: a genuinely different space. A
        5-string BEADG is <code className="text-brand-bright">(5,5,5,5)</code>.
      </p>
      <p className={p}>
        This is why the tuning picker shows an equivalence badge, and why favorites are keyed by
        gap vector rather than by tuning: the same shape favorited under EADG and under BEAD{' '}
        <em>is</em> the same shape, and it deduplicates automatically. Renaming or deleting a
        tuning can never orphan a favorite.
      </p>

      <h2 className={h2}>Why open strings are excluded</h2>
      <p className={p}>
        Deliberately. An open string is a half step below the 1st fret and is specific to one
        tuning, which fights position-invariance — a shape that leans on an open string stops
        being slidable. Fretted notes only, everywhere.
      </p>

      <h2 className={h2}>How difficulty is rated</h2>
      <p className={p}>
        Each shape goes through a real finger-assignment solver, not a heuristic. Fingers 1–4 are
        assigned under physical constraints — lower frets can&apos;t take higher fingers, a
        finger can only barre one fret, and a barre is illegal if a string under it needs a lower
        fret. The best valid assignment is costed (span, barres, muted interior strings, pinky
        stretch) and banded Easy → Very Hard; shapes with no valid assignment at all are marked
        Impossible. Hard and Impossible shapes are still generated — the rating is a filter{' '}
        <em>you</em> control, never a gate the engine applies on its own.
      </p>

      <h2 className={h2}>An honest limitation: position matters, and we can&apos;t see it</h2>
      <p className={muted}>
        Because shapes are position-invariant, the difficulty rating cannot know <em>where</em>{' '}
        on the neck you'll play one. Fret spacing shrinks as you go up: a 4-fret spread that is
        punishing at the 2nd fret can be comfortable at the 12th. The rating describes the
        shape&apos;s intrinsic geometry, not any particular position of it. Take it as a
        comparison between shapes, not a promise about your hand at any given fret.
      </p>

      <h2 className={h2}>Ambiguity is kept, not hidden</h2>
      <p className={p}>
        A three-note set is genuinely ambiguous — 1-♭3-♭5 is a diminished triad <em>or</em> a
        rootless dominant 7. The <Link to="/identify" className="text-brand-green hover:text-brand-bright">Identify</Link>{' '}
        page returns every interpretation, ranked with sounded roots first. Interval labels are
        primary; chord names are an annotation, and several may apply at once.
      </p>

      <h2 className={h2}>Your data</h2>
      <p className={p}>
        No backend, no account, no tracking of your playing. Custom tunings, chord definitions,
        favorites, and saved searches live in your browser&apos;s local storage, with JSON
        export/import in the <Link to="/library" className="text-brand-green hover:text-brand-bright">Library</Link>.
        Search parameters live in the URL, so any result set can be shared as a link.
      </p>

      <h2 className={h2}>The fine print on names</h2>
      <p className={muted}>
        {SITE_NAME} ships ~60 built-in chord qualities, but any degree set you define is a
        first-class citizen — if you want 2-6-8, you get 2-6-8, whether or not a theory textbook
        has a name for it. Your definitions shadow the built-ins when the degree sets collide.
      </p>
    </article>
  )
}
