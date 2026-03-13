import '@testing-library/jest-dom'

// Polyfills for Radix UI components in jsdom
// Radix UI uses pointer capture APIs that are not implemented in jsdom

// Mock hasPointerCapture and setPointerCapture for HTMLElement
HTMLElement.prototype.hasPointerCapture = () => false
HTMLElement.prototype.setPointerCapture = () => {}
HTMLElement.prototype.releasePointerCapture = () => {}

// Mock scrollIntoView for jsdom
Element.prototype.scrollIntoView = () => {}

// Mock ResizeObserver
class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
window.ResizeObserver = ResizeObserver

// Mock PointerEvent for jsdom
// This is needed for Radix UI components that use pointer events
class MockPointerEvent extends MouseEvent {
  isPrimary: boolean
  pointerId: number
  pressure: number
  tangentialPressure: number
  tiltX: number
  tiltY: number
  twist: number
  width: number
  height: number
  pointerType: string
  altitudeAngle: number
  azimuthAngle: number

  constructor(type: string, props: PointerEventInit = {}) {
    super(type, {
      bubbles: props.bubbles ?? true,
      cancelable: props.cancelable ?? true,
      composed: props.composed ?? false,
      detail: props.detail ?? 0,
      screenX: props.screenX ?? 0,
      screenY: props.screenY ?? 0,
      clientX: props.clientX ?? 0,
      clientY: props.clientY ?? 0,
      ctrlKey: props.ctrlKey ?? false,
      shiftKey: props.shiftKey ?? false,
      altKey: props.altKey ?? false,
      metaKey: props.metaKey ?? false,
      button: props.button ?? 0,
      buttons: props.buttons ?? 0,
      relatedTarget: props.relatedTarget ?? null,
    })
    this.isPrimary = props.isPrimary ?? true
    this.pointerId = props.pointerId ?? 1
    this.pressure = props.pressure ?? 0
    this.tangentialPressure = props.tangentialPressure ?? 0
    this.tiltX = props.tiltX ?? 0
    this.tiltY = props.tiltY ?? 0
    this.twist = props.twist ?? 0
    this.width = props.width ?? 1
    this.height = props.height ?? 1
    this.pointerType = props.pointerType ?? 'mouse'
    this.altitudeAngle = props.altitudeAngle ?? 0
    this.azimuthAngle = props.azimuthAngle ?? 0
  }
}
window.PointerEvent = MockPointerEvent as unknown as typeof PointerEvent