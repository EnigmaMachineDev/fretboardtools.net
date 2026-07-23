/**
 * Single source of truth for the site's identity.
 *
 * Referenced everywhere user-facing — document title, header, footer, metadata —
 * so a rename is a one-line change here, not a find-and-replace across the tree.
 *
 * Naming note: the repo, directory, and domain are all `fretboardtools.net`;
 * the PROJECT name is `FretboardTools` and that is what appears in titles and
 * the export envelope. Do not "correct" either to match the other.
 */
export const SITE_NAME = 'FretboardTools'

/** Short form used in tight spaces (e.g. mobile header). */
export const SITE_NAME_SHORT = 'FretboardTools'

/** Org that builds and owns the site (footer attribution). */
export const ORG_NAME = 'EnigmaMachineDev'

/** Tagline / one-line description used in metadata and the hero. */
export const SITE_TAGLINE =
  'Every bass fingering that fits your constraints, rated for playability.'

/** Canonical production origin. */
export const SITE_ORIGIN = 'https://fretboardtools.net'

/**
 * localStorage key for the entire app state blob. The `:v1` suffix is the
 * storage-envelope version, distinct from the data `schemaVersion` inside it.
 */
export const STORAGE_KEY = 'fretboardtools:appData:v1'

/** Current data schema version. Bump when the shape of AppData changes. */
export const SCHEMA_VERSION = 1
