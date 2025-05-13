import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"; // Use esm.sh for Supabase client in Deno

console.log("[get-rls-policies] Function booting up (v10 - Explicit CORS headers on all responses).");

const baseHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*", // Or your specific frontend origin e.g., http://emailapp.test:5173
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: baseHeaders }); // Preflight CORS
  }

  const logAndCreateErrorResponse = (errorMessage, statusCode, internalDetail) => {
    console.error(`[get-rls-policies] Error: ${errorMessage}`, internalDetail ? `Details: ${internalDetail}` : '');
    return new Response(
      JSON.stringify({ error: { http_code: statusCode, message: errorMessage } }),
      { status: statusCode, headers: baseHeaders } // Use baseHeaders
    );
  };

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? ""; // This one is fine, auto-injected by Supabase
    const serviceRoleKey = Deno.env.get("CUSTOM_SUPABASE_SERVICE_ROLE_KEY") ?? ""; // Using new custom name

    if (!supabaseUrl || !serviceRoleKey) {
        return logAndCreateErrorResponse("Function not configured correctly. Missing critical environment variables.", 500, "Env vars missing");
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    // The Authorization header for supabaseAdmin client is automatically set when service_role key is provided as the second argument to createClient.
    // No need for global: { headers: { Authorization: ... } } for service role client.

    // Verify the user making this specific request is an app_admin by checking their JWT
    // This is crucial if the function is invoked directly by a client, not just by an admin-only UI page.
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return logAndCreateErrorResponse("Missing Authorization header.", 401, "No Auth header");
    }
    const token = authHeader.replace('Bearer ', '');
    // Use a temporary client with anon key to verify JWT, or the admin client if it doesn't bypass JWT checks for getUser
    // For safety, let's use the standard client for getUser to ensure RLS on user_roles is respected if necessary (though admin check is separate)
    const supabaseAnonForUserCheck = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY") ?? "");
    const { data: { user }, error: userError } = await supabaseAnonForUserCheck.auth.getUser(token);

    if (userError || !user) {
      return logAndCreateErrorResponse("Authentication failed or invalid token.", 401, userError?.message);
    }

    // Check user role using the supabaseAdmin client (which has service_role privileges)
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'app_admin')
      .maybeSingle();

    if (roleError) {
      return logAndCreateErrorResponse("Failed to verify user role.", 500, roleError.message);
    }
    if (!roleData) {
      return logAndCreateErrorResponse("Access Denied: Administrator privileges required.", 403, `User ID ${user.id} not admin.`);
    }
    console.log("[get-rls-policies] Admin user confirmed:", user.id);

    const targetTables = [
      'templates',
      'collections',
      'designs',
      'transformation_sets',
      'transformation_rules',
      'template_variables',
      'user_roles'
    ];

    // Call the PostgreSQL function using rpc()
    const { data: policies, error: rpcError } = await supabaseAdmin
      .rpc('get_all_rls_policies_for_tables', { table_names: targetTables });

    if (rpcError) {
      return logAndCreateErrorResponse("Failed to fetch RLS policies via RPC.", 500, rpcError.message);
    }

    console.log("[get-rls-policies] RLS Policies fetched successfully via RPC.");
    return new Response(JSON.stringify(policies || []), { status: 200, headers: baseHeaders });

  } catch (e) {
    // This top-level catch is for unexpected errors in the function logic itself.
    return logAndCreateErrorResponse("An unexpected server error occurred.", 500, e.message);
  }
}); 