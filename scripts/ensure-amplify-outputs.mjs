import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const target = path.join(root, "amplify_outputs.json");
const example = path.join(root, "amplify_outputs.example.json");

// Local dev only: copy a placeholder so `npm run build` can typecheck before first sandbox.
// Amplify Hosting uses `npm ci --ignore-scripts` + `ampx generate outputs` (see amplify.yml) — do not rely on this script in CI.
if (!fs.existsSync(target) && fs.existsSync(example)) {
  fs.copyFileSync(example, target);
  console.log(
    "[jkl-platform] Created amplify_outputs.json from example. Run `npm run sandbox` with AWS credentials for a real backend.",
  );
}
