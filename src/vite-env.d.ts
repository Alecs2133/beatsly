/// <reference types="vite/client" />

/** Injectat de vite.config.ts din package.json — vezi `define`. */
declare const __APP_VERSION__: string;

/** Prefixul vechi din WebKit — WKWebView-ul de pe macOS-uri mai vechi n-are `AudioContext` nativ. */
interface Window {
  webkitAudioContext?: typeof AudioContext;
}
