# Johnny App — Design System

Extracted from [johnny-site.vercel.app](https://johnny-site.vercel.app) on 2026-04-02.
Stack: Next.js + Tailwind CSS v4. Fonts served via next/font.

---

## Fonts

| Role     | Family  | Variable CSS token     |
|----------|---------|------------------------|
| Body / UI | Inter  | `--font-sans: var(--font-inter)` |
| Display / Headings | Outfit | `--font-display: var(--font-outfit)` |
| Mono     | System mono stack | `--font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace` |

Both Inter and Outfit are loaded as variable fonts (weights 100–900), with full Latin, Latin Extended, Greek, Cyrillic, Vietnamese subsets for Inter.

---

## Color Palette

### Brand

| Token | Hex | Usage |
|-------|-----|-------|
| `--color-primary` | `#e11d48` | Primary actions, CTAs, highlights |
| `--color-charcoal` | `#1e293b` | Dark backgrounds, dark text |

### Slate (neutral scale)

| Token | Hex |
|-------|-----|
| `--color-slate-50` | `#f8fafc` |
| `--color-slate-100` | `#f1f5f9` |
| `--color-slate-200` | `#e2e8f0` |
| `--color-slate-300` | `#cad5e2` |
| `--color-slate-400` | `#90a1b9` |
| `--color-slate-500` | `#62748e` |
| `--color-slate-600` | `#45556c` |
| `--color-slate-700` | `#314158` |
| `--color-slate-800` | `#1d293d` |

### Emerald (success / health)

| Token | Hex |
|-------|-----|
| `--color-emerald-50` | `#ecfdf5` |
| `--color-emerald-100` | `#d0fae5` |
| `--color-emerald-500` | `#00bb7f` |
| `--color-emerald-600` | `#009767` |

### Green

| Token | Hex |
|-------|-----|
| `--color-green-300` | `#7bf1a8` |

### Blue (info)

| Token | Hex |
|-------|-----|
| `--color-blue-100` | `#dbeafe` |
| `--color-blue-500` | `#3080ff` |
| `--color-blue-600` | `#155dfc` |

### Orange (warning / energy)

| Token | Hex |
|-------|-----|
| `--color-orange-100` | `#ffedd5` |
| `--color-orange-200` | `#ffd7a8` |
| `--color-orange-400` | `#ff8b1a` |
| `--color-orange-600` | `#f05100` |

### Red (error / alert)

| Token | Hex |
|-------|-----|
| `--color-red-50` | `#fef2f2` |
| `--color-red-100` | `#ffe2e2` |

### Base

| Token | Hex |
|-------|-----|
| `--color-black` | `#000000` |
| `--color-white` | `#ffffff` |

### Semantic usage (from actual class usage)

- **Backgrounds**: `#e11d48`, `#f8fafc`, `#1e293b`, `#e11d481a` (primary/10%), `#1e293b66` (charcoal/40%), `#dbeafe`, `#3080ff`, `#ecfdf5`, `#d0fae5`, `#00bb7f`, `#ffedd5`, `#ff8b1a`, `#fef2f2`, `#f1f5f9`, `#e2e8f0`, `#fff`
- **Text**: `#4a4a4a`, `#e11d48`, `#1e293b`, `#155dfc`, `#009767`, `#f05100`, `#e2e8f0`, `#cad5e2`, `#90a1b9`, `#62748e`, `#45556c`, `#314158`, `#fff`
- **Borders**: `#e11d48`, `#1e293b`, `#ecfdf5`, `#ffd7a8`, `#ffe2e2`, `#f8fafc`, `#f1f5f9`, `#e2e8f0`, `#1d293d`, `#fff`

---

## Typography Scale

Base unit: `1rem = 16px`

| Token | Size | Px equiv |
|-------|------|----------|
| `--text-xs` | `0.75rem` | 12px |
| `--text-sm` | `0.875rem` | 14px |
| `--text-base` | `1rem` | 16px |
| `--text-lg` | `1.125rem` | 18px |
| `--text-xl` | `1.25rem` | 20px |
| `--text-2xl` | `1.5rem` | 24px |
| `--text-3xl` | `1.875rem` | 30px |
| `--text-4xl` | `2.25rem` | 36px |
| `--text-5xl` | `3rem` | 48px |
| `--text-6xl` | `3.75rem` | 60px |
| `--text-7xl` | `4.5rem` | 72px |
| `--text-8xl` | `6rem` | 96px |

### Font Weights

| Token | Value |
|-------|-------|
| `--font-weight-medium` | `500` |
| `--font-weight-bold` | `700` |
| `--font-weight-black` | `900` |

---

## Spacing Scale

Base unit: `--spacing: 0.25rem` (4px)

All spacing via `calc(var(--spacing) * N)`:

| Multiplier | Value | Px |
|-----------|-------|----|
| 1 | 0.25rem | 4px |
| 2 | 0.5rem | 8px |
| 3 | 0.75rem | 12px |
| 4 | 1rem | 16px |
| 6 | 1.5rem | 24px |
| 8 | 2rem | 32px |
| 16 | 4rem | 64px |

---

## Border Radius

| Token | Value | Px |
|-------|-------|----|
| `--radius-md` | `0.375rem` | 6px |
| `--radius-lg` | `0.5rem` | 8px |
| `--radius-xl` | `0.75rem` | 12px |
| `--radius-2xl` | `1rem` | 16px |
| `--radius-3xl` | `1.5rem` | 24px |
| `rounded-[2rem]` | `2rem` | 32px |
| `rounded-[3rem]` | `3rem` | 48px |
| `rounded-full` | pill | — |

---

## Shadows

```css
shadow-sm  → 0 1px 3px 0 #0000001a, 0 1px 2px -1px #0000001a
shadow-md  → 0 4px 6px -1px #0000001a, 0 2px 4px -2px #0000001a
shadow-lg  → 0 10px 15px -3px #0000001a, 0 4px 6px -4px #0000001a
shadow-xl  → 0 20px 25px -5px #0000001a, 0 8px 10px -6px #0000001a
shadow-2xl → 0 25px 50px -12px #00000040
```

---

## Blur & Backdrop

```css
blur-[150px]       → blur(150px)         /* decorative background orbs */
backdrop-blur      → blur(8px)           /* frosted glass panels */
backdrop-blur-sm   → blur(var(--blur-sm)) /* subtle glass effect */
```

---

## Gradients

```css
/* Direction utilities */
bg-gradient-to-r   → linear-gradient(to right in oklab, ...)
bg-gradient-to-l   → linear-gradient(to left in oklab, ...)
bg-gradient-to-br  → linear-gradient(to bottom right in oklab, ...)

/* Stop tokens used */
from-[#f8fafc]     → starts at slate-50
from-green-300     → starts at #7bf1a8
to-emerald-500     → ends at #00bb7f
to-transparent     → fades to transparent
```

---

## Borders

| Class | Value |
|-------|-------|
| `border` | 1px solid |
| `border-2` | 2px solid |
| `border-4` | 4px solid |
| `border-8` | 8px solid |
| `border-[10px]` | 10px solid |
| `border-[12px]` | 12px solid |

---

## Ring

```css
ring-2    → 0 0 0 2px (outline ring)
ring-white → ring color = #fff
```

---

## Transitions

| Class | Property |
|-------|----------|
| `transition` | default |
| `transition-all` | all |
| `transition-colors` | color, background-color, border-color, fill, stroke |
| `transition-transform` | transform, translate, scale, rotate |
| `duration-200` | 200ms |
| `duration-300` | 300ms |
| `duration-500` | 500ms |

---

## Animations

```css
/* Testimonial / logo marquee */
@keyframes marquee {
  0%  { transform: translate(0); }
  to  { transform: translate(-50%); }
}
.animate-marquee { animation: 15s linear infinite marquee; }

/* Bounce */
@keyframes bounce {
  0%, to { transform: translateY(-25%); }
  50%    { transform: none; }
}
.animate-bounce { animation: var(--animate-bounce); }
```

---

## Responsive Breakpoints

| Name | Min-width |
|------|-----------|
| `sm` | 40rem / 640px |
| `md` | 48rem / 768px |
| `lg` | 64rem / 1024px |

---

## Content & Sections

The site is a French-language SaaS landing page for a coaching app:

- **Hero**: "Coachez plus. Gérez moins." — primary CTA "Démarrer l'essai gratuit"
- **Nav**: Logo + "Obtenir l'App" (app store link)
- **Features**: AI meal scanning, macro tracking, athlete dashboard
- **Pricing**: 49€/mois for 10 athletes
- **Testimonials**: 5 coaches, scrolling marquee
- **Footer**: Legal links

---

## Key Design Patterns

1. **Glass cards** — `backdrop-blur` + semi-transparent backgrounds (`#1e293b66`, `#e11d481a`)
2. **Decorative orbs** — `blur-[150px]` background blobs in brand/emerald colors
3. **Pill buttons** — `rounded-full` with `bg-primary (#e11d48)` or `bg-charcoal (#1e293b)`
4. **Large radius cards** — `rounded-2xl` to `rounded-[3rem]` for soft modern feel
5. **Gradient text / backgrounds** — `from-green-300 to-emerald-500`
6. **Dark sections** — charcoal (`#1e293b`) background with white text
7. **Scrolling marquee** — infinite horizontal scroll for testimonials/logos
