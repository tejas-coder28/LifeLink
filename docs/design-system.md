# LifeLink Liquid Glass & Spatial UI Design System

## 1. Overview
The LifeLink Design System is an Apple-inspired Liquid Glass & Spatial UI language built for life-critical healthcare and blood donation networks. It balances visceral, cinematic depth with clinical calm, trustworthy authority, and uncompromising WCAG AA/AAA readability across **both Dark and Light themes**.

### Direction: "Midnight Navy + Crimson + Ice"
- **Clinical, Trustworthy, Calm**: Midnight Navy (`#0A0F1C`) dark foundation and Cool White (`#F4F7FB`) light canvas base, structured with silver-blue neutrals and ice blue accents.
- **10% Emergency Crimson Budget**: Crimson is reserved strictly for life-critical signals (primary CTAs, emergency/critical badges, urgent request status indicators, active navigation indicator). It represents $\le 10\%$ of any screen budget, preserving its immediate visceral urgency.
- **Semantic Mapping**:
  - `ONLINE / Verified Facility / Confirmed / Fulfilled` $\rightarrow$ `success`
  - `Cooldown / Low Stock / Pending` $\rightarrow$ `warning`
  - `Critical Stock / Emergency Request` $\rightarrow$ `danger`
  - `Informational / System State / Active Filter` $\rightarrow$ `info`
  - Always paired with explicit text labels or icons; never communicates status through color alone.

---

## 2. Palette & Semantic Design Tokens

Every token is defined as a semantic CSS variable in `client/src/index.css` and exported through `client/src/theme/tokens.js`, providing a single source of truth across Tailwind classes and JavaScript chart themes:

| Token | Dark Mode | Light Mode | Usage & Purpose | WCAG Contrast |
|---|---|---|---|---|
| `canvas` | `#0A0F1C` | `#F4F7FB` | Base viewport foundation | Baseline |
| `surface` | `#111A2E` | `#FFFFFF` | Core data cards, inputs, containers | N/A |
| `raised` | `#18233D` | `#E9EFF7` | Filter panels, interactive forms, active cards | N/A |
| `overlay` | `#1F2C4A` | `#FFFFFF` + shadow | Dialog modals, full-screen sheets | N/A |
| `text-primary` | `#E8EEF9` | `#0F1A2E` | High-contrast headings and key data values | $\ge 11.8:1$ Dark / $\ge 15.0:1$ Light (AAA) |
| `text-muted` | `#9DAAC6` | `#4A5A78` | Captions, secondary subtitles, metadata | $\ge 5.9:1$ Dark / $\ge 6.0:1$ Light (AA) |
| `hairline` | `rgba(147,161,189,0.16)` | `rgba(15,26,46,0.12)` | Subtle glass borders and divider lines | UI boundary |
| `specular rim` | `rgba(255,255,255,0.08)` | `rgba(255,255,255,0.90)` | Top-edge optical specular highlight | Specular reflection |
| `danger` | `#E5484D` | `#C8102E` | Critical shortages, emergency badges | $\ge 3.5:1$ Dark / $\ge 5.0:1$ Light (AA) |
| `danger-solid` | `#D13438` | `#C8102E` | Primary emergency CTAs with white text | $\ge 4.9:1$ Dark / $\ge 5.8:1$ Light (AA) |
| `danger hover` | `#FF6166` | `#A80D26` | Interactive hover state for danger buttons | Interactive |
| `danger pressed` | `#B82C30` | `#8A0A1F` | Pressed active state for danger buttons | Interactive |
| `success` | `#34D399` | `#0A7A62` | ONLINE status, verified facilities, fulfilled | $\ge 7.2:1$ Dark / $\ge 4.5:1$ Light (AA) |
| `warning` | `#FBBF24` | `#9A5B00` | Cooldown warnings, low stock, pending | $\ge 8.2:1$ Dark / $\ge 4.6:1$ Light (AA) |
| `info / focus` | `#60A5FA` | `#1D6FD6` | Keyboard focus ring (2px offset 2px), info pills | $\ge 5.4:1$ Dark / $\ge 4.2:1$ Light (AA) |
| `ice` (accent) | `#A5D8FF` | `#1D6FD6` | AI assistance, secondary highlights | $\ge 9.1:1$ Dark / $\ge 4.2:1$ Light (AA) |

---

## 3. Atmospheric Ground & Mesh Canvas

### 3.1 Harmonic Drifting Orbs
Replaced vibrant violet/teal/sky with harmonized clinical tones:
- **Orb 1 (Dim Crimson)**: Urgency beacon, strictly muted (`opacity <= 12%` Dark / `<= 8%` Light).
- **Orb 2 (Royal Blue `#2B4C8C`)**: Trust, clinical reliability, hospital logistics.
- **Orb 3 (Ice Blue `#A5D8FF`)**: Technical intelligence, AI assistant, fluid clarity.
- **Orb 4 (Silver-Blue `#93A1BD`)**: Neutral structure, depth separation.

### 3.2 Performance & Accessibility
- The background mesh layer is hardware-accelerated (`transform: translate3d(..., 0)` with `will-change: transform`) and runs non-synchronous orbital cycles (20s, 24s, 28s, 32s).
- **Reduced Motion Fallback**: Under `@media (prefers-reduced-motion: reduce)`, orbital animations freeze gracefully (`animation: none`), preserving readability and eliminating motion sickness.

---

## 4. Spatial Depth & 5 Elevation Tiers

| Level | Name | Backdrop Blur | Border & Specular | Shadow (Light / Dark) | Primary Application |
|---|---|---|---|---|---|
| **0** | `elevation-canvas` | None | None | None | Page foundation, background mesh |
| **1** | `elevation-base` | 20px / 170% sat | 1px hairline + top highlight | `0 1px 2px rgba(15,26,46,.06)` / Card shadow | Content cards, data rows, list tiles |
| **2** | `elevation-raised` | 24px / 180% sat | 1px hairline + specular edge | `0 4px 12px rgba(15,26,46,.07)` / Raised shadow | Active items, form panels, filter cards |
| **3** | `elevation-floating` | 28px / 190% sat | 1px hairline + specular edge | `0 8px 24px rgba(15,26,46,.08)` / Floating shadow | Floating navbar, AI widget, toast notifications |
| **4** | `elevation-overlay` | 32px / 200% sat | 1px hairline + specular edge | `0 16px 40px rgba(15,26,46,.12)` / Modal shadow | Dialog modals, full-screen drawers |

> [!NOTE]
> In light mode, glass elevation relies on genuine spatial drop shadows rather than glow, because light cannot cast a visible luminous glow against bright backgrounds.

---

## 5. Liquid Glass Material Anatomy

1. **Substrate Fill**:
   - **Dark Mode**: Neutral navy-tinted glass (`rgba(147, 180, 255, 0.05)`) with backdrop blur (`blur(26px) saturate(180%)`).
   - **Light Mode**: Pure cool-white translucent substrate (`rgba(255, 255, 255, 0.75)`) with soft diffusion.
2. **Double-Edge Optical Rim**:
   - `border-top`: 1px specular highlight (`rgba(255, 255, 255, 0.90)` in Light / `rgba(255, 255, 255, 0.08)` in Dark).
   - `border-bottom`: 1px hairline border (`rgba(15, 26, 46, 0.12)` in Light / `rgba(147, 161, 189, 0.16)` in Dark).
3. **Inner Specular Reflection**: Multi-stop inset shadow creating a glass prism rim:
   `box-shadow: inset 0 1px 1px 0 rgba(255,255,255,0.28), inset 0 -1px 1px 0 rgba(0,0,0,0.20)`.
4. **Liquid Lens Refraction**:
   SVG displacement map filter (`#liquid-refraction`) applied to floating navigation and hero spotlight components, gracefully degrading to clean backdrop blur when unsupported or when `prefers-reduced-motion` is active.

---

## 6. Typography & Contrast Compliance

- **Display & Headings**: `Plus Jakarta Sans` / `Sora` (`font-heading`). Weight: 700 to 900.
- **Body & Data**: `Inter` (`font-sans`). Weight: 400 to 600.
- **Tabular Numerics**: `tabular-nums` applied to all countdowns, stock units, blood group counts, and coordinates to prevent layout jitter.
- **WCAG 2.1 AA/AAA Verified Contrast**:
  - Body Text (`text-primary`): $\ge 11.88:1$ Dark / $\ge 15.03:1$ Light (exceeds AAA $7.0:1$).
  - Captions & Secondary Text (`text-muted`): $\ge 5.93:1$ Dark / $\ge 6.00:1$ Light (exceeds AA $4.5:1$).
  - Button Fill Text (`White` on `danger-solid`): $4.93:1$ Dark (`#D13438`) / $5.88:1$ Light (`#C8102E`) (exceeds AA $4.5:1$).
  - Focus Ring: 2px `--info` with 2px offset ($7.52:1$ Dark / $4.55:1$ Light, exceeds $3.0:1$).

---

## 7. Charts & Recharts Integration (`useChartTheme`)

- **Default Series**:
  - Primary Series: `colors.info` (`#60A5FA` Dark / `#1D6FD6` Light)
  - Secondary Series: `colors.ice` (`#A5D8FF` Dark / `#1D6FD6` Light)
  - Recovery / Fulfillment: `colors.teal` (`#34D399` Dark / `#0A7A62` Light)
  - Baseline / Standard: `colors.silver` (`#9DAAC6` Dark / `#4A5A78` Light)
- **Emergency Crimson Reserved**: Crimson (`colors.crimson`) is reserved exclusively for critical shortage indicators and unfulfilled emergency requests.
- **Adaptive Tooltip**: High-density blurred surface with mode-adaptive background and specular border.

---

## 8. Reusable Component Rules

1. **GlassCard**: Always specify `elevation` level (`1`, `2`, `3`, or `4`). Use `hover` prop for interactive lift.
2. **GlassNavbar**: Floating pill structure (`top-4`, `mx-auto`, `max-w-7xl`). Shrinks on scroll.
3. **GlassModal**: Teleport to `document.body` via React portal. Full-screen backdrop blur overlay, body scroll lock, Esc key handler, spring scale-in.
4. **GlassInput & GlassSelect**: Always use semantic tokens for border, text, and surface. Native `<select>` must declare `color-scheme: light dark` and `<option>` elements must receive theme-aware background.
5. **Motion Guidelines**:
   - Only animate `transform` and `opacity`.
   - Micro-interactions max `250ms`.
   - Never stack more than 2 blurred layers.
   - Respect `prefers-reduced-motion: reduce`.
