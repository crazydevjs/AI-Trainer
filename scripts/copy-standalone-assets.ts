// Next.js's `output: "standalone"` deliberately excludes `public/` and
// `.next/static/` (see next.config.ts's comment) — its own docs say to
// copy them in as a build step. Done here with Node's fs (not a shell
// `cp -r`) so this works identically on Render's Linux build image and
// on a developer's Windows machine.
import { cpSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

const root = process.cwd();
const standalone = join(root, ".next", "standalone");

if (!existsSync(standalone)) {
  console.error("No .next/standalone found — did `next build` run with output: \"standalone\"?");
  process.exit(1);
}

cpSync(join(root, "public"), join(standalone, "public"), { recursive: true });

const staticDest = join(standalone, ".next", "static");
mkdirSync(staticDest, { recursive: true });
cpSync(join(root, ".next", "static"), staticDest, { recursive: true });

console.log("Copied public/ and .next/static/ into .next/standalone for deployment.");
