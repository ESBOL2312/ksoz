import '@fontsource/nunito/500.css';
import '@fontsource/nunito/700.css';
import '@fontsource/nunito/800.css';
import '@fontsource/nunito/900.css';
import '@fontsource/rubik/600.css';
import '@fontsource/rubik/700.css';
import '@fontsource/rubik/800.css';
import '@fontsource/rubik/900.css';
import './assets/main.css';

import ui from '@nuxt/ui/vue-plugin';
import { VueQueryPlugin } from '@tanstack/vue-query';
import { createPinia } from 'pinia';
import { createApp } from 'vue';
import App from './App.vue';
import { queryClient } from './api/queryClient';
import { router } from './router';
import { useSessionStore } from './stores/session';

async function bootstrap() {
  const app = createApp(App);
  const pinia = createPinia();
  app.use(pinia);
  // Telegram-контекст нужен до первого запроса (заголовок Authorization и ключ outbox)
  await useSessionStore(pinia).init();
  app.use(router);
  app.use(VueQueryPlugin, { queryClient });
  app.use(ui);
  await router.isReady();
  app.mount('#app');
}

void bootstrap();
