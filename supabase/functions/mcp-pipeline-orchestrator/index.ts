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
  await db.from("mcp_pipeline_logs").insert({ batch_id: batchId, step, status, message });
}

async function updateRun(batchId: string, fields: Record<string, unknown>) {
  const db = adminClient();
  await db.from("mcp_pipeline_runs").update({ ...fields, updated_at: new Date().toISOString() }).eq("batch_id", batchId);
}

async function callFunction(fnName: string, body: unknown, authHeader: string): Promise<any> {
  const r = await fetch(`${SUPABASE_URL}/functions/v1/${fnName}`, {
    method: "POST",
    headers: { Authorization: authHeader, apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const txt = await r.text().catch(() => `HTTP ${r.status}`);
    throw new Error(`${fnName} failed (${r.status}): ${txt.slice(0, 200)}`);
  }
  return r.json();
}

async function runPipeline(batchId: string, config: {
  gender: string; bodyType: string; vibe: string; season: string; productsPerSlot: number;
}, authHeader: string) {
  const db = adminClient();
  const { gender, bodyType, vibe, season, productsPerSlot } = config;

  try {
    await updateRun(batchId, { status: "running", phase: "keywords" });
    await log(batchId, "system", "start", `MCP Pipeline started — ${vibe} / ${season} / ${gender}`);

    // ── STEP 1: Keywords (reads keyword_performance for top performers) ──────
    await log(batchId, "keywords", "start", "Generating keywords via rule engine + learning data...");
    const kwData = await callFunction("auto-generate-keywords", { gender, body_type: bodyType, vibe, season }, authHeader);
    const byLook: Record<string, Record<string, string[]>> = kwData.byLook || {};
    const lookNames: Record<string, string> = kwData.lookNames || {};
    const lookKeys = Object.keys(byLook);
    const totalKw = Object.values(kwData.categories || {}).reduce((a: number, b: unknown) => a + (b as string[]).length, 0);
    await log(batchId, "keywords", "success", `${totalKw} keywords across ${lookKeys.length} looks: ${lookKeys.map(k => lookNames[k] || k).join(", ")}`);
    await updateRun(batchId, { phase: "search", phase_data: { byLook, lookNames, lookKeys } });

    // ── STEP 2: Fetch existing ASINs for dedup ───────────────────────────────
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

    // ── STEP 3: Search (per look, with cache + fallback) ─────────────────────
    await log(batchId, "search", "start", `Searching Amazon for ${lookKeys.length} looks...`);
    for (const lookKey of lookKeys) {
      const lookCategories = byLook[lookKey] || {};
      const lookSeenAsins = new Set<string>();
      const slotCandidates: Record<string, unknown[]> = {};

      for (const slot of PRIORITY_SLOTS) {
        const isCore = CORE_SLOTS.includes(slot);
        const isMandatory = ["top", "bottom", "shoes"].includes(slot);
        const slotLimit = isMandatory ? Math.max(2, productsPerSlot) : isCore ? productsPerSlot : Math.max(1, productsPerSlot - 1);
        const allKws = (lookCategories[slot] || []) as string[];
        if (allKws.length === 0) continue;
        const candidates: unknown[] = [];

        for (const kw of allKws) {
          if (candidates.length >= slotLimit) break;
          let results: unknown[];
          if (globalSearchCache.has(kw)) {
            results = globalSearchCache.get(kw)!;
          } else {
            try {
              const d = await callFunction("auto-amazon-search", { query: kw, page: 1 }, authHeader);
              results = d.results || [];
              globalSearchCache.set(kw, results);
              await log(batchId, "search", "progress", `[${lookKey}/${slot}] "${kw}" → ${d.total_filtered ?? 0}/${d.total_raw ?? 0} passed`);
            } catch {
              results = [];
            }
          }
          for (const item of results as any[]) {
            if (item.asin && !lookSeenAsins.has(item.asin) && !existingAsinSet.has(item.asin) && candidates.length < slotLimit) {
              lookSeenAsins.add(item.asin);
              candidates.push(item);
            }
          }
        }

        // Fallback for empty core slots
        if (isCore && candidates.length === 0 && allKws.length > 0) {
          await log(batchId, "search", "progress", `[${lookKey}/${slot}] Retrying with rating>=3.5...`);
          try {
            const d = await callFunction("auto-amazon-search", { query: allKws[0], page: 1, filter: { minRating: 3.5 } }, authHeader);
            for (const item of (d.results || []) as any[]) {
              if (item.asin && !lookSeenAsins.has(item.asin) && candidates.length < slotLimit) {
                lookSeenAsins.add(item.asin);
                candidates.push(item);
              }
            }
          } catch { /* silent */ }
        }

        if (candidates.length > 0) slotCandidates[slot] = candidates;
      }
      lookSlotCandidatesMap[lookKey] = slotCandidates;
      await log(batchId, "search", "progress", `[Look ${lookKey}] ${Object.values(slotCandidates).reduce((a, b) => a + b.length, 0)} candidates found`);
    }

    // Borrow across looks for missing core slots
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

    // ── STEP 4: Register products ────────────────────────────────────────────
    let totalRegistered = 0;
    for (const lookKey of lookKeys) {
      const slotCandidates = lookSlotCandidatesMap[lookKey];
      const hasCoreSlots = ["top", "bottom"].every(s => slotCandidates[s]?.length);
      if (!hasCoreSlots) {
        await log(batchId, "register", "error", `[Look ${lookKey}] Missing core slots, skipping`);
        continue;
      }

      const lookBatchId = `${batchId}-${lookKey}`;
      await log(batchId, "register", "start", `[Look ${lookKey}] Analyzing & registering products...`);
      let lookReg = 0;

      for (const slot of PRIORITY_SLOTS) {
        const products = (slotCandidates[slot] || []) as any[];
        for (const product of products) {
          try {
            const d = await callFunction("auto-pipeline", {
              action: "register-product", product, gender, body_type: bodyType, vibe, season,
              batchId: lookBatchId, slotHint: slot,
            }, authHeader);
            if (d.success) {
              if (product.asin) existingAsinSet.add(product.asin);
              lookReg++;
              totalRegistered++;
            }
          } catch { /* silent — retry once */ }
        }
      }
      await log(batchId, "register", "success", `[Look ${lookKey}] Registered ${lookReg} products`);
      await updateRun(batchId, { registered_count: totalRegistered });

      // ── STEP 5: Background removal ──────────────────────────────────────────
      await log(batchId, "nobg", "start", `[Look ${lookKey}] Extracting flatlays...`);
      const { data: productsForBg } = await db.from("products")
        .select("id, image_url, category, sub_category")
        .eq("batch_id", lookBatchId)
        .is("nobg_image_url", null);

      if (productsForBg && productsForBg.length > 0) {
        const PARALLEL = 2;
        let extracted = 0;
        for (let i = 0; i < productsForBg.length; i += PARALLEL) {
          const batch = productsForBg.slice(i, i + PARALLEL);
          const results = await Promise.allSettled(batch.map(p =>
            callFunction("auto-pipeline", {
              action: "extract-nobg", productId: p.id, imageUrl: p.image_url,
              category: p.category || "top", subCategory: p.sub_category || "",
            }, authHeader)
          ));
          extracted += results.filter(r => r.status === "fulfilled").length;
          await new Promise(r => setTimeout(r, 300));
        }
        await log(batchId, "nobg", "success", `[Look ${lookKey}] ${extracted}/${productsForBg.length} flatlays extracted`);
      } else {
        await log(batchId, "nobg", "success", `[Look ${lookKey}] All products have flatlays`);
      }
    }

    if (totalRegistered === 0) throw new Error("No products were registered");

    // ── STEP 6: Generate outfits ─────────────────────────────────────────────
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

    // ── STEP 7: Generate outfit insights (template-based, zero GPT cost) ─────
    await log(batchId, "outfits", "progress", "Generating styling insights (template engine)...");
    const insightedCandidates = outfitCandidates.map((c: any) => ({
      ...c,
      insight: generateTemplateInsight(c, vibe, season),
    }));

    // ── DONE ─────────────────────────────────────────────────────────────────
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

function generateTemplateInsight(candidate: any, vibe: string, season: string): string {
  const items = (candidate.items || []) as any[];
  const colors = [...new Set(items.map((i: any) => i.color).filter(Boolean))].slice(0, 3);
  const slots = items.map((i: any) => i.slot);
  const hasOuter = slots.includes("outer") || slots.includes("mid");
  const score = candidate.matchScore || 0;

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
    const action = url.searchParams.get("action") || (await req.clone().json().catch(() => ({}))).action;

    // ── GET: Poll run status + logs ──────────────────────────────────────────
    if (req.method === "GET") {
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

    const body = await req.json();
    const act = body.action || action;

    // ── POST action: start ───────────────────────────────────────────────────
    if (act === "start") {
      const { gender = "FEMALE", bodyType = "regular", vibe = "ELEVATED_COOL", season = "fall", productsPerSlot = 3 } = body;
      const batchId = `mcp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const db = adminClient();
      await db.from("mcp_pipeline_runs").insert({
        batch_id: batchId, status: "pending", gender, body_type: bodyType,
        vibe, season, products_per_slot: productsPerSlot,
      });

      EdgeRuntime.waitUntil(runPipeline(batchId, { gender, bodyType, vibe, season, productsPerSlot }, authHeader));

      return new Response(JSON.stringify({ batchId, status: "started" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── POST action: submit-feedback (acceptance + learning update) ──────────
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

      // Read run to get keywords + items for learning
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

          // Update vibe_item_expansions for each item
          const vibeKey = (fbVibe || "").toLowerCase().replace(/\s+/g, "_");
          for (const item of (c.items || []) as any[]) {
            if (!item.slot || !item.name) continue;
            const itemName = (item.sub_category || item.name || "").toLowerCase().slice(0, 80);
            const lookKey = c.lookKey || "A";

            await db.from("vibe_item_expansions").upsert({
              vibe: vibeKey, look: lookKey, slot: item.slot, item_name: itemName, source: "feedback",
              success_count: accepted ? 1 : 0,
              fail_count: accepted ? 0 : 1,
              score: accepted ? 1.0 : 0.0,
            }, {
              onConflict: "vibe,look,slot,item_name",
              ignoreDuplicates: false,
            }).then(async () => {
              if (accepted) {
                await db.rpc("increment_vibe_expansion_success", { p_vibe: vibeKey, p_look: lookKey, p_slot: item.slot, p_item: itemName }).catch(() => {});
              } else {
                await db.rpc("increment_vibe_expansion_fail", { p_vibe: vibeKey, p_look: lookKey, p_slot: item.slot, p_item: itemName }).catch(() => {});
              }
            });
          }

          // Update keyword_performance
          const lookKws: any[] = byLook[c.lookKey || "A"] ? Object.entries(byLook[c.lookKey]).flatMap(([slot, kws]) =>
            (kws as string[]).map(kw => ({ slot, kw }))
          ) : [];

          for (const { slot, kw } of lookKws) {
            await db.from("keyword_performance").upsert({
              keyword: kw, vibe: (fbVibe || "").toLowerCase().replace(/\s+/g, "_"),
              slot, season: fbSeason || "",
              accepted_count: accepted ? 1 : 0,
              total_count: 1,
              score: accepted ? 1.0 : 0.0,
            }, { onConflict: "keyword,vibe,slot", ignoreDuplicates: false }).catch(() => {});
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

    // ── POST action: get-learning-insights ───────────────────────────────────
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
