import { cn } from "@/lib/utils";
import { statutColor, STATUT_LABELS } from "@/lib/tms-types";

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <span className={cn("status-badge border", statutColor(status), className)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {STATUT_LABELS[status] || status}
    </span>
  );
}
