<script setup>
import Modal from './Modal.vue'
import { useAppearance } from '../stores/appearance'
const appearance = useAppearance()
const emit = defineEmits(['close'])
</script>

<template>
  <Modal title="舞台外观" @close="emit('close')">
    <fieldset class="appearance-field">
      <legend>歌词字号</legend>
      <div class="toggle-group">
        <button
          v-for="size in ['标准', '放大']"
          :key="size"
          :aria-pressed="appearance.size === size"
          :class="{ active: appearance.size === size }"
          @click="appearance.size = size"
        >
          {{ size }}
        </button>
      </div>
    </fieldset>
    <fieldset class="appearance-field">
      <legend>舞台背景</legend>
      <div class="toggle-group">
        <button
          v-for="background in ['封面', '柔焦']"
          :key="background"
          :aria-pressed="appearance.background === background"
          :class="{ active: appearance.background === background }"
          @click="appearance.background = background"
        >
          {{ background }}
        </button>
      </div>
    </fieldset>
    <label class="motion-choice">
      <input v-model="appearance.reduceMotion" type="checkbox" />
      减少舞台动效
    </label>
  </Modal>
</template>
