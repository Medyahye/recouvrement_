import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronDown, Search } from "lucide-react";

import { Pagination } from "@/components/ui/pagination";
import { PriorityBadge } from "@/components/ui/priority-badge";
import { api } from "@/lib/api";
import { formatCurrency, formatDate, formatDecimal } from "@/lib/format";

const CLIENTS_PAGE_SIZE = 10;

function selectionHref(
  clientId: number,
  params: Record<string, string | string[] | undefined>,
) {
  const nextParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    const normalized = Array.isArray(value) ? value[0] : value;
    if (normalized) nextParams.set(key, normalized);
  });

  nextParams.set("selected_client", String(clientId));
  return `/clients?${nextParams.toString()}`;
}

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="border-b border-slate-200 py-2.5 last:border-b-0">
      <p className="text-xs text-slate-500">{label}</p>
      <div className="mt-1 text-sm font-semibold text-slate-950">{children}</div>
    </div>
  );
}

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const page = typeof params.page === "string" ? params.page : "1";
  const currentPage = Math.max(1, Number(page) || 1);
  const zoneCode = typeof params.zone_code === "string" ? params.zone_code : "";
  const codeCentre = typeof params.code_centre === "string" ? params.code_centre : "";
  const activite = typeof params.activite === "string" ? params.activite : "";
  const priorite = typeof params.priorite === "string" ? params.priorite : "";
  const search = typeof params.search === "string" ? params.search : "";
  const selectedClientId = typeof params.selected_client === "string" ? Number(params.selected_client) : null;

  const query = `?page=${page}&zone_code=${zoneCode}&code_centre=${codeCentre}&activite=${activite}&priorite=${priorite}&search=${search}`;
  const clientsResponse = await api.getLatestClients(query);
  const clients = clientsResponse?.results ?? [];
  const selectedClient = clients.find((client) => client.id === selectedClientId) ?? clients[0] ?? null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[22px] font-semibold tracking-normal text-slate-950">Clients</h1>
        <p className="mt-1 text-sm text-slate-500">Consultez les clients retenus dans le dernier traitement FAB.</p>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <form className="grid gap-3 lg:grid-cols-[minmax(130px,170px)_minmax(130px,170px)_minmax(150px,190px)_minmax(150px,190px)_minmax(220px,1fr)_110px]">
          <div>
            <label className="mb-1.5 block text-[11px] font-medium text-slate-600">Centre</label>
            <input
              name="code_centre"
              defaultValue={codeCentre}
              placeholder="Centre"
              className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-[13px] text-slate-700 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[11px] font-medium text-slate-600">Zone</label>
            <input
              name="zone_code"
              defaultValue={zoneCode}
              placeholder="Zone"
              className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-[13px] text-slate-700 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[11px] font-medium text-slate-600">Activité</label>
            <input
              name="activite"
              defaultValue={activite}
              placeholder="Activité"
              className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-[13px] text-slate-700 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[11px] font-medium text-slate-600">Priorité</label>
            <div className="relative">
              <select
                name="priorite"
                defaultValue={priorite}
                className="h-9 w-full appearance-none rounded-md border border-slate-300 bg-white px-3 pr-8 text-[13px] text-slate-700 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="">Toutes</option>
                <option value="HAUTE">Haute</option>
                <option value="MOYENNE">Moyenne</option>
                <option value="FAIBLE">Faible</option>
              </select>
              <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-[11px] font-medium text-slate-600">Recherche</label>
            <div className="relative">
              <Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                name="search"
                defaultValue={search}
                placeholder="Nom ou référence"
                className="h-9 w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 text-[13px] text-slate-700 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>

          <div className="flex items-end">
            <button className="h-9 w-full rounded-md bg-blue-700 px-4 text-[13px] font-semibold text-white shadow-sm hover:bg-blue-800">
              Filtrer
            </button>
          </div>
        </form>
      </section>

      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
        <section className="min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="w-full max-w-full overflow-x-auto">
            <table className="min-w-[1080px] text-[13px]">
              <thead className="border-b border-slate-200 bg-white text-left text-slate-950">
                <tr>
                  <th className="whitespace-nowrap px-4 py-3.5 font-semibold">Réf abonnement</th>
                  <th className="whitespace-nowrap px-3 py-3.5 font-semibold">Nom client</th>
                  <th className="whitespace-nowrap px-3 py-3.5 font-semibold">Zone</th>
                  <th className="whitespace-nowrap px-3 py-3.5 font-semibold">Activité</th>
                  <th className="whitespace-nowrap px-3 py-3.5 font-semibold">Famille</th>
                  <th className="whitespace-nowrap px-3 py-3.5 font-semibold">Solde</th>
                  <th className="whitespace-nowrap px-3 py-3.5 font-semibold">Dernier paiement</th>
                  <th className="whitespace-nowrap px-3 py-3.5 font-semibold">Ancienneté</th>
                  <th className="whitespace-nowrap px-3 py-3.5 font-semibold">Score</th>
                  <th className="whitespace-nowrap px-3 py-3.5 font-semibold">Priorité</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((client, index) => (
                  <tr
                    key={client.id}
                    className={`border-b border-slate-200 last:border-b-0 ${
                      selectedClient?.id === client.id || (!selectedClientId && index === 0)
                        ? "bg-blue-50"
                        : "bg-white hover:bg-slate-50"
                    }`}
                  >
                    <td className="whitespace-nowrap p-0 font-medium text-slate-800">
                      <Link className="block px-4 py-3.5" href={selectionHref(client.id, params)}>
                        {client.ref_abonnement}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap p-0 text-slate-700">
                      <Link className="block px-3 py-3.5" href={selectionHref(client.id, params)}>
                        {client.nom_client}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap p-0 text-slate-700">
                      <Link className="block px-3 py-3.5" href={selectionHref(client.id, params)}>
                        {client.zone_code}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap p-0 text-slate-700">
                      <Link className="block px-3 py-3.5" href={selectionHref(client.id, params)}>
                        {client.activite_client}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap p-0 text-slate-700">
                      <Link className="block px-3 py-3.5" href={selectionHref(client.id, params)}>
                        {client.famille_activite}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap p-0 text-slate-700">
                      <Link className="block px-3 py-3.5" href={selectionHref(client.id, params)}>
                        {formatCurrency(client.solde)} MRU
                      </Link>
                    </td>
                    <td className="whitespace-nowrap p-0 text-slate-700">
                      <Link className="block px-3 py-3.5" href={selectionHref(client.id, params)}>
                        {formatDate(client.date_dernier_paiement)}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap p-0 text-slate-700">
                      <Link className="block px-3 py-3.5" href={selectionHref(client.id, params)}>
                        {client.anciennete_jours} j
                      </Link>
                    </td>
                    <td className="whitespace-nowrap p-0 text-slate-700">
                      <Link className="block px-3 py-3.5" href={selectionHref(client.id, params)}>
                        {formatDecimal(client.score_client, 1)}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap p-0">
                      <Link className="block px-3 py-3.5" href={selectionHref(client.id, params)}>
                        <PriorityBadge priority={client.priorite_client} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="px-4 pb-4">
            <Pagination
              basePath="/clients"
              currentPage={currentPage}
              pageSize={CLIENTS_PAGE_SIZE}
              searchParams={params}
              totalItems={clientsResponse?.count ?? 0}
            />
          </div>
        </section>

        <aside className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-base font-semibold text-slate-950">Détails du client</h2>

          {selectedClient ? (
            <div className="mt-4">
              <DetailRow label="Nom client">{selectedClient.nom_client}</DetailRow>
              <DetailRow label="Référence">{selectedClient.ref_abonnement}</DetailRow>
              <DetailRow label="Zone">{selectedClient.zone_code}</DetailRow>
              <DetailRow label="Centre">{selectedClient.code_centre}</DetailRow>
              <DetailRow label="Activité">{selectedClient.activite_client}</DetailRow>
              <DetailRow label="Famille">{selectedClient.famille_activite}</DetailRow>
              <DetailRow label="Adresse">{selectedClient.adresse_client || "-"}</DetailRow>
              <DetailRow label="Téléphone">{selectedClient.telephone || "-"}</DetailRow>
              <DetailRow label="Compteur">{selectedClient.numero_compteur || "-"}</DetailRow>
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-500">Aucun client disponible.</p>
          )}
        </aside>
      </div>
    </div>
  );
}
