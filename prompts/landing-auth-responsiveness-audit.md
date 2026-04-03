# Landing/Auth Responsiveness Audit Prompt

Use this prompt with Codex when you want a strict review of the current public-facing UI and any future landing page in this repo.

## Copy-Paste Prompt

```md
Audit the current repo for landing page and auth-entry responsiveness quality. This is a review task only: inspect the current implementation, report findings, and suggest patches, but do not edit files.

Use the repo's `AGENTS.md` instructions as the primary standard, then layer in practical mobile-first landing-page UX expectations.

Start by inspecting these files first:
- `src/app/page.tsx`
- `src/components/auth/login-content.tsx`
- `src/components/layout/app-shell.tsx`
- `src/app/globals.css`

Then inspect any other directly relevant files if needed to support conclusions.

Important current-state rule:
- Do not assume `/` is a real landing page. First verify whether `src/app/page.tsx` renders a marketing page or only redirects.
- If `/` redirects, treat that as current repo truth and review `src/components/auth/login-content.tsx` as the effective public entry surface.
- Separately describe what a future dedicated landing page at `/` should satisfy if it is introduced later.

Review against these criteria:

1. AGENTS compliance
- Mobile-first behavior and breakpoint usage
- Consistency with the repo's `lg:` desktop shell pattern where relevant
- Design-system consistency
- No hardcoded hex colors where AGENTS expects CSS custom properties
- Use of CSS custom properties and existing theme tokens
- Card/input/button radius conventions
- Bilingual readiness and text/layout resilience for English and Bulgarian
- Preserving established visual patterns from shared layout primitives when appropriate

2. Public entry experience
- Whether the current login page is effectively acting as a landing page
- Whether that is acceptable for the current product state
- What is missing if the entry surface is expected to explain, sell, or reassure

3. Landing-page standards
- Clear hero value proposition
- CTA clarity and hierarchy
- Trust/reassurance signals
- Feature hierarchy and scannability
- Strong first impression on mobile, not just desktop

4. Responsive quality
- Layout integrity on narrow screens
- Spacing rhythm and visual density
- Tap target sizing
- Overflow and wrapping risks
- Sticky/fixed element behavior
- Safe-area handling

5. Accessibility and performance basics
- Semantic heading structure
- Contrast and focus visibility
- Icon/image meaning and clarity
- Obvious performance risks that affect first render or usability

Output format requirements:

## High-Severity Findings
- List the most important problems first.
- Use code-review style findings with severity, short rationale, and file references.

## Medium and Low Findings
- Continue with less severe issues in the same format.

## What Is Already Good
- Keep this short.
- Mention concrete strengths already present in the current implementation.

## Recommended Next Fixes
- Suggest patch directions only.
- Do not write code.
- Keep recommendations concrete and implementation-ready.

Additional review rules:
- Separate conclusions into:
  - Current-state issues on the existing login/public surface
  - Future landing-page requirements if a dedicated `/` marketing page is added later
- Be strict about AGENTS/design-system violations, even if they are not breaking bugs.
- Call out hardcoded hex colors explicitly if present.
- Prefer findings with exact file references.
- Do not start implementing.
- Do not produce a generic UX essay; ground every conclusion in the actual repo state.
```

## Expected Outcome

When this prompt is used correctly, Codex should:

- confirm whether `src/app/page.tsx` redirects instead of rendering a landing page
- audit `src/components/auth/login-content.tsx` as the effective public entry surface when `/` is only a redirect
- compare the public-facing UI against `AGENTS.md`, `src/components/layout/app-shell.tsx`, and `src/app/globals.css`
- flag responsiveness, landing-page UX, and design-system issues separately
- return findings by severity with file references instead of editing code
