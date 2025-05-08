// import_legacy.js
import fs from 'fs';
import { parse } from 'csv-parse';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import axios from 'axios'; // Import axios

// Load environment variables from .env file in the CURRENT directory (project root)
dotenv.config({ path: './.env', debug: process.env.NODE_ENV !== 'production' }); // Only debug when not in production

// ---- SPECIFIC DEBUG LINE ----
console.log(`DEBUG: process.env.VITE_SUPABASE_SERVICE_ROLE is: ${process.env.VITE_SUPABASE_SERVICE_ROLE}`);
// -----------------------------

// ---- ADD THIS LINE FOR DEBUGGING ----
console.log('Loaded environment variables from dotenv:', {
  VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL,
  VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY
});
// ------------------------------------

const CSV_FILE_PATH = './legacy_templates.csv'; // Assumes CSV is in the root project directory
const CREATED_BY_UUID = '9dbaf044-1df1-438d-9498-bd3523c2570f';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
// Use Service Role Key for admin operations, check for VITE_SUPABASE_SERVICE_ROLE first
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE; // Corrected variable name
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

let supabaseKey = supabaseServiceKey || supabaseAnonKey;
let usingServiceKey = !!supabaseServiceKey;

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase URL or Key is missing. Ensure VITE_SUPABASE_URL and either VITE_SUPABASE_SERVICE_ROLE or VITE_SUPABASE_ANON_KEY are set in ./.env');
  if (!supabaseServiceKey) {
    console.warn('Consider adding VITE_SUPABASE_SERVICE_ROLE in .env for this script to bypass RLS for admin tasks.');
  }
  process.exit(1);
}

if (!usingServiceKey) {
    console.warn('WARNING: Running import script with ANON KEY. This might be restricted by RLS policies. For admin tasks like this, using VITE_SUPABASE_SERVICE_ROLE is recommended.');
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fetchHtmlContent(url) {
  if (!url || !url.startsWith('http')) {
    console.warn(`Invalid URL for fetching HTML: ${url}`);
    return null;
  }
  try {
    const response = await axios.get(url, { timeout: 10000 });
    return response.data;
  } catch (error) {
    console.error(`Failed to fetch HTML from ${url}:`, error.message);
    return null;
  }
}

async function importLegacyTemplates() {
  console.log(`Starting import from ${CSV_FILE_PATH}...`);
  if (usingServiceKey) {
    console.log('Using Service Role Key for Supabase operations.');
  } else {
    // Warning already printed above
  }

  let fileContent;
  try {
    fileContent = fs.readFileSync(CSV_FILE_PATH, { encoding: 'utf8' });
  } catch (readError) {
    console.error(`Failed to read CSV file at ${CSV_FILE_PATH}:`, readError.message);
    return;
  }

  parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }, async (err, records) => {
    if (err) {
      console.error('Failed to parse CSV file:', err);
      return;
    }

    if (!records || records.length === 0) {
      console.log('No records found in CSV file.');
      return;
    }
    console.log(`Found ${records.length} records in CSV. Processing...`);

    let processedCount = 0;
    let successCount = 0;
    let errorCount = 0;

    for (const record of records) {
      processedCount++;
      console.log(`\nProcessing record ${processedCount}/${records.length}: ${record.name || record.legacy_url}`);

      if (!record.name || record.name.trim() === '') {
        console.warn(`Skipping record due to empty name. Legacy URL: ${record.legacy_url || 'N/A'}`);
        continue;
      }
      if (!record.legacy_url || record.legacy_url.trim() === '') {
        console.warn(`Skipping record due to empty legacy_url. Name: ${record.name || 'N/A'}`);
        continue;
      }

      const htmlContent = await fetchHtmlContent(record.legacy_url);

      const templateData = {
        name: record.name,
        category: record.category,
        legacy_url: record.legacy_url,
        description: record.description,
        trigger_text: record.trigger,
        email_source: record.email_source, // Original metadata
        email_from: record.email_from,
        subject_default: record.subject,
        created_by: CREATED_BY_UUID,
        legacy_html_content: htmlContent, // Fetched HTML
      };

      try {
        const { error: upsertError } = await supabase
          .from('templates')
          .upsert(templateData, { onConflict: 'legacy_url' }); 

        if (upsertError) {
          console.error(`Failed to upsert record with legacy_url ${record.legacy_url}:`, upsertError.message);
          if (upsertError.details) console.error('Details:', upsertError.details);
          if (upsertError.hint) console.error('Hint:', upsertError.hint);
          errorCount++;
        } else {
          console.log(`Successfully upserted record for ${record.legacy_url}`);
          successCount++;
        }
      } catch (e) {
        console.error(`Unexpected error processing record with legacy_url ${record.legacy_url}:`, e);
        errorCount++;
      }
    }
    console.log('\nImport process finished.');
    console.log(`Total records processed: ${processedCount}`);
    console.log(`Successfully upserted: ${successCount}`);
    console.log(`Errors: ${errorCount}`);
  });
}

importLegacyTemplates(); 
