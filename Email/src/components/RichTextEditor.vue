<template>
  <div v-if="editor" class="tiptap-editor-wrapper border border-gray-300 rounded-md shadow-sm">
    <!-- Basic Toolbar -->
    <div class="toolbar p-2 border-b border-gray-300 bg-gray-50 flex flex-wrap gap-1">
      <button type="button" @click="editor.chain().focus().toggleBold().run()" :disabled="!editor.can().chain().focus().toggleBold().run()" :class="{ 'is-active': editor.isActive('bold') }" class="toolbar-button">
        Bold
      </button>
      <button type="button" @click="editor.chain().focus().toggleItalic().run()" :disabled="!editor.can().chain().focus().toggleItalic().run()" :class="{ 'is-active': editor.isActive('italic') }" class="toolbar-button">
        Italic
      </button>
      <button type="button" @click="editor.chain().focus().toggleStrike().run()" :disabled="!editor.can().chain().focus().toggleStrike().run()" :class="{ 'is-active': editor.isActive('strike') }" class="toolbar-button">
        Strike
      </button>
       <button type="button" @click="editor.chain().focus().setParagraph().run()" :class="{ 'is-active': editor.isActive('paragraph') }" class="toolbar-button">
        Paragraph
      </button>
      <button type="button" @click="editor.chain().focus().toggleHeading({ level: 1 }).run()" :class="{ 'is-active': editor.isActive('heading', { level: 1 }) }" class="toolbar-button">
        H1
      </button>
      <button type="button" @click="editor.chain().focus().toggleHeading({ level: 2 }).run()" :class="{ 'is-active': editor.isActive('heading', { level: 2 }) }" class="toolbar-button">
        H2
      </button>
       <button type="button" @click="editor.chain().focus().toggleHeading({ level: 3 }).run()" :class="{ 'is-active': editor.isActive('heading', { level: 3 }) }" class="toolbar-button">
        H3
      </button>
      <button type="button" @click="editor.chain().focus().toggleBulletList().run()" :class="{ 'is-active': editor.isActive('bulletList') }" class="toolbar-button">
        Bullet List
      </button>
      <button type="button" @click="editor.chain().focus().toggleOrderedList().run()" :class="{ 'is-active': editor.isActive('orderedList') }" class="toolbar-button">
        Ordered List
      </button>
      <!-- Add more buttons as needed (Undo, Redo, CodeBlock, Blockquote, HorizontalRule, HardBreak) -->
    </div>
    
    <!-- Editor Content Area -->
    <EditorContent :editor="editor" class="p-3 min-h-[100px] focus:outline-none" />
  </div>
</template>

<script setup>
import { ref, watch, onBeforeUnmount } from 'vue';
import { useEditor, EditorContent } from '@tiptap/vue-3';
import StarterKit from '@tiptap/starter-kit';

const props = defineProps({
  modelValue: {
    type: String,
    default: '',
  },
  disabled: {
      type: Boolean,
      default: false,
  }
});

const emit = defineEmits(['update:modelValue']);

const editor = useEditor({
  content: props.modelValue,
  extensions: [
    StarterKit.configure({
      // Configure extensions as needed
      // E.g., disable some options from starter kit
      // heading: { levels: [1, 2, 3] },
      // history: false, // Example: If managing history externally
    }),
  ],
  editable: !props.disabled,
  onUpdate: () => {
    // HTML
    emit('update:modelValue', editor.value.getHTML());
    // JSON
    // emit('update:modelValue', editor.value.getJSON());
  },
});

// Watch for external changes to modelValue
watch(() => props.modelValue, (value) => {
  // HTML
  const isSame = editor.value.getHTML() === value;
  // JSON
  // const isSame = JSON.stringify(editor.value.getJSON()) === JSON.stringify(value)

  if (isSame) {
    return;
  }

  editor.value.commands.setContent(value, false);
});

// Watch for changes in the disabled prop
watch(() => props.disabled, (isDisabled) => {
    if (editor.value) {
        editor.value.setEditable(!isDisabled);
    }
});

// Clean up the editor instance
onBeforeUnmount(() => {
  if (editor.value) {
    editor.value.destroy();
  }
});

</script>

<style lang="postcss">
/* Basic styling for TipTap editor */
.tiptap-editor-wrapper {
  /* Wrapper styles */
}

.tiptap-editor-wrapper .ProseMirror {
  /* The actual editor content area */
  min-height: 100px; /* Or match the wrapper's min-height */
}

.tiptap-editor-wrapper .ProseMirror:focus {
  outline: none;
}

.tiptap-editor-wrapper .toolbar {
  /* Toolbar styles */
}

.toolbar-button {
  @apply px-2 py-1 text-sm border border-gray-300 rounded bg-white hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed;
}

.toolbar-button.is-active {
  @apply bg-blue-100 border-blue-300 text-blue-700;
}

/* Add styles for specific elements if needed (e.g., lists, headings) */
.ProseMirror ul,
.ProseMirror ol {
  @apply pl-6 my-2;
}
.ProseMirror ul {
  @apply list-disc;
}
.ProseMirror ol {
  @apply list-decimal;
}
.ProseMirror li {
  @apply mb-1;
}
.ProseMirror h1 {
    @apply text-2xl font-bold my-3;
}
.ProseMirror h2 {
    @apply text-xl font-semibold my-2;
}
.ProseMirror h3 {
    @apply text-lg font-semibold my-2;
}

</style> 