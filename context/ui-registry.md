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

## Grade-A Audit Follow-up PR9 (2026-07-02)

- No new visual classes, app tokens, layouts, or interaction visuals were added.
- `components/find-jobs/SearchControls.tsx`, `components/profile/ProfileForm.tsx`, `components/profile/ResumeUpload.tsx`, and `components/billing/BillingActions.tsx` now announce client-side async outcomes through existing message elements: success/progress copy uses `role="status"` with polite live regions, while error copy uses `role="alert"`.
- Keep this pattern for future inline async results where focus remains on the triggering control: add semantics to the existing tokenized message block instead of introducing a new toast or visual component.
- For new inline async result regions, prefer keeping a persistent empty live-region element in the DOM and changing its text content, instead of mounting and unmounting the whole message block on state changes.

## Grade-A Audit Follow-up PR8 (2026-07-02)

- Dashboard charts now render through client loader wrappers in `components/dashboard/*ChartLoader.tsx`.
- The loaders use `next/dynamic` with the existing `components/layout/DashboardChartLoading.tsx` skeleton fallback so Recharts chart implementations are loaded behind dynamic imports.
- `components/profile/ResumeUpload.tsx` now sends a per-click idempotency key with the existing Generate Resume action and guards duplicate in-flight clicks through a ref. This is behavioral only; the button classes and visible layout did not change.
- No new visual classes, app tokens, or visual interaction patterns were added.

## Grade-A Maintainability PR7 (2026-07-02)

- No new app UI components, visual classes, or tokens were added.
- Shared PDF rendering moved to `lib/resume-pdf-document.tsx`; this is a React PDF print renderer, not an app UI component, and it centralizes the existing neutral PDF palette.
- JobsTable registry correction: desktop table currently has seven columns (`Company`, `Role`, `Match`, `Location`, `Source`, `Salary Est.`, `Date Found`). Mobile cards show Location, Salary, Source, and Found metadata below the primary job content.

## Grade-A UX/A11y PR6 (2026-07-02)

- Shared tabs path: `components/layout/Tabs.tsx`
- Tab list shell: `overflow-x-auto rounded-md border border-border bg-surface-elevated p-2 shadow-card`
- Tab button active: `inline-flex min-h-11 items-center justify-center rounded-md px-4 text-sm font-semibold bg-accent text-accent-foreground shadow-card`
- Tab button inactive: `inline-flex min-h-11 items-center justify-center rounded-md px-4 text-sm font-semibold text-text-secondary hover:bg-surface-secondary hover:text-text-primary`
- Behavior: tabs use `role="tablist"`, `role="tab"`, `aria-selected`, `aria-controls`, roving `tabIndex`, Arrow/Home/End keyboard activation, instance-scoped ids from `useId`, and one `role="tabpanel"` per tab with inactive panels hidden. Panels render unframed so existing card components are not nested inside a tab card.
- Job Details route: `app/(app)/find-jobs/[id]/page.tsx`
- Job Details layout: JobInfo remains above the workspace, followed by `grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start`; left column is tabbed Overview, Company Research, Interview Prep; right rail uses `flex flex-col gap-6 lg:sticky lg:top-24` for Apply and Tailored Resume actions. `JobInfo` stacks its icon/title row on mobile and returns to horizontal at `sm`. `TailoredResumeAction` stacks its header/action and uses full-width action buttons so the 320px rail does not cramp button text.
- Job Details heading alignment: `JobDescription`, `CompanyResearch`, `TailoredResumeAction`, and `JobActions` use `text-sm font-bold uppercase leading-5 tracking-wide text-text-secondary` for section headers under the hero.
- Profile tabs: `components/profile/ProfilePageContent.tsx` owns extraction state and routes Profile, Resume, and Billing through `Tabs`. `CareerReadinessSummary` and `CompletionIndicator` remain above the tabs as persistent readiness status.
- Sticky save row: `components/profile/ProfileForm.tsx` wraps Save Profile in `sticky bottom-0 -mx-6 mt-8 border-t border-border bg-surface-elevated px-6 py-4`; it is sticky, not fixed.
- Pricing feature rows: `components/billing/FeatureItem.tsx` renders pricing list rows with `flex items-start gap-2 text-sm font-medium leading-6 text-text-secondary` and a tokenized success check icon.

## Grade-A UX/A11y PR5 (2026-07-02)

- Shared authenticated shell path: `app/(app)/layout.tsx`
- Shell classes: `min-h-screen bg-background`, `mx-auto w-full max-w-[1280px] px-6 py-8 lg:px-0`
- Behavior: `/dashboard`, `/find-jobs`, `/find-jobs/[id]`, and `/profile` now share one Navbar mount and one 1280px content rail through the route group. Individual pages keep their inner stacked card layouts and no longer mount their own Navbar or page-width section.
- Loading routes: `app/(app)/dashboard/loading.tsx`, `app/(app)/find-jobs/loading.tsx`, `app/(app)/find-jobs/[id]/loading.tsx`, `app/(app)/profile/loading.tsx`
- Loading component paths: `components/layout/DashboardLoadingState.tsx`, `components/layout/FindJobsLoadingState.tsx`, `components/layout/JobDetailsLoadingState.tsx`, `components/layout/ProfileLoadingState.tsx`, with shared `components/layout/SkeletonBlock.tsx` and `components/layout/DashboardChartLoading.tsx`
- Loading skeleton classes: card shells reuse `rounded-md border border-border bg-surface-elevated shadow-card`; skeleton blocks use `animate-pulse rounded-md bg-surface-secondary`; dashboard and job-detail hero fallbacks preserve `landing-hero-gradient`.
- Dashboard chart streaming: `app/(app)/dashboard/page.tsx` wraps each chart card in its own `<Suspense>` with a matching `ChartCardSkeleton`. Chart PostHog fetches moved into async chart-card server components so stats, Today actions, and activity can render without waiting for chart data.
- TodayWorkspace: `components/dashboard/TodayWorkspace.tsx` no longer renders the billing/quota block or hero mini-stat tiles. Stats remain owned by `StatsBar`; billing remains on Profile.
- Profile billing card: `app/(app)/profile/page.tsx` adds a `View plans` secondary link using `inline-flex min-h-10 shrink-0 items-center justify-center rounded-md border border-border bg-surface px-5 text-sm font-medium text-text-primary shadow-card transition-colors hover:border-accent hover:bg-surface-secondary`.
- UsageMeter near-limit CTA: `components/billing/UsageMeter.tsx` renders the same secondary `View plans` link when any quota is at or above 90%.
- ProfileForm accessibility: `components/profile/ProfileForm.tsx` keeps existing field classes but `Field` now renders `<label htmlFor>` when an input id is provided. All visible inputs, selects, work-experience controls, and TagInput text inputs now have associated labels.
- SearchControls busy state: `components/find-jobs/SearchControls.tsx` adds expectation-setting copy, `aria-busy` on the form and submit button, and a polite status message while a search runs.
- JobInfo match badge: `components/job-details/JobInfo.tsx` now mirrors JobsTable thresholds: 90+ uses `bg-success-lightest text-success-foreground`, 80-89 uses `bg-info-lightest text-info-foreground`, and below 80 uses `bg-warning text-warning-foreground`.
- Root fallback pages: `app/error.tsx` and `app/not-found.tsx` use tokenized card shells and primary/secondary button primitives.
- Legal pages: `app/privacy/page.tsx` and `app/terms/page.tsx` resolve footer links through `components/layout/LegalPageLayout.tsx`, a shared tokenized public shell using static Navbar and Footer.

## Backend-Only Updates

### Grade-A Reliability PR3 (2026-07-02)

- No UI components, classes, tokens, or layouts changed.
- Backend/API-only reliability work touched Gemini timeouts, find/research route duration settings, PostHog server capture, provider failure isolation, storage cleanup logging, and find-route orchestration tests.
- Continue using the existing component registry entries for all future UI work.

## Website Modernization Overrides (2026-06-13)

These entries supersede older light-only registry notes below. Keep future UI work on semantic tokens and the top navbar pattern.

Primary accent CTAs use `bg-accent text-accent-foreground`. In dark mode, `text-accent-foreground` is intentionally dark teal for contrast against the bright accent background. Overlay surfaces and overlay buttons use `bg-overlay text-overlay-foreground`. Navbar secondary actions such as Sign out use `bg-surface text-text-primary` so they follow the active light/dark theme.

### ThemeToggle

- Path: `components/layout/ThemeToggle.tsx` (Client Component)
- Button classes: `inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border bg-surface text-text-primary shadow-card transition-colors hover:border-accent hover:bg-surface-secondary focus:outline-none focus-visible:ring-accent`
- Behavior: reads `job-application-theme` from `localStorage`, falls back to `prefers-color-scheme`, writes `document.documentElement.dataset.theme`, and persists explicit light/dark choices. The button uses a neutral `aria-label="Toggle color theme"` and CSS-controlled sun/moon icons (`theme-toggle-icon-dark` / `theme-toggle-icon-light`) so the server fallback never exposes the wrong switch label before hydration.
- Root layout script: `app/layout.tsx` sets the initial `data-theme` and `colorScheme` before hydration.

### Navbar Modernization

- Path: `components/layout/Navbar.tsx`
- Action wrapper: `flex shrink-0 items-center gap-2`
- Public CTA: `inline-flex min-h-10 items-center justify-center rounded-md bg-accent px-5 text-sm font-medium text-accent-foreground shadow-card transition-colors hover:bg-accent-dark`
- Nav labels/routes remain Dashboard, Find Jobs, Profile. Keep the top navbar; do not add a sidebar or drawer.

### Homepage Modernization

- Paths: `components/homepage/Hero.tsx`, `OutcomeStrip.tsx`, `JobSearchEase.tsx`, `ApplicationConfidence.tsx`, `TrustSection.tsx`, `FinalCta.tsx`
- Hero root: `mx-auto mt-10 max-w-[1280px] border-x border-t border-border bg-surface`
- Hero grid: `landing-hero-gradient grid gap-10 px-6 py-14 sm:px-10 lg:grid-cols-[0.88fr_1.12fr] lg:items-center lg:px-14 lg:py-20`
- Primary CTA: `inline-flex min-h-12 items-center justify-center rounded-md bg-accent px-7 text-sm font-medium text-accent-foreground shadow-card transition-colors hover:bg-accent-dark`
- Secondary CTA: `inline-flex min-h-12 items-center justify-center rounded-md border border-border bg-surface px-7 text-sm font-medium text-text-primary shadow-card transition-colors hover:border-accent hover:bg-surface-secondary`
- `Testimonial.tsx` was removed. Do not add fake testimonial/proof copy.

### Luxury Homepage Redesign (2026-06-29)

These entries supersede the previous homepage modernization classes for the public landing page. Keep the same business purpose: a private AI job search workspace for finding roles, researching companies, and tailoring resumes.

- Paths: `app/page.tsx`, `components/homepage/Hero.tsx`, `OutcomeStrip.tsx`, `JobSearchEase.tsx`, `ApplicationConfidence.tsx`, `TrustSection.tsx`, `FinalCta.tsx`
- Page root: `min-h-screen overflow-hidden bg-background text-text-primary`
- Hero section: `mx-auto max-w-[1280px] px-4 pb-16 pt-8 sm:px-6 lg:px-0 lg:pb-24`
- Hero shell: `landing-luxury-hero overflow-hidden rounded-md border border-border shadow-artifact`
- Hero grid: `grid gap-12 px-6 py-12 sm:px-10 lg:grid-cols-[1.02fr_0.98fr] lg:items-center lg:px-14 lg:py-20`
- Hero heading: `mt-5 max-w-[700px] text-[42px] font-bold leading-[0.98] text-ink sm:text-[58px] lg:text-[58px]` with explicit two-line spans.
- CTA buttons: primary `bg-accent text-accent-foreground`; secondary `border border-border bg-surface text-text-primary`; both use rounded-md, custom ease, visible `focus-visible:ring-accent`, and circular arrow chips.
- Signature element: the Career Dossier artifact combines `dashboard-demo2.png`, `jobs-lists.png`, and cropped `agent-log3.png` inside `landing-dossier-frame`, `landing-dossier-core`, `border-chrome`, `border-dossier-line`, and `shadow-artifact`.
- Section pattern: `mx-auto max-w-[1280px] px-4 ... sm:px-6 lg:px-0`; framed sections use rounded-md semantic borders and full-width layout, not nested decorative cards.
- Motion: `.landing-reveal` and `.landing-hover-lift` only, guarded by `prefers-reduced-motion`.
- Avoid: fake testimonials, emoji icons, raw Tailwind colors, one-off gradients in component markup, and generic feature-card grids detached from product screenshots.

### Login Modernization

- Path: `app/(auth)/login/page.tsx`
- Shell classes: `mx-auto grid min-h-[calc(100vh-80px)] max-w-[1120px] overflow-hidden rounded-md border border-border bg-surface shadow-card lg:grid-cols-[1fr_420px]`
- Brand panel: `landing-hero-gradient flex flex-col gap-10 border-b border-border px-6 py-7 sm:px-8 lg:border-b-0 lg:border-r lg:px-10 lg:py-9`
- Includes `ThemeToggle` beside the logo. OAuth provider actions and redirect behavior remain unchanged.

### Dashboard Modernization

- New path: `components/dashboard/TodayWorkspace.tsx`
- Today card: `overflow-hidden rounded-md border border-border bg-surface shadow-card`
- Today panel: `landing-hero-gradient grid gap-8 px-6 py-7 lg:grid-cols-[1fr_380px] lg:items-center lg:px-8`
- Phase 5 Today actions: the right panel uses `rounded-md border border-border bg-surface-glass p-4`; action links use `block rounded-md border border-border bg-surface px-4 py-3 transition-colors hover:border-accent hover:bg-surface-secondary`; action labels use `rounded-full` tone badges from `bg-accent-muted text-accent`, `bg-info-lightest text-info-foreground`, or `bg-success-lightest text-success-foreground`. If profile, engagement-job, or tailored-resume reads fail, the action list shows its scoped unavailable state instead of guessing profile or resume readiness.
- Stats cards: `rounded-md border border-border bg-surface-elevated p-6 shadow-card`
- Activity/chart cards now use `rounded-md border border-border bg-surface-elevated ... shadow-card` and include concise subtitles.
- New path: `components/dashboard/SkillGapInsights.tsx`
- Skill gap card: `rounded-md border border-border bg-surface-elevated p-6 shadow-card`
- Skill insight cards: `rounded-md border border-border bg-surface px-4 py-4`; count badge `rounded-full bg-accent-muted px-2.5 py-1 text-xs font-semibold leading-4 text-accent`; empty state CTA reuses `bg-accent text-accent-foreground`.
- Skill gap insights depend only on the engagement jobs read. Tailored-resume read failures must not hide this card when jobs data is available.

### Find Jobs Modernization

- Page intro card: `rounded-md border border-border bg-surface-elevated p-6 shadow-card`
- `SearchControls` card: `rounded-md border border-border bg-surface-elevated p-6 shadow-card`
- `JobFilters` wrapper: `rounded-md border border-border bg-surface-elevated p-4 shadow-card`
- `JobsTable` root: `overflow-hidden rounded-md border border-border bg-surface-elevated shadow-card`
- Mobile jobs render as `MobileJobCard` cards inside `components/find-jobs/JobsTable.tsx`; desktop still renders the table.
- Show dynamic source attribution (`Jobs by Adzuna, Remotive, ...`) whenever saved listings are visible.

### Job Details Modernization

- `JobInfo` header: `overflow-hidden rounded-md border border-border bg-surface shadow-card` with a `landing-hero-gradient` decision workspace panel.
- Fact cards: `flex min-w-0 items-center gap-4 rounded-md border border-border bg-surface-elevated p-5 shadow-card`
- `MatchScore`, `JobDescription`, `CompanyResearch`, `InterviewPrepExpansion`, `TailoredResumeAction`, and `JobActions` use `rounded-md` semantic cards.
- New path: `components/job-details/InterviewPrepExpansion.tsx`
- Interview prep card: `rounded-md border border-border bg-surface-elevated p-6 shadow-card`; prep sections use `rounded-md border border-border bg-surface p-5`; source badge uses the secondary button surface `border border-border bg-surface text-text-primary`.
- Interview prep markers: section markers use a tokenized outer dot container `flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border bg-surface-secondary` with an inner tone dot (`bg-accent`, `bg-success`, `bg-info`, or `bg-text-muted`); list bullets use the same tone dot family at `mt-[0.625rem] h-1.5 w-1.5` for light/dark alignment.
- Page order: JobInfo, MatchScore, CompanyResearch, InterviewPrepExpansion, TailoredResumeAction, JobActions, JobDescription.

### Profile Modernization

- New path: `components/profile/CareerReadinessSummary.tsx`
- Readiness root: `overflow-hidden rounded-md border border-border bg-surface shadow-card`
- Readiness hero: `landing-hero-gradient px-6 py-7 sm:px-8`
- `ResumeUpload`, `ProfileForm`, `CompletionIndicator`, and `ResumePreview` use `rounded-md` semantic cards/surfaces.
- Field order and profile save/extract/generate behavior remain unchanged.

### Navbar

- Path: `components/layout/Navbar.tsx` (Server Component — auth check only)
- Root classes: `border-b border-border bg-surface`
- Inner classes: `mx-auto flex min-h-20 max-w-[1280px] flex-wrap items-center justify-between gap-y-3 px-4 py-3 sm:px-6 md:h-20 md:flex-nowrap md:py-0 lg:px-0`
- Brand: `<Logo className="h-8 w-auto sm:h-10" preload />` wrapped in `<Link href="/" aria-label="Job Application home" className="shrink-0">` (Feature 09 — replaced the old `/logo.png` wordmark image, which had "JobPilot" baked in)
- Nav links: rendered by `NavLinks` (see below) — do not put plain `<Link>`s back in the Navbar
- Public primary button classes: `inline-flex min-h-10 items-center justify-center rounded-md bg-accent px-5 text-sm font-medium text-accent-foreground shadow-card transition-colors hover:bg-accent-dark`
- Authenticated Sign out action classes: `inline-flex min-h-10 items-center justify-center rounded-md border border-border bg-surface px-5 text-sm font-medium text-text-primary shadow-card transition-colors hover:border-accent hover:bg-surface-secondary`
- Auth action modes: default `authMode="dynamic"` wraps `NavbarAuthActions` in `Suspense` and resolves `getCurrentUser()` server-side; `authMode="static"` renders the public primary CTA only and is used by the static homepage so `/` can prerender without request-time cookie access.

### Logo

- Path: `components/layout/Logo.tsx` (Server Component, presentational)
- Optional `className` prop defaults to `h-10 w-auto`; optional `preload` prop passes through to `next/image`. Navbar sets `preload` and overrides the display size to `h-8 w-auto sm:h-10` for mobile LCP and fit.
- Renders `next/image` `src="/logo2.png"` — 894×168 transparent PNG (teal document/magnifier app-icon mark + single-line navy "Job Application" wordmark), intrinsic `width={894} height={168}`, display classes `h-10 w-auto`, `alt="Job Application"`
- `/logo2.png` (2026-06-10 brand artwork) follows the legacy `/logo.png` format: 168px-tall content-hugging transparent canvas, icon-left/wordmark-right single-line lockup, no tagline (the stacked two-line wordmark was rejected by the user — keep it horizontal). The favicon (`app/favicon.ico`, 16/32/48 PNG entries, ~11KB) is the icon mark alone.
- Used by: Navbar, Footer, Login brand panel (gradient background — keep the PNG background transparent). The legacy `/logo.png` (JobPilot wordmark baked in) was deleted from the repo on 2026-06-10 — there is no logo asset other than `/logo2.png`. The old CSS mark (`.brand-logo-mark`) was removed with this change.

### NavLinks

- Path: `components/layout/NavLinks.tsx` (Client Component — `usePathname` for active state)
- Nav classes: `order-3 flex w-full items-stretch justify-center gap-1 self-auto border-t border-border pt-3 md:order-none md:w-auto md:gap-10 md:self-stretch md:border-t-0 md:pt-0` (mobile wraps into a second navbar row; desktop items stretch so the active underline can sit on the navbar's bottom edge)
- Link classes: `relative flex min-h-10 items-center justify-center gap-1.5 rounded-md px-2 text-sm font-medium transition-colors sm:gap-2 sm:px-3 md:min-h-0 md:justify-start md:rounded-none md:px-0` + active `text-accent` / inactive `text-text-dark hover:text-accent`
- Active underline: `absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-accent` (+ `aria-current="page"`) — DEVIATION from ui-rules.md "no underline", matching `find-jobs.png` per explicit user instruction
- Item icons: inline SVG 16px, `stroke="currentColor"`, strokeWidth 1.5 (grid / search / person)
- Active match: `pathname === href || pathname.startsWith(href + "/")` so `/find-jobs/[id]` keeps Find Jobs active

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
- Primary CTA classes: `inline-flex min-h-12 items-center justify-center rounded-md bg-accent px-7 text-sm font-medium text-accent-foreground shadow-card transition-colors hover:bg-accent-dark`
- Secondary CTA classes: `inline-flex min-h-12 items-center justify-center rounded-md border border-border bg-surface px-7 text-sm font-medium text-text-primary shadow-card transition-colors hover:bg-surface-secondary`
- Preview image: `/images/dashboard-demo2.png` (1920×969, intrinsics must match in `Hero.tsx`) — a real screenshot of the live `/dashboard` composed into a recreated browser frame (dark `#0b0f22` bezel, traffic-light dots, URL pill reading `jobapplication.app/dashboard`). Regenerate by re-capturing the dashboard, not by hand-editing the PNG; when regenerating, bump the filename (demo3, demo4…) — browsers cache the old URL otherwise (2026-06-10).

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
- Mockup image: `/images/agent-log3.png` (2144×1656, ~60KB) — SVG-rebuilt agent-log window reading "[SYSTEM] Initializing Job Application Agent..." (spaced brand form; replaced the design kit's `agnet-log.png`, which had "JobPilot" baked in; regenerate via sharp SVG render and bump the filename, 2026-06-10)

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
- Primary CTA classes: `inline-flex min-h-12 items-center justify-center rounded-md bg-accent px-7 text-sm font-medium text-accent-foreground shadow-card transition-colors hover:bg-accent-dark`
- Secondary CTA classes: `inline-flex min-h-12 items-center justify-center rounded-md border border-border bg-surface px-7 text-sm font-medium text-text-primary shadow-card transition-colors hover:bg-surface-secondary`

---

## Profile Page (Feature 05 + 06)

Last updated: 2026-06-09

The profile page uses a **stacked-card layout on the page background** — not the bordered white surface the homepage/workspace shell uses. A centered `max-w-[1080px]` column holds white cards separated by `gap-6`. Icons are inline SVG (`stroke="currentColor"` + a token text-color class) — no icon library is installed.

**Feature 06 wiring:** Data is live from `profiles` DB. `ProfileForm` submits via `<form action={formAction}>` + `useActionState(saveProfile, …)`. `ResumeUpload` submits via a hidden `<form>` + `useActionState(saveResume, …)` with `form.requestSubmit()` on file selection. Both show pending/success/error states inline. Work-experience role fields are now controlled inputs (not `defaultValue`) so the hidden `workExperience` JSON input always reflects live edits.

### Profile Page Layout

- Path: `app/profile/page.tsx` (Server Component)
- Main classes: `min-h-screen bg-background`
- Content section classes: `mx-auto w-full max-w-[1080px] px-6 py-10`
- Card stack classes: `flex flex-col gap-6`
- Mock data lives in the page and is passed to components as props typed by `Profile` (`types/index.ts`) so Feature 06 can swap in real DB data with the same prop shape.

### Profile Card (shared section shell)

- Classes: `rounded-2xl border border-border bg-surface p-6 shadow-card`
- Card title classes: `text-base font-semibold leading-6 text-text-primary`
- Card subtext classes: `text-sm font-medium leading-5 text-text-secondary`

### CompletionIndicator

- Path: `components/profile/CompletionIndicator.tsx` (Server Component)
- Props: `percentage: number`, `missingFields: string[]`
- Renders `null` when `missingFields` is empty — a complete profile shows no card, guaranteed inside the component itself (callers like `app/profile/page.tsx` may also guard, but don't have to)
- Alert icon: inline SVG, `text-error`
- Missing-field tag classes: `rounded-full bg-accent-muted px-2 py-0.5 text-xs font-medium uppercase tracking-wide text-accent`
- Ring: SVG donut `r=34` `strokeWidth=8`, track circle `text-border-light`, progress circle `text-error` with `strokeDasharray`/`strokeDashoffset` derived from `percentage`; wrapper `relative h-20 w-20`, svg `-rotate-90`, centered label `text-lg font-semibold text-text-primary`

### ResumeUpload

- Path: `components/profile/ResumeUpload.tsx` (Client Component)
- Dropzone classes: `flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 text-center`; dragging adds `border-accent bg-accent-muted`, idle uses `border-border`
- Upload icon: inline SVG `text-accent`
- Select Resume (secondary button): `inline-flex min-h-10 items-center justify-center rounded-md border border-border bg-surface px-4 text-sm font-medium text-text-primary shadow-card transition-colors hover:bg-surface-secondary`
- Generate Resume from Profile (primary button): `inline-flex min-h-10 items-center justify-center rounded-md bg-accent px-4 text-sm font-medium text-accent-foreground shadow-card transition-opacity hover:opacity-90`
- Generate button wiring (Feature 08): adds `gap-2 disabled:opacity-50`; pending state swaps the label for the shared spinner SVG (`animate-spin`, 14×14, `strokeWidth 2.5`) + "Generating resume…" — same in-button spinner pattern as Extract from Resume. Disabled while generating, uploading, or extracting.
- Bottom bar (Feature 08): restructured to `flex flex-col gap-2 border-t border-border pt-4` wrapping the original `flex-col sm:flex-row` row, with inline feedback lines below it — error `text-xs font-medium text-error`, success `text-xs font-medium text-success`. This error/success-line pattern matches the upload and extract feedback styles.

### ResumePreview

- Path: `components/profile/ResumePreview.tsx` (presentational, rendered by ResumeUpload once a file is selected)
- Row classes: `flex items-center justify-between gap-4 rounded-xl border border-border bg-surface-secondary px-4 py-3`
- File icon: inline SVG `text-accent`
- File block link (F08 fix): icon + name + subtitle wrapped in `<a href="/api/resume/download" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3">`; filename span adds `transition-colors hover:text-accent`
- View link (F08 fix): `inline-flex items-center rounded-md px-3 py-1.5 text-sm font-medium text-accent transition-opacity hover:opacity-80` — same accent-link pattern as the form's "Add role" link, placed left of the Replace button
- Subtitle: `meta` prop (replaces the old always-empty `fileSize`) — `text-xs font-normal leading-4 text-text-muted`; shows real upload size, "Generated from your profile" after generation, or "PDF document" fallback

### ProfileForm

- Path: `components/profile/ProfileForm.tsx` (Client Component)
- Field label classes: `text-[11px] font-medium uppercase tracking-wide text-text-secondary`
- Input/textarea classes: `w-full rounded-md border border-border bg-surface px-3 py-2 text-sm font-medium text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-accent focus:outline-none`
- Select: input classes + `appearance-none pr-9`, with absolute chevron SVG `text-text-muted`
- Job Preferences now includes a Cover Letter Tone select using the same Select Field primitive and profile save wiring; it persists `profiles.cover_letter_tone` but does not affect profile completion while cover-letter generation remains out of scope.
- Disabled input adds: `disabled:bg-surface-secondary`
- Section heading classes: `text-sm font-semibold leading-5 text-text-primary`
- Section divider classes: `border-t border-border pt-8`
- Field grid: `grid grid-cols-1 gap-4 sm:grid-cols-2`; full-width fields use `sm:col-span-2`
- Tag chip classes: `flex items-center gap-1.5 rounded-full bg-accent-muted px-3 py-1 text-xs font-medium text-accent`
- Add button: `inline-flex min-h-10 shrink-0 items-center justify-center rounded-md bg-accent px-4 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent-dark`
- Checkbox classes: `checkbox-accent h-4 w-4`
- Add role link classes: `inline-flex items-center gap-1 text-sm font-medium text-accent transition-opacity hover:opacity-80`
- Work experience role card classes: `flex flex-col gap-4 rounded-xl border border-border p-4`
- Save Profile (full-width primary): `mt-8 inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-accent px-4 text-sm font-medium text-accent-foreground shadow-card transition-opacity hover:opacity-90`

### globals.css token utilities added for Feature 05

`.bg-accent`, `.bg-accent-muted`, `.text-error`, `.text-border-light`, `.checkbox-accent` (sets `accent-color`), `.placeholder\:text-text-muted::placeholder`, `.focus\:border-accent:focus`, `.focus\:ring-accent:focus`, `.disabled\:bg-surface-secondary:disabled`. Added by hand following the project's existing pattern — Tailwind v4 `@theme` utility generation is unreliable in this setup, so every token utility and its variants are written explicitly.

---

## Find Jobs Page (Features 09–11)

Last updated: 2026-06-09

Same stacked-card-on-page-background layout family as the profile page, but full workspace width. Feature 10 wired the data (`SearchControls` → `POST /api/agent/find`, page reads real `jobs` rows). Feature 11 wired the list controls — all filter/sort/pagination state lives in URL search params (`?q=&match=&sort=&page=`, defaults omitted), so the Server Component page re-queries on every change.

### Find Jobs Page Layout

- Path: `app/find-jobs/page.tsx` (Server Component)
- Main classes: `min-h-screen bg-background`
- Content section classes: `mx-auto w-full max-w-[1280px] px-6 py-8 lg:px-0` — aligns card edges with the Navbar inner width
- Card stack classes: `flex flex-col gap-6`
- No Footer (matches the profile page authed-shell pattern)
- Rows come from the `jobs` table (Feature 10): `select("id, company, title, match_score, salary, found_at", { count: "exact" })` scoped to the user, `.order("match_score", { ascending: false })`, `.range(0, 19)` — mapped to `JobListItem[]` (now carries `id`); DATE FOUND renders via `formatRelativeTime` (`lib/utils.ts`)

### SearchControls

- Path: `components/find-jobs/SearchControls.tsx`
- Card classes: `rounded-2xl border border-border bg-surface p-6 shadow-card`
- Field grid: `grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end`
- Labels: `text-[11px] font-medium uppercase tracking-wide text-text-secondary` (ProfileForm label primitive)
- Inputs: Input Field primitive; icon variant wraps in `relative`, icon `pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted`, input swaps `px-3` for `py-2 pl-9 pr-3`
- Find Jobs button: accent primary + `gap-2` and a 16px white search SVG
- Success banner: `mt-4 flex items-start gap-2.5 rounded-md bg-success-lightest px-4 py-3 text-sm font-medium text-success-foreground` with a green sparkle SVG, result summary, and compact source breakdown chips (`rounded-full bg-surface px-2.5 py-1 text-xs font-semibold leading-4 text-text-secondary`).
- Feature 10 wiring: Client Component taking a `userId` prop. Controlled inputs (+ `disabled:opacity-50`), submit via `<form onSubmit>`; pending state swaps the button content for the shared spinner SVG (`animate-spin`, 14×14, strokeWidth 2.5) + "Searching…" — same in-button spinner as ResumeUpload. Inline error line `mt-4 text-xs font-medium text-error`. Fires `job_search_started` on submit and `router.refresh()` on success so the table re-renders with fresh rows.

### JobFilters

- Path: `components/find-jobs/JobFilters.tsx`
- Row classes: `flex flex-col gap-3 sm:flex-row sm:items-center` — no shared card wrapper: the text filter and each dropdown are standalone elements on the page background (user-requested separation, 2026-06-09)
- Standalone filter input: `w-full rounded-xl border border-border bg-surface py-2.5 pl-10 pr-4 text-sm font-medium text-text-primary shadow-card placeholder:text-text-muted focus:border-accent focus:ring-accent focus:outline-none` + absolute search icon `pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted`
- Pill select (Select variant): `appearance-none rounded-full border border-border bg-surface py-2 pl-4 pr-9 text-sm font-medium text-text-primary shadow-card focus:border-accent focus:ring-accent focus:outline-none` + standard chevron overlay — use this rounded-full variant for compact filter/sort dropdowns; forms keep the `rounded-md` Select Field primitive
- Feature 11 wiring: Client Component (`useSearchParams`/`useRouter`/`usePathname`). Text field is local state seeded from `?q=` on mount, applied via 300ms-debounced `router.replace` (`scroll: false`); selects are controlled by the URL (option objects all/high/low and match/newest/oldest) and apply instantly; every change deletes `page`. `applyParam` reads `window.location.search` (not the hook snapshot) so a pending debounce never overwrites a select change. URL→input sync is a render-phase adjustment (NOT an effect — the lint rule forbids that): `if (lastUrlQuery !== urlQuery)` updates the tracked value and, only when the field is not focused (`isEditing` via onFocus/onBlur), mirrors the URL into the input. Back/forward and in-app links update the field; a focused user's in-flight text always wins.

### JobsTable

- Path: `components/find-jobs/JobsTable.tsx` (exports the `JobListItem` type)
- Card classes: `overflow-hidden rounded-md border border-border bg-surface-elevated shadow-card` with an `overflow-x-auto` wrapper and `w-full min-w-[1040px] border-collapse` table
- Desktop columns: `Company`, `Role`, `Match`, `Location`, `Source`, `Salary Est.`, `Date Found`
- Header row: `bg-surface-secondary`; `th`: `px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-text-secondary`
- Body rows: `border-t border-border transition-colors hover:bg-surface-secondary`; cells `px-6 py-3.5`
- Company cell: chip `flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-surface-tertiary text-text-secondary` (building SVG) + name `text-sm font-semibold text-text-primary`
- Role: `text-sm font-medium text-text-primary`; Location/Salary/Date: `text-sm font-medium text-text-secondary`; Source uses `inline-flex min-h-6 max-w-full items-center rounded-full border border-border bg-surface-secondary px-2.5 text-xs font-semibold leading-4 text-text-secondary`
- Desktop column order: Company, Role, Match Score, Location, Source, Salary Est., Date Found. Mobile cards show Location immediately below the match meter, then Salary, Source, and Found.
- Renders `JobsPagination` inside the same card below the table - only when `totalResults > 0` (Feature 10)
- Empty state: single `border-t border-border` row, `td colSpan={7}` with `px-6 py-12 text-center text-sm font-medium text-text-secondary`; `emptyMessage` prop (F11): "No jobs match your filters." when filters are active, "No jobs yet - search above to find your first matches." on a fresh account; passes `hrefForPage` through to JobsPagination
- Row key is `job.id` (`JobListItem` carries the DB id as of Feature 10)

### Match Score Bar (reusable — Job Details will reuse)

- Track: `h-1 w-24 shrink-0 overflow-hidden rounded-full bg-border-light`
- Fill: `block h-full rounded-full` + score class, width via `style={{ width: `${score}%` }}` (dynamic value — the one allowed inline style, same precedent as CompletionIndicator's SVG dash math)
- Score → color (derived from find-jobs.png; DEVIATES from both ui-rules.md and ui-tokens.md tables): `>= 90` → `bg-success`, `80–89` → `bg-info`, below → `bg-warning`
- Percentage label: `text-sm font-semibold text-text-primary`

### JobsPagination

- Path: `components/find-jobs/JobsPagination.tsx`
- Row classes: `flex flex-col gap-3 border-t border-border px-6 py-4 sm:flex-row sm:items-center sm:justify-between`
- Summary text: `text-sm font-medium text-text-secondary` with `font-semibold text-text-primary` spans around the numbers
- Previous/Next: `inline-flex h-9 items-center justify-center rounded-md border border-border bg-surface px-3 text-sm font-medium transition-colors` + enabled `text-text-dark hover:bg-surface-secondary` / disabled `cursor-not-allowed text-text-muted` (computed in JS — do not add new `disabled:` variant utilities for this)
- Page buttons: `inline-flex h-9 w-9 items-center justify-center rounded-md border text-sm font-medium transition-colors` + active `border-accent-light bg-accent-light text-accent` (+ `aria-current="page"`) / inactive `border-border bg-surface text-text-dark hover:bg-surface-secondary`
- Ellipsis: `inline-flex h-9 w-6 items-center justify-center text-sm font-medium text-text-muted`
- Feature 11: enabled Previous/page/Next are `<Link href={hrefForPage(n)}>` preserving all active params; disabled edges and the current page render as `<span>` (`aria-disabled` / `aria-current="page"`) with identical classes. Page items are windowed — `1 … current−1 current current+1 … last`, all pages when ≤ 5 — so the active page is always visible.

### globals.css token utilities added for Feature 09

`.text-text-darkest`, `.text-success-foreground`, `.bg-success`, `.bg-info`, `.bg-warning`, `.bg-border-light`, `.bg-accent-light`, `.border-accent-light`. Same hand-written pattern as Features 01–08. (`.brand-logo-mark` existed here until the 2026-06-10 logo2.png rebrand removed it.)

---

## Job Details Page (Feature 12)

Last updated: 2026-06-12

The job details page matches `context/designs/job-details.png`: a centered `max-w-[1080px]` stacked detail column on the page background, with the existing authenticated Navbar above it. It is a dynamic Server Component route that reads a single `jobs` row scoped to the current user and renders real saved job/match data. Company research is empty-state UI only until Feature 13 wires the action.

### Job Details Page Layout

- Path: `app/find-jobs/[id]/page.tsx` (Server Component)
- Main classes: `min-h-screen bg-background`
- Content section classes: `mx-auto w-full max-w-[1080px] px-6 py-10`
- Back link classes: `inline-flex items-center gap-2 text-base font-semibold leading-6 text-text-secondary transition-colors hover:text-accent`
- Stack classes: `mt-8 flex flex-col gap-6`
- Data read: `jobs` select for detail columns (`title`, `company`, `location`, `salary`, `job_type`, links, description fields, match fields, `found_at`) with `.eq("id", id).eq("user_id", user.id).maybeSingle()`
- Feature 18 data read: latest `tailored_resumes` row for the same `user_id` + `job_id`, ordered by `generated_at DESC`, passed to `TailoredResumeAction` as `idle`, `ready`, or `expired`

### JobInfo

- Path: `components/job-details/JobInfo.tsx`
- Header card classes: `rounded-2xl border border-border bg-surface p-6 shadow-card`
- Header layout: `flex flex-col gap-5 md:flex-row md:items-center md:justify-between`
- Company icon box: `flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-border bg-surface-secondary text-text-muted`
- Title: `truncate text-[30px] font-bold leading-9 text-text-primary`
- Company line: `mt-1 flex flex-wrap items-center gap-2 text-base font-semibold leading-6 text-text-secondary`
- Job detail header includes a source badge beside the match badge: `rounded-full border border-border bg-surface px-3 py-1 text-sm font-semibold leading-5 text-text-secondary`
- Match badge: `rounded-full bg-success-lightest px-3 py-1 text-sm font-semibold leading-5 text-success-foreground`
- View Job Post button: `inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl border border-border bg-surface px-5 text-sm font-semibold text-text-primary shadow-card transition-colors hover:bg-surface-secondary`
- Info grid classes: `grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4`
- Info card classes: `flex min-w-0 items-center gap-4 rounded-2xl border border-border bg-surface p-5 shadow-card`
- Info icon boxes: salary `bg-success-lightest text-success`; location `bg-info-lightest text-info-medium`; job type `bg-accent-muted text-accent`; date `bg-surface-secondary text-text-secondary`
- Info value: `break-words text-base font-semibold leading-6 text-text-primary` inside `min-w-0 flex-1` text wrapper so long locations wrap within the card instead of truncating
- Info label: `mt-1 text-xs font-bold uppercase leading-4 tracking-wide text-text-muted`

### MatchScore

- Path: `components/job-details/MatchScore.tsx`
- Reasoning card classes: `rounded-2xl border border-border bg-surface p-8 shadow-card`
- Reasoning icon: `flex h-8 w-8 items-center justify-center rounded-full bg-success-lightest text-success`
- Section label: `text-sm font-bold uppercase leading-5 tracking-wide text-text-secondary`
- Reason paragraph: `mt-6 text-[15px] font-semibold leading-7 text-text-primary`
- Skills card classes: `rounded-2xl border border-border bg-surface p-8 shadow-card`
- Skill group label: `text-sm font-semibold leading-5 text-text-muted`
- Matched skill badge: `inline-flex items-center gap-1 rounded-full bg-success-lightest px-3 py-1 text-xs font-semibold leading-4 text-success-foreground`
- Missing skill badge: `inline-flex items-center gap-1 rounded-full bg-accent-muted px-3 py-1 text-xs font-semibold leading-4 text-accent`

### JobDescription

- Path: `components/job-details/JobDescription.tsx`
- Card classes: `rounded-2xl border border-border bg-surface p-8 shadow-card`
- Icon classes: `flex h-8 w-8 items-center justify-center rounded-full bg-surface-secondary text-text-secondary`
- Heading classes: `text-xl font-bold leading-7 text-text-primary`
- Body classes: `mt-6 space-y-6 text-[15px] font-semibold leading-7 text-text-primary`
- Truncated-preview notice: rendered when saved description ends in Unicode ellipsis (`U+2026`) or `...`; classes `rounded-xl border border-border bg-surface-secondary p-4 text-sm font-medium leading-6 text-text-secondary`
- Full-post link in notice: `mt-3 inline-flex items-center gap-2 text-sm font-semibold leading-5 text-accent transition-opacity hover:opacity-80`
- Optional subsection heading: `text-sm font-bold uppercase tracking-wide text-text-secondary`
- Bullet dot: `mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent`

### CompanyResearch

- Path: `components/job-details/CompanyResearch.tsx`
- Card classes: `overflow-hidden rounded-2xl border border-border bg-surface shadow-card`
- Header classes: `flex flex-col gap-4 border-b border-border px-8 py-6 sm:flex-row sm:items-center sm:justify-between`
- Header icon: `flex h-8 w-8 items-center justify-center rounded-full bg-accent-muted text-accent`
- Heading classes: `text-xl font-bold leading-7 text-text-primary`
- Research button: `inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-accent px-5 text-base font-semibold text-accent-foreground shadow-card transition-opacity hover:opacity-90`
- Empty body classes: `flex min-h-[260px] items-center justify-center px-6 py-14`
- Empty icon: `mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-secondary text-text-muted`
- Empty title: `mt-5 text-base font-semibold leading-6 text-text-primary`
- Empty text: `mt-2 text-base font-medium leading-6 text-text-muted`
- Feature 13 wiring: now a Client Component with props `jobId`, `company`, `initialResearch`. Button calls `POST /api/agent/research`, disables with `disabled:cursor-not-allowed disabled:opacity-60`, swaps the search icon for the shared inline spinner (`animate-spin`, 16x16), stores the returned dossier in local state, then calls `router.refresh()`.
- Dossier reading order: Company Overview, Tech Stack, Culture, Your Edge, Gaps to Address, Why This Role, Smart Questions, Interview Prep, Sources. Candidate-fit cards intentionally appear before role rationale so the viewer sees relevance before deeper interview strategy.
- Filled body wrapper classes: `px-8 py-6`; dossier field-card grid `grid gap-4 lg:grid-cols-2`
- Dossier field card: `rounded-xl border border-border bg-surface-secondary p-5`; Overview, Tech Stack, and Sources add `lg:col-span-2`
- Dossier field header: `flex items-start gap-3`; icon box `flex h-8 w-8 shrink-0 items-center justify-center rounded-lg` using token tone classes (`bg-accent-muted text-accent`, `bg-info-lightest text-info-medium`, `bg-success-lightest text-success`, or `bg-surface text-text-secondary`)
- Dossier field label: `text-sm font-bold uppercase leading-5 tracking-wide text-text-secondary`
- Dossier paragraph: `text-[15px] font-medium leading-7 text-text-primary`
- Dossier bullet row: `flex gap-3 text-sm font-medium leading-6 text-text-primary`; bullet dot `mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent`
- Tech tag classes: `inline-flex rounded-full bg-accent-muted px-3 py-1 text-xs font-semibold leading-4 text-accent`
- Sources link classes: `break-words text-sm font-semibold leading-6 text-accent transition-opacity hover:opacity-80`
- Error line classes: `border-t border-border px-8 py-4 text-sm font-medium leading-5 text-error`

### JobActions

- Path: `components/job-details/JobActions.tsx`
- Apply button: `inline-flex min-h-14 w-full items-center justify-center rounded-xl bg-accent px-4 text-base font-semibold text-accent-foreground shadow-card transition-opacity hover:opacity-90`
- Missing-link fallback: same dimensions and colors with `opacity-60`, text "Apply link unavailable"

### TailoredResumeAction

- Path: `components/job-details/TailoredResumeAction.tsx`
- Card classes: `overflow-hidden rounded-2xl border border-border bg-surface shadow-card`
- Header classes: `flex flex-col gap-4 border-b border-border px-8 py-6 sm:flex-row sm:items-center sm:justify-between`
- Header icon: `flex h-8 w-8 items-center justify-center rounded-full bg-accent-muted text-accent`
- Heading classes: `text-xl font-bold leading-7 text-text-primary`
- Generate button: `inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-accent px-5 text-base font-semibold text-accent-foreground shadow-card transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60`
- Download button: `inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-border bg-surface px-5 text-base font-semibold text-text-primary shadow-card transition-colors hover:bg-surface-secondary`
- Body wrapper classes: `px-8 py-5`
- Ready copy classes: `text-sm font-semibold leading-5 text-success`
- Idle/generating/expired copy classes: `text-sm font-medium leading-5 text-text-muted`
- Error line classes: `border-t border-border px-8 py-4 text-sm font-medium leading-5 text-error`
- Feature 18 wiring: Client Component with props `jobId` and `initialState`. Button calls `POST /api/jobs/[id]/tailored-resume`, disables with `aria-busy`, swaps the generate icon for the shared inline spinner (`animate-spin`, 16x16), stores the returned `downloadUrl`/`expiresAt`, then calls `router.refresh()`.
- States: idle, generating, ready/download, expired, error.
- Feature 18 follow-up: the generated tailored PDF now includes an ATS-safe `Target Role: {title} at {company}` line in the document body so it is visibly distinct from the profile resume; no TailoredResumeAction classes changed.

### JobsTable link update

- Path: `components/find-jobs/JobsTable.tsx`
- Feature 12 makes the company and role cells links to `/find-jobs/{job.id}` while preserving the table's previous visual shape.
- Link hover classes: `transition-colors hover:text-accent`

### globals.css token utilities added for Feature 12

`.bg-text-muted`, `.bg-info-lightest`, `.text-info-medium`. These are hand-written token utilities matching the existing Tailwind v4 fallback pattern.

---

## Dashboard Page (Feature 14)

Last updated: 2026-06-10

The dashboard matches `context/designs/dashboard.png`: the find-jobs-width stacked layout (`max-w-[1280px]`) holding a 4-card stats row, a Recent Activity + Company Research Activity row, and a Jobs Found Over Time + Match Score Distribution row. As of F15–F17 every card runs on real data: stats + activity from InsForge, the three charts from PostHog events (HogQL via `lib/posthog-query.ts` + transforms in `lib/dashboard-charts.ts`). Charts are recharts 3 Client Components; everything else is Server Components.

### Dashboard Page Layout

- Path: `app/dashboard/page.tsx` (Server Component)
- Main classes: `min-h-screen bg-background`
- Content section classes: `mx-auto w-full max-w-[1280px] px-6 py-8 lg:px-0` (same as find-jobs)
- Stack classes: `flex flex-col gap-6`; no Footer (authed-shell pattern)
- Activity/research row: `grid grid-cols-1 gap-6 lg:grid-cols-2`
- Bottom charts row: `grid grid-cols-1 gap-6 lg:grid-cols-3` with the line chart wrapped in `<div className="lg:col-span-2">` (2:1 split per design)
- Real data reads (F14–F17) run in one `Promise.all`: `profiles.is_complete` for the banner, the F15 stats queries, the F16 activity queries, plus three PostHog chart fetchers (`fetchJobsOverTime`/`fetchMatchDistribution`/`fetchResearchActivity` from `lib/dashboard-charts.ts`). Stats math is `computeDashboardStatValues` in `lib/dashboard-stats.ts`
- Chart data handoff (F17): a fetcher returning `null` (query/config failure) makes the page pass `data={[]}` + `emptyMessage="Could not load chart data. Refresh the page to try again."`; an all-zero result passes `data={[]}` with no message so each chart's no-data default shows. Y axes are page-computed: `yAxis={chartYAxis(points)}` (wraps `computeYAxis` over the max count)
- Stats error state: on a jobs query error all four stat values render "—" (captions unchanged); avg also renders "—" when no scored jobs exist. Errors log with the `[dashboard]` prefix

### StatsBar

- Path: `components/dashboard/StatsBar.tsx` (Server Component; exports `DashboardStat`)
- Grid classes: `grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4`
- Card classes: `rounded-2xl border border-border bg-surface p-6 shadow-card`
- Label classes: `text-sm font-medium leading-5 text-text-secondary`
- Value classes: `mt-2 text-[30px] font-semibold leading-9 text-text-primary` (ui-tokens stat number)
- Trend badge classes: `rounded-sm bg-success-lightest px-2 py-0.5 text-xs font-medium leading-4 text-success-darker` — 4px radius per ui-rules, NOT pill; optional (`badge?`), cards without one show caption only
- Caption classes: `text-xs font-normal leading-4 text-text-muted` inside a `mt-2 flex items-center gap-2` row
- Feature 15 wiring: component unchanged — the page passes real values (`buildStats` in `app/dashboard/page.tsx`). No badges with real data (no honest trend source defined); captions are factual: "All time" / "Across all jobs" / "Total researched" / "New this week". The badge slot stays for any future feature that defines real week-over-week data

### RecentActivity

- Path: `components/dashboard/RecentActivity.tsx` (Server Component; exports `ActivityEntry`, `ActivityTone`)
- Card classes: `overflow-hidden rounded-2xl border border-border bg-surface shadow-card` — full-bleed header-divider family (like CompanyResearch), NOT the p-6 card
- Header classes: `border-b border-border px-6 py-5`; title `text-base font-semibold leading-6 text-text-primary`
- List wrapper: `px-6 py-5`; entry row `flex gap-3`; text block `pb-5` on all but the last entry
- Timeline dot: outer `mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-surface` + tone ring class; inner `h-2 w-2 rounded-full` + tone dot class
- Dot tones (ui-tokens activity dots): accent → `bg-accent-light`/`bg-accent`, info → `bg-info-light`/`bg-info`, success → `bg-success-light`/`bg-success-alt`
- Connector: `mt-1 w-px flex-1 bg-border` in the dot column, skipped after the last entry
- Entry title: `text-sm font-medium leading-5 text-text-primary`; timestamp `mt-1 text-xs font-normal leading-4 text-text-muted`
- Empty state: `px-6 py-12 text-center text-sm font-medium leading-5 text-text-muted` — copy via optional `emptyMessage` prop (default first-run copy; the page passes error copy when the activity queries fail)
- Feature 16 wiring: component visuals unchanged — the page maps `buildRecentActivityItems` (`lib/dashboard-activity.ts`) output to `ActivityEntry[]` with `formatRelativeTime`. Real data uses only two tones per build-plan F16: runs → `success` (green), research → `info` (blue); the `accent` tone remains for the type union but nothing real emits it. Feed = 5 newest entries merged from completed `agent_runs` + `jobs.researched_at`

### Dashboard Chart Card (shared by all three charts)

- Paths: `components/dashboard/ResearchActivityChart.tsx`, `JobsOverTimeChart.tsx`, `MatchDistributionChart.tsx` (Client Components — recharts; one component per file per code-standards, replacing the single `AnalyticsCharts.tsx` sketched in architecture.md)
- Card classes: `rounded-2xl border border-border bg-surface p-6 shadow-card` (+ `h-full` so grid-wrapped charts stretch evenly)
- Title classes: `text-base font-semibold leading-6 text-text-primary`
- Chart body: `mt-6 h-[280px]` wrapping `<ResponsiveContainer width="100%" height="100%" initialDimension={{ width: <approx card width>, height: 280 }}>` — the `initialDimension` is required (recharts' `-1×-1` default logs a dev warning on SSR/first render; values used: 580 research, 800 jobs-over-time, 360 match distribution)
- Colors are recharts props using CSS variables ONLY (never hex): bars `var(--color-info)` (research) / `var(--color-success)` (match distribution); line `var(--color-accent)` strokeWidth 3 with `<linearGradient>` fill `var(--color-accent)` stopOpacity 0.2 → 0; grid `var(--color-border)` `strokeDasharray="4 4"` `vertical={false}`; axis ticks `{ fill: "var(--color-chart-axis)", fontSize: 12 }`
- Axes: `axisLine={false} tickLine={false} tickMargin={10}`, YAxis `width={32}` with explicit `ticks` + `domain` — since F17 supplied by the required `yAxis: YAxisConfig` prop (page computes via `computeYAxis`; never hardcode axis scales in a chart)
- X label density (F17): six-bucket distribution forces all labels with `interval={0}` (recharts auto-skip dropped "80-90%" in the 1/3 card); the 30-point jobs-over-time axis thins with `interval="preserveStartEnd"` + `minTickGap={24}`
- Bars: `radius={[4, 4, 0, 0]}`, `barSize={24}` (7-bar weekly) / `barSize={28}` (6-bar distribution)
- `isAnimationActive={false}` on every series — deterministic final-state render (mount animation freezes invisible in hidden/throttled tabs and re-animates on every visit otherwise)
- Empty state (F17): when `data` is empty each chart keeps its card + title and renders `emptyMessage` (optional prop with a per-chart first-run default) as `flex h-full items-center justify-center px-6 text-center text-sm font-medium leading-5 text-text-muted` inside the `h-[280px]` body — same type ramp as RecentActivity's empty state
- Chart point props are produced by `lib/dashboard-charts.ts`: daily series gap-filled oldest→newest (weekday labels "Thu…Wed" for the 7-day research chart, "Jun 9"-style for the 30-day chart); distribution always emits the six ranges `<50%`…`90-100%`

### IncompleteProfileBanner

- Path: `components/dashboard/IncompleteProfileBanner.tsx` (Server Component, no props)
- Card classes: `flex flex-col gap-4 rounded-2xl border border-border bg-surface p-6 shadow-card sm:flex-row sm:items-center sm:justify-between` — white card per ui-rules, color only inside
- Icon box: `flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-muted text-accent` with inline alert SVG (`stroke="currentColor"`)
- Title: `text-base font-semibold leading-6 text-text-primary`; body `mt-1 text-sm font-medium leading-5 text-text-secondary`
- CTA: accent primary button primitive as a `<Link href="/profile">` — `inline-flex min-h-10 shrink-0 items-center justify-center rounded-md bg-accent px-4 text-sm font-medium text-accent-foreground shadow-card transition-opacity hover:opacity-90`
- Not in dashboard.png (the design state has a complete profile) — renders only when `profiles.is_complete` is not true, per build-plan F14

### globals.css token utilities added for Feature 14

`.bg-border`, `.bg-info-light`, `.bg-success-light`, `.bg-success-alt`, `.text-success-darker`. Same hand-written token-utility pattern as Features 01–12.

---

## Reusable Primitives

Canonical app-wide form/UI primitives. Feature 05 introduced them (the app had no inputs, selects, accent buttons, pill tags, or checkboxes before). Every future feature — Find Jobs search controls, Job Details, Dashboard filters — must match these exactly rather than reinventing them.

### Input Field

File: `components/profile/ProfileForm.tsx` (`INPUT_CLASS`)
Last updated: 2026-06-09

| Property         | Class                                                            |
| ---------------- | ---------------------------------------------------------------- |
| Background       | `bg-surface`                                                     |
| Border           | `border border-border`                                           |
| Border radius    | `rounded-md`                                                     |
| Text — primary   | `text-sm font-medium text-text-primary`                          |
| Placeholder      | `placeholder:text-text-muted`                                    |
| Spacing          | `px-3 py-2`                                                      |
| Focus state      | `focus:border-accent focus:ring-accent focus:outline-none`      |
| Disabled state   | `disabled:bg-surface-secondary` (+ `text-text-secondary cursor-not-allowed`) |
| Shadow           | none                                                             |

**Pattern notes:** Full string — `w-full rounded-md border border-border bg-surface px-3 py-2 text-sm font-medium text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-accent focus:outline-none`. Textareas reuse this + `resize-none`. `focus:ring-accent` is a hand-written 1px box-shadow (globals.css), not Tailwind's ring stack.

### Select Field

File: `components/profile/ProfileForm.tsx`
Last updated: 2026-06-09

| Property      | Class                                                                                     |
| ------------- | ----------------------------------------------------------------------------------------- |
| Base          | Input Field classes + `appearance-none pr-9`                                               |
| Chevron       | inline SVG, `pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-muted` |

**Pattern notes:** Always wrap the native `<select>` in a `relative` div and overlay the chevron. Never style a bare select.

### Button — Primary (Accent)

File: `components/profile/ProfileForm.tsx`, `components/profile/ResumeUpload.tsx`
Last updated: 2026-06-09

| Property      | Class                                                  |
| ------------- | ------------------------------------------------------ |
| Background    | `bg-accent`                                            |
| Text          | `text-sm font-medium text-accent-foreground`           |
| Border radius | `rounded-md` (full-width Save uses `rounded-lg`)       |
| Spacing       | `min-h-10 px-4` (Save: `min-h-11 w-full`)              |
| Hover state   | `transition-opacity hover:opacity-90`                  |
| Shadow        | `shadow-card`                                          |

**Pattern notes:** Use `bg-accent text-accent-foreground` for primary CTAs and primary in-app actions. `--color-accent` is teal, not purple, and its foreground changes in dark mode for contrast. Use `bg-surface text-text-primary` for navbar secondary actions such as Sign out. Use `bg-overlay text-overlay-foreground` only for overlay-specific buttons in dark full-band sections.

### Button — Navbar Secondary

File: `components/layout/SignOutButton.tsx`
Last updated: 2026-06-13

| Property      | Class                                                              |
| ------------- | ------------------------------------------------------------------ |
| Background    | `bg-surface`                                                       |
| Border        | `border border-border`                                             |
| Text          | `text-sm font-medium text-text-primary`                            |
| Border radius | `rounded-md`                                                       |
| Spacing       | `min-h-10 px-5`                                                    |
| Hover state   | `transition-colors hover:border-accent hover:bg-surface-secondary` |

### Button — Overlay

File: overlay sections such as `components/homepage/TrustSection.tsx`
Last updated: 2026-06-13

| Property      | Class                                        |
| ------------- | -------------------------------------------- |
| Background    | `bg-overlay`                                 |
| Text          | `text-sm font-medium text-overlay-foreground` |
| Border radius | `rounded-md`                                 |
| Spacing       | `min-h-10 px-4`                              |
| Hover state   | `transition-opacity hover:opacity-90`        |

### Tag / Pill Badge

File: `components/profile/ProfileForm.tsx`, `components/profile/CompletionIndicator.tsx`
Last updated: 2026-06-09

| Property      | Class                                                                         |
| ------------- | ----------------------------------------------------------------------------- |
| Background    | `bg-accent-muted`                                                             |
| Text          | `text-xs font-medium text-accent`                                            |
| Border radius | `rounded-full`                                                               |
| Spacing       | `px-3 py-1` (removable tags) / `px-2 py-0.5` (static labels, + `uppercase tracking-wide`) |

**Pattern notes:** The `bg-accent-muted` / `text-accent` "missing skill"-style badge from ui-tokens. Removable tags append a trailing `×` button (`text-accent hover:opacity-70`). Matched-skill (green) badges are not built yet — when Job Details needs them, use `bg-success-lightest` / `text-success-foreground` per ui-tokens and imprint them then.

### Checkbox

File: `components/profile/ProfileForm.tsx`
Last updated: 2026-06-09

| Property | Class                                                  |
| -------- | ------------------------------------------------------ |
| Size     | `h-4 w-4`                                               |
| Accent   | `checkbox-accent` (sets `accent-color: var(--color-accent)`) |

**Pattern notes:** Native checkbox tinted via the `checkbox-accent` utility — do not hand-build custom checkbox markup.

---

## Stripe SaaS Billing Components (2026-06-26)

These components implement Stripe subscription states, usage tracking, and pricing comparison under Website Modernization styling rules.

### PlanSummary

- Path: `components/billing/PlanSummary.tsx`
- Classes: `rounded-md border border-border bg-surface p-4 shadow-card`, title `text-lg font-bold text-text-primary flex items-center gap-2`, status badge `inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize bg-success-lightest text-success-foreground` or `bg-surface-secondary text-text-secondary`.
- Behavior: Server component that displays the user's current plan tier (Free/Pro), its subscription status, and billing period renewal/expiration date.

### UsageMeter

- Path: `components/billing/UsageMeter.tsx`
- Classes: `rounded-md border border-border bg-surface p-4 shadow-card`, progress bar track `h-2 w-full rounded-full bg-border-light overflow-hidden`, progress bar fill `h-full rounded-full transition-all duration-500 ease-out`.
- Color mapping: progress bar fill colors:
  - Green (`bg-success`) for usage <= 70%
  - Blue (`bg-info`) for usage between 71% and 89%
  - Red (`bg-error`) for usage >= 90%
- Behavior: displays quota meters for the 6 tracked events (searches, scores, research, tailored resumes, base resumes, extractions).

### BillingActions

- Path: `components/billing/BillingActions.tsx` (Client Component)
- Classes: Manage Billing button `inline-flex min-h-10 items-center justify-center rounded-md border border-border bg-surface px-5 text-sm font-medium text-text-primary shadow-card transition-colors hover:border-accent hover:bg-surface-secondary`, Upgrade button `inline-flex min-h-10 items-center justify-center rounded-md bg-accent px-5 text-sm font-medium text-accent-foreground shadow-card transition-colors hover:bg-accent-dark`, coming-soon card `rounded-md border border-border bg-surface-secondary p-3`.
- Behavior: handles checkout redirection and customer portal session creation, falls back gracefully to showing "Payments coming soon" alert when payments are disabled on the backend.

### PricingPage

- Path: `app/pricing/page.tsx` (Server Component)
- Classes: page wrapper `min-h-screen bg-background`, section `mx-auto w-full max-w-[1280px] px-6 py-16 text-center`, grid `mt-12 grid gap-8 md:grid-cols-2 max-w-[800px] mx-auto text-left`, tier card `rounded-md border border-border bg-surface p-8 shadow-card flex flex-col justify-between transition-transform duration-300 hover:scale-[1.01]`, Pro border `border-accent`, Recommended label `absolute top-0 right-0 bg-accent text-accent-foreground px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-bl-md`.
- Behavior: Public route showing comparison grid between Free and Pro plans, with context-aware CTAs (login redirect or checkout).

