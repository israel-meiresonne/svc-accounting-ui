import "@testing-library/jest-dom"

/**
 * jsdom implements neither `ResizeObserver` nor pointer capture, both of
 * which Radix UI's `Select`/`RadioGroup` primitives call directly (Phase
 * 5's `AccountFormDialog`/`CsvColumnMappingStep`/`AccountCurrencySetting`
 * are this test suite's first consumers of `Select`) — without these,
 * mounting one throws before any assertion runs.
 */
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false
}
if (!Element.prototype.releasePointerCapture) {
  Element.prototype.releasePointerCapture = () => {}
}
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {}
}
