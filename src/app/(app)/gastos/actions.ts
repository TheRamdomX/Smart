"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "../inventario/actions";

const expenseSchema = z.object({
  amount: z.coerce.number().positive("El monto debe ser mayor que cero"),
  category: z.string().trim().min(1, "La categoría es obligatoria"),
  description: z.string().trim().optional(),
  expense_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
});

export async function createExpense(formData: FormData): Promise<ActionResult> {
  const parsed = expenseSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("expenses").insert({
    ...parsed.data,
    description: parsed.data.description || null,
  });

  if (error) {
    return { ok: false, error: "No se pudo registrar el gasto." };
  }

  revalidatePath("/gastos");
  revalidatePath("/");
  return { ok: true };
}

export async function updateExpense(
  id: string,
  formData: FormData
): Promise<ActionResult> {
  const parsed = expenseSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("expenses")
    .update({
      ...parsed.data,
      description: parsed.data.description || null,
    })
    .eq("id", id);

  if (error) {
    return { ok: false, error: "No se pudo actualizar el gasto." };
  }

  revalidatePath("/gastos");
  revalidatePath("/");
  return { ok: true };
}

export async function deleteExpense(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("expenses").delete().eq("id", id);

  if (error) {
    return { ok: false, error: "No se pudo eliminar el gasto." };
  }

  revalidatePath("/gastos");
  revalidatePath("/");
  return { ok: true };
}
