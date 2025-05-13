<template>
  <div class="design-editor-page max-w-4xl mx-auto">
    <h1 class="text-3xl font-bold mb-6 text-gray-700">{{ pageTitle }}</h1>

    <div v-if="loading" class="text-center text-gray-500 py-6">
      Loading design data...
    </div>
    
    <div v-else-if="error" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6" role="alert">
      <strong class="font-bold">Error:</strong>
      <span class="block sm:inline"> {{ error.message || 'Could not load design data.' }}</span>
    </div>

    <form v-else @submit.prevent="handleSubmit" class="space-y-6 bg-white p-6 rounded-lg shadow border border-gray-200">
      
      <!-- Access Denied Message -->
      <div v-if="mode === 'edit' && !canEdit" class="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded relative mb-6" role="alert">
         You do not have permission to edit this design.
      </div>

      <div>
        <label for="design-name" class="block text-sm font-medium text-gray-700">Design Name</label>
        <input 
          type="text" 
          id="design-name" 
          v-model="designData.name" 
          required 
          :disabled="!canEdit"
          class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
        />
      </div>

      <div>
        <label for="design-description" class="block text-sm font-medium text-gray-700">Description</label>
        <textarea 
          id="design-description" 
          v-model="designData.description" 
          rows="3"
          :disabled="!canEdit"
          class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
        ></textarea>
      </div>

      <!-- Asset URL Inputs -->
      <fieldset class="border border-gray-200 p-4 rounded-md">
          <legend class="text-sm font-medium text-gray-700 px-1">Asset URLs (Optional)</legend>
          <div class="space-y-3 mt-2">
              <div>
                  <label for="asset-header-img" class="block text-xs font-medium text-gray-600">Header Image URL</label>
                  <input 
                      type="url" 
                      id="asset-header-img" 
                      v-model="headerImageUrl"
                      :disabled="!canEdit"
                      placeholder="https://.../header.png"
                      class="mt-1 block w-full px-3 py-1.5 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-xs"
                  />
              </div>
              <div>
                  <label for="asset-footer-logo" class="block text-xs font-medium text-gray-600">Footer Logo URL</label>
                  <input 
                      type="url" 
                      id="asset-footer-logo" 
                      v-model="footerLogoUrl"
                      :disabled="!canEdit"
                      placeholder="https://.../logo.png"
                      class="mt-1 block w-full px-3 py-1.5 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-xs"
                  />
              </div>
          </div>
      </fieldset>
      <!-- End Asset URL Inputs -->

      <div>
        <label for="design-html" class="block text-sm font-medium text-gray-700">HTML Scaffold</label>
        <textarea 
          id="design-html" 
          v-model="designData.html_scaffold" 
          rows="15" 
          placeholder="Enter base HTML. Use <!--header_content_placeholder-->, <!--body_content_placeholder-->, <!--footer_content_placeholder-->. Omit body placeholder to just wrap existing content."
          :disabled="!canEdit"
          class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm font-mono"
        ></textarea>
        <p class="mt-1 text-xs text-gray-500">Use placeholders like <code v-pre>{{assets.header_image_url}}</code> for images defined in Asset URLs section.</p>
      </div>

      <div>
        <label for="design-css" class="block text-sm font-medium text-gray-700">CSS Scaffold</label>
        <textarea 
          id="design-css" 
          v-model="designData.css_scaffold" 
          rows="10" 
          placeholder="Enter CSS rules that apply globally to this design."
          :disabled="!canEdit"
          class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm font-mono"
        ></textarea>
      </div>

      <div class="pt-4 flex justify-end space-x-3">
        <router-link 
          :to="{ name: 'DesignsList' }" 
          class="px-4 py-2 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-gray-200 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors duration-200"
        >
          Cancel
        </router-link>
        <button 
          type="submit" 
          :disabled="submitting || !canEdit"
          class="px-4 py-2 text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
        >
          {{ submitButtonText }}
        </button>
      </div>
       <p v-if="submitError" class="text-red-600 text-sm mt-2">{{ submitError }}</p>

    </form>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { supabase } from '../supabase';

const props = defineProps({
  mode: { type: String, required: true, validator: (val) => ['create', 'edit'].includes(val) },
  id: { type: String, default: null } 
});

const router = useRouter();
const user = ref(null);

// Main design data
const designData = ref({
  name: '',
  description: '',
  html_scaffold: '',
  css_scaffold: '',
  created_by: null, 
  id: null
});

// --- Use individual refs for assets --- 
const headerImageUrl = ref('');
const footerLogoUrl = ref('');
// -------------------------------------

// Other state refs
const loading = ref(false);
const error = ref(null);
const submitting = ref(false);
const submitError = ref(null);

// Computed properties
const pageTitle = computed(() => props.mode === 'create' ? 'Create New Design' : 'Edit Design');
const submitButtonText = computed(() => {
  if (submitting.value) return props.mode === 'create' ? 'Creating...' : 'Saving...';
  return props.mode === 'create' ? 'Create Design' : 'Save Changes';
});
const canEdit = computed(() => {
  if (props.mode === 'create') return true;
  if (!user.value || !designData.value) return false;
  return designData.value && user.value.id === designData.value.created_by; 
});

async function fetchCurrentUser() {
  const { data: { session } } = await supabase.auth.getSession();
  user.value = session?.user ?? null;
}

async function fetchDesignData() {
  if (props.mode !== 'edit' || !props.id) return;
  loading.value = true;
  error.value = null;
  try {
    const { data, error: fetchError } = await supabase
      .from('designs')
      .select('*') 
      .eq('id', props.id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        error.value = new Error('Design not found.');
      } else {
        throw fetchError;
      }
      // Ensure reset even on fetch error
      designData.value = { name: '', description: '', html_scaffold: '', css_scaffold: '', created_by: null, id: props.id };
      headerImageUrl.value = ''; // Reset individual refs
      footerLogoUrl.value = '';
    } else {
      const { assets, ...mainData } = data;
      designData.value = { ...mainData };
      // Safely assign fetched assets to individual refs
      const fetchedAssets = assets || {};
      headerImageUrl.value = fetchedAssets.header_image_url || '';
      footerLogoUrl.value = fetchedAssets.footer_logo_url || '';
    }
  } catch (e) {
    console.error('Error fetching design data:', e);
    error.value = e;
    headerImageUrl.value = ''; // Reset on error
    footerLogoUrl.value = '';
  } finally {
    loading.value = false;
  }
}

async function handleSubmit() {
  await fetchCurrentUser(); 
  if (!user.value) {
    submitError.value = 'You must be logged in to save designs.';
    return;
  }
  if (props.mode === 'edit' && !canEdit.value) {
     submitError.value = 'You do not have permission to edit this design.';
     return;
  }

  submitting.value = true;
  submitError.value = null;

  // Construct assets object from individual refs just before saving
  const currentAssets = {
      header_image_url: headerImageUrl.value || null,
      footer_logo_url: footerLogoUrl.value || null
  };
  // Clean empty keys if desired
  Object.keys(currentAssets).forEach(key => {
    if (currentAssets[key] === null) delete currentAssets[key];
  });

  const dataToSave = {
      name: designData.value.name,
      description: designData.value.description,
      html_scaffold: designData.value.html_scaffold,
      css_scaffold: designData.value.css_scaffold,
      assets: Object.keys(currentAssets).length > 0 ? currentAssets : null // Save null if no assets provided
  };

  let result = null;
  try {
    if (props.mode === 'create') {
      dataToSave.created_by = user.value.id;
      result = await supabase.from('designs').insert(dataToSave).select().single();
    } else { 
      result = await supabase.from('designs').update(dataToSave).eq('id', props.id).select().single();
    }

    const { error: upsertError, data: upsertedData } = result;
    if (upsertError) throw upsertError;

    console.log('Save successful:', upsertedData);
    router.push({ name: 'DesignsList' }); 

  } catch (e) {
    console.error('Error saving design:', e);
    submitError.value = `Failed to save design: ${e.message}`;
  } finally {
    submitting.value = false;
  }
}

onMounted(async () => {
  await fetchCurrentUser();
  if (props.mode === 'edit') {
    await fetchDesignData();
  } else {
     // Ensure clean state for create mode
     designData.value = { name: '', description: '', html_scaffold: '', css_scaffold: '', created_by: null, id: null };
     headerImageUrl.value = '';
     footerLogoUrl.value = '';
  }
});

watch(() => props.id, async (newId) => {
  if (props.mode === 'edit' && newId && newId !== designData.value.id) {
     await fetchDesignData(); // fetchDesignData now handles resetting assets correctly
  }
});

</script>

<style>
/* Using Tailwind */
</style> 