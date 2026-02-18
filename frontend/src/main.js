import { createApp } from 'vue';
import { createPinia } from 'pinia';
import router from './router/index.js';
import App from './App.vue';
import './assets/main.css';

const app = createApp(App);

// Order matters: Pinia must be installed before any store is accessed,
// and the router must be installed before components that use useRouter().
app.use(createPinia());
app.use(router);

app.mount('#app');
