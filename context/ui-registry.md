# UI Registry

Living document. Updated after every component is built. Read this before building any new component - match existing patterns exactly before inventing new ones.

---

## How to Use

Before building any component:

1. Check if a similar component already exists here
2. If yes - match its exact classes
3. If no - build it following ui-rules.md and ui-tokens.md, then add it here

After building any component - update this file with the component name, file path, and exact classes used.

---

## Components

### Navbar

- Path: `components/layout/Navbar.tsx`
- Root classes: `border-b border-border bg-surface`
- Inner classes: `mx-auto flex h-20 max-w-[1280px] items-center justify-between px-6 lg:px-0`
- Nav link classes: `text-sm font-medium text-text-dark transition-colors hover:text-accent`
- Primary button classes: `inline-flex min-h-10 items-center justify-center rounded-md bg-overlay px-5 text-sm font-medium text-accent-foreground shadow-card transition-opacity hover:opacity-90`
- Authenticated action classes: `inline-flex min-h-10 items-center justify-center rounded-md bg-overlay px-5 text-sm font-medium text-accent-foreground shadow-card transition-opacity hover:opacity-90`

### Footer

- Path: `components/layout/Footer.tsx`
- Root classes: `mx-auto w-full max-w-[1280px] border-x border-border bg-surface`
- Inner classes: `flex min-h-32 flex-col items-start justify-between gap-8 px-8 py-10 md:flex-row md:items-center`
- Footer link classes: `text-sm font-medium text-text-dark transition-colors hover:text-accent`

### Hero

- Path: `components/homepage/Hero.tsx`
- Root classes: `mx-auto mt-16 max-w-[1280px] border-x border-t border-border bg-surface`
- Hero panel classes: `landing-hero-gradient flex min-h-[420px] flex-col items-center justify-center px-6 py-20 text-center`
- Heading classes: `max-w-[780px] text-[42px] font-bold leading-[1.02] text-text-black sm:text-[56px] lg:text-[64px]`
- Body classes: `mt-8 max-w-[560px] text-[15px] font-medium leading-6 text-text-secondary`
- Primary CTA classes: `inline-flex min-h-12 items-center justify-center rounded-md bg-overlay px-7 text-sm font-medium text-accent-foreground shadow-card transition-opacity hover:opacity-90`
- Secondary CTA classes: `inline-flex min-h-12 items-center justify-center rounded-md border border-border bg-surface px-7 text-sm font-medium text-text-primary shadow-card transition-colors hover:bg-surface-secondary`

### Login Page

- Path: `app/(auth)/login/page.tsx`
- Root classes: `min-h-screen bg-background px-6 py-10`
- Auth shell classes: `mx-auto grid min-h-[calc(100vh-80px)] max-w-[1120px] overflow-hidden rounded-xl border border-border bg-surface shadow-card`
- Brand panel classes: `landing-hero-gradient flex min-h-[520px] flex-col justify-between border-b border-border px-8 py-8`
- Form panel classes: `flex flex-col justify-center px-6 py-10 sm:px-10`
- Heading classes: `text-[38px] font-bold leading-[1.05] text-text-black sm:text-[48px]`
- Section heading classes: `text-base font-semibold leading-6 text-text-primary`
- Helper text classes: `text-xs font-medium leading-4 text-text-secondary`
- Error state classes: `rounded-md border border-border bg-surface-secondary px-4 py-3 text-sm font-medium leading-5 text-text-primary`
- No-provider state classes: `rounded-md border border-border bg-surface-secondary px-4 py-3 text-sm font-medium leading-5 text-text-primary`

### OAuthProviderButton

File: `components/auth/OAuthProviderButton.tsx`
Submit file: `components/auth/OAuthSubmitButton.tsx`
Last updated: 2026-06-08

| Property         | Class |
| ---------------- | ----- |
| Background       | `bg-surface` |
| Border           | `border border-border` |
| Border radius    | `rounded-md` |
| Text - primary   | `text-sm font-medium text-text-primary` |
| Text - muted     | `text-text-muted` |
| Spacing          | `min-h-12 px-4 gap-3` |
| Hover state      | `hover:bg-surface-secondary` |
| Disabled state   | `disabled:cursor-not-allowed disabled:opacity-70` |
| Shadow           | `shadow-card` |
| Accent usage     | none |

**Pattern notes:** Provider buttons use the secondary button surface, full-width layout, and a circular provider badge. Keep future auth buttons on `bg-surface` with `border-border`, `rounded-md`, and `shadow-card`. Pending state is handled with `useFormStatus` inside `OAuthSubmitButton`; do not move OAuth startup into a client component just to show loading feedback.

### Protected Workspace Shell

- Paths: `app/dashboard/page.tsx`, `app/profile/page.tsx`, `app/find-jobs/page.tsx`
- Page shell classes: `min-h-screen bg-background`
- Section classes: `mx-auto max-w-[1280px] border-x border-b border-border bg-surface px-8 py-10`
- Card classes: `rounded-xl border border-border bg-surface p-6 shadow-card`
- Label classes: `text-xs font-bold uppercase leading-4 text-accent`
- Heading classes: `text-[30px] font-semibold leading-9 text-text-primary`
- Body classes: `mt-3 max-w-[560px] text-sm font-medium leading-5 text-text-secondary`
- Dashboard media wrapper classes: `border-t border-border bg-surface-tertiary px-6 py-14 md:px-14`

### PostHog Analytics Shell

- Provider path: `components/PostHogProvider.tsx`
- Pageview path: `components/PostHogPageView.tsx`
- Visual classes: none - these components render no UI and only initialize PostHog, capture manual pageviews, and sync authenticated user identity.
- Pattern notes: Keep analytics setup in isolated client components imported by `app/layout.tsx`; do not add analytics browser APIs directly to server pages or layout files.

### JobSearchEase

- Path: `components/homepage/JobSearchEase.tsx`
- Root classes: `landing-section-grid mx-auto grid max-w-[1280px] border-x border-t border-border bg-surface lg:grid-cols-2`
- Text column classes: `flex min-h-[690px] flex-col justify-center border-b border-border bg-surface lg:border-b-0 lg:border-r`
- Feature heading classes: `max-w-[420px] text-[36px] font-bold leading-[1.05] text-text-slate lg:text-[44px]`
- Feature row classes: `border-l-2 px-8 py-8 sm:px-16 lg:px-[70px]`
- Image column classes: `flex min-h-[690px] items-center justify-center bg-surface-muted px-8 py-14 sm:px-16`

### ApplicationConfidence

- Path: `components/homepage/ApplicationConfidence.tsx`
- Root classes: `landing-section-grid mx-auto grid max-w-[1280px] border-x border-t border-border bg-surface lg:grid-cols-2`
- Image column classes: `flex min-h-[690px] items-center justify-center bg-surface-muted px-8 py-16 sm:px-16`
- Text column classes: `flex min-h-[690px] flex-col justify-center border-t border-border bg-surface lg:border-l lg:border-t-0`
- Feature heading classes: `max-w-[500px] text-[36px] font-bold leading-[1.05] text-text-slate lg:text-[44px]`
- Feature row classes: `border-l-2 px-8 py-8 sm:px-16 lg:px-[70px]`

### Testimonial

- Path: `components/homepage/Testimonial.tsx`
- Root classes: `mx-auto flex min-h-[360px] max-w-[1280px] flex-col items-center justify-center border-x border-b border-border bg-surface px-6 py-20 text-center`
- Label classes: `text-xs font-bold uppercase leading-4 text-accent`
- Quote classes: `mt-7 max-w-[820px] text-[26px] font-semibold leading-[1.28] text-text-darker sm:text-[31px]`

### FinalCta

- Path: `components/homepage/FinalCta.tsx`
- Root classes: `landing-hero-gradient mx-auto flex min-h-[420px] max-w-[1280px] flex-col items-center justify-center border-x border-b border-border px-6 py-20 text-center`
- Heading classes: `max-w-[720px] text-[38px] font-bold leading-[1.05] text-text-black sm:text-[48px] lg:text-[56px]`
- Body classes: `mt-8 max-w-[600px] text-[15px] font-medium leading-6 text-text-secondary`
- Primary CTA classes: `inline-flex min-h-12 items-center justify-center rounded-md bg-overlay px-7 text-sm font-medium text-accent-foreground shadow-card transition-opacity hover:opacity-90`
- Secondary CTA classes: `inline-flex min-h-12 items-center justify-center rounded-md border border-border bg-surface px-7 text-sm font-medium text-text-primary shadow-card transition-colors hover:bg-surface-secondary`
