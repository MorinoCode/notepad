import { afterEach } from 'vitest';
import { browser } from 'wxt/browser';
import { fakeBrowser } from 'wxt/testing/fake-browser';

/*
 * `@webext-core/fake-browser` deliberately leaves `i18n.getMessage` unimplemented
 * (it would need a locale file loader), so it throws the moment a component asks
 * for a string.
 *
 * The stub returns the message key. That is enough for a render smoke test, and it
 * keeps the assertion surface honest: correctness of the keys themselves is
 * enforced at compile time, because `i18n.t` is typed against the generated
 * message union — a typo is a type error, not a runtime one.
 */
browser.i18n.getMessage = ((key: string) => key) as typeof browser.i18n.getMessage;

/**
 * Reset the mocked `chrome.*` implementation between tests.
 *
 * Without this, state written to the fake storage by one test leaks into the
 * next one and produces failures that depend on execution order.
 */
afterEach(() => {
  fakeBrowser.reset();
  browser.i18n.getMessage = ((key: string) => key) as typeof browser.i18n.getMessage;
});
