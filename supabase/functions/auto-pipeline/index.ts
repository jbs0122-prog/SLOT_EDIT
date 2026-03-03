import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface PipelineEvent {
  step: string;
  status: "start" | "progress" | "success" | "error" | "skip";
  message: string;
  data?: Record<string, unknown>;
  timestamp: string;
}

interface PipelineResult {
  batchId: string;
  events: PipelineEvent[];
  productsRegistered: number;
  outfitsGenerated: number;
  outfitIds: string[];
  outfitCandidates?: any[];
  success: boolean;
  error?: string;
}

function makeEvent(step: string, status: PipelineEvent["status"], message: string, data?: Record<string, unknown>): PipelineEvent {
  return { step, status, message, data, timestamp: new Date().toISOString() };
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function generateKeywords(
  gender: string, bodyType: string, vibe: string, season: string,
  supabaseUrl: string, anonKey: string
): Promise<Record<string, string[]>> {
  const res = await fetch(`${supabaseUrl}/functions/v1/generate-amazon-keywords`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${anonKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ gender, body_type: bodyType, vibe, season }),
  });
  if (!res.ok) throw new Error(`Keyword gen failed: ${res.status}`);
  const data = await res.json();
  return data.categories || {};
}

async function searchAmazon(query: string, supabaseUrl: string, anonKey: string): Promise<any[]> {
  const res = await fetch(`${supabaseUrl}/functions/v1/amazon-search`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${anonKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query, page: 1 }),
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.results || [];
}

async function analyzeAndRegisterProduct(
  product: any, gender: string, bodyType: string, vibe: string, season: string,
  batchId: string, supabaseUrl: string, serviceKey: string,
  adminClient: ReturnType<typeof createClient>
): Promise<{ success: boolean; productId?: string }> {
  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/analyze-amazon-product`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${serviceKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ product, gender, body_type: bodyType, vibe, season }),
    });
    if (!res.ok) return { success: false };
    const data = await res.json();
    if (data.error) return { success: false };

    const productLink = product.url || "";
    if (!productLink) return { success: false };

    const { data: inserted, error: findErr } = await adminClient
      .from("products")
      .select("id, name")
      .eq("product_link", productLink)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (findErr || !inserted) return { success: false };
    await adminClient.from("products").update({ batch_id: batchId }).eq("id", inserted.id);
    return { success: true, productId: inserted.id };
  } catch {
    return { success: false };
  }
}

async function triggerExtractProduct(
  productId: string, imageUrl: string, category: string, subCategory: string,
  supabaseUrl: string, serviceKey: string
): Promise<void> {
  const headers = { "Authorization": `Bearer ${serviceKey}`, "Content-Type": "application/json" };
  const adminClient = createClient(supabaseUrl, serviceKey);
  const slot = ["outer","mid","top","bottom","shoes","bag","accessory"].includes(category) ? category : "top";
  const label = subCategory || category;
  let nobgUrl: string | null = null;
  let isModelShot = false;

  try {
    const detectRes = await fetch(`${supabaseUrl}/functions/v1/extract-products`, {
      method: "POST", headers,
      body: JSON.stringify({ mode: "detect", imageUrl }),
    });
    if (detectRes.ok) {
      const detectData = await detectRes.json();
      if (detectData.success && detectData.items?.length) {
        isModelShot = true;
        const targetItem = detectData.items.find((i: any) => i.slot === slot) ?? detectData.items[0];
        const extractRes = await fetch(`${supabaseUrl}/functions/v1/extract-products`, {
          method: "POST", headers,
          body: JSON.stringify({ mode: "extract", imageUrl, slot: targetItem.slot, label: targetItem.label || label }),
        });
        if (extractRes.ok) {
          const extractData = await extractRes.json();
          if (extractData.success && extractData.imageUrl) nobgUrl = extractData.imageUrl;
        }
      }
    }
  } catch { /* fall through */ }

  const pixianSourceUrl = nobgUrl || (!isModelShot ? imageUrl : null);
  if (pixianSourceUrl) {
    try {
      const pixianRes = await fetch(`${supabaseUrl}/functions/v1/remove-bg`, {
        method: "POST", headers,
        body: JSON.stringify({ imageUrl: pixianSourceUrl, productId }),
      });
      if (pixianRes.ok) {
        const pixianData = await pixianRes.json();
        if (pixianData.success && (pixianData.url || pixianData.image)) {
          nobgUrl = pixianData.url || pixianData.image;
        }
      }
    } catch { /* silent */ }
  }

  if (nobgUrl && !nobgUrl.startsWith("data:")) {
    try {
      await adminClient.from("products").update({ nobg_image_url: nobgUrl }).eq("id", productId);
    } catch { /* silent */ }
  }
}

function scoreSimple(items: Record<string, any>, vibe: string, season: string): number {
  const all = Object.values(items).filter(Boolean);
  if (all.length === 0) return 0;

  let score = 60;

  const vibeMatches = all.filter((p: any) => Array.isArray(p.vibe) && p.vibe.includes(vibe)).length;
  score += (vibeMatches / all.length) * 25;

  const seasonMatches = all.filter((p: any) => Array.isArray(p.season) && p.season.includes(season)).length;
  score += (seasonMatches / all.length) * 15;

  const colorFamilies = all.map((p: any) => p.color_family || p.color || "").filter(Boolean);
  const uniqueColors = new Set(colorFamilies).size;
  if (uniqueColors >= 2 && uniqueColors <= 3) score += 10;
  else if (uniqueColors > 4) score -= 10;

  return Math.max(0, Math.min(100, Math.round(score)));
}

function isSeasonAppropriateOuter(product: any, season: string): boolean {
  const warmth = typeof product.warmth === "number" ? product.warmth : 3;
  if (season === "summer") return false;
  if (season === "winter" && warmth < 3) return false;
  if (season === "spring" && warmth > 4) return false;
  return true;
}

async function generateOutfitsFromBatch(
  batchId: string, gender: string, bodyType: string, vibe: string, season: string,
  outfitCount: number, adminClient: ReturnType<typeof createClient>
): Promise<{ outfitIds: string[]; count: number; outfitCandidates: any[] }> {
  const { data: batchProducts } = await adminClient
    .from("products")
    .select("id, name, category, sub_category, color, color_family, color_tone, silhouette, material, pattern, vibe, body_type, season, formality, warmth, image_url, nobg_image_url, price")
    .eq("batch_id", batchId);

  if (!batchProducts || batchProducts.length === 0) {
    throw new Error("No products found for batch");
  }

  const slots = ["top","bottom","shoes","bag","accessory","outer","mid"];
  const bySlot: Record<string, any[]> = {};
  for (const slot of slots) {
    bySlot[slot] = batchProducts.filter((p: any) => p.category === slot);
  }

  bySlot["outer"] = bySlot["outer"].filter((p: any) => isSeasonAppropriateOuter(p, season));
  if (season === "summer") bySlot["mid"] = [];

  const missingHard = ["top","bottom"].filter(s => !bySlot[s] || bySlot[s].length === 0);
  if (missingHard.length > 0) {
    const catCount: Record<string, number> = {};
    for (const p of batchProducts) catCount[p.category] = (catCount[p.category] || 0) + 1;
    throw new Error(`Missing essential slots: ${missingHard.join(", ")}. Available: ${JSON.stringify(catCount)}`);
  }

  const optionalSlots = season === "winter"
    ? ["outer","mid","shoes","bag","accessory"]
    : season === "fall"
    ? ["outer","shoes","mid","bag","accessory"]
    : season === "spring"
    ? ["shoes","bag","accessory","outer","mid"]
    : ["shoes","bag","accessory"];

  interface Combo { items: Record<string, any>; score: number; }
  const combos: Combo[] = [];

  for (const top of bySlot["top"]) {
    for (const bottom of bySlot["bottom"]) {
      const baseItems: Record<string, any> = { top, bottom };

      for (const slot of optionalSlots) {
        const pool = bySlot[slot] || [];
        if (pool.length === 0) continue;
        let bestScore = -Infinity;
        let bestPick: any = null;
        for (const candidate of pool) {
          const testItems = { ...baseItems, [slot]: candidate };
          const s = scoreSimple(testItems, vibe, season);
          if (s > bestScore) { bestScore = s; bestPick = candidate; }
        }
        if (bestPick) baseItems[slot] = bestPick;
      }

      const score = scoreSimple(baseItems, vibe, season);
      combos.push({ items: baseItems, score });
    }
  }

  combos.sort((a, b) => b.score - a.score);

  const usedTops = new Set<string>();
  const usedBottoms = new Set<string>();
  const selectedCombos: Combo[] = [];

  for (const combo of combos) {
    if (selectedCombos.length >= outfitCount) break;
    const topId = combo.items.top?.id;
    const bottomId = combo.items.bottom?.id;
    if (!topId || !bottomId) continue;
    if (usedTops.has(topId) && usedBottoms.has(bottomId)) continue;
    selectedCombos.push(combo);
    usedTops.add(topId);
    usedBottoms.add(bottomId);
  }

  if (selectedCombos.length < outfitCount) {
    for (const combo of combos) {
      if (selectedCombos.length >= outfitCount) break;
      if (!selectedCombos.includes(combo)) selectedCombos.push(combo);
    }
  }

  const outfitIds: string[] = [];
  const outfitCandidates: any[] = [];

  for (const { items: outfitItems, score } of selectedCombos) {
    const { data: newOutfit, error: outfitErr } = await adminClient
      .from("outfits")
      .insert({
        gender, body_type: bodyType, vibe,
        season: season ? [season] : [],
        status: "draft", tpo: "",
        "AI insight": `Auto-pipeline batch: ${batchId} | Score: ${score}`,
        image_url_flatlay: "", image_url_on_model: "",
        flatlay_pins: [], on_model_pins: [], prompt_flatlay: "",
      })
      .select()
      .single();

    if (outfitErr || !newOutfit) continue;

    const itemsToInsert: any[] = [];
    const candidateItems: any[] = [];

    for (const [slot, product] of Object.entries(outfitItems)) {
      if (!product) continue;
      itemsToInsert.push({ outfit_id: newOutfit.id, product_id: product.id, slot_type: slot });
      candidateItems.push({
        slot,
        productId: product.id,
        name: product.name || "",
        imageUrl: product.nobg_image_url || product.image_url || "",
        price: product.price,
      });
    }

    await adminClient.from("outfit_items").insert(itemsToInsert);
    outfitIds.push(newOutfit.id);
    outfitCandidates.push({ outfitId: newOutfit.id, matchScore: score, items: candidateItems });
  }

  if (outfitIds.length === 0) {
    throw new Error("Could not assemble any complete outfits from the registered products");
  }

  return { outfitIds, count: outfitIds.length, outfitCandidates };
}

async function triggerAIInsights(
  outfitIds: string[],
  context: { gender: string; bodyType: string; vibe: string; season?: string },
  adminClient: ReturnType<typeof createClient>,
  supabaseUrl: string, anonKey: string
): Promise<void> {
  const headers = { "Authorization": `Bearer ${anonKey}`, "Content-Type": "application/json" };
  await Promise.allSettled(outfitIds.map(async (outfitId) => {
    const { data: items } = await adminClient
      .from("outfit_items")
      .select("slot_type, products(*)")
      .eq("outfit_id", outfitId);
    if (!items || items.length === 0) return;
    const itemList = items.map((i: any) => ({
      slot_type: i.slot_type,
      brand: i.products?.brand || "",
      name: i.products?.name || "",
      category: i.products?.category || "",
      color: i.products?.color || "",
      color_family: i.products?.color_family || "",
      material: i.products?.material || "",
      pattern: i.products?.pattern || "",
      silhouette: i.products?.silhouette || "",
      sub_category: i.products?.sub_category || "",
      vibe: i.products?.vibe || [],
    }));
    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/generate-outfit-insight`, {
        method: "POST", headers,
        body: JSON.stringify({
          items: itemList,
          gender: context.gender, bodyType: context.bodyType,
          vibe: context.vibe, season: context.season,
          matchScore: Math.round(75 + Math.random() * 15),
        }),
      });
      if (res.ok) {
        const d = await res.json();
        if (d.success && d.insight) {
          await adminClient.from("outfits").update({ "AI insight": d.insight }).eq("id", outfitId);
        }
      }
    } catch { /* silent */ }
  }));
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    let body: Record<string, unknown> = {};
    try {
      const text = await req.text();
      if (text && text.trim().length > 0) body = JSON.parse(text);
    } catch {
      return new Response(JSON.stringify({ success: false, error: "Invalid JSON body" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const {
      gender, body_type, vibe, season,
      outfit_count = 3,
      products_per_slot = 5,
    } = body as {
      gender?: string; body_type?: string; vibe?: string; season?: string;
      outfit_count?: number; products_per_slot?: number;
    };

    if (!gender || !body_type || !vibe) {
      return new Response(JSON.stringify({ error: "gender, body_type, vibe are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const batchId = `auto-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const events: PipelineEvent[] = [];

    events.push(makeEvent("init", "start", "Pipeline started", { batchId, gender, body_type, vibe, season }));

    // STEP 1: Generate keywords
    events.push(makeEvent("keywords", "start", "Generating style keywords via Gemini AI..."));
    let categories: Record<string, string[]> = {};
    try {
      categories = await generateKeywords(gender!, body_type!, vibe!, season || "all", SUPABASE_URL, SUPABASE_ANON_KEY);
      const totalKw = Object.values(categories).reduce((acc, arr) => acc + arr.length, 0);
      events.push(makeEvent("keywords", "success", `Generated ${totalKw} keywords across ${Object.keys(categories).length} categories`));
    } catch (err) {
      events.push(makeEvent("keywords", "error", `Keyword generation failed: ${(err as Error).message}`));
      return new Response(JSON.stringify({ success: false, events, error: "Keyword generation failed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // STEP 2: Amazon search
    events.push(makeEvent("search", "start", "Searching Amazon for products per slot..."));

    const PRIORITY_SLOTS = ["top","bottom","shoes","outer","bag","accessory","mid"];
    const MAX_KW_PER_SLOT = 2;
    const MAX_RESULTS_PER_KW = 15;
    const genderLabel = gender === "MALE" ? "men's" : "women's";

    const SLOT_FALLBACK: Record<string, string[]> = {
      bottom: [`${genderLabel} jeans`, `${genderLabel} trousers`],
      top: [`${genderLabel} shirt`, `${genderLabel} blouse`],
      shoes: [`${genderLabel} shoes`, `${genderLabel} sneakers`],
      outer: [`${genderLabel} jacket`, `${genderLabel} coat`],
      bag: [`${genderLabel} bag`, `${genderLabel} tote`],
      accessory: [`${genderLabel} scarf`, `${genderLabel} belt`],
      mid: [`${genderLabel} cardigan`, `${genderLabel} sweater`],
    };

    const slotSearchResults = await Promise.all(
      PRIORITY_SLOTS.map(async (slot) => {
        let keywords = categories[slot] || [];
        if (keywords.length === 0) keywords = SLOT_FALLBACK[slot] || [];
        if (keywords.length === 0) return { slot, candidates: [] };

        const kwToSearch = keywords.slice(0, MAX_KW_PER_SLOT);
        const seenAsins = new Set<string>();
        const candidates: Array<{ product: any; slot: string; keyword: string }> = [];

        for (const kw of kwToSearch) {
          try {
            const results = await searchAmazon(kw, SUPABASE_URL, SUPABASE_ANON_KEY);
            for (const r of results.slice(0, MAX_RESULTS_PER_KW)) {
              if (r.asin && !seenAsins.has(r.asin)) {
                seenAsins.add(r.asin);
                candidates.push({ product: r, slot, keyword: kw });
              }
            }
          } catch { /* skip */ }
        }
        return { slot, candidates };
      })
    );

    const allCandidates: Array<{ product: any; slot: string; keyword: string }> = [];
    for (const { slot, candidates } of slotSearchResults) {
      allCandidates.push(...candidates);
      if (candidates.length > 0) {
        events.push(makeEvent("search", "progress", `[${slot}] Found ${candidates.length} candidates`));
      }
    }
    events.push(makeEvent("search", "success", `Total ${allCandidates.length} candidates found`));

    if (allCandidates.length === 0) {
      return new Response(JSON.stringify({ success: false, events, error: "No products found in Amazon search" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // STEP 3: Deduplicate & limit per slot
    const bySlotCandidates: Record<string, Array<{ product: any; keyword: string }>> = {};
    for (const { product, slot, keyword } of allCandidates) {
      if (!bySlotCandidates[slot]) bySlotCandidates[slot] = [];
      if (bySlotCandidates[slot].length < (products_per_slot as number)) {
        bySlotCandidates[slot].push({ product, keyword });
      }
    }

    const existingAsins = new Set<string>();
    const { data: existing } = await adminClient
      .from("products")
      .select("product_link")
      .not("product_link", "is", null);
    if (existing) {
      for (const row of existing) {
        const match = (row.product_link || "").match(/\/dp\/([A-Z0-9]{10})/);
        if (match) existingAsins.add(match[1]);
      }
    }

    // STEP 4: Analyze & register
    events.push(makeEvent("register", "start", "Analyzing and registering products..."));

    const registerResults = await Promise.all(
      PRIORITY_SLOTS.map(async (slot) => {
        const candidates = bySlotCandidates[slot] || [];
        const registered: string[] = [];
        for (const { product } of candidates) {
          const asin = product.asin;
          if (asin && existingAsins.has(asin)) continue;
          const result = await analyzeAndRegisterProduct(
            product, gender!, body_type!, vibe!, season || "all", batchId,
            SUPABASE_URL, SUPABASE_SERVICE_KEY, adminClient
          );
          if (result.success && result.productId) {
            registered.push(result.productId);
            if (asin) existingAsins.add(asin);
          }
        }
        return { slot, registered };
      })
    );

    let registeredCount = 0;
    for (const { slot, registered } of registerResults) {
      registeredCount += registered.length;
      if (registered.length > 0) {
        events.push(makeEvent("register", "progress", `[${slot}] Registered ${registered.length} products`));
      }
    }
    events.push(makeEvent("register", "success", `Registered ${registeredCount} products total`));

    if (registeredCount === 0) {
      return new Response(JSON.stringify({ success: false, events, error: "No products were successfully registered" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // STEP 5: Flatlay extraction
    events.push(makeEvent("nobg", "start", "Starting flatlay extraction for registered products..."));
    const { data: productsForBg } = await adminClient
      .from("products")
      .select("id, image_url, category, sub_category, name")
      .eq("batch_id", batchId)
      .is("nobg_image_url", null);

    if (productsForBg && productsForBg.length > 0) {
      const PARALLEL = 5;
      let extractedCount = 0;
      const validProducts = productsForBg.filter((p: any) => !!p.image_url);
      for (let i = 0; i < validProducts.length; i += PARALLEL) {
        const batch = validProducts.slice(i, i + PARALLEL);
        events.push(makeEvent("nobg", "progress", `Extracting batch ${Math.floor(i / PARALLEL) + 1}/${Math.ceil(validProducts.length / PARALLEL)}...`));
        const results = await Promise.allSettled(
          batch.map((p: any) => triggerExtractProduct(
            p.id, p.image_url, p.category || "top", p.sub_category || "",
            SUPABASE_URL, SUPABASE_SERVICE_KEY
          ))
        );
        extractedCount += results.filter(r => r.status === "fulfilled").length;
        if (i + PARALLEL < validProducts.length) await delay(200);
      }
      events.push(makeEvent("nobg", "success", `Flatlay extraction complete: ${extractedCount}/${validProducts.length} processed`));
    } else {
      events.push(makeEvent("nobg", "skip", "All products already have flatlay images"));
    }

    // STEP 6: Generate outfits
    events.push(makeEvent("outfits", "start", `Generating ${outfit_count} outfit candidates...`));
    let outfitIds: string[] = [];
    let outfitCount_result = 0;
    let outfitCandidates: any[] = [];

    try {
      const outfitResult = await generateOutfitsFromBatch(
        batchId, gender!, body_type!, vibe!, season || "all", outfit_count as number, adminClient
      );
      outfitIds = outfitResult.outfitIds;
      outfitCount_result = outfitResult.count;
      outfitCandidates = outfitResult.outfitCandidates;
      events.push(makeEvent("outfits", "success", `Generated ${outfitCount_result} outfit candidates`, { outfitIds }));
    } catch (err) {
      events.push(makeEvent("outfits", "error", `Outfit generation failed: ${(err as Error).message}`));
    }

    // STEP 7: AI Insights
    if (outfitIds.length > 0) {
      await triggerAIInsights(
        outfitIds,
        { gender: gender!, bodyType: body_type!, vibe: vibe!, season: season },
        adminClient, SUPABASE_URL, SUPABASE_ANON_KEY
      );
    }

    events.push(makeEvent("done", "success", `Pipeline complete. ${registeredCount} products, ${outfitCount_result} outfit candidates ready.`, {
      batchId, productsRegistered: registeredCount, outfitsGenerated: outfitCount_result,
    }));

    const result: PipelineResult = {
      batchId, events,
      productsRegistered: registeredCount,
      outfitsGenerated: outfitCount_result,
      outfitIds, outfitCandidates,
      success: true,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
