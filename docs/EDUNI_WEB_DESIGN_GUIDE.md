# EDUNI Portal Web Design Guide

This guide applies to user-facing web features across EDUNI portal branches. It helps teams make pages clear, child-friendly, consistent, and usable on phones without turning reference galleries into copy sources.

For any EDUNI portal change that affects visible UI or interaction, read this guide and the relevant sections of [`REFERENCES.md`](REFERENCES.md). Then read the target app's `AGENTS.md`, existing design notes, and nearby implementation before choosing an approach. Project-specific constraints take precedence.

## Working principles

1. Start with the user's task. Identify who uses the screen, what they need to do, the most important action, and the empty/loading/error/success states before choosing a visual style.
2. Inspect the actual target. Confirm the app, route, framework, shared components, CSS conventions, supported browsers, and current responsive behavior. Do not assume all EDUNI pages use the same stack.
3. Use references selectively. Pick one primary reference and, if useful, one or two supporting references from [`REFERENCES.md`](REFERENCES.md). Note the pattern being studied; do not reproduce an entire screen.
4. Build on existing EDUNI conventions. Reuse the project's components, tokens, typography, route patterns, and persistence model. Add dependencies only when the user-facing benefit justifies their ongoing cost.
5. Keep the page focused. Make the next action obvious, group related information, remove duplicate calls to action, and keep secondary settings or explanation out of the main flow unless needed.

## UI and interaction quality

- Design mobile-first for the actual audience. Check at least 360×800 and 390×844 for phone pages; add tablet, desktop, or landscape sizes when the feature is expected there.
- Keep tap targets comfortable (normally at least 44×44 CSS pixels), avoid relying on hover, respect safe areas, and prevent horizontal overflow or hidden primary actions.
- Use plain, age-appropriate Korean for child-facing content. Keep adult analysis, privacy explanations, and configuration separate from the child's core activity where possible.
- Show clear focus, pressed, disabled, selected, loading, empty, validation, and error states. Provide keyboard access and visible focus for controls.
- Preserve readable contrast and text sizing. Do not communicate state through color alone; provide labels, icons with accessible names, or text feedback.
- Respect `prefers-reduced-motion`. Animation should explain state or provide feedback, not delay input or distract from the task.
- Keep global features such as the AI companion reachable where the product expects them. Check stacking and dismissal behavior with dialogs, bottom sheets, menus, and the on-screen keyboard; never let an overlay obscure the task's primary control.
- Preserve existing routes, data behavior, and compatibility unless the task explicitly changes them. UI polish must not silently change game rules, saved records, or navigation semantics.

## Reference and asset use

- Treat galleries, screenshots, and prompts as design research. Recreate the underlying useful pattern in EDUNI's visual language rather than copying a product's branding, screenshots, or complete layout.
- Before adding external code, images, illustrations, icons, fonts, or animation packages, verify the exact source, item-level license, redistribution rights, attribution requirements, version, and dependency impact.
- A site's copy/download button is not proof of a reuse license. Record an asset's exact URL and license in the appropriate project asset/provenance document.
- Prefer local, optimized assets over hotlinking. Avoid adding third-party scripts or requests that expose child or family data.
- Keep the implementation within the target app's framework. For example, a React/Tailwind reference can inform hierarchy, but it does not justify introducing React/Tailwind into a NiceGUI or static HTML page.

## Validation and handoff

Before calling a UI change complete:

1. Run the focused tests relevant to the changed behavior.
2. Open the real route in a headed browser when available; inspect the target phone sizes and any required desktop/tablet sizes.
3. Exercise the primary flow plus empty, loading, invalid, success, back/close, and repeat-use states that apply.
4. Check console/network errors, keyboard and touch behavior, scrolling, safe-area spacing, overlays, and screenshots at the tested viewport sizes.
5. Report exactly what was tested. Keep source review, automated tests, local browser QA, production deployment, and real-device acceptance as separate evidence; do not imply one proves another.

If headed-browser or device testing is unavailable, state that limitation and do not claim visual acceptance.
