import { createRouter, createWebHashHistory } from 'vue-router';

// Hash-история: Telegram открывает миниапп с #tgWebAppData=…, а nginx не нужен fallback по путям.
export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'aul', component: () => import('@/features/aul/AulView.vue'), meta: { tabs: true } },
    { path: '/lesson', name: 'lesson', component: () => import('@/features/lesson/LessonView.vue') },
    { path: '/bazaar', name: 'bazaar', component: () => import('@/features/bazaar/BazaarView.vue'), meta: { tabs: true } },
    { path: '/baige', name: 'baige', component: () => import('@/features/baige/BaigeView.vue'), meta: { tabs: true } },
    { path: '/profile', name: 'profile', component: () => import('@/features/profile/ProfileView.vue') },
    { path: '/welcome', name: 'welcome', component: () => import('@/features/onboarding/WelcomeView.vue') },
    // Telegram кладёт в hash свои параметры (#tgWebAppData=…) — всё неизвестное ведёт на главную
    { path: '/:rest(.*)*', redirect: '/' },
  ],
  scrollBehavior: () => ({ top: 0 }),
});
