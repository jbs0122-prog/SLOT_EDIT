import { ColorDNA } from './types';

interface ColorEntry {
  hue: number;
  saturation: number;
  lightness: number;
  tone: 'warm' | 'cool' | 'neutral';
  type: 'neutral' | 'earth' | 'accent' | 'special';
}

const COLOR_HSL_MAP: Record<string, ColorEntry> = {
  black:     { hue: 0, saturation: 0, lightness: 5, tone: 'neutral', type: 'neutral' },
  white:     { hue: 0, saturation: 0, lightness: 98, tone: 'neutral', type: 'neutral' },
  grey:      { hue: 0, saturation: 0, lightness: 50, tone: 'cool', type: 'neutral' },
  charcoal:  { hue: 0, saturation: 0, lightness: 25, tone: 'cool', type: 'neutral' },
  navy:      { hue: 225, saturation: 60, lightness: 22, tone: 'cool', type: 'neutral' },
  beige:     { hue: 38, saturation: 36, lightness: 80, tone: 'warm', type: 'neutral' },
  cream:     { hue: 42, saturation: 50, lightness: 90, tone: 'warm', type: 'neutral' },
  ivory:     { hue: 48, saturation: 60, lightness: 93, tone: 'warm', type: 'neutral' },
  denim:     { hue: 215, saturation: 35, lightness: 45, tone: 'cool', type: 'neutral' },

  brown:     { hue: 25, saturation: 50, lightness: 30, tone: 'warm', type: 'earth' },
  tan:       { hue: 30, saturation: 40, lightness: 60, tone: 'warm', type: 'earth' },
  camel:     { hue: 32, saturation: 45, lightness: 55, tone: 'warm', type: 'earth' },
  olive:     { hue: 80, saturation: 35, lightness: 38, tone: 'warm', type: 'earth' },
  khaki:     { hue: 50, saturation: 30, lightness: 55, tone: 'warm', type: 'earth' },
  sage:      { hue: 100, saturation: 20, lightness: 55, tone: 'cool', type: 'earth' },
  rust:      { hue: 15, saturation: 65, lightness: 40, tone: 'warm', type: 'earth' },
  mustard:   { hue: 45, saturation: 70, lightness: 50, tone: 'warm', type: 'earth' },
  burgundy:  { hue: 345, saturation: 55, lightness: 25, tone: 'warm', type: 'earth' },
  wine:      { hue: 340, saturation: 50, lightness: 28, tone: 'warm', type: 'earth' },

  red:       { hue: 0, saturation: 80, lightness: 48, tone: 'warm', type: 'accent' },
  blue:      { hue: 215, saturation: 65, lightness: 50, tone: 'cool', type: 'accent' },
  green:     { hue: 140, saturation: 50, lightness: 40, tone: 'cool', type: 'accent' },
  yellow:    { hue: 50, saturation: 85, lightness: 60, tone: 'warm', type: 'accent' },
  orange:    { hue: 25, saturation: 85, lightness: 55, tone: 'warm', type: 'accent' },
  pink:      { hue: 340, saturation: 60, lightness: 70, tone: 'warm', type: 'accent' },
  purple:    { hue: 275, saturation: 50, lightness: 42, tone: 'cool', type: 'accent' },
  coral:     { hue: 10, saturation: 65, lightness: 60, tone: 'warm', type: 'accent' },
  teal:      { hue: 180, saturation: 55, lightness: 38, tone: 'cool', type: 'accent' },
  mint:      { hue: 160, saturation: 40, lightness: 72, tone: 'cool', type: 'accent' },
  sky_blue:  { hue: 200, saturation: 55, lightness: 70, tone: 'cool', type: 'accent' },
  lavender:  { hue: 270, saturation: 40, lightness: 72, tone: 'cool', type: 'accent' },

  metallic:  { hue: 0, saturation: 5, lightness: 65, tone: 'neutral', type: 'special' },
  multi:     { hue: 0, saturation: 50, lightness: 50, tone: 'neutral', type: 'special' },
  gold:      { hue: 42, saturation: 70, lightness: 50, tone: 'warm', type: 'special' },
  silver:    { hue: 0, saturation: 0, lightness: 72, tone: 'cool', type: 'special' },
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
  denim: 'denim', metallic: 'metallic', silver: 'silver', gold: 'gold',
  maroon: 'burgundy', 'off-white': 'cream', 'dark grey': 'charcoal',
  'light blue': 'sky_blue', 'sky blue': 'sky_blue', 'dark red': 'burgundy',
  'dark green': 'olive', 'light grey': 'grey', 'light green': 'mint',
};

export function resolveColorFamily(colorStr: string, colorFamily?: string): string {
  if (colorFamily) return colorFamily;
  if (!colorStr) return '';

  const c = colorStr.toLowerCase().trim();
  if (COLOR_NAME_TO_FAMILY[c]) return COLOR_NAME_TO_FAMILY[c];

  if (c.length >= 2) {
    for (const [name, family] of Object.entries(COLOR_NAME_TO_FAMILY)) {
      if (name.length < 2) continue;
      if (c.includes(name) || (c.length >= 3 && name.includes(c))) return family;
    }
  }

  return '';
}

export function getColorDNA(family: string): ColorDNA {
  const entry = COLOR_HSL_MAP[family];
  if (!entry) {
    return { hue: 0, saturation: 0, lightness: 50, family: '', tone: 'neutral', type: 'neutral' };
  }
  return {
    hue: entry.hue,
    saturation: entry.saturation,
    lightness: entry.lightness,
    family,
    tone: entry.tone,
    type: entry.type,
  };
}

export function isNeutralColor(family: string): boolean {
  return COLOR_HSL_MAP[family]?.type === 'neutral';
}

export function isEarthTone(family: string): boolean {
  return COLOR_HSL_MAP[family]?.type === 'earth';
}

function hueDifference(h1: number, h2: number): number {
  const diff = Math.abs(h1 - h2);
  return Math.min(diff, 360 - diff);
}

export function getColorDistance(a: ColorDNA, b: ColorDNA): number {
  if (!a.family || !b.family) return 50;

  const hueDiff = hueDifference(a.hue, b.hue);
  const satDiff = Math.abs(a.saturation - b.saturation);
  const lightDiff = Math.abs(a.lightness - b.lightness);

  return Math.sqrt(
    (hueDiff / 180) ** 2 * 0.5 +
    (satDiff / 100) ** 2 * 0.25 +
    (lightDiff / 100) ** 2 * 0.25
  ) * 100;
}

export function getTonalHarmonyScore(colors: ColorDNA[]): number {
  if (colors.length < 2) return 80;

  const valid = colors.filter(c => c.family);
  if (valid.length < 2) return 70;

  const neutralCount = valid.filter(c => c.type === 'neutral').length;
  const earthCount = valid.filter(c => c.type === 'earth').length;
  const accentColors = valid.filter(c => c.type === 'accent');
  const uniqueAccents = new Set(accentColors.map(c => c.family));

  let score = 70;

  const warmCount = valid.filter(c => c.tone === 'warm').length;
  const coolCount = valid.filter(c => c.tone === 'cool').length;

  const totalDirectional = warmCount + coolCount;
  if (totalDirectional > 0) {
    const dominantRatio = Math.max(warmCount, coolCount) / totalDirectional;
    if (dominantRatio >= 0.8) score += 15;
    else if (dominantRatio >= 0.6) score += 8;
    else score -= 10;
  }

  if (neutralCount >= valid.length - 1 && uniqueAccents.size <= 1) score += 12;
  if (uniqueAccents.size > 2) score -= 15;
  if (uniqueAccents.size === 1 && neutralCount >= 1) score += 8;

  if (earthCount >= 2 && neutralCount >= 1) score += 6;

  let lightRange = 0;
  if (valid.length >= 2) {
    const lights = valid.map(c => c.lightness);
    lightRange = Math.max(...lights) - Math.min(...lights);
    if (lightRange >= 30 && lightRange <= 60) score += 8;
    else if (lightRange < 15 && valid.length >= 3) score -= 5;
  }

  return Math.max(0, Math.min(100, score));
}

const HARMONY_OVERRIDES = new Map<string, number>();
function h(c1: string, c2: string, val: number) {
  HARMONY_OVERRIDES.set([c1, c2].sort().join('-'), val);
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
    const entry = COLOR_HSL_MAP[c1];
    if (!entry) return 50;
    return entry.type === 'neutral' ? 82 : 45;
  }

  const key = [c1, c2].sort().join('-');
  const override = HARMONY_OVERRIDES.get(key);
  if (override !== undefined) return override;

  const a = COLOR_HSL_MAP[c1];
  const b = COLOR_HSL_MAP[c2];
  if (!a || !b) return 50;

  if (a.type === 'neutral' && b.type === 'neutral') return 85;
  if (a.type === 'neutral' || b.type === 'neutral') return 78;

  if (a.type === 'earth' && b.type === 'earth') {
    let s = 72;
    if (a.tone === b.tone) s += 8;
    if (a.lightness !== b.lightness) s += 5;
    return Math.min(100, s);
  }

  if (a.type === 'special' || b.type === 'special') return 70;

  if ((a.type === 'earth') !== (b.type === 'earth')) {
    let s = 58;
    if (a.tone === b.tone) s += 12;
    else if (a.tone === 'neutral' || b.tone === 'neutral') s += 6;
    if (Math.abs(a.lightness - b.lightness) > 20) s += 5;
    return Math.min(100, s);
  }

  let s = 40;
  if (a.tone === b.tone) s += 15;
  else s -= 5;
  if (Math.abs(a.lightness - b.lightness) > 20) s += 8;
  return Math.max(25, Math.min(100, s));
}

export function analyzeColorComposition(families: string[]): {
  neutralRatio: number;
  accentCount: number;
  dominantTone: 'warm' | 'cool' | 'mixed';
  depth: number;
} {
  const valid = families.filter(Boolean);
  if (valid.length === 0) {
    return { neutralRatio: 1, accentCount: 0, dominantTone: 'mixed', depth: 0 };
  }

  const dnas = valid.map(f => getColorDNA(f));
  const neutralCount = dnas.filter(d => d.type === 'neutral').length;
  const accents = dnas.filter(d => d.type === 'accent');
  const uniqueAccents = new Set(accents.map(a => a.family));

  const warmCount = dnas.filter(d => d.tone === 'warm').length;
  const coolCount = dnas.filter(d => d.tone === 'cool').length;
  let dominantTone: 'warm' | 'cool' | 'mixed' = 'mixed';
  if (warmCount > coolCount * 1.5) dominantTone = 'warm';
  else if (coolCount > warmCount * 1.5) dominantTone = 'cool';

  const uniqueColors = new Set(valid);
  const depth = Math.min(100, uniqueColors.size * 20);

  return {
    neutralRatio: neutralCount / valid.length,
    accentCount: uniqueAccents.size,
    dominantTone,
    depth,
  };
}
