# UI Tokens

Design tokens for Job Application. All colors, typography, spacing, and component values are semantic tokens in `app/globals.css`. Use these exact token names throughout the codebase. Never hardcode colors or use raw Tailwind color classes in components.

As of the 2026-06-13 website modernization, the app supports semantic light/dark themes. Components must use tokens such as `bg-surface`, `bg-surface-elevated`, `text-text-primary`, `border-border`, and `bg-accent`; do not branch on theme in component markup. Primary accent buttons use `bg-accent text-accent-foreground`; overlay surfaces use `bg-overlay text-overlay-foreground`.

---

## How to Use

This project uses **Tailwind CSS v4**. All design tokens are defined using the `@theme` directive in `app/globals.css`. No `tailwind.config.ts` needed for colors or tokens.

Tailwind v4 automatically generates utility classes from `@theme` variables:

- `--color-accent` → `bg-accent`, `text-accent`, `border-accent`
- `--color-surface` → `bg-surface`, `text-surface`, `border-surface`
- `--color-surface-elevated` → `bg-surface-elevated`
- `--color-surface-glass` → `bg-surface-glass`

```tsx
// Correct — uses generated utility classes
className="bg-surface text-text-primary border-border"

// Also correct — references CSS variable directly
style={{ color: 'var(--color-text-primary)' }}

// Never — hardcoded hex values
className="bg-[#F6F7FB] text-[#101828]"

// Never — raw Tailwind color classes
className="bg-purple-500 text-gray-600"
```

---

## globals.css — Complete Token Definition

```css
@import "tailwindcss";

@theme {
  /* Font */
  --font-sans: "Inter", sans-serif;

  /* Page and surface backgrounds */
  --color-background: #f6f7fb;
  --color-surface: #ffffff;
  --color-surface-secondary: #f9fafb;
  --color-surface-tertiary: #f2f5f7;
  --color-surface-muted: #f4f5fb;
  --color-surface-elevated: #ffffff;
  --color-surface-glass: rgb(255 255 255 / 0.78);

  /* Borders */
  --color-border: #e7eaf3;
  --color-border-light: #e5e7eb;
  --color-border-muted: #dfe1e7;

  /* Text */
  --color-text-primary: #101828;
  --color-text-secondary: #6a7282;
  --color-text-muted: #99a1af;
  --color-text-dark: #364153;
  --color-text-darker: #36394a;
  --color-text-darkest: #111827;
  --color-text-black: #131316;
  --color-text-slate: #272835;
  --color-text-slate-medium: #666d80;

  /* Primary accent - teal */
  --color-accent: #0b7285;
  --color-accent-dark: #095766;
  --color-accent-light: #d7f2f5;
  --color-accent-muted: #effafa;
  --color-accent-foreground: #ffffff;

  /* Success — green */
  --color-success: #10b981;
  --color-success-alt: #00bc7d;
  --color-success-dark: #007a55;
  --color-success-darker: #009966;
  --color-success-light: #d0fae5;
  --color-success-lightest: #ecfdf5;
  --color-success-foreground: #007a55;

  /* Info — blue */
  --color-info: #61a8ff;
  --color-info-dark: #155dfc;
  --color-info-medium: #2b7fff;
  --color-info-light: #dbeafe;
  --color-info-lightest: #eff6ff;
  --color-info-foreground: #155dfc;
  --color-info-muted: #94a2c5;

  /* Warning — orange */
  --color-warning: #ff8904;
  --color-warning-foreground: #ffffff;

  /* Error — red */
  --color-error: #ef4444;
  --color-error-foreground: #ffffff;

  /* LinkedIn brand */
  --color-linkedin: #0a66c2;
  --color-linkedin-light: #dce6f1;
  --color-linkedin-foreground: #ffffff;

  /* Dark overlays */
  --color-overlay: #111827;
  --color-overlay-dark: #131316;
  --color-overlay-foreground: #ffffff;

  /* Border radius */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-full: 9999px;
}
```

Dark mode overrides the same semantic variables under `:root[data-theme="dark"]`, with a system-preference fallback for first-time visitors. The active theme is set before hydration by `app/layout.tsx` and persisted by `components/layout/ThemeToggle.tsx`. Keep runtime theme overrides outside Tailwind cascade layers so they win over the `@theme` defaults.

Dark-mode primary CTAs keep the bright teal `--color-accent`, so `--color-accent-foreground` becomes a dark teal in dark mode for readable button text. Do not use `text-accent-foreground` on `bg-overlay`; use `text-overlay-foreground` for overlay surfaces and overlay buttons.

Tailwind v4 generates utility classes automatically from every `--color-*` token above:

- `bg-accent`, `text-accent`, `border-accent`
- `bg-surface`, `text-surface-secondary`
- `bg-success-light`, `text-text-muted`
- etc.

---

## Color Usage Guide

### Page Layout

| Element           | Token                  |
| ----------------- | ---------------------- |
| Page background   | `bg-background`        |
| Card / surface    | `bg-surface`           |
| Secondary surface | `bg-surface-secondary` |
| Default border    | `border-border`        |
| Light border      | `border-border-light`  |

### Typography

| Element                | Token                           |
| ---------------------- | ------------------------------- |
| Headings, primary text | `text-text-primary` (#101828)   |
| Secondary text, labels | `text-text-secondary` (#6A7282) |
| Placeholder, muted     | `text-text-muted` (#99A1AF)     |
| Dark labels            | `text-text-dark` (#364153)      |

### Accent (Primary Teal)

Used for: primary buttons, active nav items, tailored badges, focus rings, and premium product accents.

| Element                | Token                    |
| ---------------------- | ------------------------ |
| Button background      | `bg-accent`              |
| Button text            | `text-accent-foreground` |
| Light badge background | `bg-accent-light`        |
| Subtle background      | `bg-accent-muted`        |

`text-accent-foreground` is white in light mode and dark teal in dark mode so accent buttons remain readable against the active accent background.

### Match Score Colors

Match score bars and indicators use gradient stops based on score range:

| Score Range | Color  | Token                                  |
| ----------- | ------ | -------------------------------------- |
| 90-100%     | Green  | `bg-success` / `text-success`          |
| 80-89%      | Blue   | `bg-info` / `text-info-foreground`     |
| Below 80%   | Orange | `bg-warning` / `text-warning`          |

### Skills Badges

| Type          | Background            | Text                      |
| ------------- | --------------------- | ------------------------- |
| Matched skill | `bg-success-lightest` | `text-success-foreground` |
| Missing skill | `bg-accent-muted`     | `text-accent`             |

### Source Badges

| Source   | Background             | Text                  |
| -------- | ---------------------- | --------------------- |
| LinkedIn | `bg-linkedin-light`    | `text-linkedin`       |
| URL      | `bg-surface-secondary` | `text-text-secondary` |

### Status Badges

| Status       | Background             | Text                      |
| ------------ | ---------------------- | ------------------------- |
| Tailored     | `bg-accent-light`      | `text-accent`             |
| Resume ready | `bg-success-lightest`  | `text-success-foreground` |
| High Match   | `bg-success-lightest`  | `text-success-foreground` |
| Low Match    | `bg-surface-secondary` | `text-text-secondary`     |

Tailored resume actions reuse existing tokens only: `bg-accent` for Generate, `border-border bg-surface` for Download/secondary actions, `text-success` for ready copy, and `text-error` for failures.

---

## Typography

| Element              | Size | Weight | Line height | Color token           |
| -------------------- | ---- | ------ | ----------- | --------------------- |
| Logo text            | 19px | 700    | 28px        | `text-text-darkest`   |
| Stat number          | 30px | 600    | 36px        | `text-text-primary`   |
| Section heading      | 16px | 600    | 24px        | `text-text-primary`   |
| Nav item (active)    | 14px | 500    | 20px        | `text-accent`         |
| Nav item (inactive)  | 14px | 500    | 20px        | `text-text-dark`      |
| Card label           | 14px | 500    | 20px        | `text-text-secondary` |
| Body / activity text | 14px | 500    | 20px        | `text-text-primary`   |
| Trend badge text     | 12px | 500    | 16px        | `text-success-darker` |
| Timestamp / muted    | 12px | 400    | 16px        | `text-text-muted`     |
| Chart axis labels    | 12px | 400    | 15px        | `var(--color-chart-axis)` |
| Stat subtitle        | 12px | 400    | 16px        | `text-text-muted`     |

Font family: **Inter** — import from Google Fonts or use next/font/google.

---

## Spacing

| Token       | Value      | Usage                 |
| ----------- | ---------- | --------------------- |
| `gap-1`     | 4px        | Tight inline gaps     |
| `gap-2`     | 8px        | Badge and tag gaps    |
| `gap-3`     | 12px       | Form field gaps       |
| `gap-4`     | 16px       | Section internal gaps |
| `gap-6`     | 24px       | Between sections      |
| `gap-8`     | 32px       | Page section gaps     |
| `p-4`       | 16px       | Card padding          |
| `p-6`       | 24px       | Large card padding    |
| `px-4 py-2` | 16px / 8px | Button padding        |
| `px-3 py-1` | 12px / 4px | Badge padding         |

---

## Component Tokens

### Cards

```
background: bg-surface or bg-surface-elevated
border: 1px solid var(--color-border)
border-radius: 8px (rounded-md in Tailwind)
padding: 24px (p-6)
box-shadow: 0px 1px 3px rgba(0,0,0,0.1), 0px 1px 2px -1px rgba(0,0,0,0.1)
```

### Buttons

**Primary:**

```
background: bg-accent
text: text-accent-foreground
border-radius: rounded-md
padding: px-4 py-2
font-weight: font-medium
```

**Secondary:**

```
background: bg-surface
border: border border-border
text: text-text-primary
border-radius: rounded-md
padding: px-4 py-2
```

**Ghost:**

```
background: transparent
text: text-text-secondary
hover: hover:bg-surface-secondary
border-radius: rounded-md
```

### Input Fields

```
background: bg-surface
border: border border-border
border-radius: rounded-md
padding: px-3 py-2
text: text-text-primary
placeholder: text-text-muted
focus: ring-1 ring-accent
```

### Badges

```
border-radius: rounded-full
padding: px-2 py-0.5
font-size: text-xs
font-weight: font-medium
```

### Match Score Bar

```
background track: bg-border-light
fill: varies by score range (see Match Score Colors above)
height: 4px
border-radius: rounded-full
```

### Trend Badges (stat cards)

```
background: bg-success-lightest
text color: text-success-darker
border-radius: 4px (rounded-sm)
padding: 2px 8px
font-size: 12px
font-weight: 500
```

### Activity Dots

Each activity type has a specific dot color:
| Activity Type | Outer ring | Inner dot |
|---|---|---|
| Accent/custom | `bg-accent-light` | `bg-accent` |
| Company research | `bg-info-light` | `bg-info` |
| Job found | `bg-success-light` | `bg-success-alt` |
Dot size: 8px inner, 16px outer with white border

### Dashboard Chart Colors

| Chart                            | Color                                                           |
| -------------------------------- | --------------------------------------------------------------- |
| Jobs Found Over Time (line)      | `var(--color-accent)` stroke, 3px width, gradient fill          |
| Company Research Activity (bars) | `var(--color-info)`                                             |
| Match Score Distribution (bars)  | `var(--color-success)`                                          |
| Chart grid lines                 | `var(--color-border)` dashed                                    |
| Chart axis labels                | `var(--color-chart-axis)`, 12px                                 |

---

## Invariants

- Never use hex values directly in components. Always use CSS variables via Tailwind tokens.
- Font is Inter. Always import via `next/font/google`, never use a fallback system font.
- Never use raw Tailwind color classes like `bg-purple-500` or `text-gray-600`. Use project tokens only.
- `--color-accent` is teal in light mode and brighter teal in dark mode. `--color-accent-foreground` changes with it for contrast. Never use Tailwind's built-in teal, cyan, or purple scale.
- Use `--color-overlay-foreground` for text on `--color-overlay`; do not reuse accent foreground on overlay backgrounds.
- Match score bars always use color tokens based on score range. Never hardcode colors.
- LinkedIn badge always uses `--color-linkedin` tokens. Never use generic blue.
- All borders default to `--color-border`. Never use `border-gray-*`.
- Theme behavior belongs in `app/globals.css`, `app/layout.tsx`, and `components/layout/ThemeToggle.tsx`, not scattered through app components.
