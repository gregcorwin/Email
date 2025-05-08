<template>
  <div class="template-list-page">
    <h1>Email Templates</h1>
    <div v-if="loading">Loading templates...</div>
    <div v-if="error" class="error">Error fetching templates: {{ error.message }}</div>
    <ul v-if="templates.length > 0">
      <li v-for="template in templates" :key="template.id">
        <router-link :to="{ name: 'TemplateDetail', params: { id: template.id } }">
          <h2>{{ template.name }}</h2>
          <p v-if="template.category">Category: {{ template.category }}</p>
          <p v-if="template.description">Description: {{ template.description }}</p>
        </router-link>
      </li>
    </ul>
    <div v-else-if="!loading && !error">No templates found.</div>
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

<style scoped>
.template-list-page {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

ul {
  list-style-type: none;
  padding: 0;
}

li {
  border: 1px solid #eee;
  padding: 15px;
  margin-bottom: 10px;
  border-radius: 5px;
  background-color: #f9f9f9;
}

li a {
  text-decoration: none;
  color: inherit;
}

li h2 {
  margin-top: 0;
  color: #42b983;
}

.error {
  color: red;
  margin-bottom: 15px;
}
</style> 