"use client";

import { useState } from "react";
import { toast } from "sonner";
import type { Product, Settings } from "@/lib/types";
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
import { createProduct, updateProduct } from "./actions";

export function ProductDialog({
  open,
  product,
  settings,
  onClose,
}: {
  open: boolean;
  product: Product | null;
  settings: Settings;
  onClose: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [category, setCategory] = useState<string | undefined>(undefined);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);

    const formData = new FormData(e.currentTarget);
    if (category) formData.set("category", category);

    const result = product
      ? await updateProduct(product.id, formData)
      : await createProduct(formData);

    setSaving(false);
    if (result.ok) {
      toast.success(product ? "Producto actualizado." : "Producto creado.");
      setCategory(undefined);
      onClose();
    } else {
      toast.error(result.error);
    }
  }

  const categories = settings?.product_categories ?? [];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {product ? "Editar producto" : "Nuevo producto"}
          </DialogTitle>
          <DialogDescription>
            {product
              ? "Modifica los datos del producto. El stock se cambia con movimientos."
              : "Completa los datos del producto. El stock inicial se registra luego con una entrada."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4" key={product?.id}>
          <div className="space-y-2">
            <Label htmlFor="name">Nombre *</Label>
            <Input
              id="name"
              name="name"
              defaultValue={product?.name ?? ""}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sku">SKU</Label>
              <Input id="sku" name="sku" defaultValue={product?.sku ?? ""} />
            </div>
            <div className="space-y-2">
              <Label>Categoría</Label>
              <Select
                value={category ?? product?.category ?? undefined}
                onValueChange={(v) => setCategory(v ?? undefined)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sin categoría" />
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
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cost">Costo (CLP) *</Label>
              <Input
                id="cost"
                name="cost"
                type="number"
                min="0"
                step="1"
                defaultValue={product?.cost ?? 0}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="price">Precio venta (CLP) *</Label>
              <Input
                id="price"
                name="price"
                type="number"
                min="0"
                step="1"
                defaultValue={product?.price ?? 0}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="min_stock">Stock mínimo (alerta)</Label>
            <Input
              id="min_stock"
              name="min_stock"
              type="number"
              min="0"
              step="1"
              defaultValue={product?.min_stock ?? settings?.default_min_stock ?? 5}
              required
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
