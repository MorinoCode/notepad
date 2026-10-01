# Chrome Web Store listing

Copy-paste source for the store submission. Fill in the placeholders marked
`<...>` before submitting.

## Basic information

- **Name:** Notewisp — Notes & Reminders
- **Category:** Productivity
- **Language:** English
- **Short description** (max 132 characters):

  > Capture a note and a reminder in one click. Free for your first 10 notes, then unlimited for $1/month.

- **Homepage URL:** `<https://your-site.example/notewisp>`
- **Support URL:** `<https://github.com/your-handle/notewisp/issues>`
- **Privacy policy URL:** `<https://your-site.example/notewisp/privacy>` (must be
  publicly reachable; the text is in `PRIVACY.md`)

## Detailed description

> **A note in one click.**
>
> Click the Notewisp icon (or press Ctrl+Shift+Y), type, and press Enter. That is
> the whole flow — the popup opens already focused on the text box, so there is
> nothing to click before you start typing.
>
> **Never lose what you typed.** If the popup closes while you are mid-sentence, your
> text is still there when you come back. Every keystroke is saved as a draft.
>
> **Set a reminder, or don't.** One tap for "in an hour", "this evening" or
> "tomorrow 9 AM", or pick an exact time. Reminders survive restarts and show up as
> desktop notifications. The toolbar badge keeps count of overdue ones.
>
> **Keep track of what is done.** Every note has a status — to do, in progress,
> done, or archived — with filter tabs and live counts.
>
> **Find anything.** Search across all your notes as you type.
>
> **Fix mistakes.** Edit inline, skip the confirmation dialogs, and undo a delete
> from the toast that appears.
>
> **Back it up.** Export every note to a JSON file and import it whenever you want.
> Importing merges, so a restore can never overwrite what you already have.
>
> **Save a selection.** Right-click any text on a page and choose _Save selection to
> Notewisp_.
>
> **Light and dark**, following your system theme by default.
>
> **Private by design.** Your notes are stored on your device and are never
> uploaded. Notewisp requests no access to the websites you visit — it has no host
> permissions and injects no content scripts — and it contains no analytics or
> tracking of any kind.
>
> **Pricing.** Notewisp is free for your first 10 notes, with no time limit. If you
> want more, it is $1 per month for unlimited notes, and you can cancel any time from
> inside the extension. Archiving a note frees up its slot, and existing notes always
> stay accessible — the free limit only affects adding new ones.

## Permission justifications

Paste each answer into the corresponding field in the dashboard.

- **`storage`** — "Saves the user's notes, their settings, and a cached copy of
  whether their subscription is active. All of it stays on the user's device."
- **`alarms`** — "Fires the reminder the user explicitly set on a note at the time
  they chose."
- **`notifications`** — "Delivers that reminder as a desktop notification. This is
  the feature the user asked for when setting a reminder."
- **`contextMenus`** — "Provides a single right-click item, 'Save selection to
  Notewisp', so the user can turn selected text into a note."
- **`activeTab`** — "Provides an optional one-click button to insert the current page title and link into a note."
- **Remote code** — "No. All code is bundled in the extension package. The
  extension loads no remote scripts."
- **Host permissions** — none requested.

## Data usage disclosures

Answer the dashboard's data-type questions as follows:

- **Does the extension collect or use personal communications?** No.
- **Personally identifiable information?** The extension itself collects none. The
  payment provider (ExtensionPay / Stripe) collects an email address when a user
  subscribes. Declare **Authentication information** and/or **Financial and payment
  information** only if the dashboard requires the payment flow to be declared;
  otherwise answer "does not collect".
- **Health, financial, authentication, personal communications, location, web
  history, user activity, website content:** No.
- **Certify:** the extension does not sell or transfer data to third parties, does
  not use data for purposes unrelated to its single purpose, and does not use data
  to determine creditworthiness.

## Single purpose

> Notewisp has one purpose: capturing short notes from the browser toolbar and
> reminding the user about them.

## Screenshots to capture

1. The popup with three or four notes and the composer focused — the main use case.
2. The reminder picker open, with a reminder already set on a note.
3. The list filtered to "Done", showing status tabs and counts.
4. The paywall, showing the $1/month price and the free limit.
5. The settings page, showing plan status and the manage-subscription button.

Capture at 1280×800. The popup itself is 380×560, so place it on a plain background
rather than screenshotting the whole desktop.

## Promotional images

- **Small tile:** 440×280 — icon plus the words "Note it. Forget it."
- **Marquee:** 1400×560 — optional.

## Review notes for the reviewer

> Notewisp requests no host permissions and injects no content scripts; it cannot
> read or modify any website. Its only network request is to extensionpay.com to
> verify subscription status. To test the paid features, use a Stripe test card
> while the extension is in ExtensionPay test mode, or reach out and a test licence
> will be provided. Subscription cancellation is available inside the extension at
> Settings → Manage subscription.
