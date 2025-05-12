<template>
  <div class="template-list-page">
    <h1 class="text-3xl font-bold mb-6 text-gray-700">Email Templates</h1>
    
    <!-- Transformation Section -->
    <div class="transformation-controls bg-indigo-50 p-4 rounded-lg shadow-md mb-8 space-y-3">
        <h2 class="text-xl font-semibold text-indigo-700">Apply Transformation</h2>
        <div>
            <label for="transformationSetSelect" class="block text-sm font-medium text-gray-700">Select Transformation Set:</label>
            <select 
                id="transformationSetSelect" 
                v-model="selectedSetId" 
                class="mt-1 block w-full md:w-1/2 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                :disabled="loadingSets || transformationSets.length === 0"
            >
                <option :value="null" disabled>-- {{ loadingSets ? 'Loading sets...' : (transformationSets.length === 0 ? 'No sets available' : 'Select a set') }} --</option>
                <option v-for="set in transformationSets" :key="set.id" :value="set.id">
                    {{ set.name }}
                </option>
            </select>
        </div>
        <button 
            @click="handleApplyTransformation"
            :disabled="!canApply"
            class="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
            Apply to Selected ({{ selectedTemplateIds.length }}) & Create New
        </button>
        <p v-if="applyingTransformation" class="text-sm text-indigo-600">Applying transformation...</p>
        <p v-if="transformationError" class="text-sm text-red-600">Error: {{ transformationError }}</p>
        <p v-if="transformationSuccess" class="text-sm text-green-600">{{ transformationSuccess }}</p>
    </div>
    <!-- End Transformation Section -->

    <div v-if="loading && !templates.length" class="text-center text-gray-500">
      Loading templates...
    </div>
    <div v-else-if="error" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6" role="alert">
      <strong class="font-bold">Error fetching templates:</strong>
      <span class="block sm:inline"> {{ error.message }}</span>
    </div>
    
    <ul v-else-if="templates.length > 0" class="space-y-4">
      <li v-for="template in templates" :key="template.id" class="flex items-center bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow duration-200 border border-gray-200">
        <input 
            type="checkbox" 
            :id="`template-checkbox-${template.id}`"
            :value="template.id"
            @change="toggleTemplateSelection(template.id)"
            class="h-5 w-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 mr-4"
        />
        <router-link 
          :to="{ name: 'TemplateDetail', params: { id: template.id } }" 
          class="block flex-grow"
        >
          <h2 class="text-xl font-semibold text-blue-600 mb-1">{{ template.name }}</h2>
          <p v-if="template.category" class="text-sm text-gray-500">
            Category: <span class="font-medium text-gray-700">{{ template.category }}</span>
          </p>
          <!-- Description removed for brevity in this view if needed -->
        </router-link>
      </li>
    </ul>
    <div v-else class="text-center text-gray-500 mt-8">
      No templates found.
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { supabase } from '../supabase'; // Adjust path if your supabase client is elsewhere
import * as prettier from "prettier/standalone";
import * as prettierPluginHtml from "prettier/plugins/html";

const templates = ref([]);
const loading = ref(true);
const error = ref(null);

// For Transformation Application
const transformationSets = ref([]);
const loadingSets = ref(false);
const selectedSetId = ref(null);
const selectedTemplateIds = ref([]); // Array to store IDs of selected templates
const applyingTransformation = ref(false);
const transformationError = ref(null);
const transformationSuccess = ref('');
const uniqueCategories = ref([]); // For category selection

async function fetchTemplates() {
  loading.value = true;
  error.value = null;
  try {
    const { data, error: fetchError } = await supabase
      .from('templates')
      .select('id, name, category, description') // Select only needed fields for the list
      .order('name', { ascending: true });

    if (fetchError) throw fetchError;
    templates.value = data || [];
    // Populate unique categories
    if (data) {
        const categories = new Set(data.map(t => t.category).filter(c => c));
        uniqueCategories.value = Array.from(categories).sort();
    }
  } catch (e) {
    console.error('Error fetching templates:', e);
    error.value = e;
  } finally {
    loading.value = false;
  }
}

async function fetchTransformationSets() {
  loadingSets.value = true;
  transformationError.value = null;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !session.user) {
        // error.value = new Error("You must be logged in to view transformation sets.");
        transformationSets.value = [];
        return;
    }
    const { data, error: fetchError } = await supabase
      .from('transformation_sets')
      .select('id, name')
      .eq('created_by', session.user.id)
      .order('name', { ascending: true });

    if (fetchError) throw fetchError;
    transformationSets.value = data || [];
  } catch (e) {
    console.error('Error fetching transformation sets:', e);
    // error.value = e; // Avoid overwriting template fetch error
    transformationError.value = e.message;
  } finally {
    loadingSets.value = false;
  }
}

const canApply = computed(() => {
    return selectedSetId.value && selectedTemplateIds.value.length > 0 && !applyingTransformation.value;
});

// --- Updated applyRulesToContent with more specific logging for simple_text ---
async function applyRulesToContent(content, rules) {
  let transformedContent = content;
  console.log('[applyRules] Starting content (length):', content.length);
  for (const rule of rules.sort((a, b) => (a.rule_order || 0) - (b.rule_order || 0))) {
    if (!rule.search_term) {
      console.log('[applyRules] Skipping rule with empty search_term:', rule);
      continue;
    }
    console.log(`[applyRules] Applying rule: Search for "${rule.search_term.substring(0,50)}...", Replace with "${(rule.replace_with || '' ).substring(0,50)}...", Type: ${rule.rule_type}, CaseSensitive: ${rule.is_case_sensitive}, Global: ${rule.is_global}`);
    
    let originalContentBeforeRule = transformedContent;
    try {
      if (rule.rule_type === 'simple_text') {
        const flags = (rule.is_global ? 'g' : '') + (rule.is_case_sensitive ? '' : 'i');
        const escapedSearchTerm = rule.search_term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escapedSearchTerm, flags);
        transformedContent = transformedContent.replace(regex, rule.replace_with || '');
        if (originalContentBeforeRule === transformedContent) {
            // Log details if simple_text didn't find it
            console.log(`[applyRules] simple_text: Search term (escaped regex) "${regex.source}" with flags "${regex.flags}" did NOT find a match.`);
            // For very detailed debugging, you could log snippets of the content vs search term
            // console.log(`[applyRules] simple_text: Comparing with content snippet:`, content.substring(content.indexOf(rule.search_term.substring(0,10)) - 20, content.indexOf(rule.search_term.substring(0,10)) + rule.search_term.length + 20));
        }
      } else if (rule.rule_type === 'regex') {
        const flags = (rule.is_global ? 'g' : '') + (rule.is_case_sensitive ? '' : 'i');
        const regex = new RegExp(rule.search_term, flags);
        transformedContent = transformedContent.replace(regex, rule.replace_with || '');
      }

      if (originalContentBeforeRule !== transformedContent) {
          console.log('[applyRules] Content WAS MODIFIED by this rule.');
      } else {
          console.log('[applyRules] Content was NOT modified by this rule (search term not found or replacement is same).');
      }
    } catch (e) {
      console.warn(`[applyRules] Rule application failed for search term "${rule.search_term.substring(0,50)}...":`, e.message);
    }
  }
  console.log('[applyRules] Final transformed content (length):', transformedContent.length);
  return transformedContent;
}
// -----------------------------------------------------

async function handleApplyTransformation() {
  if (!canApply.value) return;

  applyingTransformation.value = true;
  transformationError.value = null;
  transformationSuccess.value = '';
  let successCount = 0;
  let errorCount = 0;

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !session.user) {
      throw new Error("User not authenticated.");
    }
    const userId = session.user.id;

    // 1. Fetch the rules for the selected transformation set
    const { data: rules, error: rulesError } = await supabase
      .from('transformation_rules')
      .select('*')
      .eq('set_id', selectedSetId.value)
      .order('rule_order');
    if (rulesError) throw rulesError;
    if (!rules || rules.length === 0) {
      throw new Error("No rules found in the selected transformation set.");
    }

    // 2. Fetch the full content of selected legacy templates
    const { data: legacyTemplates, error: legacyFetchError } = await supabase
      .from('templates')
      .select('id, name, category, legacy_html_content, description, email_source, email_from, subject_default') // Fetch all relevant fields
      .in('id', selectedTemplateIds.value);
    if (legacyFetchError) throw legacyFetchError;

    const newTemplatesToInsert = [];

    for (const legacyTemplate of legacyTemplates) {
      if (!legacyTemplate.legacy_html_content) {
        console.warn(`Template ${legacyTemplate.name} has no legacy_html_content, skipping.`);
        continue;
      }

      // 1. Prompt for new template name
      const newName = prompt(
        `Enter a name for the new template transformed from "${legacyTemplate.name}":`,
        `${legacyTemplate.name} (Transformed)`
      );
      if (newName === null) { // User cancelled
          console.log('Transformation cancelled by user for template:', legacyTemplate.name);
          continue; // Skip this template
      }

      // 2. Prompt for category
      const categoryPromptMessage = uniqueCategories.value.length > 0 ? 
        `Enter category for "${newName}" (existing: ${uniqueCategories.value.join(', ')}) or type a new one:` :
        `Enter category for "${newName}":`;
      let newCategory = prompt(categoryPromptMessage, legacyTemplate.category || '');
      if (newCategory === null) { // User cancelled
          console.log('Transformation cancelled by user (category step) for template:', newName);
          continue; // Skip this template
      }
      newCategory = newCategory.trim() || null; // Use null if empty

      // 3. Apply rules to legacy_html_content
      const transformedBody = await applyRulesToContent(legacyTemplate.legacy_html_content, rules);
      
      // 4. Format the transformed HTML using Prettier
      let formattedTransformedBody = transformedBody;
      try {
          formattedTransformedBody = await prettier.format(transformedBody, {
              parser: "html", 
              plugins: [prettierPluginHtml],
              printWidth: 120, // Example Prettier option
          });
      } catch (formatError) {
          console.warn(`Prettier formatting failed for transformed content of ${legacyTemplate.name}:`, formatError);
          // Use unformatted transformed content if Prettier fails
      }

      newTemplatesToInsert.push({
        name: newName,
        category: newCategory,
        description: legacyTemplate.description,
        
        body_content: formattedTransformedBody, // This is the content for the editor
        legacy_html_content: formattedTransformedBody, // ALSO save transformed as the new "legacy" for this version
        
        header_content: '', 
        footer_content: '', 
        legacy_url: legacyTemplate.legacy_url, 
        email_source: legacyTemplate.email_source,
        email_from: legacyTemplate.email_from,
        subject_default: legacyTemplate.subject_default,
        created_by: userId,
        // applied_design_id: null, // Or copy from original if that makes sense
      });
    }

    if (newTemplatesToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from('templates')
        .insert(newTemplatesToInsert);
      
      if (insertError) throw insertError;
      successCount = newTemplatesToInsert.length;
    }

    transformationSuccess.value = `${successCount} new template(s) created successfully from transformation!`;
    selectedTemplateIds.value = []; // Clear selection
    await fetchTemplates(); // Refresh the template list

  } catch (e) {
    console.error('Error applying transformation:', e);
    transformationError.value = e.message;
    errorCount++; // Not used yet, but good for summary
  } finally {
    applyingTransformation.value = false;
    setTimeout(() => {
        transformationSuccess.value = '';
        transformationError.value = null;
    }, 5000);
  }
}
// --------------------------------

onMounted(() => {
  fetchTemplates();
  fetchTransformationSets();
});

// Helper to toggle template selection
function toggleTemplateSelection(templateId) {
    const index = selectedTemplateIds.value.indexOf(templateId);
    if (index === -1) {
        selectedTemplateIds.value.push(templateId);
    } else {
        selectedTemplateIds.value.splice(index, 1);
    }
}
</script>

<style>
/* Removed scoped styles, using Tailwind utility classes now */
</style> 