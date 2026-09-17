"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { CategoryShare } from "@/services/ai/types";

const COLORS = ["#22D3EE", "#F59E0B", "#F43F5E", "#A78BFA", "#34D399", "#94A3B8"];

export function CategoryDistributionChart({
  data,
}: {
  data: CategoryShare[];
}) {
  if (!data.length) {
    return (
      <p className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        Sem volume suficiente para montar o gráfico de queixas.
      </p>
    );
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis
            type="number"
            domain={[0, 100]}
            tickFormatter={(value) => `${value}%`}
            tick={{ fontSize: 12 }}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={110}
            tick={{ fontSize: 12 }}
          />
          <Tooltip
            formatter={(value) => [
              `${Number(value).toLocaleString("pt-BR")}%`,
              "Participação",
            ]}
          />
          <Bar dataKey="percentage" radius={[0, 6, 6, 0]} maxBarSize={28}>
            {data.map((entry, index) => (
              <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
