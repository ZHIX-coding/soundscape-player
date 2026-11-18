<script setup>
import Modal from './Modal.vue'
import { lyricLayouts, useAppearance } from '../stores/appearance'
const appearance = useAppearance()
const emit = defineEmits(['close'])
</script>

<template>
  <Modal title="显示" @close="emit('close')">
    <fieldset class="appearance-field">
      <legend>歌词</legend>
      <div class="layout-choices">
        <button
          v-for="{ id, label } in lyricLayouts"
          :key="id"
          :aria-pressed="appearance.lyrics === id"
          @click="appearance.lyrics = id"
        >
          <span class="layout-preview" :class="'preview-' + id" aria-hidden="true">
            <i></i>
            <b></b>
            <b></b>
            <b></b>
          </span>
          {{ label }}
        </button>
      </div>
    </fieldset>
    <fieldset v-if="appearance.lyrics !== 'poster'" class="appearance-field">
      <legend>背景</legend>
      <div class="toggle-group">
        <button
          :aria-pressed="appearance.background === 'color'"
          :class="{ active: appearance.background === 'color' }"
          @click="appearance.background = 'color'"
        >
          取色
        </button>
        <button
          :aria-pressed="appearance.background === 'cover'"
          :class="{ active: appearance.background === 'cover' }"
          @click="appearance.background = 'cover'"
        >
          封面
        </button>
      </div>
    </fieldset>
    <label class="motion-choice">
      <input v-model="appearance.reduceMotion" type="checkbox" />
      减少动效
    </label>
  </Modal>
</template>
