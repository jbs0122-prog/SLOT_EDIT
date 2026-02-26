export type { VibeKey, LookKey, SlotCategory, VibeLookDefinition, VibeDefinition, VibeDNA } from './vibeItems/types';
export { getVibeDNA, getLookDNA, getVibeDistance, getVibeCompatScore } from './vibeItems/vibeDna';

import { VibeKey, VibeDefinition } from './vibeItems/types';
import { ELEVATED_COOL } from './vibeItems/elevatedCool';
import { EFFORTLESS_NATURAL } from './vibeItems/effortlessNatural';
import { ARTISTIC_MINIMAL } from './vibeItems/artisticMinimal';
import { RETRO_LUXE } from './vibeItems/retroLuxe';
import { SPORT_MODERN } from './vibeItems/sportModern';
import { CREATIVE_LAYERED } from './vibeItems/creativeLayered';

export const VIBE_ITEM_DATABASE: Record<VibeKey, VibeDefinition> = {
  ELEVATED_COOL,
  EFFORTLESS_NATURAL,
  ARTISTIC_MINIMAL,
  RETRO_LUXE,
  SPORT_MODERN,
  CREATIVE_LAYERED,
};
