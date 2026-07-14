"use client";

import { useState } from "react";
import { toast } from "sonner";
import type { MovementType, Product } from "@/lib/types";
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
import { createMovement } from "./actions";

export function MovementDialog({
  product,
  onClose,
}: {
  product: Product | null;
  onClose: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [type, setType] = useState<MovementType>("entrada");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!product) return;
    setSaving(true);

    const formData = new FormData(e.currentTarget);
    formData.set("product_id", product.id);
    formData.set("type", type);

    const result = await createMovement(formData);
    setSaving(false);

    if (result.ok) {
      toast.success("Movimiento registrado.");
      setType("entrada");
      onClose();
    } else {
      toast.error(result.error);
    }
  }

  return (
    <Dialog open={product !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Registrar movimiento</DialogTitle>
          <DialogDescription>
            {product
              ? `${product.name} — stock actual: ${product.stock}`
              : ""}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4" key={product?.id}>
          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select
              value={type}
              onValueChange={(v) => setType(v as MovementType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="entrada">Entrada (compra/reposición)</SelectItem>
                <SelectItem value="salida">Salida (merma/pérdida)</SelectItem>
                <SelectItem value="ajuste">Ajuste (corrección ±)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="quantity">
              {type === "ajuste" ? "Cantidad (± delta)" : "Cantidad"}
            </Label>
            <Input
              id="quantity"
              name="quantity"
              type="number"
              step="1"
              min={type === "ajuste" ? undefined : 1}
              required
            />
            {type === "ajuste" && (
              <p className="text-xs text-muted-foreground">
                Usa un número negativo para restar stock (ej: -3).
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="note">Nota</Label>
            <Input id="note" name="note" placeholder="Opcional" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Guardando…" : "Registrar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
