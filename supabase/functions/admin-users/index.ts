import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const {
      data: { user: caller },
    } = await anonClient.auth.getUser();
    if (!caller || !caller.email?.endsWith("@admin.com")) {
      return jsonResponse({ error: "Forbidden" }, 403);
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "list";

    if (action === "list") {
      const page = parseInt(url.searchParams.get("page") || "1");
      const perPage = parseInt(url.searchParams.get("per_page") || "1000");
      const search = url.searchParams.get("search") || "";

      const {
        data: { users },
        error,
      } = await adminClient.auth.admin.listUsers({
        page,
        perPage,
      });

      if (error) {
        return jsonResponse({ error: error.message }, 500);
      }

      let filtered = users.filter(
        (u) => !u.email?.endsWith("@admin.com")
      );

      if (search) {
        const q = search.toLowerCase();
        filtered = filtered.filter(
          (u) =>
            u.email?.toLowerCase().includes(q) ||
            u.user_metadata?.full_name?.toLowerCase().includes(q) ||
            u.user_metadata?.name?.toLowerCase().includes(q)
        );
      }

      const savedCounts: Record<string, number> = {};
      const feedbackCounts: Record<string, number> = {};

      const userIds = filtered.map((u) => u.id);

      if (userIds.length > 0) {
        const { data: savedData } = await adminClient
          .from("saved_outfits")
          .select("user_id")
          .in("user_id", userIds);

        if (savedData) {
          for (const row of savedData) {
            savedCounts[row.user_id] =
              (savedCounts[row.user_id] || 0) + 1;
          }
        }
      }

      const enriched = filtered.map((u) => ({
        id: u.id,
        email: u.email,
        full_name:
          u.user_metadata?.full_name || u.user_metadata?.name || null,
        avatar_url: u.user_metadata?.avatar_url || null,
        provider: u.app_metadata?.provider || "email",
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
        saved_count: savedCounts[u.id] || 0,
        feedback_count: feedbackCounts[u.id] || 0,
      }));

      return jsonResponse({
        users: enriched,
        total: enriched.length,
      });
    }

    if (action === "stats") {
      const {
        data: { users: allUsers },
      } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 });

      const regularUsers = (allUsers || []).filter(
        (u) => !u.email?.endsWith("@admin.com")
      );

      const now = new Date();
      const todayStart = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
      );
      const weekStart = new Date(todayStart);
      weekStart.setDate(weekStart.getDate() - 7);
      const monthStart = new Date(todayStart);
      monthStart.setDate(monthStart.getDate() - 30);

      const newToday = regularUsers.filter(
        (u) => new Date(u.created_at) >= todayStart
      ).length;
      const newThisWeek = regularUsers.filter(
        (u) => new Date(u.created_at) >= weekStart
      ).length;
      const newThisMonth = regularUsers.filter(
        (u) => new Date(u.created_at) >= monthStart
      ).length;

      const providerBreakdown: Record<string, number> = {};
      for (const u of regularUsers) {
        const p = u.app_metadata?.provider || "email";
        providerBreakdown[p] = (providerBreakdown[p] || 0) + 1;
      }

      const dailySignups: Record<string, number> = {};
      for (const u of regularUsers) {
        const day = new Date(u.created_at).toISOString().split("T")[0];
        dailySignups[day] = (dailySignups[day] || 0) + 1;
      }

      return jsonResponse({
        total: regularUsers.length,
        new_today: newToday,
        new_this_week: newThisWeek,
        new_this_month: newThisMonth,
        provider_breakdown: providerBreakdown,
        daily_signups: dailySignups,
      });
    }

    if (action === "detail") {
      const userId = url.searchParams.get("user_id");
      if (!userId) {
        return jsonResponse({ error: "user_id required" }, 400);
      }

      const {
        data: { user },
        error,
      } = await adminClient.auth.admin.getUserById(userId);

      if (error || !user) {
        return jsonResponse({ error: "User not found" }, 404);
      }

      const { data: savedOutfits } = await adminClient
        .from("saved_outfits")
        .select("id, outfit_id, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      return jsonResponse({
        id: user.id,
        email: user.email,
        full_name:
          user.user_metadata?.full_name || user.user_metadata?.name || null,
        avatar_url: user.user_metadata?.avatar_url || null,
        provider: user.app_metadata?.provider || "email",
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at,
        saved_outfits: savedOutfits || [],
      });
    }

    return jsonResponse({ error: "Unknown action" }, 400);
  } catch (err) {
    return jsonResponse(
      { error: err instanceof Error ? err.message : "Internal error" },
      500
    );
  }
});
