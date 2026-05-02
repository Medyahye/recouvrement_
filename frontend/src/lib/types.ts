export type Priority = "HAUTE" | "MOYENNE" | "FAIBLE";

export type FabImport = {
  id: number;
  nom_fichier: string;
  date_import: string;
  date_fab: string | null;
  nombre_lignes_total: number;
  nombre_lignes_apres_nettoyage: number;
  nombre_clients_filtres: number;
  nombre_zones: number;
  montant_total: number;
  anciennete_moyenne_jours: number;
  score_moyen_zones: number;
  statut: string;
  message_erreur: string;
};

export type ComparisonMetric = {
  today: number;
  previous: number;
  variation: number;
  variation_pct: number | null;
};

export type ComparisonResponse = {
  available: boolean;
  message?: string;
  clients?: ComparisonMetric;
  zones?: ComparisonMetric;
  montant?: ComparisonMetric;
  anciennete?: ComparisonMetric;
  score_moyen?: ComparisonMetric;
};

export type Zone = {
  id: number;
  zone_code: string;
  code_centre: string;
  secteur_facturation: string;
  tournee_releve: string;
  nb_clients: number;
  solde_total: number;
  solde_moyen: number;
  solde_max: number;
  anciennete_moyenne_jours: number;
  anciennete_max_jours: number;
  score_activite_moyen: number;
  score_zone: number;
  priorite_zone: Priority;
  activite_dominante: string;
};

export type ZoneDetail = Zone & {
  clients: Client[];
};

export type Client = {
  id: number;
  ref_abonnement: string;
  nom_client: string;
  zone_code: string;
  code_centre: string;
  activite_client: string;
  famille_activite: string;
  solde: number;
  date_dernier_paiement: string | null;
  anciennete_jours: number;
  score_client: number;
  priorite_client: Priority;
  adresse_client: string;
  telephone: string;
  numero_compteur: string;
};

export type PaginatedResponse<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

export type DashboardSummary = {
  dernier_fichier: string;
  clients_filtres: number;
  nombre_zones: number;
  zones_haute_priorite: number;
  montant_total: number;
  anciennete_moyenne: number;
  score_moyen: number;
  potentiel_recouvrement_estime: number;
  top_10_zones: Zone[];
  repartition_priorites: Record<Priority, number>;
  resume_dernier_traitement: {
    date_import: string;
    statut: string;
    nombre_lignes_total: number;
    nombre_lignes_apres_nettoyage: number;
  };
};

export type ReportEntry = {
  id: number;
  titre: string;
  type_rapport: string;
  format: string;
  fichier: string;
  date_generation: string;
  fab_import: number;
};

export type GenerateReportResponse = {
  generated: {
    word_report_id: number;
    clients_report_id: number;
    zones_report_id: number;
    word_file: string;
    clients_csv: string;
    zones_csv: string;
  };
  history: ReportEntry[];
};
