import type { CampaignDef, LevelDef } from './types'
import { CAMPAIGN_0_LEVELS } from './levels/campaign-0'
import { CAMPAIGN_1_LEVELS } from './levels/campaign-1'
import { CAMPAIGN_2_LEVELS } from './levels/campaign-2'
import { CAMPAIGN_3_LEVELS } from './levels/campaign-3'
import { CAMPAIGN_4_LEVELS } from './levels/campaign-4'
import { CAMPAIGN_5_LEVELS } from './levels/campaign-5'
import { CAMPAIGN_6_LEVELS } from './levels/campaign-6'
import { CAMPAIGN_7_LEVELS } from './levels/campaign-7'

/**
 * The Underscene Map. Every campaign is playable; each unlocks when the one
 * before it is cleared. A campaign marked `planned` would show as a locked pin
 * carrying its tagline — the mechanism stays in place for future wings.
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
    levels: CAMPAIGN_1_LEVELS.map((l) => l.id),
    requires: 'first-basement',
    status: 'playable',
  },
  {
    id: 'rehearsal-crypt',
    index: 2,
    name: 'The Rehearsal Crypt',
    wing: 'metal',
    tagline: 'Bigger, meaner, slower. The raids hit like a kick drum.',
    mapPos: { x: 0.40, y: 0.68 },
    levels: CAMPAIGN_2_LEVELS.map((l) => l.id),
    requires: 'basement-diy',
    status: 'playable',
  },
  {
    id: 'reverb-hollow',
    index: 3,
    name: 'Reverb Hollow',
    wing: 'shoegaze',
    tagline: 'Everything is quiet, passive and slow. Deliberately.',
    mapPos: { x: 0.52, y: 0.32 },
    levels: CAMPAIGN_3_LEVELS.map((l) => l.id),
    requires: 'rehearsal-crypt',
    status: 'playable',
  },
  {
    id: 'sample-vault',
    index: 4,
    name: 'The Sample Vault',
    wing: 'hiphop',
    tagline: 'Flip what you have into something worth more. The economy wing.',
    mapPos: { x: 0.63, y: 0.60 },
    levels: CAMPAIGN_4_LEVELS.map((l) => l.id),
    requires: 'reverb-hollow',
    status: 'playable',
  },
  {
    id: 'analog-deep',
    index: 5,
    name: 'Analog Deep',
    wing: 'electronic',
    tagline: 'Fastest Buzz in the game. Fastest decay, too.',
    mapPos: { x: 0.74, y: 0.30 },
    levels: CAMPAIGN_5_LEVELS.map((l) => l.id),
    requires: 'sample-vault',
    status: 'playable',
  },
  {
    id: 'kindling-hall',
    index: 6,
    name: 'The Kindling Hall',
    wing: 'folk',
    tagline: 'Slow-burn and communal. Everyone buffs everyone.',
    mapPos: { x: 0.84, y: 0.58 },
    levels: CAMPAIGN_6_LEVELS.map((l) => l.id),
    requires: 'analog-deep',
    status: 'playable',
  },
  {
    id: 'the-algorithm',
    index: 7,
    name: 'The Algorithm',
    wing: 'finale',
    tagline: 'Every wing, one basement, one very large opinion about playlists.',
    mapPos: { x: 0.93, y: 0.20 },
    levels: CAMPAIGN_7_LEVELS.map((l) => l.id),
    requires: 'kindling-hall',
    status: 'playable',
  },
]

export const LEVELS: LevelDef[] = [
  ...CAMPAIGN_0_LEVELS,
  ...CAMPAIGN_1_LEVELS,
  ...CAMPAIGN_2_LEVELS,
  ...CAMPAIGN_3_LEVELS,
  ...CAMPAIGN_4_LEVELS,
  ...CAMPAIGN_5_LEVELS,
  ...CAMPAIGN_6_LEVELS,
  ...CAMPAIGN_7_LEVELS,
]

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
