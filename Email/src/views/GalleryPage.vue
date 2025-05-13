<template>
  <div class="gallery-page p-4 md:p-6">
    <h1 class="text-3xl font-bold text-gray-700 mb-6">Template Gallery</h1>

    <!-- Collection Selector -->
    <div class="mb-8 p-4 bg-gray-50 rounded-lg border shadow-sm">
      <label for="galleryCollectionSelect" class="block text-lg font-medium text-gray-700 mb-2">Select a Collection to View:</label>
      <div class="flex items-center space-x-3">
        <select id="galleryCollectionSelect" v-model="selectedCollectionId" @change="handleCollectionSelection" class="block w-full md:w-1/2 lg:w-1/3 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
          <option :value="null" disabled>-- Please select a collection --</option>
          <option :value="'__all__'">All Templates (Ungrouped)</option> <!-- Option for all -->
          <option :value="'__unassigned__'">[Unassigned Templates]</option> <!-- Option for unassigned -->
          <option v-for="col in allCollections" :key="col.id" :value="col.id">{{ col.name }}</option>
        </select>
        <button @click="goToTemplatesList" class="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 whitespace-nowrap">
          Or select from list...
        </button>
      </div>
      <p v-if="loadingCollections" class="text-sm text-gray-500 mt-2">Loading collections...</p>
      <div v-if="errorCollections" class="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded text-sm mt-2" role="alert">
        Error loading collections: {{ errorCollections.message }}
      </div>
    </div>

    <!-- Loading/Error for Templates -->
    <div v-if="loadingTemplates" class="text-center text-gray-500 py-10">
      <p>Loading templates...</p>
      <!-- Add a spinner or more elaborate loading state here if desired -->
    </div>
    <div v-else-if="errorTemplates" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6" role="alert">
      <strong class="font-bold">Error loading templates:</strong>
      <span class="block sm:inline"> {{ errorTemplates.message }}</span>
    </div>

    <!-- Templates Grid -->
    <div v-else-if="templatesToDisplay.length > 0" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      <TemplateCard 
        v-for="template in templatesToDisplay" 
        :key="template.id" 
        :template="template"
        :collectionName="getCollectionNameById(template.collection_id)"
        :galleryContext="currentGalleryContext"
        @select-for-export="toggleExportSelection"
        :is-selected-for-export="selectedForExport.has(template.id)"
      />
    </div>
    <div v-else-if="selectedCollectionId && !loadingTemplates && !errorTemplates" class="text-center text-gray-500 py-10">
      <p>No templates found in this collection, or selection is empty.</p>
    </div>
    <div v-else-if="!selectedCollectionId && !initialTemplateIds && !loadingTemplates" class="text-center text-gray-500 py-10">
      <p>Please select a collection above or choose templates from the main list to view them in the gallery.</p>
    </div>

    <!-- Export Button (appears if items are selected) -->
    <div v-if="selectedForExport.size > 0 && !showExportModal" class="fixed bottom-6 right-6 z-50">
        <button 
            @click="showExportModal = true" 
            class="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg shadow-lg transition-transform duration-150 ease-in-out hover:scale-105"
        >
            Export Selected ({{ selectedForExport.size }})
        </button>
    </div>

    <!-- Export Options Modal -->
    <div v-if="showExportModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
        <div class="bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
            <div class="flex justify-between items-center mb-4">
                <h2 class="text-xl font-semibold text-gray-800">Export Options</h2>
                <button @click="showExportModal = false; exportError = null;" class="text-gray-500 hover:text-gray-700 text-2xl leading-none p-1 rounded-full hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    &times;
                </button>
            </div>
            
            <div class="space-y-3 mb-6">
                <label class="flex items-center space-x-3 cursor-pointer">
                    <input type="checkbox" v-model="exportOptions.zipArchive" class="h-5 w-5 text-green-600 border-gray-300 rounded focus:ring-green-500">
                    <span class="text-gray-700 font-medium">Download as ZIP Archive (.zip)</span>
                </label>
                <hr class="my-3"/>
                <label class="flex items-center space-x-3 cursor-pointer pl-4" :class="{ 'opacity-50': !exportOptions.zipArchive && !(exportOptions.rawHtml || exportOptions.jsonData) }">
                    <input type="checkbox" v-model="exportOptions.rawHtml" class="h-5 w-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500">
                    <span class="text-gray-700">Include Raw HTML <span class="text-xs">({{ exportOptions.zipArchive ? 'in ZIP' : 'as individual files' }})</span></span>
                </label>
                <label class="flex items-center space-x-3 cursor-pointer pl-4" :class="{ 'opacity-50': !exportOptions.zipArchive && !(exportOptions.rawHtml || exportOptions.jsonData) }">
                    <input type="checkbox" v-model="exportOptions.jsonData" class="h-5 w-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500">
                    <span class="text-gray-700">Include Structured Data (JSON) <span class="text-xs">({{ exportOptions.zipArchive ? 'in ZIP' : 'as single file' }})</span></span>
                </label>
            </div>

            <p v-if="exporting" class="text-sm text-indigo-600 mb-3">{{ exportProgressMessage }}</p>
            <p v-if="exportError" class="text-sm text-red-600 mb-3">Error: {{ exportError }}</p>
            <p v-if="exportSuccessMessage" class="text-sm text-green-600 mb-3">{{ exportSuccessMessage }}</p>

            <div class="flex justify-end space-x-3 mt-6">
                <button @click="showExportModal = false; exportError = null; exportSuccessMessage = null;" class="px-4 py-2 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-gray-200 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors duration-200">
                    Cancel
                </button>
                <button 
                    @click="triggerExport"
                    :disabled="!(exportOptions.rawHtml || exportOptions.jsonData || exportOptions.zipArchive) || exporting" 
                    class="px-4 py-2 text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                >
                    <span v-if="exporting">{{ exportProgressMessage.includes('Fetching') || exportProgressMessage.includes('Adding') || exportProgressMessage.includes('Generating') ? exportProgressMessage : 'Exporting...' }}</span>
                    <span v-else>Download Export</span>
                </button>
            </div>
        </div>
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { supabase } from '../supabase';
import TemplateCard from '../components/TemplateCard.vue'; // Placeholder for now
import JSZip from 'jszip'; // Import JSZip

const route = useRoute();
const router = useRouter();

const allCollections = ref([]);
const loadingCollections = ref(false);
const errorCollections = ref(null);

const allTemplates = ref([]); // Store all fetched templates from DB once
const templatesToDisplay = ref([]); // Templates to actually render in the grid
const loadingTemplates = ref(false);
const errorTemplates = ref(null);

const selectedCollectionId = ref(null); // For the dropdown. Can be collection_id, '__all__', or '__unassigned__'
const initialTemplateIds = ref([]); // For templates passed via query param

const selectedForExport = ref(new Set());
const showExportModal = ref(false);
const exportOptions = ref({
  rawHtml: true,
  jsonData: false,
  zipArchive: false, // New option
});
const exporting = ref(false);
const exportError = ref(null);
const exportProgressMessage = ref("Processing export...");
const exportSuccessMessage = ref(null); // New ref for success message

// New computed property for current gallery context
const currentGalleryContext = computed(() => {
  if (initialTemplateIds.value && initialTemplateIds.value.length > 0) {
    return { type: 'ids', ids: initialTemplateIds.value.join(',') };
  } else if (selectedCollectionId.value) {
    return { type: 'collection', id: selectedCollectionId.value };
  }
  return { type: 'none' }; // Default or unknown context
});

async function fetchAllCollectionsForFilter() {
  loadingCollections.value = true;
  errorCollections.value = null;
  try {
    const { data, error } = await supabase.from('collections').select('id, name').order('name');
    if (error) throw error;
    allCollections.value = data || [];
  } catch (e) {
    console.error('Error fetching collections:', e);
    errorCollections.value = e;
  } finally {
    loadingCollections.value = false;
  }
}

function getCollectionNameById(collectionId) {
    if (!collectionId) return 'Unassigned';
    const found = allCollections.value.find(c => c.id === collectionId);
    return found ? found.name : 'Unknown';
}

async function fetchTemplatesByCollection(collectionId) {
  loadingTemplates.value = true;
  errorTemplates.value = null;
  templatesToDisplay.value = [];
  try {
    let query = supabase.from('templates').select('*, collection:collections(name)'); // Fetch collection name directly
    if (collectionId === '__all__') {
      // No specific collection filter, fetch all
    } else if (collectionId === '__unassigned__') {
      query = query.is('collection_id', null);
    } else if (collectionId) {
      query = query.eq('collection_id', collectionId);
    }
    query = query.order('name');
    const { data, error } = await query;
    if (error) throw error;
    allTemplates.value = data || []; // Store all for potential client-side filtering if needed
    templatesToDisplay.value = data || [];
  } catch (e) {
    console.error('Error fetching templates:', e);
    errorTemplates.value = e;
  } finally {
    loadingTemplates.value = false;
  }
}

async function fetchTemplatesByIds(ids) {
  if (!ids || ids.length === 0) {
    templatesToDisplay.value = [];
    return;
  }
  loadingTemplates.value = true;
  errorTemplates.value = null;
  try {
    const { data, error } = await supabase
      .from('templates')
      .select('*, collection:collections(name)')
      .in('id', ids)
      .order('name');
    if (error) throw error;
    allTemplates.value = data || [];
    templatesToDisplay.value = data || [];
  } catch (e) {
    console.error('Error fetching templates by IDs:', e);
    errorTemplates.value = e;
  } finally {
    loadingTemplates.value = false;
  }
}

function handleCollectionSelection() {
    initialTemplateIds.value = []; // Clear ID-based selection if a collection is picked
    router.push({ query: { collection: selectedCollectionId.value } }); // Update URL
    fetchTemplatesByCollection(selectedCollectionId.value);
}

function goToTemplatesList() {
    router.push({ name: 'TemplatesList' }); // Assuming 'TemplatesList' is the route name
}

function toggleExportSelection(templateId) {
    if (selectedForExport.value.has(templateId)) {
        selectedForExport.value.delete(templateId);
    } else {
        selectedForExport.value.add(templateId);
    }
}

function downloadFile(content, filename, contentType) {
  const blob = new Blob([content], { type: contentType });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

async function triggerExport() {
  if (!exportOptions.value.rawHtml && !exportOptions.value.jsonData && !exportOptions.value.zipArchive) {
    exportError.value = "Please select at least one export format or the ZIP option.";
    return;
  }
  // If only ZIP is selected, but no content types, enable HTML and JSON by default for zipping
  if (exportOptions.value.zipArchive && !exportOptions.value.rawHtml && !exportOptions.value.jsonData) {
    exportOptions.value.rawHtml = true;
    exportOptions.value.jsonData = true;
  }

  exportSuccessMessage.value = null; // Clear previous success message
  exporting.value = true;
  exportError.value = null;
  exportProgressMessage.value = "Preparing data...";
  let filesDownloadedCount = 0;
  const selectedIdsArray = Array.from(selectedForExport.value);
  let detailedTemplatesData = allTemplates.value.filter(t => selectedIdsArray.includes(t.id));

  try {
    if (exportOptions.value.jsonData || exportOptions.value.zipArchive) { // Fetch details if JSON is needed (for direct export or for zipping)
        exportProgressMessage.value = `Fetching details for ${selectedIdsArray.length} template(s)...`;
        const detailedTemplatesPromises = selectedIdsArray.map(async (id) => {
            const existingData = detailedTemplatesData.find(t => t.id === id) || {};
            const { data: contentData, error: contentError } = await supabase.from('templates').select('id, header_content, body_content, footer_content, applied_design_id').eq('id', id).single();
            if (contentError) throw contentError;
            const { data: variablesData, error: variablesError } = await supabase.from('template_variables').select('variable_name, description, sample_value').eq('template_id', id);
            if (variablesError) throw variablesError;
            let designName = null;
            if (contentData.applied_design_id) {
                const { data: design } = await supabase.from('designs').select('name').eq('id', contentData.applied_design_id).single();
                if (design) designName = design.name;
            }
            return { ...existingData, ...contentData, template_variables: variablesData || [], applied_design_name: designName, collection_name: getCollectionNameById(existingData.collection_id) };
        });
        detailedTemplatesData = await Promise.all(detailedTemplatesPromises);
    }

    const zip = new JSZip();
    let hasContentForZip = false;

    if (exportOptions.value.rawHtml) {
      exportProgressMessage.value = exportOptions.value.zipArchive ? "Adding HTML to ZIP..." : "Exporting HTML files...";
      for (const template of detailedTemplatesData) {
        if (template.legacy_html_content) {
          const filename = `${template.name.replace(/[^a-z0-9\-_]/gi, '_') || 'template'}.html`;
          if (exportOptions.value.zipArchive) {
            zip.file(`html/${filename}`, template.legacy_html_content);
            hasContentForZip = true;
          } else {
            downloadFile(template.legacy_html_content, filename, 'text/html;charset=utf-8;');
            filesDownloadedCount++;
          }
        }
        if (!exportOptions.value.zipArchive && selectedIdsArray.length > 1) await new Promise(resolve => setTimeout(resolve, 100)); 
      }
    }

    if (exportOptions.value.jsonData) {
      exportProgressMessage.value = exportOptions.value.zipArchive ? "Adding JSON to ZIP..." : "Generating JSON data...";
      const jsonDataToExport = detailedTemplatesData.map(t => ({
        id: t.id, name: t.name, category: t.category, collection_id: t.collection_id, collection_name: t.collection_name,
        description: t.description, legacy_url: t.legacy_url, email_source: t.email_source, email_from: t.email_from, subject_default: t.subject_default,
        legacy_html_content: t.legacy_html_content, header_content: t.header_content, body_content: t.body_content, footer_content: t.footer_content,
        applied_design_id: t.applied_design_id, applied_design_name: t.applied_design_name, template_variables: t.template_variables, created_at: t.created_at,
      }));
      const jsonString = JSON.stringify(jsonDataToExport, null, 2);
      if (exportOptions.value.zipArchive) {
        zip.file('data/exported_templates_data.json', jsonString);
        hasContentForZip = true;
      } else {
        downloadFile(jsonString, 'exported_templates_data.json', 'application/json;charset=utf-8;');
        filesDownloadedCount++;
      }
    }

    if (exportOptions.value.zipArchive) {
      if (!hasContentForZip) {
        exportError.value = "No content selected to include in the ZIP file.";
      } else {
        exportProgressMessage.value = "Generating ZIP file...";
        const zipBlob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
        downloadFile(zipBlob, 'exported_templates.zip', 'application/zip');
        filesDownloadedCount++; // Counts as one download operation
      }
    }

    if (filesDownloadedCount > 0) {
        showExportModal.value = false;
        selectedForExport.value.clear();
        exportSuccessMessage.value = `${filesDownloadedCount} export operation(s) initiated. Downloads should begin shortly.`;
        setTimeout(() => { exportSuccessMessage.value = null; }, 5000); // Auto-dismiss success
    } else if (!exportError.value) {
        exportError.value = "No content available for the selected export options or nothing to ZIP.";
    }

  } catch (e) {
    console.error("Export failed:", e);
    exportError.value = e.message || "An unexpected error occurred during export.";
  } finally {
    exporting.value = false;
  }
}

// Renamed from handleExportSelected to avoid confusion with this new one
function oldHandleExportSelected() { 
    if (selectedForExport.value.size === 0) return;
    showExportModal.value = true; // Open the modal instead of alerting
}

// Ensure watcher updates context correctly or rely on selectedCollectionId/initialTemplateIds directly
watch(() => route.query, (newQuery) => {
    if (newQuery.ids) {
        selectedCollectionId.value = null; 
        const ids = newQuery.ids.split(',').filter(id => id);
        initialTemplateIds.value = ids; // This will update currentGalleryContext
        if (ids.length > 0) {
            fetchTemplatesByIds(ids);
        }
    } else if (newQuery.collection) { // Changed from: && newQuery.collection !== selectedCollectionId.value
        initialTemplateIds.value = [];
        // Only update if it's actually different or if templates aren't loaded for it yet
        if (newQuery.collection !== selectedCollectionId.value || templatesToDisplay.value.length === 0) {
             selectedCollectionId.value = newQuery.collection; // This will update currentGalleryContext
             fetchTemplatesByCollection(newQuery.collection);
        }
    } else if (!newQuery.ids && !newQuery.collection) {
        // Clear displayed templates if URL is cleared and not in an initial state from direct nav
        if (templatesToDisplay.value.length > 0 && !selectedCollectionId.value && (!initialTemplateIds.value || initialTemplateIds.value.length === 0) ) {
             // templatesToDisplay.value = []; // Avoid clearing if just landing on /gallery
        }
    }
}, { immediate: true });

onMounted(async () => {
  await fetchAllCollectionsForFilter();
  // Initial template loading logic based on URL query params
  if (route.query.collection) {
    selectedCollectionId.value = route.query.collection;
    // fetchTemplatesByCollection will be called by the watcher if selectedCollectionId changed or templates empty
    if (!templatesToDisplay.value.length || templatesToDisplay.value.every(t => t.collection_id !== route.query.collection)){
        fetchTemplatesByCollection(route.query.collection);
    }
  } else if (route.query.ids) {
    const ids = route.query.ids.split(',').filter(id => id);
    initialTemplateIds.value = ids;
    fetchTemplatesByIds(ids);
  } else {
    console.log('Gallery: No initial collection or template IDs in URL. User needs to select.');
  }
});

</script>

<style scoped>
/* Styles for the gallery page */
.gallery-page {
  /* Add any specific page-level styles */
}
/* Add styles for TemplateCard if it's not a separate component with its own styles */
</style> 