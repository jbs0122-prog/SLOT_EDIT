import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

function isAllowedUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;
    const h = parsed.hostname;
    if (
      h === "localhost" ||
      h === "127.0.0.1" ||
      h.startsWith("10.") ||
      h.startsWith("192.168.") ||
      h.startsWith("172.") ||
      h === "169.254.169.254" ||
      h === "[::1]" ||
      h.endsWith(".internal")
    )
      return false;
    return true;
  } catch {
    return false;
  }
}

async function verifyAdmin(req: Request) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return null;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) return null;

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const { data } = await adminClient
      .from("admin_users")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    return data ? user : null;
  } catch {
    return null;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { imageUrl, productId } = await req.json();

    if (!imageUrl) {
      return new Response(
        JSON.stringify({ error: "imageUrl is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!isAllowedUrl(imageUrl)) {
      return new Response(
        JSON.stringify({ error: "Invalid image URL" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const pixianAuth = Deno.env.get("PIXIAN_API_KEY") ||
      "cHhyaWd5aXh2cjR4OTNnOnRlbXBmaXNma244Y2t1ZjBlZDg0OWg2YnF2MjZwcDcwc29icjVqYWhydXV1ajlhMjk4Y2Q=";

    console.log(`Using Pixian API for: ${imageUrl}`);

    const formData = new FormData();
    formData.append("image.url", imageUrl);
    formData.append("output.format", "png");

    const pixianResponse = await fetch(
      "https://api.pixian.ai/api/v2/remove-background",
      {
        method: "POST",
        headers: { Authorization: `Basic ${pixianAuth}` },
        body: formData,
      }
    );

    if (!pixianResponse.ok) {
      const errorText = await pixianResponse.text();
      console.error(`Pixian API error (${pixianResponse.status}):`, errorText);
      return new Response(
        JSON.stringify({
          error: "Background removal failed",
          details: errorText,
          status: pixianResponse.status
        }),
        {
          status: pixianResponse.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`Pixian API success for product ${productId || 'unnamed'}`);

    const imageBuffer = new Uint8Array(await pixianResponse.arrayBuffer());

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const fileName = productId
      ? `nobg/${productId}.png`
      : `nobg/${Date.now()}-${Math.random().toString(36).substring(7)}.png`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("product-images")
      .upload(fileName, imageBuffer, {
        contentType: "image/png",
        upsert: true,
      });

    if (uploadError) {
      let binary = "";
      for (let i = 0; i < imageBuffer.byteLength; i++) {
        binary += String.fromCharCode(imageBuffer[i]);
      }
      const base64Image = btoa(binary);
      return new Response(
        JSON.stringify({
          success: true,
          image: `data:image/png;base64,${base64Image}`,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: publicUrlData } = supabase.storage
      .from("product-images")
      .getPublicUrl(uploadData.path);

    if (productId) {
      await supabase
        .from("products")
        .update({ nobg_image_url: publicUrlData.publicUrl })
        .eq("id", productId);
    }

    return new Response(
      JSON.stringify({
        success: true,
        url: publicUrlData.publicUrl,
        image: publicUrlData.publicUrl,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("remove-bg error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
