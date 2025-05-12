// populate_variables.js
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

// Regex to find placeholders like {Var} or {{Var}}
const PLACEHOLDER_REGEX = /\{\{?([\w\s.-]+?)\}?\}/g;

async function findAndStoreVariables() {
  console.log('Fetching templates...');
  let { data: templates, error: fetchError } = await supabase
    .from('templates')
    .select('id, legacy_html_content');

  if (fetchError) {
    console.error('Error fetching templates:', fetchError);
    return;
  }

  if (!templates || templates.length === 0) {
    console.log('No templates found to process.');
    return;
  }

  console.log(`Found ${templates.length} templates. Processing...`);
  let totalVariablesFound = 0;
  let totalVariablesUpserted = 0;
  let totalErrors = 0;

  for (const template of templates) {
    console.log(`\nProcessing template ID: ${template.id}`);
    if (!template.legacy_html_content) {
      console.log('  Skipping - No legacy_html_content.');
      continue;
    }

    const matches = template.legacy_html_content.matchAll(PLACEHOLDER_REGEX);
    const uniquePlaceholders = new Set();
    for (const match of matches) {
      if (match[0]) { // Use the full match, e.g., {Password}
        uniquePlaceholders.add(match[0]);
      }
    }

    if (uniquePlaceholders.size === 0) {
      console.log('  No placeholders found in this template.');
      continue;
    }

    console.log(`  Found placeholders: ${Array.from(uniquePlaceholders).join(', ')}`);
    totalVariablesFound += uniquePlaceholders.size;

    const variablesToUpsert = Array.from(uniquePlaceholders).map(ph => ({
      template_id: template.id,
      variable_name: ph,
      // Add default description/sample_value later if needed
    }));

    try {
      const { error: upsertError, count } = await supabase
        .from('template_variables')
        .upsert(variablesToUpsert, { 
          onConflict: 'template_id, variable_name', // Based on unique constraint
          ignoreDuplicates: false // Ensure existing rows are potentially updated if we add more fields later
        });

      if (upsertError) {
        console.error(`  Error upserting variables for template ${template.id}:`, upsertError.message);
        totalErrors++;
      } else {
        console.log(`  Successfully upserted ${variablesToUpsert.length} variable definitions.`);
        totalVariablesUpserted += variablesToUpsert.length; // Could use 'count' if upsert returns it reliably
      }
    } catch (e) {
      console.error(`  Unexpected error during upsert for template ${template.id}:`, e);
      totalErrors++;
    }
  }

  console.log('\nVariable population finished.');
  console.log(`Total variables found across all templates: ${totalVariablesFound}`);
  console.log(`Total variable definitions upserted: ${totalVariablesUpserted}`);
  console.log(`Total errors encountered: ${totalErrors}`);
}

findAndStoreVariables(); 