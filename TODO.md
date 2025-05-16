# Project TODO List

## Security Enhancements (Phase 15+)

- **[ ] Implement AAL2 Checks for Sensitive Operations:**
  - Review application for actions (e.g., critical settings changes, bulk data export/delete) that should require a fresh MFA verification (AAL2 status).
  - Update relevant RLS policies or Edge Function logic to check `auth.jwt()->>'aal' = 'aal2'`.

- **[ ] Refine Default Authenticated User Read Access:**
  - Evaluate if default authenticated users (without a specific role in `user_roles`) should have read-all access to `templates`, `collections`, `designs`, `transformation_sets`.
  - If not, update RLS SELECT policies to restrict their read access to only items they own.

- **[ ] Comprehensive Input Validation & Sanitization (Server-Side Focus):**
  - As Edge Functions or custom DB functions are added that take user input for write operations, rigorously validate and sanitize all inputs on the server-side to prevent injection attacks (SQLi, XSS if data is re-rendered unsafely).

- **[ ] Output Encoding Review (XSS Prevention):**
  - Periodically review any parts of the Vue app that use `v-html` or directly render user-supplied content outside of sandboxed iframes. Ensure proper sanitization or encoding is in place.

- **[ ] Dependency Management & Regular Audits:**
  - Establish a routine to regularly update NPM packages (`npm update`).
  - Periodically run `npm audit` and address reported vulnerabilities.

- **[ ] HTTP Security Headers (CSP, HSTS, etc.):**
  - When deploying to production hosting, investigate and configure appropriate HTTP security headers (Content Security Policy, HSTS, X-Content-Type-Options, X-Frame-Options) at the hosting provider level or via edge functions if possible.

- **[ ] Enhanced Secure Error Handling & Security Event Logging:**
  - Ensure client-side errors never expose sensitive backend details.
  - Consider if specific security-related events (e.g., repeated auth failures from an IP, admin actions, RLS violations if loggable) warrant custom logging to a dedicated Supabase table (with strict RLS) or an external logging service for audit and incident response.

- **[ ] Session Management Review:**
  - Review Supabase session duration settings and ensure they align with security requirements.
  - Confirm secure handling of JWTs (though Supabase client generally manages this well).

- **[ ] Custom Rate Limiting for Specific Edge Functions:**
  - If any Edge Functions (beyond core Auth) are identified as potential abuse targets or have downstream API limits (like the `geo-check` function calling `ip-api.com`), implement custom rate limiting (e.g., token bucket using a Supabase table to track requests per IP/user).

- **[ ] CAPTCHA for Password Reset:**
  - Ensure CAPTCHA is enabled for the password reset functionality in Supabase Auth settings (if not already covered by the global CAPTCHA enablement for all auth actions).

- **[ ] User Role Management UI for Admins:**
  - If admins need to manage user roles (`app_admin`, `designer`, `qa`) through the application UI (instead of only via Supabase Studio), create secure `SECURITY DEFINER` PostgreSQL functions for these operations and an admin-only UI to call them.

- **[ ] Security Reporting/Status Dashboard (Future Major Feature):**
  - Plan and design a dashboard for admins to view security-related events, MFA adoption, suspicious activity logs, etc. This would be built upon more detailed logging mechanisms.

## Other Future Enhancements / TODOs

- **[ ] Export PDF/Image (Server-Side):**
  - Revisit server-side generation for high-fidelity PDFs or PNGs, potentially using a third-party API service or a self-hosted microservice with Puppeteer/Playwright, triggered by an Edge Function.

- **[ ] Design Asset Management (Item 7 from Phase 14):**
  - Improving how image URLs are managed within designs (e.g., Supabase Storage integration, UI to upload/select images for design assets like `header_image_url`).

- **[ ] Transformation Preview - Preview All Selected:**
  - Extend the current single-template transformation preview to allow previewing changes for *all* selected templates within the modal, perhaps with a carousel or list of before/after snippets.

- **[ ] Loading Indicators - Visual Spinners/Skeletons:**
  - Replace text-based loading indicators (e.g., "Loading templates...") with more engaging visual spinners or skeleton loading UI patterns for a more polished feel during data fetching.

- **[ ] Global Toast Notification System:**
  - Implement a non-blocking toast notification system for success, error, and warning messages, instead of inline text messages or browser alerts, for a more modern UX.

- **[ ] Mobile Menu Functionality:**
  - Implement the JavaScript logic for the `mobileMenuOpen` ref in `App.vue` to make the hamburger menu functional for mobile navigation.

- **[ ] Delete Buttons for Designs and Transformation Sets:**
  - Add delete functionality (button, confirmation, RLS-protected backend call) to `DesignsListPage.vue` and `TransformationsListPage.vue`. 