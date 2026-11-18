const subscriptions = new WeakMap()

export const vHorizontalSwipe = {
  mounted(surface, { value: { step, enabled } }) {
    const controller = new AbortController()
    subscriptions.set(surface, controller)
    const listen = (type, handler, options) => {
      surface.addEventListener(type, handler, { ...options, signal: controller.signal })
    }

    let pointer
    let suppressClick = false
    let wheelDistance = 0
    let lastWheel = -Infinity
    let wheelStepped = false

    function resetPointer() {
      pointer = null
      surface.removeAttribute('data-swiping')
      surface.style.removeProperty('--swipe-x')
    }

    listen('pointerdown', (event) => {
      if (!event.isPrimary || event.button !== 0) return
      suppressClick = false
      if (!enabled()) return
      pointer = { id: event.pointerId, x: event.clientX, y: event.clientY, axis: '' }
    })
    listen('pointermove', (event) => {
      if (pointer?.id !== event.pointerId) return
      const dx = event.clientX - pointer.x
      const dy = event.clientY - pointer.y
      if (!pointer.axis && Math.max(Math.abs(dx), Math.abs(dy)) >= 8) {
        suppressClick = true
        pointer.axis = Math.abs(dx) > Math.abs(dy) ? 'horizontal' : 'vertical'
        if (pointer.axis === 'horizontal') {
          surface.setPointerCapture(event.pointerId)
          surface.setAttribute('data-swiping', '')
        }
      }
      if (pointer.axis === 'horizontal') {
        surface.style.setProperty('--swipe-x', Math.max(-120, Math.min(120, dx * 0.75)) + 'px')
      }
    })
    listen('pointerup', (event) => {
      if (pointer?.id !== event.pointerId) return
      const dx = event.clientX - pointer.x
      const shouldStep = pointer.axis === 'horizontal' && Math.abs(dx) >= 40
      resetPointer()
      if (shouldStep && enabled()) step(dx < 0 ? 1 : -1)
    })
    listen('pointercancel', (event) => {
      if (pointer?.id === event.pointerId) resetPointer()
    })
    listen('lostpointercapture', (event) => {
      if (event.target === surface && pointer?.id === event.pointerId) resetPointer()
    })
    listen('pointerleave', (event) => {
      if (pointer?.id === event.pointerId && !surface.hasPointerCapture(event.pointerId)) {
        resetPointer()
      }
    })
    listen('dragstart', (event) => {
      if (enabled()) event.preventDefault()
    })
    listen(
      'click',
      (event) => {
        if (!suppressClick || event.detail === 0) return
        event.preventDefault()
        event.stopPropagation()
        suppressClick = false
      },
      { capture: true },
    )
    listen(
      'wheel',
      (event) => {
        if (!enabled() || event.ctrlKey || pointer) return
        const sideways = Math.abs(event.deltaX) > Math.abs(event.deltaY)
        if (!sideways && !event.shiftKey) return
        const delta = sideways ? event.deltaX : event.deltaY
        if (!delta) return
        event.preventDefault()
        if (event.timeStamp - lastWheel > 160 || Math.sign(delta) !== Math.sign(wheelDistance)) {
          wheelDistance = 0
          wheelStepped = false
        }
        lastWheel = event.timeStamp
        if (wheelStepped) return
        const units = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? surface.clientWidth : 1
        wheelDistance += delta * units
        if (Math.abs(wheelDistance) >= 32) {
          wheelStepped = true
          step(Math.sign(wheelDistance))
        }
      },
      { passive: false },
    )
  },
  unmounted(surface) {
    subscriptions.get(surface)?.abort()
  },
}
