import { Product } from '../../data/outfits';
import { ItemDNA, TextureProfile, SlotName } from './types';
import { resolveColorFamily, getColorDNA } from './colorDna';

const MATERIAL_GROUPS: Record<string, string[]> = {
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

const MATERIAL_COMPAT: Record<string, number> = {
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

const TEXTURE_PROFILES: Record<string, TextureProfile> = {
  luxe:       { smoothness: 0.9, sheenLevel: 0.8, structure: 0.4, label: 'smooth' },
  structured: { smoothness: 0.3, sheenLevel: 0.2, structure: 0.9, label: 'structured' },
  classic:    { smoothness: 0.5, sheenLevel: 0.2, structure: 0.6, label: 'matte' },
  casual:     { smoothness: 0.6, sheenLevel: 0.1, structure: 0.3, label: 'soft' },
  knit:       { smoothness: 0.3, sheenLevel: 0.1, structure: 0.5, label: 'textured' },
  technical:  { smoothness: 0.7, sheenLevel: 0.3, structure: 0.7, label: 'smooth' },
  blend:      { smoothness: 0.5, sheenLevel: 0.2, structure: 0.5, label: 'matte' },
  eco:        { smoothness: 0.6, sheenLevel: 0.1, structure: 0.4, label: 'matte' },
  sheer:      { smoothness: 0.8, sheenLevel: 0.5, structure: 0.1, label: 'sheer' },
  fur:        { smoothness: 0.2, sheenLevel: 0.3, structure: 0.3, label: 'textured' },
  down:       { smoothness: 0.4, sheenLevel: 0.3, structure: 0.6, label: 'puffy' },
  waxed:      { smoothness: 0.8, sheenLevel: 0.5, structure: 0.8, label: 'smooth' },
};

const FORMALITY_BY_SUB_CAT: Record<string, number> = {
  blazer: 7, suit_jacket: 8, dress_shirt: 7, slacks: 7, dress_pants: 7,
  pencil_skirt: 7, trench_coat: 7, trench: 7, oxford: 7, loafer: 6,
  heel: 7, derby: 7, clutch: 6, structured_bag: 6, necktie: 8, bowtie: 8,
  tuxedo_jacket: 9, tuxedo_pants: 9,
  blouse: 5, cardigan: 4, polo: 4, chino: 4, chinos: 4,
  midi_skirt: 5, ankle_boot: 4, knit: 4, shirt: 5, turtleneck: 5,
  sweater: 4, vest: 5, coat: 6, boot: 4,
  tote: 4, shoulder_bag: 4, watch: 5,
  t_shirt: 2, tshirt: 2, hoodie: 2, sweatshirt: 2,
  denim_jacket: 3, jacket: 4, jeans: 2, denim: 2, jogger: 1, shorts: 2,
  cargo: 2, sneaker: 2, sandal: 1, canvas: 2, runner: 2,
  backpack: 2, crossbody: 3, cap: 1, beanie: 2,
  track_jacket: 1, windbreaker: 1, puffer: 2, legging: 1, leggings: 1,
  track_pants: 1, biker_shorts: 1, running_shoe: 1, training_shoe: 1,
  soccer_jersey: 1, basketball_jersey: 1,
};

const VISUAL_WEIGHT_BY_CATEGORY: Record<string, number> = {
  outer: 0.9,
  mid: 0.6,
  top: 0.5,
  bottom: 0.5,
  shoes: 0.4,
  bag: 0.3,
  accessory: 0.2,
  accessory_2: 0.15,
};

export function inferMaterialGroup(material: string, productName?: string): string {
  if (material) {
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
  }

  if (productName) {
    const name = productName.toLowerCase();
    for (const [grp, materials] of Object.entries(MATERIAL_GROUPS)) {
      if (materials.some(mat => {
        if (mat.length <= 4) {
          const regex = new RegExp(`(^|[\\s,/])${mat}($|[\\s,/])`, 'i');
          return regex.test(name);
        }
        return name.includes(mat);
      })) return grp;
    }
  }

  return 'blend';
}

export function getMaterialCompatScore(g1: string, g2: string): number {
  return MATERIAL_COMPAT[`${g1}-${g2}`] ?? MATERIAL_COMPAT[`${g2}-${g1}`] ?? 0.5;
}

function inferFormality(product: Product): number {
  if (typeof product.formality === 'number') return product.formality;

  const sub = (product.sub_category || '').toLowerCase().replace(/[\s-]/g, '_');
  if (FORMALITY_BY_SUB_CAT[sub] !== undefined) return FORMALITY_BY_SUB_CAT[sub];

  const name = (product.name || '').toLowerCase();
  for (const [cat, f] of Object.entries(FORMALITY_BY_SUB_CAT)) {
    if (name.includes(cat.replace(/_/g, ' ')) || name.includes(cat)) return f;
  }

  return 3;
}

function getProportionZone(category: string): 'upper' | 'lower' | 'feet' | 'accessory' {
  if (category === 'outer' || category === 'mid' || category === 'top') return 'upper';
  if (category === 'bottom') return 'lower';
  if (category === 'shoes') return 'feet';
  return 'accessory';
}

function extractEraMoodTags(product: Product): string[] {
  const tags: string[] = [];

  if (product.vibe && product.vibe.length > 0) {
    tags.push(...product.vibe.map(v => v.toLowerCase()));
  }

  if (product.image_features?.styleAttributes) {
    tags.push(...product.image_features.styleAttributes.map(s => s.toLowerCase()));
  }

  return [...new Set(tags)];
}

export function computeItemDNA(product: Product): ItemDNA {
  const materialGroup = inferMaterialGroup(product.material || '', product.name);
  const colorFamily = resolveColorFamily(product.color || '', product.color_family);

  return {
    formality: inferFormality(product),
    visualWeight: VISUAL_WEIGHT_BY_CATEGORY[product.category] ?? 0.3,
    textureProfile: TEXTURE_PROFILES[materialGroup] || TEXTURE_PROFILES.blend,
    colorDNA: getColorDNA(colorFamily),
    silhouette: product.silhouette || 'regular',
    proportionZone: getProportionZone(product.category),
    eraMoodTags: extractEraMoodTags(product),
    materialGroup,
  };
}

export function getSlotFromCategory(category: string): SlotName {
  return category as SlotName;
}

export { MATERIAL_GROUPS, MATERIAL_COMPAT };
