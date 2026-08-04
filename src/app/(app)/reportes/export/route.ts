import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function csvField(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  if (/[";\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

// Separador ";" y BOM para que Excel en español lo abra bien.
function toCsv(rows: unknown[][]): string {
  return "﻿" + rows.map((r) => r.map(csvField).join(";")).join("\n");
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const desde = params.get("desde") ?? "";
  const hasta = params.get("hasta") ?? "";
  const tipo = params.get("tipo") ?? "ventas";

  if (!DATE_RE.test(desde) || !DATE_RE.test(hasta)) {
    return NextResponse.json({ error: "Rango de fechas inválido" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  let csv: string;
  let filename: string;

  if (tipo === "gastos") {
    const { data: expenses } = await supabase
      .from("expenses")
      .select("*")
      .gte("expense_date", desde)
      .lte("expense_date", hasta)
      .order("expense_date");

    csv = toCsv([
      ["Fecha", "Categoría", "Descripción", "Monto"],
      ...(expenses ?? []).map((e) => [
        e.expense_date,
        e.category,
        e.description ?? "",
        e.amount,
      ]),
    ]);
    filename = `gastos_${desde}_${hasta}.csv`;
  } else {
    const { data: items } = await supabase
      .from("sale_items")
      .select("quantity, unit_price, unit_cost, products(name), sales!inner(sold_at, payment_method, shipping_cost, adjustment, adjustment_note)")
      .gte("sales.sold_at", desde + "T00:00:00")
      .lte("sales.sold_at", hasta + "T23:59:59.999")
      .order("sold_at", { referencedTable: "sales" });

    csv = toCsv([
      [
        "Fecha",
        "Producto",
        "Medio de pago",
        "Cantidad",
        "Precio unitario",
        "Costo unitario",
        "Subtotal",
        "Margen",
        "Envío",
        "Ajuste",
        "Motivo ajuste",
      ],
      ...(items ?? []).map((item) => {
        const sale = item.sales as unknown as {
          sold_at: string;
          payment_method: string;
          shipping_cost: number;
          adjustment: number;
          adjustment_note: string | null;
        };
        const product = item.products as unknown as {
          name: string;
        } | null;
        return [
          new Date(sale.sold_at).toLocaleString("es-CL", {
            timeZone: "America/Santiago",
          }),
          product?.name ?? "",
          sale.payment_method,
          item.quantity,
          item.unit_price,
          item.unit_cost,
          item.quantity * item.unit_price,
          item.quantity * (item.unit_price - item.unit_cost),
          sale.shipping_cost,
          sale.adjustment,
          sale.adjustment_note ?? "",
        ];
      }),
    ]);
    filename = `ventas_${desde}_${hasta}.csv`;
  }

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
