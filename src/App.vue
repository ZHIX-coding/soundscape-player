<script setup>
import { computed, provide, reactive, ref, onMounted, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import { AudioLines, PanelsTopLeft, Search, X } from 'lucide-vue-next'
import GlobalPlayer from './components/GlobalPlayer.vue'
import { useMusic } from './stores/music'
const m = useMusic(),
  route = useRoute(),
  searches = reactive(new Map()),
  search = computed({
    get: () => searches.get(route.path) ?? '',
    set: (value) => searches.set(route.path, value),
  }),
  field = ref(null)
provide('search', search)
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
        </span>
      </RouterLink>
      <nav aria-label="主导航">
        <RouterLink to="/library">发现</RouterLink>
        <RouterLink to="/my" :class="{ 'router-link-active': route.path.startsWith('/playlist/') }">
          歌单
        </RouterLink>
        <RouterLink
          to="/artists"
          :class="{ 'router-link-active': route.path.startsWith('/artists/') }"
        >
          歌手
        </RouterLink>
        <RouterLink to="/local">本地</RouterLink>
        <RouterLink
          class="queue-nav"
          :to="{ path: '/queue', query: { from: route.path } }"
          aria-label="队列"
        >
          <PanelsTopLeft aria-hidden="true" />
          <span aria-hidden="true">队列</span>
        </RouterLink>
      </nav>
      <label class="search">
        <Search />
        <input ref="field" v-model="search" aria-label="搜索曲库" placeholder="搜索" />
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
