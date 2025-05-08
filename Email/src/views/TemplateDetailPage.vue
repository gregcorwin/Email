<template>
  <div class="template-detail-page">
    <router-link to="/templates">&larr; Back to Templates</router-link>
    <div v-if="loading">Loading template details...</div>
    <div v-if="error" class="error">Error fetching template: {{ error.message }}</div>
    <div v-if="template">
      <h1>{{ template.name }}</h1>
      <p v-if="template.category"><strong>Category:</strong> {{ template.category }}</p>
      <p v-if="template.description"><strong>Description:</strong> {{ template.description }}</p>
      <p v-if="template.legacy_url"><strong>Legacy URL:</strong> <a :href="template.legacy_url" target="_blank">{{ template.legacy_url }}</a></p>
      
      <h2>Legacy View</h2>
      <div class="iframe-container">
        <iframe :srcdoc="template.legacy_html_content || '<div>No HTML content found or legacy URL could not be fetched.</div>'" v-if="template" title="Legacy Email Preview"></iframe>
        <div v-else-if="!template && !loading">Template data not available.</div>
      </div>
    </div>
    <div v-else-if="!loading && !error">Template not found.</div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { supabase } from '../supabase'; // Adjust path if necessary

const route = useRoute();
const template = ref(null);
const loading = ref(true);
const error = ref(null);

async function fetchTemplate(templateId) {
  if (!templateId) return;
  loading.value = true;
  error.value = null;
  template.value = null;
  try {
    const { data, error: fetchError } = await supabase
      .from('templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        console.warn(`Template with ID ${templateId} not found.`);
        template.value = null;
      } else {
        throw fetchError;
      }
    } else {
      template.value = data;
    }
  } catch (e) {
    console.error(`Error fetching template ${templateId}:`, e);
    error.value = e;
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  fetchTemplate(route.params.id);
});

watch(() => route.params.id, (newId) => {
  fetchTemplate(newId);
});
</script>

<style scoped>
.template-detail-page {
  max-width: 900px;
  margin: 0 auto;
  padding: 20px;
}

.iframe-container {
  border: 1px solid #ccc;
  margin-top: 20px;
  width: 100%;
  height: 600px; /* Adjust as needed */
}

iframe {
  width: 100%;
  height: 100%;
  border: none;
}

.error {
  color: red;
}

a {
  color: #42b983;
  text-decoration: none;
}
a:hover {
  text-decoration: underline;
}
</style> 