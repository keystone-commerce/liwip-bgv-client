# DESIGN.md — Liwip design system

Liwip is background verification infrastructure for India. Gig workers first, then blue collar, white collar, and organisation admins. The product's job is reporting the state of checks. Every rule below exists to protect that.

## Sources of truth

- **This file** holds the rules. When another source disagrees with it, this file wins.
- **`app/globals.css`** holds the tokens as code (`:root`, `@theme inline`, `@layer base`). Hex values there and here must match. When you change one, change the other.
- **The design project (outside this repo)** holds the Design Components. They are references, not code. When you change this file, change them too.
  - `Liwip Design Direction v3.dc.html` — the visual direction and one built screen (W08 Identity documents, desktop)
  - `Liwip shadcn Tokens.dc.html` — the Tailwind v4 `globals.css` token block and shadcn coverage notes
  - `Liwip Onboarding.dc.html` — the mobile onboarding flow (§13)
  - `DESIGN-CHANGES.md` — the change list against the build at `bgv.liwip.com`

---

## 1. Non-negotiables

1. **Zero corner radius.** `--radius: 0rem`, and every radius step maps to it. No exceptions, including avatars and badges. A circular radio input is the single exempt shape.
2. **Colour is spent only on verification state.** Green, amber and the warm red belong to check outcomes. Nothing decorative may borrow them.
3. **Anything the system says about itself is monospace uppercase.** Anything a person wrote or typed is not.
4. **1px rules, never 2px.** Structure is carried by hairlines and alignment, not by fills, shadows or cards inside cards.
5. **No elevation.** No `box-shadow` anywhere. Drop `shadow-sm` at every shadcn Card call site.
6. **No gradient on any working surface.** See §7.

---

## 2. Colour

### Core roles

| Token | Hex | Use |
|---|---|---|
| `--background` / `--card` / `--popover` | `#FFFFFF` | Page and all surfaces. Surfaces separate by rule, not by fill. |
| `--foreground` | `#0B0B0C` | All text. Also the fill of a secondary Button. |
| `--primary` / `--ring` | `#2C62F6` | Default Button, active Tab, Progress fill, focus ring, checked controls. |
| `--secondary` / `--muted` | `#FAFAFA` | Table header, inactive Tab, Sidebar ground, Card footer. |
| `--muted-foreground` | `#62646C` | Field help, captions, table header labels. |
| `--accent` | `#EEF2FE` | Hover and selected rows only. Never a resting fill. |
| `--accent-foreground` | `#1B46C4` | Text on the accent tint; pressed primary Button. |
| `--destructive` | `#BE2E0C` | Invalid input, error alert, destructive action. |
| `--border` / `--input` | `#E4E4E7` | Every rule, every resting field edge. |

`--muted-foreground` is tuned to clear 4.5:1 on both `#FFFFFF` and `#FAFAFA`. Do not lighten it. Anything lighter than `#62646C` is for non-text use only.

### Onboarding tokens

Added for the mobile onboarding (§13). Values come from `Liwip Onboarding.dc.html`.

| Token | Hex | Use |
|---|---|---|
| `--secondary-text` | `#55575E` | Instructions, row details, step label, helper lines (design's ink-70). 7.4:1 on white. `--muted-foreground` stays for kickers, IDs and the second clause of a two-tone headline. |
| `--paper` | `#FAFAFA` | `+91` prefix cell, empty OTP cell. Same value as `--muted`. |
| `--line-soft` | `#EEEEF1` | Dividers between selection rows and inside the Liwip BGV Card. |
| `--blue-line` | `#C9D7FD` | Bottom rule of a selected row, quick sign-in figure edge. |
| `--track` | `#E7E7EA` | Progress and check-bar segments that are still ahead. Non-text only. |
| `--disabled` | `#E9E9EC` | Fill of a blocked primary button. Its text is `--muted-foreground` (4.9:1). |
| `--control` | `#8A8C93` | Edge of an unchecked radio or checkbox (3.4:1 on white). |

### Closing band

The black closing band and footer on the marketing home sit on `--foreground`. They use their own fixed values, currently hard-coded in `globals.css`:

| Role | Hex |
|---|---|
| Rules and container edges | `#2F2F31` |
| Body text | `#B7B7BC` |
| Secondary text, footer labels | `#929298` |
| Headline text | `#FFFFFF` |

Do not use them on a light surface.

### Verification state — the locked set

Five states, no more. Each is a triple: text / fill / border.

| State | Text | Fill | Border | Means |
|---|---|---|---|---|
| Verified | `#0E7148` | `#EAF4EF` | `#BEDCCC` | Passed. Adds a line to the Liwip BGV Card. |
| In review | `#8A5A00` | `#FAF1DC` | `#E8D5A8` | A human decides. No worker action. |
| Needs fix | `#BE2E0C` | `#FBEAE5` | `#EFC2B4` | Always shown with the action that fixes it. |
| Checking | `#1B46C4` | `#EEF2FE` | `#C9D7FD` | Live right now. The only animated state. |
| In queue | `#55575E` | `#F3F3F5` | `#E4E4E7` | Nothing is wrong yet, so no hue is spent. |

In code these are `--state-{verified,review,fix,checking,queued}` with `-bg` and `-border` suffixes, exposed to Tailwind as `text-state-verified`, `bg-state-verified-bg`, `border-state-verified-border` and so on.

Rules:
- Every state badge is a filled rectangle **with a 1px border and an icon**. Fill alone does not survive a compressed WhatsApp screenshot.
- `--state-fix` shares its value with `--destructive` on purpose: an invalid field and a failed check are the same red.
- Never invent a sixth state. If a new status appears, map it onto one of these five.
- Charts are outcome breakdowns, so `--chart-1..5` are primary, verified, review, fix, queued. Do not use an arbitrary ramp.

### Mapping API statuses

The API returns its own status names (`lib/types.ts`). Map them; never display them raw.

| API status | State | CSS class |
|---|---|---|
| `VERIFIED` | Verified | `.status-verified` |
| `MANUAL_REVIEW` | In review | `.status-manual-review` |
| `FAILED` | Needs fix | `.status-failed` |
| `PROCESSING` | Checking | `.status-processing` |
| `PENDING`, `QUEUED` | In queue | `.status-pending`, `.status-queued` |

When the API adds a status, add a row here in the same change.

---

## 3. Type

Two typefaces, no overlap in role. Both load in `app/layout.tsx` through `next/font` as `--font-geist-sans` and `--font-geist-mono`.

**Geist** (weights 400, 500) carries headings and body.

| Role | Size | Notes |
|---|---|---|
| Display | 56 | Marketing surfaces only |
| Title | 34 | Screen titles |
| Section | 22 | Group headings inside a screen |
| Body | 15 / 1.6 | Instructions and help |

Headline tracking is about −2.4%. Two-tone headlines are the house move: first clause in `--foreground`, second in `--muted-foreground`.

**Geist Mono** (weights 400, 500) carries kickers, labels, buttons, status badges, step counters, IDs, amounts and dates. Size 11–12px, uppercase, tracking `0.11em`.

Every identifier, amount, date and percentage uses `font-variant-numeric: tabular-nums`. No exceptions — application IDs and PAN numbers must not wobble between rows.

Never set a form label in Geist, and never set a sentence in Geist Mono.

**Indian scripts.** Geist covers Latin only. Noto Sans Devanagari, Bengali, Tamil and Telugu load as fallbacks behind Geist, through a Google Fonts stylesheet in `app/layout.tsx` (`next/font` fails on these families under Turbopack). Each face has a unicode-range, so a script's font downloads only when that script renders. Never let a script fall back to the system font.

---

## 4. Layout and spacing

- Content sits inside a max-width sheet with 1px left and right rules.
- Sections separate with a full-width 1px rule, not with whitespace alone.
- One container level. If you find yourself putting a bordered box inside a bordered box, delete one.
- Grid cells divide with 1px rules. Hatched gutters (`repeating-linear-gradient(45deg, #EDEDF0 0 1px, transparent 1px 6px)`) are allowed between equal cells in a feature row, nowhere else.
- Corner tick marks (7px L-shapes in `--primary`, offset −4px) mark a framed figure. Use at most once per screen.
- Kicker pattern: a 1px-bordered inline strip containing a 6px `--primary` square and one mono uppercase label. This is how every section announces itself.
- Breakpoints in use: 520, 760, 980 and 1180px. Reuse these rather than adding new ones.

---

## 5. Forms

- **Field widths match their content.** PAN 250px, date of birth 215px, voter ID 250px. Never stretch a 10-character field to fill a column.
- Minimum control height **48px**, 52px for text inputs. Workers are on phones, one-handed.
- Instructions come **before** the field. Never after it, never in a tooltip.
- One line of helper text per field at most. Fold "optional" into the label rather than adding a line.
- Validation state is an icon **inside** the input, not a line of text below it.
- A resting input border is `--border`. A filled or focused input steps up to `--foreground`. An invalid one is `--destructive`.
- **Cross-field errors are banners, not field errors.** If the problem is "A does not match B", it belongs in one banner above the group, naming both fields.
- Input values are mono tabular. Labels are mono uppercase. Help text is Geist at 13px in `--muted-foreground`.

---

## 6. Flow and information architecture

- **Source of record first.** DigiLocker and Pehchaan sit above any manual form. A worker who can use them must never see the fields.
- **One route at a time.** Where there are several ways to provide the same thing, use a segmented tab strip and render only the selected panel. Never stack all routes on one screen.
- **The tab is the heading.** A panel must not repeat its own tab's label, icon or badge.
- **Consent is per check**, with purpose, text version and timestamp recorded.
- **Progress is the Liwip BGV Card filling in**, not a sidebar of seventeen steps. Show what is already verified, what this step adds, and what is queued.
- Every screen carries a persistent right rail (desktop) or collapsed summary (mobile) showing card state. It is context, not decoration — it must show real status, never filler.

---

## 7. Gradients

One blue, used as a large soft radial field. Never a blurred shape, never a second hue.

Allowed: marketing hero, a framed hero figure, at most one feature card, the closing black band, the entry screens (§13, rising from below), and the welcome back screens R1/R1b (a soft field from the top).

Forbidden: any form surface, any table, any panel a worker reads or types into, and behind any text smaller than display size.

---

## 8. Motion

- Interactive feedback is a colour change only: `color`, `background-color`, `border-color`, `opacity`, 140ms ease. Nothing scales or lifts.
- **Screen-to-screen transitions** are the one movement allowed: a 28px horizontal slide with a crossfade in the direction of travel, 280ms in and 160ms out, ease `[0.22, 1, 0.36, 1]`. Built with Motion (`motion/react`) in `components/onboarding/onboarding-flow.tsx`. Elements inside a screen do not animate in.
- **Entry glow:** the bloom on the entry screen fades in each time the screen opens, a CSS opacity transition of 1.6s after 150ms, ease-out. Opacity only; it does not move.
- The Checking state is the only thing that animates continuously (icon spin, 1.2s linear).
- `prefers-reduced-motion: reduce` collapses every animation and transition. Screen transitions drop the slide and keep a short fade. Keep the block in `globals.css` intact, and make new animation respect it.

---

## 9. Icons

Lucide (`lucide-react`), stroke 1.5–1.7 at figure size, 2.2–3.2 for small inline marks, `stroke-linecap="square"` to match the zero-radius language. Never a bare CSS square as a stand-in — an outlined square next to green text reads as an unchecked checkbox. The filled squares in the kicker and the Liwip BGV Card header carry no state and are the exception.

---

## 10. Writing

- Screen titles state the task: "Add your PAN and one photo ID", not "Trusted identity".
- No em dashes. Rephrase, do not substitute another mark.
- No emoji, including in trust and security lines.
- Plain words over product language. "Take a photo", not "Capture document image".
- Never editorialise a status. Say what happened and what to do next.
- Do not rewrite copy a user supplied. Format it, keep the words.

---

## 11. Accessibility floor

- Text contrast 4.5:1 minimum against its actual background, 3:1 only at headline size. Check against `#FAFAFA` as well as `#FFFFFF`.
- Labels and captions never below 11px; body never below 13px; mobile hit targets never below 44px.
- Focus is a 1.5px `--primary` outline at 2px offset. Never the browser default. An invalid control keeps the same outline in `--destructive`.
- Every state must be distinguishable without colour: icon plus text, always.
- Design for 360px Android on a slow connection first. Desktop is the adaptation, not the source.

---

## 12. shadcn/ui

Tailwind v4, light only for the product. There is no `.dark` block and no dark variant; `color-scheme: light` is pinned in `globals.css` and in the `viewport` export in `app/layout.tsx`.

The one exception is the **entry screen dark mode** (see §13). It is a single marketing surface with fixed values, not a theme. Do not build a global dark mode from it.

The `:root` values in `app/globals.css` are the OKLCH block from `Liwip shadcn Tokens.dc.html`; the onboarding extension tokens are hex. Paste the token block from `Liwip shadcn Tokens.dc.html` into `app/globals.css`, replacing the `:root` and `@theme inline` blocks the CLI wrote. If the shadcn CLI rewrites them later, restore the Liwip values.

Components needing real edits:
- **Button**: mono uppercase labels, ink secondary, every size at least 48px tall.
- **Input**: 52px, mono tabular value, `--foreground` border on focus.
- **Badge**: five state variants (`verified`, `review`, `fix`, `checking`, `queued`), each with fill, 1px border and icon.
- **Alert**: error banners use the Needs fix triple, not a plain card.
- **Card**: no shadow, no radius, footer on `--muted`.

Everything else inherits.

Two utilities live in `@layer base`: `.label-mono` and `.tabular`. Use them rather than repeating the classes.

In this codebase:
- The shadcn style is `base-nova`, built on `@base-ui/react`, not Radix. Components compose with the `render` prop, not `asChild`.
- `cn` comes from the `cn` package, re-exported from `@/lib/utils`.

---

## 13. Mobile onboarding patterns

Reference: `Liwip Onboarding.dc.html`. Artboards are 360 × 760. Flow: 01 Entry (light 2a, dark 1b) → 02 Language → 03 Mobile number → 04 OTP → 05 Number verified → 05b Quick sign-in → 06 Worker home → 07 Choose work → 08 Review package → 09 Consent. Returning: R1 (status shown before unlock) or R1b (status hidden). Product must pick one of R1 / R1b.

### Where the build departs from the mock

`DESIGN.md` wins over the `.dc.html`, so the code differs from the artboards in these places:

- Step label, chip text and badges are 11px, not 9.5–10.5px (§11 floor).
- The language chip is 32px to look at, inside a 44px hit area.
- Blocked primary text is `--muted-foreground` on `--disabled`, not `#8A8C93` (2.8:1).
- Unchecked radio and checkbox edges are `--control`, not `#C4C5CB` or `#B9BAC1` (under 3:1).
- Every badge carries an icon. "In progress" on worker home uses the In queue treatment, not amber: amber means a human is reviewing.
- The HELP chip on worker home shows only when `NEXT_PUBLIC_ONBOARDING_HELP_URL` is set; there is no help destination yet.
- Worker home: "Liwip BGV Card" is followed by a `1 VERIFIED` pill and the line "Your checks appear here once you choose your work." The design shows only this state; once a work type is chosen the line is replaced by the package's check bar, since the checks are then known.
- Entry 2a (light) follows the `.dc.html` artboard. `DESIGN-CHANGES.md` describes a different 2a (top-right bloom, `FOR GIG WORKERS`, card preview) without its description copy; 1b is the one that ships.

### Screen shell

Every screen is the same three-part column. Do not invent a fourth. **Header and footer are fixed; only the body scrolls.** The shell is the height of the visible viewport (`--app-height`, set from `visualViewport`, falling back to `100dvh`) and a flex column. Header and footer are `flex:none`, never `position:fixed`. The body is `flex:1; min-height:0; overflow-y:auto; overscroll-behavior:contain`. The page itself never scrolls, so the browser toolbar does not collapse mid-task.

| Part | Spec |
|---|---|
| Top bar | 52px, 1px bottom rule. Left: back button (44 × 44 hit area) or logo. Centre: step label, mono 10.5px, e.g. `SIGN IN · 1 OF 2`. Right: language chip, 32px, 1px border. |
| Progress | Five 3px segments, 3px gap, 12px below the top bar. Done = `--state-verified`, current = `--primary`, ahead = `#E7E7EA`. One segment per stage: Sign in, Your work, Your details, Confirm & pay, Result. |
| Body | 20px side padding, 24–28px top. Title 28px / 500 / −2.4%, then one line of instruction in 14.5–15px `--secondary-text`. |
| Footer | Pinned. 1px top rule, 16px / 20px / 22px padding. One primary button, optionally one secondary below it, 10px gap. |

### Buttons

- Primary: 52px, `--primary` fill, white mono 12px uppercase, trailing arrow. Full width on mobile.
- Secondary: 48px, 1px `--border`, `--foreground` text, no fill.
- Disabled primary is `#E9E9EC` fill, `#8A8C93` text, and **says what is missing**: `VERIFY · 2 DIGITS LEFT`, `AGREE · 2 LEFT TO APPROVE`. Never a silent grey button.
- Primary label names the outcome where it can: `CONTINUE AS RIDER`, `CHOOSE RIDER · ₹449`.

### Selection rows (language, work, package)

- Full-width rows, 56–62px tall, 1px `--line-soft` dividers, no cards.
- Selected row: `--accent` fill, `--blue-line` bottom rule, radio filled `--primary`.
- Radio is a 20px circle (the one exempt round shape). Checkbox is a 22px square, `--primary` fill with white check when on.
- Language rows show the native script at 17px and the English name in mono on the right. Load Noto Sans for Devanagari, Bengali, Tamil and Telugu as fallbacks behind Geist.

### Inputs

- Phone: 56px, `+91` prefix cell 68px on `--paper`, value mono 18px with a space after the fifth digit.
- OTP: six 58px cells, 8px gap. Filled cell 1px `--foreground`. Active cell 1px `--primary` + 1.5px outline at 2px offset + caret. Empty cell `--paper` fill, `--border` edge.
- Under the OTP: `WAITING FOR SMS` badge (checking state) left, `RESEND IN 0:24` mono tabular right.

### Keyboard open (03b, 04b)

On a 360px Android phone in Chrome, the address bar, autofill bar and keyboard leave about **347px** of page. Design for that, not for 760.

1. **The keyboard's action key is the CTA.** Every input sits in a `<form>` with `enterkeyhint` (`send` for mobile number, `done` for OTP) and submits on Enter.
2. **Auto-submit where the length is fixed.** OTP checks itself on the 6th digit. On 04b there is no CTA, only "Checks automatically at 6 digits" and resend.
3. **Compact mode while the keyboard is open.** Top bar 44px, chip 28px, progress 8px below the top bar, title 22px on one line, long instruction hidden, helper cut to one line, input 52px, footer padding 10px, CTA 48px. Mobile number uses the shorter title "Your mobile number" and helper "One SMS with a 6-digit code."
4. **Keep the footer in the flow.** `interactive-widget=resizes-content` in the viewport (set in `app/layout.tsx`) and the shell above.
5. **Detecting keyboard open.** `Screen` sets `data-kb="open"` when a text field is focused on a touch device, or when `visualViewport.height` is clearly shorter than `window.innerHeight` (iOS Safari ignores `interactive-widget`). Compact styles use the `group-data-[kb=open]/shell:` variant.
6. Mobile number: the 10th digit enables the CTA but never auto-sends. A wrong number costs an SMS and a wait.

### Liwip BGV Card (mini)

"Liwip BGV Card" is renamed **Liwip BGV Card** everywhere: copy, header strip, code (`BgvCard`). Used on entry, number verified, worker home, returning. 1px `--foreground` frame; ink header strip with 9px blue square, `LIWIP BGV CARD` and the **card number** (not the application ID). The card number is issued when the mobile number is verified and stays with the worker, so the digital and physical card carry the same number; the application ID belongs to one verification case and is for support and the backend. A row that is not done yet names the next action, for example `Choose the work you do` / `NEXT`; rows of check name + state badge, or an 8-segment 6px bar for overview. Locked variant (R1b) replaces the ID with a lock icon and shows only a count.

### Entry dark mode (1b)

The product ships 1b as the entry screen; 2a stays as the light reference. Same layout and copy as 2a. Background `--foreground`, text white, secondary copy `#9C9EA5`, rules `#2E2E33`, step numbers `#7FA0FF`. Blue radial bloom rising from below the fold. Primary button inverts to white fill, ink text. Only this screen.

### Quick sign-in (passkeys)

- WebAuthn platform authenticator, discoverable credential bound to the worker ID, `userVerification: "required"`.
- Offered once, after number verified (05b). Always optional; `NOT NOW, USE OTP` is a full secondary button, not a link.
- Copy is one line: "Use your phone's screen lock instead of a code." There is no shared-phone warning box; the design removed it.
- **Copy never names a biometric.** The OS decides between fingerprint, face and PIN. Say `UNLOCK`, "your phone's screen lock". The fingerprint icon is allowed as a recognisable symbol.
- OTP is always available on the returning screen.

### OTP delivery

- Field: `autocomplete="one-time-code"`, `inputmode="numeric"`.
- Android Chrome: WebOTP API. The SMS must end with the line `@liwip.in #<code>`.
- iOS Safari: code appears above the keyboard via `one-time-code`. No auto-read.
- WhatsApp codes cannot be read by the web. If WhatsApp is offered, the worker types the code.
- Never design or imitate browser or OS permission sheets.

### Consent

One row per check, no pre-ticked boxes in production (the mock shows 3 of 5 ticked only to illustrate both states). No "agree to all". Footer counts what is left.

---

## 14. Handoff checklist

- Tokens: `Liwip shadcn Tokens.dc.html` → `app/globals.css`.
- Rules: this file.
- Screens: `Liwip Onboarding.dc.html` (mobile), `Liwip Design Direction v3.dc.html` (W08 identity, desktop).
- Fonts: Geist, Geist Mono, Noto Sans Devanagari / Bengali / Tamil / Telugu.
- Icons: Lucide, `stroke-linecap="square"`.
- Open decisions: card number format (placeholder `LBC 2409 1673`); R1 vs R1b; final language list; package contents and timings are placeholders; OTP-on-call and SMS status alerts need product confirmation.

---

## 15. Working on designs

Before building a screen, in code or in the design project:
1. Name which of the five states it can show.
2. Say where the card-so-far rail goes on desktop and how it collapses on mobile.
3. Pick the one framed figure, if any, that gets corner ticks.
4. Check every new text colour against both `#FFFFFF` and `#FAFAFA`.

In the design project:
- Designs are Design Components (`Name.dc.html`), inline styles only.
- New screens go into the existing direction file as additional sections, or as a new `.dc.html` that loads the same tokens. Do not fork the direction.
- Keep a version when doing a substantial redesign (`… v2.dc.html`), so earlier directions stay comparable.
