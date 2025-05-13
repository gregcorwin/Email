<template>
  <div class="template-list-page p-4 md:p-6">
    <h1 class="text-3xl font-bold text-gray-700 mb-6">Email Templates</h1>

    <!-- Filter/Search Controls -->
    <div class="filter-search-bar bg-gray-100 p-4 rounded-lg shadow mb-6">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
        <div>
          <label for="collectionFilter" class="block text-sm font-medium text-gray-700 mb-1">Collection:</label>
          <select id="collectionFilter" v-model="collectionFilter" class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
            <option value="">All Collections</option>
            <option :value="null">[Unassigned]</option>
            <option v-for="col in allCollections" :key="col.id" :value="col.id">{{ col.name }}</option>
          </select>
        </div>
        <div>
          <label for="categoryFilter" class="block text-sm font-medium text-gray-700 mb-1">Category:</label>
          <select id="categoryFilter" v-model="categoryFilter" class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
            <option value="">All Categories</option>
            <option v-for="cat in uniqueCategories" :key="cat" :value="cat">{{ cat }}</option>
          </select>
        </div>
        <div class="lg:col-span-2"> <!-- Search input takes more space on larger screens -->
          <label for="searchInput" class="block text-sm font-medium text-gray-700 mb-1">Search by Name:</label>
          <input id="searchInput" v-model="searchTerm" type="text" placeholder="Enter template name..." class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
        </div>
        <div class="lg:col-start-4 flex justify-end">
            <button v-if="categoryFilter || searchTerm || collectionFilter !== ''" @click="clearFilters" class="mt-1 px-4 py-2 border border-transparent text-sm font-medium rounded-md text-gray-700 bg-gray-200 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 whitespace-nowrap">
                Clear Filters
            </button>
        </div>
      </div>
    </div>
    <!-- End Filter/Search Controls -->

    <!-- Bulk Actions Section -->
    <div class="bulk-actions-bar bg-gray-100 p-4 rounded-lg shadow mb-6">
        <div class="flex flex-wrap items-center gap-x-4 gap-y-3">
            <label class="flex items-center space-x-2 cursor-pointer pr-4">
                <input
                    type="checkbox"
                    id="select-all-checkbox"
                    :checked="allSelected"
                    @change="toggleSelectAll"
                    class="h-5 w-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                    :disabled="loading || !filteredTemplates.length"
                />
                <span class="text-sm font-medium text-gray-700">Select All (Visible)</span>
            </label>

            <button
                @click="confirmDeleteSelected"
                :disabled="selectedTemplateIds.length === 0 || deletingTemplates"
                class="px-4 py-2 text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
            >
                <span v-if="!deletingTemplates">Delete Selected ({{ selectedTemplateIds.length }})</span>
                <span v-else>Deleting...</span>
            </button>

            <button
                @click="viewSelectedInGallery"
                :disabled="selectedTemplateIds.length === 0"
                class="px-4 py-2 text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
            >
                View in Gallery ({{ selectedTemplateIds.length }})
            </button>
            
            <!-- Bulk Assign Collection - Grouped at the end -->
            <div class="flex items-center space-x-2 ml-auto">
                <label for="bulkAssignCollection" class="text-sm font-medium text-gray-700 whitespace-nowrap">Assign to Collection:</label>
                <select id="bulkAssignCollection" v-model="bulkSelectedCollectionId" class="block w-48 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                    <option :value="undefined" disabled>-- Select --</option>
                    <option :value="null">[Unassign]</option>
                    <option v-for="col in allCollections" :key="col.id" :value="col.id">{{ col.name }}</option>
                </select>
                <button 
                    @click="handleBulkAssignCollection"
                    :disabled="selectedTemplateIds.length === 0 || bulkSelectedCollectionId === undefined || assigningToCollection"
                    class="px-4 py-2 text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                    <span v-if="!assigningToCollection">Assign</span>
                    <span v-else>Assigning...</span>
                </button>
            </div>
        </div>
        <p v-if="deleteError" class="text-red-600 text-sm mt-2">{{ deleteError }}</p>
        <p v-if="deleteSuccess" class="text-green-600 text-sm mt-2">{{ deleteSuccess }}</p>
        <p v-if="assignToCollectionError" class="text-red-600 text-sm mt-2">{{ assignToCollectionError }}</p>
        <p v-if="assignToCollectionSuccess" class="text-green-600 text-sm mt-2">{{ assignToCollectionSuccess }}</p>
    </div>
    <!-- End Bulk Actions Section -->

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
            :disabled="!canApply || applyingTransformation"
            class="px-4 py-2 text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
        >
            <span v-if="applyingTransformation">Applying & Creating...</span>
            <span v-else>Apply to Selected ({{ selectedTemplateIds.length }}) & Create New</span>
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
    
    <ul v-else-if="filteredTemplates.length > 0" class="space-y-4">
      <li v-for="template in filteredTemplates" :key="template.id" class="flex items-center bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow duration-200 border border-gray-200">
        <input 
            type="checkbox" 
            :id="`template-checkbox-${template.id}`"
            :value="template.id"
            @change="toggleTemplateSelection(template.id)"
            class="h-5 w-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 mr-4"
            :checked="selectedTemplateIds.includes(template.id)"
        />
        <router-link 
          :to="{ name: 'TemplateDetail', params: { id: template.id } }" 
          class="block flex-grow"
        >
          <h2 class="text-xl font-semibold text-blue-600 mb-1">{{ template.name }}</h2>
          <div class="text-xs text-gray-500 space-x-2">
            <span v-if="template.category">Category: <span class="font-medium text-gray-700">{{ template.category }}</span></span>
            <span v-if="getCollectionName(template.collection_id)">Collection: <span class="font-medium text-gray-700">{{ getCollectionName(template.collection_id) }}</span></span>
            <span v-else-if="template.collection_id === null">Collection: <span class="font-italic text-gray-600">[Unassigned]</span></span>
          </div>
        </router-link>
      </li>
    </ul>
    <div v-else class="text-center text-gray-500 mt-8">
      No templates found.
    </div>

    <div v-if="showTransformationModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 overflow-y-auto p-4">
      <div class="bg-white rounded-lg shadow-lg max-w-xl w-full p-6 relative my-8">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-xl font-bold text-gray-800">Bulk Transformation Options</h2>
          <button @click="showTransformationModal = false" class="text-gray-500 hover:text-gray-700 text-2xl leading-none p-1 rounded-full hover:bg-gray-100">&times;</button>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label for="modalGlobalTitleSuffix" class="block text-sm font-medium text-gray-700 mb-1">Global Title Suffix:</label>
            <input id="modalGlobalTitleSuffix" v-model="globalTitleModifier" type="text" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" placeholder="e.g. —ConnectPro Rebrand" />
          </div>
          <div>
            <label for="modalGlobalCategory" class="block text-sm font-medium text-gray-700 mb-1">Global Category:</label>
            <input id="modalGlobalCategory" v-model="globalCategory" type="text" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" placeholder="Leave blank to keep original" />
          </div>
        </div>

        <div class="mb-4">
            <label for="modalCollectionSelect" class="block text-sm font-medium text-gray-700 mb-1">Assign New Templates to Collection:</label>
            <select id="modalCollectionSelect" v-model="modalSelectedCollectionId" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                <option :value="null">[Unassigned]</option>
                <option v-for="col in allCollections" :key="col.id" :value="col.id">{{ col.name }}</option>
            </select>
        </div>
        
        <div class="mb-4 flex justify-end">
          <button @click="applyGlobalToAllInModal" class="px-3 py-1.5 text-xs font-medium rounded-md shadow-sm text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-500 transition-colors duration-200">
            Apply Globals to All Below
          </button>
        </div>

        <div class="max-h-60 overflow-y-auto border rounded p-3 space-y-3 mb-4 bg-gray-50">
          <h3 class="font-semibold mb-2 text-gray-700 sticky top-0 bg-gray-50 py-1 z-10">Edit Individual New Titles & Categories:</h3>
          <div v-for="(editItem, idx) in templateEdits" :key="editItem.id" class="p-3 border rounded bg-white shadow-sm space-y-2">
            <div class="mb-1 text-xs text-gray-500">Original: {{ getOriginalTemplateNameById(editItem.id) }} (Cat: {{ getOriginalTemplateCategoryById(editItem.id) || 'N/A' }})</div>
            <div>
                <label :for="`modalTitle-${idx}`" class="block text-xs font-medium text-gray-600">New Title:</label>
                <input :id="`modalTitle-${idx}`" v-model="editItem.title" type="text" class="mt-0.5 block w-full px-3 py-1.5 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
            </div>
            <div>
                <label :for="`modalCat-${idx}`" class="block text-xs font-medium text-gray-600">New Category:</label>
                <input :id="`modalCat-${idx}`" v-model="editItem.category" type="text" class="mt-0.5 block w-full px-3 py-1.5 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" placeholder="Category (optional)" />
            </div>
            <div class="text-right mt-2">
                <button @click="handlePreviewSingleTransformation(editItem.id)" class="px-2.5 py-1 text-xs font-medium rounded-md shadow-sm text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-500">
                    Preview Changes
                </button>
            </div>
          </div>
        </div>
        
        <div class="flex justify-end space-x-3 mt-6">
          <button @click="showTransformationModal = false" class="px-4 py-2 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-gray-200 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors duration-200">
            Cancel
          </button>
          <button @click="handleTransformationConfirm" class="px-4 py-2 text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200">
            Create New Transformed Templates
          </button>
        </div>
      </div>
    </div>

    <!-- New Preview Modal -->
    <div v-if="showPreviewModal" class="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-60 p-4">
        <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 relative transform transition-all">
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-lg font-semibold text-gray-800">Transformation Preview for: {{ previewingTemplateName }}</h3>
                <button @click="showPreviewModal = false" class="text-gray-500 hover:text-gray-700 text-2xl leading-none p-1 rounded-full hover:bg-gray-100">&times;</button>
            </div>
            <div v-if="loadingPreview" class="text-center py-8 text-gray-600">
                Loading preview...
            </div>
            <div v-else-if="previewError" class="text-red-600 bg-red-50 p-3 rounded">
                Error generating preview: {{ previewError }}
            </div>
            <div v-else class="preview-iframe-wrapper border rounded-md overflow-hidden" style="height: 60vh;">
                <iframe :srcdoc="previewContent" class="w-full h-full border-0"></iframe>
            </div>
            <div class="mt-4 text-right">
                <button @click="showPreviewModal = false" class="px-4 py-2 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-gray-200 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500">
                    Close Preview
                </button>
            </div>
        </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { supabase } from '../supabase'; // Adjust path if your supabase client is elsewhere
import * as prettier from "prettier/standalone";
import * as prettierPluginHtml from "prettier/plugins/html";
import { useRouter } from 'vue-router'; // Ensure useRouter is imported

const templates = ref([]);
const loading = ref(true);
const error = ref(null);

const allCollections = ref([]); // For storing all collections
const loadingCollections = ref(false);

// For Transformation Application
const transformationSets = ref([]);
const loadingSets = ref(false);
const selectedSetId = ref(null);
const selectedTemplateIds = ref([]); // Array to store IDs of selected templates
const applyingTransformation = ref(false);
const transformationError = ref(null);
const transformationSuccess = ref('');
const uniqueCategories = ref([]); // For category selection

const deletingTemplates = ref(false);
const deleteError = ref("");
const deleteSuccess = ref("");

const allSelected = computed(() => {
  // Select all based on currently filtered templates
  return filteredTemplates.value.length > 0 && selectedTemplateIds.value.length === filteredTemplates.value.length;
});

const categoryFilter = ref("");
const searchTerm = ref("");
const collectionFilter = ref(""); // Initialize with empty string for 'All Collections'

const filteredTemplates = computed(() => {
  let filtered = templates.value;
  if (collectionFilter.value !== "") { // Check against empty string for 'All'
    // Handles null for 'Unassigned' and specific ID for a collection
    filtered = filtered.filter(t => t.collection_id === collectionFilter.value);
  }
  if (categoryFilter.value) {
    filtered = filtered.filter(t => t.category === categoryFilter.value);
  }
  if (searchTerm.value) {
    const term = searchTerm.value.toLowerCase();
    filtered = filtered.filter(t => t.name && t.name.toLowerCase().includes(term));
  }
  return filtered;
});

const router = useRouter(); // Initialize router

async function fetchAllCollections() {
  loadingCollections.value = true;
  try {
    const { data, error } = await supabase
      .from('collections')
      .select('id, name')
      .order('name', { ascending: true });
    if (error) throw error;
    allCollections.value = data || [];
  } catch (e) {
    console.error('Error fetching collections:', e);
    // Potentially set an error ref for collections if needed
  } finally {
    loadingCollections.value = false;
  }
}

function getCollectionName(collectionId) {
    if (!collectionId) return ''; // Or 'Unassigned' if preferred for display logic elsewhere
    const found = allCollections.value.find(c => c.id === collectionId);
    return found ? found.name : 'Unknown Collection';
}

async function fetchTemplates() {
  loading.value = true;
  error.value = null;
  try {
    const { data, error: fetchError } = await supabase
      .from('templates')
      .select('id, name, category, description, collection_id, legacy_html_content, body_content') // Added legacy_html_content and body_content
      .order('name', { ascending: true });

    if (fetchError) throw fetchError;
    templates.value = data || [];
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

// Modal dialog state
const showTransformationModal = ref(false);
const globalTitleModifier = ref("");
const globalCategory = ref("");
const modalSelectedCollectionId = ref(null);
const templateEdits = ref([]); // [{ title, category }]
const selectedTemplatesForModal = computed(() => {
  return templates.value.filter(t => selectedTemplateIds.value.includes(t.id));
});

function handleApplyTransformation() {
  if (!canApply.value) return;
  templateEdits.value = selectedTemplatesForModal.value.map(t => ({
    id: t.id,
    title: t.name + (globalTitleModifier.value ? ` ${globalTitleModifier.value}` : ""),
    category: globalCategory.value || t.category || ""
  }));
  showTransformationModal.value = true;
}

function applyGlobalToAllInModal() {
  templateEdits.value = selectedTemplatesForModal.value.map(t => ({
    id: t.id,
    title: t.name + (globalTitleModifier.value ? ` ${globalTitleModifier.value}` : ""),
    category: globalCategory.value || t.category || "",
  }));
}

function handleTransformationConfirm() {
  showTransformationModal.value = false;
  actuallyApplyTransformationWithEdits();
}

async function actuallyApplyTransformationWithEdits() {
  applyingTransformation.value = true;
  transformationError.value = null;
  transformationSuccess.value = '';
  let successCount = 0;

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !session.user) {
      throw new Error("User not authenticated.");
    }
    const userId = session.user.id;

    const { data: rules, error: rulesError } = await supabase
      .from('transformation_rules')
      .select('*')
      .eq('set_id', selectedSetId.value)
      .order('rule_order');
    if (rulesError) throw rulesError;
    if (!rules || rules.length === 0) {
      throw new Error("No rules found in the selected transformation set.");
    }

    const { data: legacyTemplates, error: legacyFetchError } = await supabase
      .from('templates')
      .select('id, name, category, legacy_html_content, description, email_source, email_from, subject_default, collection_id') // ensure collection_id fetched
      .in('id', selectedTemplateIds.value);
    if (legacyFetchError) throw legacyFetchError;

    const newTemplatesToInsert = [];

    for (let i = 0; i < legacyTemplates.length; i++) {
      const legacyTemplate = legacyTemplates[i];
      const edit = templateEdits.value.find(te => selectedTemplatesForModal.value[i].id === legacyTemplate.id) || {}; // find corresponding edit
      
      if (!legacyTemplate.legacy_html_content) {
        console.warn(`Template ${legacyTemplate.name} has no legacy_html_content, skipping.`);
        continue;
      }

      const newName = edit.title || legacyTemplate.name; // Use from modal edit
      const newCategory = edit.category?.trim() || null; // Use from modal edit
      
      const transformedBody = await applyRulesToContent(legacyTemplate.legacy_html_content, rules);
      let formattedTransformedBody = transformedBody;
      try {
        formattedTransformedBody = await prettier.format(transformedBody, { parser: "html", plugins: [prettierPluginHtml], printWidth: 120 });
      } catch (formatError) {
        console.warn(`Prettier formatting failed for ${legacyTemplate.name}:`, formatError);
      }

      newTemplatesToInsert.push({
        name: newName,
        category: newCategory,
        collection_id: modalSelectedCollectionId.value,
        description: legacyTemplate.description,
        body_content: formattedTransformedBody,
        legacy_html_content: formattedTransformedBody, 
        header_content: '', footer_content: '',
        legacy_url: legacyTemplate.legacy_url,
        email_source: legacyTemplate.email_source,
        email_from: legacyTemplate.email_from,
        subject_default: legacyTemplate.subject_default,
        created_by: userId,
      });
    }

    if (newTemplatesToInsert.length > 0) {
      const { error: insertError } = await supabase.from('templates').insert(newTemplatesToInsert);
      if (insertError) throw insertError;
      successCount = newTemplatesToInsert.length;
    }
    transformationSuccess.value = `${successCount} new template(s) created successfully in collection: ${getCollectionName(modalSelectedCollectionId.value) || 'Unassigned'}!`;
    selectedTemplateIds.value = [];
    await fetchTemplates();
  } catch (e) {
    console.error('Error applying transformation:', e);
    transformationError.value = e.message;
  } finally {
    applyingTransformation.value = false;
    setTimeout(() => { transformationSuccess.value = ''; transformationError.value = null; }, 5000);
  }
}

onMounted(async () => {
  await fetchAllCollections(); // Fetch collections first
  await fetchTemplates();
  await fetchTransformationSets(); // Keep this if it's used
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

function toggleSelectAll() {
  if (allSelected.value) {
    selectedTemplateIds.value = [];
  } else {
    // Select only IDs of currently filtered templates
    selectedTemplateIds.value = filteredTemplates.value.map(t => t.id);
  }
}

function confirmDeleteSelected() {
  if (selectedTemplateIds.value.length === 0) return;
  if (window.confirm(`Are you sure you want to delete ${selectedTemplateIds.value.length} template(s)? This action cannot be undone.`)) {
    deleteSelectedTemplates();
  }
}

async function deleteSelectedTemplates() {
  deletingTemplates.value = true;
  deleteError.value = "";
  deleteSuccess.value = "";
  try {
    const { error: deleteErr } = await supabase
      .from('templates')
      .delete()
      .in('id', selectedTemplateIds.value);
    console.log('Supabase delete response:', deleteErr);
    if (deleteErr) throw deleteErr;
    deleteSuccess.value = `${selectedTemplateIds.value.length} template(s) deleted successfully.`;
    selectedTemplateIds.value = [];
    await fetchTemplates();
  } catch (e) {
    console.error('Supabase delete error:', e);
    deleteError.value = e.message || 'Failed to delete templates.';
  } finally {
    deletingTemplates.value = false;
    setTimeout(() => {
      deleteSuccess.value = "";
      deleteError.value = "";
    }, 4000);
  }
}

function clearFilters() {
  categoryFilter.value = "";
  searchTerm.value = "";
  collectionFilter.value = ""; // Reset to empty string for 'All Collections'
}

// Bulk assign collection state
const bulkSelectedCollectionId = ref(undefined); // undefined for placeholder, null for 'Unassign'
const assigningToCollection = ref(false);
const assignToCollectionError = ref("");
const assignToCollectionSuccess = ref("");

async function handleBulkAssignCollection() {
  if (selectedTemplateIds.value.length === 0 || bulkSelectedCollectionId.value === undefined) {
    assignToCollectionError.value = "Please select templates and a collection.";
    return;
  }
  assigningToCollection.value = true;
  assignToCollectionError.value = "";
  assignToCollectionSuccess.value = "";
  let successfullyAssignedCount = 0;
  let firstErrorMessage = null;

  try {
    const { data: { session }, error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError) console.warn("Error refreshing session:", refreshError);
    const { data: { user } , error: getUserError } = await supabase.auth.getUser();
    if (getUserError) console.warn("Error getting user after refresh:", getUserError);
    console.log("User for bulk assign operation:", user);

    for (const templateId of selectedTemplateIds.value) {
      const { error: updateError } = await supabase
        .from('templates')
        .update({ collection_id: bulkSelectedCollectionId.value })
        .eq('id', templateId);
      
      if (updateError) {
        console.error(`Error updating template ${templateId}:`, updateError);
        if (!firstErrorMessage) firstErrorMessage = updateError.message; // Store first error
        // Continue trying other updates or break if critical
      } else {
        successfullyAssignedCount++;
      }
    }

    if (firstErrorMessage) {
      throw new Error(`One or more templates failed to update. First error: ${firstErrorMessage}`);
    }

    if (successfullyAssignedCount > 0) {
        assignToCollectionSuccess.value = `Successfully assigned ${successfullyAssignedCount} template(s).`;
    } else {
        assignToCollectionError.value = "No templates were assigned. Please check permissions or try again.";
    }
    
    await fetchTemplates();
    selectedTemplateIds.value = []; 
    bulkSelectedCollectionId.value = undefined; 

  } catch (e) {
    console.error('Error bulk assigning collection:', e);
    assignToCollectionError.value = `Failed to assign: ${e.message}`;
  } finally {
    assigningToCollection.value = false;
    setTimeout(() => {
      assignToCollectionSuccess.value = "";
      assignToCollectionError.value = "";
    }, 4000);
  }
}

function viewSelectedInGallery() {
  if (selectedTemplateIds.value.length > 0) {
    const idsQueryParam = selectedTemplateIds.value.join(',');
    router.push({ name: 'GalleryPage', query: { ids: idsQueryParam } });
  }
}

// State for Single Transformation Preview Modal
const showPreviewModal = ref(false);
const previewContent = ref('');
const loadingPreview = ref(false);
const previewingTemplateName = ref('');
const previewError = ref(null);

// Helper to get original template details for display in the edit modal
function getOriginalTemplateNameById(templateId) {
  const original = selectedTemplatesForModal.value.find(t => t.id === templateId);
  return original ? original.name : 'Unknown Template';
}
function getOriginalTemplateCategoryById(templateId) {
  const original = selectedTemplatesForModal.value.find(t => t.id === templateId);
  return original ? original.category : '';
}

async function handlePreviewSingleTransformation(originalTemplateId) {
  console.log('[PreviewLOG] Clicked Preview for originalTemplateId:', originalTemplateId);
  if (!selectedSetId.value) {
    alert("Please select a Transformation Set first.");
    console.log('[PreviewLOG] No transformation set selected.');
    return;
  }
  
  const originalTemplate = templates.value.find(t => t.id === originalTemplateId);
  console.log(`[PreviewLOG] Found originalTemplate from local 'templates' ref: ${originalTemplate ? originalTemplate.name : 'Not Found'}`);

  let contentToTransform = null;
  let usedFieldForPreview = null;

  if (originalTemplate) {
    if (originalTemplate.legacy_html_content) {
      contentToTransform = originalTemplate.legacy_html_content;
      usedFieldForPreview = 'legacy_html_content';
    } else if (originalTemplate.body_content) {
      contentToTransform = originalTemplate.body_content;
      usedFieldForPreview = 'body_content';
    }
  }

  if (!originalTemplate || !contentToTransform) {
    let errorMsg = "Original template data not found."; // Default if originalTemplate itself is null
    if (originalTemplate) { // If template object exists, but content is still missing
      if (!originalTemplate.legacy_html_content && !originalTemplate.body_content) {
        errorMsg = `Preview failed: Original template '${originalTemplate.name}' is missing BOTH legacy_html_content AND body_content.`;
      } else if (!originalTemplate.legacy_html_content && originalTemplate.body_content === null) { // Explicitly null body_content
        errorMsg = `Preview failed: Original template '${originalTemplate.name}' is missing legacy_html_content and body_content is null.`;
      } else { // Should mean legacy_html_content is missing, and body_content was also empty string or falsy
         errorMsg = `Preview failed: Original template '${originalTemplate.name}' has no suitable content (legacy_html_content or body_content) for preview.`;
      }
    }
    previewError.value = errorMsg;
    previewContent.value = '';
    loadingPreview.value = false; 
    showPreviewModal.value = true; 
    console.log('[PreviewLOG] Original content issue. Showing error in modal:', errorMsg);
    return;
  }

  previewingTemplateName.value = originalTemplate.name;
  loadingPreview.value = true;
  previewError.value = null;
  previewContent.value = ''; 
  showPreviewModal.value = true;
  console.log(`[PreviewLOG] Set showPreviewModal = true. Loading preview using: ${usedFieldForPreview}`);

  try {
    const { data: rules, error: rulesError } = await supabase
      .from('transformation_rules')
      .select('*')
      .eq('set_id', selectedSetId.value)
      .order('rule_order');
    console.log('[PreviewLOG] Fetched rules:', rules ? rules.length : 0);

    if (rulesError) throw rulesError;
    if (!rules || rules.length === 0) {
      throw new Error("No rules found for the selected transformation set.");
    }

    let transformed = await applyRulesToContent(contentToTransform, rules);
    console.log('[PreviewLOG] Content transformed (before prettier).');
    previewContent.value = await prettier.format(transformed, { parser: "html", plugins: [prettierPluginHtml], printWidth: 120 });
    console.log('[PreviewLOG] Preview content set after prettier.');

  } catch (e) {
    console.error("Error generating single template preview:", e);
    previewError.value = e.message || "Failed to generate preview.";
    previewContent.value = `<p style="color: red; padding: 1rem;">Error generating preview: ${previewError.value}</p>`;
  } finally {
    loadingPreview.value = false;
    console.log('[PreviewLOG] Finished loading preview. loadingPreview:', loadingPreview.value);
  }
}
</script>

<style scoped>
/* Add any specific styles if needed, though Tailwind should cover most */
.filter-search-bar, .bulk-actions-bar {
  /* Common styling for the bars if desired outside of Tailwind classes */
}

.preview-iframe-wrapper {
  min-height: 300px; /* Ensure iframe has some height */
}
</style> 