import './assets/main.css'

import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [{ path: '/:page?/:id?', component: App }],
})

router.beforeEach((to) => {
  const privatePages = ['wishlist', 'cart', 'checkout', 'orders', 'profile']
  if (privatePages.includes(String(to.params.page || '')) && !localStorage.getItem('token')) {
    return '/login'
  }
})

createApp(App).use(router).mount('#app')
