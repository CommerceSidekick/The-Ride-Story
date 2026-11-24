import { PROVIDERS, statusOf } from "@/lib/connect/registry";
import { json } from "@/lib/connect/http";

/** Which services this deployment has keys for, and which ones this browser is connected to. */
export async function GET() {
  return json({ providers: await Promise.all(PROVIDERS.map(statusOf)) });
}
