import { Product } from '../data/outfits';

export type ColorType = 'neutral' | 'earth' | 'accent' | 'special';

export interface ColorProfile {
  type: ColorType;
  warmth: 'warm' | 'cool' | 'neutral';
  lightness: 'light' | 'medium' | 'dark';
}

export const COLOR_PROFILES: Record<string, ColorProfile> = {
  black: { type: 'neutral', warmth: 'neutral', lightness: 'dark' },
  white: { type: 'neutral', warmth: 'neutral', lightness: 'light' },
  grey: { type: 'neutral', warmth: 'cool', lightness: 'medium' },
  charcoal: { type: 'neutral', warmth: 'cool', lightness: 'dark' },
  navy: { type: 'neutral', warmth: 'cool', lightness: 'dark' },
  beige: { type: 'neutral', warmth: 'warm', lightness: 'light' },
  cream: { type: 'neutral', warmth: 'warm', lightness: 'light' },
  ivory: { type: 'neutral', warmth: 'warm', lightness: 'light' },
  denim: { type: 'neutral', warmth: 'cool', lightness: 'medium' },

  brown: { type: 'earth', warmth: 'warm', lightness: 'dark' },
  tan: { type: 'earth', warmth: 'warm', lightness: 'medium' },
  camel: { type: 'earth', warmth: 'warm', lightness: 'medium' },
  olive: { type: 'earth', warmth: 'warm', lightness: 'medium' },
  khaki: { type: 'earth', warmth: 'warm', lightness: 'medium' },
  sage: { type: 'earth', warmth: 'cool', lightness: 'medium' },
  rust: { type: 'earth', warmth: 'warm', lightness: 'medium' },
  mustard: { type: 'earth', warmth: 'warm', lightness: 'medium' },
  burgundy: { type: 'earth', warmth: 'warm', lightness: 'dark' },
  wine: { type: 'earth', warmth: 'warm', lightness: 'dark' },

  red: { type: 'accent', warmth: 'warm', lightness: 'medium' },
  blue: { type: 'accent', warmth: 'cool', lightness: 'medium' },
  green: { type: 'accent', warmth: 'cool', lightness: 'medium' },
  yellow: { type: 'accent', warmth: 'warm', lightness: 'light' },
  orange: { type: 'accent', warmth: 'warm', lightness: 'medium' },
  pink: { type: 'accent', warmth: 'warm', lightness: 'light' },
  purple: { type: 'accent', warmth: 'cool', lightness: 'medium' },
  coral: { type: 'accent', warmth: 'warm', lightness: 'medium' },
  teal: { type: 'accent', warmth: 'cool', lightness: 'medium' },
  mint: { type: 'accent', warmth: 'cool', lightness: 'light' },
  sky_blue: { type: 'accent', warmth: 'cool', lightness: 'light' },
  lavender: { type: 'accent', warmth: 'cool', lightness: 'light' },

  metallic: { type: 'special', warmth: 'neutral', lightness: 'medium' },
  multi: { type: 'special', warmth: 'neutral', lightness: 'medium' },
};

function makePairKey(c1: string, c2: string): string {
  return [c1, c2].sort().join('-');
}

const HARMONY_OVERRIDES: Record<string, number> = {};
function h(c1: string, c2: string, score: number) {
  HARMONY_OVERRIDES[makePairKey(c1, c2)] = score;
}

h('black', 'white', 95); h('navy', 'white', 95); h('navy', 'beige', 92);
h('navy', 'cream', 92); h('black', 'grey', 90); h('black', 'beige', 88);
h('charcoal', 'white', 92); h('charcoal', 'beige', 88); h('charcoal', 'cream', 87);
h('black', 'red', 90); h('navy', 'red', 85); h('black', 'cream', 88);
h('black', 'ivory', 88); h('navy', 'ivory', 90); h('grey', 'white', 88);
h('grey', 'navy', 82); h('grey', 'beige', 80); h('denim', 'white', 90);
h('denim', 'beige', 85); h('denim', 'black', 88); h('denim', 'cream', 85);

h('beige', 'brown', 92); h('cream', 'brown', 90); h('beige', 'olive', 85);
h('brown', 'olive', 82); h('camel', 'navy', 90); h('camel', 'white', 88);
h('tan', 'navy', 88); h('tan', 'white', 86); h('burgundy', 'navy', 85);
h('burgundy', 'beige', 88); h('burgundy', 'cream', 86); h('burgundy', 'grey', 82);
h('rust', 'navy', 82); h('rust', 'beige', 84); h('rust', 'cream', 82);
h('mustard', 'navy', 84); h('mustard', 'brown', 78); h('mustard', 'grey', 76);
h('khaki', 'white', 82); h('khaki', 'navy', 80); h('khaki', 'brown', 78);
h('sage', 'beige', 82); h('sage', 'cream', 80); h('sage', 'white', 80);
h('wine', 'beige', 85); h('wine', 'grey', 82); h('wine', 'cream', 84);
h('olive', 'beige', 84); h('olive', 'cream', 82); h('olive', 'white', 80);
h('camel', 'black', 85); h('camel', 'brown', 80); h('tan', 'brown', 82);
h('burgundy', 'black', 84); h('wine', 'navy', 82); h('wine', 'black', 83);
h('rust', 'black', 78); h('rust', 'brown', 75); h('mustard', 'black', 78);

h('blue', 'white', 90); h('blue', 'beige', 82); h('blue', 'grey', 80);
h('green', 'beige', 82); h('green', 'white', 80); h('green', 'brown', 78);
h('green', 'cream', 80); h('green', 'navy', 72);
h('red', 'grey', 78); h('red', 'beige', 75); h('red', 'cream', 76);
h('yellow', 'navy', 85); h('yellow', 'grey', 78); h('yellow', 'black', 80);
h('pink', 'grey', 80); h('pink', 'navy', 78); h('pink', 'white', 82);
h('pink', 'beige', 78); h('pink', 'cream', 80);
h('purple', 'grey', 78); h('purple', 'white', 76); h('purple', 'black', 80);
h('orange', 'navy', 82); h('orange', 'black', 78); h('orange', 'beige', 75);
h('coral', 'navy', 80); h('coral', 'beige', 78); h('coral', 'white', 80);
h('teal', 'beige', 80); h('teal', 'white', 82); h('teal', 'cream', 80);
h('mint', 'white', 80); h('mint', 'beige', 76); h('mint', 'navy', 78);
h('sky_blue', 'white', 82); h('sky_blue', 'beige', 78); h('sky_blue', 'navy', 75);
h('lavender', 'white', 80); h('lavender', 'grey', 78); h('lavender', 'beige', 75);

h('red', 'orange', 35); h('red', 'pink', 40); h('red', 'purple', 38);
h('orange', 'pink', 35); h('green', 'red', 38); h('blue', 'orange', 42);
h('purple', 'yellow', 35); h('purple', 'orange', 32); h('green', 'purple', 38);
h('pink', 'orange', 40); h('yellow', 'purple', 35); h('red', 'green', 38);
h('yellow', 'pink', 42); h('coral', 'red', 45); h('orange', 'red', 35);

h('metallic', 'black', 90); h('metallic', 'white', 85); h('metallic', 'navy', 82);
h('metallic', 'grey', 80); h('metallic', 'beige', 75);
h('multi', 'black', 82); h('multi', 'white', 80); h('multi', 'grey', 78);
h('multi', 'navy', 76); h('multi', 'beige', 74);

export function getColorHarmonyScore(c1: string, c2: string): number {
  if (c1 === c2) {
    const profile = COLOR_PROFILES[c1];
    if (!profile) return 50;
    return profile.type === 'neutral' ? 82 : 45;
  }

  const override = HARMONY_OVERRIDES[makePairKey(c1, c2)];
  if (override !== undefined) return override;

  const p1 = COLOR_PROFILES[c1];
  const p2 = COLOR_PROFILES[c2];
  if (!p1 || !p2) return 50;

  if (p1.type === 'neutral' && p2.type === 'neutral') return 85;
  if (p1.type === 'neutral' || p2.type === 'neutral') return 78;

  if (p1.type === 'earth' && p2.type === 'earth') {
    let s = 72;
    if (p1.warmth === p2.warmth) s += 8;
    if (p1.lightness !== p2.lightness) s += 5;
    return Math.min(100, s);
  }

  if (p1.type === 'special' || p2.type === 'special') return 70;

  if ((p1.type === 'earth') !== (p2.type === 'earth')) {
    let s = 58;
    if (p1.warmth === p2.warmth) s += 12;
    else if (p1.warmth === 'neutral' || p2.warmth === 'neutral') s += 6;
    if (p1.lightness !== p2.lightness) s += 5;
    return Math.min(100, s);
  }

  let s = 40;
  if (p1.warmth === p2.warmth) s += 15;
  else s -= 5;
  if (p1.lightness !== p2.lightness) s += 8;
  return Math.max(25, Math.min(100, s));
}

export function isNeutralColor(color: string): boolean {
  return COLOR_PROFILES[color]?.type === 'neutral';
}

export function isEarthTone(color: string): boolean {
  return COLOR_PROFILES[color]?.type === 'earth';
}

export const MATERIAL_GROUPS: Record<string, string[]> = {
  luxe: ['silk', 'satin', 'velvet', 'cashmere', 'chiffon', 'organza', '실크', '새틴', '벨벳', '캐시미어', '시폰', '오간자'],
  structured: ['denim', 'leather', 'tweed', 'suede', 'corduroy', '데님', '가죽', '레더', '트위드', '스웨이드', '코듀로이'],
  classic: ['wool', 'cotton', 'linen', '울', '면', '린넨', '리넨', '모직', '코튼'],
  casual: ['jersey', 'fleece', 'sweatshirt', 'terry', '저지', '플리스', '기모', '테리'],
  knit: ['knit', 'crochet', 'ribbed', 'cable-knit', 'mohair', '니트', '크로셰', '립', '모헤어'],
  technical: ['nylon', 'polyester', 'gore-tex', 'spandex', 'mesh', '나일론', '폴리에스터', '고어텍스', '스판덱스', '메시'],
  blend: ['blend', '혼방', '혼합', '블렌드'],
  eco: ['tencel', 'modal', 'bamboo', '텐셀', '모달', '대나무'],
  sheer: ['lace', 'tulle', 'voile', '레이스', '튤', '보일'],
  fur: ['fur', 'faux fur', 'shearling', '퍼', '인조퍼', '시어링', '양털'],
  down: ['padding', '다운', '패딩', '충전재', '오리털', '거위털'],
  waxed: ['waxed', 'coated', '왁스', '코팅', '라미네이트'],
};

export const MATERIAL_COMPAT: Record<string, number> = {
  'luxe-luxe': 1.0, 'luxe-classic': 0.85, 'luxe-structured': 0.65, 'luxe-knit': 0.55,
  'luxe-casual': 0.3, 'luxe-technical': 0.2, 'luxe-blend': 0.6, 'luxe-eco': 0.7,
  'luxe-sheer': 0.85, 'luxe-waxed': 0.3, 'luxe-fur': 0.8, 'luxe-down': 0.3,
  'structured-structured': 1.0, 'structured-classic': 0.9, 'structured-casual': 0.65,
  'structured-knit': 0.65, 'structured-technical': 0.55, 'structured-blend': 0.75,
  'structured-eco': 0.7, 'structured-sheer': 0.4, 'structured-waxed': 0.8,
  'structured-fur': 0.7, 'structured-down': 0.6,
  'classic-classic': 1.0, 'classic-casual': 0.8, 'classic-knit': 0.85, 'classic-technical': 0.55,
  'classic-blend': 0.9, 'classic-eco': 0.9, 'classic-sheer': 0.6, 'classic-waxed': 0.5,
  'classic-fur': 0.6, 'classic-down': 0.55,
  'casual-casual': 1.0, 'casual-knit': 0.9, 'casual-technical': 0.75, 'casual-blend': 0.85,
  'casual-eco': 0.85, 'casual-sheer': 0.3, 'casual-waxed': 0.5, 'casual-fur': 0.55,
  'casual-down': 0.7,
  'knit-knit': 1.0, 'knit-technical': 0.5, 'knit-blend': 0.85, 'knit-eco': 0.8,
  'knit-sheer': 0.5, 'knit-waxed': 0.35, 'knit-fur': 0.7, 'knit-down': 0.6,
  'technical-technical': 1.0, 'technical-blend': 0.7, 'technical-eco': 0.6,
  'technical-sheer': 0.2, 'technical-waxed': 0.8, 'technical-fur': 0.4, 'technical-down': 0.8,
  'blend-blend': 1.0, 'blend-eco': 0.85, 'blend-sheer': 0.5, 'blend-waxed': 0.55,
  'blend-fur': 0.6, 'blend-down': 0.65,
  'eco-eco': 1.0, 'eco-sheer': 0.6, 'eco-waxed': 0.4, 'eco-fur': 0.3, 'eco-down': 0.5,
  'sheer-sheer': 0.8, 'sheer-waxed': 0.15, 'sheer-fur': 0.5, 'sheer-down': 0.2,
  'waxed-waxed': 0.9, 'waxed-fur': 0.6, 'waxed-down': 0.7,
  'fur-fur': 0.7, 'fur-down': 0.8,
  'down-down': 0.9,
};

export function getMaterialGroup(material: string): string | null {
  if (!material) return null;
  const m = material.toLowerCase().trim();
  for (const [group, materials] of Object.entries(MATERIAL_GROUPS)) {
    if (materials.some(mat => {
      if (mat.length <= 3) {
        const regex = new RegExp(`(^|[\\s,/])${mat}($|[\\s,/])`, 'i');
        return regex.test(m);
      }
      return m.includes(mat);
    })) return group;
  }
  return null;
}

export function getMaterialCompatScore(g1: string, g2: string): number {
  return MATERIAL_COMPAT[`${g1}-${g2}`] ?? MATERIAL_COMPAT[`${g2}-${g1}`] ?? 0.5;
}

const PATTERN_COMPAT: Record<string, Record<string, number>> = {
  solid:   { solid: 85, stripe: 90, check: 88, graphic: 80, print: 78, floral: 82, other: 75 },
  stripe:  { solid: 90, stripe: 30, check: 25, graphic: 35, print: 40, floral: 35, other: 45 },
  check:   { solid: 88, stripe: 25, check: 25, graphic: 35, print: 38, floral: 30, other: 40 },
  graphic: { solid: 80, stripe: 35, check: 35, graphic: 30, print: 35, floral: 30, other: 40 },
  print:   { solid: 78, stripe: 40, check: 38, graphic: 35, print: 28, floral: 30, other: 40 },
  floral:  { solid: 82, stripe: 35, check: 30, graphic: 30, print: 30, floral: 25, other: 35 },
  other:   { solid: 75, stripe: 45, check: 40, graphic: 40, print: 40, floral: 35, other: 50 },
};

export function getPatternCompatScore(p1: string, p2: string): number {
  const s1 = p1.toLowerCase();
  const s2 = p2.toLowerCase();
  return PATTERN_COMPAT[s1]?.[s2] ?? PATTERN_COMPAT[s2]?.[s1] ?? 50;
}

const VIBE_DISTANCES: Record<string, Record<string, number>> = {
  ELEVATED_COOL: {
    ELEVATED_COOL: 0, ARTISTIC_MINIMAL: 1, EFFORTLESS_NATURAL: 2,
    RETRO_LUXE: 2, CREATIVE_LAYERED: 2, SPORT_MODERN: 3,
  },
  EFFORTLESS_NATURAL: {
    EFFORTLESS_NATURAL: 0, ARTISTIC_MINIMAL: 1, ELEVATED_COOL: 2,
    CREATIVE_LAYERED: 2, RETRO_LUXE: 3, SPORT_MODERN: 2,
  },
  ARTISTIC_MINIMAL: {
    ARTISTIC_MINIMAL: 0, ELEVATED_COOL: 1, EFFORTLESS_NATURAL: 1,
    CREATIVE_LAYERED: 2, RETRO_LUXE: 2, SPORT_MODERN: 3,
  },
  RETRO_LUXE: {
    RETRO_LUXE: 0, CREATIVE_LAYERED: 1, ELEVATED_COOL: 2,
    ARTISTIC_MINIMAL: 2, EFFORTLESS_NATURAL: 3, SPORT_MODERN: 3,
  },
  SPORT_MODERN: {
    SPORT_MODERN: 0, EFFORTLESS_NATURAL: 2, CREATIVE_LAYERED: 2,
    ELEVATED_COOL: 3, ARTISTIC_MINIMAL: 3, RETRO_LUXE: 3,
  },
  CREATIVE_LAYERED: {
    CREATIVE_LAYERED: 0, RETRO_LUXE: 1, ARTISTIC_MINIMAL: 2,
    ELEVATED_COOL: 2, EFFORTLESS_NATURAL: 2, SPORT_MODERN: 2,
  },
};

export function getVibeDistance(v1: string, v2: string): number {
  return VIBE_DISTANCES[v1]?.[v2] ?? VIBE_DISTANCES[v2]?.[v1] ?? 3;
}

export function getVibeCompatScore(v1: string, v2: string): number {
  const distance = getVibeDistance(v1, v2);
  return [100, 85, 65, 40, 20][Math.min(distance, 4)];
}

export const SUB_CATEGORY_STYLE: Record<string, string> = {
  blazer: 'formal', suit_jacket: 'formal', dress_shirt: 'formal', blouse: 'formal',
  slacks: 'formal', dress_pants: 'formal', pencil_skirt: 'formal',
  trench_coat: 'formal', trench: 'formal',
  oxford: 'formal', loafer: 'formal', heel: 'formal', derby: 'formal',
  clutch: 'formal', structured_bag: 'formal',

  cardigan: 'smart_casual', polo: 'smart_casual', chino: 'smart_casual', chinos: 'smart_casual',
  midi_skirt: 'smart_casual', ankle_boot: 'smart_casual', knit_vest: 'smart_casual',
  knit: 'smart_casual', shirt: 'smart_casual', turtleneck: 'smart_casual',
  sweater: 'smart_casual', vest: 'smart_casual', fleece: 'casual', tank: 'casual',
  tote: 'smart_casual', shoulder_bag: 'smart_casual', watch: 'smart_casual',
  coat: 'smart_casual', boot: 'smart_casual',

  t_shirt: 'casual', tshirt: 'casual', hoodie: 'casual', sweatshirt: 'casual',
  denim_jacket: 'casual', jacket: 'casual',
  jeans: 'casual', denim: 'casual', jogger: 'casual', shorts: 'casual', cargo: 'casual',
  sneaker: 'casual', sandal: 'casual', canvas: 'casual', runner: 'casual',
  backpack: 'casual', crossbody: 'casual', cap: 'casual', beanie: 'casual',
  belt: 'casual', scarf: 'casual', glove: 'casual', duffle: 'casual',

  track_jacket: 'sporty', windbreaker: 'sporty', puffer: 'sporty',
  legging: 'sporty', track_pants: 'sporty', biker_shorts: 'sporty',
  running_shoe: 'sporty', training_shoe: 'sporty', sports_bag: 'sporty',
};

export const STYLE_COMPAT: Record<string, Record<string, number>> = {
  formal:       { formal: 1.0, smart_casual: 0.75, casual: 0.35, sporty: 0.1 },
  smart_casual: { formal: 0.75, smart_casual: 1.0, casual: 0.8, sporty: 0.4 },
  casual:       { formal: 0.35, smart_casual: 0.8, casual: 1.0, sporty: 0.7 },
  sporty:       { formal: 0.1, smart_casual: 0.4, casual: 0.7, sporty: 1.0 },
};

export const SILHOUETTE_BALANCE: Record<string, string[]> = {
  oversized: ['slim', 'fitted', 'straight', 'tapered'],
  relaxed: ['slim', 'fitted', 'straight', 'tapered'],
  wide: ['fitted', 'slim'],
  fitted: ['wide', 'relaxed', 'oversized', 'straight'],
  slim: ['wide', 'relaxed', 'oversized', 'regular'],
  regular: ['slim', 'fitted', 'wide', 'relaxed', 'oversized'],
  straight: ['fitted', 'slim', 'oversized', 'relaxed'],
  tapered: ['relaxed', 'oversized', 'regular', 'wide'],
};

const COLOR_NAME_TO_FAMILY: Record<string, string> = {
  '검정': 'black', '검정색': 'black', '블랙': 'black',
  '흰색': 'white', '화이트': 'white', '백색': 'white',
  '회색': 'grey', '그레이': 'grey',
  '네이비': 'navy', '남색': 'navy',
  '베이지': 'beige', '베이지색': 'beige',
  '갈색': 'brown', '브라운': 'brown',
  '파란색': 'blue', '파랑': 'blue', '블루': 'blue',
  '초록': 'green', '초록색': 'green', '그린': 'green',
  '빨강': 'red', '빨간색': 'red', '레드': 'red',
  '노랑': 'yellow', '노란색': 'yellow', '옐로우': 'yellow',
  '보라': 'purple', '보라색': 'purple', '퍼플': 'purple',
  '핑크': 'pink', '분홍': 'pink', '분홍색': 'pink',
  '주황': 'orange', '주황색': 'orange', '오렌지': 'orange',
  '카키': 'khaki', '카키색': 'khaki',
  '크림': 'cream', '크림색': 'cream',
  '아이보리': 'ivory',
  '버건디': 'burgundy', '와인': 'wine', '와인색': 'wine',
  '올리브': 'olive', '올리브색': 'olive',
  '머스타드': 'mustard', '겨자색': 'mustard',
  '코랄': 'coral', '차콜': 'charcoal', '차콜색': 'charcoal',
  '탄': 'tan', '카멜': 'camel',
  '러스트': 'rust', '세이지': 'sage',
  '민트': 'mint', '민트색': 'mint',
  '라벤더': 'lavender', '틸': 'teal',
  '스카이블루': 'sky_blue', '하늘색': 'sky_blue',
  '데님': 'denim', '메탈릭': 'metallic', '실버': 'metallic', '골드': 'metallic',
  black: 'black', white: 'white', grey: 'grey', gray: 'grey',
  navy: 'navy', beige: 'beige', brown: 'brown', blue: 'blue',
  green: 'green', red: 'red', yellow: 'yellow', purple: 'purple',
  pink: 'pink', orange: 'orange', khaki: 'khaki', cream: 'cream',
  ivory: 'ivory', burgundy: 'burgundy', wine: 'wine', olive: 'olive',
  mustard: 'mustard', coral: 'coral', charcoal: 'charcoal',
  tan: 'tan', camel: 'camel', rust: 'rust', sage: 'sage',
  mint: 'mint', lavender: 'lavender', teal: 'teal',
  denim: 'denim', metallic: 'metallic', silver: 'metallic', gold: 'metallic',
  maroon: 'burgundy', 'off-white': 'cream', 'dark grey': 'charcoal',
  'light blue': 'sky_blue', 'sky blue': 'sky_blue', 'dark red': 'burgundy',
  'dark green': 'olive', 'light grey': 'grey', 'light green': 'mint',
};

export function inferColorFamily(product: Product): string {
  if (product.color_family) return product.color_family;

  const colorName = (product.color || '').toLowerCase().trim();
  if (!colorName) return '';

  if (COLOR_NAME_TO_FAMILY[colorName]) return COLOR_NAME_TO_FAMILY[colorName];

  if (colorName.length >= 2) {
    for (const [name, family] of Object.entries(COLOR_NAME_TO_FAMILY)) {
      if (name.length < 2) continue;
      if (colorName.includes(name) || (colorName.length >= 3 && name.includes(colorName))) return family;
    }
  }

  const productName = (product.name || '').toLowerCase();
  if (productName.length >= 2) {
    for (const [name, family] of Object.entries(COLOR_NAME_TO_FAMILY)) {
      if (name.length < 2) continue;
      if (productName.includes(name)) return family;
    }
  }

  return '';
}

export function inferMaterialGroup(product: Product): string | null {
  const group = getMaterialGroup(product.material || '');
  if (group) return group;

  const name = (product.name || '').toLowerCase();
  for (const [grp, materials] of Object.entries(MATERIAL_GROUPS)) {
    if (materials.some(mat => {
      if (mat.length <= 4) {
        const regex = new RegExp(`(^|[\\s,/])${mat}($|[\\s,/])`, 'i');
        return regex.test(name);
      }
      return name.includes(mat);
    })) return grp;
  }

  return null;
}

export function inferSubCategoryStyle(product: Product): string | null {
  const sub = (product.sub_category || '').toLowerCase().replace(/[\s-]/g, '_');
  if (SUB_CATEGORY_STYLE[sub]) return SUB_CATEGORY_STYLE[sub];

  const name = (product.name || '').toLowerCase();
  for (const [cat, style] of Object.entries(SUB_CATEGORY_STYLE)) {
    if (name.includes(cat.replace(/_/g, ' ')) || name.includes(cat)) return style;
  }

  if (product.formality !== undefined) {
    if (product.formality >= 4) return 'formal';
    if (product.formality >= 3) return 'smart_casual';
    if (product.formality >= 2) return 'casual';
    return 'sporty';
  }

  return null;
}
