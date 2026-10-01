# Notewisp Privacy Policy

_Last updated: 2026_

Notewisp is a note-taking extension for Chrome. This policy explains exactly what
it does and does not do with your information. It is deliberately short, because
the extension does very little.

## The short version

Your notes stay on your device. Notewisp has no server, no analytics, and no
tracking. The only personal information involved at all is the email address you
provide to the payment provider if you subscribe.

## What Notewisp stores, and where

Everything below is stored locally using `chrome.storage.local`, a storage area
that is private to your browser profile on your computer. None of it is uploaded
anywhere.

- The text of your notes, their status and whether they are pinned
- Reminder times
- Your settings (theme, default status, whether notifications are on)
- Unsaved composer text, so a closed popup does not lose what you typed
- A cached copy of whether your subscription is active, and when it was last checked

Uninstalling the extension deletes all of it. Settings → **Delete all data** clears
it immediately.

## Network requests

Notewisp makes exactly one kind of network request: it contacts
[ExtensionPay](https://extensionpay.com) to check whether a subscription is
active.

- This happens when the popup opens (rate-limited to at most once every 30 seconds)
  and when you press **Refresh plan status**.
- The request contains no note content, no browsing history, and nothing about the
  pages you visit. It identifies your installation so that an entitlement can be
  returned.
- If the request fails, Notewisp keeps working offline with the last known status.

Notewisp does not load remote code, remote fonts, or any advertising.

## Payments

Subscriptions are handled by ExtensionPay, which processes cards through
[Stripe](https://stripe.com). If you subscribe:

- The email address you enter is stored by ExtensionPay so that your subscription
  can be recognised on a new device or after reinstalling.
- Your card details go directly to Stripe. Notewisp never sees or stores them.
- The extension stores only a cached "is this subscription active" flag and the
  email address associated with it.
- ExtensionPay's own privacy policy governs the data they hold:
  <https://extensionpay.com/privacy>.

You can cancel at any time from **Settings → Manage subscription**, which opens the
ExtensionPay subscription management page.

## What Notewisp does not do

- It does not read, modify, or transmit the contents of any web page. It requests
  no host permissions and injects no content scripts.
- It does not collect analytics, telemetry, crash reports, or usage statistics.
- It does not build a profile of you, and it does not sell or share data with
  anyone. There is no data to sell.
- It does not use cookies, fingerprinting, or advertising identifiers.

## The one exception you should know about

The right-click menu item **Save selection to Notewisp** reads the text you have
selected at the moment you click it. Chrome provides that text to the extension
through the context-menu API. It is used only to create the note you asked for.

## Permissions, and why each is requested

| Permission      | Purpose                                                          |
| --------------- | ---------------------------------------------------------------- |
| `storage`       | Save your notes, settings and cached plan status on this device. |
| `alarms`        | Fire a reminder at the time you chose.                           |
| `notifications` | Show that reminder as a desktop notification.                    |
| `contextMenus`  | Add _Save selection to Notewisp_ to the right-click menu.        |

Notewisp requests **no host permissions**, which means it has no ability to read
or alter any website.

## Children

Notewisp is a general-purpose productivity tool and is not directed at children.

## Changes to this policy

If this policy changes, the updated version will be published at this URL and the
change will be noted in the extension's changelog.

## Contact

Questions about this policy: `privacy@example.com` — replace this with a real
address before publishing.
