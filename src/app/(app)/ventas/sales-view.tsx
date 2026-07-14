"use client";

import { Fragment, useState } from "react";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";
import type { Product, Sale, SaleItem } from "@/lib/types";
import { formatCLP, formatDateTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SaleDialog } from "./sale-dialog";

export type SaleWithItems = Sale & {
  sale_items: (SaleItem & { products: { name: string } | null })[];
};

export function SalesView({
  sales,
  products,
}: {
  sales: SaleWithItems[];
  products: Product[];
}) {
  const [creating, setCreating] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Ventas</h1>
        <Button onClick={() => setCreating(true)}>
          <Plus className="size-4" />
          Nueva venta
        </Button>
      </div>

      {sales.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
          Aún no hay ventas registradas.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead>Fecha</TableHead>
                <TableHead>Productos</TableHead>
                <TableHead>Nota</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sales.map((sale) => {
                const isOpen = expanded === sale.id;
                const itemCount = sale.sale_items.reduce(
                  (acc, i) => acc + i.quantity,
                  0
                );
                return (
                  <Fragment key={sale.id}>
                    <TableRow
                      className="cursor-pointer"
                      onClick={() => setExpanded(isOpen ? null : sale.id)}
                    >
                      <TableCell>
                        {isOpen ? (
                          <ChevronDown className="size-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="size-4 text-muted-foreground" />
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {formatDateTime(sale.sold_at)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {itemCount} {itemCount === 1 ? "unidad" : "unidades"} ·{" "}
                        {sale.sale_items.length}{" "}
                        {sale.sale_items.length === 1 ? "producto" : "productos"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {sale.note ?? "—"}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCLP(sale.total)}
                      </TableCell>
                    </TableRow>
                    {isOpen && (
                      <TableRow className="bg-muted/30 hover:bg-muted/30">
                        <TableCell />
                        <TableCell colSpan={4} className="py-3">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Producto</TableHead>
                                <TableHead className="text-right">
                                  Cantidad
                                </TableHead>
                                <TableHead className="text-right">
                                  Precio unit.
                                </TableHead>
                                <TableHead className="text-right">
                                  Subtotal
                                </TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {sale.sale_items.map((item) => (
                                <TableRow key={item.id}>
                                  <TableCell>
                                    {item.products?.name ?? "Producto eliminado"}
                                  </TableCell>
                                  <TableCell className="text-right tabular-nums">
                                    {item.quantity}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {formatCLP(item.unit_price)}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {formatCLP(item.unit_price * item.quantity)}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <SaleDialog
        open={creating}
        products={products}
        onClose={() => setCreating(false)}
      />
    </div>
  );
}
