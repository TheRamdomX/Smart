"use client";

import { useEffect, useState } from "react";
import type { InventoryMovement, Product } from "@/lib/types";
import { formatDateTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const typeLabel: Record<string, { label: string; variant: "default" | "destructive" | "secondary" }> = {
  entrada: { label: "Entrada", variant: "default" },
  salida: { label: "Salida", variant: "destructive" },
  ajuste: { label: "Ajuste", variant: "secondary" },
};

export function HistoryDialog({
  product,
  onClose,
}: {
  product: Product | null;
  onClose: () => void;
}) {
  const [movements, setMovements] = useState<InventoryMovement[] | null>(null);

  useEffect(() => {
    if (!product) {
      setMovements(null);
      return;
    }
    const supabase = createClient();
    supabase
      .from("inventory_movements")
      .select("*")
      .eq("product_id", product.id)
      .order("created_at", { ascending: false })
      .limit(100)
      .then(({ data }) => setMovements((data ?? []) as InventoryMovement[]));
  }, [product]);

  return (
    <Dialog open={product !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Historial de movimientos</DialogTitle>
          <DialogDescription>
            {product ? `${product.name} — últimos 100 movimientos` : ""}
          </DialogDescription>
        </DialogHeader>
        {movements === null ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : movements.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Este producto aún no tiene movimientos.
          </p>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Cantidad</TableHead>
                  <TableHead>Nota</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movements.map((m) => {
                  const t = typeLabel[m.type];
                  return (
                    <TableRow key={m.id}>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {formatDateTime(m.created_at)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={t.variant}>{t.label}</Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {m.type === "salida" ? `-${m.quantity}` : m.quantity > 0 && m.type === "ajuste" ? `+${m.quantity}` : m.quantity}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {m.sale_id ? "Venta" : m.note ?? "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
