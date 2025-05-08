<template>
  <div class="code-editor-wrapper border border-gray-300 rounded-md shadow-sm overflow-hidden" :style="{ height: height }">
    <Codemirror
      v-model="localValue" 
      placeholder="Enter HTML code..."
      :style="{ height: '100%' }"
      :autofocus="autofocus"
      :indent-with-tab="true"
      :tab-size="2"
      :extensions="extensions"
      :disabled="disabled"
      @update:modelValue="onUpdate"
      @ready="handleReady"
    />
  </div>
</template>

<script setup>
import { ref, shallowRef, watch } from 'vue';
import { Codemirror } from 'vue-codemirror';
import { EditorView } from '@codemirror/view'; 
import { syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language';

const props = defineProps({
  modelValue: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
  height: { type: String, default: '800px' },
  autofocus: { type: Boolean, default: false },
});

const emit = defineEmits(['update:modelValue']);

const localValue = ref(props.modelValue);
watch(() => props.modelValue, (newValue) => {
  if (newValue !== localValue.value) {
    localValue.value = newValue;
  }
});

const extensions = [
    EditorView.lineWrapping, 
    syntaxHighlighting(defaultHighlightStyle)
];

const view = shallowRef();
const handleReady = (payload) => {
  view.value = payload.view;
};

const onUpdate = (value) => {
    localValue.value = value;
    emit('update:modelValue', value);
};

// Watch for external disabled changes (if needed, though prop binding might handle it)
// watch(() => props.disabled, (isDisabled) => {
//   // CodeMirror doesn't have a direct disable like <textarea>
//   // You might need to manage this via extensions or CSS (e.g., pointer-events: none)
// });

</script>

<style>
/* Optional: Global styles for CodeMirror if needed */
</style> 