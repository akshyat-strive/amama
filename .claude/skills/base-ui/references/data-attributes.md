# Base UI data-* attributes (v1.6.0)

Gathered from `node_modules/@base-ui/react/docs/react/components/*.md`. Not every component exposes every attribute below — check the specific component's doc page (`docs/react/components/<name>.md`) for its exact set and which part (root/trigger/popup/item/etc.) carries it. This list is for recognizing an attribute you see in generated code or devtools, not for guessing which ones a given part has.

| Attribute | Typical meaning / where seen |
|---|---|
| `data-activation-direction` | Tabs — direction the active tab indicator moved |
| `data-active` | Element is currently active (e.g. pressed pointer) |
| `data-align` | Popup alignment relative to its anchor |
| `data-anchor-hidden` | Popup's anchor has scrolled out of view |
| `data-base-ui-swipe-ignore` | Marks a region that should ignore Base UI's swipe-to-dismiss gesture |
| `data-behind` | Nested dialog/drawer stacked behind another |
| `data-checked` / `data-unchecked` | Checkbox, Switch, Radio, CheckboxGroup |
| `data-closed` | Complement of `data-open` |
| `data-color` | Color-scheme related state (component-specific) |
| `data-complete` | Progress/OTP field completion |
| `data-current` | Currently active step/item (e.g. NavigationMenu) |
| `data-direction` | Orientation/direction of interaction (e.g. Slider, Toolbar) |
| `data-dirty` | Field/Form — value changed from initial |
| `data-disabled` | Element (or its trigger) is disabled |
| `data-dragging` | Slider thumb / drag interaction in progress |
| `data-empty` | Field/Combobox has no value |
| `data-ending-style` | Exit-transition hook — element is animating out |
| `data-expanded` | Accordion/Collapsible/NavigationMenu item expanded |
| `data-filled` | Field/OTP has a value |
| `data-focusable` | Item participates in roving focus |
| `data-focused` | Element currently has focus |
| `data-has-overflow-x` / `data-has-overflow-y` | ScrollArea content overflows |
| `data-has-submenu-open` | Menu item's submenu is open |
| `data-hidden` | Element hidden but still in the DOM (e.g. for animation) |
| `data-highlighted` | Keyboard/pointer-highlighted item — Menu, Select, Autocomplete, Combobox, Toolbar |
| `data-hovering` | Pointer is hovering the element |
| `data-indeterminate` | Checkbox indeterminate state |
| `data-index` | Positional index within a list of items |
| `data-instant` | Transition should apply instantly (no animation) — e.g. on initial mount |
| `data-invalid` / `data-valid` | Field/Form validation result |
| `data-limited` | Value clamped to a min/max (e.g. NumberField) |
| `data-list-empty` | Combobox/Autocomplete/Select has no matching options |
| `data-modal` | Dialog/Drawer is modal |
| `data-multiple` | Select/CheckboxGroup allows multiple selection |
| `data-nested` | Nested Menu/Dialog/Drawer |
| `data-nested-dialog-open` / `data-nested-drawer-open` | Parent aware a nested overlay is open |
| `data-nested-drawer-swiping` | Nested drawer is mid swipe-gesture |
| `data-open` | Popup/Dialog/Menu/Select/Collapsible/Accordion is open |
| `data-orientation` | `horizontal` / `vertical` — Tabs, Toolbar, Slider, Separator |
| `data-overflow-x-end` / `data-overflow-x-start` / `data-overflow-y-end` / `data-overflow-y-start` | ScrollArea edge overflow indicators |
| `data-panel-open` | Toolbar/Accordion panel open |
| `data-placeholder` | Showing placeholder (Select, Combobox, DatePicker-like fields) |
| `data-popup-open` | Present on a **trigger** while its associated popup is open |
| `data-popup-side` | Which side the popup rendered on |
| `data-position` | Positional state (component-specific) |
| `data-pressed` | Toggle / ToggleGroup pressed state |
| `data-previous` | Tabs — element was the previously active one |
| `data-progressing` | Progress bar actively progressing (vs. indeterminate/complete) |
| `data-readonly` | Field is read-only |
| `data-required` | Field is required |
| `data-scrolling` | ScrollArea is currently being scrolled |
| `data-scrubbing` | Slider is being scrubbed via keyboard/pointer drag |
| `data-selected` | Selected option/tab/item |
| `data-side` | Popup side relative to anchor (`top`/`right`/`bottom`/`left`) |
| `data-starting-style` | Enter-transition hook — pair with `data-ending-style` |
| `data-swipe-direction` | Direction of an in-progress swipe-to-dismiss |
| `data-swipe-dismiss` | Swipe gesture will dismiss on release |
| `data-swiping` | A swipe-to-dismiss gesture is in progress |
| `data-touched` | Field/Form — has received and lost focus at least once |
| `data-transitioning` | Element mid CSS transition |
| `data-trigger-disabled` | Trigger for this part is disabled |
| `data-type` | Component-specific type discriminator |
| `data-uncentered` | Positioner couldn't center the popup on its anchor |
| `data-unchecked` | See `data-checked` |
| `data-valid` | See `data-invalid` |
| `data-visible` | Element currently visible (vs. hidden for animation timing) |

## Styling transitions with `data-starting-style` / `data-ending-style`

The standard pattern for enter/exit animations (Tailwind example from the shipped Dialog docs):

```tsx
<Dialog.Popup
  className="transition-[scale,opacity] duration-100 ease-out
    data-starting-style:scale-95 data-starting-style:opacity-0
    data-ending-style:scale-95 data-ending-style:opacity-0"
/>
```

`data-starting-style` is present for one frame on mount/open before transitioning to the open state; `data-ending-style` is present while animating out before unmount — both require the element to have a CSS `transition` for the animation to actually run.
