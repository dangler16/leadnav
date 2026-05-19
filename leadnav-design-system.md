# LeadNav Design System (Tailwind)

This document defines the visual and interaction standards for LeadNav. Every page, component, and element must use these Tailwind classes. Do not introduce arbitrary values or one-off styles.

---

## Colors

| Role | Tailwind Class | Usage |
|---|---|---|
| Sidebar background | `bg-neutral-950` | Sidebar |
| Main content background | `bg-white` | Page content area |
| Card background | `bg-white` | All cards |
| Card/row hover | `hover:bg-gray-50` | Table rows, interactive cards |
| Border | `border-gray-200` | Cards, inputs, dividers |
| Primary text | `text-gray-900` | Titles, body, table data |
| Secondary text | `text-gray-500` | Labels, column headers |
| Muted text | `text-gray-400` | Timestamps, placeholders, hints |
| Sidebar text | `text-gray-300` | Nav items |
| Sidebar active text | `text-white` | Active nav item |
| Primary button bg | `bg-gray-900` | Primary actions |
| Primary button text | `text-white` | Primary actions |

---

## Typography

| Element | Classes |
|---|---|
| Page title | `text-xl font-bold text-gray-900` |
| Card/section title | `text-xs font-semibold text-gray-900` |
| Body / table data | `text-xs text-gray-900` |
| Form label | `text-xs font-medium text-gray-500` |
| Muted / hint text | `text-xs text-gray-400` |
| Column header | `text-xs font-medium text-gray-500 uppercase tracking-wide` |
| Sidebar nav item | `text-xs font-medium text-gray-300` |
| Sidebar section label | `text-xs font-semibold text-gray-600 uppercase tracking-widest` |

---

## Spacing

Use Tailwind's default scale. Common patterns:

| Usage | Classes |
|---|---|
| Card padding | `p-5` |
| Card inner gap | `gap-3` |
| Form row gap | `gap-4` |
| Row padding (table) | `px-4 py-3` |
| Page header padding | `py-6` |
| Section gap | `gap-6` |
| Icon + label gap | `gap-2` |

---

## Cards

```
bg-white border border-gray-200 rounded-lg p-5
```

**Card header:**
```
flex items-center gap-2 pb-4 mb-4 border-b border-gray-200
```
- Icon: `w-4 h-4 text-gray-500`
- Title: `text-xs font-semibold text-gray-900`

All cards must have icons in their headers — either all do or none do. Currently: all use icons.

---

## Buttons

### Primary
```
bg-gray-900 text-white text-xs font-medium px-4 py-2 rounded-md hover:bg-gray-800 transition-colors
```

### Secondary
```
bg-white text-gray-900 text-xs font-medium px-4 py-2 rounded-md border border-gray-200 hover:bg-gray-50 transition-colors
```

### Ghost / Inline
```
bg-transparent text-gray-500 text-xs px-2 py-1 rounded hover:text-gray-900 hover:bg-gray-100 transition-colors
```

### Small (row-level actions)
```
bg-white text-gray-900 text-xs font-medium px-3 py-1.5 rounded border border-gray-200 hover:bg-gray-50 transition-colors
```

**Rules:**
- No `bg-red-*` or `bg-pink-*` on buttons outside a confirmed destructive modal pattern
- Log Call, Call Lead → Primary
- Save, Reassign, Add Note → Secondary
- Inline row actions → Small

---

## Form Inputs

```
w-full border border-gray-200 rounded-md px-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent bg-white
```

Selects and dropdowns use identical classes.

---

## Tabs

### Active
```
bg-gray-900 text-white text-xs font-medium px-3 py-1.5 rounded-md
```

### Inactive
```
bg-transparent text-gray-500 text-xs font-medium px-3 py-1.5 rounded-md hover:bg-gray-100 hover:text-gray-900 transition-colors
```

### Zero-count tabs
Add `opacity-40` — do not hide them entirely.

No colored active states. Active tab is always `bg-gray-900 text-white`.

---

## Status Badges

Base:
```
inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium
```

| Status | Classes |
|---|---|
| New | `bg-blue-50 text-blue-700` |
| Contacted | `bg-green-50 text-green-700` |
| No-Show | `bg-yellow-50 text-yellow-700` |
| Lost | `bg-red-50 text-red-700` |
| Rescheduled | `bg-purple-50 text-purple-700` |
| Appt Set | `bg-teal-50 text-teal-700` |

Each badge includes a dot: `w-1.5 h-1.5 rounded-full bg-current`

---

## Tables

**Wrapper:**
```
w-full border border-gray-200 rounded-lg overflow-hidden
```

**Header row:**
```
bg-gray-50 border-b border-gray-200
```

**Header cell:**
```
px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide text-left
```

**Data row:**
```
border-b border-gray-100 hover:bg-gray-50 transition-colors
```

**Data cell:**
```
px-4 py-3 text-xs text-gray-900
```

**Empty cell:** render `—` with `text-gray-400`

**Checkbox column:** `w-10 px-4`

**Sortable column header:** always show sort icon — `text-gray-400` default, `text-gray-900` when active

---

## Sidebar

**Container:**
```
w-52 bg-neutral-950 h-screen flex flex-col px-3 py-4
```

**Nav item:**
```
flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium text-gray-300 hover:bg-neutral-800 hover:text-white transition-colors
```

**Active nav item:**
```
flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium bg-neutral-800 text-white
```

**Section label:**
```
px-3 py-2 text-xs font-semibold text-gray-600 uppercase tracking-widest
```

---

## Page Header Pattern

Every page:
```
flex items-center justify-between py-6
```

Detail pages:
```
[← Back to X]  — text-xs text-gray-500 hover:text-gray-900 mb-2

[h1: Record Name]  [Status Badge]  [Primary Action Button]
— flex items-center gap-3
```

Primary action always sits inline with the record name — never isolated on the opposite side of the screen alone.

---

## Empty States

```
flex flex-col items-center justify-center gap-2 py-8 text-gray-400
```

- Icon: `w-6 h-6 text-gray-300`
- Label: `text-xs text-gray-400`

Example: "No disputes filed", "No calls logged yet"

---

## Key/Value Data (UTM fields, metadata)

```
grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1
```

- Label: `text-xs font-medium text-gray-500`
- Value: `text-xs text-gray-900`

---

## Interaction Rules

- **Row-level actions** (Call Lead): `opacity-0 group-hover:opacity-100 transition-opacity` — right-aligned in the row, small button style
- **Bulk action bar**: fixed bottom bar, appears when checkboxes selected — `fixed bottom-0 left-44 right-0 bg-white border-t border-gray-200 px-6 py-3 flex items-center gap-3`
- **Save buttons**: always bottom-right of form card — `flex justify-end pt-4 mt-4 border-t border-gray-200`
- **Shortcuts**: never use as a substitute for a visible button

---

## What NOT To Do

- No arbitrary Tailwind values like `bg-[#ff0000]` or `text-[13px]`
- No `bg-red-500`, `bg-pink-*` on buttons
- No colored tab active states — only `bg-gray-900`
- No floating action buttons disconnected from their context
- No raw unstructured text — always use key/value grid or labeled fields
- No `h-full` cards that don't actually stretch — use `flex flex-col` on the row and `flex-1` on cards
- Do not introduce new component patterns not defined here
