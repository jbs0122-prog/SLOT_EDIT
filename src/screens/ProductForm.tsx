import { useState, useEffect, useRef } from 'react';
import { Product } from '../data/outfits';
import { supabase } from '../utils/supabase';
import { uploadProductImage, uploadProductBlob, validateImageFile } from '../utils/imageUpload';
import { analyzeFashionImage } from '../utils/fashionAnalyzer';
import { detectItemsInPhoto, extractProductImage } from '../utils/productExtractor';
import { compressImageToTarget } from '../utils/imageCompression';
import { X, Save, Upload, Loader2, Sparkles, Link2, CheckCircle2, AlertCircle, Scissors, ScanSearch, Image as ImageIcon, ArrowLeft, Check } from 'lucide-react';
import type { DetectedItem } from '../utils/productExtractor';

type ExtractionStatus = 'idle' | 'extracting' | 'done' | 'error';

interface ExtractedItemState extends DetectedItem {
  status: ExtractionStatus;
  extractedImageUrl?: string;
  error?: string;
}

const SLOT_LABELS: Record<string, string> = {
  outer: '아우터', mid: '미드레이어', top: '상의', bottom: '하의',
  shoes: '신발', bag: '가방', accessory: '액세서리',
};

const SLOT_COLORS: Record<string, string> = {
  outer: 'bg-amber-100 text-amber-800 border-amber-300',
  mid: 'bg-teal-100 text-teal-800 border-teal-300',
  top: 'bg-blue-100 text-blue-800 border-blue-300',
  bottom: 'bg-slate-100 text-slate-800 border-slate-300',
  shoes: 'bg-orange-100 text-orange-800 border-orange-300',
  bag: 'bg-rose-100 text-rose-800 border-rose-300',
  accessory: 'bg-emerald-100 text-emerald-800 border-emerald-300',
};

interface ProductFormProps {
  product?: Product | null;
  onSave: (savedProduct: Product | null) => void;
  onCancel: () => void;
}

const CATEGORIES = [
  { value: 'outer', label: '아우터' },
  { value: 'mid', label: '미드레이어' },
  { value: 'top', label: '상의' },
  { value: 'bottom', label: '하의' },
  { value: 'shoes', label: '신발' },
  { value: 'bag', label: '가방' },
  { value: 'accessory', label: '액세서리' },
];

const GENDERS = [
  { value: 'MALE', label: '남성' },
  { value: 'FEMALE', label: '여성' },
  { value: 'UNISEX', label: '유니섹스' }
];

const BODY_TYPES = ['slim', 'regular', 'plus-size'];
const VIBES = ['ELEVATED_COOL', 'EFFORTLESS_NATURAL', 'ARTISTIC_MINIMAL', 'RETRO_LUXE', 'SPORT_MODERN', 'CREATIVE_LAYERED'];
const SEASONS = ['spring', 'summer', 'fall', 'winter'];
const STOCK_STATUS = [
  { value: 'in_stock', label: '재고 있음' },
  { value: 'out_of_stock', label: '품절' },
  { value: 'coming_soon', label: '출시 예정' }
];

const COLOR_FAMILIES = [
  { value: '', label: '선택 안함' },
  { value: 'black', label: 'Black (검정)' },
  { value: 'white', label: 'White (흰색)' },
  { value: 'grey', label: 'Grey (회색)' },
  { value: 'charcoal', label: 'Charcoal (차콜)' },
  { value: 'navy', label: 'Navy (네이비)' },
  { value: 'beige', label: 'Beige (베이지)' },
  { value: 'cream', label: 'Cream (크림)' },
  { value: 'ivory', label: 'Ivory (아이보리)' },
  { value: 'brown', label: 'Brown (갈색)' },
  { value: 'tan', label: 'Tan (탄)' },
  { value: 'camel', label: 'Camel (카멜)' },
  { value: 'olive', label: 'Olive (올리브)' },
  { value: 'khaki', label: 'Khaki (카키)' },
  { value: 'sage', label: 'Sage (세이지)' },
  { value: 'rust', label: 'Rust (러스트)' },
  { value: 'mustard', label: 'Mustard (머스타드)' },
  { value: 'burgundy', label: 'Burgundy (버건디)' },
  { value: 'wine', label: 'Wine (와인)' },
  { value: 'blue', label: 'Blue (파랑)' },
  { value: 'sky_blue', label: 'Sky Blue (하늘색)' },
  { value: 'denim', label: 'Denim (데님)' },
  { value: 'teal', label: 'Teal (틸)' },
  { value: 'green', label: 'Green (초록)' },
  { value: 'mint', label: 'Mint (민트)' },
  { value: 'red', label: 'Red (빨강)' },
  { value: 'coral', label: 'Coral (코랄)' },
  { value: 'yellow', label: 'Yellow (노랑)' },
  { value: 'orange', label: 'Orange (주황)' },
  { value: 'pink', label: 'Pink (핑크)' },
  { value: 'lavender', label: 'Lavender (라벤더)' },
  { value: 'purple', label: 'Purple (보라)' },
  { value: 'metallic', label: 'Metallic (메탈릭)' },
  { value: 'multi', label: 'Multi (멀티컬러)' }
];

const COLOR_TONES = [
  { value: '', label: '선택 안함' },
  { value: 'warm', label: 'Warm (따뜻한 톤)' },
  { value: 'cool', label: 'Cool (차가운 톤)' },
  { value: 'neutral', label: 'Neutral (중성 톤)' }
];

const PATTERNS = [
  { value: '', label: '선택 안함' },
  { value: 'solid', label: 'Solid (무지)' },
  { value: 'stripe', label: 'Stripe (스트라이프)' },
  { value: 'check', label: 'Check (체크)' },
  { value: 'floral', label: 'Floral (플로럴)' },
  { value: 'graphic', label: 'Graphic (그래픽)' },
  { value: 'print', label: 'Print (프린트)' },
  { value: 'other', label: 'Other (기타)' }
];

const SUB_CATEGORIES: Record<string, { value: string; label: string }[]> = {
  outer: [
    { value: '', label: '선택 안함' },
    { value: 'puffer', label: 'Puffer (패딩)' },
    { value: 'coat', label: 'Coat (코트)' },
    { value: 'blazer', label: 'Blazer (블레이저)' },
    { value: 'jacket', label: 'Jacket (재킷)' },
    { value: 'trench', label: 'Trench (트렌치)' },
    { value: 'bomber', label: 'Bomber (봄버)' },
    { value: 'parka', label: 'Parka (파카)' },
    { value: 'peacoat', label: 'Peacoat (피코트)' },
    { value: 'anorak', label: 'Anorak (아노락)' },
    { value: 'windbreaker', label: 'Windbreaker (윈드브레이커)' },
    { value: 'duffle_coat', label: 'Duffle Coat (더플코트)' },
    { value: 'biker_jacket', label: 'Biker Jacket (바이커재킷)' },
    { value: 'denim_jacket', label: 'Denim Jacket (데님재킷)' },
    { value: 'coach_jacket', label: 'Coach Jacket (코치재킷)' },
    { value: 'varsity_jacket', label: 'Varsity Jacket (바시티재킷)' },
    { value: 'shearling', label: 'Shearling (시어링)' },
    { value: 'field_jacket', label: 'Field Jacket (필드재킷)' },
    { value: 'harrington', label: 'Harrington (해링턴)' },
    { value: 'quilted_jacket', label: 'Quilted Jacket (퀼팅재킷)' },
    { value: 'corduroy_jacket', label: 'Corduroy Jacket (코듀로이재킷)' },
    { value: 'cape', label: 'Cape (케이프)' },
    { value: 'poncho', label: 'Poncho (판초)' },
    { value: 'kimono', label: 'Kimono (키모노)' },
    { value: 'noragi', label: 'Noragi (노라기)' },
    { value: 'chore_coat', label: 'Chore Coat (쵸어코트)' },
    { value: 'safari_jacket', label: 'Safari Jacket (사파리재킷)' },
    { value: 'utility_jacket', label: 'Utility Jacket (유틸리티재킷)' },
    { value: 'shell', label: 'Shell (쉘재킷)' },
    { value: 'gilet', label: 'Gilet (질레)' },
    { value: 'faux_fur', label: 'Faux Fur (페이크퍼)' },
    { value: 'rain_jacket', label: 'Rain Jacket (레인재킷)' },
    { value: 'track_jacket', label: 'Track Jacket (트랙재킷)' },
    { value: 'shacket', label: 'Shacket (셔켓)' },
    { value: 'leather_trench', label: 'Leather Trench (레더트렌치)' },
    { value: 'tweed_jacket', label: 'Tweed Jacket (트위드재킷)' },
  ],
  mid: [
    { value: '', label: '선택 안함' },
    { value: 'knit', label: 'Knit (니트)' },
    { value: 'cardigan', label: 'Cardigan (가디건)' },
    { value: 'sweater', label: 'Sweater (스웨터)' },
    { value: 'vest', label: 'Vest (조끼)' },
    { value: 'fleece', label: 'Fleece (플리스)' },
    { value: 'hoodie', label: 'Hoodie (후드)' },
    { value: 'sweatshirt', label: 'Sweatshirt (맨투맨)' },
    { value: 'half_zip', label: 'Half-Zip (하프집)' },
    { value: 'turtleneck_knit', label: 'Turtleneck Knit (터틀넥니트)' },
    { value: 'cable_knit', label: 'Cable Knit (케이블니트)' },
    { value: 'argyle_sweater', label: 'Argyle Sweater (아가일)' },
    { value: 'fair_isle', label: 'Fair Isle (페어아일)' },
    { value: 'cricket_jumper', label: 'Cricket Jumper (크리켓점퍼)' },
    { value: 'mock_neck', label: 'Mock Neck (목넥)' },
    { value: 'zip_knit', label: 'Zip Knit (집업니트)' },
    { value: 'quilted_vest', label: 'Quilted Vest (퀼팅조끼)' },
    { value: 'down_vest', label: 'Down Vest (다운조끼)' },
    { value: 'fleece_vest', label: 'Fleece Vest (플리스조끼)' },
    { value: 'knitted_vest', label: 'Knitted Vest (니트조끼)' },
    { value: 'cashmere_sweater', label: 'Cashmere Sweater (캐시미어)' },
    { value: 'boucle_knit', label: 'Boucle Knit (부클니트)' },
    { value: 'mohair_knit', label: 'Mohair Knit (모헤어니트)' },
    { value: 'crochet_cardigan', label: 'Crochet Cardigan (크로셰가디건)' },
  ],
  top: [
    { value: '', label: '선택 안함' },
    { value: 'tshirt', label: 'T-shirt (티셔츠)' },
    { value: 'shirt', label: 'Shirt (셔츠)' },
    { value: 'polo', label: 'Polo (폴로)' },
    { value: 'turtleneck', label: 'Turtleneck (터틀넥)' },
    { value: 'tank', label: 'Tank Top (탱크탑)' },
    { value: 'blouse', label: 'Blouse (블라우스)' },
    { value: 'oxford_shirt', label: 'Oxford Shirt (옥스포드셔츠)' },
    { value: 'linen_shirt', label: 'Linen Shirt (린넨셔츠)' },
    { value: 'silk_blouse', label: 'Silk Blouse (실크블라우스)' },
    { value: 'graphic_tee', label: 'Graphic Tee (그래픽티)' },
    { value: 'rugby_shirt', label: 'Rugby Shirt (럭비셔츠)' },
    { value: 'henley', label: 'Henley (헨리넥)' },
    { value: 'crop_top', label: 'Crop Top (크롭탑)' },
    { value: 'camisole', label: 'Camisole (캐미솔)' },
    { value: 'bodysuit', label: 'Bodysuit (바디수트)' },
    { value: 'tunic', label: 'Tunic (튜닉)' },
    { value: 'corset', label: 'Corset (코르셋)' },
    { value: 'breton_stripe', label: 'Breton Stripe (브레턴스트라이프)' },
    { value: 'band_tee', label: 'Band Tee (밴드티)' },
    { value: 'jersey', label: 'Jersey (져지)' },
    { value: 'wrap_top', label: 'Wrap Top (랩탑)' },
    { value: 'peasant_blouse', label: 'Peasant Blouse (페전트블라우스)' },
    { value: 'puff_sleeve', label: 'Puff Sleeve (퍼프슬리브)' },
    { value: 'flannel_shirt', label: 'Flannel Shirt (플란넬셔츠)' },
    { value: 'denim_shirt', label: 'Denim Shirt (데님셔츠)' },
    { value: 'chambray', label: 'Chambray (샴브레이)' },
    { value: 'western_shirt', label: 'Western Shirt (웨스턴셔츠)' },
    { value: 'sports_bra', label: 'Sports Bra (스포츠브라)' },
    { value: 'performance_tee', label: 'Performance Tee (기능성티)' },
    { value: 'compression_top', label: 'Compression Top (컴프레션탑)' },
    { value: 'mesh_top', label: 'Mesh Top (메쉬탑)' },
    { value: 'lace_top', label: 'Lace Top (레이스탑)' },
    { value: 'embroidered_blouse', label: 'Embroidered Blouse (자수블라우스)' },
    { value: 'halter_top', label: 'Halter Top (홀터탑)' },
  ],
  bottom: [
    { value: '', label: '선택 안함' },
    { value: 'denim', label: 'Denim (데님)' },
    { value: 'slacks', label: 'Slacks (슬랙스)' },
    { value: 'chinos', label: 'Chinos (치노)' },
    { value: 'jogger', label: 'Jogger (조거)' },
    { value: 'cargo', label: 'Cargo (카고)' },
    { value: 'shorts', label: 'Shorts (반바지)' },
    { value: 'wide_leg', label: 'Wide Leg (와이드팬츠)' },
    { value: 'culottes', label: 'Culottes (큐롯)' },
    { value: 'pleated_trousers', label: 'Pleated Trousers (플리츠팬츠)' },
    { value: 'leather_pants', label: 'Leather Pants (레더팬츠)' },
    { value: 'corduroy_pants', label: 'Corduroy Pants (코듀로이팬츠)' },
    { value: 'parachute_pants', label: 'Parachute Pants (파라슈트팬츠)' },
    { value: 'track_pants', label: 'Track Pants (트랙팬츠)' },
    { value: 'linen_trousers', label: 'Linen Trousers (린넨팬츠)' },
    { value: 'maxi_skirt', label: 'Maxi Skirt (맥시스커트)' },
    { value: 'midi_skirt', label: 'Midi Skirt (미디스커트)' },
    { value: 'mini_skirt', label: 'Mini Skirt (미니스커트)' },
    { value: 'pencil_skirt', label: 'Pencil Skirt (펜슬스커트)' },
    { value: 'pleated_skirt', label: 'Pleated Skirt (플리츠스커트)' },
    { value: 'wrap_skirt', label: 'Wrap Skirt (랩스커트)' },
    { value: 'flared_jeans', label: 'Flared Jeans (플레어진)' },
    { value: 'baggy_jeans', label: 'Baggy Jeans (배기진)' },
    { value: 'carpenter_pants', label: 'Carpenter Pants (카펜터팬츠)' },
    { value: 'overalls', label: 'Overalls (오버올)' },
    { value: 'bermuda_shorts', label: 'Bermuda Shorts (버뮤다)' },
    { value: 'biker_shorts', label: 'Biker Shorts (바이커쇼츠)' },
    { value: 'leggings', label: 'Leggings (레깅스)' },
    { value: 'yoga_pants', label: 'Yoga Pants (요가팬츠)' },
    { value: 'sweatpants', label: 'Sweatpants (스웻팬츠)' },
    { value: 'sailor_pants', label: 'Sailor Pants (세일러팬츠)' },
    { value: 'harem_pants', label: 'Harem Pants (하렘팬츠)' },
    { value: 'velvet_skirt', label: 'Velvet Skirt (벨벳스커트)' },
    { value: 'silk_skirt', label: 'Silk Skirt (실크스커트)' },
    { value: 'tiered_skirt', label: 'Tiered Skirt (티어드스커트)' },
    { value: 'tennis_skirt', label: 'Tennis Skirt (테니스스커트)' },
  ],
  shoes: [
    { value: '', label: '선택 안함' },
    { value: 'sneaker', label: 'Sneaker (스니커즈)' },
    { value: 'derby', label: 'Derby (더비)' },
    { value: 'loafer', label: 'Loafer (로퍼)' },
    { value: 'boot', label: 'Boot (부츠)' },
    { value: 'runner', label: 'Runner (러닝화)' },
    { value: 'chelsea_boot', label: 'Chelsea Boot (첼시부츠)' },
    { value: 'combat_boot', label: 'Combat Boot (컴뱃부츠)' },
    { value: 'ankle_boot', label: 'Ankle Boot (앵클부츠)' },
    { value: 'knee_boot', label: 'Knee Boot (니부츠)' },
    { value: 'hiking_boot', label: 'Hiking Boot (하이킹부츠)' },
    { value: 'desert_boot', label: 'Desert Boot (데저트부츠)' },
    { value: 'work_boot', label: 'Work Boot (워크부츠)' },
    { value: 'mule', label: 'Mule (뮬)' },
    { value: 'slide', label: 'Slide (슬라이드)' },
    { value: 'sandal', label: 'Sandal (샌들)' },
    { value: 'espadrille', label: 'Espadrille (에스파드리유)' },
    { value: 'clog', label: 'Clog (클로그)' },
    { value: 'mary_jane', label: 'Mary Jane (메리제인)' },
    { value: 'ballet_flat', label: 'Ballet Flat (발레플랫)' },
    { value: 'oxford', label: 'Oxford (옥스포드)' },
    { value: 'brogue', label: 'Brogue (브로그)' },
    { value: 'monk_strap', label: 'Monk Strap (몽크스트랩)' },
    { value: 'platform', label: 'Platform (플랫폼)' },
    { value: 'kitten_heel', label: 'Kitten Heel (키튼힐)' },
    { value: 'block_heel', label: 'Block Heel (블록힐)' },
    { value: 'slingback', label: 'Slingback (슬링백)' },
    { value: 'boat_shoe', label: 'Boat Shoe (보트슈즈)' },
    { value: 'moccasin', label: 'Moccasin (모카신)' },
    { value: 'western_boot', label: 'Western Boot (웨스턴부츠)' },
    { value: 'tabi', label: 'Tabi (타비)' },
    { value: 'driving_shoe', label: 'Driving Shoe (드라이빙슈즈)' },
    { value: 'trail_runner', label: 'Trail Runner (트레일러너)' },
    { value: 'training_shoe', label: 'Training Shoe (트레이닝슈즈)' },
    { value: 'high_top', label: 'High Top (하이탑)' },
    { value: 'creeper', label: 'Creeper (크리퍼)' },
  ],
  bag: [
    { value: '', label: '선택 안함' },
    { value: 'tote', label: 'Tote (토트백)' },
    { value: 'backpack', label: 'Backpack (백팩)' },
    { value: 'crossbody', label: 'Crossbody (크로스백)' },
    { value: 'duffle', label: 'Duffle (더플백)' },
    { value: 'clutch', label: 'Clutch (클러치)' },
    { value: 'shoulder_bag', label: 'Shoulder Bag (숄더백)' },
    { value: 'satchel', label: 'Satchel (사첼)' },
    { value: 'messenger', label: 'Messenger (메신저백)' },
    { value: 'bucket_bag', label: 'Bucket Bag (버킷백)' },
    { value: 'hobo', label: 'Hobo (호보백)' },
    { value: 'belt_bag', label: 'Belt Bag (벨트백)' },
    { value: 'sling', label: 'Sling (슬링백)' },
    { value: 'baguette', label: 'Baguette (바게트백)' },
    { value: 'box_bag', label: 'Box Bag (박스백)' },
    { value: 'frame_bag', label: 'Frame Bag (프레임백)' },
    { value: 'saddle_bag', label: 'Saddle Bag (새들백)' },
    { value: 'doctor_bag', label: 'Doctor Bag (닥터백)' },
    { value: 'wristlet', label: 'Wristlet (리스트릿)' },
    { value: 'briefcase', label: 'Briefcase (브리프케이스)' },
    { value: 'gym_bag', label: 'Gym Bag (짐백)' },
    { value: 'camera_bag', label: 'Camera Bag (카메라백)' },
    { value: 'weekender', label: 'Weekender (위켄더)' },
    { value: 'straw_bag', label: 'Straw Bag (스트로백)' },
    { value: 'woven_bag', label: 'Woven Bag (우븐백)' },
    { value: 'canvas_tote', label: 'Canvas Tote (캔버스토트)' },
    { value: 'chain_bag', label: 'Chain Bag (체인백)' },
    { value: 'phone_pouch', label: 'Phone Pouch (폰파우치)' },
    { value: 'sacoche', label: 'Sacoche (사코슈)' },
    { value: 'vanity_case', label: 'Vanity Case (베니티케이스)' },
  ],
  accessory: [
    { value: '', label: '선택 안함' },
    { value: 'necktie', label: 'Necktie (넥타이)' },
    { value: 'belt', label: 'Belt (벨트)' },
    { value: 'cap', label: 'Cap (모자)' },
    { value: 'scarf', label: 'Scarf (스카프)' },
    { value: 'glove', label: 'Glove (장갑)' },
    { value: 'watch', label: 'Watch (시계)' },
    { value: 'sunglasses', label: 'Sunglasses (선글라스)' },
    { value: 'beanie', label: 'Beanie (비니)' },
    { value: 'bucket_hat', label: 'Bucket Hat (버킷햇)' },
    { value: 'beret', label: 'Beret (베레모)' },
    { value: 'headband', label: 'Headband (헤드밴드)' },
    { value: 'choker', label: 'Choker (초커)' },
    { value: 'chain_necklace', label: 'Chain Necklace (체인목걸이)' },
    { value: 'pendant', label: 'Pendant (펜던트)' },
    { value: 'pearl_necklace', label: 'Pearl Necklace (진주목걸이)' },
    { value: 'hoop_earring', label: 'Hoop Earring (후프귀걸이)' },
    { value: 'stud_earring', label: 'Stud Earring (스터드귀걸이)' },
    { value: 'ring', label: 'Ring (반지)' },
    { value: 'bracelet', label: 'Bracelet (팔찌)' },
    { value: 'bangle', label: 'Bangle (뱅글)' },
    { value: 'brooch', label: 'Brooch (브로치)' },
    { value: 'hair_clip', label: 'Hair Clip (헤어클립)' },
    { value: 'bow_tie', label: 'Bow Tie (보타이)' },
    { value: 'suspenders', label: 'Suspenders (서스펜더)' },
    { value: 'silk_scarf', label: 'Silk Scarf (실크스카프)' },
    { value: 'bandana', label: 'Bandana (반다나)' },
    { value: 'anklet', label: 'Anklet (발찌)' },
    { value: 'ear_cuff', label: 'Ear Cuff (이어커프)' },
    { value: 'hair_stick', label: 'Hair Stick (비녀)' },
    { value: 'tights', label: 'Tights (타이츠)' },
    { value: 'wide_brim_hat', label: 'Wide Brim Hat (챙넓은모자)' },
    { value: 'visor', label: 'Visor (바이저)' },
    { value: 'wallet_chain', label: 'Wallet Chain (지갑체인)' },
  ]
};

type ScrapeStatus = 'idle' | 'loading' | 'success' | 'error';

export default function ProductForm({ product, onSave, onCancel }: ProductFormProps) {
  const [formData, setFormData] = useState({
    brand: '',
    name: '',
    category: 'top' as Product['category'],
    gender: 'UNISEX',
    body_type: [] as string[],
    vibe: [] as string[],
    color: '',
    season: [] as string[],
    silhouette: '',
    image_url: '',
    product_link: '',
    affiliate_link: '',
    price: null as number | null,
    stock_status: 'in_stock' as Product['stock_status'],
    material: '',
    color_family: '',
    color_tone: '',
    sub_category: '',
    pattern: '',
    formality: 3,
    warmth: 3
  });

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [nobgUrl, setNobgUrl] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [showExtractModal, setShowExtractModal] = useState(false);
  const [extractSource, setExtractSource] = useState('');
  const [extractUrlInput, setExtractUrlInput] = useState('');
  const [extractUploading, setExtractUploading] = useState(false);
  const [extractDetecting, setExtractDetecting] = useState(false);
  const [extractItems, setExtractItems] = useState<ExtractedItemState[]>([]);
  const [extractPhase, setExtractPhase] = useState<'upload' | 'detected' | 'extracting'>('upload');
  const extractFileRef = useRef<HTMLInputElement>(null);

  const [urlInput, setUrlInput] = useState('');
  const [scrapeStatus, setScrapeStatus] = useState<ScrapeStatus>('idle');
  const [scrapeError, setScrapeError] = useState('');
  const [scrapedFields, setScrapedFields] = useState<string[]>([]);

  useEffect(() => {
    if (product) {
      setFormData({
        brand: product.brand,
        name: product.name,
        category: product.category,
        gender: product.gender,
        body_type: product.body_type || [],
        vibe: product.vibe || [],
        color: product.color,
        season: product.season || [],
        silhouette: product.silhouette,
        image_url: product.image_url,
        product_link: product.product_link,
        affiliate_link: (product as any).affiliate_link || '',
        price: product.price,
        stock_status: product.stock_status,
        material: (product as any).material || '',
        color_family: (product as any).color_family || '',
        color_tone: (product as any).color_tone || '',
        sub_category: (product as any).sub_category || '',
        pattern: (product as any).pattern || '',
        formality: (product as any).formality ?? 3,
        warmth: (product as any).warmth ?? 3
      });
      if ((product as any).nobg_image_url) {
        setNobgUrl((product as any).nobg_image_url);
      }
    }
  }, [product]);

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const toggleArrayValue = (field: 'body_type' | 'vibe' | 'season', value: string) => {
    setFormData(prev => {
      const array = prev[field];
      const newArray = array.includes(value)
        ? array.filter(v => v !== value)
        : [...array, value];
      return { ...prev, [field]: newArray };
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validationError = validateImageFile(file);
    if (validationError) {
      setErrors(prev => ({ ...prev, image_url: validationError }));
      return;
    }

    setUploading(true);
    setErrors(prev => ({ ...prev, image_url: '' }));

    const result = await uploadProductImage(file);

    if (result.success && result.url) {
      handleChange('image_url', result.url);
    } else {
      setErrors(prev => ({ ...prev, image_url: result.error || '업로드 실패' }));
    }

    setUploading(false);
    e.target.value = '';
  };

  const applyAnalysisToForm = (analysis: Record<string, any>, overrideName = true) => {
    const categoryMap: Record<string, string> = {
      '상의': 'top',
      '하의': 'bottom',
      '아우터': 'outer',
      '미드레이어': 'mid',
      '신발': 'shoes',
      '가방': 'bag',
      '액세서리': 'accessory',
      '넥타이': 'accessory',
    };

    const genderMap: Record<string, string> = {
      '남성': 'MALE',
      '여성': 'FEMALE',
      '공용': 'UNISEX'
    };

    const validColorFamilies = ['black', 'white', 'grey', 'charcoal', 'navy', 'beige', 'cream', 'ivory', 'brown', 'tan', 'camel', 'olive', 'khaki', 'sage', 'rust', 'mustard', 'burgundy', 'wine', 'blue', 'sky_blue', 'denim', 'teal', 'green', 'mint', 'red', 'coral', 'yellow', 'orange', 'pink', 'lavender', 'purple', 'metallic', 'multi'];
    const validColorTones = ['warm', 'cool', 'neutral'];
    const validPatterns = ['solid', 'stripe', 'check', 'floral', 'graphic', 'print', 'other'];
    const validSilhouettes = ['oversized', 'relaxed', 'wide', 'regular', 'straight', 'fitted', 'slim', 'tapered'];
    const validSeasons = ['spring', 'summer', 'fall', 'winter'];
    const validVibes = ['ELEVATED_COOL', 'EFFORTLESS_NATURAL', 'ARTISTIC_MINIMAL', 'RETRO_LUXE', 'SPORT_MODERN', 'CREATIVE_LAYERED'];

    const isNecktie = analysis.category === '넥타이';

    setFormData(prev => ({
      ...prev,
      name: overrideName ? (analysis.description || prev.name) : prev.name,
      category: (categoryMap[analysis.category] as Product['category']) || prev.category,
      gender: genderMap[analysis.gender] || prev.gender,
      color: analysis.color || prev.color,
      material: analysis.material || prev.material,
      silhouette: validSilhouettes.includes(analysis.silhouette) ? analysis.silhouette : prev.silhouette,
      vibe: analysis.vibe?.filter((v: string) => validVibes.includes(v)).length > 0
        ? analysis.vibe.filter((v: string) => validVibes.includes(v))
        : prev.vibe,
      season: analysis.season?.filter((s: string) => validSeasons.includes(s)).length > 0
        ? analysis.season.filter((s: string) => validSeasons.includes(s))
        : prev.season,
      color_family: validColorFamilies.includes(analysis.color_family) ? analysis.color_family : prev.color_family,
      color_tone: validColorTones.includes(analysis.color_tone) ? analysis.color_tone : prev.color_tone,
      sub_category: isNecktie ? 'necktie' : (analysis.sub_category || prev.sub_category),
      pattern: validPatterns.includes(analysis.pattern) ? analysis.pattern : prev.pattern,
      formality: analysis.formality ? Math.max(1, Math.min(5, Math.round(analysis.formality))) : prev.formality,
      warmth: analysis.warmth ? Math.max(1, Math.min(5, Math.round(analysis.warmth))) : prev.warmth
    }));
  };

  const handleUrlScrape = async () => {
    const trimmedUrl = urlInput.trim();
    if (!trimmedUrl) return;

    setScrapeStatus('loading');
    setScrapeError('');
    setScrapedFields([]);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('로그인이 필요합니다');

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/scrape-product-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ productUrl: trimmedUrl }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || '스크래핑 실패');
      }

      const { scraped, analysis } = data;
      const filled: string[] = [];

      setFormData(prev => {
        const next = { ...prev };

        if (scraped.title && !prev.name) {
          next.name = scraped.title;
          filled.push('제품명');
        }
        if (scraped.brand && !prev.brand) {
          next.brand = scraped.brand;
          filled.push('브랜드');
        }
        if (scraped.price && !prev.price) {
          next.price = scraped.price;
          filled.push('가격');
        }
        if (scraped.imageUrl && !prev.image_url) {
          next.image_url = scraped.imageUrl;
          filled.push('이미지');
        }
        if (!prev.product_link) {
          next.product_link = trimmedUrl;
          filled.push('쇼핑 링크');
        }

        return next;
      });

      if (analysis) {
        const categoryMap: Record<string, string> = {
          '상의': 'top', '하의': 'bottom', '아우터': 'outer', '미드레이어': 'mid',
          '신발': 'shoes', '가방': 'bag', '액세서리': 'accessory', '넥타이': 'accessory',
        };
        const genderMap: Record<string, string> = { '남성': 'MALE', '여성': 'FEMALE', '공용': 'UNISEX' };
        const validColorFamilies = ['black', 'white', 'grey', 'charcoal', 'navy', 'beige', 'cream', 'ivory', 'brown', 'tan', 'camel', 'olive', 'khaki', 'sage', 'rust', 'mustard', 'burgundy', 'wine', 'blue', 'sky_blue', 'denim', 'teal', 'green', 'mint', 'red', 'coral', 'yellow', 'orange', 'pink', 'lavender', 'purple', 'metallic', 'multi'];
        const validColorTones = ['warm', 'cool', 'neutral'];
        const validPatterns = ['solid', 'stripe', 'check', 'floral', 'graphic', 'print', 'other'];
        const validSilhouettes = ['oversized', 'relaxed', 'wide', 'regular', 'straight', 'fitted', 'slim', 'tapered'];
        const validSeasons = ['spring', 'summer', 'fall', 'winter'];
        const validVibes = ['ELEVATED_COOL', 'EFFORTLESS_NATURAL', 'ARTISTIC_MINIMAL', 'RETRO_LUXE', 'SPORT_MODERN', 'CREATIVE_LAYERED'];
        const isNecktie = analysis.category === '넥타이';

        setFormData(prev => {
          const next = { ...prev };

          if (analysis.description) {
            if (!prev.name || prev.name === scraped.title) {
              next.name = analysis.description;
              if (!filled.includes('제품명')) filled.push('제품명');
            }
          }
          if (categoryMap[analysis.category]) { next.category = categoryMap[analysis.category] as Product['category']; filled.push('카테고리'); }
          if (genderMap[analysis.gender]) { next.gender = genderMap[analysis.gender]; filled.push('성별'); }
          if (analysis.color) { next.color = analysis.color; filled.push('색상'); }
          if (analysis.material) { next.material = analysis.material; filled.push('소재'); }
          if (validSilhouettes.includes(analysis.silhouette)) { next.silhouette = analysis.silhouette; filled.push('실루엣'); }
          if (analysis.vibe?.filter((v: string) => validVibes.includes(v)).length > 0) { next.vibe = analysis.vibe.filter((v: string) => validVibes.includes(v)); filled.push('스타일 무드'); }
          if (analysis.season?.filter((s: string) => validSeasons.includes(s)).length > 0) { next.season = analysis.season.filter((s: string) => validSeasons.includes(s)); filled.push('시즌'); }
          if (validColorFamilies.includes(analysis.color_family)) { next.color_family = analysis.color_family; filled.push('컬러 패밀리'); }
          if (validColorTones.includes(analysis.color_tone)) { next.color_tone = analysis.color_tone; filled.push('컬러 톤'); }
          if (isNecktie) { next.sub_category = 'necktie'; filled.push('상세 카테고리'); }
          else if (analysis.sub_category) { next.sub_category = analysis.sub_category; filled.push('상세 카테고리'); }
          if (validPatterns.includes(analysis.pattern)) { next.pattern = analysis.pattern; filled.push('패턴'); }
          if (analysis.formality) { next.formality = Math.max(1, Math.min(5, Math.round(analysis.formality))); filled.push('격식도'); }
          if (analysis.warmth) { next.warmth = Math.max(1, Math.min(5, Math.round(analysis.warmth))); filled.push('보온감'); }

          return next;
        });
      }

      setScrapedFields([...new Set(filled)]);
      setScrapeStatus('success');
    } catch (error) {
      setScrapeError((error as Error).message || '알 수 없는 오류');
      setScrapeStatus('error');
    }
  };

  const handleAIAnalysis = async () => {
    if (!formData.image_url.trim()) {
      alert('먼저 이미지를 업로드하거나 URL을 입력해주세요');
      return;
    }

    setAnalyzing(true);
    try {
      const analysis = await analyzeFashionImage(formData.image_url);
      applyAnalysisToForm(analysis as any, false);
      alert('AI 분석이 완료되었습니다! 필요한 부분은 수정해주세요.');
    } catch (error) {
      console.error('AI analysis error:', error);
      alert('AI 분석에 실패했습니다: ' + (error as Error).message);
    } finally {
      setAnalyzing(false);
    }
  };

  const openExtractModal = () => {
    setExtractSource('');
    setExtractUrlInput('');
    setExtractItems([]);
    setExtractPhase('upload');
    setShowExtractModal(true);
  };

  const handleExtractFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validationError = validateImageFile(file);
    if (validationError) { alert(validationError); return; }
    setExtractUploading(true);
    const result = await uploadProductImage(file);
    if (result.success && result.url) {
      setExtractSource(result.url);
    } else {
      alert(result.error || '업로드 실패');
    }
    setExtractUploading(false);
    e.target.value = '';
  };

  const handleExtractDetect = async () => {
    if (!extractSource) return;
    setExtractDetecting(true);
    try {
      const detected = await detectItemsInPhoto(extractSource);
      setExtractItems(detected.map(item => ({ ...item, status: 'idle' as ExtractionStatus })));
      setExtractPhase('detected');
    } catch (error) {
      alert('아이템 감지 실패: ' + (error as Error).message);
    } finally {
      setExtractDetecting(false);
    }
  };

  const handleExtractSingle = async (index: number) => {
    const item = extractItems[index];
    setExtractItems(prev => prev.map((it, i) => i === index ? { ...it, status: 'extracting' } : it));
    try {
      const result = await extractProductImage(extractSource, item.slot, item.label);
      setExtractItems(prev => prev.map((it, i) =>
        i === index ? { ...it, status: 'done', extractedImageUrl: result.imageUrl } : it
      ));
    } catch (error) {
      setExtractItems(prev => prev.map((it, i) =>
        i === index ? { ...it, status: 'error', error: (error as Error).message } : it
      ));
    }
  };

  const handleExtractAll = async () => {
    setExtractPhase('extracting');
    for (let i = 0; i < extractItems.length; i++) {
      if (extractItems[i].status === 'done') continue;
      await handleExtractSingle(i);
    }
  };

  const handleApplyExtracted = async (index: number) => {
    const item = extractItems[index];
    if (!item.extractedImageUrl) return;

    try {
      const compressed = await compressImageToTarget(item.extractedImageUrl, 500, 2000, 2000, 200);
      const mimeToExt: Record<string, string> = { 'image/webp': 'webp', 'image/png': 'png', 'image/jpeg': 'jpeg' };
      const ext = mimeToExt[compressed.blob.type] || 'webp';
      const uploadResult = await uploadProductBlob(compressed.blob, ext);
      if (!uploadResult.success || !uploadResult.url) throw new Error(uploadResult.error || '업로드 실패');

      handleChange('image_url', uploadResult.url);

      try {
        const analysis = await analyzeFashionImage(uploadResult.url);
        applyAnalysisToForm(analysis as any, false);
      } catch {}

      setNobgUrl(item.extractedImageUrl);
      setShowExtractModal(false);
    } catch (error) {
      alert('적용 실패: ' + (error as Error).message);
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = '제품명을 입력하세요';
    if (!formData.image_url.trim()) newErrors.image_url = '이미지 URL을 입력하세요';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      const dataToSave = {
        ...formData,
        updated_at: new Date().toISOString(),
        ...(nobgUrl ? { nobg_image_url: nobgUrl } : {}),
      };

      if (product) {
        const { data: updated, error } = await supabase.from('products').update(dataToSave).eq('id', product.id).select().maybeSingle();
        if (error) throw error;
        onSave(updated ? { ...product, ...updated } as Product : null);
      } else {
        const { data: inserted, error } = await supabase.from('products').insert([dataToSave]).select().maybeSingle();
        if (error) throw error;
        onSave(inserted ? inserted as Product : null);
      }
    } catch (error) {
      console.error('Save error:', error);
      alert('저장 실패: ' + (error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">
            {product ? '제품 수정' : '제품 추가'}
          </h2>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">

          {/* URL 자동 입력 섹션 */}
          <div className="mb-8 p-5 bg-gradient-to-br from-blue-50 to-slate-50 border border-blue-200 rounded-xl">
            <div className="flex items-center gap-2 mb-1">
              <Link2 size={18} className="text-blue-600" />
              <h3 className="text-base font-semibold text-gray-900">URL로 자동 채우기</h3>
              <span className="ml-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">AI</span>
            </div>
            <p className="text-xs text-gray-500 mb-3">
              제품 페이지 URL을 입력하면 이미지·텍스트·태그를 자동으로 분석합니다
            </p>
            <div className="flex gap-2">
              <input
                type="url"
                value={urlInput}
                onChange={e => setUrlInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleUrlScrape())}
                placeholder="https://www.amazon.com/dp/..."
                className="flex-1 px-3 py-2 text-sm border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent bg-white"
                disabled={scrapeStatus === 'loading'}
              />
              <button
                type="button"
                onClick={handleUrlScrape}
                disabled={scrapeStatus === 'loading' || !urlInput.trim()}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap transition-colors"
              >
                {scrapeStatus === 'loading' ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    분석 중...
                  </>
                ) : (
                  <>
                    <Sparkles size={15} />
                    자동 분석
                  </>
                )}
              </button>
            </div>

            {scrapeStatus === 'success' && scrapedFields.length > 0 && (
              <div className="mt-3 flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle2 size={16} className="text-green-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-medium text-green-800 mb-1">자동으로 채워진 항목:</p>
                  <div className="flex flex-wrap gap-1">
                    {scrapedFields.map(f => (
                      <span key={f} className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                        {f}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-green-600 mt-1.5">내용을 확인하고 필요한 부분을 수정해주세요.</p>
                </div>
              </div>
            )}

            {scrapeStatus === 'error' && (
              <div className="mt-3 flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle size={16} className="text-red-500 shrink-0" />
                <div>
                  <p className="text-xs font-medium text-red-700">스크래핑 실패</p>
                  <p className="text-xs text-red-500">{scrapeError}</p>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">브랜드</label>
              <input
                type="text"
                value={formData.brand}
                onChange={(e) => handleChange('brand', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="예: Zara, Nike"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                제품명 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.name ? 'border-red-500' : 'border-gray-300'}`}
                placeholder="예: 오버사이즈 후드티"
              />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">카테고리</label>
              <select
                value={formData.category}
                onChange={(e) => handleChange('category', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">성별</label>
              <select
                value={formData.gender}
                onChange={(e) => handleChange('gender', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {GENDERS.map(g => (
                  <option key={g.value} value={g.value}>{g.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">색상</label>
              <input
                type="text"
                value={formData.color}
                onChange={(e) => handleChange('color', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="예: black, white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">실루엣</label>
              <select
                value={formData.silhouette}
                onChange={(e) => handleChange('silhouette', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              >
                <option value="">선택하세요</option>
                <option value="oversized">Oversized (오버사이즈)</option>
                <option value="relaxed">Relaxed (릴랙스드)</option>
                <option value="wide">Wide (와이드)</option>
                <option value="regular">Regular (레귤러)</option>
                <option value="straight">Straight (스트레이트)</option>
                <option value="fitted">Fitted (피티드)</option>
                <option value="slim">Slim (슬림)</option>
                <option value="tapered">Tapered (테이퍼드)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">가격 ($)</label>
              <input
                type="number"
                value={formData.price || ''}
                onChange={(e) => handleChange('price', e.target.value ? parseInt(e.target.value) : null)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="예: 50"
                step="0.01"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">재고 상태</label>
              <select
                value={formData.stock_status}
                onChange={(e) => handleChange('stock_status', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {STOCK_STATUS.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">체형 태그</label>
            <div className="flex flex-wrap gap-2">
              {BODY_TYPES.map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => toggleArrayValue('body_type', type)}
                  className={`px-3 py-1 rounded-full text-sm transition-colors ${formData.body_type.includes(type) ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">스타일 무드</label>
            <div className="flex flex-wrap gap-2">
              {VIBES.map(vibe => (
                <button
                  key={vibe}
                  type="button"
                  onClick={() => toggleArrayValue('vibe', vibe)}
                  className={`px-3 py-1 rounded-full text-sm transition-colors ${formData.vibe.includes(vibe) ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                >
                  {vibe}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">시즌</label>
            <div className="flex flex-wrap gap-2">
              {SEASONS.map(season => (
                <button
                  key={season}
                  type="button"
                  onClick={() => toggleArrayValue('season', season)}
                  className={`px-3 py-1 rounded-full text-sm transition-colors ${formData.season.includes(season) ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                >
                  {season}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">소재</label>
            <input
              type="text"
              value={formData.material}
              onChange={(e) => handleChange('material', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="예: cotton, wool, leather"
            />
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">매칭 최적화 정보</h3>
            <p className="text-sm text-gray-600 mb-6">
              아래 정보를 입력하면 자동 코디 생성 시 더욱 정확한 매칭이 가능합니다
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">컬러 패밀리 (Color Family)</label>
                <select
                  value={formData.color_family}
                  onChange={(e) => handleChange('color_family', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {COLOR_FAMILIES.map(cf => (
                    <option key={cf.value} value={cf.value}>{cf.label}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">컬러 매칭에 사용됨</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">컬러 톤 (Color Tone)</label>
                <select
                  value={formData.color_tone}
                  onChange={(e) => handleChange('color_tone', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {COLOR_TONES.map(ct => (
                    <option key={ct.value} value={ct.value}>{ct.label}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">톤온톤 매칭에 사용됨</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">상세 카테고리 (Sub Category)</label>
                <select
                  value={formData.sub_category}
                  onChange={(e) => handleChange('sub_category', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {(SUB_CATEGORIES[formData.category] || []).map(sc => (
                    <option key={sc.value} value={sc.value}>{sc.label}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">스타일 일관성에 사용됨</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">패턴 (Pattern)</label>
                <select
                  value={formData.pattern}
                  onChange={(e) => handleChange('pattern', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {PATTERNS.map(p => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">패턴 밸런스에 사용됨</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  격식도 (Formality): {formData.formality}
                </label>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-gray-500">캐주얼</span>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={formData.formality}
                    onChange={(e) => handleChange('formality', parseInt(e.target.value))}
                    className="flex-1"
                  />
                  <span className="text-xs text-gray-500">포멀</span>
                </div>
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>1</span><span>2</span><span>3</span><span>4</span><span>5</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">1=매우 캐주얼 / 3=스마트캐주얼 / 5=포멀</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  보온감 (Warmth): {formData.warmth}
                </label>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-gray-500">여름</span>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={formData.warmth}
                    onChange={(e) => handleChange('warmth', parseInt(e.target.value))}
                    className="flex-1"
                  />
                  <span className="text-xs text-gray-500">겨울</span>
                </div>
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>1</span><span>2</span><span>3</span><span>4</span><span>5</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">1=여름용 / 3=봄가을 / 5=한겨울</p>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              제품 이미지 <span className="text-red-500">*</span>
            </label>

            <div className="space-y-4">
              <div>
                <label className="flex items-center justify-center w-full px-4 py-3 bg-blue-50 border-2 border-blue-300 border-dashed rounded-lg cursor-pointer hover:bg-blue-100 transition-colors">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={handleImageUpload}
                    disabled={uploading}
                    className="hidden"
                  />
                  {uploading ? (
                    <div className="flex items-center gap-2 text-blue-600">
                      <Loader2 size={20} className="animate-spin" />
                      <span>업로드 중...</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-blue-600">
                      <Upload size={20} />
                      <span className="font-medium">이미지 파일 업로드</span>
                      <span className="text-xs text-gray-500">(최대 5MB, JPEG/PNG/WebP/GIF)</span>
                    </div>
                  )}
                </label>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">또는</span>
                </div>
              </div>

              <div>
                <input
                  type="url"
                  value={formData.image_url}
                  onChange={(e) => handleChange('image_url', e.target.value)}
                  disabled={uploading}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.image_url ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="이미지 URL 직접 입력: https://example.com/image.jpg"
                />
              </div>
            </div>

            {errors.image_url && (
              <p className="text-red-500 text-xs mt-1">{errors.image_url}</p>
            )}

            {formData.image_url && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm text-gray-600">미리보기:</p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleAIAnalysis}
                      disabled={analyzing || uploading}
                      className="px-3 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:from-blue-700 hover:to-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm font-medium shadow-md transition-all"
                    >
                      {analyzing ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          <span>분석 중...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles size={14} />
                          <span>이미지 재분석</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={openExtractModal}
                      disabled={analyzing || uploading}
                      className="px-3 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm font-medium shadow-md transition-all"
                    >
                      <Scissors size={14} />
                      <span>누끼 추출</span>
                    </button>
                  </div>
                </div>

                <div className="flex gap-4 flex-wrap">
                  <div>
                    <p className="text-xs text-gray-400 mb-1">원본</p>
                    <img
                      src={formData.image_url}
                      alt="Preview"
                      className="w-40 h-40 object-cover rounded-lg border-2 border-gray-200"
                      onError={(e) => {
                        e.currentTarget.src = 'https://via.placeholder.com/160?text=Invalid+URL';
                      }}
                    />
                  </div>

                  {nobgUrl && (
                    <div>
                      <div className="flex items-center gap-1 mb-1">
                        <p className="text-xs text-emerald-600 font-medium">누끼 추출 완료</p>
                        <CheckCircle2 size={12} className="text-emerald-500" />
                      </div>
                      <div
                        className="w-40 h-40 rounded-lg border-2 border-emerald-300"
                        style={{ backgroundImage: 'repeating-conic-gradient(#e5e7eb 0% 25%, white 0% 50%) 0 0 / 16px 16px' }}
                      >
                        <img
                          src={nobgUrl}
                          alt="누끼"
                          className="w-full h-full object-contain rounded-lg"
                        />
                      </div>
                      <p className="text-xs text-gray-400 mt-1">플랫레이용 이미지</p>
                    </div>
                  )}

                </div>

                <p className="text-xs text-gray-500 mt-2">
                  AI 자동 분석: Gemini 2.5 Flash Image가 제품 정보를 자동으로 채워줍니다
                </p>
              </div>
            )}
          </div>

          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">쇼핑 링크</label>
            <input
              type="url"
              value={formData.product_link}
              onChange={(e) => handleChange('product_link', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="https://example.com/product"
            />
          </div>

          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Amazon 어필리에이트 링크</label>
            <input
              type="url"
              value={formData.affiliate_link}
              onChange={(e) => handleChange('affiliate_link', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="https://www.amazon.com/dp/XXXXX?tag=your-tag-20"
            />
            <p className="text-xs text-gray-500 mt-1">
              Amazon Associates에서 생성한 어필리에이트 링크를 입력하세요
            </p>
          </div>

          <div className="mt-8 flex justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              <Save size={18} />
              {saving ? '저장 중...' : '저장'}
            </button>
          </div>
        </form>
      </div>
    </div>

    {showExtractModal && (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-emerald-600 to-teal-600 rounded-xl flex items-center justify-center">
                <Scissors size={18} className="text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">제품 누끼 추출</h2>
                <p className="text-xs text-gray-500">모델 착용 사진에서 개별 제품을 감지하고 누끼컷으로 추출합니다</p>
              </div>
            </div>
            <button onClick={() => setShowExtractModal(false)} className="text-gray-400 hover:text-gray-600">
              <X size={22} />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {extractPhase === 'upload' && (
              <>
                <div
                  onClick={() => extractFileRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 rounded-xl p-10 text-center cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/30 transition-all group"
                >
                  <input
                    ref={extractFileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleExtractFileUpload}
                    disabled={extractUploading}
                    className="hidden"
                  />
                  {extractUploading ? (
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 size={36} className="text-emerald-600 animate-spin" />
                      <span className="text-emerald-600 font-medium">업로드 중...</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
                        <ImageIcon size={24} className="text-gray-400 group-hover:text-emerald-500 transition-colors" />
                      </div>
                      <div>
                        <p className="text-gray-700 font-medium">모델 착용 사진 업로드</p>
                        <p className="text-xs text-gray-400 mt-1">JPEG, PNG, WebP (최대 5MB)</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
                  <div className="relative flex justify-center"><span className="bg-white px-3 text-xs text-gray-400">또는 URL 입력</span></div>
                </div>

                <div className="flex gap-2">
                  <input
                    type="url"
                    value={extractUrlInput}
                    onChange={e => setExtractUrlInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (setExtractSource(extractUrlInput.trim()))}
                    placeholder="https://example.com/model-photo.jpg"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => setExtractSource(extractUrlInput.trim())}
                    disabled={!extractUrlInput.trim()}
                    className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 disabled:opacity-40 text-sm font-medium"
                  >
                    확인
                  </button>
                </div>

                {extractSource && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-700">업로드된 이미지</p>
                      <button type="button" onClick={() => setExtractSource('')} className="text-xs text-gray-500 hover:text-gray-700">다시 선택</button>
                    </div>
                    <div className="flex justify-center">
                      <img src={extractSource} alt="source" className="rounded-xl max-h-64 object-contain border border-gray-200" />
                    </div>
                    <button
                      type="button"
                      onClick={handleExtractDetect}
                      disabled={extractDetecting}
                      className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-3 rounded-xl hover:from-blue-700 hover:to-cyan-700 disabled:opacity-50 font-medium transition-all"
                    >
                      {extractDetecting ? (
                        <><Loader2 size={18} className="animate-spin" />AI가 아이템을 감지하는 중...</>
                      ) : (
                        <><ScanSearch size={18} />AI 아이템 감지 시작</>
                      )}
                    </button>
                  </div>
                )}
              </>
            )}

            {(extractPhase === 'detected' || extractPhase === 'extracting') && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => { setExtractPhase('upload'); setExtractItems([]); }}
                      className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
                    >
                      <ArrowLeft size={14} />
                      처음으로
                    </button>
                    <span className="text-sm font-semibold text-gray-900">감지된 아이템 ({extractItems.length}개)</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleExtractAll}
                    disabled={extractItems.filter(i => i.status === 'extracting').length > 0 || extractItems.every(i => i.status === 'done')}
                    className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg hover:from-emerald-700 hover:to-teal-700 disabled:opacity-40 text-sm font-medium transition-all"
                  >
                    {extractItems.every(i => i.status === 'done') ? (
                      <><Check size={14} />전체 완료</>
                    ) : (
                      <><Scissors size={14} />전체 누끼 추출</>
                    )}
                  </button>
                </div>

                {extractItems.map((item, index) => (
                  <div key={`${item.slot}-${index}`} className="border border-gray-200 rounded-xl overflow-hidden">
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-md text-xs font-semibold border ${SLOT_COLORS[item.slot] || 'bg-gray-100 text-gray-700 border-gray-300'}`}>
                            {SLOT_LABELS[item.slot] || item.slot}
                          </span>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{item.label}</p>
                            <p className="text-xs text-gray-500">{item.description}</p>
                          </div>
                        </div>
                        {item.status === 'idle' && (
                          <button type="button" onClick={() => handleExtractSingle(index)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-gray-900 text-white rounded-lg text-xs font-medium hover:bg-gray-700 transition-colors">
                            <Scissors size={12} />누끼 추출
                          </button>
                        )}
                        {item.status === 'extracting' && (
                          <div className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs">
                            <Loader2 size={12} className="animate-spin" />추출 중...
                          </div>
                        )}
                        {item.status === 'error' && (
                          <button type="button" onClick={() => handleExtractSingle(index)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-700 rounded-lg text-xs hover:bg-red-100 transition-colors">
                            <AlertCircle size={12} />재시도
                          </button>
                        )}
                      </div>

                      {item.status === 'extracting' && (
                        <div className="bg-blue-50 rounded-lg p-5 flex flex-col items-center gap-2">
                          <Loader2 size={28} className="text-blue-600 animate-spin" />
                          <p className="text-xs text-blue-700 font-medium">AI가 제품을 추출하는 중...</p>
                        </div>
                      )}

                      {item.status === 'error' && (
                        <div className="bg-red-50 rounded-lg p-3 flex items-center gap-2">
                          <AlertCircle size={16} className="text-red-500 shrink-0" />
                          <p className="text-xs text-red-700">{item.error}</p>
                        </div>
                      )}

                      {item.status === 'done' && item.extractedImageUrl && (
                        <div className="space-y-3">
                          <div
                            className="rounded-lg overflow-hidden flex justify-center p-3"
                            style={{ backgroundImage: 'repeating-conic-gradient(#e5e7eb 0% 25%, white 0% 50%) 0 0 / 16px 16px' }}
                          >
                            <img src={item.extractedImageUrl} alt={item.label} className="max-h-52 object-contain" />
                          </div>
                          <button
                            type="button"
                            onClick={() => handleApplyExtracted(index)}
                            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white py-2.5 rounded-lg text-sm font-medium hover:from-emerald-700 hover:to-teal-700 transition-all"
                          >
                            <CheckCircle2 size={15} />
                            이 이미지를 제품에 적용
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    )}
    </>
  );
}
