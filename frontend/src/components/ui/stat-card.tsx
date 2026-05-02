import { ReactNode } from "react";

type StatCardProps = {
  title: string;
  value: string;
  subtitle?: string;
  icon?: ReactNode;
  iconBg?: string;
  valueClassName?: string;
};

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  iconBg = "bg-blue-50",
  valueClassName = "",
}: StatCardProps) {
  return (
    <div className="flex min-w-0 items-start gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      {icon && (
        <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${iconBg}`}>
          {icon}
        </div>
      )}

      <div className="min-w-0 flex-1">
        <p className="mb-1 text-xs font-semibold uppercase text-slate-500">{title}</p>
        <p className={`break-words font-semibold leading-tight text-slate-950 ${valueClassName}`}>{value}</p>
        {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
      </div>
    </div>
  );
}
