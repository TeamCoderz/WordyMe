/// <reference types="vite/client" />

interface ViteTypeOptions {
  strictImportMetaEnv: true;
}

interface ImportMetaEnv {
  readonly VITE_BACKEND_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
