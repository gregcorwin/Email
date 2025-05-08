<template>
  <div class="max-w-md mx-auto mt-10 p-8 bg-white rounded-lg shadow-md">
    <h1 class="text-2xl font-bold text-center text-gray-700 mb-6">Login / Sign Up</h1>
    <Auth 
      :supabaseClient="supabase" 
      :appearance="{
        theme: ThemeSupa, // Use the predefined Supabase theme
        // variables: { default: { colors: { brand: '#42b983' } } } // Optional: Custom branding
      }" 
      :theme="'default'"
    >
    </Auth>
  </div>
</template>

<script setup>
import { Auth } from '@supa-kit/auth-ui-vue';
import { ThemeSupa } from '@supabase/auth-ui-shared'; // Import theme from the shared package
import { supabase } from '../supabase'; // Your Supabase client instance

// No additional script setup needed for basic usage
</script>

<style scoped>
/* Optional: Add specific styles if needed, but Auth UI and Tailwind should handle most */
</style> 