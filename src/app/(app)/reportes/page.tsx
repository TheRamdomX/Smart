import { createClient } from "@/lib/supabase/server";
import { monthStartLocal, todayLocal } from "@/lib/dates";
import { ReportsView, type ProfitSummary, type TopProduct } from "./reports-view";

export const dynamic = "force-dynamic";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export default async function ReportesPage({
  searchParams,
}: {
  searchParams: Promise<{ desde?: string; hasta?: string }>;
}) {
  const params = await searchParams;
  const desde = DATE_RE.test(params.desde ?? "") ? params.desde! : monthStartLocal();
  const hasta = DATE_RE.test(params.hasta ?? "") ? params.hasta! : todayLocal();

  const supabase = await createClient();
  const [summaryRes, topRes] = await Promise.all([
    supabase.rpc("profit_summary", { from_date: desde, to_date: hasta }),
    supabase.rpc("top_products", {
      from_date: desde,
      to_date: hasta,
      limit_count: 10,
    }),
  ]);

  const summary: ProfitSummary = summaryRes.data?.[0] ?? {
    revenue: 0,
    cogs: 0,
    gross_profit: 0,
    total_expenses: 0,
    net_profit: 0,
  };

  return (
    <ReportsView
      summary={summary}
      topProducts={(topRes.data ?? []) as TopProduct[]}
      desde={desde}
      hasta={hasta}
    />
  );
}
