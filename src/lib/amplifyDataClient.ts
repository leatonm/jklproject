import type { Schema } from "../../amplify/data/resource";
import { generateClient } from "aws-amplify/data";

/** Typed AppSync client — use inside authenticated routes (Cognito user pool). */
export const amplifyDataClient = generateClient<Schema>();
