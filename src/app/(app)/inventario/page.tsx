import { createClient } from "@/lib/supabase/server";
import type { Product, Settings } from "@/lib/types";
import { InventoryView } from "./inventory-view";

export const dynamic = "force-dynamic";

export default async function InventarioPage() {
  const supabase = await createClient();

  const [{ data: products }, { data: settings }] = await Promise.all([
    supabase.from("products").select("*").order("name"),
    supabase.from("settings").select("*").single(),
  ]);

  return (
    <InventoryView
      products={(products ?? []) as Product[]}
      settings={settings as Settings}
    />
  );
}
