import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface WeatherData {
  temperature: number;
  conditions: string;
  location: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const url = new URL(req.url);
    const location = url.searchParams.get("location");

    if (!location) {
      return new Response(
        JSON.stringify({ error: "Location parameter is required" }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Step 1: Get coordinates from location name using Open-Meteo Geocoding API
    const geocodingUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=en&format=json`;
    const geocodingResponse = await fetch(geocodingUrl);
    const geocodingData = await geocodingResponse.json();

    if (!geocodingData.results || geocodingData.results.length === 0) {
      return new Response(
        JSON.stringify({ error: "Location not found" }),
        {
          status: 404,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const { latitude, longitude, name } = geocodingData.results[0];

    // Step 2: Get weather data using Open-Meteo Weather API
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&temperature_unit=fahrenheit&timezone=auto`;
    const weatherResponse = await fetch(weatherUrl);
    const weatherData = await weatherResponse.json();

    // Map weather codes to conditions
    const weatherCode = weatherData.current.weather_code;
    let conditions = "Clear";

    if (weatherCode === 0) conditions = "Clear";
    else if (weatherCode <= 3) conditions = "Partly Cloudy";
    else if (weatherCode <= 48) conditions = "Foggy";
    else if (weatherCode <= 67) conditions = "Rainy";
    else if (weatherCode <= 77) conditions = "Snowy";
    else if (weatherCode <= 82) conditions = "Rainy";
    else if (weatherCode <= 86) conditions = "Snowy";
    else conditions = "Stormy";

    const result: WeatherData = {
      temperature: Math.round(weatherData.current.temperature_2m),
      conditions,
      location: name,
    };

    return new Response(JSON.stringify(result), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Error fetching weather:", error);
    return new Response(
      JSON.stringify({ error: "Failed to fetch weather data" }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});