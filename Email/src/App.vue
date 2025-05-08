<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { supabase } from './supabase'; // Import your Supabase client
import { useRouter } from 'vue-router'; // Import router for redirecting after logout

// Reactive variable to hold the user session
const session = ref(null);

// Listener handle
let authListener = null;
const router = useRouter(); // Get router instance

onMounted(() => {
  // Check initial session state
  supabase.auth.getSession().then(({ data }) => {
    session.value = data.session;
    console.log('Initial session:', session.value ? 'Exists' : 'Null'); // Log existence
  });

  // Listen for auth changes (login, logout)
  const { data: listener } = supabase.auth.onAuthStateChange((event, _session) => {
    console.log('Auth event:', event, 'Session:', _session ? 'Exists' : 'Null'); // Log existence
    const previousSessionState = !!session.value; // Check if user was logged in before this event
    session.value = _session;
    
    // Redirect on state change
    if (event === 'SIGNED_IN' && !previousSessionState) { // Only redirect if they just logged in
      // Redirect to a default logged-in page, e.g., Templates list
      console.log('Redirecting to Templates after SIGNED_IN...');
      router.push({ name: 'TemplatesList' }); // Or 'DesignsList' if preferred
    } else if (event === 'SIGNED_OUT') {
      console.log('Redirecting to Home after SIGNED_OUT...');
      router.push({ name: 'Home' }); // Redirect to home after logout
    }
  });
  authListener = listener; // Store the listener object
});

// Clean up the listener when the component is unmounted
onUnmounted(() => {
  if (authListener?.unsubscribe) {
    authListener.unsubscribe();
    console.log('Auth listener unsubscribed.');
  }
});

// Example function for logout (will be called by a button)
async function handleLogout() {
  console.log('Logging out...');
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    console.log('Logout successful');
    // Redirect is handled by the listener now
  } catch (error) {
    console.error('Logout error:', error.message);
    alert(error.message);
  }
}

</script>

<template>
  <div class="min-h-screen bg-gray-100 text-gray-800">
    <header class="bg-white shadow-md">
      <nav class="container mx-auto px-6 py-3 flex justify-between items-center">
        <!-- Left side links -->
        <div class="flex space-x-6">
          <router-link 
            to="/" 
            class="text-gray-600 hover:text-blue-600 transition-colors duration-200"
            active-class="font-semibold text-blue-600 border-b-2 border-blue-600 pb-1"
          >
            Home
          </router-link>
          <router-link 
            to="/templates" 
            class="text-gray-600 hover:text-blue-600 transition-colors duration-200"
            active-class="font-semibold text-blue-600 border-b-2 border-blue-600 pb-1"
          >
            Templates
          </router-link>
          <router-link 
            v-if="session" 
            to="/designs" 
            class="text-gray-600 hover:text-blue-600 transition-colors duration-200"
            active-class="font-semibold text-blue-600 border-b-2 border-blue-600 pb-1"
          >
            Designs
          </router-link>
        </div>

        <!-- Right side Auth links/info -->
        <div class="flex items-center space-x-4">
          <div v-if="session" class="flex items-center space-x-4">
            <span class="text-sm text-gray-500">{{ session.user?.email }}</span>
            <button 
              @click="handleLogout" 
              class="bg-red-500 hover:bg-red-600 text-white text-sm font-medium py-1 px-3 rounded transition-colors duration-200"
            >
              Logout
            </button>
          </div>
          <router-link 
            v-else 
            to="/auth"
            class="bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium py-1 px-3 rounded transition-colors duration-200"
          >
            Login / Sign Up
          </router-link>
        </div>
      </nav>
    </header>
    <main class="container mx-auto px-6 py-8">
      <router-view />
    </main>
  </div>
</template>

<style>
/* We removed the scoped styles as Tailwind classes are used now.
   Global styles (like base font) can go in src/style.css if needed,
   but Tailwind's base often covers this. */
</style>
