/**
 * Build-time environment variables exposed by Vite/WXT.
 *
 * Only `WXT_`-prefixed variables are injected into the bundle. Declaring them
 * keeps `import.meta.env.WXT_EXTPAY_ID` typed and documents the contract.
 */
interface ImportMetaEnv {
  /** ExtensionPay extension id. Falls back to a placeholder when unset. */
  readonly WXT_EXTPAY_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
