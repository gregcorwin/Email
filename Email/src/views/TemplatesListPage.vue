<template>
  <div class="template-list-page">
    <h1 class="text-3xl font-bold mb-6 text-gray-700">Email Templates</h1>
    
    <div v-if="loading" class="text-center text-gray-500">
      Loading templates...
    </div>
    
    <div v-else-if="error" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6" role="alert">
      <strong class="font-bold">Error:</strong>
      <span class="block sm:inline"> {{ error.message }}</span>
    </div>
    
    <ul v-else-if="templates.length > 0" class="space-y-4">
      <li v-for="template in templates" :key="template.id">
        <router-link 
          :to="{ name: 'TemplateDetail', params: { id: template.id } }" 
          class="block bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow duration-200 border border-gray-200"
        >
          <h2 class="text-xl font-semibold text-blue-600 mb-2">{{ template.name }}</h2>
          <p v-if="template.category" class="text-sm text-gray-500 mb-1">
            Category: <span class="font-medium text-gray-700">{{ template.category }}</span>
          </p>
          <p v-if="template.description" class="text-gray-600 text-sm">
            {{ template.description }}
          </p>
        </router-link>
      </li>
    </ul>
    
    <div v-else class="text-center text-gray-500 mt-8">
      No templates found.
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { supabase } from '../supabase'; // Adjust path if your supabase client is elsewhere

const templates = ref([]);
const loading = ref(true);
const error = ref(null);

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
  } catch (e) {
    console.error('Error fetching templates:', e);
    error.value = e;
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  fetchTemplates();
});
</script>

<style>
/* Removed scoped styles, using Tailwind utility classes now */
</style> 