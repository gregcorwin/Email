import { createRouter, createWebHistory } from 'vue-router';
import HelloWorld from '../components/HelloWorld.vue'; // Example existing component
import TemplatesListPage from '../views/TemplatesListPage.vue';
import TemplateDetailPage from '../views/TemplateDetailPage.vue';

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
  // We will add /templates and /templates/:id routes later
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router; 