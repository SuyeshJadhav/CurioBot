# CurioBot — Pastel Journal Design Specification

## Overview
**CurioBot** is a charming, exploration-driven curiosity engine. The aesthetic is warm, whimsical, completely generic-free, and inviting—inspired by personalized journals, digital sketchpads, and cozy notebooks. The entire UI should feature a visible hand-sketched texture, including text that appears naturally handwritten throughout. The design should feel personalized and delightful, while retaining the functional dual-pane organization.

## Color Palette (Pastel Tones & Natural Ink)
- **Background:** Soft, diffused pastel cream or light, slightly warm gray canvas with a very subtle paper grain texture.
- **Panels/Surfaces:** Lighter, almost translucent cream or off-white panels with very subtle watercolor washes or blurred edge effects, separated from the base with irregular borders.
- **Primary Accent:** Softer, diffused pastel cyan, lavender, or soft sage green, with variations for hover states.
- **Secondary Accent:** Gentle blush pink or dusty indigo for subtle contrast and specific state highlights.
- **Text:** Dark natural ink or deep charcoal gray/blue, with different weights and variations for headings and body, all appearing as if written with a variety of pens.
- **Metadata/Muted Text:** Soft ink wash gray or light sepia.
- **Borders/Lines:** Irregular, slightly uneven hand-drawn borders and separator lines (like pencil or fine-liner pen).
- **Semantic/Success:** Gentle pastel green with diffused light effects.

## Typography (Handwritten Aesthetic)
- **Global Font:** A custom, delightful handwritten-style font throughout the entire interface (headings, body, labels, inputs, etc.).
- **Headings:** Slightly larger, more stylized handwritten script/caps.
- **Body:** Legible, slightly varied handwritten print/script.
- **Metadata/Tags:** Smaller, neat handwritten print/all-caps.

## Core Layout Structure
The application utilizes a **Whimsical Dual-Pane System** with a visible sketchpad feel.

```html
<div class="flex h-screen w-full [pastel-cream-bg] [charcoal-text] [handwritten-font] overflow-hidden relative">
  <div class="absolute inset-0 [paper-texture] opacity-20 z-0"></div>
  <aside class="w-64 [mobile-drawer] flex flex-col [pastel-surface-panel] [pencil-border-r] z-20"></aside>
  <main class="flex-1 flex flex-col relative overflow-hidden z-10"></main>
  <aside class="[mobile-slide-over] w-80 lg:w-96 [desktop-static] flex flex-col [pastel-surface-panel] [pencil-border-l] [shadow-journal] z-30"></aside>
</div>
```

## Component Details

### 1. The Catalyst (Ignite Button & State Transition)
**Idle State:** A prominent, glowing button centered in the Main Content area.
- **Styling:** Gentle, diffused gradient combining soft pastel cyan and blush pink/indigo, with slightly uneven edges and a subtle sketched texture. Appears as if a beautiful sticker or wax seal. Add a small, hand-drawn spark icon.
- **Text:** ✨ Ignite Curiosity (Handwritten caps/script)

**Active State (Running Graph):**
The button fades and smoothly transforms into the Pipeline Visualizer, perhaps appearing as though being drawn in place.

### 2. Pipeline Visualizer (Loading Timeline)
- **Container:** Centered prominently in the Main Content area (`[pastel-panel-soft] [shadow-whimsical] [pencil-border] [padded]`). Appears as a detailed journal entry page with hand-drawn elements.
- **Steps:** 🔍 Selecting Topic ➔ 🌐 Scouring the Web ➔ 📚 Querying Wikipedia ➔ ✍️ Synthesizing Article
- **Styling per Step:** All steps use unique, hand-drawn icons (not standard web icons).
  - **Active (Pulsing):** Animated step with diffused pastel accents, slightly uneven lines, and text/icons that subtly pulse and appear more vividly drawn. Use soft gradients and diffused light rather than intense color shifts.
  - **Completed:** Clearly drawn with solid, warm ink-green colors and a hand-drawn checkmark. Lines are crisp and defined.
  - **Pending:** Dimmer ink tones and separator lines, with lighter pen effects.

### 3. The Reader (Main Article Content)
- **Container:** `[flex-1] [overflow-auto] [p-journal] [scroll-watercolor] [relative]` - designed to feel like a high-quality journal page.
- **Typography:** Uses the consistent handwritten font throughout, beautiful and varied.
  - **Headings:** Slightly larger, more pronounced handwritten caps/script.
  - **Body:** Flowing, legible handwritten print/script, comfortably spaced.
- **Elements:**
  - **Blockquotes:** Slightly irregular, soft pastel blue or lavender ink-wash border, subtle watercolor background, appearing as if a taped-on note or special excerpt. Muted text inside.
  - **Links:** Diffused soft pastel accent colors, subtly underlined.
  - **Code (if any):** Different, slightly less varied handwritten style or light ink wash highlight.
  - **Tags (Bottom):** Pill-shaped tags made of small, slightly unique paper-like shapes or ink blots (`[pastel-surface-soft] [charcoal-ink] [pencil-border-tags]`). Add hand-drawn spark icons and make them interactively highlighted with diffused light on hover.

### 4. The Tutor (Interactive Chat Sidebar)
- **Container:** `[flex-column] [h-full] [shadow-side-panel]` - designed like a cozy, accessible journal column with visible page texture.
- **Header:** Sticky top header with beautiful handwritten script title, subtle diffused color light accent, and diffused backdrop blur.
- **Messages Area:** `[flex-1] [overflow-auto] [p-journal] [scroll-watercolor] [relative]`
- **Bubbles:**
  - **User:** Right-aligned, simple ink outline and subtle watercolor wash background. Irregular shape and neat handwriting.
  - **AI (Tutor):** Left-aligned, softer watercolor wash in a pastel accent tone, with diffused lighting and hand-drawn border. Flows more naturally with different colored inks or pen types used within the response.
- **Thinking State (Latency):** A loading bubble with small, pulsing ink dots or tiny, swirling drawn particles that appear and disappear.
- **Input Field:**
  - **Container:** Sticky at the bottom (`[p-journal] [pastel-surface-bottom] [backdrop-diffused]`).
  - **Input:** Irregular shape with visible pencil border, warm watercolor glow highlight, and handwritten placeholder text.

### 5. History Sidebar (Left Navigation)
- **Header:** Whimsical script title (`[muted-text] [uppercase] [tracking-journal] [px-journal]`).
- **Items:** Truncated handwritten topic titles (`[ink-text-history] [p-journal] [transition-sketch]`). On hover, the item subtly illuminates with a soft diffused pastel color light and gains a gentle watercolor wash background. Slight paper edges or ink splatters might appear.
