# Notewisp

Capture a note and an optional reminder in one click, straight from the Chrome toolbar.

Free for your first 10 notes, then a monthly subscription. Built as a Manifest V3
extension with **no host permissions and no content scripts** — it never sees the
pages you visit.

---

## Features

|                                    |                                                                                                                                                                |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Instant capture**                | The toolbar icon (or `Ctrl/Cmd+Shift+Y`) opens a popup that is already focused on the text box. Type, press Enter, done.                                       |
| **Never loses a draft**            | A browser popup is destroyed the moment it loses focus. Every keystroke is saved as a draft and restored on the next open.                                     |
| **Reminders**                      | One-tap presets (in an hour, this evening, tomorrow 9 AM) or an exact date. Reminders survive a browser restart and are announced with a desktop notification. |
| **Status tracking**                | To do, in progress, done, archived. Filter by status, with live counts per tab.                                                                                |
| **Edit, delete, undo**             | Inline editing, and deleting shows an Undo toast instead of a confirmation dialog.                                                                             |
| **Remembers what the badge means** | The toolbar badge counts reminders that have come due and are still unfinished.                                                                                |
| **Save a selection**               | Right-click any text → _Save selection to Notewisp_.                                                                                                           |
| **Search**                         | Instant filtering across note titles and bodies, including non-Latin scripts.                                                                                  |
| **Backup and restore**             | Export every note to JSON and import it back. Import merges rather than overwrites.                                                                            |
| **Themes**                         | Follows the operating system, or pin light/dark.                                                                                                               |

---

## Stack

| Concern    | Choice                                   | Why                                                                                                                               |
| ---------- | ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Framework  | [WXT](https://wxt.dev) 0.21              | Vite-based, generates the manifest, handles MV3 service workers and multi-browser builds. The current default for new extensions. |
| UI         | React 19 + TypeScript 5.9 (strict)       | —                                                                                                                                 |
| Styling    | Tailwind CSS v4                          | Semantic colour tokens (`--nw-*`) so themes are defined in one place.                                                             |
| Storage    | `chrome.storage.local`                   | `sync` caps items at 8 KB and the whole area at 100 KB; autosave would be unreliable there.                                       |
| Payments   | [ExtensionPay](https://extensionpay.com) | The Chrome Web Store stopped handling payments in 2021. ExtensionPay wraps Stripe with no backend to run.                         |
| Validation | Zod 4                                    | Repairing untrusted storage and import files.                                                                                     |
| Tests      | Vitest + `@webext-core/fake-browser`     | 230 tests, ~95% line coverage of the domain layer.                                                                                |

---

## Architecture

Three ideas shape the whole codebase.

**1. The domain layer has no framework in it.**
Everything in `src/lib/` (notes, limits, reminders, billing, migrations) is plain
TypeScript. No React, no `chrome.*` calls — browser access goes through a small
`StorageAdapter` interface. That is why ~95% of it can be tested in Node with no
browser, and why the logic is identical in the popup and the service worker.

**2. The background service worker is the only writer.**
Every mutation is a read-modify-write of the whole note collection. If the popup
and the worker both did that, one would silently clobber the other. So the popup
sends mutations over typed messaging and the worker performs them, serialised
through a write queue. It also means reminders and the badge stay in sync with
note changes automatically, because there is exactly one place that writes.

**3. The popup paints from local storage, then reconciles.**
Waiting for the service worker to wake up would put 50–100 ms in front of every
click. Instead the popup does one `chrome.storage.local` read (a couple of
milliseconds), renders immediately, and then replaces that state with the
authoritative version from the worker. A summary of that contract lives in
`src/lib/snapshot.ts`.

```
popup / options                     background service worker
─────────────────                   ─────────────────────────
read snapshot (1 storage call) ─┐
render instantly                │   owns all writes
                                │   schedules alarms
typed messaging ────────────────┴─► owns notifications + badge
(callBackground, never throws)      owns the entitlement cache
```

---

## Project structure

```
├─ public/icon/              16/32/48/128 px icons (generated, committed)
├─ scripts/generate-icons.mjs   source of truth for the icon artwork
├─ src/
│  ├─ entrypoints/
│  │  ├─ background.ts       service worker: writes, alarms, notifications, badge, billing
│  │  ├─ popup/              index.html + main.tsx (bootstrap) + App
│  │  └─ options/            index.html + main.tsx (full-page settings)
│  ├─ components/
│  │  ├─ common/             Button, Field, Icons, Menu, Modal, ToastHost
│  │  ├─ popup/              App, Header, NoteComposer, NoteList, NoteItem, PaywallModal, …
│  │  ├─ settings/           Account, Preferences, Data, About (shared by popup + options)
│  │  └─ options/OptionsApp.tsx
│  ├─ hooks/                 useNotes, useBilling, useDraft, useClock, useTheme, useToasts, …
│  ├─ lib/                   framework-free domain layer
│  │  ├─ billing/            BillingService, ExtensionPay adapter, plan + price formatting
│  │  ├─ notes/              types, zod schema, repository, limits, search, text, draft
│  │  ├─ reminders/          alarm scheduler and time helpers
│  │  ├─ storage/            adapter, chrome + memory implementations, migrations, write queue
│  │  └─ messaging.ts        the typed popup ⇄ worker protocol
│  ├─ locales/en.yml         all UI and manifest copy
│  └─ styles/tailwind.css    theme tokens
└─ tests/                    one folder per domain area + a popup render smoke test
```

---

## Getting started

Requires Node 20+ and pnpm 11+.

```bash
pnpm install
pnpm dev          # launches Chrome with the extension loaded and hot reload
```

Then click the Notewisp icon in the toolbar. (`pnpm dev:firefox` builds for
Firefox the same way.)

### Scripts

| Command                                                | What it does                                                 |
| ------------------------------------------------------ | ------------------------------------------------------------ |
| `pnpm dev`                                             | Dev server + auto-loading, HMR                               |
| `pnpm build`                                           | Production build into `.output/chrome-mv3`                   |
| `pnpm zip`                                             | Store-ready zip for the Chrome Web Store                     |
| `pnpm zip:firefox`                                     | Store-ready zip for Firefox                                  |
| `pnpm submit`                                          | Upload the built zip to the store (needs the env vars below) |
| `pnpm typecheck`                                       | `tsc --noEmit`                                               |
| `pnpm lint` / `pnpm lint:fix`                          | ESLint with type-aware rules                                 |
| `pnpm format` / `pnpm format:check`                    | Prettier                                                     |
| `pnpm test` / `pnpm test:watch` / `pnpm test:coverage` | Vitest                                                       |
| `pnpm verify`                                          | typecheck → lint → format → test → build                     |
| `pnpm icons`                                           | Regenerate the icons                                         |

### Loading a build manually

`pnpm build`, then `chrome://extensions` → enable Developer mode → **Load
unpacked** → select `.output/chrome-mv3`.

Two things surprise everyone the first time:

- **A loaded extension is not a window.** Nothing opens until you click its icon.
  If the icon is not already in the toolbar, click the puzzle-piece button
  (Extensions) next to the address bar and pin **Notewisp**. Then click the icon,
  or press `Ctrl+Shift+Y`.
- **After rebuilding, reload the extension.** Click the circular arrow on the
  extension card, otherwise Chrome keeps running the bundle it loaded first.

The fastest loop is `pnpm dev` instead: it builds, launches a Chrome window with
the extension already loaded, and hot-reloads on save — no manual loading step.

### A five-minute check that a build is alive

| Step                                                | What you should see                                         |
| --------------------------------------------------- | ----------------------------------------------------------- |
| Click the icon                                      | The popup opens with the composer already focused           |
| Type a line, press Enter                            | The note appears above the composer                         |
| Set a reminder → **Custom** → a minute or two ahead | A desktop notification, and a `1` badge on the toolbar icon |
| Create 10 notes, then an 11th                       | The paywall, quoting the same price as `PRO_PLAN`           |
| Right-click the icon → **Options**                  | Plan status, export/import, and "delete all data"           |

Reminders are scheduled only for **future** times (a past reminder would fire
instantly, so it is deliberately left to the badge instead), which is why the
checklist asks for a minute or two ahead rather than "now".

---

## Setting up payments

The 10-note limit is enforced in `src/lib/notes/limits.ts`; the paid plan is
declared in `src/lib/billing/plan.ts`; the provider binding is
`src/lib/billing/extpayClient.ts`. Nothing else needs to change.

1. **Register the ExtensionPay extension** under the id **`notewisp`** — the id
   this build already ships with. Sign up at
   [extensionpay.com](https://extensionpay.com); the id is a slug you choose
   there, unrelated to the Chrome Web Store id and to the `chrome://extensions`
   id. It only has to be unique on extensionpay.com.
2. **Keep the two in step.** Registered a different id? Put it in `.env`
   (`WXT_EXTPAY_ID`, see `.env.example`) or change `DEFAULT_EXTPAY_EXTENSION_ID`
   in `src/lib/billing/extpayClient.ts`. Until the id exists on extensionpay.com,
   the payment page 404s and nobody can pay you.
3. **Connect Stripe** in the ExtensionPay dashboard — that is where the money
   lands.
4. **Create the plan.** Add a recurring plan with nickname `monthly` at 1 USD /
   month. The nickname must match `PRO_PLAN.nickname`. A plan that drifts — renamed,
   or repriced — silently breaks checkout, because the code passes the nickname
   straight to the payment page and the UI prints `PRO_PLAN.amount` instead of
   asking the provider what it charges. Check the live configuration at
   `https://extensionpay.com/extension/<id>/api/v2/current-plans`, which should
   return exactly one plan with `nickname: "monthly"`, `unitAmountCents: 100`,
   `interval: "month"`.
5. **Keep the displayed price in step.** `PRO_PLAN.amount` and `currency` drive
   every price the UI shows, so the extension can never advertise an amount the
   provider will not charge.
6. **Test it.** In development ExtensionPay runs in test mode: use
   [Stripe test cards](https://docs.stripe.com/testing) and the "reset user
   status" link the library prints. A test purchase should unlock unlimited notes
   within a few seconds.
7. **Turn on as many payment methods as Stripe allows** — it is free revenue.

**Consider an annual plan too.** After Stripe's per-transaction fee, a monthly
$1 charge keeps roughly two thirds. The same revenue on a yearly plan pays that
fixed fee once, so an annual tier is worth adding once the extension has users.

### Swapping payment providers

`BillingClient` in `src/lib/billing/billingService.ts` is the only surface the app
depends on: `getUser`, `openPaymentPage`, `openLoginPage`. A provider change means
a new adapter file plus one line in `background.ts` — no changes to the paywall,
the limits, or the UI.

> **Licensing note.** The `extpay` package declares `AGPL-3.0-or-later` in its
> `package.json` (its `LICENSE` file says `LGPL-3.0`, and the source header says
> AGPLv3 — the three disagree), and both are copyleft licences. If you intend to
> ship this extension as closed source, review that obligation before publishing,
> or use the swap described above to drop the dependency. This is a note, not
> legal advice.

---

## Publishing to the Chrome Web Store

1. **Register** a developer account (one-off $5) at the
   [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole).
2. **Host the privacy policy.** `PRIVACY.md` is the text; publish it at a public
   URL and put that URL in `src/lib/constants.ts` (`PRIVACY_POLICY_URL`) and in the
   store listing. The store rejects submissions without a reachable policy.
3. **Prepare the listing** from `STORE_LISTING.md` — short and long descriptions,
   category, permission justifications, and the data-usage answers.
4. **Take screenshots.** 1280×800 (or 640×400) at least one, up to five. Capture
   the popup with a few notes, the reminder picker, and the paywall.
5. **Bump the version** in `package.json`; it is the manifest version.
6. `pnpm zip` and upload `notewisp-<version>-chrome.zip`.
7. **Expect review questions about payments.** Being able to point at the cancel
   path (Settings → Manage subscription) matters; it is already implemented.

For automated releases, add these repository secrets and push a tag:
`CHROME_EXTENSION_ID`, `CHROME_CLIENT_ID`, `CHROME_CLIENT_SECRET`,
`CHROME_REFRESH_TOKEN`.

---

## Permissions

The install prompt is deliberately boring, and the review is simple, because the
extension asks for as little as possible.

| Permission      | Why it is needed                                                             |
| --------------- | ---------------------------------------------------------------------------- |
| `storage`       | Notes, drafts, settings and the cached plan status are stored on the device. |
| `alarms`        | Fires a reminder at the time the user chose.                                 |
| `notifications` | Shows the reminder.                                                          |
| `contextMenus`  | Adds _Save selection to Notewisp_ to the right-click menu.                   |

No `host_permissions`. No `content_scripts`. The extension cannot read or change
any page you visit, and there is no analytics or telemetry of any kind.

---

## Privacy

Notes never leave the device. The only network request the extension ever makes is
to ExtensionPay, to check whether a subscription is active. The only personal data
involved — an email address — is collected by ExtensionPay and Stripe when someone
subscribes. See [PRIVACY.md](./PRIVACY.md).

---

## Design decisions worth knowing

- **Archived notes do not count toward the 10-note limit.** Archiving is how you
  get something out of the way; charging for it would be hostile.
- **Hitting the limit only blocks _creating_ notes.** Existing notes stay
  readable, editable and deletable forever. Locking someone out of their own data
  is the fastest route to a one-star review.
- **The limit is enforced in the service worker, inside the write queue**, so two
  fast saves cannot race past it. It is still client-side and a determined user can
  patch it out — as with any browser extension. The design goal is honesty with the
  majority, not DRM.
- **A paying user is never locked out by a network failure.** A failed entitlement
  check falls back to the last known value rather than assuming "not paid".
- **No `onPaid` content script.** ExtensionPay offers one, but it adds a "read your
  data on extensionpay.com" install warning. Instead the entitlement is re-checked
  (throttled) whenever the popup opens, which unlocks a completed payment on the
  next open with a much better install prompt.
- **One-shot alarms, reconciled on startup.** Chrome does not reliably keep alarms
  across a browser restart, so every alarm is rebuilt from stored notes on install
  and startup. Reminders that came due while the browser was closed are announced
  once, and `notifiedAt` makes that idempotent.
- **Import merges.** A restore that silently replaced existing notes would be a
  catastrophic failure mode.
- **Relative timestamps tick.** `useClock` drives them through
  `useSyncExternalStore`, because reading `Date.now()` during render is impure and
  would freeze labels for as long as the popup stayed open.

---

## License

MIT — see [LICENSE](./LICENSE). The bundled `extpay` dependency is under a
copyleft licence; see the note above.
