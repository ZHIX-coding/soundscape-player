<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { X } from 'lucide-vue-next'
defineProps({ title: { type: String, required: true }, panelClass: { type: String, default: '' } })
const emit = defineEmits(['close', 'opened'])
const box = ref(null)
let previous
onMounted(async () => {
  previous = document.activeElement
  await nextTick()
  box.value.showModal()
  box.value.querySelector('[autofocus]')?.focus()
  emit('opened')
})
onBeforeUnmount(() => {
  box.value?.close()
  previous?.focus({ preventScroll: true })
})
</script>
<template>
  <Teleport to="body">
    <dialog
      ref="box"
      class="modal"
      :class="panelClass"
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
          <div class="modal-header-actions">
            <slot name="header-actions" />
            <button class="icon" aria-label="关闭" @click="emit('close')"><X /></button>
          </div>
        </header>
        <slot />
      </section>
    </dialog>
  </Teleport>
</template>
