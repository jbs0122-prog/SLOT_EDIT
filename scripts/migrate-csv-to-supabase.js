// Script to migrate data from Google Sheets CSV to Supabase
import { createClient } from '@supabase/supabase-js';
import Papa from 'papaparse';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read environment variables from .env file
const envPath = path.resolve(__dirname, '../.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=:#]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    const value = match[2].trim().replace(/^["']|["']$/g, '');
    envVars[key] = value;
  }
});

const supabaseUrl = envVars.VITE_SUPABASE_URL;
const supabaseKey = envVars.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRNSA08LEZM78qatyhAWjEFD_ikSFaEL_VQnSjZZ9qNZKsFZZdqQmHJ7cUu0kZv4nQyiqh1NPDT51QU/pub?gid=0&single=true&output=csv';

// Convert ibb.co page links to direct image links
const convertIbbUrl = async (url) => {
  if (!url || !url.trim()) return '';

  // If it's already a direct image URL, return it
  if (url.includes('i.ibb.co') || url.includes('i.postimg.cc') || url.includes('images.pexels.com') || url.includes('.jpg') || url.includes('.png') || url.includes('.jpeg')) {
    return url;
  }

  // If it's an ibb.co page URL, convert it
  if (url.includes('ibb.co/') && !url.includes('i.ibb.co')) {
    try {
      const apiUrl = `${supabaseUrl}/functions/v1/fetch-ibb-image`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({ url }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.imageUrl) {
          console.log('Converted URL:', url, '->', data.imageUrl);
          return data.imageUrl;
        }
      }

      console.error('Failed to convert URL:', url);
    } catch (error) {
      console.error('Error converting URL:', url, error);
    }
  }

  return url;
};

async function migrateData() {
  try {
    console.log('Fetching CSV from Google Sheets...');
    const cacheBuster = `${CSV_URL}&t=${Date.now()}`;
    const response = await fetch(cacheBuster, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch CSV: ${response.status}`);
    }

    const csvText = await response.text();
    console.log('CSV fetched successfully, parsing...');

    Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim().toLowerCase(),
      complete: async (results) => {
        try {
          console.log(`Found ${results.data.length} rows in CSV`);
          const filteredData = results.data.filter((row) => row.id && row.where && row.style);
          console.log(`Filtered to ${filteredData.length} valid rows`);

          // Convert all ibb.co URLs to direct image URLs and prepare data
          console.log('Converting image URLs...');
          const outfits = [];

          for (let i = 0; i < filteredData.length; i++) {
            const row = filteredData[i];
            console.log(`Processing row ${i + 1}/${filteredData.length}: ${row.id}`);

            const pickRank = row.pick_rank ? parseInt(row.pick_rank, 10) : 1;

            // Convert image URLs
            const [image_url, image_url_flatlay, image_url_on_model] = await Promise.all([
              convertIbbUrl(row.image_url),
              convertIbbUrl(row.image_url_flatlay),
              convertIbbUrl(row.image_url_on_model),
            ]);

            outfits.push({
              id: row.id,
              occasion: row.where.trim(),
              style: row.style.trim(),
              pick_rank: isNaN(pickRank) ? 1 : pickRank,
              image_url: image_url || '',
              image_url_flatlay: image_url_flatlay || null,
              image_url_on_model: image_url_on_model || null,
              insight_text: row.insight_text || row.reasoning || '',
              top_name: row.top_name || '',
              top_image: row.top_image || row.top_thumb || '',
              top_link: row.top_link || '',
              bottom_name: row.bottom_name || '',
              bottom_image: row.bottom_image || row.bottom_thumb || '',
              bottom_link: row.bottom_link || '',
              shoes_name: row.shoes_name || '',
              shoes_image: row.shoes_image || row.shoes_thumb || '',
              shoes_link: row.shoes_link || '',
            });
          }

          console.log(`\nInserting ${outfits.length} outfits into Supabase...`);

          // Insert in batches of 10 to avoid rate limits
          const batchSize = 10;
          for (let i = 0; i < outfits.length; i += batchSize) {
            const batch = outfits.slice(i, i + batchSize);
            const { data, error } = await supabase
              .from('outfits')
              .upsert(batch, { onConflict: 'id' });

            if (error) {
              console.error(`Error inserting batch ${i / batchSize + 1}:`, error);
            } else {
              console.log(`Inserted batch ${i / batchSize + 1}/${Math.ceil(outfits.length / batchSize)}`);
            }
          }

          console.log('\n✅ Migration completed successfully!');
          console.log(`Total outfits migrated: ${outfits.length}`);

          // Verify data
          const { count } = await supabase
            .from('outfits')
            .select('*', { count: 'exact', head: true });

          console.log(`Total outfits in database: ${count}`);

        } catch (error) {
          console.error('Error during migration:', error);
          process.exit(1);
        }
      },
      error: (error) => {
        console.error('Error parsing CSV:', error);
        process.exit(1);
      },
    });
  } catch (error) {
    console.error('Error fetching CSV:', error);
    process.exit(1);
  }
}

migrateData();
