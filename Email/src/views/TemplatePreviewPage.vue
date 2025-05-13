<template>
  <div class="template-preview-page p-4 md:p-6">
    <div class="mb-4">
      <router-link :to="galleryReturnPath" class="inline-flex items-center text-blue-600 hover:text-blue-800 group">
        <svg class="w-4 h-4 mr-2 transition-transform duration-200 group-hover:-translate-x-1" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg>
        Back to Gallery
      </router-link>
    </div>
    <h1 class="text-2xl font-bold text-gray-700 mb-4">Full Template Preview: {{ template?.name }}</h1>
    <div v-if="loading" class="text-center text-gray-500 py-8">Loading preview...</div>
    <div v-else-if="error" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded" role="alert">
      Error loading template preview: {{ error.message }}
    </div>
    <div v-else-if="template && fullPreviewHtml" class="preview-iframe-container bg-white border rounded-lg shadow-lg overflow-hidden" style="height: 80vh;">
      <iframe :srcdoc="fullPreviewHtml" class="w-full h-full border-0" title="Full Template Preview"></iframe>
    </div>
    <div v-else class="text-center text-gray-500 py-8">Template data not available for preview.</div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { supabase } from '../supabase';
import * as prettier from "prettier/standalone";
import * as prettierPluginHtml from "prettier/plugins/html";

const props = defineProps({
  id: { type: String, required: true }
});

const route = useRoute();
const router = useRouter();

const template = ref(null);
const appliedDesign = ref(null);
const loading = ref(true);
const error = ref(null);

const BODY_PLACEHOLDER = '<!--body_content_placeholder-->';
const HEADER_PLACEHOLDER = '<!--header_content_placeholder-->';
const FOOTER_PLACEHOLDER = '<!--footer_content_placeholder-->';

const galleryReturnPath = computed(() => {
  let query = {};
  // Check for return context from the current route's query params
  if (route.query.returnToCollection) {
    query.collection = route.query.returnToCollection;
  } else if (route.query.returnToIds) {
    query.ids = route.query.returnToIds;
  }
  // If no specific context, it will just go to /gallery (which then prompts for selection)
  return { name: 'GalleryPage', query: query }; 
});

const fullPreviewHtml = computed(() => {
  if (!template.value || !appliedDesign.value) {
    // If there's no applied design, we might want to show just the body content, or specific sections.
    // For now, let's assume a design is usually expected for a "full" preview.
    // Or, fallback to legacy_html_content if no design is explicitly applied.
    if (template.value && !template.value.applied_design_id && template.value.legacy_html_content) {
        return template.value.legacy_html_content;
    }
    if (template.value && !appliedDesign.value) { // Template exists, but no design could be loaded/applied
        return template.value.body_content || template.value.legacy_html_content || '<p>No content or design to preview.</p>';
    }
    return '<div>Template or Design not fully loaded for preview.</div>';
  }

  let scaffold = appliedDesign.value.html_scaffold || '';
  const css = appliedDesign.value.css_scaffold || '';
  const assets = appliedDesign.value.assets || {};

  // Use template's specific header/body/footer if available, otherwise empty string
  const headerHtml = template.value.header_content || '';
  const bodyHtml = template.value.body_content || template.value.legacy_html_content || ''; 
  const footerHtml = template.value.footer_content || '';

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
          // If scaffold has content but no known placeholders, prepend it.
          finalHtml = scaffold + finalHtml;
      }
  }
  return `<style>${css}</style>${finalHtml}`;
});

async function fetchTemplateAndDesign() {
  loading.value = true;
  error.value = null;
  try {
    const { data: tmplData, error: tmplError } = await supabase
      .from('templates')
      .select('*, applied_design_id')
      .eq('id', props.id)
      .single();

    if (tmplError) throw tmplError;
    template.value = tmplData;

    if (tmplData && tmplData.applied_design_id) {
      const { data: designData, error: designError } = await supabase
        .from('designs')
        .select('*')
        .eq('id', tmplData.applied_design_id)
        .single();
      if (designError) {
        console.warn('Could not fetch applied design:', designError.message);
        // Proceed without applied design, or set an error
        appliedDesign.value = null; 
      } else {
        appliedDesign.value = designData;
      }
    } else {
      // No design applied, or no applied_design_id found
      // We might want a default "no scaffold" design object here
      // Or, ensure fullPreviewHtml handles appliedDesign.value being null gracefully
      appliedDesign.value = null; // Explicitly set to null if no design is linked
    }
  } catch (e) {
    console.error('Error fetching template/design for preview:', e);
    error.value = e;
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  fetchTemplateAndDesign();
});

</script>

<style scoped>
.preview-iframe-container {
  /* Ensures the iframe can take up the desired viewport height percentage */
}
</style> 