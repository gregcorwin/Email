import { createRouter, createWebHistory } from 'vue-router';
import HelloWorld from '../components/HelloWorld.vue'; // Example existing component
import TemplatesListPage from '../views/TemplatesListPage.vue';
import TemplateDetailPage from '../views/TemplateDetailPage.vue';
import AuthPage from '../views/AuthPage.vue'; // Import the new Auth page
import DesignsListPage from '../views/DesignsListPage.vue'; // New
import DesignEditorPage from '../views/DesignEditorPage.vue'; // New (for create/edit)
// New Transformation Set Pages
import TransformationsListPage from '../views/TransformationsListPage.vue';
import TransformationSetEditorPage from '../views/TransformationSetEditorPage.vue';
import CollectionsListPage from '../views/CollectionsListPage.vue'; // New
import CollectionEditorPage from '../views/CollectionEditorPage.vue'; // New
import GalleryPage from '../views/GalleryPage.vue'; // New
import TemplatePreviewPage from '../views/TemplatePreviewPage.vue'; // New
import UserSettingsPage from '../views/UserSettingsPage.vue'; // New
import SecurityDashboardPage from '../views/SecurityDashboardPage.vue'; // New
import { supabase } from '../supabase'; // Import supabase client

const routes = [
  {
    path: '/',
    name: 'Home',
    component: HelloWorld // For now, home can be the default HelloWorld
  },
  {
    path: '/templates',
    name: 'TemplatesList',
    component: TemplatesListPage
  },
  {
    path: '/templates/:id',
    name: 'TemplateDetail',
    component: TemplateDetailPage,
    props: true // Pass route params as props to the component
  },
  {
    path: '/auth',
    name: 'Auth',
    component: AuthPage // Add the route for the Auth page
  },
  {
    path: '/collections', // New Route
    name: 'CollectionsList',
    component: CollectionsListPage
  },
  {
    path: '/collections/new', // New Route
    name: 'CollectionCreate',
    component: CollectionEditorPage,
    props: { mode: 'create' }
  },
  {
     path: '/collections/edit/:id', // New Route
     name: 'CollectionEdit',
     component: CollectionEditorPage,
     props: (route) => ({ mode: 'edit', id: route.params.id })
  },
  {
    path: '/gallery', // New Route
    name: 'GalleryPage',
    component: GalleryPage,
    // props: (route) => ({ collectionId: route.query.collectionId, templateIds: route.query.ids ? route.query.ids.split(',') : [] }) // Optional: to pass params as props
  },
  {
    path: '/template-preview/:id', // New Route for full preview
    name: 'TemplatePreviewPage',
    component: TemplatePreviewPage,
    props: true // Pass route params (id) as props
  },
  {
    path: '/settings', // New Route for User Settings
    name: 'UserSettingsPage',
    component: UserSettingsPage,
    meta: { requiresAuth: true } // Assuming settings page requires login
  },
  {
    path: '/security', // New Route for Security Dashboard
    name: 'SecurityDashboardPage',
    component: SecurityDashboardPage,
    meta: { requiresAuth: true } // Requires auth, page itself will check for admin role
  },
  // Design Routes
  {
    path: '/designs',
    name: 'DesignsList',
    component: DesignsListPage,
    meta: { requiresAuth: true } // Example: Mark route as requiring authentication
  },
  {
    path: '/designs/new',
    name: 'DesignCreate',
    component: DesignEditorPage,
    props: { mode: 'create' }, // Pass mode prop
    meta: { requiresAuth: true }
  },
  {
    path: '/designs/:id/edit',
    name: 'DesignEdit',
    component: DesignEditorPage,
    props: (route) => ({ mode: 'edit', id: route.params.id }), // Pass mode and id props
    meta: { requiresAuth: true }
  },
  // Transformation Set Routes
  {
    path: '/transformations',
    name: 'TransformationsList',
    component: TransformationsListPage,
    meta: { requiresAuth: true }
  },
  {
    path: '/transformations/new',
    name: 'TransformationSetCreate',
    component: TransformationSetEditorPage,
    props: { mode: 'create' },
    meta: { requiresAuth: true }
  },
  {
    path: '/transformations/:id/edit',
    name: 'TransformationSetEdit',
    component: TransformationSetEditorPage,
    props: (route) => ({ mode: 'edit', id: route.params.id }),
    meta: { requiresAuth: true }
  },
  // We will add /templates and /templates/:id routes later
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  linkActiveClass: 'bg-indigo-700 text-white',
  linkExactActiveClass: 'bg-indigo-800 text-white' 
});

// Global navigation guard
router.beforeEach(async (to, from, next) => {
  const { data: { session } } = await supabase.auth.getSession();
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth);
  const MfaIsRequired = to.query.mfa_required === 'true';

  console.log(`[Router Guard] Navigating to: ${to.name}, Requires Auth: ${requiresAuth}, Session: ${session ? 'Exists' : 'Null'}, MFA Query: ${MfaIsRequired}`);

  if (requiresAuth && !session) {
    // If route requires auth and no session, redirect to login page
    console.log('[Router Guard] No session, requires auth. Redirecting to Auth.');
    next({ name: 'Auth' });
  } else if (requiresAuth && session && session.user.aal === 'aal1' && to.name !== 'Auth') {
    // If session exists, is aal1 (MFA pending), and trying to access a protected route OTHER than Auth page (where MFA is handled)
    // Redirect to Auth page for MFA step.
    // This also handles the case where user tries to navigate away from MFA input manually.
    const { data: factorsResponse } = await supabase.auth.mfa.listFactors();
    const hasVerifiedTotp = factorsResponse?.totp?.filter(f => f.status === 'verified').length > 0;
    if (hasVerifiedTotp) {
        console.log('[Router Guard] Session is aal1 with verified factor, navigating to protected route. Redirecting to Auth for MFA.');
        next({ name: 'Auth', query: { mfa_required: 'true' } });
    } else {
        console.log('[Router Guard] Session is aal1 but no verified factor. Allowing navigation for now.');
        next(); // Or could redirect to settings to complete enrollment
    }
  } else if (to.name === 'Auth' && session && session.user.aal !== 'aal1' && !MfaIsRequired) {
    // If user is logged in (and not in MFA step) and tries to go to Auth page, redirect to home/dashboard
    console.log('[Router Guard] Session exists (not aal1 or no MFA query), on Auth page. Redirecting to TemplatesList.');
    next({ name: 'TemplatesList' });
  } else {
    // Otherwise, proceed with navigation
    console.log('[Router Guard] Proceeding with navigation.');
    next();
  }
});

export default router; 