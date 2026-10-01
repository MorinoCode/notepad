import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'wxt';

/**
 * Notewisp — Manifest V3 extension.
 *
 * Design constraint: the extension requests **no host permissions** and injects
 * no content scripts into pages the user visits. The only permissions we ask for
 * are the ones the product genuinely needs. This keeps the Chrome Web Store
 * review simple and the install prompt non-scary.
 */
export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-react', '@wxt-dev/i18n/module'],

  manifest: {
    name: '__MSG_extName__',
    description: '__MSG_extDescription__',
    default_locale: 'en',
    permissions: ['storage', 'alarms', 'notifications', 'contextMenus', 'activeTab'],
    icons: {
      16: 'icon/16.png',
      32: 'icon/32.png',
      48: 'icon/48.png',
      128: 'icon/128.png',
    },
    action: {
      /*
       * A literal rather than `__MSG_actionTitle__`: this is only the tooltip for
       * the instant before the service worker runs, and the badge routine replaces
       * it with a localized string (`actionTitle` / `actionTitleWithDue`) on wake.
       * Keeping it a plain brand name avoids a localized value being baked into
       * the manifest for every locale at once.
       */
      default_title: 'Notewisp',
      default_icon: {
        16: 'icon/16.png',
        32: 'icon/32.png',
        48: 'icon/48.png',
        128: 'icon/128.png',
      },
    },
    commands: {
      // Ctrl/Cmd+Shift+Y opens the popup so a note can be captured without
      // reaching for the mouse. Chrome owns the description for `_execute_action`.
      _execute_action: {
        suggested_key: {
          default: 'Ctrl+Shift+Y',
          mac: 'Command+Shift+Y',
        },
      },
    },
  },

  vite: () => ({
    plugins: [tailwindcss()],
  }),

  zip: {
    artifactTemplate: '{{name}}-{{version}}-{{browser}}.zip',
    sourcesTemplate: '{{name}}-{{version}}-sources.zip',
    excludeSources: ['node_modules/**', '.output/**', 'coverage/**'],
  },
});
