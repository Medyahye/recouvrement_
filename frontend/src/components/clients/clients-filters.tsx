"use client";

import { useRouter } from "next/navigation";
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

const PRIORITE_OPTIONS = [
  { value: "", label: "Toutes les priorités" },
  { value: "HAUTE", label: "Haute" },
  { value: "MOYENNE", label: "Moyenne" },
  { value: "FAIBLE", label: "Faible" },
];

const SORT_OPTIONS = [
  { value: "score_client", label: "Score (décroissant)" },
  { value: "solde", label: "Solde (décroissant)" },
  { value: "anciennete", label: "Ancienneté (décroissante)" },
];

export function ClientsFilters({ initialParams }: { initialParams: Record<string, string> }) {
  const router = useRouter();
  const get = (k: string) => initialParams[k] ?? "";

  // Basic
  const [codeCentre, setCodeCentre] = useState(get("code_centre"));
  const [zoneCode, setZoneCode]     = useState(get("zone_code"));
  const [activite, setActivite]     = useState(get("activite"));
  const [priorite, setPriorite]     = useState(get("priorite"));
  const [search, setSearch]         = useState(get("search"));

  // Advanced
  const [secteur, setSecteur]         = useState(get("secteur_facturation"));
  const [famille, setFamille]         = useState(get("famille_activite"));
  const [soldeMin, setSoldeMin]       = useState(get("solde_min"));
  const [soldeMax, setSoldeMax]       = useState(get("solde_max"));
  const [ancMin, setAncMin]           = useState(get("anciennete_min"));
  const [ancMax, setAncMax]           = useState(get("anciennete_max"));
  const [scoreMin, setScoreMin]       = useState(get("score_min"));
  const [scoreMax, setScoreMax]       = useState(get("score_max"));
  const [dpMin, setDpMin]             = useState(get("date_paiement_min"));
  const [dpMax, setDpMax]             = useState(get("date_paiement_max"));
  const [dfMin, setDfMin]             = useState(get("date_facture_min"));
  const [dfMax, setDfMax]             = useState(get("date_facture_max"));
  const [sortBy, setSortBy]           = useState(get("sort_by") || "score_client");

  const [drawerOpen, setDrawerOpen] = useState(false);

  const buildParams = useCallback((overrides: Record<string, string> = {}) => {
    const p = new URLSearchParams();
    const all: Record<string, string> = {
      code_centre: codeCentre, zone_code: zoneCode,
      activite, priorite, search,
      secteur_facturation: secteur, famille_activite: famille,
      solde_min: soldeMin, solde_max: soldeMax,
      anciennete_min: ancMin, anciennete_max: ancMax,
      score_min: scoreMin, score_max: scoreMax,
      date_paiement_min: dpMin, date_paiement_max: dpMax,
      date_facture_min: dfMin, date_facture_max: dfMax,
      sort_by: sortBy === "score_client" ? "" : sortBy,
      ...overrides,
    };
    Object.entries(all).forEach(([k, v]) => { if (v) p.set(k, v); });
    p.set("page", "1");
    return p.toString();
  }, [codeCentre, zoneCode, activite, priorite, search, secteur, famille, soldeMin, soldeMax, ancMin, ancMax, scoreMin, scoreMax, dpMin, dpMax, dfMin, dfMax, sortBy]);

  const apply = () => router.push(`/clients?${buildParams()}`);

  const resetAdvanced = () => {
    setSecteur(""); setFamille("");
    setSoldeMin(""); setSoldeMax("");
    setAncMin(""); setAncMax("");
    setScoreMin(""); setScoreMax("");
    setDpMin(""); setDpMax("");
    setDfMin(""); setDfMax("");
    setSortBy("score_client");
  };

  const advancedCount = [
    secteur, famille,
    soldeMin, soldeMax,
    ancMin, ancMax,
    scoreMin, scoreMax,
    dpMin, dpMax,
    dfMin, dfMax,
    sortBy !== "score_client" ? sortBy : "",
  ].filter(Boolean).length;

  const chips: { label: string; clear: () => void }[] = [];
  if (secteur)   chips.push({ label: `Secteur: ${secteur}`,      clear: () => setSecteur("") });
  if (famille)   chips.push({ label: `Famille: ${famille}`,      clear: () => setFamille("") });
  if (soldeMin)  chips.push({ label: `Solde ≥ ${soldeMin} MRU`,  clear: () => setSoldeMin("") });
  if (soldeMax)  chips.push({ label: `Solde ≤ ${soldeMax} MRU`,  clear: () => setSoldeMax("") });
  if (ancMin)    chips.push({ label: `Anc. ≥ ${ancMin}j`,        clear: () => setAncMin("") });
  if (ancMax)    chips.push({ label: `Anc. ≤ ${ancMax}j`,        clear: () => setAncMax("") });
  if (scoreMin)  chips.push({ label: `Score ≥ ${scoreMin}`,      clear: () => setScoreMin("") });
  if (scoreMax)  chips.push({ label: `Score ≤ ${scoreMax}`,      clear: () => setScoreMax("") });
  if (dpMin)     chips.push({ label: `Paiement ≥ ${dpMin}`,      clear: () => setDpMin("") });
  if (dpMax)     chips.push({ label: `Paiement ≤ ${dpMax}`,      clear: () => setDpMax("") });
  if (dfMin)     chips.push({ label: `Facture ≥ ${dfMin}`,       clear: () => setDfMin("") });
  if (dfMax)     chips.push({ label: `Facture ≤ ${dfMax}`,       clear: () => setDfMax("") });
  if (sortBy !== "score_client") chips.push({ label: `Tri: ${SORT_OPTIONS.find(o => o.value === sortBy)?.label ?? sortBy}`, clear: () => setSortBy("score_client") });

  return (
    <>
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        {/* Basic filter row */}
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[130px] flex-1">
            <label className="mb-1.5 block text-[11px] font-medium text-slate-600">Centre</label>
            <input
              value={codeCentre}
              onChange={(e) => setCodeCentre(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && apply()}
              placeholder="Centre"
              className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-[13px] text-slate-700 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div className="min-w-[130px] flex-1">
            <label className="mb-1.5 block text-[11px] font-medium text-slate-600">Zone</label>
            <input
              value={zoneCode}
              onChange={(e) => setZoneCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && apply()}
              placeholder="Code zone"
              className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-[13px] text-slate-700 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div className="min-w-[130px] flex-1">
            <label className="mb-1.5 block text-[11px] font-medium text-slate-600">Activité</label>
            <input
              value={activite}
              onChange={(e) => setActivite(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && apply()}
              placeholder="Type activité"
              className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-[13px] text-slate-700 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div className="min-w-[130px] flex-1">
            <label className="mb-1.5 block text-[11px] font-medium text-slate-600">Priorité</label>
            <select
              value={priorite}
              onChange={(e) => setPriorite(e.target.value)}
              className="h-9 w-full appearance-none rounded-md border border-slate-300 bg-white px-3 text-[13px] text-slate-700 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              {PRIORITE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          <div className="min-w-[180px] flex-[2]">
            <label className="mb-1.5 block text-[11px] font-medium text-slate-600">Recherche</label>
            <div className="relative">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && apply()}
                placeholder="Nom, référence, téléphone…"
                className="h-9 w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 text-[13px] text-slate-700 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>

          <button
            onClick={apply}
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
                onRemove={() => { chip.clear(); apply(); }}
              />
            ))}
          </div>
        )}
      </div>

      <AdvancedFilterDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Filtres avancés — Clients"
        activeCount={advancedCount}
        onApply={apply}
        onReset={resetAdvanced}
      >
        <FilterSection title="Localisation">
          <FilterTextInput label="Secteur de facturation" value={secteur} onChange={setSecteur} placeholder="Ex: 93" />
        </FilterSection>

        <FilterSection title="Activité">
          <FilterTextInput label="Famille d'activité" value={famille} onChange={setFamille} placeholder="Ex: DOMESTIQUE" />
        </FilterSection>

        <FilterSection title="Montant impayé">
          <RangeInput
            label="Solde"
            nameMin="solde_min" nameMax="solde_max"
            valueMin={soldeMin} valueMax={soldeMax}
            onChangeMin={setSoldeMin} onChangeMax={setSoldeMax}
            unit="MRU" step={0.01}
          />
        </FilterSection>

        <FilterSection title="Ancienneté">
          <RangeInput
            label="Jours depuis le dernier paiement"
            nameMin="anciennete_min" nameMax="anciennete_max"
            valueMin={ancMin} valueMax={ancMax}
            onChangeMin={setAncMin} onChangeMax={setAncMax}
            unit="jours"
          />
        </FilterSection>

        <FilterSection title="Score client">
          <RangeInput
            label="Score de recouvrement"
            nameMin="score_min" nameMax="score_max"
            valueMin={scoreMin} valueMax={scoreMax}
            onChangeMin={setScoreMin} onChangeMax={setScoreMax}
            placeholder="0" placeholder2="100" step={0.1}
          />
        </FilterSection>

        <FilterSection title="Date du dernier paiement">
          <DateRangeInput
            label="Période"
            valueMin={dpMin} valueMax={dpMax}
            onChangeMin={setDpMin} onChangeMax={setDpMax}
          />
        </FilterSection>

        <FilterSection title="Date de la dernière facture">
          <DateRangeInput
            label="Période"
            valueMin={dfMin} valueMax={dfMax}
            onChangeMin={setDfMin} onChangeMax={setDfMax}
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
