"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import type { PaymentMethod, Product } from "@/lib/types";
import { formatCLP } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
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
import { createSale } from "./actions";

type Line = { product_id: string; quantity: number };

export function SaleDialog({
  open,
  products,
  onClose,
}: {
  open: boolean;
  products: Product[];
  onClose: () => void;
}) {
  const [lines, setLines] = useState<Line[]>([]);
  const [note, setNote] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("efectivo");
  const [saving, setSaving] = useState(false);

  const productById = useMemo(
    () => new Map(products.map((p) => [p.id, p])),
    [products]
  );

  const total = lines.reduce((acc, line) => {
    const p = productById.get(line.product_id);
    return acc + (p ? p.price * line.quantity : 0);
  }, 0);

  const availableProducts = products.filter(
    (p) => !lines.some((l) => l.product_id === p.id)
  );

  function addLine(productId: string) {
    setLines((prev) => [...prev, { product_id: productId, quantity: 1 }]);
  }

  function updateQuantity(productId: string, quantity: number) {
    setLines((prev) =>
      prev.map((l) => (l.product_id === productId ? { ...l, quantity } : l))
    );
  }

  function removeLine(productId: string) {
    setLines((prev) => prev.filter((l) => l.product_id !== productId));
  }

  function reset() {
    setLines([]);
    setNote("");
    setPaymentMethod("efectivo");
  }

  async function handleSubmit() {
    if (lines.length === 0) {
      toast.error("Agrega al menos un producto.");
      return;
    }
    for (const line of lines) {
      const p = productById.get(line.product_id);
      if (!p) continue;
      if (!Number.isInteger(line.quantity) || line.quantity <= 0) {
        toast.error(`Cantidad inválida para ${p.name}.`);
        return;
      }
      if (line.quantity > p.stock) {
        toast.error(
          `Stock insuficiente para ${p.name}: disponible ${p.stock}.`
        );
        return;
      }
    }

    setSaving(true);
    const result = await createSale({
      items: lines,
      payment_method: paymentMethod,
      note: note || undefined,
    });
    setSaving(false);

    if (result.ok) {
      toast.success(`Venta registrada por ${formatCLP(total)}.`);
      reset();
      onClose();
    } else {
      toast.error(result.error);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          reset();
          onClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nueva venta</DialogTitle>
          <DialogDescription>
            Agrega productos y cantidades. El stock se descuenta
            automáticamente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Agregar producto</Label>
            <Select
              value=""
              onValueChange={(v) => v && addLine(v)}
              disabled={availableProducts.length === 0}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    availableProducts.length === 0
                      ? "No quedan productos por agregar"
                      : "Selecciona un producto…"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {availableProducts.map((p) => (
                  <SelectItem key={p.id} value={p.id} disabled={p.stock === 0}>
                    {p.name} — {formatCLP(p.price)}
                    {p.stock === 0 ? " (sin stock)" : ` (stock: ${p.stock})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {lines.length > 0 && (
            <div className="space-y-2">
              {lines.map((line) => {
                const p = productById.get(line.product_id);
                if (!p) return null;
                return (
                  <div
                    key={line.product_id}
                    className="flex items-center gap-2 rounded-md border p-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{p.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatCLP(p.price)} · stock {p.stock}
                      </p>
                    </div>
                    <Input
                      type="number"
                      min={1}
                      max={p.stock}
                      value={line.quantity}
                      onChange={(e) =>
                        updateQuantity(
                          line.product_id,
                          Number(e.target.value)
                        )
                      }
                      className="w-20 text-right"
                    />
                    <span className="w-24 text-right text-sm font-medium">
                      {formatCLP(p.price * line.quantity)}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeLine(line.product_id)}
                    >
                      <Trash2 className="size-4 text-muted-foreground" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Medio de pago</Label>
              <Select
                value={paymentMethod}
                onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="efectivo">Efectivo</SelectItem>
                  <SelectItem value="transferencia">Transferencia</SelectItem>
                  <SelectItem value="tarjeta">Tarjeta</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sale-note">Nota</Label>
              <Input
                id="sale-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Opcional"
              />
            </div>
          </div>

          <Separator />
          <div className="flex items-center justify-between text-lg font-semibold">
            <span>Total</span>
            <span>{formatCLP(total)}</span>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              reset();
              onClose();
            }}
          >
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={saving || lines.length === 0}>
            {saving ? "Registrando…" : "Registrar venta"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
