import { createClient } from "@/lib/supabase/server";
import type { Expense, Settings } from "@/lib/types";
import { ExpensesView } from "./expenses-view";

export const dynamic = "force-dynamic";

export default async function GastosPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; categoria?: string }>;
}) {
  const { mes, categoria } = await searchParams;
  const supabase = await createClient();

  // Mes por defecto: el actual (YYYY-MM).
  const month = /^\d{4}-\d{2}$/.test(mes ?? "")
    ? mes!
    : new Date().toISOString().slice(0, 7);

  const [year, monthNum] = month.split("-").map(Number);
  const from = `${month}-01`;
  const to = new Date(Date.UTC(year, monthNum, 1)).toISOString().slice(0, 10);

  let query = supabase
    .from("expenses")
    .select("*")
    .gte("expense_date", from)
    .lt("expense_date", to)
    .order("expense_date", { ascending: false });

  if (categoria) {
    query = query.eq("category", categoria);
  }

  const [{ data: expenses }, { data: settings }] = await Promise.all([
    query,
    supabase.from("settings").select("*").single(),
  ]);

  return (
    <ExpensesView
      expenses={(expenses ?? []) as Expense[]}
      settings={settings as Settings}
      month={month}
      category={categoria ?? null}
    />
  );
}
