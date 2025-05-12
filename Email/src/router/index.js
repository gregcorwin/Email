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
  history: createWebHistory(),
  routes,
});

export default router; 