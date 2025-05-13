<template>
  <div class="template-detail-page p-4 md:p-6 lg:p-8">
    <router-link 
      to="/templates" 
      class="inline-flex items-center text-blue-600 hover:text-blue-800 mb-6 group"
    >
      <svg class="w-4 h-4 mr-2 transition-transform duration-200 group-hover:-translate-x-1" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg>
      Back to Templates
    </router-link>
    
    <!-- Loading / Error State -->
    <div class="loading-errors mb-6">
      <div v-if="loadingTemplate || loadingAllDesigns || loadingAppliedDesign" class="text-center text-gray-500 py-4">
        Loading details...
      </div>
      <div v-if="errorTemplate" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-2" role="alert">
        Error fetching template: {{ errorTemplate.message }}
      </div>
      <div v-if="errorAllDesigns" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-2" role="alert">
        Error fetching design list: {{ errorAllDesigns.message }}
      </div>
      <div v-if="errorAppliedDesign" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
        Error fetching selected design details: {{ errorAppliedDesign.message }}
      </div>
      <div v-if="loadingCollections" class="text-center text-gray-500 py-4">Loading collections...</div>
      <div v-if="errorCollections" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-2" role="alert">
        Error fetching collections: {{ errorCollections.message }}
      </div>
    </div>
    
    <div v-if="template && !loadingTemplate" class="space-y-6">
      <!-- Template Header Info -->
      <div class="bg-white p-4 rounded-lg shadow border border-gray-200">
        <h1 class="text-2xl md:text-3xl font-bold text-gray-800 mb-3">{{ template.name }}</h1>
        <div class="text-sm space-y-1 text-gray-600">
           <p v-if="template.category"><strong>Category:</strong> {{ template.category }}</p>
           <!-- Collection Display and Edit -->
           <div class="flex items-center space-x-2">
             <p><strong>Collection:</strong> 
               <span v-if="template.collection_id && getCollectionName(template.collection_id)">{{ getCollectionName(template.collection_id) }}</span>
               <span v-else-if="!template.collection_id">[Unassigned]</span>
               <span v-else class="italic text-gray-400">Loading collection...</span>
             </p>
             <button @click="editingCollection = !editingCollection" v-if="!editingCollection && canEditTemplate" class="text-xs text-blue-500 hover:underline">(Change)</button>
           </div>
           <div v-if="editingCollection && canEditTemplate" class="mt-2 flex items-center space-x-2 p-2 bg-gray-50 rounded">
              <select v-model="selectedCollectionIdForEdit" class="mt-1 block w-full md:w-1/2 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                  <option :value="null">[Unassign]</option>
                  <option v-for="col in allCollectionsForSelect" :key="col.id" :value="col.id">{{ col.name }}</option>
              </select>
              <button @click="handleSaveCollectionAssignment" :disabled="savingCollectionAssignment" 
                class="px-3 py-1.5 text-xs font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-500 disabled:opacity-50 transition-colors duration-200">
                <span v-if="savingCollectionAssignment">Saving...</span>
                <span v-else>Save</span>
              </button>
              <button @click="editingCollection = false; selectedCollectionIdForEdit = template.collection_id || null;" 
                class="px-3 py-1.5 text-xs font-medium rounded-md shadow-sm text-gray-700 bg-gray-200 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-500 transition-colors duration-200">Cancel</button>
           </div>
           <p v-if="saveCollectionError" class="text-red-600 text-xs mt-1">{{ saveCollectionError }}</p>
           <p v-if="saveCollectionSuccess" class="text-green-600 text-xs mt-1">Collection updated!</p>
           <!-- End Collection Display and Edit -->
           <p v-if="template.description"><strong>Description:</strong> {{ template.description }}</p>
           <p v-if="template.legacy_url"><strong>Legacy URL:</strong> 
             <a :href="template.legacy_url" target="_blank" class="text-blue-600 hover:underline break-all">{{ template.legacy_url }}</a>
           </p>
        </div>
      </div>

      <!-- RE-ADD Placeholder Display Section -->
      <div class="placeholders-section bg-gray-50 p-4 rounded border border-gray-200">
        <h3 class="font-semibold text-gray-700 mb-2">Defined Variables:</h3>
        <div v-if="loadingVariables" class="text-sm text-gray-500 italic">Loading variables...</div>
        <div v-else-if="errorVariables" class="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded text-sm my-2" role="alert">
          Could not load template variables: {{ errorVariables.message }}
        </div>
        <div v-else-if="templateVariables.length > 0" class="flex flex-wrap gap-2">
          <span v-for="variable in templateVariables" :key="variable.id" class="bg-blue-100 text-blue-800 text-xs font-mono px-2 py-1 rounded" :title="variable.description || variable.variable_name">
            {{ variable.variable_name }}
          </span>
        </div>
        <p v-else class="text-sm text-gray-500 italic">No variables defined for this template in the database.</p>
      </div>
      <!-- End Placeholder Display Section -->

       <!-- RE-ADD Placeholder Input Section -->
      <div class="placeholder-inputs-section bg-green-50 p-4 rounded border border-green-200" v-if="templateVariables.length > 0">
        <h3 class="font-semibold text-gray-700 mb-3">Enter Sample Data (for Live Preview):</h3>
        <div class="space-y-2">
          <div v-for="variable in templateVariables" :key="variable.id" class="flex items-center gap-2">
            <label :for="`input-${variable.id}`" class="w-1/3 text-right text-sm font-medium text-gray-600 pr-2 whitespace-nowrap" :title="variable.description || variable.variable_name">{{ variable.variable_name }}:</label>
            <input type="text" :id="`input-${variable.id}`" v-model="placeholderValues[variable.variable_name]" class="flex-grow px-2 py-1 border border-gray-300 rounded shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm" />
          </div>
        </div>
      </div>
      <!-- End Placeholder Input Section -->

      <!-- Content Editor Section -->
      <div class="content-editor bg-white p-4 rounded-lg shadow border border-gray-200 space-y-4">
        <h2 class="text-xl font-semibold text-gray-700">Edit Content Sections</h2>
        
        <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Header Content</label>
            <RichTextEditor 
                v-model="headerContent" 
                :disabled="!canEditTemplate"
            />
        </div>

        <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Body Content (HTML)</label>
            <HtmlCodeEditor 
                v-model="bodyContent" 
                :disabled="!canEditTemplate"
                height="800px"
            />
        </div>

        <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Footer Content</label>
            <RichTextEditor 
                v-model="footerContent" 
                :disabled="!canEditTemplate"
            />
        </div>

        <div class="flex justify-end">
             <button 
                @click="handleSaveContent"
                :disabled="savingContent || !canEditTemplate"
                class="px-4 py-2 text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap transition-colors duration-200"
            >
                {{ saveContentButtonText }}
            </button>
        </div>
         <p v-if="saveContentError" class="text-red-600 text-sm mt-2">{{ saveContentError }}</p>
         <p v-if="saveContentSuccess" class="text-green-600 text-sm mt-2">Content saved successfully!</p>

      </div>
      <!-- End Content Editor Section -->

      <!-- Design Selector -->
      <div class="design-selector bg-white p-4 rounded-lg shadow border border-gray-200 flex flex-wrap items-end gap-4" v-if="!loadingAllDesigns">
         <div class="flex-grow min-w-[250px]">
           <label for="designSelect" class="block text-sm font-medium text-gray-700 mb-1">Apply Design:</label>
           <select id="designSelect" v-model="selectedDesignId" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
               <option :value="null" disabled>-- Select a Design --</option>
               <option v-for="design in allDesigns" :key="design.id" :value="design.id">
                 {{ design.name }}
               </option>
           </select>
           <p v-if="loadingAppliedDesign" class="text-sm text-gray-500 mt-1">Loading design...</p>
         </div>
         <!-- Save Applied Design Button -->
         <div>
            <button 
                @click="handleSaveDesignChoice"
                :disabled="!selectedDesignId || savingDesignChoice || !canEditTemplate"
                class="px-4 py-2 text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap transition-colors duration-200"
                title="Save the selected design as the default for this template"
            >
                {{ saveButtonText }}
            </button>
         </div>
         <!-- Error/Info messages for Design Choice -->
         <div class="w-full mt-2 space-y-1">
             <p v-if="allDesigns.length === 0" class="text-sm text-gray-500 italic">No designs found.</p>
             <p v-if="saveDesignSuccessMessage" class="text-green-600 text-sm">{{ saveDesignSuccessMessage }}</p>
             <p v-if="saveError" class="text-red-600 text-sm">{{ saveError }}</p>
             <p v-if="!canEditTemplate && template && template.created_by" class="text-yellow-600 text-sm">Cannot save applied design: Template not owned by current user.</p>
         </div>
      </div>

      <!-- Side-by-Side Views -->
      <div class="view-container grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Legacy View (Original HTML) -->
         <div class="view-pane flex flex-col border border-gray-300 rounded-lg shadow bg-white overflow-hidden">
          <h2 class="text-lg font-semibold p-3 bg-gray-100 border-b border-gray-200 text-center text-gray-700">Native Legacy View</h2>
          <div class="iframe-wrapper flex-grow p-1 bg-gray-50">
            <iframe 
              :srcdoc="template.legacy_html_content || '<div class=p-4 italic text-gray-500>No legacy HTML content found.</div>'" 
              title="Native Legacy Email Preview"
              class="w-full h-full border-0"
            ></iframe>
          </div>
        </div>
        <!-- New Design Preview (Using Edited Content) -->
        <div class="view-pane flex flex-col border border-gray-300 rounded-lg shadow bg-white overflow-hidden">
          <h2 class="text-lg font-semibold p-3 bg-gray-100 border-b border-gray-200 text-center text-gray-700">Preview with Applied Design ({{ appliedDesign ? appliedDesign.name : 'None Selected' }})</h2>
          <div class="iframe-wrapper flex-grow p-1 bg-gray-50">
            <iframe 
              :srcdoc="newDesignHtml || '<div class=p-4 italic text-gray-500>Select a design or design not loaded.</div>'" 
              title="Applied Design Email Preview"
              v-if="selectedDesignId && appliedDesign && !loadingAppliedDesign"
              class="w-full h-full border-0"
            ></iframe>
             <div v-else-if="loadingAppliedDesign" class="loading-placeholder flex items-center justify-center h-full text-gray-500 italic">Loading design preview...</div>
             <div v-else class="loading-placeholder flex items-center justify-center h-full text-gray-500 italic">Please select a design to see the preview.</div>
          </div>
        </div>
      </div>
    </div>
    <!-- Template Not Found State -->
    <div v-else-if="!loadingTemplate && !errorTemplate && !template" class="text-center text-gray-500 mt-10">
      Template not found.
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { supabase } from '../supabase';
import RichTextEditor from '../components/RichTextEditor.vue';
import HtmlCodeEditor from '../components/HtmlCodeEditor.vue';
import * as prettier from "prettier/standalone";
import * as prettierPluginHtml from "prettier/plugins/html";

const route = useRoute();
const router = useRouter();
const template = ref(null);
const loadingTemplate = ref(true);
const errorTemplate = ref(null);
const allDesigns = ref([]);
const loadingAllDesigns = ref(false);
const errorAllDesigns = ref(null);
const selectedDesignId = ref(null);
const appliedDesign = ref(null);
const loadingAppliedDesign = ref(false);
const errorAppliedDesign = ref(null);
const savingDesignChoice = ref(false);
const saveError = ref(null);
const user = ref(null);

// Collections state
const allCollectionsForSelect = ref([]);
const loadingCollections = ref(false);
const errorCollections = ref(null);
const editingCollection = ref(false);
const selectedCollectionIdForEdit = ref(null);
const savingCollectionAssignment = ref(false);
const saveCollectionError = ref("");
const saveCollectionSuccess = ref(false);

// Content refs
const headerContent = ref('');
const bodyContent = ref('');
const footerContent = ref('');

// Save content state
const savingContent = ref(false);
const saveContentError = ref(null);
const saveContentSuccess = ref(false);

// --- RE-ADD Refs for Template Variables ---
const templateVariables = ref([]);
const loadingVariables = ref(false);
const errorVariables = ref(null);
// -----------------------------------------
// --- RE-ADD Ref for Placeholder Values ---
const placeholderValues = ref({});
// ---------------------------------------

const PLACEHOLDER_COMMENT = '<!--legacy_html_content_will_be_injected_here-->';

// --- RE-ADD Watcher for templateVariables to initialize placeholderValues ---
watch(templateVariables, (newVariables) => {
  const currentValues = { ...placeholderValues.value }; 
  const newValues = {};
  if (newVariables && Array.isArray(newVariables)) {
      newVariables.forEach(v => {
        if (v && v.variable_name) {
            newValues[v.variable_name] = currentValues[v.variable_name] || v.sample_value || ''; 
        }
      });
  }
  placeholderValues.value = newValues; 
}, { deep: false }); 
// -----------------------------------------------------------------------

const canEditTemplate = computed(() => {
    if (!template.value || !template.value.created_by) return true; 
    return user.value && user.value.id === template.value.created_by;
});

const saveButtonText = computed(() => {
    return savingDesignChoice.value ? 'Saving...' : 'Save Applied Design';
});

const saveContentButtonText = computed(() => {
    return savingContent.value ? 'Saving Content...' : 'Save Content';
});

const BODY_PLACEHOLDER = '<!--body_content_placeholder-->';
const HEADER_PLACEHOLDER = '<!--header_content_placeholder-->';
const FOOTER_PLACEHOLDER = '<!--footer_content_placeholder-->';

const saveDesignSuccessMessage = ref(null);

async function fetchCurrentUser() {
  const { data: { session } } = await supabase.auth.getSession();
  user.value = session?.user ?? null;
}

async function fetchAllCollectionsForSelect() {
  loadingCollections.value = true;
  errorCollections.value = null;
  try {
    const { data, error } = await supabase
      .from('collections')
      .select('id, name')
      .order('name', { ascending: true });
    if (error) throw error;
    allCollectionsForSelect.value = data || [];
  } catch (e) {
    console.error('Error fetching all collections for select:', e);
    errorCollections.value = e;
  } finally {
    loadingCollections.value = false;
  }
}

function getCollectionName(collectionId) {
    if (!collectionId) return ''; 
    const found = allCollectionsForSelect.value.find(c => c.id === collectionId);
    return found ? found.name : 'Unknown Collection'; // Or could return 'Loading...' if collections not yet loaded
}

async function fetchAllDesigns() {
  loadingAllDesigns.value = true;
  errorAllDesigns.value = null;
  try {
    const { data, error } = await supabase
      .from('designs')
      .select('id, name')
      .order('name', { ascending: true });
    if (error) throw error;
    allDesigns.value = data || [];
  } catch (e) {
    console.error('Error fetching all designs:', e);
    errorAllDesigns.value = e;
  } finally {
    loadingAllDesigns.value = false;
  }
}

async function fetchDesignById(designId) {
  if (!designId) {
    appliedDesign.value = null;
    return;
  }
  loadingAppliedDesign.value = true;
  errorAppliedDesign.value = null;
  try {
    const { data, error } = await supabase
      .from('designs')
      .select('*')
      .eq('id', designId)
      .single();
    if (error) {
      if (error.code === 'PGRST116') appliedDesign.value = null;
      else throw error;
    } else {
      appliedDesign.value = data;
    }
  } catch (e) {
    console.error(`Error fetching design by ID ${designId}:`, e);
    errorAppliedDesign.value = e;
  } finally {
    loadingAppliedDesign.value = false;
  }
}

async function fetchTemplateVariables(templateId) {
    if (!templateId) {
        templateVariables.value = [];
        return;
    }
    loadingVariables.value = true;
    errorVariables.value = null;
    try {
        const { data, error } = await supabase
            .from('template_variables')
            .select('id, variable_name, description, sample_value')
            .eq('template_id', templateId)
            .order('variable_name');
        
        if (error) throw error;
        templateVariables.value = data || [];
        console.log('Fetched Variables:', templateVariables.value);
    } catch (e) {
        console.error(`Error fetching variables for template ${templateId}:`, e);
        errorVariables.value = e;
        templateVariables.value = [];
    } finally {
        loadingVariables.value = false;
    }
}

async function fetchTemplate(templateId) {
  if (!templateId) return;
  loadingTemplate.value = true;
  errorTemplate.value = null;
  template.value = null;
  headerContent.value = '';
  bodyContent.value = '';
  footerContent.value = '';
  
  try {
    const { data, error } = await supabase
      .from('templates')
      .select('*, collection_id')
      .eq('id', templateId)
      .single();
    if (error) {
      if (error.code === 'PGRST116') {
        template.value = null;
        errorTemplate.value = new Error('Template not found.');
      } else throw error;
    } else {
      template.value = data;
      if (template.value) {
          headerContent.value = template.value.header_content || '';
          bodyContent.value = template.value.body_content || '';
          footerContent.value = template.value.footer_content || '';
          selectedDesignId.value = template.value.applied_design_id || null;
          selectedCollectionIdForEdit.value = template.value.collection_id || null;

          let rawBody = template.value.body_content || '';
          try {
              bodyContent.value = await prettier.format(rawBody, { parser: "html", plugins: [prettierPluginHtml] });
          } catch (formatError) {
              console.error('Prettier formatting failed for body:', formatError);
              bodyContent.value = rawBody; 
          }
          await fetchTemplateVariables(template.value.id);
      }
    }
  } catch (e) {
    console.error(`Error fetching template ${templateId}:`, e);
    errorTemplate.value = e;
  } finally {
    loadingTemplate.value = false;
  }
}

async function handleSaveDesignChoice() {
    if (!template.value || !selectedDesignId.value) {
        saveError.value = "No template loaded or no design selected.";
        return;
    }
    await fetchCurrentUser();
    if (!user.value) {
        saveError.value = "You must be logged in to save.";
        return;
    }
    if (!canEditTemplate.value) {
         saveError.value = "You don't have permission to edit this template.";
         return;
    }
    savingDesignChoice.value = true;
    saveError.value = null;
    saveDesignSuccessMessage.value = null;
    try {
        const { error: updateError } = await supabase
            .from('templates')
            .update({ applied_design_id: selectedDesignId.value })
            .eq('id', template.value.id);
        if (updateError) throw updateError;
        template.value.applied_design_id = selectedDesignId.value; 
        saveDesignSuccessMessage.value = "Applied design saved successfully!";
        setTimeout(() => { saveDesignSuccessMessage.value = null; }, 3000);
    } catch(e) {
        console.error('Error saving applied design:', e);
        saveError.value = `Failed to save: ${e.message}`;
    } finally {
        savingDesignChoice.value = false;
    }
}

async function handleSaveContent() {
    if (!template.value) return;
    await fetchCurrentUser();
    if (!user.value) {
        saveContentError.value = "You must be logged in to save content.";
        return;
    }
     if (!canEditTemplate.value) {
         saveContentError.value = "You don't have permission to edit this template content.";
         return;
    }
    savingContent.value = true;
    saveContentError.value = null;
    saveContentSuccess.value = false;
    const contentToUpdate = {
        header_content: headerContent.value,
        body_content: bodyContent.value,
        footer_content: footerContent.value
    };
    try {
        const { error } = await supabase
            .from('templates')
            .update(contentToUpdate)
            .eq('id', template.value.id);
        if (error) throw error;
        saveContentSuccess.value = true;
        template.value.header_content = headerContent.value;
        template.value.body_content = bodyContent.value;
        template.value.footer_content = footerContent.value;
        setTimeout(() => { saveContentSuccess.value = false; }, 3000); 
    } catch (e) {
        console.error('Error saving content:', e);
        saveContentError.value = `Failed to save content: ${e.message}`;
    } finally {
        savingContent.value = false;
    }
}

const newDesignHtml = computed(() => {
  if (!template.value || !appliedDesign.value) {
    return '<div>Template or Design not loaded.</div>';
  }
  let scaffold = appliedDesign.value.html_scaffold || '';
  const css = appliedDesign.value.css_scaffold || '';
  const assets = appliedDesign.value.assets || {};
  const headerHtml = headerContent.value || '';
  const bodyHtml = bodyContent.value || '';
  const footerHtml = footerContent.value || '';
  const assetRegex = /\{\{assets\.([\w_]+?)\}\}/g;
  scaffold = scaffold.replace(assetRegex, (match, assetKey) => assets[assetKey] || match);
  let finalHtml = '';
  if (scaffold.includes(BODY_PLACEHOLDER)) {
      finalHtml = scaffold
          .replace(HEADER_PLACEHOLDER, headerHtml)
          .replace(BODY_PLACEHOLDER, bodyHtml)
          .replace(FOOTER_PLACEHOLDER, footerHtml);
  } else {
      let headerPart = '';
      let footerPart = '';
      if (scaffold.includes(HEADER_PLACEHOLDER)) {
          headerPart = scaffold.replace(HEADER_PLACEHOLDER, headerHtml).replace(FOOTER_PLACEHOLDER, ''); 
      }
      if (scaffold.includes(FOOTER_PLACEHOLDER)) {
          footerPart = scaffold.replace(FOOTER_PLACEHOLDER, footerHtml).replace(HEADER_PLACEHOLDER, ''); 
      }
      finalHtml = headerPart + bodyHtml + footerPart;
      if (!headerPart && !footerPart && scaffold.trim()){
          console.warn('[newDesignHtml] Design scaffold has no known placeholders, but has content. Rendering header+body+footer sequentially.');
      }
  }
  return `<style>${css}</style>${finalHtml}`;
});

watch(selectedDesignId, (newId, oldId) => {
  if (newId && newId !== oldId) fetchDesignById(newId);
  else if (!newId) appliedDesign.value = null;
}, { immediate: true }); 

onMounted(async () => {
  await fetchCurrentUser(); 
  await fetchAllDesigns();
  await fetchAllCollectionsForSelect();
  await fetchTemplate(route.params.id);
});

watch(() => route.params.id, async (newTemplateId) => {
  if (newTemplateId) {
    await fetchCurrentUser(); 
    await fetchAllDesigns();
    await fetchAllCollectionsForSelect();
    await fetchTemplate(newTemplateId);
  }
}, { immediate: false });

async function handleSaveCollectionAssignment() {
  if (!template.value || !canEditTemplate.value) {
    saveCollectionError.value = "Cannot save: No template loaded or no permission.";
    return;
  }
  savingCollectionAssignment.value = true;
  saveCollectionError.value = "";
  saveCollectionSuccess.value = false;
  try {
    const { error } = await supabase
      .from('templates')
      .update({ collection_id: selectedCollectionIdForEdit.value })
      .eq('id', template.value.id);
    if (error) throw error;
    template.value.collection_id = selectedCollectionIdForEdit.value;
    saveCollectionSuccess.value = true;
    editingCollection.value = false;
    setTimeout(() => { saveCollectionSuccess.value = false; }, 3000);
  } catch (e) {
    console.error('Error saving collection assignment:', e);
    saveCollectionError.value = `Failed: ${e.message}`;
  } finally {
    savingCollectionAssignment.value = false;
  }
}

</script> 
