# LifeLink Liquid Glass & Spatial UI Design System

## 1. Overview
The LifeLink Design System is an Apple-inspired Liquid Glass & Spatial UI language built for life-critical healthcare and blood donation networks. It balances visceral, cinematic depth with clinical calm, trustworthy authority, and uncompromising WCAG AA/AAA readability across **both Dark and Light themes**.

### Direction: "Midnight Navy + Crimson + Ice" with Purposeful Role & Medical Accents
- **Clinical, Trustworthy, Calm**: Midnight Navy (`#0A0F1C`) dark foundation and Cool White (`#F4F7FB`) light canvas base, structured with silver-blue neutrals and ice blue accents.
- **10% Emergency Crimson Budget**: Crimson is reserved strictly for life-critical signals (primary emergency CTAs, critical shortage badges, emergency status pings). It represents $\le 10\%$ of any screen budget, preserving its visceral urgency.
- **Max 3 Accent Hues Visible per Screen**: Dashboards use role-specific accents to maintain visual tranquility and eliminate cognitive overload.
- **Never Rely on Color Alone**: All status chips, urgency levels, and blood group indicators are accompanied by explicit text labels and semantic icons.

---

## 2. Palette & Semantic Design Tokens

Every token is defined as a semantic CSS variable in `client/src/index.css` and exported through `client/src/theme/tokens.js`, providing a single source of truth across Tailwind classes and JavaScript chart themes:

### 2.1 Foundation & Semantic States

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
| `success` | `#34D399` | `#0A7A62` | ONLINE status, verified facilities, fulfilled | $\ge 7.2:1$ Dark / $\ge 4.5:1$ Light (AA) |
| `warning` | `#FBBF24` | `#9A5B00` | Cooldown warnings, low stock, pending | $\ge 8.2:1$ Dark / $\ge 4.6:1$ Light (AA) |
| `info / focus` | `#60A5FA` | `#1D6FD6` | Keyboard focus ring (2px offset 2px), info pills | $\ge 5.4:1$ Dark / $\ge 4.2:1$ Light (AA) |
| `ice` | `#A5D8FF` | `#1D6FD6` | AI assistance, secondary highlights | $\ge 9.1:1$ Dark / $\ge 4.2:1$ Light (AA) |

### 2.2 Role Accents

| Token | Dark Solid | Dark Subtle BG / Border | Light Solid | Light Subtle BG / Border | Usage |
|---|---|---|---|---|---|
| `accent-donor` | `#2DD4BF` | `rgba(45,212,191,0.14)` / `0.28` | `#0F766E` | `rgba(15,118,110,0.08)` / `0.22` | Donor dashboard dot, hero gradient tint, tab indicator |
| `accent-hospital` | `#60A5FA` | `rgba(96,165,250,0.14)` / `0.28` | `#1D6FD6` | `rgba(29,111,214,0.08)` / `0.22` | Hospital command center dot, hero tint, tab indicator |
| `accent-admin` | `#A78BFA` | `rgba(167,139,250,0.14)` / `0.28` | `#6D28D9` | `rgba(109,40,217,0.08)` / `0.22` | Admin governance center dot, hero tint, tab indicator |

### 2.3 Urgency Scale

Every urgency chip renders its solid color on its subtle background with a border, paired with an explicit icon and capitalized text label:

| Level | Dark Color | Light Color | Icon | Text Label |
|---|---|---|---|---|
| `urgency-critical` | `#E5484D` | `#C8102E` | `AlertCircle` | `Critical` |
| `urgency-high` | `#FB923C` | `#B45309` | `ArrowUp` | `High` |
| `urgency-medium` | `#FBBF24` | `#9A5B00` | `Minus` | `Medium` |
| `urgency-low` | `#7DD3FC` | `#0369A1` | `ArrowDown` | `Low` |

### 2.4 Blood Group Family Hues (ABO System)

All blood group chips display explicit text (e.g., `O+`, `AB-`) and are grouped by ABO family:
- **Rh+ (Positive)**: Solid subtle background fill + border from family hue.
- **Rh- (Negative)**: Outlined (transparent background + solid family border & text).

| ABO Family | Blood Types | Dark Solid / Subtle | Light Solid / Subtle | Fill Style |
|---|---|---|---|---|
| `abo-o` | O+, O- | `#2DD4BF` / `0.14` | `#0F766E` / `0.08` | O+ subtle fill, O- outlined |
| `abo-a` | A+, A- | `#60A5FA` / `0.14` | `#1D6FD6` / `0.08` | A+ subtle fill, A- outlined |
| `abo-b` | B+, B- | `#A78BFA` / `0.14` | `#6D28D9` / `0.08` | B+ subtle fill, B- outlined |
| `abo-ab` | AB+, AB- | `#FBBF24` / `0.14` | `#9A5B00` / `0.08` | AB+ subtle fill, AB- outlined |

### 2.5 Inventory Stock Levels

Hospital blood inventory displays enforce standardized semantic thresholds:
- `0 units`: **Critical Deficit** (`urgency-critical` / label: `0 units Critical`)
- `1-3 units`: **Low Stock Warning** (`urgency-medium` / label: `N units Low`)
- `4+ units`: **Adequate Reserve** (`success` / label: `N units In Stock` / `N units Adequate`)

---

## 3. Atmospheric Ground & Spatial Elevations

### 3.1 Hero Cards & Gradient Tint
- Hero banners on Donor, Hospital, and Admin dashboards apply a subtle gradient (`hero-donor`, `hero-hospital`, `hero-admin`):
  `linear-gradient(135deg, var(--surface) 0%, var(--surface) 55%, var(--accent-*-subtle) 100%)`.
- Ordinary cards remain neutral with no gradients (`border-hairline`).

### 3.2 Stat Cards
- Value number remains `text-primary` always.
- Only the icon tile is tinted according to the metric category (`info`, `success`, `violet`, `warning`, `critical`).
- Card border is strictly `border-hairline` (no colored top borders).

---

## 4. Charts & Recharts Integration (`useChartTheme`)

Charts consume the 6-color purposeful series in exact order. Light-mode values are deepened to guarantee $\ge 3:1$ non-text contrast against the white `#FFFFFF` surface:

| Series Index | Dark Hue | Light Hue | Purpose / Category | Contrast (vs Surface) |
|---|---|---|---|---|
| **1** | `#60A5FA` | `#1D6FD6` | Primary volume / donations | $6.86:1$ Dark / $4.89:1$ Light |
| **2** | `#34D399` | `#059669` | Fulfillment / completed | $9.38:1$ Dark / $3.75:1$ Light |
| **3** | `#FBBF24` | `#B45309` | Pledges / pending review | $9.91:1$ Dark / $5.02:1$ Light |
| **4** | `#A78BFA` | `#6D28D9` | Verified institutions / admin | $6.23:1$ Dark / $7.12:1$ Light |
| **5** | `#F472B6` | `#BE185D` | Distribution secondary | $5.86:1$ Dark / $6.01:1$ Light |
| **6** | `#94A3B8` | `#475569` | Baseline / neutral demands | $6.63:1$ Dark / $7.56:1$ Light |

> [!IMPORTANT]
> Crimson (`#E5484D` / `#C8102E`) is strictly reserved for critical shortage data or emergency deficits and never appears in standard data series.
