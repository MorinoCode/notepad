import { defineConfig } from 'vitest/config';
import { WxtVitest } from 'wxt/testing/vitest-plugin';

/**
 * The WXT Vitest plugin wires up the same aliases, globals and `chrome.*` mock
 * that the extension gets at runtime, so tests exercise the real module graph.
 */
export default defineConfig({
  // `WxtVitest()` is async and Vite accepts a promise inside `plugins`.
  plugins: [WxtVitest()],
  test: {
    environment: 'happy-dom',
    globals: true,
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    setupFiles: ['tests/setup.ts'],
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      include: ['src/lib/**/*.ts'],
      exclude: [
        // A thin binding over a third-party library; the logic it feeds into is
        // covered through BillingService instead.
        'src/lib/billing/extpayClient.ts',
        // Type-only module: it compiles away, so there is nothing to cover.
        'src/lib/util/types.ts',
      ],
      reporter: ['text', 'html'],
      thresholds: {
        lines: 85,
        statements: 85,
        functions: 85,
        branches: 80,
      },
    },
  },
});
