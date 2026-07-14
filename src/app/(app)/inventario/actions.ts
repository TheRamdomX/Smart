"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const productSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio"),
  sku: z.string().trim().optional(),
  category: z.string().trim().optional(),
  cost: z.coerce.number().min(0, "El costo no puede ser negativo"),
  price: z.coerce.number().min(0, "El precio no puede ser negativo"),
  min_stock: z.coerce.number().int().min(0, "El stock mínimo no puede ser negativo"),
});

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function createProduct(formData: FormData): Promise<ActionResult> {
  const parsed = productSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("products").insert({
    ...parsed.data,
    sku: parsed.data.sku || null,
    category: parsed.data.category || null,
  });

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "Ya existe un producto con ese SKU." };
    }
    return { ok: false, error: "No se pudo crear el producto." };
  }

  revalidatePath("/inventario");
  return { ok: true };
}

export async function updateProduct(
  id: string,
  formData: FormData
): Promise<ActionResult> {
  const parsed = productSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("products")
    .update({
      ...parsed.data,
      sku: parsed.data.sku || null,
      category: parsed.data.category || null,
    })
    .eq("id", id);

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "Ya existe un producto con ese SKU." };
    }
    return { ok: false, error: "No se pudo actualizar el producto." };
  }

  revalidatePath("/inventario");
  return { ok: true };
}

export async function setProductActive(
  id: string,
  active: boolean
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("products")
    .update({ active })
    .eq("id", id);

  if (error) {
    return { ok: false, error: "No se pudo cambiar el estado del producto." };
  }

  revalidatePath("/inventario");
  return { ok: true };
}

const movementSchema = z.object({
  product_id: z.string().uuid(),
  type: z.enum(["entrada", "salida", "ajuste"]),
  quantity: z.coerce.number().int().refine((n) => n !== 0, "La cantidad no puede ser cero"),
  note: z.string().trim().optional(),
});

export async function createMovement(formData: FormData): Promise<ActionResult> {
  const parsed = movementSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }

  const { type, quantity } = parsed.data;
  if (type !== "ajuste" && quantity <= 0) {
    return { ok: false, error: "La cantidad debe ser mayor que cero." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("inventory_movements").insert({
    ...parsed.data,
    note: parsed.data.note || null,
  });

  if (error) {
    if (error.code === "23514") {
      return {
        ok: false,
        error: "El movimiento dejaría el stock en negativo.",
      };
    }
    return { ok: false, error: "No se pudo registrar el movimiento." };
  }

  revalidatePath("/inventario");
  return { ok: true };
}
