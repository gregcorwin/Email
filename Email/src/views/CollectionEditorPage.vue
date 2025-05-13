<template>
  <div class="collection-editor-page max-w-2xl mx-auto">
    <router-link :to="{ name: 'CollectionsList' }" class="inline-flex items-center text-blue-600 hover:text-blue-800 mb-6 group">
      <svg class="w-4 h-4 mr-2 transition-transform duration-200 group-hover:-translate-x-1" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg>
      Back to Collections
    </router-link>

    <h1 class="text-3xl font-bold mb-6 text-gray-700">{{ pageTitle }}</h1>

    <div v-if="loading && mode === 'edit'" class="text-center text-gray-500 py-6">Loading collection data...</div>
    <div v-else-if="error" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6" role="alert">
      <strong class="font-bold">Error:</strong>
      <span class="block sm:inline"> {{ error.message || 'Could not load data.' }}</span>
    </div>

    <form v-else @submit.prevent="handleSubmit" class="space-y-6 bg-white p-6 rounded-lg shadow border border-gray-200">
      <div>
        <label for="collection-name" class="block text-sm font-medium text-gray-700">Collection Name</label>
        <input 
          type="text" 
          id="collection-name" 
          v-model="collectionData.name" 
          required 
          class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
        />
      </div>
      <div>
        <label for="collection-description" class="block text-sm font-medium text-gray-700">Description (Optional)</label>
        <textarea 
          id="collection-description" 
          v-model="collectionData.description" 
          rows="4"
          class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
        ></textarea>
      </div>
      <div class="pt-4 flex justify-end space-x-3">
        <router-link 
          :to="{ name: 'CollectionsList' }" 
          class="px-4 py-2 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-gray-200 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors duration-200"
        >
          Cancel
        </router-link>
        <button 
          type="submit" 
          :disabled="submitting"
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
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { supabase } from '../supabase';

const props = defineProps({
  mode: { type: String, required: true, validator: (val) => ['create', 'edit'].includes(val) },
  id: { type: String, default: null } 
});

const router = useRouter();
const user = ref(null);

const collectionData = ref({
  name: '',
  description: '',
});

const loading = ref(false);
const error = ref(null);
const submitting = ref(false);
const submitError = ref(null);

const pageTitle = computed(() => props.mode === 'create' ? 'Create New Collection' : 'Edit Collection');
const submitButtonText = computed(() => {
  if (submitting.value) return props.mode === 'create' ? 'Creating...' : 'Saving...';
  return props.mode === 'create' ? 'Create Collection' : 'Save Changes';
});

async function fetchCurrentUser() {
  const { data: { session } } = await supabase.auth.getSession();
  user.value = session?.user ?? null;
}

async function fetchCollectionData() {
  if (props.mode !== 'edit' || !props.id) return;
  loading.value = true;
  error.value = null;
  try {
    const { data, error: fetchError } = await supabase
      .from('collections')
      .select('id, name, description, created_by') 
      .eq('id', props.id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        error.value = new Error('Collection not found.');
      } else {
        throw fetchError;
      }
      collectionData.value = { name: '', description: '' };
    } else {
      collectionData.value = { name: data.name, description: data.description || '' }; // RLS ensures we can only fetch allowed data
    }
  } catch (e) {
    console.error('Error fetching collection data:', e);
    error.value = e;
  } finally {
    loading.value = false;
  }
}

async function handleSubmit() {
  await fetchCurrentUser(); 
  if (!user.value) {
    submitError.value = 'You must be logged in to save collections.';
    return;
  }

  submitting.value = true;
  submitError.value = null;

  const dataToSave = {
      name: collectionData.value.name,
      description: collectionData.value.description || null, // Ensure null if empty
  };

  let result = null;
  try {
    if (props.mode === 'create') {
      dataToSave.created_by = user.value.id;
      result = await supabase.from('collections').insert(dataToSave).select().single();
    } else { 
      // RLS will enforce if the user can update this collection
      result = await supabase.from('collections').update(dataToSave).eq('id', props.id).select().single();
    }

    const { error: upsertError, data: upsertedData } = result;
    if (upsertError) throw upsertError;

    console.log('Save successful:', upsertedData);
    router.push({ name: 'CollectionsList' }); 

  } catch (e) {
    console.error('Error saving collection:', e);
    submitError.value = `Failed to save collection: ${e.message}`;
  } finally {
    submitting.value = false;
  }
}

onMounted(async () => {
  await fetchCurrentUser();
  if (props.mode === 'edit') {
    await fetchCollectionData();
  }
});

</script> 