import { supabase } from './supabase';
import { Outfit } from '../data/outfits';
import { fetchOutfitsFromCSV } from './csvParser';

export const fetchOutfits = async (): Promise<Outfit[]> => {
  try {
    // Try to fetch from Supabase first
    const { data, error } = await supabase
      .from('outfits')
      .select('*')
      .order('pick_rank', { ascending: true });

    if (error) throw error;

    // If we have data in Supabase, use it
    if (data && data.length > 0) {
      console.log(`Loaded ${data.length} outfits from Supabase`);
      return data.map(row => ({
        id: row.id,
        where: row.occasion,
        style: row.style,
        pick_rank: row.pick_rank,
        image_url: row.image_url || '',
        image_url_flatlay: row.image_url_flatlay || undefined,
        image_url_on_model: row.image_url_on_model || undefined,
        insight_text: row.insight_text || '',
        top_name: row.top_name || '',
        top_image: row.top_image || '',
        top_link: row.top_link || '',
        bottom_name: row.bottom_name || '',
        bottom_image: row.bottom_image || '',
        bottom_link: row.bottom_link || '',
        shoes_name: row.shoes_name || '',
        shoes_image: row.shoes_image || '',
        shoes_link: row.shoes_link || '',
      }));
    }

    // If Supabase is empty, fetch from CSV and sync to Supabase
    console.log('Supabase is empty, fetching from CSV and syncing...');
    const csvData = await fetchOutfitsFromCSV();

    if (csvData.length > 0) {
      // Convert Outfit[] to database format
      const dbRecords = csvData.map(outfit => ({
        id: outfit.id,
        occasion: outfit.where,
        style: outfit.style,
        pick_rank: outfit.pick_rank,
        image_url: outfit.image_url || '',
        image_url_flatlay: outfit.image_url_flatlay || null,
        image_url_on_model: outfit.image_url_on_model || null,
        insight_text: outfit.insight_text || '',
        top_name: outfit.top_name || '',
        top_image: outfit.top_image || '',
        top_link: outfit.top_link || '',
        bottom_name: outfit.bottom_name || '',
        bottom_image: outfit.bottom_image || '',
        bottom_link: outfit.bottom_link || '',
        shoes_name: outfit.shoes_name || '',
        shoes_image: outfit.shoes_image || '',
        shoes_link: outfit.shoes_link || '',
      }));

      // Insert in batches of 10
      const batchSize = 10;
      for (let i = 0; i < dbRecords.length; i += batchSize) {
        const batch = dbRecords.slice(i, i + batchSize);
        const { error: insertError } = await supabase
          .from('outfits')
          .upsert(batch, { onConflict: 'id' });

        if (insertError) {
          console.error(`Error syncing batch ${i / batchSize + 1}:`, insertError);
        } else {
          console.log(`Synced batch ${i / batchSize + 1}/${Math.ceil(dbRecords.length / batchSize)}`);
        }
      }

      console.log(`Synced ${csvData.length} outfits to Supabase`);
    }

    return csvData;
  } catch (error) {
    console.error('Error fetching outfits:', error);
    // Fallback to CSV if Supabase fails
    console.log('Falling back to CSV...');
    return await fetchOutfitsFromCSV();
  }
};
