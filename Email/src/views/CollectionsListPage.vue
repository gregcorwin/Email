<template>
  <div class="collections-list-page">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-3xl font-bold text-gray-700">Collections</h1>
      <router-link 
        :to="{ name: 'CollectionCreate' }"
        class="px-4 py-2 text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 inline-flex items-center transition-colors duration-200"
      >
        <svg class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd"></path></svg>
        Create New Collection
      </router-link>
    </div>
    
    <div v-if="loading" class="text-center text-gray-500">
      Loading collections...
    </div>
    
    <div v-else-if="error" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6" role="alert">
      <strong class="font-bold">Error:</strong>
      <span class="block sm:inline"> {{ error.message }}</span>
    </div>
    
    <ul v-else-if="collections.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <li v-for="collection in collections" :key="collection.id" class="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow duration-200 border border-gray-200 flex flex-col justify-between">
        <div>
          <h2 class="text-lg font-semibold text-gray-800 mb-2">{{ collection.name }}</h2>
          <p v-if="collection.description" class="text-gray-600 text-sm mb-3">
            {{ collection.description }}
          </p>
          <!-- Add template count later if needed -->
        </div>
        <div class="mt-auto flex justify-end space-x-3">
          <router-link 
            :to="{ name: 'CollectionEdit', params: { id: collection.id } }"
            class="text-sm text-blue-600 hover:underline"
            v-if="canEditOrDelete(collection)"
          >
            Edit
          </router-link>
          <button 
             @click="confirmDelete(collection)"
             class="text-sm text-red-600 hover:underline"
             v-if="canEditOrDelete(collection)"
          >
            Delete
          </button>
        </div>
      </li>
    </ul>
    
    <div v-else class="text-center text-gray-500 mt-8">
      You haven't created any collections yet.
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { supabase } from '../supabase'; 
import { useRouter } from 'vue-router';

const collections = ref([]);
const loading = ref(true);
const error = ref(null);
const user = ref(null);
const userRole = ref(null);
const router = useRouter();

async function fetchCurrentUserAndRole() {
  const { data: { session } } = await supabase.auth.getSession();
  user.value = session?.user ?? null;
  if (user.value) {
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.value.id)
      .single();
    if (roleError && roleError.code !== 'PGRST116') { // Ignore 'not found' error
      console.error('Error fetching user role:', roleError);
    }
    userRole.value = roleData?.role || null;
  }
}

async function fetchCollections() {
  loading.value = true;
  error.value = null;
  try {
    // RLS handles filtering, so we select all
    const { data, error: fetchError } = await supabase
      .from('collections')
      .select('id, name, description, created_by') 
      .order('created_at', { ascending: false }); 

    if (fetchError) throw fetchError;
    collections.value = data || [];
  } catch (e) {
    console.error('Error fetching collections:', e);
    error.value = e;
  } finally {
    loading.value = false;
  }
}

const isAdmin = computed(() => userRole.value === 'app_admin');

function canEditOrDelete(collection) {
  if (!user.value) return false;
  return isAdmin.value || collection.created_by === user.value.id;
}

function confirmDelete(collection) {
  if (!canEditOrDelete(collection)) return;
  if (window.confirm(`Are you sure you want to delete the collection "${collection.name}"? This will also remove it from any assigned templates.`)) {
    deleteCollection(collection.id);
  }
}

async function deleteCollection(id) {
  try {
    // RLS will prevent unauthorized deletes
    const { error: deleteError } = await supabase
      .from('collections')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;
    
    // Remove from list locally
    collections.value = collections.value.filter(c => c.id !== id);
    console.log('Collection deleted successfully');
    // Add user feedback (e.g., toast notification) here if desired

  } catch (e) {
    console.error('Error deleting collection:', e);
    error.value = e; // Show error message
    // Add user feedback (e.g., toast notification) here if desired
  }
}

onMounted(async () => {
  await fetchCurrentUserAndRole();
  await fetchCollections();
});
</script>

<style>
/* Using Tailwind */
</style> 