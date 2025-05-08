<script setup>
import { ref, onMounted } from 'vue'
// import { supabase } from '../supabase' // Commented out as it's not used here for now

defineProps({
  msg: String,
})

const count = ref(0)

// Example: Fetch tables from Supabase (public schema)
// const tables = ref([]) // Commented out
// const error = ref(null) // Commented out

/* Commenting out the onMounted hook that tried to fetch from 'your_table'
onMounted(async () => {
  const { data, error: err } = await supabase.from('your_table').select('*')
  if (err) {
    error.value = err.message
  } else {
    tables.value = data
  }
})
*/
</script>

<template>
  <h1>{{ msg }}</h1>

  <div class="card">
    <button type="button" @click="count++">count is {{ count }}</button>
    <p>
      Edit
      <code>components/HelloWorld.vue</code> to test HMR
    </p>
  </div>

  <!-- <div v-if="error" style="color: red;">Supabase error: {{ error }}</div> --> <!-- Commented out -->
  <!-- <div v-else>
    <h2>Supabase Data Example</h2>
    <pre>{{ tables }}</pre>
  </div> --> <!-- Commented out -->

  <p>
    Check out
    <a href="https://vuejs.org/guide/quick-start.html#local" target="_blank"
      >create-vue</a
    >, the official Vue + Vite starter
  </p>
  <p>
    Learn more about IDE Support for Vue in the
    <a
      href="https://vuejs.org/guide/scaling-up/tooling.html#ide-support"
      target="_blank"
      >Vue Docs Scaling up Guide</a
    >.
  </p>
  <p class="read-the-docs">Click on the Vite and Vue logos to learn more</p>
</template>

<style scoped>
.read-the-docs {
  color: #888;
}
</style>
