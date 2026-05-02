import Link from "next/link";
import {
  ArrowRight,
  Banknote,
  CalendarClock,
  CheckCircle2,
  FileText,
  MapPinned,
  TrendingUp,
  UploadCloud,
  Users,
} from "lucide-react";

import { PriorityBadge } from "@/components/ui/priority-badge";
import { SectionCard } from "@/components/ui/section-card";
import { StatCard } from "@/components/ui/stat-card";
import { api } from "@/lib/api";
import { formatCurrency, formatDate, formatDecimal } from "@/lib/format";

export default async function DashboardPage() {
  const dashboard = await api.getDashboard();

  if (!dashboard) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-semibold text-slate-950">Tableau de bord</h1>
          <p className="mt-2 text-sm text-slate-500">Aucun import réussi n&apos;est encore disponible.</p>
        </div>

        <section className="rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
          <div className="mx-auto max-w-xl text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
              <UploadCloud size={24} />
            </div>
            <h2 className="mt-4 text-xl font-semibold text-slate-950">Commencez par importer un fichier FAB</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Le tableau de bord se remplira automatiquement après le premier traitement réussi : clients retenus,
              zones prioritaires, montants et indicateurs de recouvrement.
            </p>
            <Link
              href="/import-fab"
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-800"
            >
              Aller à l&apos;import FAB
              <ArrowRight size={16} />
            </Link>
          </div>
        </section>
      </div>
    );
  }

  const t = dashboard.resume_dernier_traitement;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-slate-950">Tableau de bord</h1>
        <p className="mt-2 text-sm text-slate-500">
          Vue d&apos;ensemble des indicateurs clés et des résultats du dernier traitement.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <StatCard
          title="Dernier FAB importé"
          value={dashboard.dernier_fichier}
          subtitle={formatDate(t.date_import)}
          icon={<FileText size={18} className="text-blue-600" />}
          iconBg="bg-blue-50"
          valueClassName="text-sm"
        />
        <StatCard
          title="Clients retenus"
          value={formatDecimal(dashboard.clients_filtres, 0)}
          subtitle="clients"
          icon={<Users size={18} className="text-violet-600" />}
          iconBg="bg-violet-50"
          valueClassName="text-3xl"
        />
        <StatCard
          title="Zones identifiées"
          value={formatDecimal(dashboard.nombre_zones, 0)}
          subtitle="zones"
          icon={<MapPinned size={18} className="text-teal-600" />}
          iconBg="bg-teal-50"
          valueClassName="text-3xl"
        />
        <StatCard
          title="Montant total"
          value={formatCurrency(dashboard.montant_total)}
          subtitle="MRU"
          icon={<Banknote size={18} className="text-emerald-600" />}
          iconBg="bg-emerald-50"
          valueClassName="text-2xl"
        />
        <StatCard
          title="Ancienneté moyenne"
          value={formatDecimal(dashboard.anciennete_moyenne, 1)}
          subtitle="jours"
          icon={<CalendarClock size={18} className="text-amber-500" />}
          iconBg="bg-amber-50"
          valueClassName="text-3xl"
        />
        <StatCard
          title="Potentiel de recouvrement"
          value={`${formatDecimal(dashboard.score_moyen, 1)} %`}
          subtitle="du montant total"
          icon={<TrendingUp size={18} className="text-green-600" />}
          iconBg="bg-green-50"
          valueClassName="text-3xl text-green-700"
        />
      </div>

      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(300px,0.6fr)]">
        <SectionCard
          title="Top 10 zones prioritaires"
          action={
            <Link
              href="/zones"
              className="flex items-center gap-1.5 rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-50"
            >
              Voir toutes les zones
              <ArrowRight size={12} />
            </Link>
          }
        >
          <div className="w-full max-w-full overflow-x-auto rounded-lg border border-slate-200">
            <table className="min-w-[720px] text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="whitespace-nowrap px-3 py-3 font-semibold">Zone</th>
                  <th className="whitespace-nowrap px-3 py-3 font-semibold">Nb clients</th>
                  <th className="whitespace-nowrap px-3 py-3 font-semibold">Solde total</th>
                  <th className="whitespace-nowrap px-3 py-3 font-semibold">Score</th>
                  <th className="whitespace-nowrap px-3 py-3 font-semibold">Priorité</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.top_10_zones.map((zone) => (
                  <tr key={zone.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                    <td className="whitespace-nowrap px-3 py-3 font-medium text-slate-900">{zone.zone_code}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-slate-600">{zone.nb_clients}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-slate-600">
                      {formatCurrency(zone.solde_total)} MRU
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 font-semibold text-slate-800">
                      {formatDecimal(zone.score_zone, 1)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3">
                      <PriorityBadge priority={zone.priorite_zone} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <div className="min-w-0 space-y-5">
          <SectionCard title="Résumé du dernier traitement">
            <ul className="space-y-3 text-sm text-slate-600">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-blue-600" />
                <span>
                  Fichier FAB importé : <span className="font-medium text-slate-800">{dashboard.dernier_fichier}</span>{" "}
                  ({t.nombre_lignes_total.toLocaleString("fr-FR")} lignes).
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-blue-600" />
                <span>
                  <span className="font-medium text-slate-800">{formatDecimal(dashboard.clients_filtres, 0)}</span>{" "}
                  clients retenus après filtrage et nettoyage.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-blue-600" />
                <span>
                  <span className="font-medium text-slate-800">{formatDecimal(dashboard.nombre_zones, 0)}</span> zones
                  identifiées avec un montant total de{" "}
                  <span className="font-medium text-slate-800">{formatCurrency(dashboard.montant_total)} MRU</span>.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-blue-600" />
                <span>
                  Score moyen des zones :{" "}
                  <span className="font-medium text-slate-800">{formatDecimal(dashboard.score_moyen, 1)}</span>.
                </span>
              </li>
            </ul>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
