---
phase: 3
title: "Tailwind-Transpiler"
status: pending
priority: P1
effort: "2h"
dependencies: ["phase-02-core-engine"]
---

# Phase 3: Tailwind Transpiler & Code Generator

## Overview
Build a robust, client-side utility module that transforms raw Figma layout attributes and CSS properties into clean, idiomatic Tailwind CSS (v3 / v4 compatible) classes.

## Requirements
- **Functional:**
  - Map Figma Auto-layout properties to Tailwind flexbox:
    - Horizontal -> `flex flex-row`
    - Vertical -> `flex flex-col`
    - Alignment -> `items-start`, `items-center`, `items-end`, `justify-between`, etc.
    - Gap / Spacing -> `gap-2` (8px), `gap-4` (16px), or arbitrary `gap-[18px]`.
  - Map Dimensions & Sizing:
    - Width/Height scales: standard 4px Tailwind scale (e.g. 16px -> `w-4`, 24px -> `w-6`), with fallback to arbitrary values `w-[140px]`.
    - Auto-layout sizing modes: Hug contents -> `w-fit` / `h-fit`, Fill container -> `w-full` / `flex-1`.
  - Map Padding:
    - Uniform -> `p-4`
    - Axis symmetric -> `px-6 py-3`
    - Asymmetric -> `pt-2 pr-4 pb-6 pl-8`
  - Map Borders & Rounded Corners:
    - Radii -> `rounded`, `rounded-md`, `rounded-lg`, `rounded-xl`, `rounded-full`, or arbitrary `rounded-[10px]`.
    - Border strokes -> `border border-[#E2E8F0]`.
  - Map Typography (for Text nodes):
    - Font size: `text-xs`, `text-sm`, `text-base`, `text-lg`, `text-xl`, `text-2xl`, etc.
    - Font weight: `font-normal` (400), `font-medium` (500), `font-semibold` (600), `font-bold` (700).
    - Line height: `leading-tight`, `leading-normal`, `leading-relaxed`.
    - Text color: `text-[#...]`.
  - Map Background & Effects:
    - Solid background -> `bg-[#...]`
    - Drop shadows -> `shadow-sm`, `shadow`, `shadow-md`, `shadow-lg`.
- **Non-functional:**
  - High performance: Pure synchronous string parsing, execution under 2ms per node.
  - Zero false positives: Clean class ordering (Layout -> Sizing -> Spacing -> Typography -> Visuals).

## Architecture
```
[ NodeInspectionData (CSS + BoxModel + Node Info) ]
                      │
                      ▼
[ tailwindTranspiler(data): string ]
 ├── layoutMapper()      -> flex, flex-col, items-center, justify-between, gap-4
 ├── sizingMapper()      -> w-full, h-[48px]
 ├── spacingMapper()     -> px-4, py-2
 ├── typographyMapper()  -> text-sm, font-semibold, text-white
 ├── borderMapper()      -> rounded-lg, border, border-slate-200
 └── effectMapper()      -> shadow-md, opacity-90
                      │
                      ▼
[ Formatted Output: "flex flex-row items-center justify-between p-4 bg-[#1E293B] rounded-xl shadow-sm" ]
```

## Related Code Files
- Create: `src/utils/tailwind-scale.ts` (Tailwind 4px spacing/size lookup tables and converters)
- Create: `src/utils/tailwind-transpiler.ts` (main transpiler engine)
- Create: `tests/tailwind-transpiler.test.ts` (unit tests covering layout, text, and frame conversion)

## Implementation Steps
1. Create `src/utils/tailwind-scale.ts`:
   - Mapping standard pixel sizes to Tailwind spacing numbers (e.g. `4: '1'`, `8: '2'`, `12: '3'`, `16: '4'`, `20: '5'`, `24: '6'`, `32: '8'`).
   - Helper function `toTailwindSpacing(px: number, prefix: string): string` generating either standard class or `prefix-[${px}px]`.
2. Implement `src/utils/tailwind-transpiler.ts`:
   - Combine layout heuristics (auto-layout orientation, primary/counter alignments).
   - Combine padding and margin heuristics.
   - Parse font size, font family, font weight from text nodes.
   - Sort classes using standard Prettier Tailwind class order.
3. Add unit tests in `tests/tailwind-transpiler.test.ts` to verify:
   - Button component: `flex items-center justify-center px-4 py-2 bg-[#2563EB] text-white rounded-lg font-medium`.
   - Card container: `flex flex-col gap-4 p-6 bg-white rounded-2xl shadow-md`.
   - Text heading: `text-2xl font-bold leading-tight text-slate-900`.

## Success Criteria
- [ ] Tailwind class output matches actual layout visual appearance.
- [ ] 100% of tested components generate valid Tailwind syntax without syntax errors.
- [ ] Unit tests pass with zero failures.

## Risk Assessment
- *Risk:* Arbitrary non-standard pixel values in design (e.g. 13.5px padding).
- *Mitigation:* Gracefully emit arbitrary bracket notation `p-[13.5px]` whenever an exact match on Tailwind's default scale does not exist.
