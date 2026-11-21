<script>
const positions = new Map()
</script>

<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps({
  items: { type: Array, required: true },
  label: { type: String, required: true },
  memoryKey: { type: String, required: true },
  filter: { type: String, default: '' },
})
const emit = defineEmits(['preview'])
const rail = ref(null)
const focused = ref('')
let drag
let swallowClick = false
let frame = 0

function remember() {
  const box = rail.value
  if (!box) return
  positions.set(props.memoryKey, box.scrollLeft)
  if (!frame) frame = requestAnimationFrame(preview)
}

function preview() {
  frame = 0
  const box = rail.value
  if (!box) return
  const card = document
    .elementFromPoint(
      Math.min(box.getBoundingClientRect().left + 80, innerWidth - 1),
      box.getBoundingClientRect().top + 44,
    )
    ?.closest('[data-cover-index]')
  emit('preview', props.items[Number(card?.dataset.coverIndex)] ?? props.items[0])
}

function restore() {
  const box = rail.value
  if (!box) return
  box.scrollLeft = positions.get(props.memoryKey) ?? 0
  preview()
}
onMounted(restore)
onBeforeUnmount(() => cancelAnimationFrame(frame))
watch(
  () => props.filter,
  async () => {
    focused.value = ''
    await nextTick()
    restore()
  },
)
watch(
  () => props.items.length,
  () => nextTick(preview),
)

function point(event) {
  swallowClick = false
  if (event.pointerType !== 'mouse' || event.button !== 0) return
  drag = { id: event.pointerId, x: event.clientX, left: rail.value.scrollLeft }
}

function move(event) {
  if (drag?.id !== event.pointerId) return
  const dx = event.clientX - drag.x
  if (!swallowClick && Math.abs(dx) < 7) return
  if (!swallowClick) rail.value.setPointerCapture(event.pointerId)
  swallowClick = true
  rail.value.scrollLeft = drag.left - dx
}

function stop() {
  drag = undefined
}

function click(event) {
  if (!swallowClick || event.detail === 0) return
  event.preventDefault()
  event.stopPropagation()
  swallowClick = false
}

function wheel(event) {
  if (event.ctrlKey || event.shiftKey || Math.abs(event.deltaX) >= Math.abs(event.deltaY)) return
  const box = rail.value
  if (box.scrollWidth <= box.clientWidth) return
  event.preventDefault()
  box.scrollLeft +=
    event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? box.clientWidth : 1)
}

function useKeys(event) {
  const card = event.target.closest('[data-cover-index]')
  if (!card || event.target !== card.querySelector('.cover-open')) return
  const index = Number(card.dataset.coverIndex)
  const offset = {
    ArrowLeft: -2,
    ArrowRight: 2,
    ArrowUp: index % 2 ? -1 : 0,
    ArrowDown: index % 2 ? 0 : 1,
    Home: -index,
    End: props.items.length - 1 - index,
  }[event.key]
  if (offset === undefined) return
  event.preventDefault()
  const target = rail.value.querySelector(`[data-cover-index="${index + offset}"] .cover-open`)
  target?.focus({ preventScroll: true })
  target?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
}
</script>

<template>
  <div
    ref="rail"
    class="cover-wall"
    role="region"
    :aria-label="label"
    @scroll.passive="remember"
    @pointerdown="point"
    @pointermove="move"
    @pointerup="stop"
    @pointercancel="stop"
    @lostpointercapture="stop"
    @pointerleave="stop"
    @click.capture="click"
    @dragstart.prevent
    @wheel="wheel"
    @keydown="useKeys"
  >
    <article
      v-for="(item, index) in items"
      :key="item.id"
      :data-cover-index="index"
      class="cover-card"
      :class="{ current: item.current }"
      @focusin="focused = item.id"
    >
      <slot
        :item="item"
        :index="index"
        :tabindex="item.id === (focused || items[0]?.id) ? 0 : -1"
      />
    </article>
    <slot v-if="!items.length" name="empty" />
  </div>
</template>
