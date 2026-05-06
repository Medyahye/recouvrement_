import pandas as pd
from django.db import transaction
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from clients.models import Client
from imports.models import FabImport
from zones.models import Zone

from .models import ScoringSetting
from .services.scoring_service import get_active_scoring_setting, score_clients_and_zones


def _setting_to_dict(s: ScoringSetting) -> dict:
    return {
        "id": s.id,
        "poids_solde_client": s.poids_solde_client,
        "poids_activite_client": s.poids_activite_client,
        "poids_anciennete_client": s.poids_anciennete_client,
        "poids_solde_zone": s.poids_solde_zone,
        "poids_nb_clients_zone": s.poids_nb_clients_zone,
        "poids_anciennete_zone": s.poids_anciennete_zone,
        "poids_activite_zone": s.poids_activite_zone,
        "cap_anciennete_jours": s.cap_anciennete_jours,
        "seuil_haute": s.seuil_haute,
        "seuil_moyenne": s.seuil_moyenne,
        "updated_at": s.updated_at.isoformat(),
    }


FLOAT_FIELDS = [
    "poids_solde_client", "poids_activite_client", "poids_anciennete_client",
    "poids_solde_zone", "poids_nb_clients_zone", "poids_anciennete_zone", "poids_activite_zone",
    "seuil_haute", "seuil_moyenne",
]
INT_FIELDS = ["cap_anciennete_jours"]


class ScoringSettingView(APIView):
    def get(self, request):
        setting = get_active_scoring_setting()
        return Response(_setting_to_dict(setting))

    def put(self, request):
        setting = get_active_scoring_setting()

        for field in FLOAT_FIELDS:
            if field in request.data:
                try:
                    setattr(setting, field, float(request.data[field]))
                except (TypeError, ValueError):
                    return Response(
                        {"detail": f"Valeur invalide pour {field}."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

        for field in INT_FIELDS:
            if field in request.data:
                try:
                    setattr(setting, field, int(request.data[field]))
                except (TypeError, ValueError):
                    return Response(
                        {"detail": f"Valeur invalide pour {field}."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

        client_sum = round(
            setting.poids_solde_client + setting.poids_activite_client + setting.poids_anciennete_client, 4
        )
        zone_sum = round(
            setting.poids_solde_zone + setting.poids_nb_clients_zone
            + setting.poids_anciennete_zone + setting.poids_activite_zone, 4
        )
        if abs(client_sum - 1.0) > 0.01:
            return Response(
                {"detail": f"Les poids client doivent sommer à 1.0 (actuel : {client_sum})."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if abs(zone_sum - 1.0) > 0.01:
            return Response(
                {"detail": f"Les poids zone doivent sommer à 1.0 (actuel : {zone_sum})."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        setting.save()
        return Response(_setting_to_dict(setting))


class RecalculateAllView(APIView):
    def post(self, request):
        setting = get_active_scoring_setting()
        fab_imports = FabImport.objects.filter(statut=FabImport.Statut.SUCCES)

        results = []
        for fab in fab_imports:
            rows = list(fab.clients.values(
                "id", "ref_abonnement", "solde", "activite_client",
                "code_centre", "secteur_facturation", "tournee_releve", "zone_code",
                "anciennete_jours",
            ))
            if not rows:
                results.append({"fichier": fab.nom_fichier, "statut": "ignore", "raison": "aucun client"})
                continue

            df = pd.DataFrame(rows)
            df["anciennete_cappee"] = df["anciennete_jours"].clip(upper=setting.cap_anciennete_jours)

            try:
                with transaction.atomic():
                    scored_df, zones_df, scoring_summary = score_clients_and_zones(df)

                    client_updates = [
                        Client(
                            id=int(scored_df.at[i, "id"]),
                            famille_activite=str(scored_df.at[i, "famille_activite"] or ""),
                            anciennete_cappee=int(scored_df.at[i, "anciennete_cappee"]),
                            score_solde=float(scored_df.at[i, "score_solde"]),
                            score_activite=float(scored_df.at[i, "score_activite"]),
                            score_anciennete=float(scored_df.at[i, "score_anciennete"]),
                            score_client=float(scored_df.at[i, "score_client"]),
                            priorite_client=str(scored_df.at[i, "priorite_client"]),
                        )
                        for i in scored_df.index
                    ]
                    Client.objects.bulk_update(
                        client_updates,
                        ["famille_activite", "anciennete_cappee", "score_solde",
                         "score_activite", "score_anciennete", "score_client", "priorite_client"],
                        batch_size=1000,
                    )

                    fab.zones.all().delete()
                    Zone.objects.bulk_create([
                        Zone(
                            fab_import=fab,
                            zone_code=row.zone_code,
                            code_centre=row.code_centre,
                            secteur_facturation=row.secteur_facturation,
                            tournee_releve=row.tournee_releve,
                            nb_clients=int(row.nb_clients),
                            solde_total=float(row.solde_total),
                            solde_moyen=float(row.solde_moyen),
                            solde_max=float(row.solde_max),
                            anciennete_moyenne_jours=float(row.anciennete_moyenne_jours),
                            anciennete_max_jours=float(row.anciennete_max_jours),
                            score_activite_moyen=float(row.score_activite_moyen),
                            score_solde_total=float(row.score_solde_total),
                            score_nb_clients=float(row.score_nb_clients),
                            score_anciennete_zone=float(row.score_anciennete_zone),
                            score_activite_zone=float(row.score_activite_zone),
                            score_zone=float(row.score_zone),
                            priorite_zone=row.priorite_zone,
                            activite_dominante=row.activite_dominante or "",
                        )
                        for row in zones_df.itertuples(index=False)
                    ], batch_size=1000)

                    fab.score_moyen_zones = scoring_summary["score_moyen_zones"]
                    fab.nombre_zones = len(zones_df)
                    fab.save(update_fields=["score_moyen_zones", "nombre_zones", "updated_at"])

                results.append({"fichier": fab.nom_fichier, "statut": "ok"})

            except Exception as exc:
                results.append({"fichier": fab.nom_fichier, "statut": "erreur", "raison": str(exc)})

        nb_ok = sum(1 for r in results if r["statut"] == "ok")
        nb_err = sum(1 for r in results if r["statut"] == "erreur")
        return Response({
            "imports_recalcules": nb_ok,
            "imports_en_erreur": nb_err,
            "details": results,
        })
