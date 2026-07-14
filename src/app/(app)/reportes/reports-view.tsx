"use client";

import { useRouter } from "next/navigation";
import { Download } from "lucide-react";
import { addDays, monthStartLocal, todayLocal } from "@/lib/dates";
import { formatCLP } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type ProfitSummary = {
  revenue: number;
  cogs: number;
  gross_profit: number;
  total_expenses: number;
  net_profit: number;
};

export type TopProduct = {
  product_id: string;
  name: string;
  units: number;
  revenue: number;
  profit: number;
};

export function ReportsView({
  summary,
  topProducts,
  desde,
  hasta,
}: {
  summary: ProfitSummary;
  topProducts: TopProduct[];
  desde: string;
  hasta: string;
}) {
  const router = useRouter();

  function setRange(from: string, to: string) {
    router.replace(`/reportes?desde=${from}&hasta=${to}`);
  }

  const today = todayLocal();
  const presets = [
    { label: "Este mes", from: monthStartLocal(), to: today },
    { label: "Últimos 7 días", from: addDays(today, -6), to: today },
    { label: "Últimos 30 días", from: addDays(today, -29), to: today },
    { label: "Últimos 90 días", from: addDays(today, -89), to: today },
  ];

  const rows = [
    { label: "Ingresos por ventas", value: summary.revenue },
    { label: "Costo de los productos vendidos", value: -summary.cogs },
    { label: "Ganancia bruta", value: summary.gross_profit, strong: true },
    { label: "Gastos del período", value: -summary.total_expenses },
    { label: "Ganancia neta", value: summary.net_profit, strong: true },
  ];

  const exportBase = `/reportes/export?desde=${desde}&hasta=${hasta}`;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Reportes</h1>

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Desde</label>
          <Input
            type="date"
            value={desde}
            max={hasta}
            onChange={(e) => e.target.value && setRange(e.target.value, hasta)}
            className="w-40"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Hasta</label>
          <Input
            type="date"
            value={hasta}
            min={desde}
            onChange={(e) => e.target.value && setRange(desde, e.target.value)}
            className="w-40"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {presets.map((p) => (
            <Button
              key={p.label}
              variant={
                desde === p.from && hasta === p.to ? "secondary" : "outline"
              }
              size="sm"
              onClick={() => setRange(p.from, p.to)}
            >
              {p.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ganancia del período</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3">
              {rows.map((row) => (
                <div
                  key={row.label}
                  className={`flex items-center justify-between ${
                    row.strong ? "border-t pt-3 font-semibold" : "text-sm"
                  }`}
                >
                  <dt className={row.strong ? "" : "text-muted-foreground"}>
                    {row.label}
                  </dt>
                  <dd
                    className={
                      row.strong && row.value < 0 ? "text-destructive" : ""
                    }
                  >
                    {formatCLP(row.value)}
                  </dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Productos más vendidos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No hay ventas en el período seleccionado.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead className="text-right">Unidades</TableHead>
                    <TableHead className="text-right">Ingresos</TableHead>
                    <TableHead className="text-right">Margen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topProducts.map((p) => (
                    <TableRow key={p.product_id}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {p.units}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCLP(p.revenue)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCLP(p.profit)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          render={<a href={`${exportBase}&tipo=ventas`} download />}
        >
          <Download className="size-4" />
          Exportar ventas (CSV)
        </Button>
        <Button
          variant="outline"
          render={<a href={`${exportBase}&tipo=gastos`} download />}
        >
          <Download className="size-4" />
          Exportar gastos (CSV)
        </Button>
      </div>
    </div>
  );
}
