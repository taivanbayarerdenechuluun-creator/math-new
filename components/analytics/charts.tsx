"use client";
// Нэг цуваат графикууд — нэг өнгө (primary, light/dark хоёуланд validator-аар шалгасан),
// нимгэн баганууд, 4px бөөрөнхий төгсгөл, hover tooltip, хүснэгтэн хувилбар.
import * as React from "react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Table2 } from "lucide-react";
import { weekdayShort } from "@/lib/utils";

const axis = { stroke: "var(--text-subtle)", fontSize: 11, tickLine: false, axisLine: false } as const;

function TipBox({ title, rows }: { title: string; rows: [string, string | number][] }) {
  return (
    <div className="rounded-xl border border-border bg-surface px-3 py-2 text-xs shadow-float">
      <p className="mb-1 font-semibold text-fg">{title}</p>
      {rows.map(([k, v]) => (
        <p key={k} className="flex justify-between gap-4 text-muted">
          <span>{k}</span>
          <span className="font-semibold text-fg">{v}</span>
        </p>
      ))}
    </div>
  );
}

function TableToggle({ children, table }: { children: React.ReactNode; table: React.ReactNode }) {
  const [showTable, setShowTable] = React.useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setShowTable(!showTable)}
        className="absolute -top-1 right-0 z-10 rounded-lg p-1.5 text-subtle hover:bg-surface-2 hover:text-fg"
        aria-label={showTable ? "График харах" : "Хүснэгтээр харах"}
        title={showTable ? "График харах" : "Хүснэгтээр харах"}
      >
        <Table2 className="h-4 w-4" />
      </button>
      {showTable ? <div className="max-h-64 overflow-auto pt-6 text-sm">{table}</div> : children}
    </div>
  );
}

export function ActivityChart({
  data,
  height = 220,
  labelMode = "weekday",
}: {
  data: { date: string; problems: number; correct: number; minutes?: number }[];
  height?: number;
  labelMode?: "weekday" | "date";
}) {
  const fmt = (d: string) => (labelMode === "weekday" ? weekdayShort(d) : d.slice(5).replace("-", "/"));
  return (
    <TableToggle
      table={
        <table className="w-full">
          <thead>
            <tr className="text-left text-xs text-subtle">
              <th className="py-1">Огноо</th>
              <th>Бодлого</th>
              <th>Зөв</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.date} className="border-t border-border">
                <td className="py-1">{d.date}</td>
                <td>{d.problems}</td>
                <td>{d.correct}</td>
              </tr>
            ))}
          </tbody>
        </table>
      }
    >
      <div style={{ height }} role="img" aria-label="Өдөр тутмын бодсон бодлогын тоо">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 4, left: -24, bottom: 0 }} barCategoryGap="28%">
            <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="0" />
            <XAxis dataKey="date" tickFormatter={fmt} {...axis} interval={data.length > 14 ? 3 : 0} />
            <YAxis allowDecimals={false} {...axis} />
            <Tooltip
              cursor={{ fill: "var(--surface-2)" }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload as (typeof data)[number];
                return <TipBox title={d.date} rows={[["Бодлого", d.problems], ["Зөв", d.correct], ...(d.minutes !== undefined ? ([["Минут", d.minutes]] as [string, number][]) : [])]} />;
              }}
            />
            <Bar dataKey="problems" fill="var(--primary)" radius={[4, 4, 0, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </TableToggle>
  );
}

export function HorizontalBars({
  data,
  valueSuffix = "%",
  max = 100,
}: {
  data: { label: string; value: number; sub?: string }[];
  valueSuffix?: string;
  max?: number;
}) {
  // Энгийн HTML баганууд — урт шошготой монгол текстэд recharts-аас уншигдах чадвар сайн
  return (
    <ul className="space-y-3" aria-label="Сэдвийн нарийвчлал">
      {data.map((d) => (
        <li key={d.label} className="group" title={d.sub}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate text-fg">{d.label}</span>
            <span className="shrink-0 font-semibold tabular-nums text-fg">
              {d.value}
              {valueSuffix}
              {d.sub && <span className="ml-1.5 text-xs font-normal text-subtle">{d.sub}</span>}
            </span>
          </div>
          <div className="h-2 rounded-full bg-surface-3">
            <div className="h-full rounded-full bg-primary transition-[width] duration-700" style={{ width: `${Math.min(100, (d.value / max) * 100)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function ScoreTrend({ data, height = 200, passing }: { data: { label: string; value: number }[]; height?: number; passing?: number }) {
  return (
    <TableToggle
      table={
        <table className="w-full">
          <tbody>
            {data.map((d, i) => (
              <tr key={i} className="border-t border-border">
                <td className="py-1">{d.label}</td>
                <td className="text-right font-semibold">{d.value}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      }
    >
      <div style={{ height }} role="img" aria-label="Шалгалтын онооны өөрчлөлт">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 12, left: -24, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis dataKey="label" {...axis} />
            <YAxis domain={[0, 100]} {...axis} />
            <Tooltip
              cursor={{ stroke: "var(--border-strong)", strokeWidth: 1 }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload as (typeof data)[number];
                return <TipBox title={d.label} rows={[["Оноо", `${d.value}%`], ...(passing ? ([["Тэнцэх босго", `${passing}%`]] as [string, string][]) : [])]} />;
              }}
            />
            <Line type="monotone" dataKey="value" stroke="var(--primary)" strokeWidth={2} dot={{ r: 4, fill: "var(--primary)", stroke: "var(--surface)", strokeWidth: 2 }} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </TableToggle>
  );
}

export function RingProgress({ value, size = 120, stroke = 10, label }: { value: number | null; size?: number; stroke?: number; label?: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = value ?? 0;
  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--surface-3)" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="var(--primary)"
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (c * Math.min(100, v)) / 100}
          style={{ transition: "stroke-dashoffset 900ms ease" }}
        />
      </svg>
      <div className="absolute text-center">
        <p className="font-display text-2xl font-semibold">{value === null ? "—" : `${value}%`}</p>
        {label && <p className="text-[11px] text-subtle">{label}</p>}
      </div>
    </div>
  );
}
