import type { ReactNode } from "react";
import { CalendarDays, DollarSign, MapPin, TrendingUp } from "lucide-react";

import { ZonesTable } from "@/components/zones/zones-table";
import { ZonesFilters } from "@/components/zones/zones-filters";
import { api } from "@/lib/api";
import { formatCurrency, formatDecimal } from "@/lib/format";

const ZONES_PAGE_SIZE = 12;

function StatTile({
  title,
  value,
  subtitle,
  tone,
  icon,
}: {
  title: string;
  value: string;
  subtitle?: string;
  tone: string;
  icon: ReactNode;
}) {
  return (
    <div className="flex min-h-[96px] items-center gap-4 rounded-lg border border-slate-200 bg-white px-5 py-4 shadow-sm">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${tone}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500">{title}</p>
        <p className="mt-1.5 text-lg font-semibold leading-none text-slate-950">{value}</p>
        {subtitle ? <p className="mt-1 text-xs text-slate-500">{subtitle}</p> : null}
      </div>
    </div>
  );
}

function cleanParams(params: Record<string, string | string[] | undefined>) {
  const cleaned: Record<string, string> = {};

  Object.entries(params).forEach(([key, value]) => {
    const normalized = Array.isArray(value) ? value[0] : value;
    if (normalized) cleaned[key] = normalized;
  });

  return cleaned;
}

export default async function ZonesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const page = typeof params.page === "string" ? params.page : "1";
  const currentPage = Math.max(1, Number(page) || 1);
  const priorite = typeof params.priorite === "string" ? params.priorite : "";
  const codeCentre = typeof params.code_centre === "string" ? params.code_centre : "";
  const search = typeof params.search === "string" ? params.search : "";

  const cleanedParams: Record<string, string> = {};
  Object.entries(params).forEach(([k, v]) => {
    const val = Array.isArray(v) ? v[0] : v;
    if (val) cleanedParams[k] = val;
  });

  const query = "?" + new URLSearchParams(cleanedParams).toString();
  const zonesResponse = await api.getLatestZones(query);

  const zones = zonesResponse?.results ?? [];
  const totalItems = zonesResponse?.count ?? 0;
  const highCount = zones.filter((zone) => zone.priorite_zone === "HAUTE").length;
  const totalAmount = zones.reduce((acc, zone) => acc + zone.solde_total, 0);
  const avgAge = zones.length ? zones.reduce((acc, zone) => acc + zone.anciennete_moyenne_jours, 0) / zones.length : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[22px] font-semibold tracking-normal text-slate-950">Zones prioritaires</h1>
        <p className="mt-1 text-sm text-slate-500">Consultez et gérez les zones de recouvrement prioritaires.</p>
      </div>

      <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-4">
        <StatTile
          title="Nombre de zones"
          value={formatDecimal(totalItems, 0)}
          tone="bg-violet-100 text-violet-700"
          icon={<MapPin size={21} />}
        />
        <StatTile
          title="Zones haute priorité"
          value={formatDecimal(highCount, 0)}
          tone="bg-red-100 text-red-600"
          icon={<TrendingUp size={21} />}
        />
        <StatTile
          title="Montant total"
          value={formatCurrency(totalAmount)}
          subtitle="MRU"
          tone="bg-amber-100 text-amber-700"
          icon={<DollarSign size={22} />}
        />
        <StatTile
          title="Ancienneté moyenne"
          value={formatDecimal(avgAge, 0)}
          subtitle="jours"
          tone="bg-blue-100 text-blue-700"
          icon={<CalendarDays size={21} />}
        />
      </div>

      <ZonesFilters initialParams={cleanedParams} />

      <ZonesTable
        currentPage={currentPage}
        pageSize={ZONES_PAGE_SIZE}
        searchParams={cleanParams(params)}
        totalItems={totalItems}
        zones={zones}
      />
    </div>
  );
}
