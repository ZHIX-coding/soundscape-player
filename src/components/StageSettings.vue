<script setup>
import Modal from './Modal.vue'
import { useAppearance } from '../stores/appearance'
const appearance = useAppearance()
const emit = defineEmits(['close'])
const choices = [
  {
    key: 'lyrics',
    label: '歌词',
    options: [
      ['focus', '焦点'],
      ['list', '列表'],
    ],
  },
  {
    key: 'background',
    label: '背景',
    options: [
      ['color', '取色'],
      ['cover', '封面'],
    ],
  },
]
</script>

<template>
  <Modal title="显示" @close="emit('close')">
    <fieldset v-for="choice in choices" :key="choice.key" class="appearance-field">
      <legend>{{ choice.label }}</legend>
      <div class="toggle-group">
        <button
          v-for="[id, label] in choice.options"
          :key="id"
          :class="{ active: appearance[choice.key] === id }"
          :aria-pressed="appearance[choice.key] === id"
          @click="appearance[choice.key] = id"
        >
          {{ label }}
        </button>
      </div>
    </fieldset>
    <label class="motion-choice">
      <input v-model="appearance.reduceMotion" type="checkbox" />
      减少动效
    </label>
  </Modal>
</template>
