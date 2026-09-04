---
name: base-ui
description: "Write unstyled @base-ui/react (v1.6.0) primitives correctly — render prop instead of asChild, nativeButton, data-* state attributes, mergeProps/useRender for custom components. Use whenever adding or editing a component in src/components/ui, or composing/styling any @base-ui/react part."
license: MIT
metadata:
  version: 1.0.0
  last_verified: 2026-08-05
  base_ui_version: 1.6.0
  package_name: "@base-ui/react"
  source: node_modules/@base-ui/react/docs (shipped with the installed package — treat as authoritative over training data)
allowed-tools: ["Read", "Write", "Edit", "Bash", "Glob", "Grep"]
---

# Base UI (`@base-ui/react`) primitives

This project uses **`@base-ui/react` v1.6.0** (MUI's headless component library) as the primitive layer under `src/components/ui/*.tsx`, styled with Tailwind and wrapped shadcn-style. It was previously published as `@base-ui-components/react` — always import from `@base-ui/react`.

The installed package ships its own docs at `node_modules/@base-ui/react/docs/react/`. If anything here or in training data conflicts with those files, **the shipped docs win** — re-read the relevant one under `docs/react/components/<name>.md` before guessing an API.

## When to use this skill

- Adding a new Base UI-backed primitive to `src/components/ui/`
- Editing an existing one (`dialog.tsx`, `button.tsx`, `select.tsx`, `popover.tsx`, `tabs.tsx`, etc. — all already wrap `@base-ui/react`)
- Composing a Base UI part with a custom component (asChild-style patterns)
- Styling a part based on its open/checked/disabled/highlighted/etc. state
- Building a genuinely new headless primitive with `useRender`

## Core rule #1: `render`, not `asChild`

Base UI has **no `asChild` prop**. Radix's `asChild` maps to Base UI's `render` prop.

```tsx
// ❌ Radix pattern — does not exist in Base UI
<Menu.Trigger asChild>
  <MyButton size="md">Open menu</MyButton>
</Menu.Trigger>

// ✅ Base UI
<Menu.Trigger render={<MyButton size="md" />}>
  Open menu
</Menu.Trigger>
```

Rules for `render`:
- Pass a **`ReactElement`** for the common case — Base UI clones it and spreads its own props (event handlers, ARIA attrs, refs) onto it.
- The custom component you pass to `render` **must forward `ref`** and **spread all received props** onto its underlying DOM node, or the primitive breaks (focus management, ARIA wiring, positioning all rely on this).
- `render` props **nest** arbitrarily deep when composing multiple Base UI parts (e.g. `Tooltip.Trigger` wrapping `Dialog.Trigger` wrapping `Menu.Trigger` wrapping a custom button) — see `references/composition.md`.
- Pass a **function** `(props, state) => ReactElement` instead of an element when you need the component's internal `state` (e.g. to swap an icon) or need full control over prop spreading:

```tsx
<Switch.Thumb
  render={(props, state) => (
    <span {...props}>{state.checked ? <CheckedIcon /> : <UncheckedIcon />}</span>
  )}
/>
```

- `render` can also just change the rendered tag without a custom component, e.g. `<Menu.Item render={<a href="..." />}>` to make a menu item behave like a link.

## Core rule #2: `nativeButton={false}` when a Button-family part isn't a `<button>`

`Button` (and Button-based triggers) apply `<button>`-specific default behavior (`type="button"`, native disabled semantics, etc). If you use `render` to swap the underlying tag away from `<button>`, tell it explicitly:

```tsx
// Button rendered as a <div> that still behaves like a button (keyboard/role/focus)
<Button render={<div />} nativeButton={false}>
  Button that can contain complex children
</Button>
```

- `nativeButton` defaults to `true` and only matters when `render` changes the tag.
- **Never** use `nativeButton={false}` to render an `<a>` as a Button — links have their own semantics; style the `<a>` directly with CSS instead of routing it through `Button`.
- This project already does this correctly in [src/components/ui/dialog.tsx](../../../src/components/ui/dialog.tsx): `DialogPrimitive.Close` is given `render={<Button variant="ghost" size="icon-sm" />}` — no `nativeButton` override needed there because the target is still a real `<Button>` → `<button>`.

## Core rule #3: style off `data-*` state attributes, not props

Every stateful part exposes its internal state as `data-*` attributes on the rendered element — style against those instead of re-deriving state in React.

```tsx
// Tailwind, matches this repo's convention (see button.tsx, dialog.tsx)
<Select.Trigger className="aria-expanded:bg-muted data-open:bg-accent" />
```

```css
/* Plain CSS */
.SwitchThumb[data-checked] { background-color: green; }
```

Common attributes across parts — full list in `references/data-attributes.md`:

| Attribute | Meaning |
|---|---|
| `data-open` / `data-closed` | Popup/collapsible/dialog open state |
| `data-starting-style` / `data-ending-style` | Enter/exit transition hooks — pair with CSS transitions |
| `data-disabled` | Element is disabled |
| `data-highlighted` | Keyboard/pointer-highlighted item (Menu, Select, Autocomplete) |
| `data-checked` / `data-unchecked` / `data-indeterminate` | Checkbox, Switch, Radio |
| `data-selected` | Selected option/tab |
| `data-pressed` | Toggle/ToggleGroup pressed state |
| `data-invalid` / `data-valid` / `data-dirty` / `data-touched` | Field/Form validation state |
| `data-side` / `data-align` | Popup positioning relative to its anchor |
| `data-popup-open` | Present on a **trigger** while its popup is open (not on the popup itself) |

The `className`, `style`, and function-`render` props all optionally receive `(state)` as an argument if you'd rather branch in JS than in CSS:

```tsx
<Switch.Thumb className={(state) => (state.checked ? 'checked' : 'unchecked')} />
```

Check the specific component's doc page for its exact attribute set before assuming one applies — don't guess from this table alone.

## Building a genuinely new primitive: `useRender` + `mergeProps`

Only needed when authoring a **new** headless component from scratch (not just wrapping an existing Base UI part, which is the common case in `src/components/ui/`). Use the `useRender` hook so your own component supports a `render` prop the same way Base UI's do:

```tsx
'use client';
import * as React from 'react';
import { useRender } from '@base-ui/react/use-render';
import { mergeProps } from '@base-ui/react/merge-props';

interface TextProps extends useRender.ComponentProps<'p'> {}

function Text({ render, ...props }: TextProps) {
  const element = useRender({
    defaultTagName: 'p',
    render,
    props: mergeProps<'p'>({ className: 'Text' }, props),
  });
  return element;
}

// usage
<Text render={<strong />}>Text component rendered as a strong tag</Text>
```

- `useRender.ComponentProps<'tag', State>` types the public props (includes `render`); `useRender.ElementProps<'tag'>` types the internal default props you set.
- In React 19 (this project's version) you don't need `React.forwardRef` — accept `ref` as a normal prop, or hold your own `internalRef` and pass it via `useRender({ ref: internalRef, ... })` to have it merged with the caller's ref automatically.
- `mergeProps(a, b, ...)` merges left-to-right: event handlers all fire, `className` strings concatenate, `style` objects merge, everything else in a later arg overwrites an earlier one. Always use it instead of naive object spread when combining default props with caller-supplied props or a `render` callback's `props` argument.
- State passed via `useRender({ state })` is automatically exposed as `data-*` attributes on the rendered element (booleans become presence-only attributes) — this is how Base UI's own parts implement rule #3 above. Override the mapping with `stateAttributesMapping` if you need custom attribute names.

## This project's existing conventions

Follow the pattern already established in `src/components/ui/*.tsx` (all shadcn-generated, Base UI-backed):

1. Import the primitive namespaced: `import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"`.
2. Re-export a thin wrapper per part (`Dialog`, `DialogTrigger`, `DialogContent`, …), each forwarding `...props` and typed with `DialogPrimitive.<Part>.Props`.
3. Every wrapper sets a `data-slot="dialog-content"`-style attribute for external/CSS targeting, independent of Base UI's own `data-*` state attributes.
4. Styling goes through `cn(...)` (`clsx` + `tailwind-merge`) — never raw string concatenation.
4b. Icons come from **`lucide-react`** (this project's `components.json` sets `iconLibrary: "lucide"`). Import them by name — `import { XIcon, ChevronRightIcon } from "lucide-react"` — and let the wrapper's `[&_svg]:size-4` rules size them rather than passing explicit width/height. Do **not** use Hugeicons, Tabler, or any other icon set.
5. Compose Base UI's `Close`/`Trigger` parts with this project's own `Button` via `render={<Button variant="..." />}`, e.g.:

```tsx
<DialogPrimitive.Close
  render={<Button variant="ghost" className="absolute top-4 right-4" size="icon-sm" />}
>
  <XIcon />
  <span className="sr-only">Close</span>
</DialogPrimitive.Close>
```

Reuse an existing wrapped primitive from `src/components/ui/` before adding a new `@base-ui/react` import elsewhere in the app.

## Reference files

- `references/data-attributes.md` — full list of `data-*` attributes shipped across all Base UI components, gathered from the installed package's docs.
- For anything not covered here (a specific component's full prop/data-attribute API — Menu, Select, Combobox, Tabs, Field, Form, Toast, etc.), read `node_modules/@base-ui/react/docs/react/components/<component>.md` directly — it's shipped with the installed version and is the ground truth.
