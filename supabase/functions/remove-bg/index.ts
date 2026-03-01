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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const isServiceKeyCall = authHeader === `Bearer ${serviceKey}`;
    const isAnonKeyCall = authHeader === `Bearer ${anonKey}`;

    if (!isServiceKeyCall && !isAnonKeyCall) {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } }
      );
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        return new Response(
          JSON.stringify({ error: "Forbidden" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

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

    console.log(`Fetching image for Pixian: ${imageUrl}`);

    const imageResponse = await fetch(imageUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "image/webp,image/apng,image/*,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": "https://www.amazon.com/",
      },
    });

    if (!imageResponse.ok) {
      console.error(`Failed to fetch image (${imageResponse.status}): ${imageUrl}`);
      return new Response(
        JSON.stringify({ error: "Failed to fetch source image", status: imageResponse.status }),
        {
          status: 422,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const contentType = imageResponse.headers.get("content-type") || "image/jpeg";
    const imageBytes = new Uint8Array(await imageResponse.arrayBuffer());

    const ext = contentType.includes("png") ? "png"
      : contentType.includes("webp") ? "webp"
      : contentType.includes("gif") ? "gif"
      : "jpg";

    const formData = new FormData();
    const blob = new Blob([imageBytes], { type: contentType });
    formData.append("image", blob, `image.${ext}`);
    formData.append("output.format", "png");

    console.log(`Sending ${imageBytes.byteLength} bytes to Pixian for product ${productId || "unnamed"}`);

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

    console.log(`Pixian API success for product ${productId || "unnamed"}`);

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
