<template>
  <div class="template-card border rounded-lg shadow-md bg-white overflow-hidden flex flex-col">
    <!-- Thumbnail (iframe) -->
    <div class="thumbnail-wrapper h-64 border-b bg-gray-200 relative group">
      <iframe 
        :srcdoc="renderedHtmlContent" 
        class="w-full h-full border-0"
        sandbox="allow-scripts allow-same-origin"
        title="Template Preview"
      ></iframe>
      <router-link 
        :to="previewLinkObject"
        class="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 cursor-pointer"
        title="Preview Full Design"
      >
        <svg class="w-12 h-12 text-white opacity-80" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 000 2h6a1 1 0 100-2H7z" clip-rule="evenodd"></path><path d="M10 4.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM10 14a4 4 0 110-8 4 4 0 010 8z"></path></svg>
         <span class="sr-only">Preview Full Design</span>
      </router-link>
    </div>

    <!-- Card Content -->
    <div class="p-4 flex flex-col flex-grow">
      <h3 class="text-md font-semibold text-gray-800 mb-1 truncate" :title="template.name">{{ template.name }}</h3>
      <p class="text-xs text-gray-500 mb-1">
        Category: <span class="font-medium">{{ template.category || 'N/A' }}</span>
      </p>
      <p class="text-xs text-gray-500 mb-3">
        Collection: <span class="font-medium">{{ collectionName || 'N/A' }}</span>
      </p>
      
      <!-- Actions -->
      <div class="mt-auto pt-3 border-t border-gray-200 flex items-center justify-between">
        <router-link 
          :to="{ name: 'TemplateDetail', params: { id: template.id } }" 
          class="text-xs text-blue-600 hover:text-blue-800 hover:underline"
        >
          View Details/Edit
        </router-link>
        <label class="flex items-center space-x-2 cursor-pointer text-xs text-gray-700">
          <input 
            type="checkbox" 
            :checked="isSelectedForExport"
            @change="$emit('select-for-export', template.id)"
            class="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
          />
          <span>Select for Export</span>
        </label>
      </div>
    </div>
  </div>
</template>

<script setup>
import { defineProps, computed } from 'vue';

const props = defineProps({
  template: {
    type: Object,
    required: true,
  },
  collectionName: {
    type: String,
    default: 'N/A',
  },
  isSelectedForExport: {
    type: Boolean,
    default: false,
  },
  galleryContext: {
    type: Object,
    default: () => ({ type: 'none' })
  }
});

defineEmits(['select-for-export']);

// For now, just use legacy_html_content. We can enhance this later.
const renderedHtmlContent = computed(() => {
  return props.template.legacy_html_content || '<div class="p-4 text-sm text-gray-500 italic">No preview available.</div>';
});

// New computed property for the preview link
const previewLinkObject = computed(() => {
  let query = {};
  if (props.galleryContext) {
    if (props.galleryContext.type === 'collection' && props.galleryContext.id) {
      query.returnToCollection = props.galleryContext.id;
    } else if (props.galleryContext.type === 'ids' && props.galleryContext.ids) {
      query.returnToIds = props.galleryContext.ids; // ids should already be a string here
    }
  }
  return { 
    name: 'TemplatePreviewPage', 
    params: { id: props.template.id }, 
    query: query 
  };
});

</script>

<style scoped>
.thumbnail-wrapper iframe {
  transform-origin: top left;
  /* Consider adding a slight scale down if content often overflows, e.g., transform: scale(0.8); */
  /* Or ensure content within the iframe is responsive / fits smaller views */
}
/* Ensure the hover effect works well */
.group:hover .group-hover\:opacity-100 {
    opacity: 1;
}
</style> 