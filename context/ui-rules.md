# UI Rules

Concise rules for building Job Application UI. Design assets are available. Use them as the source of truth for visual decisions. These rules cover the most important patterns and constraints to keep the UI consistent without over-specifying every detail.

---

## Font

Always import Inter via `next/font/google` in the root layout.

```typescript
import { Inter } from "next/font/google";
const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
```

The `--font-sans` variable is already declared in `@theme` in globals.css. Apply the font variable class to the `<html>` tag in root layout. Never use system fonts as the primary font.

---

## Layout

- Page max-width: 1440px, centered
- Main content area padding: 32px on all sides
- Gap between page sections: 24px
- Header uses the shared top navbar, full width, semantic `bg-surface`, and responsive wrapping on mobile
- All pages use top navbar only. No sidebar, no drawer
- Public and authenticated pages must work in light and dark mode through semantic tokens only

---

## Navbar

Three nav items: Dashboard, Find Jobs, Profile.

- Active item: `text-accent`, font-weight 500, 14px, with the existing bottom accent indicator
- Inactive item: `text-text-dark`, font-weight 500, 14px
- Navbar always uses `bg-surface` and `border-border`
- Navbar includes the accessible `ThemeToggle`; it persists explicit light/dark choice and falls back to system preference before a user chooses

---

## Cards

Content sections use semantic surfaces. Repeated items, tools, forms, and analytics panels use cards; full-width marketing sections may be unframed bands or bordered sections.

```text
background: bg-surface or bg-surface-elevated
border: 1px solid var(--color-border)
border-radius: 8px
padding: 24px
box-shadow: 0px 1px 3px rgba(0,0,0,0.1), 0px 1px 2px -1px rgba(0,0,0,0.1)
```

Never use raw color classes. Color goes inside cards via semantic badges, bars, text, and theme-aware surfaces.

---

## Typography Hierarchy

Three levels used consistently throughout:

**Section headings** — card titles, page section titles

```text
font-size: 16px
font-weight: 600
color: #101828
line-height: 24px
```

**Body / primary content text**

```text
font-size: 14px
font-weight: 500
color: #101828
line-height: 20px
```

**Secondary / muted text** — labels, timestamps, subtitles

```text
font-size: 12px
font-weight: 400
color: #99A1AF
line-height: 16px
```

Stat numbers on dashboard use 30px / weight 600 / color #101828.

---

## Badges

All badges use `border-radius: 9999px` (pill shape) unless specified otherwise.

```text
padding: 2px 8px
font-size: 12px
font-weight: 500
```

Trend badges on stat cards use `border-radius: 4px` (not pill) with `#ECFDF5` background and `#009966` text.

---

## Buttons

**Primary button:**

```text
background: bg-accent
color: text-accent-foreground
border-radius: 8px
padding: 8px 16px
font-size: 14px
font-weight: 500
```

`text-accent-foreground` is theme-aware. In dark mode it becomes dark teal so bright teal primary buttons stay readable. For `bg-overlay`, use `text-overlay-foreground`.

**Secondary button:**

```text
background: bg-surface
border: border border-border
color: text-text-primary
border-radius: 8px
padding: 8px 16px
```

## Job Details Actions

- Apply Now remains the primary external action.
- Generate Tailored Resume belongs near Apply Now and uses the existing in-app primary button pattern.
- Download Tailored Resume uses the existing secondary button pattern.
- Show inline loading, success, expired, and error text using existing feedback styles.

---

## Form Inputs

```text
background: bg-surface
border: border border-border
border-radius: 8px
padding: 8px 12px
font-size: 14px
color: #101828
placeholder color: #99A1AF
focus: ring-1 ring-accent border-accent
```

---

## Table (Jobs List)

- No alternating row colors — white rows only, separated by border
- Row border: `border-border` between rows
- Column headers: uppercase, 12px, font-weight 500, color `text-text-secondary`
- Row text: 14px, color `text-text-primary`
- Hover state: `hover:bg-surface-secondary`

---

## Match Score Bar

Inline progress bar shown next to the percentage number.

```text
height: 4px
border-radius: 9999px
background track: bg-border-light
```

Fill color by score:

- 90-100%: `bg-success` (green)
- 80-89%: `bg-info` (blue)
- Below 80%: `bg-warning` (orange)

---

## Empty States

Every section that can be empty must have an empty state. Keep it minimal:

- Short descriptive text in `color: #99A1AF`
- Optional icon above text
- CTA button if there's a logical next action

---

## Tailwind v4 Note

This project uses Tailwind v4. Tokens are defined with `@theme` in globals.css, with runtime overrides for dark mode. No `tailwind.config.ts` is needed. Never define colors in a config file. Always use `@theme` for new tokens.

---

## Do Nots

- Never use Tailwind's built-in color classes (`bg-purple-500`, `text-gray-600`). Use project tokens only
- Never define colors in `tailwind.config.ts`. Use `@theme` in globals.css
- Never add gradients to card backgrounds. Product hero bands can use the shared `landing-hero-gradient`
- Never use more than one font weight in a single UI element
- Never show raw error messages to users. Always show human readable text
- Never stack more than 2 levels of border radius inside each other
- Never use `position: fixed` for UI elements. Use normal flow layout
