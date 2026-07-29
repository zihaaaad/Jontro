# Jontro Design System & UI Analysis

This document breaks down the core visual language, elements, and interaction design of the Jontro application. It explains *why* the application feels like a premium, enterprise-grade utility.

## 1. The Monochromatic Palette (The "Pro" Look)
Professional applications (like VS Code, Adobe Suite, or DaVinci Resolve) avoid using bright, distracting colors. Jontro uses a highly constrained, strict dark mode palette:
*   **App Background:** `#0e0e0e` - A deep, almost-black void. This reduces eye strain and pushes the active workspace forward.
*   **Surface/Cards:** `#141414` - Slightly elevated areas where the actual tools live. 
*   **Borders:** `#262626` - A crisp, 1px line. We completely eliminated "drop shadows" because shadows can feel messy. Hard 1px borders feel precise and engineered.
*   **Text (Primary):** `#ededed` - Off-white. Pure white (`#ffffff`) on dark backgrounds causes "halation" (glowing effect). `#ededed` is softer on the eyes while maintaining perfect contrast.

## 2. Iconography (Lucide React)
We are using the **Lucide** icon library. 
*   **Why?** They are open-source, mathematically perfect vector lines.
*   **Stroke Width:** We set the stroke width to `1.5` on large icons and `2` on small icons. This ensures they look razor-sharp, not thick or cartoonish.
*   **The Icons:**
    *   `FileAudio` (Video Converter): Represents media extraction.
    *   `ListTodo` (Task Manager): Classic checkbox outline.
    *   `ScanText` (OCR): Represents a scanner reading text blocks.
    *   `KeyRound` (Password): A classic security symbol.

## 3. Button Hierarchy & States
Buttons in Jontro follow a strict logic so you implicitly know what to click without thinking:

*   **Primary Buttons (The "Do It" Buttons)**
    *   *Examples:* `Start Extraction`, `Generate Password`, `Capture Screen`
    *   *Design:* Bright `#ededed` background with dark `#0e0e0e` text. This inverse contrast heavily draws the eye. When you look at the screen, you instantly know where the "submit" action is.
*   **Secondary Buttons (The "Helper" Actions)**
    *   *Examples:* `Copy to Clipboard`, `Add Task`
    *   *Design:* Dark backgrounds (`#262626`) with light text. They blend into the UI so they don't distract you, but are obvious when you need them.
*   **Hover & Animation Physics**
    *   We deliberately used `transition-none` on interactive elements. Consumer web apps use slow, bouncy fades (300ms transitions). By removing transitions, Jontro buttons snap instantly. This creates a psychological effect: the app feels blazing fast, compiled, and hardware-accelerated.

## 4. Typography (Inter)
*   **The Font:** `Inter` is highly legible on computer screens.
*   **Monospace Elements:** We use system monospace fonts (like `Consolas` or `Menlo`) specifically for generated passwords and OCR text. Monospace ensures that every character (like an `l` vs a `1` vs an `I`) takes up the exact same width, which is critical for security and reading extracted data.
*   **Tracking:** For small category labels (like the "WORKSPACE" text in the sidebar), we use uppercase letters with wide tracking (`tracking-widest`). This is a classic UI trick to make tiny text readable and elegant.

## 5. Input Fields & Data Entry
*   **Drag & Drop Zones:** Massive dashed borders with centered text. When a file is selected, the zone instantly changes background color to signal success without a popup.
*   **Checkboxes/Toggles:** Custom-designed square checkboxes. We hid the default messy browser checkboxes and built custom ones that fill with a subtle blue when checked.

---
*By strictly adhering to these rules across every single tool, Jontro maintains a unified, trustworthy, and premium identity.*
