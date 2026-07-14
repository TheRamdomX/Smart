"use client";

import { useState } from "react";
import { toast } from "sonner";
import { X } from "lucide-react";
import type { Settings } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { updateSettings } from "./actions";

function CategoryEditor({
  label,
  categories,
  onChange,
}: {
  label: string;
  categories: string[];
  onChange: (next: string[]) => void;
}) {
  const [draft, setDraft] = useState("");

  function add() {
    const value = draft.trim();
    if (!value) return;
    if (categories.some((c) => c.toLowerCase() === value.toLowerCase())) {
      toast.error("Esa categoría ya existe.");
      return;
    }
    onChange([...categories, value]);
    setDraft("");
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex flex-wrap gap-2">
        {categories.map((c) => (
          <Badge key={c} variant="secondary" className="gap-1 pr-1">
            {c}
            <button
              type="button"
              onClick={() => onChange(categories.filter((x) => x !== c))}
              className="rounded-full p-0.5 hover:bg-muted-foreground/20"
              aria-label={`Quitar ${c}`}
            >
              <X className="size-3" />
            </button>
          </Badge>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder="Nueva categoría…"
        />
        <Button type="button" variant="outline" onClick={add}>
          Agregar
        </Button>
      </div>
    </div>
  );
}

export function SettingsView({ settings }: { settings: Settings }) {
  const [businessName, setBusinessName] = useState(settings.business_name);
  const [minStock, setMinStock] = useState(String(settings.default_min_stock));
  const [productCategories, setProductCategories] = useState(
    settings.product_categories
  );
  const [expenseCategories, setExpenseCategories] = useState(
    settings.expense_categories
  );
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    const result = await updateSettings({
      business_name: businessName,
      default_min_stock: Number(minStock),
      product_categories: productCategories,
      expense_categories: expenseCategories,
    });
    setSaving(false);

    if (result.ok) {
      toast.success("Configuración guardada.");
    } else {
      toast.error(result.error);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">Configuración</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Negocio</CardTitle>
          <CardDescription>
            Datos generales que se usan en toda la aplicación.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="business_name">Nombre del negocio</Label>
            <Input
              id="business_name"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="currency">Moneda</Label>
              <Input id="currency" value="CLP — Peso chileno" disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="default_min_stock">
                Stock mínimo por defecto
              </Label>
              <Input
                id="default_min_stock"
                type="number"
                min="0"
                step="1"
                value={minStock}
                onChange={(e) => setMinStock(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Categorías</CardTitle>
          <CardDescription>
            Se usan en los formularios de productos y gastos. Quitar una
            categoría no afecta los registros existentes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <CategoryEditor
            label="Categorías de productos"
            categories={productCategories}
            onChange={setProductCategories}
          />
          <CategoryEditor
            label="Categorías de gastos"
            categories={expenseCategories}
            onChange={setExpenseCategories}
          />
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving}>
        {saving ? "Guardando…" : "Guardar cambios"}
      </Button>
    </div>
  );
}
