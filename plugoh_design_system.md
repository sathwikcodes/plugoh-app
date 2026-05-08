# Plugoh Design System

Mobile-first design system for a backend-first creator marketplace.

## Product Context

Plugoh connects two roles:

- Business users: brands, agencies, and marketers who discover creators, book campaigns, manage payments, and track delivery.
- Influencers: creators who connect Instagram, build a profile, receive campaign requests, chat with brands, deliver work, and track earnings.

The product is not a social feed. It is a marketplace and campaign operations tool.

### Design goals

- Feel premium, credible, and modern.
- Stay white-first and light-mode only.
- Use a peaceful pink-beige Instagram-inspired accent language without cloning Instagram.
- Make trust, money, approvals, and delivery states obvious.
- Support dense workflows without feeling heavy.
- Work equally well for business and influencer roles.
- Feel Gen Z, but polished and professional.

## Visual Direction

### Keywords

- White
- Warm pink
- Soft peach
- Pearl
- Calm premium
- Gen Z, but not playful
- Operational clarity
- High-trust

### Visual posture

- Clean white surfaces with very subtle warm tinting.
- Pink-peach gradient accents used sparingly.
- Soft but sharp shape language.
- Premium grotesk typography.
- Dense information arranged in calm, breathable layouts.
- No playful social-app noise, no loud rainbow system, no consumer-clone styling.

## Color System

### Core palette

Use a white-first base. The accent family is pink, rose, and peach.

```css
:root {
  --bg: oklch(100% 0 0);
  --surface: oklch(100% 0 0);
  --surface-warm: oklch(99.5% 0.005 78);
  --surface-blush: oklch(99.1% 0.01 356);
  --fg: oklch(18% 0.025 46);
  --muted: oklch(53% 0.016 52);
  --border: oklch(92.8% 0.01 82);
  --border-strong: oklch(84% 0.016 66);

  --rose: oklch(73% 0.18 354);
  --rose-2: oklch(71% 0.18 5);
  --pink: oklch(76% 0.17 342);
  --peach: oklch(86% 0.11 52);
  --pearl: oklch(98.2% 0.01 93);
  --beige: oklch(99.1% 0.004 88);
  --ink-soft: oklch(28% 0.02 45);

  --accent: linear-gradient(135deg, var(--rose) 0%, var(--pink) 45%, var(--peach) 100%);
  --accent-strong: oklch(60% 0.17 354);
  --accent-soft: oklch(98.6% 0.014 350);
  --accent-glow: color-mix(in oklab, var(--rose) 20%, transparent);

  --success: oklch(67% 0.17 147);
  --success-soft: oklch(96.8% 0.03 145);
  --pending: oklch(83% 0.16 92);
  --pending-soft: oklch(97.8% 0.03 92);
  --warning: oklch(76% 0.16 78);
  --warning-soft: oklch(97.3% 0.03 78);
  --danger: oklch(66% 0.18 25);
  --danger-soft: oklch(96.2% 0.03 25);
  --info: oklch(66% 0.11 228);
  --info-soft: oklch(96.8% 0.02 228);
}
```

### Color usage rules

- `--bg` and `--surface` should read as white.
- `--surface-warm` and `--surface-blush` are optional atmospheric tints for cards, shelves, and subtle sections.
- `--accent` is the primary identity color and should feel like a peaceful pink gradient.
- `--accent-strong` is for active states, key labels, and small UI highlights.
- `--success` is green and should always signal completed work, approved work, or released money.
- `--pending` is yellow and should always signal waiting, review, or held release.
- `--warning` is for caution and partial risk.
- `--danger` is for failure, rejection, or blocked states.
- Do not use accent color everywhere. Let white do most of the work.

## Typography

Use a premium system grotesk stack with strong weight contrast and tight display tracking.

```css
:root {
  --font-display: "SF Pro Display", "SF Pro Text", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
  --font-body: "SF Pro Text", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
  --font-mono: "SF Mono", "IBM Plex Mono", "JetBrains Mono", ui-monospace, Menlo, monospace;
}
```

### Type rules

- Display text: tight, premium, confident.
- Body text: calm, readable, and not too airy.
- Use mono only for amounts, IDs, dates, and structured metadata.
- Use tabular numerals for payments and dashboards.
- Keep headings short and direct.
- Avoid decorative serif display faces for this system.
- Avoid playful or overly soft type.

### Suggested scale

- Hero / page title: `clamp(3.4rem, 2.45rem + 3.2vw, 5.3rem)`
- Section heading: `clamp(2.08rem, 1.68rem + 1.5vw, 2.85rem)`
- Component title: `clamp(1.3rem, 1.16rem + 0.46vw, 1.54rem)`
- Body: `clamp(0.96rem, 0.92rem + 0.14vw, 1.05rem)`
- Fine print: `clamp(0.8rem, 0.76rem + 0.08vw, 0.86rem)`

### Tracking and rhythm

- Headings: `letter-spacing: -0.06em`
- Body: default or slightly tightened only
- Uppercase labels: spaced out and compact
- Keep line-height around `1.6` for body and `0.92` to `1.0` for display

## Spacing

Use a compact mobile scale that still feels airy.

```text
4, 8, 12, 16, 20, 24, 32, 40, 56
```

### Spacing rules

- 8 px for micro gaps and icon padding.
- 12 to 16 px for inner component spacing.
- 20 to 24 px for card padding.
- 32 px and above for section separation.
- Keep dense lists legible without over-padding them.

## Radii

Rounded, but not bubbly.

```text
chips: 14px
cards: 18px
sheets: 28px
pills: 999px
```

### Radius rules

- Chips and small controls should be 14 px.
- Cards should be 18 px.
- Bottom sheets and larger containers should be around 28 px.
- Pills should be fully rounded.
- Keep the system soft, not childish.

## Elevation

Use subtle shadowing only. The goal is a premium surface stack, not a floating app.

### Shadow tokens

- `--shadow-sm`: for chips, small cards, and hover states.
- `--shadow-md`: for featured cards and bottom sheets.
- `--shadow-lg`: for hero shells and major surfaces.

### Elevation rules

- Prefer border + soft shadow over heavy blur.
- Use shadows to separate layers, not to decorate everything.
- White surfaces should still feel dimensional.

## Layout Principles

- Mobile-first.
- Single-column by default.
- Dense but breathable.
- Section headers should be short and direct.
- Every screen should have one primary action.
- Secondary actions should stay visually quieter.
- Use calm whitespace around financially sensitive content.
- Keep important items near the top of the screen.

## Key Component System

### 1. Chips

Use for filters, states, quick facts, and trust labels.

Types:

- Neutral chip
- Active chip
- Success chip
- Pending chip
- Warning chip
- Danger chip

Rules:

- Keep chips small and precise.
- Use them for fast scanning, not decoration.
- Active chips can use the accent tint.
- State chips must use semantic colors.

### 2. Filters

Used in creator discovery and list views.

Pattern:

- Horizontal scroll or wrapping row.
- One active filter at a time when possible.
- Filter labels should be short.
- Pair filters with result cards that immediately reflect the selection.

### 3. Creator cards

Used in discovery, search results, saved creators, and profile previews.

Content blocks:

- Avatar or profile image
- Creator name
- Niche or category
- Instagram linked state
- Audience signal
- Pricing
- Availability
- Trust markers

Rules:

- Show the most important data first.
- Keep pricing prominent.
- Keep verification and availability visible.
- Do not bury trust under secondary metadata.

### 4. Profile headers

Used on creator profile pages and influencer setup.

Include:

- Avatar
- Name
- Niche
- Instagram connection status
- Short bio
- Audience stats
- Pricing starting point

Rules:

- Make the header feel polished and confident.
- Put trust and business signals near the name.
- Let AI-generated profile text feel editable, not final.

### 5. Stats blocks

Used for rate, response time, audience fit, earnings, conversions, campaign health, and payout summaries.

Rules:

- Use a strong numeric hierarchy.
- Keep labels short.
- Use mono or tabular numerals when the value is financial.
- Do not overcomplicate the block.

### 6. Progress and status indicators

Used for campaign lifecycle, booking states, release gates, and payout flow.

States:

- Success
- Pending
- Approval needed
- In progress
- Paid
- Failed
- Completed

Rules:

- Pending = yellow.
- Success = green.
- Approval needed should feel distinct from pending.
- Paid should read as successful money movement.
- Failed must be clearly red.
- Progress should be visually obvious in lists and detail pages.

### 7. Chat message blocks

Used for campaign coordination, revisions, approvals, and delivery notes.

Rules:

- Chat should feel operational, not social.
- Messages should be compact and readable.
- Attachments and revision notes belong inside the thread.
- Brand and creator messages should be easy to distinguish.
- Use status chips inside threads when needed.

### 8. Payment cards

Used for escrow, balance, release history, payout visibility, and transaction tracking.

Rules:

- Make money feel safe and legible.
- Show held funds, available balance, and upcoming release clearly.
- Use green only for confirmed positive movement.
- Use yellow when money is held or waiting on approval.
- Do not hide fees or deductions.

### 9. Notification items

Used for booking, message, approval, and payout alerts.

Rules:

- Sort by urgency and business relevance.
- Surface the action required.
- Include the status chip in the row.
- Keep copy short and specific.

### 10. Empty states

Used for no results, no campaigns, no earnings yet, and no messages.

Rules:

- Guide the next action.
- Do not apologize.
- Keep the copy direct.
- Use a small visual cue, not a decorative illustration.

### 11. Action sheets

Used for booking, payment release, quick decisions, and campaign actions.

Rules:

- Strong primary action first.
- Secondary details below.
- Keep the sheet rounded and tactile.
- Avoid overloading the sheet with too many options.

## Screen Patterns

### Discovery

Purpose: help business users find creators quickly.

Should include:

- Search
- Filters
- Creator cards
- Trust markers
- Pricing
- Availability
- Compare-friendly metadata

Design emphasis:

- Scannability
- Fast comparison
- High trust
- Minimal friction

### Booking

Purpose: commit to a campaign and fund it safely.

Should include:

- Deliverables
- Contract summary
- Escrow funding
- Timeline
- Approval condition
- Clear submit action

Design emphasis:

- Confidence
- Clarity
- Low risk

### Campaign tracking

Purpose: show progress from approved concept to release.

Should include:

- Status timeline
- Milestones
- Revision count
- Approval state
- Release gate

Design emphasis:

- Operational clarity
- Status visibility
- No ambiguity

### Chat

Purpose: coordinate execution.

Should include:

- Message thread
- Attachments
- Revision notes
- Approval requests
- Delivery confirmations

Design emphasis:

- Compact, calm, task-oriented

### Payments / earnings

Purpose: show escrow, payouts, and transaction history.

Should include:

- Available balance
- Held funds
- Release status
- Transaction list
- Fees or deductions

Design emphasis:

- Safety
- Transparency
- Confidence around money

### Notifications

Purpose: surface the next important action.

Should include:

- Booking alerts
- Message alerts
- Approval alerts
- Payment alerts

Design emphasis:

- Priority
- Urgency
- State clarity

### Profile setup

Purpose: help influencers connect Instagram and build a professional presence.

Should include:

- Instagram linking
- Bio generation
- Niche fields
- Audience signals
- Pricing
- Availability

Design emphasis:

- Clean onboarding
- Professional tone
- AI assistance that feels useful, not gimmicky

## Motion

Use polished, noticeable motion with restraint.

### Motion rules

- Small rise or fade-in on page load.
- Gentle card lift or highlight on interaction.
- Soft transitions on chips and sheets.
- Keep motion smooth and premium.
- Avoid bouncy social-app animation.

### Recommended motion feel

- Duration: around 180 to 320 ms for UI interactions.
- Easing: soft ease-out, not springy.
- Use motion to signal hierarchy and state, not to entertain.

## Content Voice

### Tone

- Clear
- Calm
- Premium
- Professional
- Gen Z aware
- Marketplace-first

### Copy rules

- Be specific.
- Keep labels short.
- Avoid filler like "Feature One".
- Do not over-explain.
- Use business language where needed, but keep it human.

## Accessibility and clarity

- Maintain strong contrast on white surfaces.
- Make state colors distinguishable without depending on color alone.
- Keep hit targets large enough for mobile.
- Use hierarchy and spacing to support scanning.
- Financial states must be readable at a glance.

## Do

- Use white surfaces as the default.
- Use the pink-peach gradient as the identity accent.
- Use green for success.
- Use yellow for pending.
- Keep screens calm and premium.
- Keep business and influencer flows symmetrical.
- Show trust cues early.

## Do Not

- Do not use a beige-heavy canvas.
- Do not use dark mode for this system.
- Do not use a loud rainbow palette.
- Do not mimic Instagram directly.
- Do not make it playful or childish.
- Do not use generic SaaS blue styling.
- Do not overuse gradients.

## Implementation Summary

If another agent needs to build from this spec, the working formula is:

- Pure white light-mode canvas.
- Pink-peach gradient accent system.
- Premium SF Pro-style grotesk typography.
- Soft, rounded, highly legible mobile components.
- Green success and yellow pending as non-negotiable state colors.
- Dense marketplace data presented with clarity and confidence.

## Short Build Prompt

Use this when you want to recreate the system elsewhere:

> Build a mobile-first, white-only creator marketplace design system for Plugoh. Use SF Pro-style typography, a warm pink-peach gradient accent, subtle white and pearl surfaces, green for success, yellow for pending, and premium rounded components that feel like a high-trust, Gen Z-friendly AI-native marketplace. Keep discovery, booking, chat, payments, notifications, earnings, and profile setup equally strong.