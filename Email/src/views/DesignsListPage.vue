<template>
  <div class="designs-list-page">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-3xl font-bold text-gray-700">My Designs</h1>
      <router-link 
        :to="{ name: 'DesignCreate' }"
        class="bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded transition-colors duration-200 inline-flex items-center"
      >
        <svg class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd"></path></svg>
        Create New Design
      </router-link>
    </div>
    
    <div v-if="loading" class="text-center text-gray-500">
      Loading designs...
    </div>
    
    <div v-else-if="error" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6" role="alert">
      <strong class="font-bold">Error:</strong>
      <span class="block sm:inline"> {{ error.message }}</span>
    </div>
    
    <ul v-else-if="designs.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <li v-for="design in designs" :key="design.id" class="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow duration-200 border border-gray-200 flex flex-col justify-between">
        <div>
          <h2 class="text-lg font-semibold text-blue-700 mb-2">{{ design.name }}</h2>
          <p v-if="design.description" class="text-gray-600 text-sm mb-3">
            {{ design.description }}
          </p>
        </div>
        <div class="mt-auto text-right">
           <router-link 
            :to="{ name: 'DesignEdit', params: { id: design.id } }"
            class="text-sm text-blue-600 hover:underline"
          >
            Edit
          </router-link>
          <!-- Add Delete button later -->
        </div>
      </li>
    </ul>
    
    <div v-else class="text-center text-gray-500 mt-8">
      You haven't created any designs yet.
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { supabase } from '../supabase'; 

const designs = ref([]);
const loading = ref(true);
const error = ref(null);

async function fetchDesigns() {
  loading.value = true;
  error.value = null;
  try {
    // TODO: Later, filter by logged-in user: .eq('created_by', userId)
    const { data, error: fetchError } = await supabase
      .from('designs')
      .select('id, name, description') // Fetch necessary fields
      .order('created_at', { ascending: false }); // Show newest first

    if (fetchError) throw fetchError;
    designs.value = data || [];
  } catch (e) {
    console.error('Error fetching designs:', e);
    error.value = e;
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  fetchDesigns();
});
</script>

<style>
/* Using Tailwind - no scoped styles needed */
</style> 