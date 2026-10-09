# LifeLink Liquid Glass & Spatial UI Design System

## 1. Overview
The LifeLink Design System is an Apple-inspired Liquid Glass & Spatial UI language built for life-critical healthcare and blood donation networks. It balances visceral, cinematic depth with uncompromising WCAG AA readability, high-contrast typography, and fluid GPU-accelerated motion.

---

## 2. Atmospheric Ground & Mesh Canvas

### 2.1 Color Spectrum
- **Dark Mode (Hero)**: Midnight Navy foundation (`#070B14` to `#0F1629`) with dynamic radial gradients and 4 slowly drifting atmospheric orbs:
  - **Orb 1 (Rose Crimson)**: `#F43F5E` (Brand vitality, urgency, arterial blood)
  - **Orb 2 (Violet / Indigo)**: `#8B5CF6` (Intelligence, matching algorithms, platform trust)
  - **Orb 3 (Teal Cyan)**: `#2DD4BF` (Life preservation, verified clinical safety, recovery)
  - **Orb 4 (Sky Blue)**: `#38BDF8` (Real-time network, logistical coordination)
- **Light Mode**: Pearl Iridescent canvas (`#F8FAFC` to `#F1F5F9`) with pastel luminescence (`0.06 - 0.12` opacity) and soft ambient lighting.

### 2.2 Performance Architecture
- The background mesh is rendered on a dedicated fixed composition layer behind all interactive content (`z-index: -1`, `position: fixed`).
- Transforms are strictly hardware-accelerated (`transform: translate3d(..., 0)` with `will-change: transform`).
- Animation cycles are non-synchronous (20s, 24s, 28s, 32s) to prevent repetitive orbital alignment.

---

## 3. Spatial Depth & 5 Elevation Tiers

| Level | Name | Backdrop Blur | Border & Specular | Shadow | Primary Application |
|---|---|---|---|---|---|
| **0** | `elevation-canvas` | None | None | None | Page foundation, background mesh |
| **1** | `elevation-base` | 20px / 170% sat | 1px border + top highlight | Card shadow + 1px inset | Content cards, data rows, list tiles |
| **2** | `elevation-raised` | 24px / 180% sat | 1px md-border + specular edge | Card hover shadow + inner specular | Active items, form panels, filter cards |
| **3** | `elevation-floating` | 28px / 190% sat | 1px md-border + specular edge | Floating shadow + brand glow | Floating navbar, AI widget, toast notifications |
| **4** | `elevation-overlay` | 32px / 200% sat | 1px md-border + specular edge | 30px modal shadow + specular ring | Dialog modals, full-screen drawers |

---

## 4. Liquid Glass Material Anatomy

1. **Substrate Fill**: Translucent theme-adaptive surface (`--elevation-*-bg`), balancing transparency with WCAG AA compliance.
2. **Double-Edge Optical Rim**:
   - `border-top`: 1px high-specular white highlight (`rgba(255, 255, 255, 0.98)` in light / `rgba(255, 255, 255, 0.24)` in dark).
   - `border-bottom`: 1px ambient theme border (`rgba(0, 0, 0, 0.08)` in light / `rgba(255, 255, 255, 0.08)` in dark).
3. **Inner Specular Reflection**: Multi-stop inset shadow creating a glass prism rim:
   `box-shadow: inset 0 1px 1px 0 rgba(255,255,255,0.28), inset 0 -1px 1px 0 rgba(0,0,0,0.20)`.
4. **Liquid Lens Refraction**:
   Chromium SVG `feDisplacementMap` filter (`#liquid-refraction`) applied to floating navbars and spotlight hero components, gracefully degrading to plain backdrop blur in non-supporting browsers and when `prefers-reduced-motion` is active.

---

## 5. Typography & Readability

- **Display & Headings**: `Plus Jakarta Sans` / `Sora` (`font-heading`). Weight: 700 to 900.
- **Body & Data**: `Inter` (`font-sans`). Weight: 400 to 600.
- **Tabular Numerics**: `tabular-nums` applied to all countdowns, stock units, blood group counts, and coordinates to prevent layout jitter.
- **WCAG Contrast Ratios**:
  - `text-primary`: `#0F172A` (Light, > 12:1) / `#F0F6FF` (Dark, > 14:1)
  - `text-secondary`: `#475569` (Light, > 5.5:1) / `#94A3B8` (Dark, > 6:1)
  - `text-muted`: `#64748B` (Light, > 4.5:1) / `#94A3B8` (Dark, > 4.5:1)

---

## 6. Semantic Color & Urgency Tokens

### 6.1 Urgency System
- **Critical** (`#F43F5E`): Emergency blood need within 2 hours. Pulsing luminous glow (`0 0 24px rgba(244,63,94,0.6)`).
- **High** (`#F97316`): Urgent clinical request within 12 hours. Amber-orange glow.
- **Medium** (`#38BDF8`): Scheduled clinical request within 48 hours. Sky blue pill.
- **Low** (`#64748B`): Elective / standby inventory request. Slate muted badge.

### 6.2 8-Group Blood Harmonization
- **O- (Universal Donor)**: Crimson accent (`#F43F5E`), glowing border.
- **O+**: Rose accent (`#FB7185`).
- **A+ / A-**: Violet accent (`#8B5CF6`).
- **B+ / B-**: Sky blue accent (`#38BDF8`).
- **AB+ (Universal Recipient) / AB-**: Amber accent (`#F59E0B`).

---

## 7. Reusable Component Rules

1. **GlassCard**: Always specify `elevation` level (`1`, `2`, `3`, or `4`). Use `hover` prop for interactive lift.
2. **GlassNavbar**: Floating pill structure (`top-4`, `mx-auto`, `max-w-7xl`). Shrinks on scroll.
3. **GlassModal**: Teleport to `document.body` via React portal. Full-screen backdrop blur overlay, body scroll lock, Esc key handler, spring scale-in.
4. **GlassInput & GlassSelect**: Always use semantic tokens for border, text, and surface. Native `<select>` must declare `color-scheme: light dark` and `<option>` elements must receive theme-aware background.
5. **Motion Guidelines**:
   - Only animate `transform` and `opacity`.
   - Micro-interactions max `250ms`.
   - Never stack more than 2 blurred layers.
   - Respect `prefers-reduced-motion: reduce`.
