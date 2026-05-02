"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronDown, ChevronsLeft, ChevronsRight, Users } from "lucide-react";

import { PriorityBadge } from "@/components/ui/priority-badge";
import { formatCurrency, formatDecimal } from "@/lib/format";
import type { Priority, Zone } from "@/lib/types";

type ZonesTableProps = {
  currentPage: number;
  pageSize: number;
  searchParams: Record<string, string>;
  totalItems: number;
  zones: Zone[];
};

function pageHref(targetPage: number, params: Record<string, string>) {
  const nextParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (key !== "page" && value) nextParams.set(key, value);
  });

  nextParams.set("page", String(targetPage));
  return `/zones?${nextParams.toString()}`;
}

function getVisiblePages(currentPage: number, totalPages: number) {
  const pages = new Set([1, currentPage, currentPage + 1, currentPage + 2, totalPages]);
  return Array.from(pages)
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((a, b) => a - b);
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-slate-200 py-2.5 last:border-b-0">
      <p className="text-xs text-slate-500">{label}</p>
      <div className="mt-1 text-sm font-semibold text-slate-950">{children}</div>
    </div>
  );
}

export function ZonesTable({ currentPage, pageSize, searchParams, totalItems, zones }: ZonesTableProps) {
  const [selectedZone, setSelectedZone] = useState<Zone | null>(zones[0] ?? null);
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const firstItem = totalItems ? (currentPage - 1) * pageSize + 1 : 0;
  const lastItem = Math.min(currentPage * pageSize, totalItems);
  const visiblePages = getVisiblePages(currentPage, totalPages);

  return (
    <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
      <section className="min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="w-full max-w-full overflow-x-auto">
          <table className="min-w-[900px] text-[13px]">
            <thead className="border-b border-slate-200 bg-white text-left text-slate-950">
              <tr>
                <th className="px-4 py-3.5 font-semibold">Zone</th>
                <th className="px-3 py-3.5 font-semibold">Centre</th>
                <th className="px-3 py-3.5 font-semibold">Secteur</th>
                <th className="px-3 py-3.5 font-semibold">Tournée</th>
                <th className="px-3 py-3.5 font-semibold">Nb clients</th>
                <th className="px-3 py-3.5 font-semibold">Solde total</th>
                <th className="px-3 py-3.5 font-semibold">Ancienneté moyenne</th>
                <th className="px-3 py-3.5 font-semibold">Score</th>
                <th className="px-3 py-3.5 font-semibold">Priorité</th>
              </tr>
            </thead>
            <tbody>
              {zones.map((zone) => (
                <tr
                  key={zone.id}
                  className={`cursor-pointer border-b border-slate-200 last:border-b-0 ${
                    selectedZone?.id === zone.id ? "bg-blue-50" : "bg-white hover:bg-slate-50"
                  }`}
                  onClick={() => setSelectedZone(zone)}
                >
                  <td className="whitespace-nowrap px-4 py-3.5 font-medium text-slate-800">{zone.zone_code}</td>
                  <td className="whitespace-nowrap px-3 py-3.5 text-slate-700">{zone.code_centre}</td>
                  <td className="whitespace-nowrap px-3 py-3.5 text-slate-700">{zone.secteur_facturation}</td>
                  <td className="whitespace-nowrap px-3 py-3.5 text-slate-700">{zone.tournee_releve}</td>
                  <td className="whitespace-nowrap px-3 py-3.5 text-slate-700">{zone.nb_clients}</td>
                  <td className="whitespace-nowrap px-3 py-3.5 text-slate-700">{formatCurrency(zone.solde_total)}</td>
                  <td className="whitespace-nowrap px-3 py-3.5 text-slate-700">
                    {formatDecimal(zone.anciennete_moyenne_jours, 0)} jours
                  </td>
                  <td className="whitespace-nowrap px-3 py-3.5 text-slate-700">{formatDecimal(zone.score_zone, 0)}</td>
                  <td className="whitespace-nowrap px-3 py-3.5">
                    <PriorityBadge priority={zone.priorite_zone as Priority} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 text-xs text-slate-600 lg:flex-row lg:items-center lg:justify-between">
          <p>
            Affichage de {firstItem} à {lastItem} sur {formatDecimal(totalItems, 0)} zones
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Link
                href={pageHref(1, searchParams)}
                className={`flex h-8 w-8 items-center justify-center rounded-md border ${
                  currentPage === 1 ? "pointer-events-none border-slate-200 text-slate-300" : "border-slate-300 text-slate-700 hover:bg-slate-50"
                }`}
              >
                <ChevronsLeft size={17} />
              </Link>
              {visiblePages.map((visiblePage, index) => {
                const previousPage = visiblePages[index - 1];
                const hasGap = previousPage && visiblePage - previousPage > 1;

                return (
                  <span key={visiblePage} className="flex items-center gap-2">
                    {hasGap ? <span className="px-1 text-slate-500">...</span> : null}
                    <Link
                      href={pageHref(visiblePage, searchParams)}
                      className={`flex h-8 min-w-8 items-center justify-center rounded-md border px-2.5 ${
                        visiblePage === currentPage
                          ? "border-blue-700 bg-white text-blue-700 shadow-sm"
                          : "border-transparent text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {visiblePage}
                    </Link>
                  </span>
                );
              })}
              <Link
                href={pageHref(totalPages, searchParams)}
                className={`flex h-8 w-8 items-center justify-center rounded-md border ${
                  currentPage === totalPages
                    ? "pointer-events-none border-slate-200 text-slate-300"
                    : "border-slate-300 text-slate-700 hover:bg-slate-50"
                }`}
              >
                <ChevronsRight size={17} />
              </Link>
            </div>

            <div className="flex items-center gap-3 pl-2">
              <span>Lignes par page</span>
              <div className="relative">
                <select className="h-8 appearance-none rounded-md border border-slate-300 bg-white pl-3 pr-8 text-xs text-slate-700">
                  <option>{pageSize}</option>
                </select>
                <ChevronDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <aside className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-base font-semibold text-slate-950">Détails de la zone</h2>

        {selectedZone ? (
          <div className="mt-4">
            <DetailRow label="Zone">{selectedZone.zone_code}</DetailRow>
            <DetailRow label="Nb clients">{selectedZone.nb_clients}</DetailRow>
            <DetailRow label="Solde total">{formatCurrency(selectedZone.solde_total)} MRU</DetailRow>
            <DetailRow label="Ancienneté moyenne">{formatDecimal(selectedZone.anciennete_moyenne_jours, 0)} jours</DetailRow>
            <DetailRow label="Score">{formatDecimal(selectedZone.score_zone, 0)}</DetailRow>
            <DetailRow label="Priorité">
              <PriorityBadge priority={selectedZone.priorite_zone} />
            </DetailRow>
            <DetailRow label="Activité dominante">{selectedZone.activite_dominante || "-"}</DetailRow>

            <Link
              href={`/clients?zone_code=${encodeURIComponent(selectedZone.zone_code)}`}
              className="mt-5 flex h-10 items-center justify-center gap-2 rounded-md border border-blue-700 bg-white text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-50"
            >
              <Users size={18} />
              Voir les clients
            </Link>
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-500">Aucune zone disponible.</p>
        )}
      </aside>
    </div>
  );
}
