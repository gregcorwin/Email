// migrate_content.js
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load .env file from root
dotenv.config({ path: './.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
// Ensure you have VITE_SUPABASE_SERVICE_ROLE in your .env for this!
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE;

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase URL or Service Key is missing. Ensure VITE_SUPABASE_URL and VITE_SUPABASE_SERVICE_ROLE are set in ./.env');
  process.exit(1);
}

// Initialize Supabase client with Service Role Key
const supabase = createClient(supabaseUrl, supabaseKey);

async function migrateContent() {
  console.log('Fetching templates to migrate content...');
  let { data: templates, error: fetchError } = await supabase
    .from('templates')
    .select('id, legacy_html_content, body_content'); // Select body_content to check if already migrated

  if (fetchError) {
    console.error('Error fetching templates:', fetchError);
    return;
  }

  if (!templates || templates.length === 0) {
    console.log('No templates found to migrate.');
    return;
  }

  console.log(`Found ${templates.length} templates. Migrating content...`);
  let updatedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const template of templates) {
    // Simple check: only migrate if body_content is currently null 
    // (prevents overwriting if script is run multiple times)
    if (template.body_content !== null && template.body_content !== undefined) { 
        console.log(`Skipping template ${template.id} - body_content already exists.`);
        skippedCount++;
        continue;
    }

    const updateData = {
        body_content: template.legacy_html_content || '', // Use legacy content for body
        header_content: '', // Initialize header as empty
        footer_content: ''  // Initialize footer as empty
    };

    try {
        const { error: updateError } = await supabase
            .from('templates')
            .update(updateData)
            .eq('id', template.id);
        
        if (updateError) {
            console.error(`Error updating template ${template.id}:`, updateError.message);
            errorCount++;
        } else {
            console.log(`Successfully migrated content for template ${template.id}`);
            updatedCount++;
        }
    } catch (e) {
        console.error(`Unexpected error updating template ${template.id}:`, e);
        errorCount++;
    }
  }

  console.log('\nContent migration finished.');
  console.log(`Successfully updated: ${updatedCount}`);
  console.log(`Skipped (already migrated): ${skippedCount}`);
  console.log(`Errors: ${errorCount}`);
}

migrateContent(); 