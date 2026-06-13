# Website Modernization Plan

## Purpose

Complete Job Application as a polished, modern product website before adding
SaaS billing, subscriptions, or admin controls.

The redesign goal is simple: a visitor should quickly understand the product,
trust it, want to explore it, and feel that the logged-in app is a place worth
returning to during an active job search.

## Implementation Status - 2026-06-13

- The original product build plan is complete through Phase 6 / Feature 18
  (Job-Tailored Resume Agent).
- Website modernization Phases 1-4 are implemented in the current worktree:
  visual/theme refresh, homepage redesign, login polish, and authenticated
  workspace polish.
- The dark-mode CTA contrast review finding has been addressed by keeping
  primary buttons on `bg-accent text-accent-foreground` and making
  `--color-accent-foreground` dark in dark mode. Overlay surfaces and overlay
  buttons use `--color-overlay-foreground`.
- The next new development phase is Phase 5 - Engagement Features Without
  Billing.
- Phase 6 - SaaS Readiness Later remains future-only. Do not add payment,
  subscription, billing, team, or admin features yet.

## Design Read

Reading this as: product-site redesign for technical job seekers, with a
premium AI SaaS language, leaning toward targeted evolution of the existing
Tailwind token system rather than a full visual reset.

## Design Dials

Marketing pages:

- `DESIGN_VARIANCE: 7`
- `MOTION_INTENSITY: 5`
- `VISUAL_DENSITY: 4`

Authenticated app pages:

- `DESIGN_VARIANCE: 4`
- `MOTION_INTENSITY: 3`
- `VISUAL_DENSITY: 6`

Reasoning:

- The homepage should feel more premium and memorable than the current static
  section stack.
- Dashboard, profile, find-jobs, and job-details are product surfaces. They
  need clarity, speed, and repeat-use comfort more than marketing spectacle.
- Motion should support hierarchy, feedback, and product storytelling. It
  should not become decoration.

## Current-State Audit

### Strengths

- The core product is now real: auth, profile, resume upload, job discovery,
  match scoring, company research, analytics, and tailored resumes exist.
- The homepage already uses real product imagery instead of fake dashboard divs.
- The repo has a clear token system in `app/globals.css` and documentation in
  `context/ui-tokens.md`, `context/ui-rules.md`, and `context/ui-registry.md`.
- The information architecture is simple and understandable:
  `/`, `/login`, `/dashboard`, `/find-jobs`, `/find-jobs/[id]`, `/profile`.
- The product has a strong value loop: profile, matches, research, tailored
  resume, apply.

### Gaps

- The homepage reads more like a completed build-plan page than a high-converting
  product website.
- The first viewport is centered and static. It needs a stronger product story
  and clearer "why spend time here" signal.
- The homepage repeats similar full-width bordered sections and diagonal bands,
  which can make the experience feel assembled rather than directed.
- Authenticated pages are functional but can feel like separate feature pages
  instead of one cohesive job-search workspace.
- Empty, loading, and success states should do more emotional work. They should
  guide the user to the next useful action.
- There is no public interactive demo or sample journey for a visitor who is not
  ready to sign in.
- There is no pricing or SaaS framing yet, which is fine for this phase. Billing
  should wait until the product experience feels desirable.

## Non-Negotiable Constraints

- Preserve the existing routes and primary nav labels unless explicitly approved.
- Keep the top navbar pattern. No sidebar and no drawer.
- Use project tokens only. No hardcoded hex values and no raw Tailwind color
  classes in components.
- Update `context/ui-registry.md` after component changes.
- Keep Inter unless the project docs are updated first. The current UI rules
  require Inter.
- Do not rename the approved PostHog events without updating
  `context/code-standards.md`.
- Do not add payment, subscription, team accounts, or admin controls in this
  modernization phase.
- Do not add a new visual dependency without checking `package.json`, updating
  project docs, and having a clear reason.
- Add a light/dark theme toggle during the redesign. The toggle changes the
  whole app theme, not individual page sections.
- If image assets are replaced in `public/`, use a new filename to avoid stale
  browser and optimizer caches.

## Recommended Direction

Use a light, premium, trust-first SaaS style built around the existing product:

- Keep the current logo.
- Reduce generic purple-AI signals. Use the existing accent intentionally, not
  everywhere.
- Let navy, white, soft surfaces, restrained accent color, product screenshots,
  and strong typography carry the design.
- Support light and dark themes with one global toggle in the top navigation.
  Default to the user's system preference until they choose manually.
- Keep product pages calm and scannable.
- Add motion only where it helps users understand progress, state, or flow.

This should feel like a polished career operating system for developers, not a
flashy AI landing page.

## Phase 1 - Visual Baseline And Design System Refresh

Goal: make the existing product feel coherent before changing major page
structure.

Tasks:

- Capture desktop and mobile screenshots for `/`, `/login`, `/dashboard`,
  `/find-jobs`, `/find-jobs/[id]`, and `/profile`.
- Record visual issues per page: spacing, hierarchy, repeated layouts, weak
  empty states, mobile crowding, contrast, and CTA clarity.
- Decide whether `--color-accent` stays purple or shifts toward the logo's teal
  and navy language. If it changes, update `ui-tokens.md`, `ui-rules.md`,
  `ui-registry.md`, and `app/globals.css` together.
- Define light and dark semantic tokens in `app/globals.css`. Keep token names
  stable so components can stay semantic instead of branching on theme.
- Add a theme toggle primitive for the navbar. It should use an accessible
  switch or icon button with `aria-label`, persist the user's choice, and fall
  back to `prefers-color-scheme` when no choice is saved.
- Define one shape system:
  cards at 16px, controls at 8px or 12px, badges full pill.
- Keep the current token-utility pattern in `app/globals.css`.
- Add or refine shared utilities only when reused across multiple pages.
- Do not install a motion or icon library in this phase unless the theme toggle
  design is approved to use one and project docs are updated first.

Deliverables:

- Updated token guidance if color or shape changes.
- Light and dark theme token guidance.
- Navbar theme toggle pattern documented in `context/ui-registry.md`.
- Screenshot audit notes.
- A small shared style checklist for the later phases.

Verification:

- `npm run lint`
- `npm run build`
- Screenshot comparison before and after
- Screenshot comparison in light and dark mode
- Theme persistence check across refresh and route changes
- Manual scan for hardcoded colors and raw Tailwind color classes

## Phase 2 - Homepage Redesign

Goal: turn the homepage from a static feature explanation into a persuasive
product story.

Recommended section order:

1. Hero with asymmetric product preview
2. Proof strip or product outcome strip
3. Interactive "how it works" journey
4. Product value section for matches, research, and tailored resumes
5. Real app preview section
6. Trust section using grounded proof, not fake logos
7. Final CTA
8. Footer

Hero direction:

- Use an asymmetric split hero instead of a centered text-only stack.
- Keep hero copy short:
  headline max 2 lines, subtext max 20 words, one primary CTA, one secondary CTA.
- Primary CTA intent should stay consistent across navbar, hero, and final CTA.
- Secondary CTA should invite exploration, such as "View demo" or "See workflow".
- Keep the CTA visible in the first viewport.
- Use a real product screenshot or generated product image. No div-based fake
  dashboard preview.
- The navbar theme toggle must remain available in the homepage first viewport
  without competing with the primary CTA.

Interactive journey direction:

- Show the value loop:
  Upload resume -> find matches -> research company -> tailor resume -> apply.
- Prefer a composed product walkthrough over three equal feature cards.
- If motion is added, use CSS transitions or a small client leaf component.
- Honor reduced-motion behavior.

Trust direction:

- Avoid fake customer logos and fake-perfect metrics.
- Use real product proof:
  "Profile to first search in under 5 minutes" only if this is still true.
- If sample data appears, label it clearly as sample.

Deliverables:

- Updated homepage components in `components/homepage/`.
- Updated homepage registry entries in `context/ui-registry.md`.
- New public assets only when needed, with cache-busting filenames.
- Homepage verified in both light and dark themes.

Verification:

- Desktop and mobile browser screenshots.
- Desktop and mobile screenshots in light and dark themes.
- Hero first-viewport check.
- CTA label consistency check.
- No duplicate CTA intent.
- No em dash characters in visible marketing copy.
- `npm run lint`
- `npm run build`

## Phase 3 - Login And Public Exploration

Goal: make signup feel trustworthy and give visitors a reason to explore before
committing.

Tasks:

- Modernize `/login` so it visually belongs to the new homepage.
- Carry the same light/dark theme support into `/login`.
- Keep OAuth buttons grounded in the live InsForge public auth config.
- Improve empty and unavailable-provider states.
- Add a homepage-level product demo section first.
- Consider a `/demo` page only after approving a route addition.

Recommended demo approach:

- Start with a static sample journey on the homepage using real app screenshots
  or a real component preview.
- Avoid backend changes at first.
- Later, if a `/demo` route is approved, make it read-only and clearly marked
  as sample data.

Deliverables:

- Polished login page.
- Public demo section or approved plan for a future `/demo` route.

Verification:

- OAuth button states still work.
- Unauthenticated protected routes still redirect correctly.
- Mobile login layout has no clipped text.
- Login page renders correctly in light and dark themes.
- `npm run lint`
- `npm run build`

## Phase 4 - Authenticated Workspace Polish

Goal: make logged-in users want to stay and return.

This phase applies taste principles carefully. The `design-taste-frontend` skill
is primarily for landing pages and redesigns, not dashboards or dense product
UI, so app pages should stay quiet, useful, and repeatable.

### Dashboard

Direction:

- Reframe the dashboard as a "Today" workspace using existing data.
- Keep analytics, but lead with next useful actions.
- Show best matches, incomplete profile work, recent research, and resume status
  before charts when appropriate.
- Keep charts scannable and avoid decorative motion.

Possible sections:

- Today
- Best matches
- Recent activity
- Search momentum
- Match distribution

Avoid:

- Large marketing hero inside the app.
- Decorative cards inside cards.
- Fake trends or fake precision.

### Find Jobs

Direction:

- Improve search confidence, loading states, and zero-result recovery.
- Make high-match jobs easier to scan without making low matches feel hidden.
- Improve mobile layout, likely table-to-card on small screens.
- Keep the Adzuna credit visible where real listings appear.

### Job Details

Direction:

- Make this the strongest product page.
- Present the job, match reasoning, company intelligence, tailored resume, and
  apply action as one coherent decision flow.
- Give company research and tailored resume richer ready states.
- Use normal-flow action groups instead of fixed sidebars.

### Profile

Direction:

- Make profile feel like "career readiness", not only a form.
- Keep all existing fields and save behavior.
- Add better section hierarchy, readiness summary, resume status, and review
  cues.
- Do not change form field names or order without explicit approval.

Deliverables:

- Page-specific polish PRs, one page at a time.
- Updated `context/ui-registry.md` after every component change.
- Authenticated workspace components verified in both light and dark themes.

Verification:

- Authenticated desktop and mobile screenshots.
- Authenticated desktop and mobile screenshots in light and dark themes.
- Empty, loading, error, and success state review.
- `npm test`
- `npm run lint`
- `npm run build`

## Phase 5 - Engagement Features Without Billing

Goal: add small engagement loops before SaaS mechanics.

Candidate ideas:

- Dashboard "Today" actions from existing data.
- Saved or shortlisted jobs if the data model already supports it or after a
  separate approved feature plan.
- Skill gap insights from repeated missing skills.
- Interview prep expansion from existing company research.
- Public demo route, if approved.

Recommended order:

1. Today actions using existing jobs, profile completeness, research status, and
   tailored resume status.
2. Skill gap insight summary using existing `missing_skills` arrays.
3. Interview prep expansion on job details.
4. Applications pipeline as a later product feature, because it needs new state.

Do not introduce payment yet.

## Phase 6 - SaaS Readiness Later

Start this only after the modernized site feels complete.

Future SaaS planning should include:

- Pricing page
- Plan limits
- Usage quotas for expensive AI and browser research operations
- Subscription status
- Billing portal
- Admin view for users, subscriptions, usage, and errors

Before implementing payment:

- Fetch current InsForge payment docs and Stripe docs.
- Decide what is free, pro, and premium.
- Add explicit tracking and product limits.
- Update project docs before backend work.

## Implementation Sequence

Recommended sequence:

1. Phase 1 audit and token refresh
2. Homepage redesign
3. Login polish and public demo section
4. Dashboard workspace polish
5. Job details polish
6. Find Jobs polish
7. Profile polish
8. Engagement features
9. SaaS planning

Reasoning:

- The homepage creates the first impression.
- Login is the conversion bridge.
- Dashboard and job details create daily value.
- Find Jobs and Profile are important, but they already have clear functional
  structure.
- Billing should follow desire, not precede it.

## File Targets

Likely files for the first implementation pass:

- `app/page.tsx`
- `components/homepage/Hero.tsx`
- `components/homepage/JobSearchEase.tsx`
- `components/homepage/ApplicationConfidence.tsx`
- `components/homepage/Testimonial.tsx`
- `components/homepage/FinalCta.tsx`
- `components/layout/Navbar.tsx`
- `components/layout/NavLinks.tsx`
- `components/layout/ThemeToggle.tsx`
- `components/layout/Footer.tsx`
- `app/(auth)/login/page.tsx`
- `app/globals.css`
- `context/ui-tokens.md`
- `context/ui-rules.md`
- `context/ui-registry.md`

Later authenticated app files:

- `app/dashboard/page.tsx`
- `components/dashboard/*`
- `app/find-jobs/page.tsx`
- `components/find-jobs/*`
- `app/find-jobs/[id]/page.tsx`
- `components/job-details/*`
- `app/profile/page.tsx`
- `components/profile/*`

## Pre-Flight Checklist For Each Page

- Brief and page role are clear.
- One page theme is used at a time, controlled globally by the theme toggle.
- Light and dark modes both pass visual review.
- The theme toggle is accessible, keyboard usable, and persists user choice.
- One accent strategy is used.
- Card, button, input, and badge radii follow one system.
- Buttons have readable contrast.
- CTA labels do not wrap on desktop.
- Hero fits the first viewport.
- Homepage uses real visuals, not fake div screenshots.
- No repeated three-equal-card feature row unless there is a strong reason.
- No more than one marquee if any marquee is used.
- Motion is motivated and reduced-motion safe.
- Mobile collapse is explicit.
- Empty, loading, error, and success states exist where relevant.
- No hardcoded hex values in components.
- No raw Tailwind color classes in components.
- No em dash characters in visible marketing copy.
- `context/ui-registry.md` is updated after component changes.

## Success Criteria

- A visitor understands the product in under 10 seconds.
- The homepage makes the product feel trustworthy and worth trying.
- The login page feels like a continuation of the product brand.
- The dashboard communicates what the user should do next.
- Job details feels like the premium moment of the product.
- Find Jobs is easy to scan on desktop and usable on mobile.
- Profile setup feels guided instead of tedious.
- The app still passes lint, tests, build, and visual checks.
- No existing auth, analytics, resume, job discovery, research, or tailored
  resume behavior regresses.
