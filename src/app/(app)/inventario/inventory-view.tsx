"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { ImageIcon, Plus, Search } from "lucide-react";
import type { Product, Settings } from "@/lib/types";
import { formatCLP } from "@/lib/format";
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
import { ProductDialog } from "./product-dialog";
import { MovementDialog } from "./movement-dialog";
import { HistoryDialog } from "./history-dialog";
import { setProductActive } from "./actions";

export function InventoryView({
  products,
  settings,
}: {
  products: Product[];
  settings: Settings;
}) {
  const [query, setQuery] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [creating, setCreating] = useState(false);
  const [movementFor, setMovementFor] = useState<Product | null>(null);
  const [historyFor, setHistoryFor] = useState<Product | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      if (!showInactive && !p.active) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        (p.category ?? "").toLowerCase().includes(q)
      );
    });
  }, [products, query, showInactive]);

  async function handleToggleActive(product: Product) {
    const result = await setProductActive(product.id, !product.active);
    if (result.ok) {
      toast.success(
        product.active ? "Producto desactivado." : "Producto reactivado."
      );
    } else {
      toast.error(result.error);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Inventario</h1>
        <Button onClick={() => setCreating(true)}>
          <Plus className="size-4" />
          Nuevo producto
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o categoría…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="accent-primary"
          />
          Mostrar inactivos
        </label>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
          {products.length === 0
            ? "Aún no hay productos. Crea el primero con “Nuevo producto”."
            : "Ningún producto coincide con la búsqueda."}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-14">Foto</TableHead>
                <TableHead>Producto</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead className="text-right">Costo</TableHead>
                <TableHead className="text-right">Precio</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => (
                <TableRow key={p.id} className={p.active ? "" : "opacity-50"}>
                  <TableCell>
                    {p.image_url ? (
                      <Image
                        src={p.image_url}
                        alt={p.name}
                        width={40}
                        height={40}
                        unoptimized
                        className="size-10 rounded-md border object-cover"
                      />
                    ) : (
                      <div className="flex size-10 items-center justify-center rounded-md border border-dashed text-muted-foreground">
                        <ImageIcon className="size-4" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">
                    {p.name}
                    {!p.active && (
                      <Badge variant="outline" className="ml-2">
                        Inactivo
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {p.category ?? "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCLP(p.cost)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCLP(p.price)}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="tabular-nums">{p.stock}</span>
                    {p.stock <= p.min_stock && (
                      <Badge variant="destructive" className="ml-2">
                        Bajo
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setMovementFor(p)}
                      >
                        Movimiento
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setHistoryFor(p)}
                      >
                        Historial
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditing(p)}
                      >
                        Editar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground"
                        onClick={() => handleToggleActive(p)}
                      >
                        {p.active ? "Desactivar" : "Reactivar"}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <ProductDialog
        open={creating || editing !== null}
        product={editing}
        settings={settings}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
      />
      <MovementDialog
        product={movementFor}
        onClose={() => setMovementFor(null)}
      />
      <HistoryDialog product={historyFor} onClose={() => setHistoryFor(null)} />
    </div>
  );
}
