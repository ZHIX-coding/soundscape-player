<script setup>
import { ref } from 'vue'
import Modal from './Modal.vue'
import { useMusic } from '../stores/music'
const props = defineProps({ list: { type: Object, default: null } })
const emit = defineEmits(['close', 'saved'])
const m = useMusic(),
  name = ref(props.list?.name || ''),
  desc = ref(props.list?.description || ''),
  error = ref('')
function submit() {
  error.value = m.putList(props.list?.id, name.value, desc.value)
  if (!error.value) {
    emit('saved', props.list?.id || m.lists.at(-1).id)
    emit('close')
  }
}
</script>
<template>
  <Modal :title="list ? '编辑歌单' : '新建歌单'" @close="emit('close')">
    <form novalidate @submit.prevent="submit">
      <label>
        歌单名称
        <input
          v-model="name"
          autofocus
          placeholder="给歌单取个名字"
          :aria-invalid="!!error"
          @input="error = ''"
        />
      </label>
      <p v-if="error" role="alert" class="error">{{ error }}</p>
      <label>
        简介
        <small>选填</small>
        <textarea v-model="desc" maxlength="200" placeholder="记录这份歌单的心情"></textarea>
      </label>
      <button class="solid">{{ list ? '保存更改' : '创建歌单' }}</button>
    </form>
  </Modal>
</template>
