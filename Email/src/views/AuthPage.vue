<template>
  <div class="max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow-md">
    <!-- MFA Input Form (shown if mfa_required query param is true) -->
    <div v-if="showMfaInput">
      <h2 class="text-2xl font-bold text-center text-gray-700 mb-6">Enter Verification Code</h2>
      <p class="text-sm text-gray-600 text-center mb-4">Your account has Multi-Factor Authentication enabled. Please enter the code from your authenticator app.</p>
      <form @submit.prevent="handleVerifyMfa">
        <div class="mb-4">
          <label for="mfa-code" class="block text-sm font-medium text-gray-700">6-Digit Code</label>
          <input 
            id="mfa-code" type="text" v-model.trim="mfaCode" required maxlength="6" pattern="[0-9]{6}"
            class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="123456"
          />
        </div>
        <div v-if="mfaError" class="mb-4 p-3 bg-red-50 text-red-700 border border-red-200 rounded-md text-sm">{{ mfaError }}</div>
        <button type="submit" :disabled="verifyingMfaCode || mfaCode.length !== 6" class="w-full btn-primary">
          <span v-if="verifyingMfaCode">Verifying...</span>
          <span v-else>Verify Code & Login</span>
        </button>
      </form>
    </div>

    <!-- Login / Sign Up Forms -->
    <div v-else>
      <h1 class="text-2xl font-bold text-center text-gray-700 mb-8">{{ isSignUpView ? 'Create Account' : 'Sign In' }}</h1>
      <form @submit.prevent="isSignUpView ? handleSignUp() : handleSignIn()" class="space-y-6">
        <div>
          <label for="email" class="block text-sm font-medium text-gray-700">Email address</label>
          <input id="email" name="email" type="email" autocomplete="email" required v-model="email"
                 class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
        </div>
        <div>
          <label for="password" class="block text-sm font-medium text-gray-700">Password</label>
          <input id="password" name="password" type="password" autocomplete="current-password" required v-model="password"
                 class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
        </div>

        <!-- hCaptcha Component -->
        <div class="flex justify-center">
          <VueHcaptcha 
            ref="hcaptchaRef"
            sitekey="6decac62-43de-4126-b0de-979eff54c2fe" 
            @verify="onCaptchaVerified"
            @expired="onCaptchaExpired"
            @error="onCaptchaError"
          />
        </div>
        <div v-if="authError" class="p-3 bg-red-50 text-red-700 border border-red-200 rounded-md text-sm">{{ authError }}</div>
        
        <button type="submit" :disabled="loadingAuth || !captchaToken" class="w-full btn-primary">
          <span v-if="loadingAuth">Processing...</span>
          <span v-else>{{ isSignUpView ? 'Create Account' : 'Sign In' }}</span>
        </button>
      </form>
      <div class="mt-6 text-center">
        <button @click="isSignUpView = !isSignUpView" class="text-sm text-indigo-600 hover:text-indigo-500 hover:underline">
          {{ isSignUpView ? 'Already have an account? Sign In' : "Don't have an account? Sign Up" }}
        </button>
      </div>
       <div v-if="isSignUpView && signUpSuccessMessage" class="mt-4 p-3 bg-green-50 text-green-700 border border-green-200 rounded-md text-sm">
            {{ signUpSuccessMessage }}
        </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { supabase } from '../supabase';
import VueHcaptcha from '@hcaptcha/vue3-hcaptcha';

const route = useRoute();
const router = useRouter();

// MFA State (from previous implementation)
const showMfaInput = ref(false);
const mfaCode = ref('');
const mfaError = ref(null);
const verifyingMfaCode = ref(false);
const mfaFactorToVerify = ref(null);

// Auth Form State
const isSignUpView = ref(false); // To toggle between Sign In and Sign Up views
const email = ref('');
const password = ref('');
const authError = ref(null);
const loadingAuth = ref(false);
const signUpSuccessMessage = ref(null);

// hCaptcha State
const hcaptchaRef = ref(null); // Ref for the hCaptcha component
const captchaToken = ref(null);

watch(() => route.query.mfa_required, async (newVal) => {
  showMfaInput.value = newVal === 'true';
  if (newVal === 'true') {
    mfaCode.value = ''; 
    mfaError.value = null;
    authError.value = null; // Clear main auth error too
    verifyingMfaCode.value = true; 
    try {
      const { data: factorsResponse, error: listError } = await supabase.auth.mfa.listFactors();
      if (listError) throw listError;
      const verifiedTotpFactor = factorsResponse?.totp?.find(f => f.status === 'verified');
      if (verifiedTotpFactor) {
        mfaFactorToVerify.value = verifiedTotpFactor.id;
      } else {
        mfaError.value = "No verified MFA factor found. Please re-enroll or contact support.";
      }
    } catch (e) {
      mfaError.value = "Could not retrieve MFA details. Please try again.";
    } finally {
      verifyingMfaCode.value = false; 
    }
  }
}, { immediate: true });

onMounted(async () => {
  if (route.query.mfa_required === 'true') return;
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    const { data: { user } } = await supabase.auth.getUser();
    const effectiveAal = user?.aal;
    if (effectiveAal === 'aal1') {
      const { data: factorsResponse } = await supabase.auth.mfa.listFactors();
      const hasVerifiedTotp = factorsResponse?.totp?.filter(f => f.status === 'verified').length > 0;
      if (hasVerifiedTotp) {
        if (!showMfaInput.value) showMfaInput.value = true;
        if (route.query.mfa_required !== 'true') {
            router.replace({ query: { ...route.query, mfa_required: 'true' } });
        }
      } else {
        router.push({ name: 'TemplatesList' });
      }
    } else { 
      router.push({ name: 'TemplatesList' });
    }
  } 
});

const onCaptchaVerified = (token) => {
  console.log("hCaptcha verified:", token);
  captchaToken.value = token;
  authError.value = null; // Clear previous auth errors when captcha is verified
};

const onCaptchaExpired = () => {
  console.log("hCaptcha expired");
  captchaToken.value = null;
  hcaptchaRef.value?.reset(); // Access reset through .value
};

const onCaptchaError = (err) => {
  console.error("hCaptcha error:", err);
  captchaToken.value = null;
  authError.value = `CAPTCHA error: ${err}`;
  hcaptchaRef.value?.reset();
};

async function handleSignUp() {
  if (!captchaToken.value) {
    authError.value = "Please complete the CAPTCHA challenge.";
    return;
  }
  loadingAuth.value = true;
  authError.value = null;
  signUpSuccessMessage.value = null;
  try {
    const { data, error } = await supabase.auth.signUp({
      email: email.value,
      password: password.value,
      options: { captchaToken: captchaToken.value }
    });
    if (error) throw error;
    // For email signups, Supabase usually sends a confirmation email.
    // The user might not be immediately logged in or might be in an unconfirmed state.
    // The onAuthStateChange listener in App.vue will handle actual SIGNED_IN state.
    if (data.user && data.user.identities && data.user.identities.length === 0) {
        signUpSuccessMessage.value = "Sign up almost complete! Please check your email for a confirmation link.";
    } else if (data.session) {
        // This might happen if auto-confirm is on or for some providers, though typically not for email/password.
        // App.vue's onAuthStateChange will handle redirect.
        signUpSuccessMessage.value = "Sign up successful! Redirecting...";
    } else {
        // Fallback, most likely needs email confirmation
        signUpSuccessMessage.value = "Sign up successful! Please check your email to confirm your account.";
    }
    // Reset form and captcha
    email.value = '';
    password.value = '';
    captchaToken.value = null;
    hcaptchaRef.value?.reset();

  } catch (e) {
    authError.value = e.message || "Sign up failed.";
    captchaToken.value = null; // Require new captcha on error
    hcaptchaRef.value?.reset();
  } finally {
    loadingAuth.value = false;
  }
}

async function handleSignIn() {
  if (!captchaToken.value) {
    authError.value = "Please complete the CAPTCHA challenge.";
    return;
  }
  loadingAuth.value = true;
  authError.value = null;
  try {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.value,
      password: password.value,
      options: { captchaToken: captchaToken.value }
    });
    if (error) throw error;
    // Successful sign-in will trigger onAuthStateChange in App.vue, which handles redirection
    // (including to MFA step if needed).
    // No explicit redirect here from AuthPage itself after signInWithPassword.
    // Reset form only on success, but captcha always
    // email.value = '';
    // password.value = '';
  } catch (e) {
    authError.value = e.message || "Sign in failed. Please check your credentials.";
  } finally {
    loadingAuth.value = false;
    captchaToken.value = null; // Always require new captcha
    hcaptchaRef.value?.reset();
  }
}

async function handleVerifyMfa() {
  mfaError.value = null; 
  console.log('[AuthPage] Attempting MFA verification with code input:', mfaCode.value, 'Factor ID:', mfaFactorToVerify.value);
  if (!mfaCode.value || mfaCode.value.length !== 6) {
    mfaError.value = "Please enter a valid 6-digit code.";
    return;
  }
  if (!mfaFactorToVerify.value) {
      mfaError.value = "MFA factor details not available. Please try logging in again.";
      return;
  }
  verifyingMfaCode.value = true;
  try {
    const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: mfaFactorToVerify.value });
    if (challengeError) throw challengeError;
    const challengeId = challengeData.id;
    const { data: verifyData, error: verifyError } = await supabase.auth.mfa.verify({ factorId: mfaFactorToVerify.value, challengeId: challengeId, code: mfaCode.value });
    if (verifyError) throw verifyError;
  } catch (e) {
    console.error("[AuthPage] MFA Verification failed:", e);
    mfaError.value = e.message || "Invalid MFA code or an unexpected error occurred.";
  } finally {
    verifyingMfaCode.value = false;
  }
}
</script>

<style scoped>
.btn-primary {
  @apply px-4 py-2 text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200;
}
/* Add any other specific styles */
</style> 