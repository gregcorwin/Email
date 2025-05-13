<template>
  <div class="user-settings-page max-w-2xl mx-auto py-8 px-4">
    <h1 class="text-2xl font-bold text-gray-800 mb-6">User Settings</h1>
    
    <div class="bg-white p-6 rounded-lg shadow border border-gray-200">
      <h2 class="text-xl font-semibold text-gray-700 mb-1">Multi-Factor Authentication (MFA)</h2>
      <p class="text-sm text-gray-500 mb-4">Enhance your account security by enabling TOTP-based MFA.</p>

      <div v-if="loadingMfaStatus" class="text-center text-gray-500 py-4">Loading MFA status...</div>
      <div v-else-if="mfaError" class="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded text-sm mb-4" role="alert">
        Error managing MFA: {{ mfaError }}
      </div>
      
      <!-- MFA Enabled State -->
      <div v-if="mfaEnabled && currentFactor" class="space-y-3">
        <p class="text-green-600 bg-green-50 p-3 rounded-md border border-green-200 text-sm">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 inline mr-1.5 -mt-0.5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" /></svg>
          MFA is currently <strong class="font-semibold">ENABLED</strong> for your account.
        </p>
        <p class="text-xs text-gray-500">Factor ID: {{ currentFactor.id }} (Type: {{ currentFactor.factor_type }}, Status: {{currentFactor.status}})</p>
        <button 
          @click="handleUnenrollMfa"
          :disabled="unenrollingMfa"
          class="px-4 py-2 text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
        >
          <span v-if="unenrollingMfa">Disabling MFA...</span>
          <span v-else>Disable MFA</span>
        </button>
      </div>

      <!-- MFA Not Enabled State -->
      <div v-else-if="!enrollingMfa" class="space-y-3">
        <p class="text-yellow-700 bg-yellow-50 p-3 rounded-md border border-yellow-200 text-sm">
            MFA is currently <strong class="font-semibold">DISABLED</strong> for your account.
        </p>
        <button 
          @click="handleEnrollMfa"
          class="px-4 py-2 text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
        >
          Enable MFA with Authenticator App
        </button>
      </div>

      <!-- MFA Enrollment Steps -->
      <div v-if="enrollingMfa" class="mt-6 p-4 border border-gray-200 rounded-md bg-gray-50 space-y-4">
        <h3 class="text-lg font-semibold text-gray-700">Step 1: Scan QR Code or Enter Secret</h3>
        <div v-if="enrollStep === 'fetchingFactor'" class="text-gray-600">Generating QR code...</div>
        <div v-if="enrollStep === 'displayFactor' && qrCodeDataUri">
          <p class="text-sm text-gray-600 mb-2">Scan the QR code with your authenticator app (e.g., Google Authenticator, Authy, Duo Mobile).</p>
          <div class="flex justify-center my-4">
            <img :src="qrCodeDataUri" alt="MFA QR Code" class="border p-1 bg-white">
          </div>
          <p class="text-sm text-gray-600 mb-1">Alternatively, manually enter this secret key:</p>
          <div class="p-2 bg-gray-200 text-gray-800 font-mono text-sm rounded break-all select-all cursor-pointer" title="Click to copy secret (manual copy needed)">
            {{ mfaSecret }}
          </div>
        </div>

        <h3 class="text-lg font-semibold text-gray-700 mt-4">Step 2: Verify Code</h3>
        <div>
          <label for="mfaVerificationCode" class="block text-sm font-medium text-gray-700 mb-1">Enter 6-digit code from your app:</label>
          <input 
            type="text" 
            id="mfaVerificationCode" 
            v-model.trim="mfaVerificationCode"
            @input="mfaEnrollError = null"
            maxlength="6" 
            pattern="[0-9]{6}"
            required
            class="mt-1 block w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="123456"
            :disabled="enrollStep !== 'displayFactor' && enrollStep !== 'verifying'"
          />
        </div>

        <div v-if="mfaEnrollError" class="text-red-600 bg-red-50 p-2 rounded text-sm">{{ mfaEnrollError }}</div>

        <div class="flex space-x-3 mt-4">
          <button 
            @click="handleVerifyMfaCode"
            :disabled="mfaVerificationCode.length !== 6 || enrollStep !== 'displayFactor' && enrollStep !== 'verifying' || verifyingCode"
            class="px-4 py-2 text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            <span v-if="verifyingCode">Verifying...</span>
            <span v-else>Verify & Enable MFA</span>
          </button>
          <button @click="cancelEnrollment" class="px-4 py-2 text-sm font-medium rounded-md text-gray-700 bg-gray-200 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500">
            Cancel Enrollment
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { supabase } from '../supabase';

const loadingMfaStatus = ref(true);
const mfaEnabled = ref(false);
const currentFactor = ref(null); // To store the active TOTP factor
const mfaError = ref(null);

// Enrollment state
const enrollingMfa = ref(false); // General flag if enrollment process is active
const enrollStep = ref(''); // 'fetchingFactor', 'displayFactor', 'verifying'
const qrCodeDataUri = ref('');
const mfaSecret = ref('');
const mfaFactorIdToVerify = ref(null);
const mfaVerificationCode = ref('');
const mfaEnrollError = ref(null);
const verifyingCode = ref(false);

// Unenrollment state
const unenrollingMfa = ref(false);

async function checkMfaStatus() {
  loadingMfaStatus.value = true;
  mfaError.value = null;
  try {
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error) throw error;

    if (data && data.totp && data.totp.length > 0) {
      const activeTotpFactor = data.totp.find(factor => factor.status === 'verified');
      if (activeTotpFactor) {
        mfaEnabled.value = true;
        currentFactor.value = activeTotpFactor;
      } else {
        mfaEnabled.value = false;
        currentFactor.value = null;
      }
    } else {
      mfaEnabled.value = false;
      currentFactor.value = null;
    }
  } catch (e) {
    console.error("Error fetching MFA status:", e);
    mfaError.value = e.message || "Could not retrieve MFA status.";
    mfaEnabled.value = false; // Assume disabled on error
  } finally {
    loadingMfaStatus.value = false;
  }
}

async function handleEnrollMfa() {
  enrollingMfa.value = true;
  enrollStep.value = 'fetchingFactor';
  mfaEnrollError.value = null; 
  qrCodeDataUri.value = '';
  mfaSecret.value = '';
  mfaFactorIdToVerify.value = null;
  console.log('[MFA_ENROLL] Attempting to enroll...');

  try {
    // Supabase recommends un-enrolling all existing TOTP factors first 
    // if re-enrolling, to avoid the "friendly name exists" error easily.
    // However, we first need to list them to get IDs.
    const { data: existingFactors, error: listError } = await supabase.auth.mfa.listFactors();
    if (listError) {
        console.warn("[MFA_ENROLL] Could not list existing factors, proceeding with enroll attempt anyway:", listError.message);
    } else if (existingFactors && existingFactors.totp && existingFactors.totp.length > 0) {
        console.log("[MFA_ENROLL] Found existing TOTP factors:", existingFactors.totp);
        // Attempt to unenroll any existing TOTP factors to prevent conflicts
        // This is aggressive, a more nuanced approach might be to only unenroll unverified ones
        // or ones with a null/empty friendly_name if the API allowed targeting them.
        // For simplicity now, if any TOTP factor exists, we try to unenroll it before enrolling a new one.
        // This assumes a user typically only has one TOTP device active.
        for (const factor of existingFactors.totp) {
            console.log(`[MFA_ENROLL] Attempting to unenroll existing factor ID: ${factor.id}`);
            const { error: unenrollError } = await supabase.auth.mfa.unenroll({ factorId: factor.id });
            if (unenrollError) {
                console.warn(`[MFA_ENROLL] Failed to unenroll existing factor ${factor.id}:`, unenrollError.message);
                // If unenroll fails, the subsequent enroll might still hit the friendly name conflict.
                // We could throw an error here to stop, or let it proceed and potentially fail on enroll.
            }
        }
    }

    console.log('[MFA_ENROLL] Calling supabase.auth.mfa.enroll({ factorType: \'totp\' })');
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' });
    
    if (error) {
        console.error("[MFA_ENROLL] Supabase enroll error:", error);
        mfaEnrollError.value = error.message || "MFA enrollment failed. Please try again or contact support if issues persist.";
        enrollStep.value = ''; 
        enrollingMfa.value = false; 
        return; 
    }
    
    console.log("[MFA_ENROLL] Enroll call successful, data:", data);
    mfaFactorIdToVerify.value = data.id;
    qrCodeDataUri.value = data.totp.qr_code;
    mfaSecret.value = data.totp.secret;
    enrollStep.value = 'displayFactor';
    console.log("[MFA_ENROLL] QR code and secret ready to display.");

  } catch (e) { 
    console.error("[MFA_ENROLL] General catch error during enrollment process:", e);
    mfaEnrollError.value = e.message || "An unexpected error occurred during MFA enrollment.";
    enrollStep.value = '';
    enrollingMfa.value = false;
  }
}

async function handleVerifyMfaCode() {
  mfaEnrollError.value = null;
  console.log('[MFA_VERIFY] Attempting to verify. Current code input:', mfaVerificationCode.value);

  if (enrollStep.value !== 'displayFactor') {
    console.warn("[MFA_VERIFY] handleVerifyMfaCode called at unexpected enrollStep:", enrollStep.value);
    mfaEnrollError.value = "Verification process in unexpected state. Please cancel and retry.";
    return;
  }

  if (!mfaVerificationCode.value || mfaVerificationCode.value.length !== 6) {
    mfaEnrollError.value = "Please enter a valid 6-digit code.";
    console.log('[MFA_VERIFY] Validation failed: Code length or empty.');
    return;
  }

  verifyingCode.value = true;
  try {
    console.log(`[MFA_VERIFY] Calling challengeAndVerify with factorId: ${mfaFactorIdToVerify.value}, code: ${mfaVerificationCode.value}`);
    const { data, error } = await supabase.auth.mfa.challengeAndVerify({
      factorId: mfaFactorIdToVerify.value,
      code: mfaVerificationCode.value
    });

    if (error) {
      console.error("[MFA_VERIFY] Supabase challengeAndVerify error:", error);
      throw error;
    }
    
    console.log("[MFA_VERIFY] challengeAndVerify success:", data);
    await checkMfaStatus(); 
    enrollingMfa.value = false; 
    enrollStep.value = '';      
    mfaVerificationCode.value = ''; 
  } catch (e) {
    console.error("MFA Verification failed overall catch:", e);
    mfaEnrollError.value = e.message || "MFA verification failed. Invalid code or server error.";
  } finally {
    verifyingCode.value = false;
    console.log('[MFA_VERIFY] Verification attempt finished.');
  }
}

async function handleUnenrollMfa() {
  unenrollingMfa.value = true;
  mfaEnrollError.value = null;
  try {
    const { data, error } = await supabase.auth.mfa.unenroll({ factorId: currentFactor.value.id });
    if (error) throw error;
    
    await checkMfaStatus();
  } catch (e) {
    console.error("Error unenrolling MFA:", e);
    mfaEnrollError.value = e.message || "Error unenrolling MFA. Please try again later.";
  } finally {
    unenrollingMfa.value = false;
  }
}

function cancelEnrollment() {
  enrollingMfa.value = false;
  enrollStep.value = '';
  mfaVerificationCode.value = '';
}

onMounted(async () => {
  await checkMfaStatus();
});
</script>

<style scoped>
/* Add any specific styles for the settings page */
</style> 