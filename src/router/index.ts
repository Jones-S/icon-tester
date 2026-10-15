import { createRouter, createWebHistory } from 'vue-router'
import IconTesterView from '@/views/IconTesterView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [{ path: '/', name: 'icon-tester', component: IconTesterView }],
})

export default router
