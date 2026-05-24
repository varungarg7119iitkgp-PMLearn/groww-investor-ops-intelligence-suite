# UI/UX Requirements Document — Investor Ops & Intelligence Suite

## 1. Introduction

This document defines the complete UI/UX requirements for the Investor Ops & Intelligence Suite capstone project. It translates the product requirements into pixel-level specifications for every visual element, interaction pattern, animation, component state, and responsive behavior.

**Design System:** "Stark-Glass HUD" (Holographic, Tactical, Dark Mode)
**Design Philosophy:** Immersive, high-trust, cinematic. The interface feels like a physical, illuminated piece of glass hovering in a dark room. Every element serves the dual-mode interaction model — the UI is a visual companion to both voice-first and text-based interactions.

**Parent Document:** `requirements.md`
**Source References:** M3 Aurora-Glass UI specs, M2 PM Pulsator UI specs, Capstone UI/UX Specs draft

---

## 2. Global Design Tokens

### 2.1 The Canvas (Background Layers)

| Layer | Property | Value | Notes |
|---|---|---|---|
| Base Plate | Background Color | `#030508` | Vanta Black — the dark workshop |
| Aurora Orb 1 | Color | `#7C3AED` (Deep Violet) | Top-left position, 40vw |
| Aurora Orb 1 | Opacity / Blur | 15% / 140px Gaussian | Ambient atmosphere |
| Aurora Orb 2 | Color | `#10B981` (Emerald) | Bottom-right position, 50vw |
| Aurora Orb 2 | Opacity / Blur | 12% / 160px Gaussian | Ambient atmosphere |
| Grid Overlay | Type | SVG schematic grid lines | rgba(0, 229, 255, 0.05) |
| Noise Texture | Type | Fixed SVG noise/grain | 15% opacity, blend: overlay |

### 2.2 Color Palette

| Token | Hex Value | CSS Variable | Role |
|---|---|---|---|
| Base Void | `#030508` | `--void-bg` | Main page background |
| Arc Cyan | `#00E5FF` | `--color-investor` | Investor active states, AI Orb, borders |
| Tactical Amber | `#FFAB00` | `--color-ops` | Ops active states, alerts, top themes |
| Emerald | `#00E676` | `--color-success` | Success, Authorized actions, Positive ticker |
| Crimson | `#FF1744` | `--color-error` | Rejected actions, Refusals, Negative ticker |
| Glass Panel BG | `rgba(10, 15, 30, 0.4)` | `--glass-bg` | Card backgrounds |
| Glass Border | `rgba(0, 229, 255, 0.15)` | `--glass-border` | Panel borders |
| Text Primary | `#FFFFFF` | `--text-main` | Headings, primary content |
| Text Secondary | `#8A9BB2` | `--text-muted` | Body text, descriptions, timestamps |
| Text Disabled | `#52525B` | `--text-disabled` | Disabled controls |

### 2.3 Typography System

#### Font Families

| Role | Primary Font | Fallback | Usage |
|---|---|---|---|
| Display & UI Labels | Inter Tight / SF Pro Display | sans-serif | Page titles, section headers, button labels |
| Body & Reading | Inter | sans-serif | Chat messages, Weekly Pulse text, descriptions |
| Data & Codes | JetBrains Mono / Space Mono | monospace | NAV values, booking codes, timestamps, terminal input |

#### Type Scale

| Element | Font | Size | Weight | Tracking | Color |
|---|---|---|---|---|---|
| H1 (Mode Labels) | Display | 32px | 600 | -0.02em | `--text-main` |
| H2 (Section Headers) | Display | 18px | 500 | 0.05em (UPPERCASE) | `--text-muted` |
| Body (Chat/Pulse) | Body | 16px | 400 | normal | `--text-muted` |
| Large Data (NAV) | Mono | 48px | 700 | normal | Contextual (emerald/crimson) |
| Small Data (Ticker) | Mono | 13px | 500 | normal | Contextual |
| Button Labels | Display | 14px | 500 | 0.02em | `--text-main` |
| Booking Code | Mono | 20px | 700 | 0.1em | `--color-investor` |
| Word Count | Mono | 12px | 400 | normal | `--text-muted` |

### 2.4 CSS Custom Properties

```css
:root {
  /* Background */
  --void-bg: #030508;
  --glass-bg: rgba(10, 15, 30, 0.4);
  --glass-border: rgba(0, 229, 255, 0.15);
  --glass-blur: 24px;
  --glass-radius: 20px;
  --glass-shadow: 0 12px 40px -12px rgba(0, 0, 0, 0.5);
  --glass-inner-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);

  /* Accent Colors */
  --color-investor: #00E5FF;
  --color-ops: #FFAB00;
  --color-success: #00E676;
  --color-error: #FF1744;

  /* Glows */
  --glow-cyan: 0 0 15px rgba(0, 229, 255, 0.4);
  --glow-amber: 0 0 15px rgba(255, 171, 0, 0.4);

  /* Text */
  --text-main: #FFFFFF;
  --text-muted: #8A9BB2;
  --text-disabled: #52525B;

  /* Typography */
  --font-hud: 'JetBrains Mono', 'Space Mono', monospace;
  --font-display: 'Inter Tight', 'SF Pro Display', sans-serif;
  --font-body: 'Inter', sans-serif;

  /* Motion */
  --ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
  --duration-hover: 200ms;
  --duration-panel: 400ms;
  --duration-transition: 400ms;
  --duration-entrance: 600ms;

  /* Layout */
  --ticker-height: 40px;
  --gap: 24px;
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 20px;
}
```

---

## 3. Component Architecture

### 3.1 Material Physics

The design blends **Glassmorphism** (for containers/panels) with **Neumorphism** (for interactive controls/buttons).

#### Glass Panel — Primary Container

Every card, panel, and container uses this treatment:

| Property | Value |
|---|---|
| Background Fill | `rgba(10, 15, 30, 0.4)` |
| Backdrop Blur | `blur(24px)` |
| Border | `1px solid rgba(0, 229, 255, 0.15)` |
| Outer Shadow | `0 12px 40px -12px rgba(0, 0, 0, 0.5)` |
| Inner Shadow | `inset 0 1px 0 rgba(255, 255, 255, 0.05)` |
| Border Radius | `20px` |
| Hover State | Border brightens to `rgba(0, 229, 255, 0.25)` over 200ms |

#### Neumorphic Button — Interactive Controls

| Property | Raised State | Pressed State |
|---|---|---|
| Background | `rgba(20, 25, 40, 0.6)` | `rgba(10, 15, 25, 0.8)` |
| Box Shadow (outer) | `4px 4px 12px rgba(0,0,0,0.4), -2px -2px 8px rgba(255,255,255,0.03)` | `inset 2px 2px 6px rgba(0,0,0,0.4)` |
| Transform | `scale(1)` | `scale(0.97)` |
| Transition | `150ms ease-out` | `150ms ease-out` |
| Border | `1px solid rgba(255,255,255,0.06)` | `1px solid rgba(255,255,255,0.04)` |

---

## 4. Global Navigation — Mode Switcher

### 4.1 Specifications

| Property | Value |
|---|---|
| Position | Fixed top-center, z-index 50 |
| Width | 420px (desktop), 90vw (mobile) |
| Height | 52px |
| Background | Neumorphic raised state |
| Active Indicator | Sliding pill with mode-specific glow |
| Labels | "INVESTOR TERMINAL" (left) / "DIRECTOR OPS" (right) |
| Label Font | Display, 13px, 600 weight, 0.08em tracking, UPPERCASE |
| Active Label Color | Mode accent (Cyan or Amber) |
| Inactive Label Color | `--text-disabled` |

### 4.2 Interaction States

| State | Visual |
|---|---|
| Investor Active | Left pill glows Arc Cyan, right label dimmed |
| Ops Active | Right pill glows Tactical Amber, left label dimmed |
| Hover (inactive side) | Label brightens to `--text-muted` |
| Transition | 400ms scanning-line sweep + pill slide |

### 4.3 Transition Animation

1. User clicks inactive mode label
2. Scanning_Line (1px height, full width, white→cyan/amber gradient) sweeps left-to-right over 400ms
3. Current mode content fades out (opacity 0, y: -10px, 200ms)
4. Pill indicator slides to new position (spring: stiffness 400, damping 30)
5. Background aurora orbs shift color temperature (cyan ambient → amber ambient or vice versa)
6. New mode content fades in (opacity 1, y: 0, spring entrance)

---

## 5. Investor Terminal Mode Layout

### 5.1 Layout Grid

```
┌─────────────────────────────────────────────────────────────┐
│  Mode_Switcher (fixed, top-center, z-50)                     │
├─────────────────────────────────────────────────────────────┤
│  Marquee_Ticker (40px height, full width, scrolling)         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│         ┌─────────────────────────────────┐                 │
│         │   AI_Orb (200px × 200px)        │                 │
│         │   [Amber HUD brackets when      │                 │
│         │    theme context active]         │                 │
│         └─────────────────────────────────┘                 │
│                                                             │
│         ┌─────────────────────────────────┐                 │
│         │   Smart_Sync Chat Terminal      │                 │
│         │   (Glass Panel, max-w-3xl)      │                 │
│         │   - Typewriter responses        │                 │
│         │   - 6-bullet glass box          │                 │
│         │   - Citation pill-tags          │                 │
│         │   - Compliance footer           │                 │
│         └─────────────────────────────────┘                 │
│                                                             │
│         ┌─────────────────────────────────┐                 │
│         │   Input Bar (text + mic toggle) │                 │
│         └─────────────────────────────────┘                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Marquee Ticker

| Property | Value |
|---|---|
| Height | 40px |
| Background | `rgba(0, 0, 0, 0.6)` with bottom border `rgba(0, 229, 255, 0.1)` |
| Font | Mono, 13px, 500 weight |
| Animation | CSS `translateX` keyframe, continuous right-to-left, seamless loop |
| Item Spacing | 48px between fund entries |
| Positive Color | `--color-success` (#00E676) with ▲ arrow |
| Negative Color | `--color-error` (#FF1744) with ▼ arrow |
| Click Behavior | Pre-fills Smart_Sync query: "Show key stats for [Fund Name]" |
| Visibility | Investor_Terminal mode only |

### 5.3 AI Orb (Voice Agent Visualizer)

#### Dimensions & Position

| Property | Value |
|---|---|
| Orb Core Size | 200px × 200px |
| SVG Canvas Width | `size + 2 × (size × 0.58)` — wider to accommodate horizontal voice wave |
| Position | Centered horizontally, 120px below ticker |
| Container | No Glass Panel — floats directly on aurora background |

#### Visual States

| State | Core Visual | Outer Ring | HUD Brackets | Trigger |
|---|---|---|---|---|
| **Idle** | Slowly breathing cyan gradient sphere (3s), plasma ripples at low opacity | Dashed rotating orbit ring | Amber brackets if theme context active | App loaded, no conversation |
| **Listening** | Cyan core brightens 22% | Waveform ring reacting to mic volume + voice wave bars at high opacity | Maintained | User speaking (mic active) |
| **Thinking** | Core dims 20%, plasma ripples dampened | Scanner arc orbiting rapidly with light trail | Maintained | STT complete, awaiting Gemini |
| **Speaking** | Cyan gradient pulses 90%-110% scale synced to TTS audio | Radial waveform ring + voice wave bars active | Maintained | ElevenLabs TTS playing |

#### [NEW] Plasma Ripple Rings

5 staggered expanding concentric rings that radiate outward from the orb surface, creating a fluid, plasmatic effect:

| Property | Value |
|---|---|
| Ring count | 5 (staggered at 0, 0.48, 0.96, 1.44, 1.92s delays) |
| Start radius | `orbRadius × 1.03–1.07` (close to orb surface) |
| End radius | `orbRadius × 1.95–2.15` (fade out before reaching voice wave) |
| Duration | 2.4s per ring, `ease: easeOut`, repeat infinite |
| Stroke widths | 0.7px–1.4px (varied for organic look) |
| Opacity | 0.30–0.55 → 0 (fade as they expand) |
| Color | `--color-investor` (#00E5FF) |
| Thinking state | Opacity multiplied by 0.3 (inward focus) |
| Inner micro-ring | Fast-pulsing (2.8s) ring at `orbRadius × 1.02`–`1.08` for surface plasma |

#### [NEW] Horizontal Voice Wave

Symmetric vertical bars extending left and right of the orb, providing voice context even when idle:

| Property | Value |
|---|---|
| Bars per side | 13 |
| Bar width | 3px, rounded caps (rx: 1.5) |
| Bar pitch | 8px center-to-center |
| Gap from orb edge | 20px |
| Height envelope | Gaussian decay — tallest bar nearest orb, tapering to minimum at outer edge |
| Idle max height | 18px, opacity 25% |
| Active max height | 36px (scales with `audioLevel × 1.2`), opacity 65% |
| Animation | Each bar pulses up/down with staggered delay (6ms per bar), `easeInOut` |
| Idle speed | 1.8s cycle |
| Active speed | 0.5s cycle (faster when listening/speaking) |
| Color | `--color-investor` (#00E5FF) |
| Thinking state | Opacity reduced to 8% (internal processing look) |

#### [NEW] Groww Logo Shadow (Watermark)

A dual-tone Groww mountain-chart wave watermarked inside the sphere, establishing brand identity:

| Property | Value |
|---|---|
| Shape | The Groww "mountain chart" wave silhouette (two peaks, right peak higher) |
| Upper fill | `rgba(90, 100, 220, 0.10)` — blue/purple tint above the wave |
| Lower fill | `rgba(0, 229, 255, 0.12)` — teal tint below the wave (growth area) |
| Wave outline | `rgba(0, 229, 255, 0.22)` stroke, 1.5px, rounded |
| Clip boundary | Clipped exactly to the orb circle (no overflow) |
| Rendering layer | Inside the core sphere, below the inner glass highlight |
| Purpose | Grounds orb as Groww-native investment intelligence tool |

#### Theme-Aware HUD Brackets

When `sharedState.topTheme` is populated:
- Four amber corner brackets appear around the orb (L-shaped, 20px arms)
- Monospace text readout appears below orb: `> CONTEXT: [THEME_NAME]`
- Text color: `--color-ops` (#FFAB00)
- Font: Mono, 11px, 400 weight, UPPERCASE

#### State Transitions

- All core transitions use `cubic-bezier(0.16, 1, 0.3, 1)` over 400ms
- No instant snapping between states
- Waveform ring fades in/out over 200ms
- Scanner line fades in with 100ms delay after waveform fades
- Plasma ripples: continuous — opacity multiplier adjusts per state
- Voice wave bars: always rendered; opacity/speed adjust per state

### 5.4 Smart-Sync Chat Terminal

#### Container

| Property | Value |
|---|---|
| Max Width | `max-w-3xl` (768px) |
| Position | Below AI Orb, centered |
| Background | Glass Panel treatment |
| Max Height | `60vh` with overflow-y scroll |
| Scroll Behavior | Smooth auto-scroll to bottom on new messages |

#### Message Rendering

| Element | Style |
|---|---|
| Agent Messages | Left cyan border (3px), typewriter fade-in (15ms/char stagger) |
| User Messages | Right-aligned, white text, no border, instant render |
| System Messages | Centered, `--text-disabled`, italic, 12px |
| Timestamp | Mono, 11px, `--text-muted`, right-aligned per message |

#### 6-Bullet Response Box

When Smart_Sync_KB returns a structured response:
- Renders inside a nested Glass Panel (slightly lighter: `rgba(15, 20, 35, 0.5)`)
- Each bullet prefixed with cyan dot (●)
- Bullets appear sequentially with 100ms delay between each
- Each bullet has its own typewriter animation

#### Citation Tags

| Property | Value |
|---|---|
| Shape | Pill (border-radius: 999px) |
| Background | `rgba(0, 229, 255, 0.1)` |
| Border | `1px solid rgba(0, 229, 255, 0.3)` |
| Font | Mono, 10px, 500 weight, UPPERCASE |
| Text Color | `--color-investor` |
| Hover | Background brightens, glow-cyan shadow appears |
| Click | Opens source URL in new tab |
| Position | Below the bullet they reference |

#### Input Bar

| Property | Value |
|---|---|
| Position | Fixed bottom of chat area |
| Background | Glass Panel (darker variant) |
| Height | 52px |
| Border Radius | 26px (pill shape) |
| Placeholder | "Ask about any of the 20 mutual funds..." (Mono, 13px) |
| Mic Toggle | Right side, circular button (36px), cyan glow when active |
| Send Button | Right side (when text present), arrow icon, neumorphic |
| Compliance Footer | Below input: "This is informational and not investment advice." (11px, `--text-disabled`) |

---

## 6. Director Ops Mode Layout

### 6.1 Layout Grid

```
┌─────────────────────────────────────────────────────────────┐
│  Mode_Switcher (fixed, top-center, z-50)                     │
├──────────────────────────┬──────────────────────────────────┤
│                          │                                  │
│  Weekly_Pulse Briefing   │  HITL_Approval_Center            │
│  (Left Column, 45%)     │  (Right Column, 55%)             │
│                          │                                  │
│  ┌────────────────────┐  │  ┌────────────────────────────┐  │
│  │ > WEEKLY PULSE     │  │  │ > PENDING AUTHORIZATIONS   │  │
│  │   ASSESSMENT       │  │  │                            │  │
│  │                    │  │  │  ┌──────────────────────┐  │  │
│  │ [Amber Theme Box]  │  │  │  │ Approval Card #1     │  │  │
│  │ [Theme 2]          │  │  │  │ BOOKING: NL-X7K2     │  │  │
│  │ [Theme 3]          │  │  │  │ CALENDAR: Date/Time  │  │  │
│  │                    │  │  │  │ EMAIL DRAFT: ...      │  │  │
│  │ "Quote 1"          │  │  │  │ [MARKET CONTEXT]     │  │  │
│  │ "Quote 2"          │  │  │  │                      │  │  │
│  │ "Quote 3"          │  │  │  │ [AUTHORIZE][OVERRIDE]│  │  │
│  │                    │  │  │  └──────────────────────┘  │  │
│  │ ☐ Action Idea 1    │  │  │                            │  │
│  │ ☐ Action Idea 2    │  │  │  ┌──────────────────────┐  │  │
│  │ ☐ Action Idea 3    │  │  │  │ Approval Card #2     │  │  │
│  │                    │  │  │  └──────────────────────┘  │  │
│  │ Words: 242/250     │  │  │                            │  │
│  └────────────────────┘  │  └────────────────────────────┘  │
│                          │                                  │
│  [CSV Upload Zone]       │                                  │
│  [Generate Pulse Button] │                                  │
│                          │                                  │
└──────────────────────────┴──────────────────────────────────┘
```

### 6.2 Weekly Pulse Panel (Left Column)

#### Header

| Property | Value |
|---|---|
| Text | `> WEEKLY PULSE ASSESSMENT` |
| Font | Mono, 14px, 600 weight, UPPERCASE |
| Color | `--color-ops` (#FFAB00) |
| Decoration | Left amber border (3px) |

#### Theme Blocks

| Property | Value |
|---|---|
| Container | Glass Panel with amber-tinted border (`rgba(255, 171, 0, 0.2)`) |
| Top 3 Themes | Stronger amber glow: `box-shadow: var(--glow-amber)` |
| Themes 4-5 | Standard Glass Panel (no glow) |
| Theme Label | Display font, 14px, 500 weight |
| Review Count Badge | Mono, 11px, amber background pill |

#### Quotes Section

| Property | Value |
|---|---|
| Quote Style | Italic body font, 14px, `--text-muted` |
| Quote Marks | Large amber quotation marks (Display, 24px, `--color-ops`) |
| Container | Left amber border (2px), padding-left 16px |

#### Action Ideas

| Property | Value |
|---|---|
| Style | Checkbox list items |
| Checkbox | Custom amber-styled checkbox (unchecked by default) |
| Text | Body font, 14px, `--text-main` |
| Count | Exactly 3 items always |

#### Word Count Readout

| Property | Value |
|---|---|
| Position | Bottom of pulse panel |
| Format | `Words: XXX/250` |
| Font | Mono, 12px, 400 weight |
| Color | `--text-muted` (turns `--color-error` if >250) |

#### CSV Upload Zone

| Property | Value |
|---|---|
| Style | Dashed border zone (amber dashed border) |
| Text | "Drop CSV file here or click to upload" |
| Accepted | `.csv` files only, max 50MB |
| States | Default → Hover (border solid) → Uploading (progress bar) → Complete (checkmark) |

#### Generate Pulse Button

| Property | Value |
|---|---|
| Style | Neumorphic button, full width of left column |
| Label | "GENERATE WEEKLY PULSE" |
| Color | Amber accent |
| Loading State | Pulsing amber glow, "Analyzing reviews..." text |

### 6.3 HITL Approval Center (Right Column)

#### Header

| Property | Value |
|---|---|
| Text | `> PENDING AUTHORIZATIONS` |
| Font | Mono, 14px, 600 weight, UPPERCASE |
| Color | `--text-main` |
| Badge | Count of pending items (cyan pill) |

#### Approval Card

| Property | Value |
|---|---|
| Container | Glass Panel |
| Status Indicator | Left border: amber (pending), emerald (approved), crimson (rejected) |
| Layout | Vertical stack of sections |

##### Booking Code Section

| Property | Value |
|---|---|
| Label | "BOOKING CODE" (Mono, 10px, `--text-muted`, UPPERCASE) |
| Value | Mono, 20px, 700 weight, `--color-investor`, letter-spacing 0.1em |
| Glow | `text-shadow: 0 0 8px rgba(0, 229, 255, 0.4)` |

##### Calendar Hold Section

| Property | Value |
|---|---|
| Label | "CALENDAR HOLD" (Mono, 10px, `--text-muted`) |
| Date/Time | Mono, 14px, `--text-main` |
| Topic | Display, 13px, amber badge |

##### Email Draft Preview

| Property | Value |
|---|---|
| Container | Nested Glass Panel (scrollable, max-height 200px) |
| Font | Body, 13px, `--text-muted` |
| Editable | Yes — contenteditable with subtle focus ring |

##### Market Context Snippet

| Property | Value |
|---|---|
| Container | `border-left: 2px solid var(--color-ops)`, `background: rgba(255, 171, 0, 0.08)` |
| Label | "MARKET CONTEXT" (Mono, 10px, amber) |
| Content | Body, 13px, `--text-muted` |
| Empty State | "Market context unavailable — generate Weekly Pulse first." (italic) |

##### Action Gate Buttons

| Property | Authorize | Override |
|---|---|---|
| Style | Neumorphic, full width (50% each, side by side) |
| Label | "AUTHORIZE" | "OVERRIDE" |
| Font | Display, 13px, 600 weight, UPPERCASE |
| Idle Color | `--color-success` text | `--color-error` text |
| Click Flash | Full emerald glow (200ms) | Full crimson glow (200ms) |
| Pressed | Neumorphic pressed + scale(0.97) | Neumorphic pressed + scale(0.97) |
| Disabled | `--text-disabled`, no shadow | `--text-disabled`, no shadow |

#### Empty State (No Pending Items)

| Property | Value |
|---|---|
| Icon | Subtle outline icon (clipboard with checkmark) |
| Text | "No pending approvals. Items appear here when bookings are confirmed in Investor Terminal." |
| Font | Body, 14px, `--text-disabled` |
| Position | Centered vertically in right column |

---

## 7. Animation Specifications (Framer Motion)

### 7.1 Panel Entrance (Holographic Slide-Up)

```typescript
export const panelVariant = {
  hidden: { opacity: 0, y: 30, scale: 0.98 },
  visible: {
    opacity: 1, y: 0, scale: 1,
    transition: { type: "spring", stiffness: 300, damping: 25 }
  },
  exit: { opacity: 0, y: 10, transition: { duration: 0.2 } }
};
```

### 7.2 Terminal Typewriter Effect

```typescript
export const sentenceVariant = {
  hidden: { opacity: 1 },
  visible: { opacity: 1, transition: { staggerChildren: 0.015 } }
};
export const letterVariant = {
  hidden: { opacity: 0, y: 5 },
  visible: { opacity: 1, y: 0 }
};
```

### 7.3 Mode Transition Scanning Line

```typescript
export const scanLineVariant = {
  initial: { x: "-100%" },
  animate: {
    x: "100%",
    transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] }
  }
};
```

### 7.4 AI Orb State Transitions

| From → To | Animation |
|---|---|
| Idle → Listening | Core brightens (200ms), waveform ring fades in (200ms) |
| Listening → Thinking | Waveform fades out (150ms), scanner line fades in (100ms delay) |
| Thinking → Speaking | Scanner fades out (150ms), pulse begins (synced to audio) |
| Speaking → Idle | Pulse decays over 300ms, core returns to slow rotation |
| Any → Any | All use `cubic-bezier(0.16, 1, 0.3, 1)`, 400ms total |

### 7.5 Action Gate Button Press

```typescript
export const buttonPressVariant = {
  tap: { scale: 0.97, transition: { duration: 0.15 } }
};
// On authorize: emerald glow flash (box-shadow) for 200ms
// On override: crimson glow flash for 200ms
```

### 7.6 Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
  /* Preserve functional state indicators (orb color changes, status badges) */
}
```

---

## 8. Component Specifications

### 8.1 ModeToggle Component

| Property | Value |
|---|---|
| File | `components/shared/ModeToggle.tsx` |
| Props | `activeMode: 'INVESTOR' | 'DIRECTOR'`, `onToggle: () => void` |
| Accessibility | `role="tablist"`, each side is `role="tab"` with `aria-selected` |
| Keyboard | Arrow keys switch modes, Enter/Space activates |

### 8.2 MarqueeTicker Component

| Property | Value |
|---|---|
| File | `components/shared/MarqueeTicker.tsx` |
| Props | `funds: TickerItem[]`, `onFundClick: (fundName: string) => void` |
| Animation | Pure CSS `@keyframes` for 60fps performance |
| Pause | Pauses on hover (desktop) |
| Accessibility | `aria-label="Financial ticker showing mutual fund NAVs"` |

### 8.3 GlassPanel Component

| Property | Value |
|---|---|
| File | `components/shared/GlassPanel.tsx` |
| Props | `children`, `className?`, `variant?: 'default' | 'dark' | 'amber'` |
| Variants | default (cyan border), dark (dimmer), amber (ops-mode border) |
| Motion | Wraps children in `motion.div` with `panelVariant` |

### 8.4 AIOrb Component

| Property | Value |
|---|---|
| File | `components/investor-terminal/AIOrb.tsx` |
| Props | `state: AgentVisualState`, `audioLevel: number`, `themeContext?: string` |
| Layers | 5 layers: base sphere, gradient core, waveform ring, scanner line, HUD brackets |
| Audio Sync | `audioLevel` (0-1) drives waveform amplitude and speaking pulse scale |

### 8.5 ChatTerminal Component

| Property | Value |
|---|---|
| File | `components/investor-terminal/ChatTerminal.tsx` |
| Props | `messages: ChatMessage[]`, `onSend: (text: string) => void`, `isVoiceActive: boolean` |
| Features | Typewriter animation, 6-bullet rendering, citation tags, auto-scroll |
| Input Modes | Text input (always), mic toggle (when supported) |

### 8.6 CitationTag Component

| Property | Value |
|---|---|
| File | `components/investor-terminal/CitationTag.tsx` |
| Props | `source: string`, `url: string` |
| Interaction | Hover glow, click opens URL in new tab |

### 8.7 PulseBriefing Component

| Property | Value |
|---|---|
| File | `components/director-ops/PulseBriefing.tsx` |
| Props | `pulse: WeeklyPulse | null`, `onGenerate: () => void`, `onUploadCSV: (file: File) => void` |
| States | Empty (upload prompt), Loading (generating), Loaded (full pulse display) |

### 8.8 HitlQueue Component

| Property | Value |
|---|---|
| File | `components/director-ops/HitlQueue.tsx` |
| Props | `items: ApprovalItem[]`, `onAuthorize: (id: string) => void`, `onOverride: (id: string, reason?: string) => void` |
| States | Empty (no items message), Populated (scrollable card list) |
| Sorting | Newest first (by creation timestamp) |

### 8.9 ActionGate Component

| Property | Value |
|---|---|
| File | `components/director-ops/ActionGate.tsx` |
| Props | `onAuthorize: () => void`, `onOverride: () => void`, `disabled?: boolean` |
| Confirmation | Override shows a brief "Are you sure?" inline prompt before executing |

---

## 9. Responsive Behavior

### 9.1 Breakpoints

| Breakpoint | Width | Behavior |
|---|---|---|
| Mobile | ≤640px | Single column, stacked layout, Mode Switcher full-width |
| Tablet | 641px–1024px | Reduced margins, two-column Ops layout compressed |
| Desktop | ≥1025px | Full layout as specified above |

### 9.2 Mobile Adaptations

| Component | Mobile Behavior |
|---|---|
| Mode Switcher | Full width (90vw), smaller labels (11px) |
| Marquee Ticker | Condensed (10px font), faster scroll |
| AI Orb | Reduced to 140px × 140px |
| Chat Terminal | Full width, no max-width constraint |
| Director Ops | Stacked: Pulse on top, HITL below (scrollable) |
| Action Gate | Full width buttons stacked vertically |
| Input Bar | Fixed bottom with safe-area-inset padding |

### 9.3 Touch Optimization

- All interactive elements: minimum 48px × 48px touch target
- Minimum 8px spacing between adjacent interactive elements
- Swipe gestures: none required (all interactions are tap-based)

---

## 10. Accessibility Requirements

### 10.1 Color Contrast

- All text meets WCAG AA (4.5:1 minimum contrast ratio)
- `--text-main` (#FFFFFF) on `--void-bg` (#030508): 19.5:1 ✓
- `--text-muted` (#8A9BB2) on `--void-bg` (#030508): 6.8:1 ✓
- Interactive elements have visible focus indicators (cyan ring)

### 10.2 Keyboard Navigation

- Mode Switcher: Tab-focusable, Arrow keys to switch, Enter to activate
- Chat Input: Auto-focused on mode switch to Investor
- Action Gate: Tab order: Authorize → Override, Enter to activate
- Ticker: Not keyboard-interactive (decorative, data available in chat)

### 10.3 Screen Reader Support

- Mode Switcher: `role="tablist"` with `aria-selected` states
- AI Orb: `aria-live="polite"` region announcing state changes ("Listening", "Processing", "Speaking")
- Chat Terminal: `role="log"` with `aria-live="polite"` for new messages
- Approval Queue: `role="list"` with status announcements on authorize/override

### 10.4 Reduced Motion

- `prefers-reduced-motion: reduce` disables: typewriter effect, scanning line, orb animations, panel springs
- Preserves: color state changes, status badges, content visibility transitions

---

## 11. State Management (Zustand Store Shape)

```typescript
interface UIState {
  // Mode
  activeMode: 'INVESTOR' | 'DIRECTOR';
  isTransitioning: boolean;

  // Investor Terminal
  orbState: 'IDLE' | 'LISTENING' | 'THINKING' | 'SPEAKING';
  audioLevel: number; // 0-1
  chatMessages: ChatMessage[];
  isVoiceActive: boolean;
  isMicAvailable: boolean;

  // Director Ops
  pulseData: WeeklyPulse | null;
  isPulseGenerating: boolean;
  hitlItems: ApprovalItem[];

  // Shared
  topTheme: string | null;
  marketContext: string | null;
  bookingCodes: BookingSummary[];

  // Actions
  toggleMode: () => void;
  setOrbState: (state: AgentVisualState) => void;
  addChatMessage: (msg: ChatMessage) => void;
  addHitlItem: (item: ApprovalItem) => void;
  updateHitlStatus: (id: string, status: 'approved' | 'rejected') => void;
  setPulseData: (pulse: WeeklyPulse) => void;
}
```

---

## 12. File Structure (Frontend)

```
src/
├── app/
│   ├── layout.tsx              # Root: fonts, globals.css, Zustand provider
│   ├── page.tsx                # Single entry point — reads activeMode from store
│   ├── globals.css             # All CSS custom properties
│   └── api/
│       ├── chat/route.ts       # Gemini orchestration + RAG + compliance
│       ├── voice/route.ts      # ElevenLabs TTS/STT proxy
│       ├── pulse/route.ts      # Weekly Pulse generation
│       └── calendar/route.ts   # Google Calendar event creation
│
├── components/
│   ├── shared/
│   │   ├── ModeToggle.tsx
│   │   ├── MarqueeTicker.tsx
│   │   ├── GlassPanel.tsx
│   │   └── ScanningLine.tsx
│   │
│   ├── investor-terminal/
│   │   ├── AIOrb.tsx
│   │   ├── ChatTerminal.tsx
│   │   ├── CitationTag.tsx
│   │   ├── BulletResponse.tsx
│   │   └── InputBar.tsx
│   │
│   └── director-ops/
│       ├── PulseBriefing.tsx
│       ├── ThemeBlock.tsx
│       ├── HitlQueue.tsx
│       ├── ApprovalCard.tsx
│       ├── ActionGate.tsx
│       ├── MarketContextBlock.tsx
│       └── CsvUploader.tsx
│
├── hooks/
│   ├── useVoiceInteraction.ts  # Mic capture, STT/TTS orchestration
│   ├── useConversation.ts      # State machine management
│   ├── useAudioAnalyzer.ts     # Real-time audio level for orb
│   └── usePulseGenerator.ts    # Weekly Pulse generation logic
│
├── lib/
│   ├── store.ts                # Zustand global state
│   ├── animations.ts           # All Framer Motion variants
│   ├── gemini.ts               # Gemini client + function declarations
│   ├── compliance.ts           # PII detection + advice deflection
│   ├── state-machine.ts        # Conversation state transitions
│   └── utils.ts                # tailwind-merge, formatters
│
├── tools/
│   ├── calendar.ts             # Google Calendar Service Account
│   ├── rag-retriever.ts        # TF-IDF chunk retrieval
│   ├── notes-extractor.ts      # Booking code generation
│   └── fee-explainer.ts        # Fee scenario logic
│
├── types/
│   └── index.ts                # All TypeScript interfaces
│
└── styles/
    └── globals.css             # (imported in app/globals.css)
```

---

## 13. Interaction Flows

### 13.1 Smart-Sync Query Flow (Investor Terminal)

```
User types query → Input bar shows text
  → User presses Enter or clicks Send
  → Orb transitions: Idle → Thinking
  → Chat shows "..." typing indicator
  → API returns 6-bullet response with citations
  → Orb transitions: Thinking → Idle
  → Response renders with typewriter effect (15ms/char)
  → Citation tags appear after text completes
  → "Last updated" timestamp appends
```

### 13.2 Voice Interaction Flow (Investor Terminal)

```
User clicks Mic toggle → Mic activates
  → Orb transitions: Idle → Listening
  → Waveform ring reacts to voice input
  → User stops speaking (silence detection)
  → Orb transitions: Listening → Thinking
  → STT converts audio → text appears in chat as user message
  → Gemini processes → response text generated
  → Orb transitions: Thinking → Speaking
  → TTS plays audio, orb pulses with audio
  → Audio completes → Orb transitions: Speaking → Listening (or Idle if session ends)
```

### 13.3 HITL Approval Flow (Director Ops)

```
New booking confirmed in Investor Terminal
  → Approval card appears in HITL queue (slide-up animation)
  → Card shows: Booking Code, Calendar Hold, Email Draft, Market Context
  → Advisor reviews and optionally edits email draft
  → Advisor clicks AUTHORIZE
    → Emerald flash on button
    → Card border transitions to emerald
    → Status badge: "APPROVED"
    → Calendar event created (background)
  OR Advisor clicks OVERRIDE
    → "Are you sure?" inline prompt
    → Advisor confirms → Crimson flash
    → Card border transitions to crimson
    → Status badge: "REJECTED"
    → Optional reason text field appears
```

### 13.4 Weekly Pulse Generation Flow (Director Ops)

```
User uploads CSV (drag-drop or file picker)
  → Upload progress bar (amber)
  → Upload complete → "X reviews imported" toast
  → User clicks "GENERATE WEEKLY PULSE"
  → Button enters loading state (pulsing amber glow)
  → Left column shows skeleton loading state
  → API returns pulse data
  → Themes animate in (staggered, 100ms each)
  → Quotes fade in
  → Action ideas appear
  → Word count readout updates dynamically
  → "Pulse generated successfully" toast
```

---

## 14. Error & Empty States

### 14.1 Error Toast Pattern

| Property | Value |
|---|---|
| Position | Top-right, z-index 100 |
| Background | Glass Panel with crimson left border |
| Duration | 5 seconds, dismissible |
| Animation | Slide in from right, fade out |

### 14.2 Empty States

| Context | Visual |
|---|---|
| No chat history | Welcome message: "Ask me about any of the 20 mutual funds in my dataset." with 3 example query chips |
| No pulse generated | Upload prompt + generate button (see §6.2) |
| No HITL items | Centered message with clipboard icon (see §6.3) |
| Voice unavailable | Text input with note: "Voice unavailable. Type your questions below." |

### 14.3 Loading States

| Context | Visual |
|---|---|
| Chat response loading | Orb in Thinking state + "..." indicator in chat |
| Pulse generating | Skeleton blocks (amber-tinted) pulsing in left column |
| HITL action processing | Button disabled + spinner icon |
| Ticker loading | Shimmer animation across ticker bar |

---

## 15. Design Acceptance Criteria Summary

1. THE application SHALL render on a `#030508` base with aurora orbs and noise texture overlay.
2. THE Mode_Switcher SHALL be the only navigation element, positioned top-center.
3. ALL containers SHALL use the Glass Panel treatment (blur, border, shadow as specified).
4. ALL interactive buttons SHALL use Neumorphic raised/pressed states.
5. THE AI_Orb SHALL display 4 distinct visual states with smooth 400ms transitions.
6. THE chat terminal SHALL render responses with typewriter effect at 15ms/character.
7. THE Director_Ops layout SHALL split into two columns (Pulse left, HITL right).
8. THE Action_Gate buttons SHALL flash their respective colors (emerald/crimson) on activation.
9. ALL animations SHALL respect `prefers-reduced-motion`.
10. THE Marquee_Ticker SHALL scroll continuously at 60fps using CSS animation.
11. ALL text SHALL meet WCAG AA contrast requirements.
12. THE application SHALL be responsive across mobile (≤640px), tablet, and desktop breakpoints.
13. **(Phase 16)** THE Director_Ops background SHALL swap the violet/emerald aurora orbs for the `TacticalHUDMap` component when the UI is fully structured, rendering an India-silhouette constellation background with animated data arcs.

---

## 16. Director Ops — Tactical HUD Map Background Enhancement (Phase 16)

> **Inspiration:** Palantir Gotham ([palantir.com/platforms/gotham](https://www.palantir.com/platforms/gotham)) features a cinematic "Background of Earth" aesthetic — a satellite-perspective globe with data overlay lines, glowing city nodes, and tactical coordinate grids. This section specifies how that spirit is adapted for the capstone's **Director Ops** mode without copying Palantir's defense context. Our version is India-centric, financially themed, and built entirely in SVG + CSS + Framer Motion.
>
> **When to implement:** After Phase 14 (Full Integration & System Polish). The UI structure must be complete and stable before adding this visual layer. **Do not implement before Phase 14.**

---

### 16.1 Design Intent

The Director Ops view is the "command centre" for Product Managers and Advisors. It should feel like a **tactical intelligence dashboard** — data-rich, confident, and atmospheric. The Palantir Gotham-inspired background achieves this by:

- Replacing the Investor Terminal's violet/emerald aurora orbs with a **schematic India financial map**
- Showing real-time animated data arcs between major Indian financial hubs
- Maintaining the existing `#030508` base, SVG grid, and noise texture layers (unchanged)
- Using **Tactical Amber** (`#FFAB00`) as the primary map colour to visually distinguish Director Ops from the cyan-dominant Investor Terminal

The effect must be **atmospheric and non-intrusive** — glass panels and content sit clearly above the map. The map is a mood layer, not a data-bearing element.

---

### 16.2 `TacticalHUDMap` Component Specification

**File:** `src/components/director/TacticalHUDMap.tsx`

**Position:** Fixed, `inset-0`, `z-index: 1` (above `AuroraMesh` base layer, below all Glass Panels)

**Visibility:** Rendered only when `appMode === 'director'` — wrapped in `AnimatePresence` with a 1200ms fade-in on mode transition.

#### Layer Stack (Director Ops Background)

| Layer | Z-Index | Description |
|---|---|---|
| Base Plate | 0 | `#030508` Vanta Black (unchanged) |
| **India Geo Silhouette** | 1 | Faint amber SVG outline of the Indian subcontinent |
| **Coordinate Grid** | 2 | Schematic lat/lon grid lines over the silhouette |
| **City Nodes** | 3 | Pulsing amber dots at 6 financial hub cities |
| **Data Arc Connections** | 4 | Animated curved SVG paths between city nodes |
| Noise Texture | 5 | `public/noise-texture.svg` at 15% opacity (unchanged) |
| Glass Panels & UI | 10+ | All existing content layers |

#### 16.2.1 India Geo Silhouette

| Property | Value |
|---|---|
| Source | Simplified SVG path of India's outline (no state borders — single shape) |
| Colour | `rgba(255, 171, 0, 0.04)` fill, `rgba(255, 171, 0, 0.12)` stroke |
| Stroke Width | `0.5px` |
| Position | Centered horizontally, vertically offset 10% from top |
| Size | 65vw max-width, maintain aspect ratio |
| Entrance Animation | `opacity: 0 → 0.04` over 2000ms, ease-out-expo, `delay: 600ms` |

#### 16.2.2 Coordinate Grid Overlay

| Property | Value |
|---|---|
| Type | SVG `<line>` elements — 6 horizontal + 8 vertical schematic lines |
| Clip Region | Clipped to India silhouette bounding box ± 10% padding |
| Colour | `rgba(255, 171, 0, 0.06)` |
| Stroke Width | `0.5px`, `stroke-dasharray: 4 8` |
| Animation | None (static, appears with silhouette entrance) |

#### 16.2.3 Financial Hub City Nodes

Six pulsing nodes representing major Indian financial centres:

| City | Role in Platform |
|---|---|
| Mumbai | Primary — BSE/NSE hub, most fund managers |
| Delhi | Secondary — regulatory bodies, top fund houses |
| Bangalore | Tech + growth funds, investor base |
| Chennai | South India financial hub |
| Hyderabad | Emerging tech-finance corridor |
| Kolkata | Legacy capital markets hub |

**Node Visual Specification:**

| Property | Value |
|---|---|
| Shape | Two concentric circles: inner `r=3px` solid, outer `r=7px` stroke |
| Inner Colour | `#FFAB00` at 90% opacity |
| Outer Stroke | `#FFAB00` at 35% opacity, `stroke-width: 1px` |
| Pulse Animation | Outer circle `r: 7 → 14`, `opacity: 0.35 → 0`, 2.4s loop, staggered by city index × 300ms |
| Label | City name in JetBrains Mono, 9px, `#FFAB00` at 50% opacity, 10px above node |

**Node Positioning:** Use percentage-based SVG coordinates mapped to the India silhouette bounding box. Exact coordinates to be calibrated during implementation against the chosen SVG map asset.

#### 16.2.4 Data Arc Connections

Animated curved SVG paths connecting city nodes, representing financial data flows:

| Property | Value |
|---|---|
| Path Type | Quadratic Bézier curves (`<path d="M...Q...">`) |
| Stroke Colour | `rgba(255, 171, 0, 0.2)` base; brightest arc is `rgba(255, 171, 0, 0.45)` |
| Stroke Width | `0.8px` |
| Animation | `stroke-dashoffset` travelling the full path length, 3-5s loop per arc |
| Active Arc Count | 4 arcs active simultaneously; a 5th arc fades in as one completes |
| Arc Selection | Rotate through a predefined set of 9 city-pair combinations |

**Primary arc pairs (ordered by visual impact):**
1. Mumbai ↔ Delhi
2. Mumbai ↔ Bangalore
3. Delhi ↔ Hyderabad
4. Bangalore ↔ Chennai
5. Mumbai ↔ Kolkata
6. Delhi ↔ Bangalore
7. Chennai ↔ Hyderabad
8. Mumbai ↔ Hyderabad
9. Kolkata ↔ Delhi

#### 16.2.5 `prefersReducedMotion` Handling

When `prefers-reduced-motion: reduce`:
- Node pulse animations: **disabled** (show inner dot only, static)
- Data arcs: **hidden entirely** (only silhouette + grid + static nodes shown)
- Silhouette entrance: **no fade, appears immediately at target opacity**

---

### 16.3 Mode Transition Behaviour

When the user switches from Investor Terminal → Director Ops:

1. `ScanningLine` sweep fires (400ms amber, Phase 3 component, existing)
2. Aurora orbs (violet/emerald) fade out: `opacity 0.4s ease-out`
3. `TacticalHUDMap` fades in: `opacity 0 → 1, 1200ms ease-out-expo, delay 200ms`
4. City nodes appear staggered: 60ms per city (total 360ms entrance)
5. Data arcs begin animating after nodes are visible (delay 600ms)

When Director Ops → Investor Terminal:
- `TacticalHUDMap` fades out: `opacity 1 → 0, 600ms ease-in`
- Aurora orbs restore: `opacity 0 → target, 800ms ease-out, delay 200ms`

**Total mode-switch visual duration:** ≤1.8s (within the existing 2s ScanningLine cycle)

---

### 16.4 Integration with Existing Design System

The `TacticalHUDMap` must coexist cleanly with the existing Phase 3 `AuroraMesh` component:

- `AuroraMesh` continues to render in both modes — it provides the base, grid, and noise layers
- In Director Ops mode, `TacticalHUDMap` is inserted **between** the AuroraMesh noise layer and the Glass Panels
- The violet (`#7C3AED`) and emerald (`#10B981`) aurora orbs within `AuroraMesh` should accept a `hideOrbs` prop (added in Phase 16) that suppresses them when Director Ops is active
- No changes to `globals.css` design tokens — this component uses only existing `--color-ops` (`#FFAB00`) tokens

---

### 16.5 SVG Asset Requirements

| Asset | Path | Notes |
|---|---|---|
| India map outline SVG | `public/india-map-outline.svg` | Simplified single-path polygon, no state lines, optimised for web (< 5KB) |
| Source recommendation | [Natural Earth Data](https://www.naturalearthdata.com/) or `simplemaps.com` | 1:10m scale, simplified with `mapshaper`, exported as single SVG path |

The SVG path coordinates will be normalised to a `0 0 1000 1200` viewBox for consistent scaling across breakpoints.

---

### 16.6 Responsive Behaviour

| Breakpoint | TacticalHUDMap Treatment |
|---|---|
| Desktop (≥1280px) | Full map + all 6 nodes + 4 active arcs |
| Tablet (768–1279px) | Map at 85vw + all 6 nodes + 3 active arcs |
| Mobile (≤640px) | Map hidden; Director Ops falls back to standard aurora orbs tinted amber |

---

### 16.7 Design Token Additions (Phase 16)

The following CSS custom properties will be added to `globals.css` during Phase 16:

```css
/* Tactical HUD Map — Director Ops Enhancement */
--map-silhouette-fill: rgba(255, 171, 0, 0.04);
--map-silhouette-stroke: rgba(255, 171, 0, 0.12);
--map-grid-line: rgba(255, 171, 0, 0.06);
--map-node-primary: rgba(255, 171, 0, 0.90);
--map-node-pulse: rgba(255, 171, 0, 0.35);
--map-arc-base: rgba(255, 171, 0, 0.20);
--map-arc-active: rgba(255, 171, 0, 0.45);
--map-entrance-duration: 1200ms;
```

---

### 16.8 Component API

```typescript
interface TacticalHUDMapProps {
  visible: boolean;           // controlled by appMode === 'director'
  className?: string;
}
```

Internal state managed via `useReducedMotion()` hook and `useEffect` for arc cycling.

---

### 16.9 AI Eval Gate (Phase 16)

| Eval Dimension | Pass Criterion |
|---|---|
| Visual Hierarchy | Glass panels remain clearly legible above the map at all brightness levels |
| Motion Performance | 60fps maintained with all arcs active (Chrome DevTools Performance tab) |
| Mode Distinction | User study: ≥90% of testers identify Director Ops mode immediately without reading labels |
| Accessibility | Map passes as decorative (`aria-hidden="true"`) — zero screen reader impact |
| Bundle Impact | `TacticalHUDMap` component ≤ 8KB gzipped including inline SVG path |
