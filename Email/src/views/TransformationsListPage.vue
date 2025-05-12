<template>
  <div class="transformations-list-page">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-3xl font-bold text-gray-700">Transformation Sets</h1>
      <router-link 
        :to="{ name: 'TransformationSetCreate' }"
        class="bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded transition-colors duration-200 inline-flex items-center"
      >
        <svg class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd"></path></svg>
        Create New Set
      </router-link>
    </div>
    
    <div v-if="loading" class="text-center text-gray-500">
      Loading transformation sets...
    </div>
    
    <div v-else-if="error" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6" role="alert">
      <strong class="font-bold">Error:</strong>
      <span class="block sm:inline"> {{ error.message }}</span>
    </div>
    
    <ul v-else-if="transformationSets.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <li v-for="set in transformationSets" :key="set.id" class="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow duration-200 border border-gray-200 flex flex-col justify-between">
        <div>
          <h2 class="text-lg font-semibold text-purple-700 mb-2">{{ set.name }}</h2>
          <p v-if="set.description" class="text-gray-600 text-sm mb-3">
            {{ set.description }}
          </p>
        </div>
        <div class="mt-auto text-right">
           <router-link 
            :to="{ name: 'TransformationSetEdit', params: { id: set.id } }"
            class="text-sm text-purple-600 hover:underline"
          >
            Edit
          </router-link>
          <!-- Add Delete button later -->
        </div>
      </li>
    </ul>
    
    <div v-else class="text-center text-gray-500 mt-8">
      You haven't created any transformation sets yet.
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { supabase } from '../supabase'; 

const transformationSets = ref([]);
const loading = ref(true);
const error = ref(null);

async function fetchTransformationSets() {
  loading.value = true;
  error.value = null;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !session.user) {
        error.value = new Error("You must be logged in to view transformation sets.");
        transformationSets.value = [];
        return;
    }

    const { data, error: fetchError } = await supabase
      .from('transformation_sets')
      .select('id, name, description')
      .eq('created_by', session.user.id) // Filter by current user
      .order('created_at', { ascending: false });

    if (fetchError) throw fetchError;
    transformationSets.value = data || [];
  } catch (e) {
    console.error('Error fetching transformation sets:', e);
    error.value = e;
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  fetchTransformationSets();
});
</script>

<style>
/* Using Tailwind */
</style> 