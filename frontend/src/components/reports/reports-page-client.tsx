"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import {
  AlertCircle,
  Banknote,
  CalendarDays,
  Download,
  FileArchive,
  FileSpreadsheet,
  FileText,
  FolderOutput,
  Loader2,
  MapPinned,
  RefreshCw,
  Users,
} from "lucide-react";

import { API_BASE_URL, api } from "@/lib/api";
import { formatCurrency, formatDate, formatDecimal } from "@/lib/format";
import type { FabImport, ReportEntry } from "@/lib/types";

type ReportsPageClientProps = {
  initialLatestImport: FabImport | null;
  initialReports: ReportEntry[];
};

function backendOrigin() {
  return API_BASE_URL.replace(/\/api\/?$/, "");
}

function fileUrl(path: string) {
  if (!path) return "#";
  if (path.startsWith("http")) return path;
  return `${backendOrigin()}${path.startsWith("/") ? path : `/${path}`}`;
}

function formatReportType(type: string) {
  const labels: Record<string, string> = {
    QUOTIDIEN: "Rapport quotidien",
    CLIENTS: "Clients scorés",
    ZONES: "Zones prioritaires",
  };

  return labels[type] ?? type;
}

function reportIcon(format: string) {
  if (format === "CSV") {
    return <FileSpreadsheet size={18} className="text-emerald-600" />;
  }

  return <FileText size={18} className="text-blue-700" />;
}

function StatBox({
  title,
  value,
  subtitle,
  icon,
  tone,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: ReactNode;
  tone: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${tone}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500">{title}</p>
        <p className="mt-1.5 text-lg font-semibold leading-none text-slate-950">{value}</p>
        {subtitle ? <p className="mt-1 text-xs text-slate-500">{subtitle}</p> : null}
      </div>
    </div>
  );
}

function FileLine({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <span>{children}</span>
    </div>
  );
}

export function ReportsPageClient({ initialLatestImport, initialReports }: ReportsPageClientProps) {
  const [reports, setReports] = useState(initialReports);
  const [isGenerating, setIsGenerating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const latestReports = useMemo(() => reports.slice(0, 12), [reports]);
  const latestImport = initialLatestImport;

  async function handleGenerate() {
    setIsGenerating(true);
    setMessage(null);
    setError(null);

    try {
      const response = await api.generateReport();

      if (!response) {
        throw new Error("Impossible de générer le rapport. Vérifiez qu'un import FAB réussi existe.");
      }

      setReports(response.history);
      setMessage("Rapport Word et exports CSV générés avec succès.");
    } catch (generateError) {
      setError(generateError instanceof Error ? generateError.message : "Erreur pendant la génération du rapport.");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold tracking-normal text-slate-950">Rapports</h1>
          <p className="mt-1 text-sm text-slate-500">
            Générez, consultez et téléchargez les rapports du dernier traitement FAB.
          </p>
        </div>

        <button
          type="button"
          onClick={handleGenerate}
          disabled={isGenerating || !latestImport}
          className="inline-flex h-9 items-center gap-2 rounded-md bg-blue-700 px-4 text-[13px] font-semibold text-white shadow-sm hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
          {isGenerating ? "Génération..." : "Générer les rapports"}
        </button>
      </div>

      {message ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {message}
        </div>
      ) : null}

      {error ? (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <p>{error}</p>
        </div>
      ) : null}

      {latestImport ? (
        <>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <StatBox
              title="Date de traitement"
              value={formatDate(latestImport.date_import)}
              icon={<CalendarDays size={19} />}
              tone="bg-blue-50 text-blue-700"
            />
            <StatBox
              title="Clients retenus"
              value={formatDecimal(latestImport.nombre_clients_filtres, 0)}
              icon={<Users size={19} />}
              tone="bg-violet-50 text-violet-700"
            />
            <StatBox
              title="Zones générées"
              value={formatDecimal(latestImport.nombre_zones, 0)}
              icon={<MapPinned size={19} />}
              tone="bg-emerald-50 text-emerald-700"
            />
            <StatBox
              title="Montant total"
              value={formatCurrency(latestImport.montant_total)}
              subtitle="MRU"
              icon={<Banknote size={19} />}
              tone="bg-amber-50 text-amber-700"
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
            <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                  <FileText size={18} />
                </div>
                <h2 className="text-base font-semibold text-slate-950">Aperçu du rapport quotidien</h2>
              </div>
              <div className="mt-4 grid gap-3 text-sm text-slate-600 md:grid-cols-2">
                <p>
                  Fichier FAB: <span className="font-semibold text-slate-900">{latestImport.nom_fichier}</span>
                </p>
                <p>
                  Clients retenus:{" "}
                  <span className="font-semibold text-slate-900">{latestImport.nombre_clients_filtres}</span>
                </p>
                <p>
                  Zones générées: <span className="font-semibold text-slate-900">{latestImport.nombre_zones}</span>
                </p>
                <p>
                  Montant total:{" "}
                  <span className="font-semibold text-slate-900">
                    {formatCurrency(latestImport.montant_total)} MRU
                  </span>
                </p>
                <p>
                  Ancienneté moyenne:{" "}
                  <span className="font-semibold text-slate-900">
                    {formatDecimal(latestImport.anciennete_moyenne_jours, 1)} jours
                  </span>
                </p>
                <p>
                  Score moyen zones:{" "}
                  <span className="font-semibold text-slate-900">
                    {formatDecimal(latestImport.score_moyen_zones, 1)}
                  </span>
                </p>
              </div>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                  <FolderOutput size={18} />
                </div>
                <h2 className="text-base font-semibold text-slate-950">Fichiers générés</h2>
              </div>
              <div className="mt-4 space-y-3 text-sm text-slate-600">
                <FileLine icon={<FileText size={16} className="text-blue-700" />}>rapport_recouvrement.docx</FileLine>
                <FileLine icon={<FileSpreadsheet size={16} className="text-emerald-700" />}>
                  clients_scores_code_relance_1.csv
                </FileLine>
                <FileLine icon={<FileSpreadsheet size={16} className="text-emerald-700" />}>
                  zones_prioritaires_code_relance_1.csv
                </FileLine>
              </div>
            </section>
          </div>
        </>
      ) : (
        <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">Aucun import réussi disponible. Importez d&apos;abord un fichier FAB.</p>
        </section>
      )}

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-50 text-slate-700">
            <FileArchive size={18} />
          </div>
          <h2 className="text-base font-semibold text-slate-950">Historique des rapports</h2>
        </div>

        <div className="w-full overflow-x-auto">
          <table className="min-w-[820px] text-[13px]">
            <thead className="border-b border-slate-200 bg-white text-left text-slate-950">
              <tr>
                <th className="px-5 py-3.5 font-semibold">Rapport</th>
                <th className="px-3 py-3.5 font-semibold">Type</th>
                <th className="px-3 py-3.5 font-semibold">Format</th>
                <th className="px-3 py-3.5 font-semibold">Date</th>
                <th className="px-3 py-3.5 font-semibold">Téléchargement</th>
              </tr>
            </thead>
            <tbody>
              {latestReports.map((report) => (
                <tr key={report.id} className="border-b border-slate-200 last:border-b-0 hover:bg-slate-50">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-md bg-slate-50">
                        {reportIcon(report.format)}
                      </div>
                      <span className="font-medium text-slate-800">{report.titre}</span>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3.5 text-slate-700">{formatReportType(report.type_rapport)}</td>
                  <td className="whitespace-nowrap px-3 py-3.5 text-slate-700">{report.format}</td>
                  <td className="whitespace-nowrap px-3 py-3.5 text-slate-700">{formatDate(report.date_generation)}</td>
                  <td className="whitespace-nowrap px-3 py-3.5">
                    <a
                      href={fileUrl(report.fichier)}
                      className="inline-flex h-8 items-center gap-2 rounded-md border border-blue-700 px-3 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                    >
                      <Download size={14} />
                      Télécharger
                    </a>
                  </td>
                </tr>
              ))}
              {!latestReports.length ? (
                <tr>
                  <td colSpan={5} className="px-5 py-6 text-center text-sm text-slate-500">
                    Aucun rapport généré pour le moment.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
