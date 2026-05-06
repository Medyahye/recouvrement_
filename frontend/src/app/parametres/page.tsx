import { ScoringSettingsClient } from "@/components/parametres/scoring-settings-client";

export default function ParametresPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[22px] font-semibold tracking-normal text-slate-950">Paramètres</h1>
        <p className="mt-1 text-sm text-slate-500">
          Configurez les poids du scoring pour adapter la prioritisation à vos objectifs.
        </p>
      </div>
      <ScoringSettingsClient />
    </div>
  );
}
