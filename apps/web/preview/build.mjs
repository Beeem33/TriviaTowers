/**
 * Builds a single self-contained HTML file of the game for sharing as a private preview
 * (e.g. a claude.ai artifact). Usage: node preview/build.mjs <output.html>
 *
 * Differences from the real site: hash routing, Google-hosted fonts, no server headers,
 * share links point at https://triviatowers.io.
 */
import { build } from "esbuild";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const web = path.resolve(here, "..");
const out = process.argv[2];
if (!out) throw new Error("Usage: node preview/build.mjs <output.html>");

const FONT_RENAMES = [
  [/"Fredoka Variable"/g, '"Fredoka"'],
  [/"Nunito Variable"/g, '"Nunito"'],
];
const rename = (s) => FONT_RENAMES.reduce((acc, [re, to]) => acc.replace(re, to), s);

// CSS: Tailwind over the real stylesheet, minus the self-hosted font imports.
const cssPath = path.join(web, "src/app/globals.css");
const cssSrc = (await readFile(cssPath, "utf8")).replace(/@import "@fontsource[^"]*";\n/g, "");
const css = rename((await postcss([tailwind({ base: web })]).process(cssSrc, { from: cssPath })).css);

// JS: one bundle, Next.js modules swapped for small shims.
const js = await build({
  entryPoints: [path.join(here, "main.tsx")],
  bundle: true,
  write: false,
  format: "iife",
  minify: true,
  target: "es2020",
  jsx: "automatic",
  absWorkingDir: web,
  tsconfig: path.join(web, "tsconfig.json"),
  alias: {
    "next/link": path.join(here, "shims/link.tsx"),
    "next/dynamic": path.join(here, "shims/dynamic.tsx"),
    "next/navigation": path.join(here, "shims/navigation.ts"),
  },
  define: {
    "process.env.NODE_ENV": '"production"',
    "process.env.NEXT_PUBLIC_SITE_URL": '"https://triviatowers.io"',
    // Preview frames block requests to other sites, so the preview always plays offline.
    "process.env.NEXT_PUBLIC_ONLINE": '"false"',
    "process.env.NEXT_PUBLIC_SUPABASE_URL": '""',
    "process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY": '""',
    // Anything else read from process.env is undefined in the browser.
    "process.env": "{}",
  },
  logLevel: "warning",
});
let code = rename(js.outputFiles[0].text);
if (/\bprocess\.env\b/.test(code.replace(/"[^"]*"/g, ""))) {
  throw new Error("Bundle still references process.env; add a define for it in preview/build.mjs");
}

// Inline the logo as a data URI and keep the script safe inside <script>.
const logo = await readFile(path.join(web, "public/logo-mark.svg"));
code = code.replaceAll('"/logo-mark.svg"', JSON.stringify(`data:image/svg+xml;base64,${logo.toString("base64")}`));
code = code.replace(/<\/script/gi, "<\\/script");

const html = `<title>TriviaTowers</title>
<meta name="description" content="Daily trivia where every correct answer adds a floor to your 3D tower.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fredoka:wght@400..700&family=Nunito:wght@400..900&display=swap">
<style>${css}
html, body { background: var(--sky-solid, #a9dcff); }
</style>
<div id="root"></div>
<script>${code}</script>
`;
await writeFile(out, html);
console.log(`Wrote ${out} (${(html.length / 1024 / 1024).toFixed(2)} MB)`);
