"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useCallback } from "react";
import { Search, SlidersHorizontal } from "lucide-react";

import {
  ActiveChip,
  AdvancedFilterDrawer,
  DateRangeInput,
  FilterSection,
  FilterSelect,
  FilterTextInput,
  RangeInput,
} from "@/components/ui/advanced-filter-drawer";

const ADVANCED_KEYS = [
  "secteur_facturation", "tournee_releve", "activite_dominante",
  "nb_clients_min", "nb_clients_max",
  "solde_min", "solde_max",
  "anciennete_min", "anciennete_max",
  "score_min", "score_max",
  "sort_by",
];

const PRIORITE_OPTIONS = [
  { value: "", label: "Toutes les priorités" },
  { value: "HAUTE", label: "Haute" },
  { value: "MOYENNE", label: "Moyenne" },
  { value: "FAIBLE", label: "Faible" },
];

const SORT_OPTIONS = [
  { value: "score_zone", label: "Score (décroissant)" },
  { value: "solde_total", label: "Solde total (décroissant)" },
  { value: "nb_clients", label: "Nombre de clients (décroissant)" },
  { value: "anciennete", label: "Ancienneté moyenne (décroissante)" },
];

export function ZonesFilters({ initialParams }: { initialParams: Record<string, string> }) {
  const router = useRouter();
  const sp = useSearchParams();

  const get = (k: string) => initialParams[k] ?? "";

  // Basic filters (always visible)
  const [codeCentre, setCodeCentre] = useState(get("code_centre"));
  const [priorite, setPriorite] = useState(get("priorite"));
  const [search, setSearch] = useState(get("search"));

  // Advanced filters
  const [secteur, setSecteur]       = useState(get("secteur_facturation"));
  const [tournee, setTournee]       = useState(get("tournee_releve"));
  const [activite, setActivite]     = useState(get("activite_dominante"));
  const [nbMin, setNbMin]           = useState(get("nb_clients_min"));
  const [nbMax, setNbMax]           = useState(get("nb_clients_max"));
  const [soldeMin, setSoldeMin]     = useState(get("solde_min"));
  const [soldeMax, setSoldeMax]     = useState(get("solde_max"));
  const [ancMin, setAncMin]         = useState(get("anciennete_min"));
  const [ancMax, setAncMax]         = useState(get("anciennete_max"));
  const [scoreMin, setScoreMin]     = useState(get("score_min"));
  const [scoreMax, setScoreMax]     = useState(get("score_max"));
  const [sortBy, setSortBy]         = useState(get("sort_by") || "score_zone");

  const [drawerOpen, setDrawerOpen] = useState(false);

  const buildParams = useCallback((overrides: Record<string, string> = {}) => {
    const p = new URLSearchParams();
    const all: Record<string, string> = {
      code_centre: codeCentre, priorite, search,
      secteur_facturation: secteur, tournee_releve: tournee,
      activite_dominante: activite,
      nb_clients_min: nbMin, nb_clients_max: nbMax,
      solde_min: soldeMin, solde_max: soldeMax,
      anciennete_min: ancMin, anciennete_max: ancMax,
      score_min: scoreMin, score_max: scoreMax,
      sort_by: sortBy === "score_zone" ? "" : sortBy,
      ...overrides,
    };
    Object.entries(all).forEach(([k, v]) => { if (v) p.set(k, v); });
    p.set("page", "1");
    return p.toString();
  }, [codeCentre, priorite, search, secteur, tournee, activite, nbMin, nbMax, soldeMin, soldeMax, ancMin, ancMax, scoreMin, scoreMax, sortBy]);

  const applyBasic = () => router.push(`/zones?${buildParams()}`);

  const applyAdvanced = () => router.push(`/zones?${buildParams()}`);

  const resetAdvanced = () => {
    setSecteur(""); setTournee(""); setActivite("");
    setNbMin(""); setNbMax("");
    setSoldeMin(""); setSoldeMax("");
    setAncMin(""); setAncMax("");
    setScoreMin(""); setScoreMax("");
    setSortBy("score_zone");
  };

  const removeChip = (setter: () => void) => { setter(); };

  const advancedCount = [
    secteur, tournee, activite,
    nbMin, nbMax, soldeMin, soldeMax,
    ancMin, ancMax, scoreMin, scoreMax,
    sortBy !== "score_zone" ? sortBy : "",
  ].filter(Boolean).length;

  const chips: { label: string; clear: () => void }[] = [];
  if (secteur)   chips.push({ label: `Secteur: ${secteur}`,    clear: () => setSecteur("") });
  if (tournee)   chips.push({ label: `Tournée: ${tournee}`,    clear: () => setTournee("") });
  if (activite)  chips.push({ label: `Activité: ${activite}`,  clear: () => setActivite("") });
  if (nbMin)     chips.push({ label: `Clients ≥ ${nbMin}`,     clear: () => setNbMin("") });
  if (nbMax)     chips.push({ label: `Clients ≤ ${nbMax}`,     clear: () => setNbMax("") });
  if (soldeMin)  chips.push({ label: `Solde ≥ ${soldeMin}`,    clear: () => setSoldeMin("") });
  if (soldeMax)  chips.push({ label: `Solde ≤ ${soldeMax}`,    clear: () => setSoldeMax("") });
  if (ancMin)    chips.push({ label: `Anc. ≥ ${ancMin}j`,      clear: () => setAncMin("") });
  if (ancMax)    chips.push({ label: `Anc. ≤ ${ancMax}j`,      clear: () => setAncMax("") });
  if (scoreMin)  chips.push({ label: `Score ≥ ${scoreMin}`,    clear: () => setScoreMin("") });
  if (scoreMax)  chips.push({ label: `Score ≤ ${scoreMax}`,    clear: () => setScoreMax("") });
  if (sortBy !== "score_zone") chips.push({ label: `Tri: ${SORT_OPTIONS.find(o => o.value === sortBy)?.label ?? sortBy}`, clear: () => setSortBy("score_zone") });

  return (
    <>
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        {/* Basic filter row */}
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[150px] flex-1">
            <label className="mb-1.5 block text-[11px] font-medium text-slate-600">Centre</label>
            <input
              value={codeCentre}
              onChange={(e) => setCodeCentre(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && applyBasic()}
              placeholder="Tous les centres"
              className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-[13px] text-slate-700 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div className="min-w-[150px] flex-1">
            <label className="mb-1.5 block text-[11px] font-medium text-slate-600">Priorité</label>
            <select
              value={priorite}
              onChange={(e) => setPriorite(e.target.value)}
              className="h-9 w-full appearance-none rounded-md border border-slate-300 bg-white px-3 text-[13px] text-slate-700 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              {PRIORITE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          <div className="min-w-[200px] flex-[2]">
            <label className="mb-1.5 block text-[11px] font-medium text-slate-600">Recherche</label>
            <div className="relative">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && applyBasic()}
                placeholder="Zone, secteur, tournée…"
                className="h-9 w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 text-[13px] text-slate-700 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>

          <button
            onClick={applyBasic}
            className="h-9 rounded-md bg-blue-700 px-5 text-[13px] font-semibold text-white shadow-sm hover:bg-blue-800"
          >
            Filtrer
          </button>

          <button
            onClick={() => setDrawerOpen(true)}
            className={`relative flex h-9 items-center gap-2 rounded-md border px-4 text-[13px] font-medium shadow-sm transition-colors ${
              advancedCount > 0
                ? "border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100"
                : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            <SlidersHorizontal size={15} />
            Filtres avancés
            {advancedCount > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-700 text-[10px] font-bold text-white">
                {advancedCount}
              </span>
            )}
          </button>
        </div>

        {/* Active chips */}
        {chips.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {chips.map((chip) => (
              <ActiveChip
                key={chip.label}
                label={chip.label}
                onRemove={() => {
                  chip.clear();
                  router.push(`/zones?${buildParams({ [chip.label]: "" })}`);
                }}
              />
            ))}
          </div>
        )}
      </div>

      <AdvancedFilterDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Filtres avancés — Zones"
        activeCount={advancedCount}
        onApply={applyAdvanced}
        onReset={resetAdvanced}
      >
        <FilterSection title="Localisation">
          <FilterTextInput label="Secteur de facturation" value={secteur} onChange={setSecteur} placeholder="Ex: 93" />
          <FilterTextInput label="Tournée de relevé" value={tournee} onChange={setTournee} placeholder="Ex: 04" />
          <FilterTextInput label="Activité dominante" value={activite} onChange={setActivite} placeholder="Ex: DOMESTIQUE" />
        </FilterSection>

        <FilterSection title="Nombre de clients">
          <RangeInput
            label="Clients dans la zone"
            nameMin="nb_clients_min" nameMax="nb_clients_max"
            valueMin={nbMin} valueMax={nbMax}
            onChangeMin={setNbMin} onChangeMax={setNbMax}
            placeholder="Min" placeholder2="Max"
          />
        </FilterSection>

        <FilterSection title="Montants">
          <RangeInput
            label="Solde total impayé"
            nameMin="solde_min" nameMax="solde_max"
            valueMin={soldeMin} valueMax={soldeMax}
            onChangeMin={setSoldeMin} onChangeMax={setSoldeMax}
            unit="MRU" step={0.01}
          />
        </FilterSection>

        <FilterSection title="Ancienneté">
          <RangeInput
            label="Ancienneté moyenne des impayés"
            nameMin="anciennete_min" nameMax="anciennete_max"
            valueMin={ancMin} valueMax={ancMax}
            onChangeMin={setAncMin} onChangeMax={setAncMax}
            unit="jours"
          />
        </FilterSection>

        <FilterSection title="Score">
          <RangeInput
            label="Score de la zone"
            nameMin="score_min" nameMax="score_max"
            valueMin={scoreMin} valueMax={scoreMax}
            onChangeMin={setScoreMin} onChangeMax={setScoreMax}
            placeholder="0" placeholder2="1" step={0.01}
          />
        </FilterSection>

        <FilterSection title="Tri">
          <FilterSelect
            label="Trier par"
            value={sortBy}
            onChange={setSortBy}
            options={SORT_OPTIONS}
          />
        </FilterSection>
      </AdvancedFilterDrawer>
    </>
  );
}
