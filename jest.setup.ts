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

/**
 * Floating UI (behind every Radix popper: `DropdownMenu`, `Select`, ...)
 * asks each element `matches(":popover-open")` / `matches(":modal")` to
 * detect the browser's top layer. jsdom does not know those pseudo-classes,
 * so its selector engine falls back to a very slow failure path on every
 * call, which made each open dropdown cost ~10s of a test. Neither state
 * can occur in jsdom, so answer `false` straight away.
 */
const TOP_LAYER_PSEUDO_CLASSES = new Set([":popover-open", ":modal"])
const nativeMatches = Element.prototype.matches

Element.prototype.matches = function matches(selector: string) {
  return TOP_LAYER_PSEUDO_CLASSES.has(selector) ? false : nativeMatches.call(this, selector)
}
