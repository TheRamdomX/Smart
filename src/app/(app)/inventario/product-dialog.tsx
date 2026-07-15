"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { ImageIcon, X } from "lucide-react";
import type { Product, Settings } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
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

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

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
  const [category, setCategory] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setCategory(product?.category ?? null);
      setPhotoFile(null);
      setPhotoPreview(product?.image_url ?? null);
    }
  }, [open, product]);

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("El archivo debe ser una imagen.");
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      toast.error("La foto no puede superar los 5 MB.");
      return;
    }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  function removePhoto() {
    setPhotoFile(null);
    setPhotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);

    const formData = new FormData(e.currentTarget);
    if (category) formData.set("category", category);

    // La foto se sube a Storage desde el navegador; a la acción solo viaja la URL.
    let imageUrl = photoFile ? null : photoPreview;
    if (photoFile) {
      const supabase = createClient();
      const ext = photoFile.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from("productos")
        .upload(path, photoFile);

      if (error) {
        toast.error("No se pudo subir la foto. Intenta de nuevo.");
        setSaving(false);
        return;
      }
      imageUrl = supabase.storage.from("productos").getPublicUrl(path)
        .data.publicUrl;
    }
    if (imageUrl) formData.set("image_url", imageUrl);

    const result = product
      ? await updateProduct(product.id, formData)
      : await createProduct(formData);

    setSaving(false);
    if (result.ok) {
      toast.success(product ? "Producto actualizado." : "Producto creado.");
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

          <div className="space-y-2">
            <Label htmlFor="photo">Foto</Label>
            <div className="flex items-center gap-3">
              {photoPreview ? (
                <div className="relative">
                  <Image
                    src={photoPreview}
                    alt="Foto del producto"
                    width={64}
                    height={64}
                    unoptimized
                    className="size-16 rounded-md border object-cover"
                  />
                  <button
                    type="button"
                    onClick={removePhoto}
                    className="absolute -right-2 -top-2 rounded-full border bg-background p-0.5 shadow-sm hover:bg-muted"
                    aria-label="Quitar foto"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ) : (
                <div className="flex size-16 items-center justify-center rounded-md border border-dashed text-muted-foreground">
                  <ImageIcon className="size-6" />
                </div>
              )}
              <div className="flex-1">
                <Input
                  id="photo"
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  JPG, PNG o WebP, máximo 5 MB.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Categoría</Label>
            <Select value={category} onValueChange={setCategory}>
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
