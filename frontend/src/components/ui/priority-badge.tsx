import type { Priority } from "@/lib/types";

const styles: Record<Priority, string> = {
  HAUTE: "border-red-400 bg-red-50 text-red-700",
  MOYENNE: "border-orange-400 bg-orange-50 text-orange-600",
  FAIBLE: "border-green-400 bg-green-50 text-green-700",
};

const labels: Record<Priority, string> = {
  HAUTE: "HAUTE",
  MOYENNE: "MOYENNE",
  FAIBLE: "FAIBLE",
};

export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2.5 py-1 text-[11px] font-semibold leading-none ${styles[priority]}`}
    >
      {labels[priority]}
    </span>
  );
}
