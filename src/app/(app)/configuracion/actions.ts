"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "../inventario/actions";

const settingsSchema = z.object({
  business_name: z.string().trim().min(1, "El nombre del negocio es obligatorio"),
  default_min_stock: z.coerce
    .number()
    .int()
    .min(0, "El stock mínimo no puede ser negativo"),
  product_categories: z.array(z.string().trim().min(1)).min(1, "Debe haber al menos una categoría de productos"),
  expense_categories: z.array(z.string().trim().min(1)).min(1, "Debe haber al menos una categoría de gastos"),
});

export type SettingsInput = z.infer<typeof settingsSchema>;

export async function updateSettings(input: SettingsInput): Promise<ActionResult> {
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("settings")
    .update(parsed.data)
    .eq("id", 1);

  if (error) {
    return { ok: false, error: "No se pudo guardar la configuración." };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}
