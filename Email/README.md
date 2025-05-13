# Vue 3 + Vite

This template should help get you started developing with Vue 3 in Vite. The template uses Vue 3 `<script setup>` SFCs, check out the [script setup docs](https://v3.vuejs.org/api/sfc-script-setup.html#sfc-script-setup) to learn more.

Learn more about IDE Support for Vue in the [Vue Docs Scaling up Guide](https://vuejs.org/guide/scaling-up/tooling.html#ide-support).

---

## Supabase Integration

This project uses [Supabase](https://supabase.com/) for backend services.

### Environment Variables
Create a `.env` file in the `Email` directory with the following:

```
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

Replace `your-supabase-url` and `your-supabase-anon-key` with your actual Supabase project credentials.

### Supabase Client
The Supabase client is initialized in `src/supabase.js` and can be imported anywhere in your Vue app:

```js
import { supabase } from './supabase';
```

---

## Supabase Row Level Security (RLS) & Role-Based Access

This project uses robust RLS (Row Level Security) policies in Supabase to control access to tables based on user roles.

### Admin Policy Pattern
- **Admin rights** (such as deleting any template) are granted by checking the `user_roles` table directly in RLS policies, not relying on JWT claims.
- This ensures that role changes take effect immediately and are always enforced at the database level.

**Example RLS Policy for Admin Delete:**
```sql
CREATE POLICY "Allow app_admin delete"
ON public.templates
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'app_admin'
  )
);
```

### Recommended Pattern for Other Roles/Tables
- Use the same pattern for any table and role:
  - Check the `user_roles` table for the required role in the RLS policy.
  - Example for designer update rights:
    ```sql
    CREATE POLICY "Allow designer update"
    ON public.templates
    FOR UPDATE
    USING (
      EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() AND role = 'designer'
      )
    );
    ```
- This approach is dynamic, secure, and does not require JWT claim updates or session refreshes after role changes.

---
