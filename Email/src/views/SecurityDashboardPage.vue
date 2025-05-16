<template>
  <div class="security-dashboard-page max-w-4xl mx-auto py-8 px-4">
    <h1 class="text-2xl font-bold text-gray-800 mb-6">Security Dashboard</h1>
    
    <div v-if="loadingUserRole" class="text-center text-gray-500 py-4">Loading user information...</div>
    <!-- Show user info and role for debugging -->
    <div v-else class="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between bg-gray-50 p-3 rounded border border-gray-200">
      <div class="text-sm text-gray-700">
        <span class="font-semibold">User:</span> {{ currentUserEmail || 'Unknown' }}<br>
        <span class="font-semibold">Role:</span> {{ userRole || 'None' }}
      </div>
      <div v-if="roleFetchError" class="mt-2 sm:mt-0">
        <span class="text-red-600 text-xs">{{ roleFetchError }}</span>
        <button @click="fetchUserRoleForPage" class="ml-2 px-2 py-1 text-xs rounded bg-blue-500 text-white hover:bg-blue-600">Retry</button>
        <button @click="handleLogout" class="ml-2 px-2 py-1 text-xs rounded bg-red-500 text-white hover:bg-red-600">Logout</button>
      </div>
    </div>
    <div v-if="!isAdmin && !loadingUserRole && !roleFetchError" class="bg-red-100 border-l-4 border-red-500 text-red-700 p-4" role="alert">
      <p class="font-bold">Access Denied</p>
      <p>You do not have permission to view this page. This dashboard is for administrators only.</p>
    </div>
    
    <div v-else class="space-y-8">
      <!-- MFA Status Section -->
      <section class="bg-white p-6 rounded-lg shadow border border-gray-200">
        <h2 class="text-xl font-semibold text-gray-700 mb-3 border-b pb-2">Multi-Factor Authentication (MFA)</h2>
        <p class="text-sm text-gray-600">Status: <span class="font-medium text-green-600">Globally Enabled in Supabase Project Settings</span> (as per current setup).</p>
        <p class="text-sm text-gray-600 mt-1">Users manage their MFA enrollment via their <router-link :to="{name: 'UserSettingsPage'}" class="text-indigo-600 hover:underline">User Settings</router-link> page.</p>
        <!-- Future: Display % of users with MFA enabled -->
      </section>

      <!-- CAPTCHA Configuration Section -->
      <section class="bg-white p-6 rounded-lg shadow border border-gray-200">
        <h2 class="text-xl font-semibold text-gray-700 mb-3 border-b pb-2">CAPTCHA Protection</h2>
        <p class="text-sm text-gray-600">Provider: <span class="font-medium">hCaptcha</span></p>
        <p class="text-sm text-gray-600">Status: <span class="font-medium text-green-600">Enabled for Sign Up & Sign In</span> (configured in Supabase Attack Protection).</p>
      </section>

      <!-- Geo-Blocking Section -->
      <section class="bg-white p-6 rounded-lg shadow border border-gray-200">
        <h2 class="text-xl font-semibold text-gray-700 mb-3 border-b pb-2">Geo-Blocking (IP Restriction)</h2>
        <p class="text-sm text-gray-600">Status: <span class="font-medium text-orange-500">To be implemented via Cloudflare at deployment</span> (restricting to US-only).</p>
        <p class="text-sm text-gray-600 mt-1">Method: Cloudflare Firewall Rules will be used with the custom domain (<code class="text-xs bg-gray-100 p-0.5 rounded">emailapp.casacorwin.com</code>) to block non-US IPs before they reach the application or Supabase backend.</p>
        <p class="text-xs text-gray-500 mt-2">Note: The previous Edge Function and Auth Hook for geo-blocking have been removed.</p>
      </section>

      <!-- RLS Overview Section -->
      <section class="bg-white p-6 rounded-lg shadow border border-gray-200">
        <div class="flex justify-between items-center mb-3 border-b pb-2">
            <h2 class="text-xl font-semibold text-gray-700">Row Level Security (RLS) Policy Status</h2>
            <button 
                @click="fetchRlsPoliciesData"
                :disabled="loadingRlsPolicies"
                class="px-4 py-1.5 text-xs font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200">
                <span v-if="loadingRlsPolicies">Loading Policies...</span>
                <span v-else>Refresh RLS Policies</span>
            </button>
        </div>
        
        <div v-if="loadingRlsPolicies" class="text-center text-gray-500 py-4">Fetching RLS policies...</div>
        <div v-if="rlsPoliciesError" class="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded text-sm" role="alert">
          Error fetching RLS policies: {{ rlsPoliciesError }}
        </div>

        <div v-if="!loadingRlsPolicies && !rlsPoliciesError && rlsPolicies.length === 0" class="text-sm text-gray-500 italic">
            No RLS policies found for target tables (or click refresh).
        </div>

        <div v-else-if="!loadingRlsPolicies && !rlsPoliciesError && rlsPolicies.length > 0" class="space-y-4">
          <div v-for="(policyGroup, tableName) in groupedRlsPolicies" :key="tableName" class="p-3 border rounded-md bg-gray-50">
            <h3 class="text-md font-semibold text-gray-700 mb-2 capitalize">Table: <code class="text-sm bg-gray-200 px-1 rounded">{{ tableName }}</code></h3>
            <ul class="space-y-3 text-xs">
              <li v-for="policy in policyGroup" :key="policy.policyname" class="p-2.5 border-l-4 rounded-r-md bg-white shadow-sm" :class="getPolicyComparisonClass(tableName, policy).borderColor">
                <div class="flex justify-between items-start">
                  <strong class="block text-gray-800 text-sm">{{ policy.policyname }}</strong>
                  <span :class="getPolicyComparisonClass(tableName, policy).textColor" class="text-xs font-semibold px-2 py-0.5 rounded-full" :style="{ backgroundColor: getPolicyComparisonClass(tableName, policy).bgColor }">
                    {{ getPolicyComparisonClass(tableName, policy).status }}
                  </span>
                </div>
                <div class="grid grid-cols-2 gap-x-2 text-gray-600 mt-1">
                    <span><strong>Command:</strong> {{ policy.cmd || 'ALL' }}</span>
                    <span><strong>Roles:</strong> {{ policy.roles?.join(', ') || 'N/A' }}</span>
                </div>
                <div v-if="policy.qual" class="mt-1.5">
                    <strong class="text-gray-700">USING:</strong> 
                    <pre class="bg-gray-100 p-1.5 rounded text-xs overflow-x-auto mt-0.5"><code>{{ policy.qual }}</code></pre>
                </div>
                <div v-if="policy.with_check" class="mt-1.5">
                    <strong class="text-gray-700">WITH CHECK:</strong> 
                    <pre class="bg-gray-100 p-1.5 rounded text-xs overflow-x-auto mt-0.5"><code>{{ policy.with_check }}</code></pre>
                </div>
                <p v-if="getPolicyComparisonClass(tableName, policy).details" class="text-xs mt-1.5 italic" :class="getPolicyComparisonClass(tableName, policy).textColor">
                    {{ getPolicyComparisonClass(tableName, policy).details }}
                </p>
              </li>
            </ul>
            <!-- Display missing expected policies for this table -->
            <div v-if="expectedRlsPolicies[tableName] && getMissingExpectedPolicies(tableName).length > 0" class="mt-3">
              <h4 class="text-xs font-semibold text-red-600">Missing Expected Policies for '{{tableName}}':</h4>
              <ul class="list-disc list-inside pl-2 text-xs text-red-500">
                <li v-for="missingPolicy in getMissingExpectedPolicies(tableName)" :key="missingPolicy.description">
                  {{ missingPolicy.description }} (Expected name containing: '{{ missingPolicy.policyname_contains }}' for cmd: {{missingPolicy.cmd}})
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>
      
      <!-- Future: Security Tests Section Placeholder -->
       <section class="bg-white p-6 rounded-lg shadow border border-gray-200">
        <h2 class="text-xl font-semibold text-gray-700 mb-3 border-b pb-2">Security Test Center (Future)</h2>
        <p class="text-sm text-gray-500 italic">This section will provide tools to run and view status of various security checks and tests.</p>
      </section>

    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { supabase } from '../supabase';
import { useRouter } from 'vue-router';

const userRole = ref(null);
const loadingUserRole = ref(true);
const currentUserEmail = ref(null);
const roleFetchError = ref(null);

// RLS Policies State
const rlsPolicies = ref([]);
const loadingRlsPolicies = ref(false);
const rlsPoliciesError = ref(null);

const isAdmin = computed(() => userRole.value === 'app_admin');
const router = useRouter();

const groupedRlsPolicies = computed(() => {
  if (!rlsPolicies.value) return {};
  return rlsPolicies.value.reduce((acc, policy) => {
    const table = policy.tablename;
    if (!acc[table]) acc[table] = [];
    acc[table].push(policy);
    return acc;
  }, {});
});

const expectedRlsPolicies = {
  templates: [
    {
      policyname_contains: "Admin full access on templates", cmd: "ALL", roles_include: ["authenticated"],
      qual_keywords: ["user_roles", "app_admin", "auth.uid()"], with_check_keywords: ["user_roles", "app_admin", "auth.uid()"],
      description: "Admin full access on Templates"
    },
    {
      policyname_contains: "Allow authenticated read access", cmd: "SELECT", roles_include: ["authenticated"],
      qual_keywords: ["true"], description: "Authenticated can read all Templates"
    },
    {
      policyname_contains: "Allow individual insert access for templates", cmd: "INSERT", roles_include: ["authenticated"],
      with_check_keywords: ["auth.uid()", "created_by"], description: "Owner can insert Templates"
    },
    {
      policyname_contains: "Allow individual update access for templates", cmd: "UPDATE", roles_include: ["authenticated"],
      qual_keywords: ["auth.uid()", "created_by"], with_check_keywords: ["auth.uid()", "created_by"], description: "Owner can update Templates"
    },
    {
      policyname_contains: "Allow individual delete access for templates", cmd: "DELETE", roles_include: ["authenticated"],
      qual_keywords: ["auth.uid()", "created_by"], description: "Owner can delete Templates"
    },
  ],
  collections: [
    {
      policyname_contains: "Admin full access on collections", cmd: "ALL", roles_include: ["authenticated"],
      qual_keywords: ["user_roles", "app_admin", "auth.uid()"], with_check_keywords: ["user_roles", "app_admin", "auth.uid()"],
      description: "Admin full access on Collections"
    },
    {
      policyname_contains: "Allow authenticated read access for collections", cmd: "SELECT", roles_include: ["authenticated"],
      qual_keywords: ["true"], description: "Authenticated can read all Collections"
    },
    {
      policyname_contains: "Allow individual insert access for collections", cmd: "INSERT", roles_include: ["authenticated"],
      with_check_keywords: ["auth.uid()", "created_by"], description: "Owner can insert Collections"
    },
    {
      policyname_contains: "Allow individual update access for collections", cmd: "UPDATE", roles_include: ["authenticated"],
      qual_keywords: ["auth.uid()", "created_by"], with_check_keywords: ["auth.uid()", "created_by"], description: "Owner can update Collections"
    },
    {
      policyname_contains: "Allow individual delete access for collections", cmd: "DELETE", roles_include: ["authenticated"],
      qual_keywords: ["auth.uid()", "created_by"], description: "Owner can delete Collections"
    },
  ],
  designs: [
    {
      policyname_contains: "Admin full access on designs", cmd: "ALL", roles_include: ["authenticated"],
      qual_keywords: ["user_roles", "app_admin", "auth.uid()"], with_check_keywords: ["user_roles", "app_admin", "auth.uid()"],
      description: "Admin full access on Designs"
    },
    {
      policyname_contains: "Designer can see all designs", cmd: "SELECT", roles_include: ["authenticated"],
      qual_keywords: ["user_roles", "designer", "auth.uid()"], description: "Designers can see all Designs"
    },
    {
      policyname_contains: "Designer can insert own designs", cmd: "INSERT", roles_include: ["authenticated"],
      with_check_keywords: ["user_roles", "designer", "auth.uid()", "created_by"], description: "Designer can insert own Designs"
    },
    {
      policyname_contains: "Designer can update own designs", cmd: "UPDATE", roles_include: ["authenticated"],
      qual_keywords: ["user_roles", "designer", "auth.uid()", "created_by"], 
      with_check_keywords: ["user_roles", "designer", "auth.uid()", "created_by"], 
      description: "Designer can update own Designs"
    },
    {
      policyname_contains: "Designer can delete own designs", cmd: "DELETE", roles_include: ["authenticated"],
      qual_keywords: ["user_roles", "designer", "auth.uid()", "created_by"], 
      description: "Designer can delete own Designs"
    },
    {
      policyname_contains: "QA can see all designs", cmd: "SELECT", roles_include: ["authenticated"],
      qual_keywords: ["user_roles", "qa", "auth.uid()"], description: "QA can see all Designs"
    },
    {
      policyname_contains: "Allow individual insert access for designs", cmd: "INSERT", roles_include: ["authenticated"],
      with_check_keywords: ["auth.uid()", "created_by"], description: "Authenticated owner can insert designs (generic)"
    },
    {
      policyname_contains: "Allow individual update access for designs", cmd: "UPDATE", roles_include: ["authenticated"],
      qual_keywords: ["auth.uid()", "created_by"], with_check_keywords: ["auth.uid()", "created_by"], description: "Authenticated owner can update designs (generic)"
    },
    {
      policyname_contains: "Allow individual delete access for designs", cmd: "DELETE", roles_include: ["authenticated"],
      qual_keywords: ["auth.uid()", "created_by"], description: "Authenticated owner can delete designs (generic)"
    },
    {
      policyname_contains: "Auth user can see own designs", cmd: "SELECT", roles_include: ["authenticated"],
      qual_keywords: ["created_by", "NOT", "EXISTS", "user_roles", "user_id"], 
      description: "Default Auth User sees own Designs (if no specific role)"
    },
    {
      policyname_contains: "Auth user can insert own designs", cmd: "INSERT", roles_include: ["authenticated"],
      with_check_keywords: ["created_by", "NOT", "EXISTS", "user_roles", "user_id"], 
      description: "Default Auth User can insert own Designs (if no specific role)"
    },
    {
      policyname_contains: "Auth user can update own designs", cmd: "UPDATE", roles_include: ["authenticated"],
      qual_keywords: ["created_by", "NOT", "EXISTS", "user_roles", "user_id"], 
      with_check_keywords: ["created_by", "NOT", "EXISTS", "user_roles", "user_id"], 
      description: "Default Auth User can update own Designs (if no specific role)"
    },
     {
      policyname_contains: "Auth user can delete own designs", cmd: "DELETE", roles_include: ["authenticated"],
      qual_keywords: ["created_by", "NOT", "EXISTS", "user_roles", "user_id"], 
      description: "Default Auth User can delete own Designs (if no specific role)"
    },
  ],
  transformation_sets: [
    {
      policyname_contains: "Admin full access on transformation_sets", cmd: "ALL", roles_include: ["authenticated"],
      qual_keywords: ["user_roles", "app_admin", "auth.uid()"], with_check_keywords: ["user_roles", "app_admin", "auth.uid()"],
      description: "Admin full access on Transformation Sets"
    },
    {
      policyname_contains: "Authenticated can see all transformation_sets", cmd: "SELECT", roles_include: ["authenticated"],
      qual_keywords: ["true"], description: "Authenticated can read all Transformation Sets"
    },
    {
      policyname_contains: "Auth user can insert own transformation_sets", cmd: "INSERT", roles_include: ["authenticated"],
      with_check_keywords: ["auth.uid()", "created_by"], description: "Owner can insert Transformation Sets"
    },
    {
      policyname_contains: "Auth user can select own transformation_sets", cmd: "SELECT", roles_include: ["authenticated"],
      qual_keywords: ["auth.uid()", "created_by"], description: "Owner can select own Transformation Sets"
    },
    {
      policyname_contains: "Auth user can update own transformation_sets", cmd: "UPDATE", roles_include: ["authenticated"],
      qual_keywords: ["auth.uid()", "created_by"], with_check_keywords: ["auth.uid()", "created_by"], description: "Owner can update own Transformation Sets"
    },
    {
      policyname_contains: "Auth user can delete own transformation_sets", cmd: "DELETE", roles_include: ["authenticated"],
      qual_keywords: ["auth.uid()", "created_by"], description: "Owner can delete own Transformation Sets"
    },
  ],
  transformation_rules: [
    {
      policyname_contains: "Admin full access on transformation_rules", cmd: "ALL", roles_include: ["authenticated"],
      qual_keywords: ["user_roles", "app_admin", "auth.uid()"], with_check_keywords: ["user_roles", "app_admin", "auth.uid()"],
      description: "Admin full access on Transformation Rules"
    },
    {
      policyname_contains: "Authenticated can see all transformation_rules", cmd: "SELECT", roles_include: ["authenticated"],
      qual_keywords: ["true"], description: "Authenticated can read all Transformation Rules"
    },
    {
      policyname_contains: "Auth user can insert rules into own transformation_sets", cmd: "INSERT", roles_include: ["authenticated"],
      with_check_keywords: ["transformation_sets", "set_id", "created_by", "auth.uid()"], description: "Owner of Set can insert Transformation Rules"
    },
    {
      policyname_contains: "Auth user can select rules from own transformation_sets", cmd: "SELECT", roles_include: ["authenticated"],
      qual_keywords: ["transformation_sets", "set_id", "created_by", "auth.uid()"], description: "Owner of Set can select its Transformation Rules"
    },
    {
      policyname_contains: "Auth user can update rules in own transformation_sets", cmd: "UPDATE", roles_include: ["authenticated"],
      qual_keywords: ["transformation_sets", "set_id", "created_by", "auth.uid()"], 
      with_check_keywords: ["transformation_sets", "set_id", "created_by", "auth.uid()"], 
      description: "Owner of Set can update its Transformation Rules"
    },
    {
      policyname_contains: "Auth user can delete rules from own transformation_sets", cmd: "DELETE", roles_include: ["authenticated"],
      qual_keywords: ["transformation_sets", "set_id", "created_by", "auth.uid()"], 
      description: "Owner of Set can delete its Transformation Rules"
    },
  ],
  template_variables: [
    {
      policyname_contains: "Admin full access on template_variables", cmd: "ALL", roles_include: ["authenticated"],
      qual_keywords: ["user_roles", "app_admin", "auth.uid()"], with_check_keywords: ["user_roles", "app_admin", "auth.uid()"],
      description: "Admin full access on Template Variables"
    },
    {
      policyname_contains: "Authenticated can read all template_variables", cmd: "SELECT", roles_include: ["authenticated"],
      qual_keywords: ["true"], description: "Authenticated can read all Template Variables"
    },
    {
      policyname_contains: "Owner can insert template_variables", cmd: "INSERT", roles_include: ["authenticated"],
      with_check_keywords: ["templates", "template_id", "created_by", "auth.uid()"], description: "Owner of Template can insert Variables"
    },
    {
      policyname_contains: "Owner can update template_variables", cmd: "UPDATE", roles_include: ["authenticated"],
      qual_keywords: ["templates", "template_id", "created_by", "auth.uid()"], 
      with_check_keywords: ["templates", "template_id", "created_by", "auth.uid()"], 
      description: "Owner of Template can update Variables"
    },
    {
      policyname_contains: "Owner can delete template_variables", cmd: "DELETE", roles_include: ["authenticated"],
      qual_keywords: ["templates", "template_id", "created_by", "auth.uid()"], 
      description: "Owner of Template can delete Variables"
    },
  ],
  user_roles: [
    {
      policyname_contains: "Admin full access on user_roles", cmd: "ALL", roles_include: ["authenticated"],
      qual_keywords: ["user_roles", "app_admin", "auth.uid()"], 
      with_check_keywords: ["user_roles", "app_admin", "auth.uid()"],
      description: "Admin full access on User Roles (Caution: self-referential RLS)"
    },
    {
      policyname_contains: "Users can read their own role", cmd: "SELECT", roles_include: ["authenticated"],
      qual_keywords: ["auth.uid()", "user_id"], description: "Users can read their own role entry"
    },
  ],
};

function checkKeywords(sqlString, keywords) {
  if (!sqlString || !keywords || keywords.length === 0) return true; // No keywords to check, or no string to check in
  return keywords.every(keyword => sqlString.toLowerCase().includes(keyword.toLowerCase()));
}

function getPolicyComparisonClass(tableName, activePolicy) {
  const defaultStyles = { status: 'UNKNOWN', borderColor: 'border-gray-300', textColor: 'text-gray-500', bgColor: 'bg-gray-200', details: '' };
  if (!expectedRlsPolicies[tableName]) {
    return { ...defaultStyles, status: 'UNTRACKED', details: 'No expected policies defined for this table.' };
  }

  const expectedPolicy = expectedRlsPolicies[tableName].find(ep => 
    activePolicy.policyname.includes(ep.policyname_contains) && 
    (ep.cmd === (activePolicy.cmd || 'ALL'))
  );

  if (!expectedPolicy) {
    return { ...defaultStyles, status: 'UNEXPECTED', borderColor: 'border-orange-400', textColor: 'text-orange-700', bgColor: 'bg-orange-100', details: 'This active policy was not defined in expectations.' };
  }

  let mismatches = [];
  if (expectedPolicy.roles_include && !expectedPolicy.roles_include.every(r => activePolicy.roles?.includes(r))) {
    mismatches.push(`Roles mismatch. Expected to include: ${expectedPolicy.roles_include.join(', ')}, Got: ${activePolicy.roles?.join(', ')}`);
  }
  if (expectedPolicy.qual_keywords && !checkKeywords(activePolicy.qual, expectedPolicy.qual_keywords)) {
    mismatches.push('USING condition keywords mismatch.');
  }
  if (expectedPolicy.with_check_keywords && !checkKeywords(activePolicy.with_check, expectedPolicy.with_check_keywords)) {
    mismatches.push('WITH CHECK condition keywords mismatch.');
  }

  if (mismatches.length > 0) {
    return { 
      status: 'MISMATCH', 
      borderColor: 'border-yellow-400', 
      textColor: 'text-yellow-700', 
      bgColor: 'bg-yellow-100', 
      details: mismatches.join(' ') 
    };
  }

  return { status: 'MATCH', borderColor: 'border-green-400', textColor: 'text-green-700', bgColor: 'bg-green-100', details: 'Matches expected policy.' };
}

const getMissingExpectedPolicies = (tableName) => {
    if (!expectedRlsPolicies[tableName] || !rlsPolicies.value) return [];
    const activePolicyNamesForTable = rlsPolicies.value
        .filter(ap => ap.tablename === tableName)
        .map(ap => ap.policyname);
    
    return expectedRlsPolicies[tableName].filter(ep => 
        !activePolicyNamesForTable.some(apName => apName.includes(ep.policyname_contains))
    );
};

async function fetchUserRoleForPage() {
  loadingUserRole.value = true;
  userRole.value = null;
  roleFetchError.value = null;
  currentUserEmail.value = null;
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) {
    roleFetchError.value = 'Error getting session: ' + sessionError.message;
    loadingUserRole.value = false;
    return;
  }
  if (!session || !session.user) {
    roleFetchError.value = 'Session expired or not found. Please log in again.';
    loadingUserRole.value = false;
    setTimeout(() => router.push({ name: 'Auth' }), 1500);
    return;
  }
  currentUserEmail.value = session.user.email;
  try {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', session.user.id)
      .single();
    if (error && error.code !== 'PGRST116') {
      roleFetchError.value = 'Error fetching user role: ' + error.message;
      userRole.value = null;
      return;
    }
    userRole.value = data?.role || null;
  } catch (e) {
    roleFetchError.value = 'Exception during user role fetch: ' + (e.message || e);
    userRole.value = null;
  } finally {
    loadingUserRole.value = false;
  }
}

async function handleLogout() {
  await supabase.auth.signOut();
  router.push({ name: 'Auth' });
}

async function fetchRlsPoliciesData() {
  if (!isAdmin.value) {
    rlsPoliciesError.value = "Unauthorized to fetch policies.";
    return;
  }
  loadingRlsPolicies.value = true;
  rlsPoliciesError.value = null;
  rlsPolicies.value = [];
  console.log("[SecurityDashboard] Starting fetchRlsPoliciesData. isAdmin:", isAdmin.value);

  try {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      console.error("[SecurityDashboard] Error getting session:", sessionError);
      throw new Error("Failed to get current session.");
    }
    if (!sessionData || !sessionData.session) {
      console.error("[SecurityDashboard] No active session found.");
      throw new Error("Not authenticated or session expired.");
    }
    const token = sessionData.session.access_token;
    if (!token) {
        console.error("[SecurityDashboard] No access token found in session.");
        throw new Error("Missing access token.");
    }
    console.log("[SecurityDashboard] Token retrieved. Calling invoke for 'get-rls-policies'...");
    
    const { data, error } = await supabase.functions.invoke('get-rls-policies', {
      // body: {}, // Not sending a body, auth is via header
      headers: {
        Authorization: `Bearer ${token}`,
        // 'Content-Type': 'application/json' // Not strictly needed for GET-like invoke with no body if Supabase client handles it
      }
    });

    console.log("[SecurityDashboard] Invoke response - raw error object:", error);
    console.log("[SecurityDashboard] Invoke response - raw data object:", data);

    if (error) { // This is an error from the invoke call itself (e.g., network, function crashed hard)
      console.error("[SecurityDashboard] Error from supabase.functions.invoke:", error);
      throw error; 
    }
    
    // Check if the function returned a JSON that itself signifies an error (e.g., our { error: {http_code, message} } structure)
    if (data && data.error && typeof data.error === 'object' && data.error.message) {
        console.error("[SecurityDashboard] Business logic error returned from Edge Function:", data.error.message);
        throw new Error(data.error.message);
    } else if (data && data.error && typeof data.error === 'string') { // Simpler error string from function
        console.error("[SecurityDashboard] String error returned from Edge Function:", data.error);
        throw new Error(data.error);
    }
    
    // If data is an array (expected policies), use it. Otherwise, something is unexpected.
    if (Array.isArray(data)) {
        rlsPolicies.value = data;
        console.log("[SecurityDashboard] Policies successfully fetched and set:", rlsPolicies.value);
    } else {
        console.error("[SecurityDashboard] Unexpected data format from Edge Function. Expected array, got:", data);
        throw new Error("Received unexpected data format from the server.");
    }

  } catch (e) {
    console.error("[SecurityDashboard] Final catch block - Error invoking get-rls-policies function:", e);
    rlsPoliciesError.value = e.message || "Failed to load RLS policies (unknown error).";
  } finally {
    loadingRlsPolicies.value = false;
    console.log("[SecurityDashboard] fetchRlsPoliciesData finished.");
  }
}

onMounted(() => {
  fetchUserRoleForPage();
  // Optionally, fetch RLS policies on mount if admin, or wait for button click
  // if (isAdmin.value) fetchRlsPoliciesData(); // This would need fetchUserRoleForPage to complete first
});

// Watch for isAdmin to become true after role is fetched, then load policies
watch(isAdmin, (newIsAdmin) => {
    if (newIsAdmin && rlsPolicies.value.length === 0) { // Only fetch if admin and not already fetched
        fetchRlsPoliciesData();
    }
}, { immediate: true }); // Run on mount too, after isAdmin is initially computed

</script>

<style scoped>
pre code {
  white-space: pre-wrap;       /* CSS3 */
  word-wrap: break-word;      /* Internet Explorer 5.5+ */
}
</style> 