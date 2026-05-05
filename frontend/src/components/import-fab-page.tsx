"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  RefreshCw,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import { SectionCard } from "@/components/ui/section-card";
import { API_BASE_URL } from "@/lib/api";
import { formatDecimal } from "@/lib/format";
import type { ComparisonResponse, FabImport } from "@/lib/types";

function formatUploadError(message: string) {
  if (message.includes("clients_client") || message.includes("contrainte NOT NULL") || message.includes("NOT NULL")) {
    return "Le fichier n'a pas pu être importé à cause d'un ancien champ obligatoire dans la base. Lancez les migrations backend puis réessayez.";
  }

  return message;
}

function ComparisonCard({
  label,
  data,
  unit = "",
}: {
  label: string;
  data: { today: number; previous: number; variation: number; variation_pct: number | null };
  unit?: string;
}) {
  const variationIsPositive = data.variation >= 0;
  const TrendIcon = variationIsPositive ? TrendingUp : TrendingDown;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-semibold leading-none text-slate-950">
        {formatDecimal(data.today, 2)}
        {unit}
      </p>
      <div className="mt-4 space-y-1.5 text-sm text-slate-500">
        <p>
          Précédent:{" "}
          <span className="font-medium text-slate-700">
            {formatDecimal(data.previous, 2)}
            {unit}
          </span>
        </p>
        <p
          className={`inline-flex items-center gap-1.5 font-medium ${
            variationIsPositive ? "text-emerald-700" : "text-red-700"
          }`}
        >
          <TrendIcon size={15} />
          <span>
            Variation: {formatDecimal(data.variation, 2)}
            {unit} {data.variation_pct !== null ? `(${formatDecimal(data.variation_pct, 2)}%)` : ""}
          </span>
        </p>
      </div>
    </div>
  );
}

export function ImportFabPage({
  initialImport,
  initialComparison,
}: {
  initialImport: FabImport | null;
  initialComparison: ComparisonResponse | null;
}) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [latestImport, setLatestImport] = useState<FabImport | null>(initialImport);
  const [comparison, setComparison] = useState<ComparisonResponse | null>(initialComparison);

  const fileMeta = useMemo(() => {
    if (!selectedFile) return null;
    return {
      taille: `${(selectedFile.size / 1024 / 1024).toFixed(2)} Mo`,
      nom: selectedFile.name,
    };
  }, [selectedFile]);

  async function handlePollMinio() {
    setIsPolling(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const response = await fetch(`${API_BASE_URL}/imports/poll-minio/`, { method: "POST" });
      const payload = await response.json();
      if (payload.summary) {
        setLatestImport(payload.summary);
        setComparison(payload.comparison);
        const nb = payload.nb_fichiers as number;
        const liste = (payload.fichiers as string[]).join(", ");
        setSuccessMessage(
          nb === 1
            ? `Fichier "${liste}" importé avec succès — ${payload.summary.nombre_clients_filtres} clients, ${payload.summary.nombre_zones} zones.`
            : `${nb} fichiers importés avec succès : ${liste}`
        );
      } else {
        setError(payload.detail || "Aucun nouveau fichier dans MinIO.");
      }
    } catch {
      setError("Impossible de contacter MinIO.");
    } finally {
      setIsPolling(false);
    }
  }

  async function handleUpload() {
    if (!selectedFile) {
      setError("Sélectionnez un fichier .txt ou .csv avant de lancer le traitement.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);
    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const response = await fetch(`${API_BASE_URL}/imports/upload/`, {
        method: "POST",
        body: formData,
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.detail || "Erreur serveur.");
      }

      setLatestImport(payload.summary);
      setComparison(payload.comparison);
      setSelectedFile(null);
    } catch (uploadError) {
      const message = uploadError instanceof Error ? uploadError.message : "Erreur serveur.";
      setError(formatUploadError(message));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-slate-950">Import FAB</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-500">
          Importez le fichier du jour pour nettoyer les données, calculer les scores et actualiser les zones de
          recouvrement.
        </p>
      </div>

      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <SectionCard title="Importer le fichier FAB du jour">
          <div className="rounded-lg border border-dashed border-blue-300 bg-blue-50/40 p-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-white text-blue-700 shadow-sm">
              <RefreshCw size={24} />
            </div>
            <p className="mt-4 text-lg font-semibold text-slate-900">Récupérer le FAB depuis MinIO</p>
            <p className="mt-1 text-sm text-slate-500">
              Cliquez pour détecter et importer automatiquement les nouveaux fichiers FAB.
            </p>
            <div className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={handlePollMinio}
                disabled={isPolling}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPolling ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                {isPolling ? "Vérification en cours..." : "Vérifier MinIO"}
              </button>
            </div>
          </div>

          {isPolling ? (
            <div className="mt-4 flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
              <Loader2 size={16} className="animate-spin" />
              Recherche de nouveaux fichiers dans MinIO...
            </div>
          ) : null}

          {error ? (
            <div className="mt-4 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold">Import impossible</p>
                <p className="mt-1">{error}</p>
              </div>
            </div>
          ) : null}

          {successMessage ? (
            <div className="mt-4 flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold">Import réussi</p>
                <p className="mt-1">{successMessage}</p>
              </div>
            </div>
          ) : null}
        </SectionCard>

        <SectionCard title="Dernier fichier importé">
          {latestImport ? (
            <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-blue-700">
                <FileSpreadsheet size={20} />
              </div>
              <div className="min-w-0">
                <p className="truncate font-semibold text-slate-900">{latestImport.nom_fichier}</p>
                <p className="mt-1 text-sm text-slate-500">{latestImport.nombre_clients_filtres} clients · {latestImport.nombre_zones} zones</p>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
              Aucun fichier importé.
            </div>
          )}
        </SectionCard>
      </div>

      {latestImport ? (
        <>
          <SectionCard
            title="Comparaison avec le dernier FAB importé"
            action={
              <a
                href="/zones"
                className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white"
              >
                Voir les zones prioritaires
                <ArrowRight size={16} />
              </a>
            }
          >
            {comparison?.available && comparison.clients && comparison.montant && comparison.zones && comparison.anciennete ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <ComparisonCard label="Clients retenus" data={comparison.clients} />
                <ComparisonCard label="Montant total" data={comparison.montant} unit=" MRU" />
                <ComparisonCard label="Zones identifiées" data={comparison.zones} />
                <ComparisonCard label="Ancienneté moyenne" data={comparison.anciennete} unit=" j" />
              </div>
            ) : (
              <p className="text-sm text-slate-500">
                {comparison?.message || "Aucune comparaison disponible. Premier FAB importé."}
              </p>
            )}
          </SectionCard>
        </>
      ) : null}
    </div>
  );
}
