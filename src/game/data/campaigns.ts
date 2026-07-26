import type { CampaignDef, LevelDef } from './types'
import { CAMPAIGN_0_LEVELS } from './levels/campaign-0'

/**
 * The Underscene Map. Campaigns marked `planned` show on the hub as locked
 * with their design-doc tagline, so the map reads as a whole game from Phase 0
 * while only the built wings are enterable.
 */
export const CAMPAIGNS: CampaignDef[] = [
  {
    id: 'first-basement',
    index: 0,
    name: 'The First Basement',
    wing: 'punk',
    tagline: 'You start a label out of spite and a leaky basement.',
    mapPos: { x: 0.12, y: 0.62 },
    levels: CAMPAIGN_0_LEVELS.map((l) => l.id),
    requires: null,
    status: 'playable',
  },
  {
    id: 'basement-diy',
    index: 1,
    name: 'Basement DIY',
    wing: 'punk',
    tagline: 'Word gets out. The first scouts show up. Somebody brings a trombone.',
    mapPos: { x: 0.26, y: 0.42 },
    levels: [],
    requires: 'first-basement',
    status: 'planned',
  },
  {
    id: 'rehearsal-crypt',
    index: 2,
    name: 'The Rehearsal Crypt',
    wing: 'metal',
    tagline: 'Bigger, meaner, slower. The raids hit like a kick drum.',
    mapPos: { x: 0.40, y: 0.68 },
    levels: [],
    requires: 'basement-diy',
    status: 'planned',
  },
  {
    id: 'reverb-hollow',
    index: 3,
    name: 'Reverb Hollow',
    wing: 'shoegaze',
    tagline: 'Everything is quiet, passive and slow. Deliberately.',
    mapPos: { x: 0.52, y: 0.32 },
    levels: [],
    requires: 'rehearsal-crypt',
    status: 'planned',
  },
  {
    id: 'sample-vault',
    index: 4,
    name: 'The Sample Vault',
    wing: 'hiphop',
    tagline: 'Flip what you have into something worth more. The economy wing.',
    mapPos: { x: 0.63, y: 0.60 },
    levels: [],
    requires: 'reverb-hollow',
    status: 'planned',
  },
  {
    id: 'analog-deep',
    index: 5,
    name: 'Analog Deep',
    wing: 'electronic',
    tagline: 'Fastest Buzz in the game. Fastest decay, too.',
    mapPos: { x: 0.74, y: 0.30 },
    levels: [],
    requires: 'sample-vault',
    status: 'planned',
  },
  {
    id: 'kindling-hall',
    index: 6,
    name: 'The Kindling Hall',
    wing: 'folk',
    tagline: 'Slow-burn and communal. Everyone buffs everyone.',
    mapPos: { x: 0.84, y: 0.58 },
    levels: [],
    requires: 'analog-deep',
    status: 'planned',
  },
  {
    id: 'the-algorithm',
    index: 7,
    name: 'The Algorithm',
    wing: 'finale',
    tagline: 'Every wing, one basement, one very large opinion about playlists.',
    mapPos: { x: 0.93, y: 0.20 },
    levels: [],
    requires: 'kindling-hall',
    status: 'planned',
  },
]

export const LEVELS: LevelDef[] = [...CAMPAIGN_0_LEVELS]

const LEVELS_BY_ID = new Map(LEVELS.map((l) => [l.id, l]))
const CAMPAIGNS_BY_ID = new Map(CAMPAIGNS.map((c) => [c.id, c]))

export function level(id: string): LevelDef {
  const def = LEVELS_BY_ID.get(id)
  if (!def) throw new Error(`Unknown level: ${id}`)
  return def
}

export function levelOrNull(id: string): LevelDef | null {
  return LEVELS_BY_ID.get(id) ?? null
}

export function campaign(id: string): CampaignDef {
  const def = CAMPAIGNS_BY_ID.get(id)
  if (!def) throw new Error(`Unknown campaign: ${id}`)
  return def
}

export function levelsOf(campaignId: string): LevelDef[] {
  return campaign(campaignId).levels.map(level)
}
