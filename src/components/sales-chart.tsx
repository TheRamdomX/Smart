"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCLP, formatDate } from "@/lib/format";

export type DayPoint = { date: string; total: number };

const compact = new Intl.NumberFormat("es-CL", {
  notation: "compact",
  maximumFractionDigits: 1,
});

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: DayPoint }[];
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-sm shadow-sm">
      <p className="text-muted-foreground">
        {formatDate(point.date + "T00:00:00")}
      </p>
      <p className="font-medium">{formatCLP(point.total)}</p>
    </div>
  );
}

export function SalesChart({ data }: { data: DayPoint[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 8, right: 8, bottom: 0, left: 8 }}
        >
          <CartesianGrid
            vertical={false}
            stroke="#e1e0d9"
            strokeWidth={1}
          />
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={{ stroke: "#c3c2b7" }}
            tick={{ fill: "#898781", fontSize: 11 }}
            tickFormatter={(d: string) => d.slice(8) + "/" + d.slice(5, 7)}
            interval={4}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fill: "#898781", fontSize: 11 }}
            tickFormatter={(v: number) => "$" + compact.format(v)}
            width={52}
          />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ fill: "rgba(42, 120, 214, 0.08)" }}
          />
          <Bar
            dataKey="total"
            fill="#2a78d6"
            radius={[4, 4, 0, 0]}
            maxBarSize={24}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
