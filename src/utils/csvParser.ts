import Papa from 'papaparse';
import { Outfit } from '../data/outfits';

interface CSVRow {
  id: string;
  where: string;
  style: string;
  pick_rank?: string;
  image_url: string;
  image_url_flatlay?: string;
  image_url_on_model?: string;
  insight_text?: string;
  reasoning?: string;
  top_name: string;
  top_image?: string;
  top_thumb?: string;
  top_link: string;
  bottom_name: string;
  bottom_image?: string;
  bottom_thumb?: string;
  bottom_link: string;
  shoes_name: string;
  shoes_image?: string;
  shoes_thumb?: string;
  shoes_link: string;
}

const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRNSA08LEZM78qatyhAWjEFD_ikSFaEL_VQnSjZZ9qNZKsFZZdqQmHJ7cUu0kZv4nQyiqh1NPDT51QU/pub?gid=0&single=true&output=csv';

// Convert ibb.co page links to direct image links using Edge Function
const convertIbbUrl = async (url: string): Promise<string> => {
  if (!url || !url.trim()) return '';

  // If it's already a direct image URL, return it
  if (url.includes('i.ibb.co') || url.includes('i.postimg.cc') || url.includes('images.pexels.com') || url.includes('.jpg') || url.includes('.png') || url.includes('.jpeg')) {
    return url;
  }

  // If it's an ibb.co page URL, convert it
  if (url.includes('ibb.co/') && !url.includes('i.ibb.co')) {
    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-ibb-image`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
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

export const fetchOutfitsFromCSV = async (): Promise<Outfit[]> => {
  try {
    // Add timestamp to bypass cache
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

    return new Promise((resolve, reject) => {
      Papa.parse<CSVRow>(csvText, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.trim().toLowerCase(),
        complete: (results) => {
          try {
            console.log('CSV Headers:', results.meta.fields);
            console.log('First row raw data:', results.data[0]);

            const filteredData = results.data.filter((row) => row.id && row.where && row.style);

            // Convert all ibb.co URLs to direct image URLs
            const outfitPromises = filteredData.map(async (row) => {
              const pickRank = row.pick_rank ? parseInt(row.pick_rank, 10) : 1;

              console.log('Parsing row:', {
                id: row.id,
                image_url: row.image_url,
                image_url_flatlay: row.image_url_flatlay,
                image_url_on_model: row.image_url_on_model
              });

              // Convert image URLs
              const [image_url, image_url_flatlay, image_url_on_model] = await Promise.all([
                convertIbbUrl(row.image_url),
                convertIbbUrl(row.image_url_flatlay),
                convertIbbUrl(row.image_url_on_model),
              ]);

              return {
                id: row.id,
                where: row.where.trim(),
                style: row.style.trim(),
                pick_rank: isNaN(pickRank) ? 1 : pickRank,
                image_url,
                image_url_flatlay,
                image_url_on_model,
                insight_text: row.insight_text || row.reasoning || '',
                top_name: row.top_name,
                top_image: row.top_image || row.top_thumb || '',
                top_link: row.top_link,
                bottom_name: row.bottom_name,
                bottom_image: row.bottom_image || row.bottom_thumb || '',
                bottom_link: row.bottom_link,
                shoes_name: row.shoes_name,
                shoes_image: row.shoes_image || row.shoes_thumb || '',
                shoes_link: row.shoes_link,
              };
            });

            Promise.all(outfitPromises).then(resolve).catch(reject);
          } catch (error) {
            reject(error);
          }
        },
        error: (error) => {
          reject(error);
        },
      });
    });
  } catch (error) {
    console.error('Error fetching CSV:', error);
    throw error;
  }
};
