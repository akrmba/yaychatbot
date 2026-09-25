"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, FunnelChart, Funnel, LabelList } from "recharts";

type FunnelData = { name: string; value: number; fill: string };

const funnelData: FunnelData[] = [
  { name: "Visitors", value: 1000, fill: "#8b5cf6" },
  { name: "Chats Started", value: 420, fill: "#a78bfa" },
  { name: "Qualified", value: 180, fill: "#c4b5fd" },
  { name: "Meetings Booked", value: 54, fill: "#ddd6fe" },
];

export function ConversionFunnel({ data = funnelData }: { data?: FunnelData[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <FunnelChart>
        <Tooltip
          formatter={(value: number, name: string) => [value.toLocaleString(), name]}
        />
        <Funnel dataKey="value" data={data} isAnimationActive>
          <LabelList position="right" fill="#000" stroke="none" dataKey="name" />
        </Funnel>
      </FunnelChart>
    </ResponsiveContainer>
  );
}

type BarData = { date: string; leads: number; meetings: number };

export function LeadsChart({ data }: { data: BarData[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip />
        <Bar dataKey="leads" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Leads" />
        <Bar dataKey="meetings" fill="#c4b5fd" radius={[4, 4, 0, 0]} name="Meetings" />
      </BarChart>
    </ResponsiveContainer>
  );
}
