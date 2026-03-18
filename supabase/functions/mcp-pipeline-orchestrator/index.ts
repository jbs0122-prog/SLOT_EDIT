import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

function adminClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
}

async function log(batchId: string, step: string, status: string, message: string) {
  const db = adminClient();
  await db.from("mcp_pipeline_logs").insert({ batch_id: batchId, step, status, message }).catch(() => {});
}

async function updateRun(batchId: string, fields: Record<string, unknown>) {
  const db = adminClient();
  await db.from("mcp_pipeline_runs").update({ ...fields, updated_at: new Date().toISOString() }).eq("batch_id", batchId).catch(() => {});
}

async function callFunction(fnName: string, body: unknown, authHeader: string, timeoutMs = 90000): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const r = await fetch(`${SUPABASE_URL}/functions/v1/${fnName}`, {
      method: "POST",
      headers: { Authorization: authHeader, apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!r.ok) {
      const txt = await r.text().catch(() => `HTTP ${r.status}`);
      throw new Error(`${fnName} failed (${r.status}): ${txt.slice(0, 200)}`);
    }
    return r.json();
  } catch (e) {
    if ((e as Error).name === "AbortError") throw new Error(`${fnName} timed out after ${timeoutMs}ms`);
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

async function loadKeywordScores(db: ReturnType<typeof adminClient>, vibeKey: string, seasonLabel: string): Promise<Map<string, number>> {
  const scoreMap = new Map<string, number>();
  try {
    const { data } = await db.from("keyword_performance")
      .select("keyword, score")
      .eq("vibe", vibeKey)
      .eq("season", seasonLabel)
      .gte("score", 0)
      .order("score", { ascending: false })
      .limit(200);
    if (data) {
      for (const row of data) {
        if (row.keyword && typeof row.score === "number") {
          scoreMap.set(row.keyword, row.score);
        }
      }
    }
  } catch { /* silent */ }
  return scoreMap;
}

function sortKeywordsByLearning(keywords: string[], scoreMap: Map<string, number>): string[] {
  if (scoreMap.size === 0) return keywords;
  return [...keywords].sort((a, b) => {
    const sa = scoreMap.get(a) ?? 0.5;
    const sb = scoreMap.get(b) ?? 0.5;
    return sb - sa;
  });
}

function isValidSearchResult(item: any): boolean {
  return (
    item &&
    typeof item.asin === "string" && item.asin.length >= 8 &&
    typeof item.image === "string" && item.image.startsWith("http") &&
    (item.price === null || typeof item.price === "number")
  );
}

interface DnaContext {
  enabled: boolean;
  mode: string;
  colorsByLook: Record<string, string[]>;
  materialsByLook: Record<string, string[]>;
  briefsByLook: Record<string, string>;
  cellCount: number;
}

async function loadDnaContext(db: ReturnType<typeof adminClient>, gender: string, bodyType: string, vibe: string, season: string, dnaMode: string): Promise<DnaContext> {
  const ctx: DnaContext = { enabled: false, mode: dnaMode, colorsByLook: {}, materialsByLook: {}, briefsByLook: {}, cellCount: 0 };
  if (dnaMode === "skip") return ctx;

  try {
    const statusFilter = dnaMode === "force" ? ["ready", "in_progress"] : ["ready"];
    const { data: cells } = await db
      .from("style_dna_cells")
      .select("id, look_key, status, style_brief, learned_palette, learned_materials")
      .eq("gender", gender)
      .eq("body_type", bodyType)
      .eq("vibe", vibe)
      .eq("season", season)
      .in("status", statusFilter);

    if (!cells || cells.length === 0) return ctx;

    ctx.cellCount = cells.length;
    ctx.enabled = true;

    for (const cell of cells) {
      const lk = cell.look_key;
      if (cell.style_brief) ctx.briefsByLook[lk] = cell.style_brief;
      if (cell.learned_palette?.dominant_colors) {
        ctx.colorsByLook[lk] = (cell.learned_palette.dominant_colors as string[]).slice(0, 6);
      }
      if (cell.learned_materials && Array.isArray(cell.learned_materials)) {
        ctx.materialsByLook[lk] = (cell.learned_materials as string[]).slice(0, 6);
      }
    }
  } catch { /* silent */ }
  return ctx;
}

function scoreDnaRelevance(item: any, dnaColors: string[], dnaMaterials: string[]): number {
  if (dnaColors.length === 0 && dnaMaterials.length === 0) return 0;
  const title = ((item.title || "") + " " + (item.color || "")).toLowerCase();
  let score = 0;
  for (const c of dnaColors) {
    if (title.includes(c.toLowerCase())) { score += 2; break; }
  }
  for (const m of dnaMaterials) {
    if (title.includes(m.toLowerCase())) { score += 1; break; }
  }
  return score;
}

async function runPipeline(batchId: string, config: {
  gender: string; bodyType: string; vibe: string; season: string; productsPerSlot: number; dnaMode: string;
}, authHeader: string) {
  const db = adminClient();
  const { gender, bodyType, vibe, season, productsPerSlot, dnaMode } = config;

  try {
    await updateRun(batchId, { status: "running", phase: "keywords" });
    await log(batchId, "system", "start", `MCP Pipeline started — ${vibe} / ${season} / ${gender} (DNA: ${dnaMode})`);

    const vibeKey = vibe.toLowerCase().replace(/\s+/g, "_");
    const seasonLabel = season.toLowerCase();

    const dna = await loadDnaContext(db, gender, bodyType, vibe, seasonLabel, dnaMode);
    if (dna.enabled) {
      await log(batchId, "system", "progress", `DNA Lab active: ${dna.cellCount} cells, ${Object.keys(dna.briefsByLook).length} briefs loaded`);
    }

    // ── STEP 1: Keywords ──────────────────────────────────────────────────────
    await log(batchId, "keywords", "start", `Generating keywords via rule engine + learning data${dna.enabled ? " + DNA Lab" : ""}...`);
    const kwData = await callFunction("auto-generate-keywords", { gender, body_type: bodyType, vibe, season, dna_mode: dnaMode }, authHeader);
    const byLook: Record<string, Record<string, string[]>> = kwData.byLook || {};
    const lookNames: Record<string, string> = kwData.lookNames || {};
    const lookKeys = Object.keys(byLook);
    const totalKw = Object.values(kwData.categories || {}).reduce((a: number, b: unknown) => a + (b as string[]).length, 0);
    const dnaTag = kwData.dnaEnhanced ? ` [DNA-enhanced: ${kwData.dnaCellCount} cells]` : "";

    const kwScores = await loadKeywordScores(db, vibeKey, seasonLabel);
    const learnedCount = kwScores.size;
    await log(batchId, "keywords", "success", `${totalKw} keywords across ${lookKeys.length} looks (${learnedCount} learned scores loaded)${dnaTag}`);

    for (const lookKey of lookKeys) {
      for (const slot of Object.keys(byLook[lookKey] || {})) {
        byLook[lookKey][slot] = sortKeywordsByLearning(byLook[lookKey][slot], kwScores);
      }
    }

    await updateRun(batchId, { phase: "search", phase_data: { byLook, lookNames, lookKeys } });

    // ── STEP 2: Fetch existing ASINs for dedup ────────────────────────────────
    const existingAsinSet = new Set<string>();
    const { data: existingProducts } = await db.from("products").select("product_link").not("product_link", "is", null);
    if (existingProducts) {
      for (const row of existingProducts) {
        const m = (row.product_link || "").match(/\/dp\/([A-Z0-9]{10})/);
        if (m) existingAsinSet.add(m[1]);
      }
    }

    const CORE_SLOTS = ["top", "bottom", "shoes", "outer"];
    const OPTIONAL_SLOTS = ["bag", "accessory", "mid"];
    const PRIORITY_SLOTS = [...CORE_SLOTS, ...OPTIONAL_SLOTS];
    const globalSearchCache = new Map<string, unknown[]>();
    const lookSlotCandidatesMap: Record<string, Record<string, unknown[]>> = {};

    // ── STEP 3: Search (per look, parallel slots) ─────────────────────────────
    await log(batchId, "search", "start", `Searching Amazon for ${lookKeys.length} looks...`);

    const SEARCH_PARALLEL = 3;
    for (const lookKey of lookKeys) {
      const lookCategories = byLook[lookKey] || {};
      const lookSeenAsins = new Set<string>();
      const slotCandidates: Record<string, unknown[]> = {};

      const slotTasks = PRIORITY_SLOTS.map(slot => ({ slot, kws: (lookCategories[slot] || []) as string[] }))
        .filter(t => t.kws.length > 0);

      for (let i = 0; i < slotTasks.length; i += SEARCH_PARALLEL) {
        const batch = slotTasks.slice(i, i + SEARCH_PARALLEL);
        await Promise.allSettled(batch.map(async ({ slot, kws }) => {
          const isCore = CORE_SLOTS.includes(slot);
          const isMandatory = ["top", "bottom", "shoes"].includes(slot);
          const slotLimit = isMandatory ? Math.max(2, productsPerSlot) : isCore ? productsPerSlot : Math.max(1, productsPerSlot - 1);
          const candidates: unknown[] = [];

          for (const kw of kws) {
            if (candidates.length >= slotLimit) break;
            let results: unknown[];
            if (globalSearchCache.has(kw)) {
              results = globalSearchCache.get(kw)!;
            } else {
              try {
                const d = await callFunction("auto-amazon-search", { query: kw, page: 1 }, authHeader, 30000);
                const raw = d.results || [];
                results = (raw as any[]).filter(isValidSearchResult);
                globalSearchCache.set(kw, results);
                const invalid = raw.length - results.length;
                await log(batchId, "search", "progress", `[${lookKey}/${slot}] "${kw}" → ${results.length} valid${invalid > 0 ? `, ${invalid} filtered` : ""} (${d.total_filtered ?? 0}/${d.total_raw ?? 0})`);
              } catch (e) {
                results = [];
                await log(batchId, "search", "progress", `[${lookKey}/${slot}] "${kw}" failed: ${(e as Error).message.slice(0, 80)}`);
              }
            }
            const lookDnaColors = dna.colorsByLook[lookKey] || [];
            const lookDnaMaterials = dna.materialsByLook[lookKey] || [];
            const eligible = (results as any[]).filter(
              (item: any) => item.asin && !lookSeenAsins.has(item.asin) && !existingAsinSet.has(item.asin)
            );
            if (dna.enabled && (lookDnaColors.length > 0 || lookDnaMaterials.length > 0)) {
              eligible.sort((a: any, b: any) => scoreDnaRelevance(b, lookDnaColors, lookDnaMaterials) - scoreDnaRelevance(a, lookDnaColors, lookDnaMaterials));
            }
            for (const item of eligible) {
              if (candidates.length >= slotLimit) break;
              lookSeenAsins.add(item.asin);
              candidates.push(item);
            }
          }

          if (isCore && candidates.length === 0 && kws.length > 0) {
            try {
              const d = await callFunction("auto-amazon-search", { query: kws[0], page: 1, filter: { minRating: 3.5 } }, authHeader, 30000);
              for (const item of (d.results || []) as any[]) {
                if (isValidSearchResult(item) && !lookSeenAsins.has(item.asin) && candidates.length < slotLimit) {
                  lookSeenAsins.add(item.asin);
                  candidates.push(item);
                }
              }
            } catch { /* silent */ }
          }

          if (candidates.length > 0) slotCandidates[slot] = candidates;
        }));
      }

      lookSlotCandidatesMap[lookKey] = slotCandidates;
      await log(batchId, "search", "progress", `[Look ${lookKey}] ${Object.values(slotCandidates).reduce((a, b) => a + b.length, 0)} candidates found`);
    }

    for (const lookKey of lookKeys) {
      const slotCandidates = lookSlotCandidatesMap[lookKey];
      for (const slot of ["top", "bottom", "shoes"]) {
        if (!slotCandidates[slot]?.length) {
          for (const other of lookKeys) {
            if (other === lookKey) continue;
            const borrowed = lookSlotCandidatesMap[other]?.[slot];
            if (borrowed?.length) {
              slotCandidates[slot] = borrowed.slice(0, 2);
              await log(batchId, "search", "progress", `[Look ${lookKey}/${slot}] Borrowed from Look ${other}`);
              break;
            }
          }
        }
      }
    }
    await log(batchId, "search", "success", `Search complete: ${globalSearchCache.size} unique API calls`);
    await updateRun(batchId, { phase: "register" });

    // ── STEP 4: Register products (parallel across looks) ─────────────────────
    let totalRegistered = 0;
    const REGISTER_PARALLEL = 4;
    const lookRegistrationTasks: Array<{ lookKey: string; lookBatchId: string }> = [];

    for (const lookKey of lookKeys) {
      const slotCandidates = lookSlotCandidatesMap[lookKey];
      const hasCoreSlots = ["top", "bottom"].every(s => slotCandidates[s]?.length);
      if (!hasCoreSlots) {
        await log(batchId, "register", "error", `[Look ${lookKey}] Missing core slots, skipping`);
        continue;
      }
      lookRegistrationTasks.push({ lookKey, lookBatchId: `${batchId}-${lookKey}` });
    }

    for (const { lookKey, lookBatchId } of lookRegistrationTasks) {
      const slotCandidates = lookSlotCandidatesMap[lookKey];
      await log(batchId, "register", "start", `[Look ${lookKey}] Analyzing & registering products...`);
      let lookReg = 0;

      const allProducts: Array<{ slot: string; product: any }> = [];
      for (const slot of PRIORITY_SLOTS) {
        for (const product of (slotCandidates[slot] || []) as any[]) {
          allProducts.push({ slot, product });
        }
      }

      for (let i = 0; i < allProducts.length; i += REGISTER_PARALLEL) {
        const batch = allProducts.slice(i, i + REGISTER_PARALLEL);
        const results = await Promise.allSettled(batch.map(async ({ slot, product }) => {
          for (let attempt = 1; attempt <= 2; attempt++) {
            try {
              const d = await callFunction("auto-pipeline", {
                action: "register-product", product, gender, body_type: bodyType, vibe, season,
                batchId: lookBatchId, slotHint: slot,
              }, authHeader, 30000);
              if (d.success) {
                if (product.asin) existingAsinSet.add(product.asin);
                return true;
              }
              const reason = d.warmth_rejected ? `warmth gate: ${d.error || ""}` : (d.error || "unknown");
              await log(batchId, "register", "progress", `[${lookKey}/${slot}] Failed: ${reason.slice(0, 120)}`);
              return false;
            } catch (e) {
              if (attempt === 2) {
                await log(batchId, "register", "progress", `[${lookKey}/${slot}] Error: ${(e as Error).message.slice(0, 120)}`);
              }
            }
          }
          return false;
        }));
        for (const r of results) {
          if (r.status === "fulfilled" && r.value) {
            lookReg++;
            totalRegistered++;
          }
        }
      }

      await log(batchId, "register", "success", `[Look ${lookKey}] Registered ${lookReg} products`);
      await updateRun(batchId, { registered_count: totalRegistered });
    }

    if (totalRegistered === 0) throw new Error("No products were registered");

    // ── STEP 5: Background removal (all looks at once, high parallelism) ──────
    await updateRun(batchId, { phase: "nobg" });
    await log(batchId, "nobg", "start", `Extracting flatlays for all looks...`);

    const allBgProducts: Array<{ id: string; image_url: string; category: string; sub_category: string; lookKey: string }> = [];
    for (const { lookKey, lookBatchId } of lookRegistrationTasks) {
      const { data: productsForBg } = await db.from("products")
        .select("id, image_url, category, sub_category")
        .eq("batch_id", lookBatchId)
        .is("nobg_image_url", null);
      if (productsForBg) {
        for (const p of productsForBg) allBgProducts.push({ ...p, lookKey });
      }
    }

    if (allBgProducts.length > 0) {
      const NOBG_PARALLEL = 5;
      const NOBG_TIMEOUT = 45000;
      let extracted = 0;
      let failed = 0;

      for (let i = 0; i < allBgProducts.length; i += NOBG_PARALLEL) {
        const batch = allBgProducts.slice(i, i + NOBG_PARALLEL);
        const results = await Promise.allSettled(batch.map(p =>
          callFunction("auto-pipeline", {
            action: "extract-nobg", productId: p.id, imageUrl: p.image_url,
            category: p.category || "top", subCategory: p.sub_category || "",
          }, authHeader, NOBG_TIMEOUT)
        ));
        for (const r of results) {
          if (r.status === "fulfilled") extracted++;
          else failed++;
        }
      }
      await log(batchId, "nobg", "success", `${extracted}/${allBgProducts.length} flatlays extracted${failed > 0 ? ` (${failed} timed out)` : ""}`);
    } else {
      await log(batchId, "nobg", "success", `All products already have flatlays`);
    }

    // ── STEP 6: Generate outfits ──────────────────────────────────────────────
    await log(batchId, "outfits", "start", `Generating outfits for ${lookKeys.length} looks...`);
    await updateRun(batchId, { phase: "outfits" });

    const lookBatchIdsList = lookKeys.map(k => ({ lookKey: k, batchId: `${batchId}-${k}` }));
    const outfitData = await callFunction("auto-pipeline", {
      action: "generate-outfits",
      batchId: `${batchId}-${lookKeys[0]}`,
      lookBatchIds: lookBatchIdsList,
      gender, body_type: bodyType, vibe, season, outfit_count: lookKeys.length,
    }, authHeader);

    const outfitIds: string[] = outfitData.outfitIds || [];
    const outfitCandidates = (outfitData.outfitCandidates || []).map((c: any) => ({
      ...c,
      lookLabel: c.lookKey ? (lookNames[c.lookKey] || c.lookKey) : undefined,
    }));

    for (const c of outfitCandidates) {
      await log(batchId, "outfits", "success", `[Look ${c.lookKey || "?"}] Score: ${c.matchScore ?? "?"}`);
    }

    // ── STEP 7: Generate outfit insights ──────────────────────────────────────
    await log(batchId, "outfits", "progress", `Generating styling insights (template engine${dna.enabled ? " + DNA briefs" : ""})...`);
    const insightedCandidates = outfitCandidates.map((c: any) => ({
      ...c,
      insight: generateTemplateInsight(c, vibe, season, dna.briefsByLook[c.lookKey]),
      dnaEnhanced: !!dna.briefsByLook[c.lookKey],
    }));

    // ── DONE ──────────────────────────────────────────────────────────────────
    await updateRun(batchId, {
      status: "completed",
      phase: "done",
      registered_count: totalRegistered,
      outfit_ids: outfitIds,
      outfit_candidates: insightedCandidates,
      completed_at: new Date().toISOString(),
    });
    await log(batchId, "system", "success", `Pipeline complete: ${totalRegistered} products, ${outfitIds.length} outfits`);

  } catch (err) {
    const msg = (err as Error).message;
    await updateRun(batchId, { status: "failed", error_message: msg });
    await log(batchId, "system", "error", `Pipeline failed: ${msg}`);
  }
}

function generateTemplateInsight(candidate: any, vibe: string, season: string, dnaBrief?: string): string {
  const items = (candidate.items || []) as any[];
  const colors = [...new Set(items.map((i: any) => i.color).filter(Boolean))].slice(0, 3);
  const slots = items.map((i: any) => i.slot);
  const hasOuter = slots.includes("outer") || slots.includes("mid");
  const score = candidate.matchScore || 0;

  if (dnaBrief) {
    const briefFirst = dnaBrief.split(".").slice(0, 2).join(".").trim();
    const colorStory = colors.length >= 2 ? `${colors.slice(0, 2).join(" & ")} palette.` : colors[0] ? `${colors[0]} tones.` : "";
    const qualityNote = score >= 75 ? " High-scoring combination." : score >= 55 ? " Well-balanced." : "";
    return `${briefFirst}. ${colorStory}${qualityNote}`.replace(/\.\./g, ".").trim();
  }

  const VIBE_VOICE: Record<string, string> = {
    ELEVATED_COOL: "Sharp and intentional",
    EFFORTLESS_NATURAL: "Easy and organic",
    ARTISTIC_MINIMAL: "Considered and refined",
    RETRO_LUXE: "Nostalgic and rich",
    SPORT_MODERN: "Technical and dynamic",
    CREATIVE_LAYERED: "Bold and expressive",
  };

  const SEASON_CONTEXT: Record<string, string> = {
    spring: "spring transitional dressing",
    summer: "warm-weather styling",
    fall: "layered fall looks",
    winter: "cold-weather elegance",
  };

  const voice = VIBE_VOICE[vibe] || "Curated";
  const context = SEASON_CONTEXT[season] || "everyday styling";
  const colorStory = colors.length >= 2 ? `${colors.slice(0, 2).join(" and ")} palette` : colors[0] ? `${colors[0]} tones` : "neutral palette";
  const layerNote = hasOuter ? " Layering adds depth." : "";
  const qualityNote = score >= 75 ? " A high-scoring combination." : score >= 55 ? " Well-balanced composition." : "";

  return `${voice} styling with a ${colorStory} for ${context}.${layerNote}${qualityNote}`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization") || `Bearer ${SUPABASE_ANON_KEY}`;

  try {
    const url = new URL(req.url);

    if (req.method === "GET") {
      const getAction = url.searchParams.get("action");

      if (getAction === "dna-status") {
        const gender = url.searchParams.get("gender") || "FEMALE";
        const bodyType = url.searchParams.get("bodyType") || "regular";
        const gVibe = url.searchParams.get("vibe") || "ELEVATED_COOL";
        const gSeason = url.searchParams.get("season") || "fall";
        const db = adminClient();

        const { data: cells } = await db
          .from("style_dna_cells")
          .select("id, look_key, status, reference_count, style_brief")
          .eq("gender", gender)
          .eq("body_type", bodyType)
          .eq("vibe", gVibe)
          .eq("season", gSeason)
          .order("look_key");

        const cellIds = (cells || []).map((c: any) => c.id);
        let ruleCountByLook: Record<string, number> = {};

        if (cellIds.length > 0) {
          const { data: rules } = await db
            .from("style_dna_learned_rules")
            .select("cell_id")
            .in("cell_id", cellIds);

          const cellIdToLook = new Map((cells || []).map((c: any) => [c.id, c.look_key]));
          for (const r of rules || []) {
            const lk = cellIdToLook.get(r.cell_id) || "";
            if (lk) ruleCountByLook[lk] = (ruleCountByLook[lk] || 0) + 1;
          }
        }

        const cellResults = (cells || []).map((c: any) => ({
          look_key: c.look_key,
          status: c.status,
          reference_count: c.reference_count,
          rules_count: ruleCountByLook[c.look_key] || 0,
          has_brief: !!c.style_brief,
        }));

        const readyCount = cellResults.filter((c: any) => c.status === "ready").length;
        const recommendation = readyCount === 3
          ? "All looks are DNA-enhanced."
          : readyCount > 0
          ? `${readyCount}/3 looks DNA-enhanced. Others use fallback rules.`
          : "No DNA data available. Pipeline will use default rules.";

        return new Response(JSON.stringify({ cells: cellResults, recommendation }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const batchId = url.searchParams.get("batchId");
      if (!batchId) {
        return new Response(JSON.stringify({ error: "batchId required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const db = adminClient();
      const after = url.searchParams.get("after");
      const [runResult, logsResult] = await Promise.all([
        db.from("mcp_pipeline_runs").select("*").eq("batch_id", batchId).maybeSingle(),
        after
          ? db.from("mcp_pipeline_logs").select("*").eq("batch_id", batchId).gt("created_at", after).order("created_at")
          : db.from("mcp_pipeline_logs").select("*").eq("batch_id", batchId).order("created_at"),
      ]);
      return new Response(JSON.stringify({ run: runResult.data, logs: logsResult.data || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let body: any = {};
    try { body = await req.json(); } catch { /* empty body */ }
    const act = body.action || url.searchParams.get("action");

    if (act === "start") {
      const { gender = "FEMALE", bodyType = "regular", vibe = "ELEVATED_COOL", season = "fall", productsPerSlot = 3, dnaMode = "auto" } = body;
      const batchId = `mcp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const db = adminClient();
      await db.from("mcp_pipeline_runs").insert({
        batch_id: batchId, status: "pending", gender, body_type: bodyType,
        vibe, season, products_per_slot: productsPerSlot,
      });

      EdgeRuntime.waitUntil(runPipeline(batchId, { gender, bodyType, vibe, season, productsPerSlot, dnaMode }, authHeader));

      return new Response(JSON.stringify({ batchId, status: "started", dnaMode }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (act === "submit-feedback") {
      const { batchId, acceptedIds = [], rejectedIds = [], vibe: fbVibe, season: fbSeason } = body;
      const db = adminClient();

      const results = await Promise.allSettled([
        acceptedIds.length > 0
          ? db.from("outfits").update({ status: "pending_render" }).in("id", acceptedIds)
          : Promise.resolve(),
        rejectedIds.length > 0
          ? db.from("outfits").delete().in("id", rejectedIds)
          : Promise.resolve(),
      ]);

      const { data: runData } = await db.from("mcp_pipeline_runs")
        .select("outfit_candidates, phase_data")
        .eq("batch_id", batchId)
        .maybeSingle();

      if (runData?.outfit_candidates) {
        const candidates = runData.outfit_candidates as any[];
        const phaseData = runData.phase_data as any;
        const byLook = phaseData?.byLook || {};

        const feedbackRows: any[] = [];
        for (const c of candidates) {
          const accepted = acceptedIds.includes(c.outfitId);
          feedbackRows.push({
            batch_id: batchId,
            outfit_id: c.outfitId,
            action: accepted ? "accepted" : "rejected",
            vibe: (fbVibe || "").toLowerCase().replace(/\s+/g, "_"),
            season: fbSeason || "",
            items: c.items || [],
            rule_scores: c.scoreBreakdown || {},
            ai_score: c.matchScore || 0,
          });

          const vibeKey = (fbVibe || "").toLowerCase().replace(/\s+/g, "_");
          for (const item of (c.items || []) as any[]) {
            if (!item.slot || !item.name) continue;
            const itemName = (item.sub_category || item.name || "").toLowerCase().slice(0, 80);
            const lookKey = c.lookKey || "A";

            if (accepted) {
              await db.rpc("increment_vibe_expansion_success", { p_vibe: vibeKey, p_look: lookKey, p_slot: item.slot, p_item: itemName }).catch(() => {});
            } else {
              await db.rpc("increment_vibe_expansion_fail", { p_vibe: vibeKey, p_look: lookKey, p_slot: item.slot, p_item: itemName }).catch(() => {});
            }
          }

          const lookKws: any[] = byLook[c.lookKey || "A"] ? Object.entries(byLook[c.lookKey]).flatMap(([slot, kws]) =>
            (kws as string[]).map(kw => ({ slot, kw }))
          ) : [];

          for (const { slot, kw } of lookKws) {
            if (accepted) {
              await db.rpc("increment_keyword_accepted", {
                p_keyword: kw,
                p_vibe: (fbVibe || "").toLowerCase().replace(/\s+/g, "_"),
                p_slot: slot,
                p_season: fbSeason || "",
              }).catch(() => {});
            }
            await db.rpc("increment_keyword_total", {
              p_keyword: kw,
              p_vibe: (fbVibe || "").toLowerCase().replace(/\s+/g, "_"),
              p_slot: slot,
              p_season: fbSeason || "",
            }).catch(() => {});
          }
        }

        if (feedbackRows.length > 0) {
          await db.from("pipeline_feedback").insert(feedbackRows).catch(() => {});
        }
      }

      return new Response(JSON.stringify({ success: true, accepted: acceptedIds.length, rejected: rejectedIds.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (act === "get-learning-insights") {
      const { vibe: lVibe, season: lSeason } = body;
      const db = adminClient();
      const vibeKey = (lVibe || "").toLowerCase().replace(/\s+/g, "_");

      const [topKeywords, topItems, recentFeedback] = await Promise.all([
        db.from("keyword_performance")
          .select("keyword, slot, score, accepted_count, total_count")
          .eq("vibe", vibeKey)
          .gte("score", 0.5)
          .order("score", { ascending: false })
          .limit(20),
        db.from("vibe_item_expansions")
          .select("slot, item_name, score, success_count, fail_count")
          .eq("vibe", vibeKey)
          .gte("score", 0.6)
          .order("score", { ascending: false })
          .limit(20),
        db.from("pipeline_feedback")
          .select("action, vibe, ai_score, created_at")
          .eq("vibe", vibeKey)
          .order("created_at", { ascending: false })
          .limit(50),
      ]);

      const feedback = recentFeedback.data || [];
      const accepted = feedback.filter((f: any) => f.action === "accepted").length;
      const total = feedback.length;

      return new Response(JSON.stringify({
        topKeywords: topKeywords.data || [],
        topItems: topItems.data || [],
        acceptanceRate: total > 0 ? Math.round((accepted / total) * 100) : null,
        totalFeedback: total,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
