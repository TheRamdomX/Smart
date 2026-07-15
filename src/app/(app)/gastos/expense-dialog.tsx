"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { Expense } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { todayLocal } from "@/lib/dates";
import { createExpense, updateExpense } from "./actions";

export function ExpenseDialog({
  open,
  expense,
  categories,
  onClose,
}: {
  open: boolean;
  expense: Expense | null;
  categories: string[];
  onClose: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [category, setCategory] = useState<string | null>(null);

  useEffect(() => {
    if (open) setCategory(expense?.category ?? null);
  }, [open, expense]);

  const today = todayLocal();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);

    const formData = new FormData(e.currentTarget);
    if (!category) {
      toast.error("Selecciona una categoría.");
      setSaving(false);
      return;
    }
    formData.set("category", category);

    const result = expense
      ? await updateExpense(expense.id, formData)
      : await createExpense(formData);

    setSaving(false);
    if (result.ok) {
      toast.success(expense ? "Gasto actualizado." : "Gasto registrado.");
      onClose();
    } else {
      toast.error(result.error);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{expense ? "Editar gasto" : "Nuevo gasto"}</DialogTitle>
          <DialogDescription>
            Registra un gasto del negocio para descontarlo de la ganancia neta.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4" key={expense?.id}>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Monto (CLP) *</Label>
              <Input
                id="amount"
                name="amount"
                type="number"
                min="1"
                step="1"
                defaultValue={expense?.amount ?? ""}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expense_date">Fecha *</Label>
              <Input
                id="expense_date"
                name="expense_date"
                type="date"
                defaultValue={expense?.expense_date ?? today}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Categoría *</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona…" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Input
              id="description"
              name="description"
              defaultValue={expense?.description ?? ""}
              placeholder="Opcional"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Guardando…" : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
