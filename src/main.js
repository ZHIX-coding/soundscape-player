import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createRouter, createWebHashHistory } from 'vue-router'
import App from './App.vue'
import Library from './pages/Library.vue'
import Collection from './pages/Collection.vue'
import Playlist from './pages/Playlist.vue'
import Stage from './pages/Stage.vue'
import './style.css'
import './stage.css'
import './exhibition.css'
import { restoreImports } from './data/local'
import { loadRemoteCatalog } from './data/remote'
const router = createRouter({
  history: createWebHashHistory(),
  scrollBehavior: () => ({ top: 0 }),
  routes: [
    { path: '/', redirect: '/library' },
    { path: '/library', component: Library },
    { path: '/my', component: Collection },
    { path: '/playlist/:id', component: Playlist },
    { path: '/player', component: Stage },
    { path: '/:pathMatch(.*)*', component: { render: () => null } },
  ],
})
Promise.all([
  restoreImports().catch(() => console.warn('本地音乐存储暂不可用')),
  loadRemoteCatalog(import.meta.env.VITE_CATALOG_URL),
]).then(() => {
  createApp(App).use(createPinia()).use(router).mount('#app')
})
