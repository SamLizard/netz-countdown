import { createRouter, createWebHashHistory } from 'vue-router';
import HomeView from '@/views/HomeView.vue';

// Hash history: GitHub Pages has no server-side rewrites, and it keeps the PWA start URL simple.
const router = createRouter({
  history: createWebHashHistory(),
  routes: [{ path: '/', name: 'home', component: HomeView }]
});

export default router;
