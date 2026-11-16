<script setup>
import { provide, ref, onMounted, onBeforeUnmount } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { AudioLines, LibraryBig, Disc3, Orbit, Search, X } from 'lucide-vue-next'
import GlobalPlayer from './components/GlobalPlayer.vue'
import { useMusic } from './stores/music'
const m = useMusic(),
  router = useRouter(),
  route = useRoute(),
  search = ref(''),
  field = ref(null)
provide('search', search)
function find() {
  if (route.path !== '/library') router.push('/library')
}
function hotkey(e) {
  if (
    e.key === '/' &&
    !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName) &&
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
  <header class="topbar">
    <div class="top-inner">
      <RouterLink class="brand" to="/library">
        <span class="brand-mark"><AudioLines /></span>
        <b>声境</b>
        <i></i>
        <span>SOUNDSCAPE</span>
      </RouterLink>
      <nav>
        <RouterLink to="/library">
          <LibraryBig />
          发现音乐
        </RouterLink>
        <RouterLink to="/my" :class="{ 'router-link-active': route.path.startsWith('/playlist/') }">
          <Disc3 />
          我的音乐
        </RouterLink>
        <RouterLink to="/player">
          <Orbit />
          播放舞台
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
  <main>
    <RouterView :key="route.path" />
    <p v-if="route.matched.at(-1)?.path.includes('pathMatch')" class="empty">
      页面不存在。
      <RouterLink to="/library">返回曲库</RouterLink>
    </p>
  </main>
  <GlobalPlayer />
  <Transition>
    <div v-if="m.message" class="toast" role="status">{{ m.message }}</div>
  </Transition>
</template>
