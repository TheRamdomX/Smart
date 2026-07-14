import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { addDays, monthStartLocal, todayLocal } from "@/lib/dates";
import { formatCLP } from "@/lib/format";
import type { Product } from "@/lib/types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SalesChart, type DayPoint } from "@/components/sales-chart";

export const dynamic = "force-dynamic";

type ProfitSummary = {
  revenue: number;
  cogs: number;
  gross_profit: number;
  total_expenses: number;
  net_profit: number;
};

export default async function DashboardPage() {
  const supabase = await createClient();

  const today = todayLocal();
  const monthStart = monthStartLocal();
  const chartStart = addDays(today, -29);

  const [summaryRes, lowStockRes, salesRes] = await Promise.all([
    supabase.rpc("profit_summary", {
      from_date: monthStart,
      to_date: today,
    }),
    supabase
      .from("products")
      .select("*")
      .eq("active", true)
      .order("stock")
      .limit(200),
    supabase
      .from("sales")
      .select("sold_at, total")
      .gte("sold_at", chartStart + "T00:00:00")
      .order("sold_at"),
  ]);

  const summary: ProfitSummary = summaryRes.data?.[0] ?? {
    revenue: 0,
    cogs: 0,
    gross_profit: 0,
    total_expenses: 0,
    net_profit: 0,
  };

  const lowStock = ((lowStockRes.data ?? []) as Product[]).filter(
    (p) => p.stock <= p.min_stock
  );

  // Ventas por día (hora de Chile), rellenando con cero los días sin ventas.
  const byDay = new Map<string, number>();
  for (const sale of salesRes.data ?? []) {
    const day = new Date(sale.sold_at).toLocaleDateString("en-CA", {
      timeZone: "America/Santiago",
    });
    byDay.set(day, (byDay.get(day) ?? 0) + Number(sale.total));
  }
  const chartData: DayPoint[] = [];
  for (let i = 0; i < 30; i++) {
    const day = addDays(chartStart, i);
    chartData.push({ date: day, total: byDay.get(day) ?? 0 });
  }

  const tiles = [
    { label: "Ingresos del mes", value: formatCLP(summary.revenue) },
    { label: "Ganancia bruta del mes", value: formatCLP(summary.gross_profit) },
    { label: "Gastos del mes", value: formatCLP(summary.total_expenses) },
    { label: "Ganancia neta del mes", value: formatCLP(summary.net_profit) },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((tile) => (
          <Card key={tile.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-normal text-muted-foreground">
                {tile.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{tile.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">
              Ventas — últimos 30 días
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SalesChart data={chartData} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="size-4 text-amber-600" />
              Stock bajo
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lowStock.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Todos los productos están sobre su stock mínimo.
              </p>
            ) : (
              <ul className="space-y-2">
                {lowStock.slice(0, 8).map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="truncate">{p.name}</span>
                    <Badge variant="destructive" className="ml-2 shrink-0">
                      {p.stock} / mín {p.min_stock}
                    </Badge>
                  </li>
                ))}
                {lowStock.length > 8 && (
                  <li>
                    <Link
                      href="/inventario"
                      className="text-sm text-muted-foreground underline"
                    >
                      Ver los {lowStock.length - 8} restantes en Inventario
                    </Link>
                  </li>
                )}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
