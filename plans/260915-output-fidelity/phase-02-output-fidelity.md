---
phase: 2
title: "Output-Fidelity"
status: completed
priority: P1
effort: "3h"
dependencies: ["phase-01-architectural-debt"]
---

# Phase 2: Output Fidelity

## Overview

Make the generated Tailwind/CSS describe what Figma actually contains. Five mappings are
either missing or fabricated.

## Requirements

- **Functional:**
  - Real drop/inner shadows: offset X/Y, blur, spread, colour, opacity.
  - Text: `leading-*` from `lineHeight`, `tracking-*` from `letterSpacing`.
  - Sizing: Hug -> `w-fit`/`h-fit`; child `layoutAlign: STRETCH` -> `self-stretch`.
  - Node opacity < 1 -> `opacity-*`.
  - Absolute children -> `absolute` + `left-[Xpx] top-[Ypx]`.
- **Non-functional:**
  - Class ordering preserved: layout -> sizing -> spacing -> typography -> visuals.
  - No fabricated values. When an exact Tailwind scale entry does not exist, emit
    arbitrary bracket syntax rather than rounding to the nearest preset.

## Architecture

```
ShadowData[] -> shadow-[0_4px_8px_rgba(0,0,0,0.1)]     (inner -> inset_ prefix)
lineHeight   -> %: leading-[1.5]   px: leading-[24px]
letterSpacing-> px: tracking-[0.5px]   %: tracking-[0.05em]
sizing.hug*  -> w-fit / h-fit
layoutAlign  -> self-stretch
opacity      -> opacity-50 (exact step) else opacity-[0.37]
position     -> absolute left-[24px] top-[16px]
```

## Implementation Steps

1. `src/types/messages.ts`: add `sizing?: { hugHorizontal: boolean; hugVertical: boolean }`
   and `position?: { absolute: boolean }`; `ShadowData` already added in Phase 1.
2. `src/code/extractors.ts`: read `primaryAxisSizingMode` / `counterAxisSizingMode`
   (`'AUTO'` = hug) and `layoutPositioning` (`'ABSOLUTE'`).
3. `src/utils/tailwind-scale.ts`: add `toTailwindLineHeight`, `toTailwindLetterSpacing`,
   `toTailwindOpacity`, `toTailwindShadow`.
4. `src/utils/tailwind-transpiler.ts`: wire all five mappings into the correct buckets.
5. `src/ui/components/CodeViewer.tsx`: no change expected -- CSS comes from `getCSSAsync`
   plus the border merge.

## Success Criteria

- [x] A shadowed node emits its real offset/blur/spread/colour.
- [x] A text node emits `leading-*` and `tracking-*`.
- [x] A Hug frame emits `w-fit`/`h-fit`; a stretched child emits `self-stretch`.
- [x] A 40%-opacity node emits `opacity-*`.
- [x] An absolute child emits `absolute` with offsets.

## Risk Assessment

- *Risk:* Tailwind arbitrary-value escaping (spaces in shadow values must become `_`, and
  `rgba(...)` must not break the class parser).
- *Mitigation:* unit-test the exact emitted string for a multi-layer shadow.
- *Risk:* `getCSSAsync()` may already emit a `box-shadow`; adding a Tailwind shadow could
  double-report.
- *Mitigation:* the CSS tab renders `getCSSAsync` output directly, so only the Tailwind tab
  is synthesised; no duplication.
