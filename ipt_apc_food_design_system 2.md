---
name: "IPT APC Food"
description: "Warm Indian canteen lunch ordering system for a 21-person team at IIT Bombay"
---

## Overview

IPT APC Food is a private, warm Indian canteen-inspired lunch ordering web app built for a 21-person research team at IIT Bombay. Rejecting generic SaaS dashboards and impersonal tech aesthetics, the design system evokes the tactile, unhurried warmth of an Indian institutional canteen: rich handmade paper surfaces, terracotta and burnt spice accents, crisp typographic hierarchy, and authentic Indian culinary marks (green and red diet indicators, tabular Indian rupee formatting). It balances swift, single-thumb phone ordering during short lunch breaks with a utilitarian administrative command center.

## Colors

The palette strictly adopts Apple Human Interface Guidelines (HIG) system colors:
- **Surface & Ground:** Apple system grouped background (`#F2F2F7`) with pure elevated card surfaces (`#FFFFFF`) and tertiary fills (`#E5E5EA`).
- **Ink & Typography:** Apple system label primary ink (`#1C1C1E`) paired with secondary label (`#8E8E93`) and tertiary label (`#C7C7CC`).
- **Primary Tint:** Apple signature System Blue (`#0071E3` / `#007AFF`) for interactive accents, primary buttons, and selected tabs.
- **Success:** Apple System Green (`#34C759`) for within-budget status meters, placed order states, and vegetarian indicators.
- **Danger / Destructive:** Apple System Red (`#FF3B30`) for over-budget warnings, errors, destructive removals, and non-veg marks.
- **Extra Mode:** Apple System Orange (`#FF9500`) for the extra order workflow.

```yaml
colors:
  paper: "#F2F2F7"
  ink: "#1C1C1E"
  primary: "#0071E3"
  on-primary: "#FFFFFF"
  success: "#28CD41"
  on-success: "#454545"
  danger: "#FF3B30"
  on-danger: "#212121"
  extra: "#FF9500"
  on-extra: "#424242"
  veg: "#28CD41"
  nonveg: "#FF3B30"
  light:
    surface: "#FFFFFF"
    on-surface: "#1C1C1E"
    surface-variant: "#F2F2F7"
    on-surface-variant: "#6E6E72"
    outline: "#D1D1D6"
    outline-variant: "#E5E5EA"
  dark:
    surface: "#1C1C1E"
    on-surface: "#FFFFFF"
    surface-variant: "#2C2C2E"
    on-surface-variant: "#939397"
    outline: "#38383A"
    outline-variant: "#2C2C2E"
```

## Typography

The typography leverages **Plus Jakarta Sans** for humanist, tight headlines and legible body copy, paired with **JetBrains Mono** for tabular numbers, currency amounts, and order quantities. Minimum input font size is strictly 16px to prevent iOS auto-zoom behavior.

```yaml
typography:
  display-lg:
    fontFamily: "Plus Jakarta Sans"
    fontSize: 36px
    fontWeight: 700
    lineHeight: 44px
    letterSpacing: -0.5px
  display-lg-mobile:
    fontFamily: "Plus Jakarta Sans"
    fontSize: 28px
    fontWeight: 700
    lineHeight: 34px
    letterSpacing: -0.3px
  headline-lg:
    fontFamily: "Plus Jakarta Sans"
    fontSize: 24px
    fontWeight: 700
    lineHeight: 30px
    letterSpacing: -0.2px
  headline-md:
    fontFamily: "Plus Jakarta Sans"
    fontSize: 20px
    fontWeight: 600
    lineHeight: 26px
    letterSpacing: -0.1px
  headline-sm:
    fontFamily: "Plus Jakarta Sans"
    fontSize: 18px
    fontWeight: 600
    lineHeight: 24px
  body-lg:
    fontFamily: "Plus Jakarta Sans"
    fontSize: 16px
    fontWeight: 400
    lineHeight: 24px
  body-md:
    fontFamily: "Plus Jakarta Sans"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 20px
  body-sm:
    fontFamily: "Plus Jakarta Sans"
    fontSize: 12px
    fontWeight: 400
    lineHeight: 16px
  label-lg:
    fontFamily: "Plus Jakarta Sans"
    fontSize: 16px
    fontWeight: 600
    lineHeight: 22px
  label-md:
    fontFamily: "Plus Jakarta Sans"
    fontSize: 14px
    fontWeight: 600
    lineHeight: 18px
  label-sm:
    fontFamily: "Plus Jakarta Sans"
    fontSize: 11px
    fontWeight: 600
    lineHeight: 14px
    letterSpacing: 0.5px
  mono-md:
    fontFamily: "JetBrains Mono"
    fontSize: 14px
    fontWeight: 500
    lineHeight: 20px
  mono-sm:
    fontFamily: "JetBrains Mono"
    fontSize: 12px
    fontWeight: 500
    lineHeight: 16px
```

## Layout & Spacing

Mobile-first single-column container (max 480px on phones) with a sticky header and bottom sheet summary, expanding to a two-column 1280px layout on desktop where the order dock is sticky on the right. Spacing adheres to an 8px grid with 4px micro-steps. Touch targets are rigorously maintained at 44px or larger.

```yaml
spacing:
  gutter-xs: 4px
  gutter-sm: 8px
  gutter-md: 16px
  gutter-lg: 24px
  gutter-xl: 32px
  section: 40px
  page-margin: 16px
```

## Elevation & Depth

Surfaces emphasize contemporary architectural layering with crisp micro-borders and subtle ambient elevation. Clean white cards (`#FFFFFF`) float effortlessly above warm paper (`#F4EFE6`) with hairline borders (`#E2E8F0`) and soft, refined diffuse shadows (`0 2px 8px -2px rgba(26,54,93,0.06), 0 1px 3px -1px rgba(26,54,93,0.04)`). Headers and sticky order dock panels leverage frosted glass with backdrop blur (`backdrop-blur-md bg-paper/90`) for sleek depth.

## Shapes

Modern humanist geometry with tailored corner radii: 12px for compact controls and dish rows, 16px for cards, and 20–24px for modal docks and primary actions.

```yaml
rounded:
  sm: 8px
  DEFAULT: 12px
  md: 16px
  lg: 20px
  xl: 24px
  full: 9999px
```

## Motion & Micro-interaction

Micro-interactions feel crisp and responsive without sluggish animations. Quantities step immediately; save statuses transition cleanly between saving, saved, and retry states.

```yaml
motion:
  state-change:
    duration: 120ms
    delay: 0ms
    timingFunction: ease-out
  sheet-slide:
    duration: 220ms
    delay: 0ms
    timingFunction: cubic-bezier(0.16, 1, 0.3, 1)
```

## Voice & Content Strategy

Direct, calm, collegiate Indian canteen tone. Concise labels and Indian numbering (`₹1,234.50`). Distinct statuses:
- "Saving...", "Saved", "Could not save — Retry save"
- "Not placed yet — press Place order again"
- "✓ Order placed at 10:31 PM"
- "₹231.00 / ₹285.71 · ₹54.71 left" vs "Over by ₹24.29"
- Veg mark: green square outline with green dot. Non-veg mark: brown/red square outline with brown/red triangle or dot.

## Components

Component implementations live as individual HTML sticker sheet files in
`components/`. Each file contains the canonical, styled HTML components with
`<!-- COMPONENT: name -->` comment markers. Read each file before use.

- **Button** → `@components/button.html`: `button-primary`, `button-icon`, `button-with-icon`
- **Card** → `@components/card.html`: `card-elevated`, `card-action`, `card-interactive`, `card-interactive-2`
- **Chip** → `@components/chip.html`: `chip-action`, `chip-input`, `chip-with-icon`
- **Input Field** → `@components/input-field.html`: `input-field-text`, `input-field-icon`
- **Table** → `@components/table.html`: `table-standard`, `table-interactive`, `table-selectable`
