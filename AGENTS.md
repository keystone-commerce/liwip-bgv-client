# AGENTS.md — Liwip design system rules

Liwip is background verification infrastructure for India. Gig workers first, then blue collar, white collar, and organisation admins. The product's job is reporting the state of checks. Every rule below exists to protect that.

Canonical references in this project:
- `Liwip Design Direction v3.dc.html` — the visual direction and one built screen (W08 Identity documents)
- `Liwip shadcn Tokens.dc.html` — the Tailwind v4 `globals.css` token block and shadcn coverage notes

When those two disagree with this file, this file wins. When you change this file, change them too.

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

### Verification state — the locked set

Five states, no more. Each is a triple: text / fill / border.

| State | Text | Fill | Border | Means |
|---|---|---|---|---|
| Verified | `#0E7148` | `#EAF4EF` | `#BEDCCC` | Passed. Adds a line to the Gig Card. |
| In review | `#8A5A00` | `#FAF1DC` | `#E8D5A8` | A human decides. No worker action. |
| Needs fix | `#BE2E0C` | `#FBEAE5` | `#EFC2B4` | Always shown with the action that fixes it. |
| Checking | `#1B46C4` | `#EEF2FE` | `#C9D7FD` | Live right now. The only animated state. |
| In queue | `#55575E` | `#F3F3F5` | `#E4E4E7` | Nothing is wrong yet, so no hue is spent. |

Rules:
- Every state badge is a filled rectangle **with a 1px border and an icon**. Fill alone does not survive a compressed WhatsApp screenshot.
- `--state-fix` shares its value with `--destructive` on purpose: an invalid field and a failed check are the same red.
- Never invent a sixth state. If a new status appears, map it onto one of these five.
- Charts are outcome breakdowns, so `--chart-1..5` are primary, verified, review, fix, queued. Do not use an arbitrary ramp.

---

## 3. Type

Two typefaces, no overlap in role.

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

---

## 4. Layout and spacing

- Content sits inside a max-width sheet with 1px left and right rules.
- Sections separate with a full-width 1px rule, not with whitespace alone.
- One container level. If you find yourself putting a bordered box inside a bordered box, delete one.
- Grid cells divide with 1px rules. Hatched gutters (`repeating-linear-gradient(45deg, #EDEDF0 0 1px, transparent 1px 6px)`) are allowed between equal cells in a feature row, nowhere else.
- Corner tick marks (7px L-shapes in `--primary`, offset −4px) mark a framed figure. Use at most once per screen.
- Kicker pattern: a 1px-bordered inline strip containing a 6px `--primary` square and one mono uppercase label. This is how every section announces itself.

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
- **Progress is the Gig Card filling in**, not a sidebar of seventeen steps. Show what is already verified, what this step adds, and what is queued.
- Every screen carries a persistent right rail (desktop) or collapsed summary (mobile) showing card state. It is context, not decoration — it must show real status, never filler.

---

## 7. Gradients

One blue, used as a large soft radial field. Never a blurred shape, never a second hue.

Allowed: marketing hero, a framed hero figure, at most one feature card, the closing black band.

Forbidden: any form surface, any table, any panel a worker reads or types into, and behind any text smaller than display size.

---

## 8. Icons

Lucide, stroke 1.5–1.7 at figure size, 2.2–3.2 for small inline marks, `stroke-linecap="square"` to match the zero-radius language. Never a bare CSS square as a stand-in — an outlined square next to green text reads as an unchecked checkbox.

---

## 9. Writing

- Screen titles state the task: "Add your PAN and one photo ID", not "Trusted identity".
- No em dashes. Rephrase, do not substitute another mark.
- No emoji, including in trust and security lines.
- Plain words over product language. "Take a photo", not "Capture document image".
- Never editorialise a status. Say what happened and what to do next.
- Do not rewrite copy a user supplied. Format it, keep the words.

---

## 10. Accessibility floor

- Text contrast 4.5:1 minimum against its actual background, 3:1 only at headline size. Check against `#FAFAFA` as well as `#FFFFFF`.
- Labels and captions never below 11px; body never below 13px; mobile hit targets never below 44px.
- Focus is a 1.5px `--primary` outline at 2px offset. Never the browser default.
- Every state must be distinguishable without colour: icon plus text, always.
- Design for 360px Android on a slow connection first. Desktop is the adaptation, not the source.

---

## 11. shadcn/ui

Tailwind v4, light only. There is no `.dark` block and no dark variant; `color-scheme: light` is pinned.

Paste the token block from `Liwip shadcn Tokens.dc.html` into `app/globals.css`, replacing the `:root` and `@theme inline` blocks the CLI wrote.

Components needing real edits: **Button** (mono uppercase labels, ink secondary), **Input** (52px, mono tabular value), **Badge** (five state variants). Everything else inherits.

Two utilities live in `@layer base`: `.label-mono` and `.tabular`. Use them rather than repeating the classes.

---

## 12. Working in this project

- Designs are Design Components (`Name.dc.html`), inline styles only.
- New screens go into the existing direction file as additional sections, or as a new `.dc.html` that loads the same tokens. Do not fork the direction.
- Before building a screen, name which of the five states it can show and where the card-so-far rail goes.
- Keep a version when doing a substantial redesign (`… v2.dc.html`), so earlier directions stay comparable.
