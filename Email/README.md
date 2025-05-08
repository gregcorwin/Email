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
