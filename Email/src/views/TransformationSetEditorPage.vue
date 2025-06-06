<template>
  <div class="transformation-set-editor-page max-w-4xl mx-auto">
    <h1 class="text-3xl font-bold mb-6 text-gray-700">{{ pageTitle }}</h1>

    <div v-if="loading" class="text-center text-gray-500 py-6">Loading data...</div>
    <div v-if="error" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6" role="alert">
      <strong class="font-bold">Error:</strong>
      <span> {{ error.message || 'Could not load data.' }}</span>
    </div>

    <form v-else @submit.prevent="handleSaveSet" class="space-y-6 bg-white p-6 rounded-lg shadow border border-gray-200">
      <!-- Set Details -->
      <div>
        <label for="set-name" class="block text-sm font-medium text-gray-700">Set Name</label>
        <input type="text" id="set-name" v-model="setData.name" required class="mt-1 block w-full input-field"/>
      </div>
      <div>
        <label for="set-description" class="block text-sm font-medium text-gray-700">Description</label>
        <textarea id="set-description" v-model="setData.description" rows="3" class="mt-1 block w-full input-field"></textarea>
      </div>

      <!-- Rules Editor -->
      <div class="space-y-4 mt-6 pt-4 border-t border-gray-200">
        <h2 class="text-xl font-semibold text-gray-700">Transformation Rules</h2>
        <div v-for="(rule, index) in rules" :key="rule.id || `new-${index}`" class="rule-item p-3 border border-gray-200 rounded-md space-y-2">
          <div class="flex justify-between items-center">
            <span class="text-sm font-medium text-gray-500">Rule #{{ index + 1 }}</span>
            <button type="button" @click="removeRule(index)" class="text-red-500 hover:text-red-700 text-xs">Remove</button>
          </div>
          <div>
            <label :for="`rule-name-${index}`" class="block text-xs font-medium text-gray-600">Rule Name (Optional)</label>
            <input type="text" :id="`rule-name-${index}`" v-model="rule.rule_name" class="mt-1 block w-full input-field text-xs" placeholder="e.g., Change Main Logo"/>
          </div>
          <div>
            <label :for="`rule-type-${index}`" class="block text-xs font-medium text-gray-600">Rule Type</label>
            <select :id="`rule-type-${index}`" v-model="rule.rule_type" class="mt-1 block w-full input-field text-xs">
              <option value="simple_text">Simple Text</option>
              <option value="regex">Regular Expression</option>
              <!-- <option value="css_selector">CSS Selector (Future)</option> -->
            </select>
          </div>
          <div>
            <label :for="`rule-search-${index}`" class="block text-xs font-medium text-gray-600">Search For</label>
            <textarea :id="`rule-search-${index}`" v-model="rule.search_term" rows="2" required class="mt-1 block w-full input-field text-xs font-mono" placeholder="Text or Regex pattern..."></textarea>
          </div>
          <div>
            <label :for="`rule-replace-${index}`" class="block text-xs font-medium text-gray-600">Replace With</label>
            <textarea :id="`rule-replace-${index}`" v-model="rule.replace_with" rows="2" class="mt-1 block w-full input-field text-xs font-mono" placeholder="Replacement text or HTML..."></textarea>
          </div>
          <div class="flex items-center space-x-4 text-xs">
             <label :for="`rule-order-${index}`" class="text-gray-600">Order:</label>
             <input type="number" :id="`rule-order-${index}`" v-model.number="rule.rule_order" class="w-20 input-field text-xs" />
             <label :for="`rule-case-${index}`" class="flex items-center">
                <input type="checkbox" :id="`rule-case-${index}`" v-model="rule.is_case_sensitive" class="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                <span class="ml-2 text-gray-700">Case Sensitive</span>
             </label>
             <label :for="`rule-global-${index}`" class="flex items-center" v-if="rule.rule_type === 'regex'">
                <input type="checkbox" :id="`rule-global-${index}`" v-model="rule.is_global" class="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                <span class="ml-2 text-gray-700">Global (Regex)</span>
             </label>
          </div>
        </div>
        <button 
            type="button" 
            @click="addRule" 
            class="mt-2 px-3 py-1.5 text-sm font-medium rounded-md shadow-sm text-white bg-blue-500 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200">
          Add Rule
        </button>
      </div>

      <!-- Save/Cancel Buttons -->
      <div class="pt-4 flex justify-end space-x-3">
        <router-link :to="{ name: 'TransformationsList' }" class="btn-secondary">Cancel</router-link>
        <button type="submit" :disabled="submitting" class="btn-primary disabled:opacity-50">{{ submitButtonText }}</button>
      </div>
      <p v-if="submitError" class="text-red-600 text-sm mt-2">{{ submitError }}</p>
    </form>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { supabase } from '../supabase';

const props = defineProps({
  mode: { type: String, required: true, validator: (val) => ['create', 'edit'].includes(val) },
  id: { type: String, default: null } // Set ID for edit mode
});

const router = useRouter();
const setData = ref({ name: '', description: '' });
const rules = ref([]); // Array of rule objects
const loading = ref(false);
const error = ref(null);
const submitting = ref(false);
const submitError = ref(null);
const user = ref(null);

const pageTitle = computed(() => props.mode === 'create' ? 'Create New Transformation Set' : 'Edit Transformation Set');
const submitButtonText = computed(() => submitting.value ? (props.mode === 'create' ? 'Creating...' : 'Saving...') : (props.mode === 'create' ? 'Create Set' : 'Save Changes'));

async function fetchCurrentUser() {
  const { data: { session } } = await supabase.auth.getSession();
  user.value = session?.user ?? null;
}

async function fetchSetData() {
  if (props.mode !== 'edit' || !props.id) return;
  loading.value = true;
  error.value = null;
  try {
    const { data: setDataResult, error: setError } = await supabase
      .from('transformation_sets').select('*').eq('id', props.id).single();
    if (setError) throw setError;
    setData.value = setDataResult;

    const { data: rulesResult, error: rulesError } = await supabase
      .from('transformation_rules').select('*').eq('set_id', props.id).order('rule_order');
    if (rulesError) throw rulesError;
    rules.value = rulesResult || [];
  } catch (e) {
    console.error('Error fetching set data:', e);
    error.value = e;
  } finally { loading.value = false; }
}

function addRule() {
  rules.value.push({
    rule_name: '',
    rule_type: 'simple_text',
    search_term: '',
    replace_with: '',
    rule_order: rules.value.length * 10,
    is_case_sensitive: false,
    is_global: true
  });
}

function removeRule(index) {
  rules.value.splice(index, 1);
}

async function handleSaveSet() {
  await fetchCurrentUser();
  if (!user.value) {
    submitError.value = 'You must be logged in.'; return;
  }

  submitting.value = true;
  submitError.value = null;
  
  try {
    let setId = props.id;
    if (props.mode === 'create') {
      const { data: newSet, error: insertSetError } = await supabase
        .from('transformation_sets')
        .insert({ name: setData.value.name, description: setData.value.description, created_by: user.value.id })
        .select().single();
      if (insertSetError) throw insertSetError;
      setId = newSet.id;
    } else {
      const { error: updateSetError } = await supabase
        .from('transformation_sets')
        .update({ name: setData.value.name, description: setData.value.description, updated_at: new Date().toISOString() })
        .eq('id', setId);
      if (updateSetError) throw updateSetError;
    }

    // 1. Get IDs of rules currently in the UI that have an existing ID
    const uiExistingRuleIds = rules.value.map(r => r.id).filter(id => !!id);

    // 2. Delete rules from DB for this set that are no longer in the UI (for edit mode)
    if (props.mode === 'edit') {
      const deleteQuery = supabase
        .from('transformation_rules')
        .delete()
        .eq('set_id', setId);

      if (uiExistingRuleIds.length > 0) {
        // Delete rules associated with the set but NOT in the current UI's list of existing rule IDs
        deleteQuery.not('id', 'in', `(${uiExistingRuleIds.join(',')})`);
      } else {
        // If there are no existing rule IDs in the UI, it means all previously existing rules were removed.
        // The query `delete().eq('set_id', setId)` without a .not() will delete all rules for the set.
      }
      
      const { error: deleteError } = await deleteQuery;
      if (deleteError) {
        // Log a warning but don't necessarily stop the whole process,
        // as subsequent inserts/updates might still be valid.
        console.warn('Error deleting old rules:', deleteError);
      }
    }

    // 3. Separate UI rules into new (to be inserted) and existing (to be updated)
    const newRulePayloads = [];
    const existingRulePayloads = [];

    rules.value.forEach(rule => {
      // Ensure all rules have the set_id
      const payload = { ...rule, set_id: setId };
      
      // Add user ID for tracking, if your schema supports created_by/updated_by for rules
      // Example:
      // if (!payload.id) { // New rule
      //   payload.created_by = user.value.id;
      // }
      // payload.updated_by = user.value.id; // For both new and existing if you have updated_by

      if (rule.id) { // This rule has an ID, so it's an existing rule to be updated
        existingRulePayloads.push(payload);
      } else { // This rule does not have an ID, so it's a new rule to be inserted
        delete payload.id; // IMPORTANT: Remove id property so DB generates it
        newRulePayloads.push(payload);
      }
    });

    // 4. Insert new rules
    if (newRulePayloads.length > 0) {
      const { data: insertedRules, error: insertError } = await supabase
        .from('transformation_rules')
        .insert(newRulePayloads)
        .select(); // Optionally select to get back the inserted rules with their new IDs
      if (insertError) {
        console.error("Error inserting new rules:", insertError);
        throw insertError; // Make this a critical error
      }
      // console.log('Inserted new rules:', insertedRules);
    }

    // 5. Update existing rules (using upsert is fine here, acts as update)
    if (existingRulePayloads.length > 0) {
      const { data: updatedRules, error: updateError } = await supabase
        .from('transformation_rules')
        .upsert(existingRulePayloads)
        .select(); // Optionally select
      if (updateError) {
        console.error("Error updating existing rules:", updateError);
        throw updateError; // Make this a critical error
      }
      // console.log('Updated existing rules:', updatedRules);
    }

    router.push({ name: 'TransformationsList' });
  } catch (e) {
    console.error('Error saving transformation set:', e);
    submitError.value = `Failed to save: ${e.message}`;
  } finally { submitting.value = false; }
}

onMounted(async () => {
  await fetchCurrentUser();
  if (props.mode === 'edit') {
    await fetchSetData();
  } else {
    addRule(); // Start with one empty rule for new sets
  }
});

watch(() => props.id, (newId) => {
    if (props.mode === 'edit' && newId) fetchSetData();
    else {
        setData.value = { name: '', description: '' };
        rules.value = [];
        if (props.mode === 'create') addRule();
    }
});

</script>

<style scoped>
.input-field {
  @apply mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm;
}
.rule-item {
  background-color: #f9fafb; 
  @apply p-3 border border-gray-200 rounded-md space-y-2;
}
.btn-primary {
    @apply px-4 py-2 text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200;
}
.btn-secondary {
    @apply px-4 py-2 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-gray-200 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors duration-200;
}
</style> 