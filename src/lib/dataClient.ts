import { generateClient } from "aws-amplify/data";
import type { Schema } from "../../amplify/data/resource";

/** GraphQL Data client — use after Amplify is configured and user is signed in. */
export const dataClient = generateClient<Schema>();
