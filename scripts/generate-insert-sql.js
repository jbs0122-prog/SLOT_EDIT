// Script to generate SQL INSERT statements from Google Sheets CSV
import Papa from 'papaparse';
import * as fs from 'fs';

const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRNSA08LEZM78qatyhAWjEFD_ikSFaEL_VQnSjZZ9qNZKsFZZdqQmHJ7cUu0kZv4nQyiqh1NPDT51QU/pub?gid=0&single=true&output=csv';

function escapeString(str) {
  if (!str) return '';
  return str.replace(/'/g, "''").replace(/\\/g, '\\\\');
}

async function generateSQL() {
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

          const insertStatements = [];

          filteredData.forEach((row) => {
            const pickRank = row.pick_rank ? parseInt(row.pick_rank, 10) : 1;

            const values = [
              `'${escapeString(row.id)}'`,
              `'${escapeString(row.where.trim())}'`,
              `'${escapeString(row.style.trim())}'`,
              isNaN(pickRank) ? 1 : pickRank,
              `'${escapeString(row.image_url || '')}'`,
              row.image_url_flatlay ? `'${escapeString(row.image_url_flatlay)}'` : 'NULL',
              row.image_url_on_model ? `'${escapeString(row.image_url_on_model)}'` : 'NULL',
              `'${escapeString(row.insight_text || row.reasoning || '')}'`,
              `'${escapeString(row.top_name || '')}'`,
              `'${escapeString(row.top_image || row.top_thumb || '')}'`,
              `'${escapeString(row.top_link || '')}'`,
              `'${escapeString(row.bottom_name || '')}'`,
              `'${escapeString(row.bottom_image || row.bottom_thumb || '')}'`,
              `'${escapeString(row.bottom_link || '')}'`,
              `'${escapeString(row.shoes_name || '')}'`,
              `'${escapeString(row.shoes_image || row.shoes_thumb || '')}'`,
              `'${escapeString(row.shoes_link || '')}'`,
            ];

            insertStatements.push(`(${values.join(', ')})`);
          });

          const sql = `INSERT INTO outfits (id, occasion, style, pick_rank, image_url, image_url_flatlay, image_url_on_model, insight_text, top_name, top_image, top_link, bottom_name, bottom_image, bottom_link, shoes_name, shoes_image, shoes_link)
VALUES
${insertStatements.join(',\n')}
ON CONFLICT (id) DO UPDATE SET
  occasion = EXCLUDED.occasion,
  style = EXCLUDED.style,
  pick_rank = EXCLUDED.pick_rank,
  image_url = EXCLUDED.image_url,
  image_url_flatlay = EXCLUDED.image_url_flatlay,
  image_url_on_model = EXCLUDED.image_url_on_model,
  insight_text = EXCLUDED.insight_text,
  top_name = EXCLUDED.top_name,
  top_image = EXCLUDED.top_image,
  top_link = EXCLUDED.top_link,
  bottom_name = EXCLUDED.bottom_name,
  bottom_image = EXCLUDED.bottom_image,
  bottom_link = EXCLUDED.bottom_link,
  shoes_name = EXCLUDED.shoes_name,
  shoes_image = EXCLUDED.shoes_image,
  shoes_link = EXCLUDED.shoes_link,
  updated_at = now();`;

          fs.writeFileSync('/tmp/cc-agent/62556671/project/scripts/insert-data.sql', sql);
          console.log('\n✅ SQL file generated successfully!');
          console.log('File saved to: scripts/insert-data.sql');
          console.log(`Total records: ${filteredData.length}`);

        } catch (error) {
          console.error('Error during SQL generation:', error);
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

generateSQL();
