<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { X } from 'lucide-vue-next'
defineProps({ title: { type: String, required: true } })
const emit = defineEmits(['close'])
const box = ref(null)
let previous
onMounted(async () => {
  previous = document.activeElement
  await nextTick()
  box.value.showModal()
  box.value.querySelector('[autofocus]')?.focus()
})
onBeforeUnmount(() => {
  box.value?.close()
  previous?.focus()
})
</script>
<template>
  <Teleport to="body">
    <dialog
      ref="box"
      class="modal"
      :aria-label="title"
      @cancel.prevent="emit('close')"
      @click="
        (e) => {
          if (e.target === box) emit('close')
        }
      "
    >
      <section>
        <header class="row">
          <h2>{{ title }}</h2>
          <button class="icon" aria-label="关闭" @click="emit('close')"><X /></button>
        </header>
        <slot />
      </section>
    </dialog>
  </Teleport>
</template>
