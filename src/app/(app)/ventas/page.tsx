import { createClient } from "@/lib/supabase/server";
import type { Product } from "@/lib/types";
import { SalesView, type SaleWithItems } from "./sales-view";

export const dynamic = "force-dynamic";

export default async function VentasPage() {
  const supabase = await createClient();

  const [{ data: sales }, { data: products }] = await Promise.all([
    supabase
      .from("sales")
      .select("*, sale_items(*, products(name))")
      .order("sold_at", { ascending: false })
      .limit(100),
    supabase
      .from("products")
      .select("*")
      .eq("active", true)
      .order("name"),
  ]);

  return (
    <SalesView
      sales={(sales ?? []) as SaleWithItems[]}
      products={(products ?? []) as Product[]}
    />
  );
}
