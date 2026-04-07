import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const target = path.join(root, "amplify_outputs.json");
const example = path.join(root, "amplify_outputs.example.json");

// Amplify Hosting sets AWS_APP_ID + AWS_BRANCH; backend phase must write amplify_outputs.json first.
if (process.env.AWS_APP_ID && process.env.AWS_BRANCH) {
  if (fs.existsSync(target)) {
    process.exit(0);
  }
  console.error(
    "[jkl-platform] amplify_outputs.json is missing after the backend phase. Check backend build logs in Amplify Console.",
  );
  process.exit(1);
}

if (!fs.existsSync(target) && fs.existsSync(example)) {
  fs.copyFileSync(example, target);
  console.log(
    "[jkl-platform] Created amplify_outputs.json from example. Run `npm run sandbox` with AWS credentials to deploy a real backend.",
  );
}
