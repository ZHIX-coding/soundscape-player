import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createRouter, createWebHashHistory } from 'vue-router'
import App from './App.vue'
import Library from './pages/Library.vue'
import Collection from './pages/Collection.vue'
import Playlist from './pages/Playlist.vue'
import Stage from './pages/Stage.vue'
import Artists from './pages/Artists.vue'
import QueueWall from './pages/QueueWall.vue'
import './style.css'
import './exhibition.css'
import './room.css'
import './queue.css'
import './stage.css'
import './orbit.css'
import './covers.css'
import './cinema.css'
import './album.css'
import { restoreImports } from './data/local'
import { loadRemoteCatalog } from './data/remote'
import { loadBrowserTestSongs } from './data/songs'
const router = createRouter({
  history: createWebHashHistory(),
  scrollBehavior: () => ({ top: 0 }),
  routes: [
    { path: '/', redirect: '/library' },
    { path: '/library', component: Library },
    { path: '/local', component: Library, props: { local: true } },
    { path: '/my', component: Collection },
    { path: '/artists', component: Artists },
    { path: '/artists/:name', name: 'artist', component: Artists },
    { path: '/queue', component: QueueWall },
    { path: '/playlist/:id', component: Playlist },
    { path: '/player', component: Stage },
    { path: '/:pathMatch(.*)*', component: { render: () => null } },
  ],
})
loadBrowserTestSongs()
  .then(() =>
    Promise.all([
      restoreImports().catch(() => console.warn('本地音乐存储暂不可用')),
      import.meta.env.MODE !== 'browser-test' &&
        loadRemoteCatalog(
          import.meta.env.VITE_CATALOG_URL ||
            import.meta.env.BASE_URL + 'music-library/catalog.json',
        ),
    ]),
  )
  .then(() => {
    createApp(App).use(createPinia()).use(router).mount('#app')
  })
