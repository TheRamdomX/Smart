"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import type { Expense, Settings } from "@/lib/types";
import { formatCLP, formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ExpenseDialog } from "./expense-dialog";
import { deleteExpense } from "./actions";

const ALL = "__todas__";

export function ExpensesView({
  expenses,
  settings,
  month,
  category,
}: {
  expenses: Expense[];
  settings: Settings;
  month: string;
  category: string | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);

  const total = expenses.reduce((acc, e) => acc + e.amount, 0);
  const categories = settings?.expense_categories ?? [];

  function setFilter(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.replace(`/gastos?${params.toString()}`);
  }

  async function handleDelete(expense: Expense) {
    if (!confirm(`¿Eliminar el gasto de ${formatCLP(expense.amount)}?`)) return;
    const result = await deleteExpense(expense.id);
    if (result.ok) {
      toast.success("Gasto eliminado.");
    } else {
      toast.error(result.error);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Gastos</h1>
        <Button onClick={() => setCreating(true)}>
          <Plus className="size-4" />
          Nuevo gasto
        </Button>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Mes</label>
          <Input
            type="month"
            value={month}
            onChange={(e) => setFilter("mes", e.target.value || null)}
            className="w-44"
          />
        </div>
        <div className="w-48 space-y-1">
          <label className="text-xs text-muted-foreground">Categoría</label>
          <Select
            value={category ?? ALL}
            onValueChange={(v) => setFilter("categoria", v === ALL ? null : v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todas</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="ml-auto text-right">
          <p className="text-xs text-muted-foreground">Total del período</p>
          <p className="text-lg font-semibold">{formatCLP(total)}</p>
        </div>
      </div>

      {expenses.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
          No hay gastos registrados en este período.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead className="text-right">Monto</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="whitespace-nowrap">
                    {formatDate(e.expense_date + "T00:00:00")}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{e.category}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {e.description ?? "—"}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCLP(e.amount)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditing(e)}
                      >
                        Editar
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(e)}
                      >
                        <Trash2 className="size-4 text-muted-foreground" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <ExpenseDialog
        open={creating || editing !== null}
        expense={editing}
        categories={categories}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
      />
    </div>
  );
}
