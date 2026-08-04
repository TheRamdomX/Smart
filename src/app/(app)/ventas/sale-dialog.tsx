"use client";

import { useCallback, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import { ScanLine, Trash2 } from "lucide-react";
import type { PaymentMethod, Product } from "@/lib/types";
import { formatCLP } from "@/lib/format";

const QrScanner = dynamic(
  () =>
    import("@/components/barcode/qr-scanner").then((m) => ({
      default: m.QrScanner,
    })),
  { ssr: false }
);
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
  const [shippingCost, setShippingCost] = useState(0);
  const [adjustment, setAdjustment] = useState(0);
  const [adjustmentNote, setAdjustmentNote] = useState("");
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);

  const productById = useMemo(
    () => new Map(products.map((p) => [p.id, p])),
    [products]
  );

  function effectivePrice(p: Product) {
    return p.offer_price != null ? p.offer_price : p.price;
  }

  const subtotal = lines.reduce((acc, line) => {
    const p = productById.get(line.product_id);
    return acc + (p ? effectivePrice(p) * line.quantity : 0);
  }, 0);

  const total = subtotal + shippingCost + adjustment;

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
    setShippingCost(0);
    setAdjustment(0);
    setAdjustmentNote("");
    setScanning(false);
  }

  const handleScan = useCallback(
    (decodedText: string) => {
      setScanning(false);
      const scannedSku = decodedText.trim();
      const product = products.find((p) => p.sku === scannedSku);

      if (!product) {
        toast.error(`No se encontro un producto con SKU ${scannedSku}.`);
        return;
      }
      if (!product.active) {
        toast.error(`El producto "${product.name}" esta inactivo.`);
        return;
      }

      setLines((prev) => {
        const existing = prev.find((l) => l.product_id === product.id);
        if (existing) {
          if (existing.quantity + 1 > product.stock) {
            toast.error(
              `Stock insuficiente para ${product.name}: disponible ${product.stock}.`
            );
            return prev;
          }
          toast.success(
            `${product.name} — cantidad: ${existing.quantity + 1}`
          );
          return prev.map((l) =>
            l.product_id === product.id
              ? { ...l, quantity: l.quantity + 1 }
              : l
          );
        }
        if (product.stock === 0) {
          toast.error(`${product.name} no tiene stock disponible.`);
          return prev;
        }
        toast.success(`${product.name} agregado a la venta.`);
        return [...prev, { product_id: product.id, quantity: 1 }];
      });
    },
    [products]
  );

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
      shipping_cost: shippingCost,
      adjustment,
      adjustment_note: adjustmentNote || undefined,
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
            <div className="flex gap-2">
              <Select
                value=""
                onValueChange={(v) => v && addLine(v)}
                disabled={availableProducts.length === 0}
              >
                <SelectTrigger className="flex-1">
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
                      {p.name} — {formatCLP(effectivePrice(p))}
                      {p.offer_price != null && " (oferta)"}
                      {p.stock === 0 ? " (sin stock)" : ` (stock: ${p.stock})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant={scanning ? "secondary" : "outline"}
                size="icon"
                onClick={() => setScanning(!scanning)}
                title="Escanear codigo QR"
              >
                <ScanLine className="size-4" />
              </Button>
            </div>
          </div>

          {scanning && (
            <div className="space-y-2">
              <QrScanner active={scanning} onScan={handleScan} />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={() => setScanning(false)}
              >
                Cerrar escaner
              </Button>
            </div>
          )}

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
                        {p.offer_price != null ? (
                          <>
                            <span className="text-green-600 dark:text-green-400">{formatCLP(p.offer_price)}</span>
                            {" "}
                            <span className="line-through">{formatCLP(p.price)}</span>
                          </>
                        ) : (
                          formatCLP(p.price)
                        )}
                        {" · stock "}{p.stock}
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
                      {formatCLP(effectivePrice(p) * line.quantity)}
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="shipping-cost">Envío (CLP)</Label>
              <Input
                id="shipping-cost"
                type="number"
                min="0"
                step="1"
                value={shippingCost}
                onChange={(e) => setShippingCost(Math.max(0, Number(e.target.value) || 0))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="adjustment">Ajuste (CLP)</Label>
              <Input
                id="adjustment"
                type="number"
                step="1"
                value={adjustment}
                onChange={(e) => setAdjustment(Number(e.target.value) || 0)}
              />
              <p className="text-xs text-muted-foreground">
                Negativo = descuento, positivo = cargo extra
              </p>
            </div>
          </div>
          {adjustment !== 0 && (
            <div className="space-y-2">
              <Label htmlFor="adjustment-note">Motivo del ajuste</Label>
              <Input
                id="adjustment-note"
                value={adjustmentNote}
                onChange={(e) => setAdjustmentNote(e.target.value)}
                placeholder="Ej: Descuento por volumen, cargo especial…"
              />
            </div>
          )}

          <Separator />
          {(shippingCost > 0 || adjustment !== 0) && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Subtotal productos</span>
              <span>{formatCLP(subtotal)}</span>
            </div>
          )}
          {shippingCost > 0 && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Envío</span>
              <span>{formatCLP(shippingCost)}</span>
            </div>
          )}
          {adjustment !== 0 && (
            <div className={`flex items-center justify-between text-sm ${adjustment < 0 ? "text-red-600 dark:text-red-400" : "text-muted-foreground"}`}>
              <span>Ajuste{adjustmentNote ? `: ${adjustmentNote}` : ""}</span>
              <span>{adjustment > 0 ? "+" : ""}{formatCLP(adjustment)}</span>
            </div>
          )}
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
