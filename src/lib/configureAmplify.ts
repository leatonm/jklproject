import { Amplify } from "aws-amplify";
import outputs from "../../amplify_outputs.json";

/** Call once before rendering the app (see main.tsx). */
export function configureAmplify() {
  Amplify.configure(outputs);
}
