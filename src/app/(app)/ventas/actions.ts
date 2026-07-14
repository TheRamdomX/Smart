"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "../inventario/actions";

const saleSchema = z.object({
  items: z
    .array(
      z.object({
        product_id: z.string().uuid(),
        quantity: z.number().int().positive(),
      })
    )
    .min(1, "Agrega al menos un producto a la venta"),
  note: z.string().trim().optional(),
});

export type SaleInput = z.infer<typeof saleSchema>;

export async function createSale(input: SaleInput): Promise<ActionResult> {
  const parsed = saleSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_sale", {
    items: parsed.data.items,
    sale_note: parsed.data.note || null,
  });

  if (error) {
    // Los RAISE EXCEPTION de create_sale llegan como message legible.
    return { ok: false, error: error.message };
  }

  revalidatePath("/ventas");
  revalidatePath("/inventario");
  revalidatePath("/");
  return { ok: true };
}
