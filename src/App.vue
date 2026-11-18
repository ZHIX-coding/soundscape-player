<script setup>
import { provide, ref, onMounted, onBeforeUnmount } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {
  AudioLines,
  Compass,
  Disc3,
  Mic2,
  FolderDown,
  PanelsTopLeft,
  Search,
  X,
} from 'lucide-vue-next'
import GlobalPlayer from './components/GlobalPlayer.vue'
import { useMusic } from './stores/music'
const m = useMusic(),
  router = useRouter(),
  route = useRoute(),
  search = ref(''),
  field = ref(null)
provide('search', search)
function find() {
  if (route.path !== '/library' && route.path !== '/local') router.push('/library')
}
function hotkey(e) {
  if (
    e.key === '/' &&
    !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName) &&
    field.value &&
    !document.querySelector('dialog[open]')
  ) {
    e.preventDefault()
    field.value.focus()
  }
}
onMounted(() => window.addEventListener('keydown', hotkey))
onBeforeUnmount(() => window.removeEventListener('keydown', hotkey))
</script>
<template>
  <a class="skip-link" href="#main-content" @click.prevent="$refs.main.focus()">跳到主要内容</a>
  <header v-if="!['/queue', '/player'].includes(route.path)" class="topbar">
    <div class="top-inner">
      <RouterLink class="brand" to="/library">
        <span class="brand-mark"><AudioLines /></span>
        <span class="brand-name">
          <b>声境</b>
          <small>Soundscape</small>
        </span>
      </RouterLink>
      <nav aria-label="主导航">
        <RouterLink to="/library">
          <Compass />
          发现
        </RouterLink>
        <RouterLink to="/my" :class="{ 'router-link-active': route.path.startsWith('/playlist/') }">
          <Disc3 />
          歌单
        </RouterLink>
        <RouterLink to="/artists">
          <Mic2 />
          歌手
        </RouterLink>
        <RouterLink to="/local">
          <FolderDown />
          本地
        </RouterLink>
        <RouterLink class="queue-nav" to="/queue" aria-label="队列">
          <PanelsTopLeft aria-hidden="true" />
          <span aria-hidden="true">队列</span>
        </RouterLink>
      </nav>
      <label class="search">
        <Search />
        <input
          ref="field"
          v-model="search"
          aria-label="搜索曲库"
          placeholder="搜索曲目、艺术家"
          @input="find"
          @keyup.enter="find"
        />
        <button v-if="search" class="icon" aria-label="清除搜索" @click="search = ''">
          <X />
        </button>
        <kbd v-else>/</kbd>
      </label>
    </div>
  </header>
  <main
    id="main-content"
    ref="main"
    :class="{ 'wall-main': route.path === '/queue' }"
    tabindex="-1"
  >
    <RouterView :key="route.path" />
    <p v-if="route.matched.at(-1)?.path.includes('pathMatch')" class="empty">
      页面不存在。
      <RouterLink to="/library">返回曲库</RouterLink>
    </p>
  </main>
  <GlobalPlayer :compact="route.path === '/queue'" :now-playing="route.path === '/player'" />
  <Transition>
    <div v-if="m.message" class="toast" role="status">{{ m.message }}</div>
  </Transition>
</template>
