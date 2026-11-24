import { json } from "@/lib/connect/http";
import { LULU_PAGES, LULU_SKUS, luluSandbox, printOrderingConfigured, SHIPPING_LEVELS } from "@/lib/order";

export function GET() {
  return json({ enabled: printOrderingConfigured(), sandbox: luluSandbox(), sizes: Object.keys(LULU_SKUS), pages: LULU_PAGES, levels: SHIPPING_LEVELS });
}
