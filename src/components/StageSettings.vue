<script setup>
import Modal from './Modal.vue'
import { backgroundStyles, lyricLayouts, useAppearance } from '../stores/appearance'
import { usePlayer } from '../stores/music'
const appearance = useAppearance()
const player = usePlayer()
const emit = defineEmits(['close'])
</script>

<template>
  <Modal title="显示" panel-class="display-panel" @close="emit('close')">
    <div class="display-groups">
      <fieldset class="appearance-field">
        <legend>歌词样式</legend>
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
      <fieldset class="appearance-field">
        <legend>背景样式</legend>
        <div class="layout-choices background-choices">
          <button
            v-for="{ id, label } in backgroundStyles"
            :key="id"
            :aria-pressed="appearance.background === id"
            @click="appearance.background = id"
          >
            <span class="background-preview" :class="'preview-bg-' + id" aria-hidden="true">
              <img v-if="id === 'album' && player.song" :src="player.song.cover" alt="" />
            </span>
            {{ label }}
          </button>
        </div>
      </fieldset>
    </div>
    <label v-if="appearance.background === 'album'" class="album-glow-control">
      <span>光晕强度</span>
      <input v-model.number="appearance.glow" type="range" min="0" max="100" aria-label="光晕强度" />
      <output>{{ appearance.glow }}%</output>
    </label>
    <label class="motion-choice">
      <input v-model="appearance.reduceMotion" type="checkbox" />
      减少动效
    </label>
  </Modal>
</template>
