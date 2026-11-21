<script setup>
import { inject } from 'vue'

const clearSearch = inject('clearSearch')
</script>

<template>
  <div class="cover-empty search-empty">
    <p><slot /></p>
    <button class="pill" type="button" @click="clearSearch">清除搜索</button>
  </div>
</template>
