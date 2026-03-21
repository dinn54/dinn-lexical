// @ts-ignore - prismjs default export typing is incomplete in this setup.
import Prism from "prismjs";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-jsx";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-tsx";
import "prismjs/components/prism-markup";
import "prismjs/components/prism-css";
import "prismjs/components/prism-json";
import "prismjs/components/prism-markdown";
import "prismjs/components/prism-bash";

let prismInitialized = false;

export function setupPrism(): void {
  if (prismInitialized) {
    return;
  }

  const prismTarget = globalThis as typeof globalThis & { Prism?: typeof Prism };
  prismTarget.Prism = Prism;

  if (Prism.languages.tsx) {
    Prism.languages.typescript = Prism.languages.tsx;
    Prism.languages.ts = Prism.languages.tsx;
  }

  if (Prism.languages.jsx) {
    Prism.languages.javascript = Prism.languages.jsx;
    Prism.languages.js = Prism.languages.jsx;
  }

  if (Prism.languages.markup) {
    Prism.languages.html = Prism.languages.markup;
    Prism.languages.xml = Prism.languages.markup;
  }

  if (Prism.languages.bash) {
    Prism.languages.shell = Prism.languages.bash;
    Prism.languages.sh = Prism.languages.bash;
  }

  prismInitialized = true;
}
