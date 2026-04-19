import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  value: string | number;
  delta?: string;
  icon: LucideIcon;
  tone?: "primary" | "accent" | "success" | "warning" | "info";
  loading?: boolean;
}

const toneClass = {
  primary: "bg-primary/10 text-primary",
  accent: "bg-accent/10 text-accent",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  info: "bg-info/10 text-info",
};

export function KpiCard({ label, value, delta, icon: Icon, tone = "primary", loading }: KpiCardProps) {
  return (
    <div className="kpi-card group animate-fade-in">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-bold text-foreground tabular-nums">
            {loading ? <span className="inline-block h-7 w-16 animate-pulse rounded bg-muted" /> : value}
          </p>
          {delta && <p className="mt-1 text-xs text-muted-foreground">{delta}</p>}
        </div>
        <div className={cn("rounded-lg p-2.5 transition-base group-hover:scale-110", toneClass[tone])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
