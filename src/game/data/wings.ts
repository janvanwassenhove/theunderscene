import type { WingId } from './types'

/**
 * Per-wing look-and-feel. Phase 0 uses these purely as placeholder tints; from
 * Phase 2 each wing gets its own texture atlas and these become the fallback
 * palette plus the light rig the atlas is authored against.
 */
export interface WingTheme {
  id: WingId
  name: string
  /** Dug-earth floor. */
  floor: number
  /** Undug rock face. */
  rock: number
  /** Torch / bare bulb / neon — whatever lights this wing. */
  light: number
  /** UI accent for this wing's chrome. */
  accent: number
  /** Set-dressing note carried through to the art brief. */
  dressing: string
}

export const WINGS: Record<WingId, WingTheme> = {
  core: {
    id: 'core',
    name: 'The Underscene',
    floor: 0x3b3129,
    rock: 0x2a2320,
    light: 0xffb35c,
    accent: 0xe8dcc8,
    dressing: 'bare bulbs, damp brick, gaffer tape',
  },
  punk: {
    id: 'punk',
    name: 'Punk & Ska',
    floor: 0x3d3128,
    rock: 0x2c2521,
    light: 0xffd166,
    accent: 0xff4d5a,
    dressing: 'spray-stencil graffiti, string lights, patched scaffolding',
  },
  metal: {
    id: 'metal',
    name: 'Metal',
    floor: 0x2e2726,
    rock: 0x241d1d,
    light: 0xff5a3c,
    accent: 0x9b1c2e,
    dressing: 'charcoal walls, blood-red torchlight, candle wax buildup',
  },
  shoegaze: {
    id: 'shoegaze',
    name: 'Shoegaze',
    floor: 0x3a3644,
    rock: 0x2b2833,
    light: 0xc9b6ff,
    accent: 0xb7a4e8,
    dressing: 'soft haze, washed pastel light, edges out of focus',
  },
  hiphop: {
    id: 'hiphop',
    name: 'Hip-Hop',
    floor: 0x3b3326,
    rock: 0x2a2519,
    light: 0xffcf5c,
    accent: 0xd4af37,
    dressing: 'crate stacks as structure, gold-foil signage, boombox light',
  },
  electronic: {
    id: 'electronic',
    name: 'Electronic',
    floor: 0x232a33,
    rock: 0x1a1f26,
    light: 0x4de2ff,
    accent: 0x35d0ff,
    dressing: 'neon strips instead of torches, glitchy screen flicker',
  },
  folk: {
    id: 'folk',
    name: 'Folk',
    floor: 0x3f3327,
    rock: 0x2f2620,
    light: 0xffc182,
    accent: 0xc98a3f,
    dressing: 'exposed beams, real campfires, lantern light',
  },
  finale: {
    id: 'finale',
    name: 'The Algorithm',
    floor: 0x2b2b33,
    rock: 0x1f1f26,
    light: 0xa0ffe0,
    accent: 0x6ef0c0,
    dressing: 'rooms glitching between two wings as convergence breaks down',
  },
}

export function wingTheme(id: WingId): WingTheme {
  return WINGS[id] ?? WINGS.core
}
