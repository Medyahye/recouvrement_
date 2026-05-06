"use client";

import { useEffect, useState } from "react";
import { CheckCircle, RefreshCw, RotateCcw, Save } from "lucide-react";

const API = "http://127.0.0.1:8000/api/scoring/settings/";

type Settings = {
  poids_solde_client: number;
  poids_activite_client: number;
  poids_anciennete_client: number;
  poids_solde_zone: number;
  poids_nb_clients_zone: number;
  poids_anciennete_zone: number;
  poids_activite_zone: number;
  cap_anciennete_jours: number;
  seuil_haute: number;
  seuil_moyenne: number;
};

const DEFAULTS: Settings = {
  poids_solde_client: 0.55,
  poids_activite_client: 0.25,
  poids_anciennete_client: 0.20,
  poids_solde_zone: 0.50,
  poids_nb_clients_zone: 0.25,
  poids_anciennete_zone: 0.15,
  poids_activite_zone: 0.10,
  cap_anciennete_jours: 90,
  seuil_haute: 70,
  seuil_moyenne: 40,
};

function WeightRow({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-4">
      <div className="w-52 shrink-0">
        <p className="text-sm font-medium text-slate-800">{label}</p>
        <p className="text-xs text-slate-500">{description}</p>
      </div>
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="h-1.5 flex-1 cursor-pointer accent-blue-600"
      />
      <input
        type="number"
        min={0}
        max={1}
        step={0.01}
        value={value.toFixed(2)}
        onChange={(e) => onChange(Math.min(1, Math.max(0, parseFloat(e.target.value) || 0)))}
        className="w-16 rounded-lg border border-slate-200 px-2 py-1.5 text-center text-sm font-semibold text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
      />
    </div>
  );
}

function SumBadge({ total }: { total: number }) {
  const ok = Math.abs(total - 1.0) <= 0.01;
  return (
    <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
      ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"
    }`}>
      <span className={`h-1.5 w-1.5 rounded-full ${ok ? "bg-emerald-500" : "bg-red-500"}`} />
      Somme : {total.toFixed(2)} {ok ? "✓" : "≠ 1.00"}
    </div>
  );
}

export function ScoringSettingsClient() {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [recalcResult, setRecalcResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(API)
      .then((r) => r.json())
      .then((data) => {
        setSettings({
          poids_solde_client: data.poids_solde_client,
          poids_activite_client: data.poids_activite_client,
          poids_anciennete_client: data.poids_anciennete_client,
          poids_solde_zone: data.poids_solde_zone,
          poids_nb_clients_zone: data.poids_nb_clients_zone,
          poids_anciennete_zone: data.poids_anciennete_zone,
          poids_activite_zone: data.poids_activite_zone,
          cap_anciennete_jours: data.cap_anciennete_jours,
          seuil_haute: data.seuil_haute,
          seuil_moyenne: data.seuil_moyenne,
        });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const set = (field: keyof Settings) => (value: number) =>
    setSettings((prev) => ({ ...prev, [field]: value }));

  const clientSum = parseFloat(
    (settings.poids_solde_client + settings.poids_activite_client + settings.poids_anciennete_client).toFixed(4)
  );
  const zoneSum = parseFloat(
    (settings.poids_solde_zone + settings.poids_nb_clients_zone + settings.poids_anciennete_zone + settings.poids_activite_zone).toFixed(4)
  );

  const handleSave = async () => {
    setError(null);
    setSaving(true);
    try {
      const res = await fetch(API, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail ?? "Erreur lors de la sauvegarde.");
      } else {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch {
      setError("Impossible de contacter le serveur.");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setSettings(DEFAULTS);
    setError(null);
  };

  const handleRecalculate = async () => {
    if (!confirm("Les poids seront enregistrés puis appliqués à tous les imports FAB (passés et futurs).\n\nContinuer ?"))
      return;
    setRecalculating(true);
    setRecalcResult(null);
    setError(null);
    try {
      // 1. Sauvegarder les poids
      const saveRes = await fetch("http://127.0.0.1:8000/api/scoring/settings/", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (!saveRes.ok) {
        const d = await saveRes.json();
        setError(d.detail ?? "Erreur lors de la sauvegarde des poids.");
        return;
      }

      // 2. Recalculer tous les imports
      const calcRes = await fetch("http://127.0.0.1:8000/api/scoring/recalculate/", { method: "POST" });
      const data = await calcRes.json();

      if (!calcRes.ok) {
        setError(data.detail ?? "Erreur lors du recalcul.");
        return;
      }

      if (data.imports_en_erreur > 0) {
        const erreurs = data.details
          .filter((d: { statut: string; fichier: string; raison?: string }) => d.statut === "erreur")
          .map((d: { fichier: string; raison?: string }) => `${d.fichier} : ${d.raison}`)
          .join("\n");
        setError(`${data.imports_en_erreur} import(s) en erreur :\n${erreurs}`);
      }

      if (data.imports_recalcules > 0) {
        setRecalcResult(`${data.imports_recalcules} import(s) recalculé(s) avec succès.`);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else if (data.imports_en_erreur === 0) {
        setRecalcResult("Aucun import à recalculer.");
      }
    } catch {
      setError("Impossible de contacter le serveur.");
    } finally {
      setRecalculating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-slate-400">
        Chargement des paramètres…
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Poids scoring client */}
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Scoring client</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Poids utilisés pour calculer le score de chaque client.
            </p>
          </div>
          <SumBadge total={clientSum} />
        </div>
        <div className="space-y-5">
          <WeightRow
            label="Solde impayé"
            description="Montant dû par le client"
            value={settings.poids_solde_client}
            onChange={set("poids_solde_client")}
          />
          <WeightRow
            label="Activité"
            description="Type d'activité du client"
            value={settings.poids_activite_client}
            onChange={set("poids_activite_client")}
          />
          <WeightRow
            label="Ancienneté"
            description="Durée depuis le dernier paiement"
            value={settings.poids_anciennete_client}
            onChange={set("poids_anciennete_client")}
          />
        </div>
      </div>

      {/* Poids scoring zone */}
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Scoring zone</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Poids utilisés pour calculer le score de chaque zone.
            </p>
          </div>
          <SumBadge total={zoneSum} />
        </div>
        <div className="space-y-5">
          <WeightRow
            label="Solde total"
            description="Montant total impayé de la zone"
            value={settings.poids_solde_zone}
            onChange={set("poids_solde_zone")}
          />
          <WeightRow
            label="Nombre de clients"
            description="Volume de clients dans la zone"
            value={settings.poids_nb_clients_zone}
            onChange={set("poids_nb_clients_zone")}
          />
          <WeightRow
            label="Ancienneté"
            description="Ancienneté moyenne des impayés"
            value={settings.poids_anciennete_zone}
            onChange={set("poids_anciennete_zone")}
          />
          <WeightRow
            label="Activité"
            description="Score d'activité moyen de la zone"
            value={settings.poids_activite_zone}
            onChange={set("poids_activite_zone")}
          />
        </div>
      </div>

      {/* Paramètres généraux */}
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-5 text-sm font-semibold text-slate-900">Paramètres généraux</h2>
        <div className="grid gap-5 sm:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-700">
              Plafond ancienneté (jours)
            </label>
            <input
              type="number"
              min={30}
              max={3650}
              value={settings.cap_anciennete_jours}
              onChange={(e) => set("cap_anciennete_jours")(parseInt(e.target.value) || 90)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
            <p className="mt-1 text-xs text-slate-400">
              Ancienneté max prise en compte pour le score.
            </p>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-700">
              Seuil priorité HAUTE
            </label>
            <input
              type="number"
              min={0}
              max={100}
              step={1}
              value={settings.seuil_haute}
              onChange={(e) => set("seuil_haute")(parseFloat(e.target.value) || 70)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
            <p className="mt-1 text-xs text-slate-400">Score minimum pour HAUTE priorité.</p>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-700">
              Seuil priorité MOYENNE
            </label>
            <input
              type="number"
              min={0}
              max={100}
              step={1}
              value={settings.seuil_moyenne}
              onChange={(e) => set("seuil_moyenne")(parseFloat(e.target.value) || 40)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
            <p className="mt-1 text-xs text-slate-400">Score minimum pour MOYENNE priorité.</p>
          </div>
        </div>
      </div>

      {/* Actions */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {recalcResult && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <CheckCircle size={15} />
          {recalcResult}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving || Math.abs(clientSum - 1.0) > 0.01 || Math.abs(zoneSum - 1.0) > 0.01}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {saved ? <CheckCircle size={15} /> : <Save size={15} />}
          {saving ? "Enregistrement…" : saved ? "Enregistré !" : "Enregistrer"}
        </button>
        <button
          onClick={handleReset}
          className="flex items-center gap-2 rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
        >
          <RotateCcw size={15} />
          Valeurs par défaut
        </button>
        <button
          onClick={handleRecalculate}
          disabled={recalculating}
          className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-5 py-2.5 text-sm font-medium text-amber-700 transition-colors hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw size={15} className={recalculating ? "animate-spin" : ""} />
          {recalculating ? "Recalcul en cours…" : "Appliquer à tous les imports"}
        </button>
      </div>
    </div>
  );
}
