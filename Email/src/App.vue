<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { supabase } from './supabase';
import { useRouter, useRoute } from 'vue-router';

const session = ref(null);
let authListener = null;
const router = useRouter();
const route = useRoute();

// Static navigation, includes Security for now. We can refine admin-only visibility later.
const navigation = [
  { name: 'Home', to: { name: 'Home' }, routeName: 'Home' },
  { name: 'Templates', to: { name: 'TemplatesList' }, routeName: 'TemplatesList' },
  { name: 'Collections', to: { name: 'CollectionsList' }, routeName: 'CollectionsList' },
  { name: 'Designs', to: { name: 'DesignsList' }, routeName: 'DesignsList' },
  { name: 'Transformations', to: { name: 'TransformationsList' }, routeName: 'TransformationsList' },
  { name: 'Gallery', to: { name: 'GalleryPage' }, routeName: 'GalleryPage' },
  { name: 'Security', to: { name: 'SecurityDashboardPage' }, routeName: 'SecurityDashboardPage' },
];

onMounted(() => {
  supabase.auth.getSession().then(({ data }) => {
    session.value = data.session;
    console.log('[App.vue] Initial session on mount:', session.value ? 'Exists' : 'Null', 'AAL:', session.value?.user?.aal);
    if (session.value && route.name === 'Auth' && !route.query.mfa_required) {
      console.log('[App.vue] Active session on mount & on Auth page (not MFA step), redirecting to TemplatesList.');
      router.push({ name: 'TemplatesList' });
    }
  });

  const { data: listener } = supabase.auth.onAuthStateChange(async (event, _session) => {
    console.log('[App.vue] Auth event received:', event, 'Incoming _session AAL:', _session?.user?.aal, 'User ID:', _session?.user?.id);
    session.value = _session;
    console.log('[App.vue] session.value updated. Current user ID:', session.value?.user?.id);

    if (event === 'SIGNED_IN') {
      const { data: aalData, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aalError) {
        console.error("[App.vue] Error fetching AAL after SIGNED_IN:", aalError);
        router.push({ name: 'TemplatesList' }); 
        return;
      }
      console.log("[App.vue] SIGNED_IN - AAL Data:", aalData);
      const { currentLevel, nextLevel } = aalData;
      if (currentLevel === 'aal1' && nextLevel === 'aal2') {
        console.log("[App.vue] MFA required (aal1 and next is aal2). Redirecting to Auth for MFA input.");
        router.push({ name: 'Auth', query: { mfa_required: 'true' } });
      } else if (currentLevel === 'aal2') {
        console.log("[App.vue] MFA already satisfied (aal2). Proceeding to main app.");
        router.push({ name: 'TemplatesList' });
      } else {
        console.log("[App.vue] MFA not enrolled or not required (current:", currentLevel, "next:", nextLevel, "). Proceeding to main app.");
        router.push({ name: 'TemplatesList' });
      }
    } else if (event === 'SIGNED_OUT') {
      console.log("[App.vue] SIGNED_OUT event detected. Session user should be null. Redirecting to Home.");
      router.push({ name: 'Home' });
    } else if (event === 'MFA_CHALLENGE_VERIFIED'){
        console.log("[App.vue] MFA_CHALLENGE_VERIFIED event. Session AAL should be aal2. Redirecting to main app.");
        router.push({ name: 'TemplatesList' });
    }
    else if (event === 'TOKEN_REFRESHED') {
      console.log("[App.vue] TOKEN_REFRESHED event. New AAL in session:", _session?.user?.aal);
      if (_session?.user?.aal === 'aal2' && route.name === 'Auth' && route.query.mfa_required === 'true'){
        console.log("[App.vue] TOKEN_REFRESHED to aal2 while on MFA input page. Redirecting to main app.");
        router.push({ name: 'TemplatesList'});
      }
    }
  });
  authListener = listener;
});

onUnmounted(() => {
  if (authListener?.unsubscribe) {
    authListener.unsubscribe();
    console.log('[App.vue] Auth listener unsubscribed.');
  }
});

async function handleLogout() {
    console.log('[App.vue] SIMPLE LOGOUT: Attempting to call supabase.auth.signOut()...');
    try {
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error('[App.vue] SIMPLE LOGOUT: supabase.auth.signOut() returned an error object:', error);
        } else {
            console.log('[App.vue] SIMPLE LOGOUT: supabase.auth.signOut() call completed, no immediate error object. Expecting SIGNED_OUT event.');
        }
    } catch (e) {
        console.error('[App.vue] SIMPLE LOGOUT: Error caught during supabase.auth.signOut() call:', e);
    }
    console.log('[App.vue] SIMPLE LOGOUT: handleLogout function finished.');
}
</script>

<template>
  <div class="min-h-screen bg-gray-100 text-gray-800">
    <header class="bg-white shadow-md sticky top-0 z-50">
      <nav class="container mx-auto px-4 sm:px-6 lg:px-8 py-3 flex justify-between items-center">
        <div class="flex items-center space-x-4">
          <router-link :to="{ name: 'Home' }" class="text-xl font-semibold text-indigo-600 hover:text-indigo-700">
            Email System
          </router-link>
          <div class="hidden md:flex items-baseline space-x-1">
            <router-link 
              v-for="item in navigation" 
              :key="item.name" 
              :to="item.to" 
              class="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
              active-class="bg-indigo-100 text-indigo-700 font-semibold"
            >
              {{ item.name }}
            </router-link>
          </div>
        </div>
        <div class="flex items-center space-x-3">
          <div v-if="session && session.user" class="flex items-center space-x-3">
            <span class="text-sm text-gray-500 hidden sm:inline">{{ session.user.email }}</span>
            <router-link 
              :to="{ name: 'UserSettingsPage' }" 
              title="Settings"
              class="p-2 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
            >
              <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c.836 1.372-.734 2.942-2.106 2.106a1.532 1.532 0 01-2.287-.947c-.379-1.561-2.6-1.561-2.978 0a1.532 1.532 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.532 1.532 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c-.836-1.372.734 2.942 2.106-2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.532 1.532 0 012.287.947c1.372-.836 2.942.734 2.106 2.106a1.532 1.532 0 01.947 2.287c1.561.379 1.561 2.6 0 2.978a1.532 1.532 0 01-.947 2.287c-.836 1.372.734 2.942 2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd" />
              </svg>
              <span class="sr-only">User Settings</span>
            </router-link>
            <button 
              @click="handleLogout" 
              class="px-3 py-1.5 text-sm font-medium rounded-md shadow-sm text-white bg-red-500 hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-200"
            >
              Logout
            </button>
          </div>
          <router-link 
            v-else 
            :to="{ name: 'Auth' }"
            class="px-4 py-2 text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
          >
            Login / Sign Up
          </router-link>
        </div>
        <div class="-mr-2 flex md:hidden">
          <button type="button" class="bg-indigo-600 inline-flex items-center justify-center p-2 rounded-md text-indigo-200 hover:text-white hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-indigo-600 focus:ring-white" aria-controls="mobile-menu" aria-expanded="false">
            <span class="sr-only">Open main menu</span>
            <svg class="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
            <svg class="hidden h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      </nav>
    </header>
    <main class="container mx-auto px-6 py-8 pt-24">
      <router-view />
    </main>
  </div>
</template>

<style>
html, body {
  margin: 0;
  padding: 0;
}
</style>
