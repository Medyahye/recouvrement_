from django.db import transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from clients.models import Client
from imports.models import FabImport
from imports.serializers import FabImportSerializer
from imports.services.fab_processor import process_fab_file
from imports.services.import_comparison import compare_latest_imports
from imports.services.minio_service import download_fab_file, list_fab_files
from scoring.services.scoring_service import score_clients_and_zones
from zones.models import Zone


class ImportUploadAPIView(APIView):
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        uploaded_file = request.FILES.get("file")
        if not uploaded_file:
            return Response({"detail": "Aucun fichier selectionne."}, status=status.HTTP_400_BAD_REQUEST)

        if not uploaded_file.name.lower().endswith((".txt", ".csv")):
            return Response({"detail": "Format incorrect. Utilisez un fichier .txt ou .csv."}, status=400)

        fab_import = FabImport.objects.create(
            nom_fichier=uploaded_file.name,
            fichier_original=uploaded_file,
            date_import=timezone.now(),
            statut=FabImport.Statut.EN_COURS,
        )

        try:
            with transaction.atomic():
                fab_import.fichier_original.open("rb")
                cleaned_df, import_summary = process_fab_file(fab_import.fichier_original)
                clients_df, zones_df, scoring_summary = score_clients_and_zones(cleaned_df)

                client_objects = [
                    Client(
                        fab_import=fab_import,
                        ref_abonnement=row.ref_abonnement,
                        nom_client=row.nom_client or "",
                        adresse_client=row.adresse_client or "",
                        telephone=row.telephone or "",
                        numero_compteur=row.numero_compteur or "",
                        code_centre=row.code_centre,
                        secteur_facturation=row.secteur_facturation,
                        tournee_releve=row.tournee_releve,
                        zone_code=row.zone_code,
                        activite_client=row.activite_client or "",
                        famille_activite=row.famille_activite or "",
                        solde=float(row.solde),
                        code_relance=int(row.code_relance),
                        date_derniere_facture=row.date_derniere_facture,
                        date_dernier_paiement=row.date_dernier_paiement,
                        anciennete_jours=int(row.anciennete_jours),
                        anciennete_cappee=int(row.anciennete_cappee),
                        score_solde=float(row.score_solde),
                        score_activite=float(row.score_activite),
                        score_anciennete=float(row.score_anciennete),
                        score_client=float(row.score_client),
                        priorite_client=row.priorite_client,
                    )
                    for row in clients_df.itertuples(index=False)
                ]
                Client.objects.bulk_create(client_objects, batch_size=1000)

                zone_objects = [
                    Zone(
                        fab_import=fab_import,
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
                ]
                Zone.objects.bulk_create(zone_objects, batch_size=1000)

                fab_import.date_fab = import_summary["date_fab"]
                fab_import.nombre_lignes_total = import_summary["nombre_lignes_total"]
                fab_import.nombre_lignes_apres_nettoyage = import_summary["nombre_lignes_apres_nettoyage"]
                fab_import.nombre_clients_filtres = len(client_objects)
                fab_import.nombre_zones = len(zone_objects)
                fab_import.montant_total = round(float(clients_df["solde"].sum()), 2)
                fab_import.anciennete_moyenne_jours = round(float(clients_df["anciennete_jours"].mean()), 2)
                fab_import.score_moyen_zones = scoring_summary["score_moyen_zones"]
                fab_import.statut = FabImport.Statut.SUCCES
                fab_import.message_erreur = ""
                fab_import.save()
                fab_import.fichier_original.close()
        except Exception as exc:
            fab_import.fichier_original.close()
            fab_import.statut = FabImport.Statut.ERREUR
            fab_import.message_erreur = str(exc)
            fab_import.save(update_fields=["statut", "message_erreur", "updated_at"])
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        serializer = FabImportSerializer(fab_import)
        return Response(
            {
                "summary": serializer.data,
                "comparison": compare_latest_imports(),
            },
            status=status.HTTP_201_CREATED,
        )


class PollMinioAPIView(APIView):
    def post(self, request):
        try:
            files = list_fab_files()
        except Exception as exc:
            return Response({"detail": f"Erreur connexion MinIO : {exc}"}, status=500)

        nouveaux = []
        for filename in files:
            if FabImport.objects.filter(nom_fichier=filename).exists():
                continue
            result = self._process_file(filename)
            if result:
                nouveaux.append(result)

        if not nouveaux:
            return Response({"detail": "Aucun nouveau fichier détecté dans MinIO."}, status=200)

        last = nouveaux[-1]
        return Response({
            "summary": FabImportSerializer(last).data,
            "comparison": compare_latest_imports(),
            "nb_fichiers": len(nouveaux),
            "fichiers": [f.nom_fichier for f in nouveaux],
        }, status=201)

    def _process_file(self, filename):
        from django.core.files.base import ContentFile
        file_bytes = download_fab_file(filename)
        django_file = ContentFile(file_bytes.read(), name=filename)

        fab_import = FabImport.objects.create(
            nom_fichier=filename,
            fichier_original=django_file,
            date_import=timezone.now(),
            statut=FabImport.Statut.EN_COURS,
        )
        try:
            with transaction.atomic():
                fab_import.fichier_original.open("rb")
                cleaned_df, import_summary = process_fab_file(fab_import.fichier_original)
                clients_df, zones_df, scoring_summary = score_clients_and_zones(cleaned_df)

                client_objects = [
                    Client(
                        fab_import=fab_import,
                        ref_abonnement=row.ref_abonnement,
                        nom_client=row.nom_client or "",
                        adresse_client=row.adresse_client or "",
                        telephone=row.telephone or "",
                        numero_compteur=row.numero_compteur or "",
                        code_centre=row.code_centre,
                        secteur_facturation=row.secteur_facturation,
                        tournee_releve=row.tournee_releve,
                        zone_code=row.zone_code,
                        activite_client=row.activite_client or "",
                        famille_activite=row.famille_activite or "",
                        solde=float(row.solde),
                        code_relance=int(row.code_relance),
                        date_derniere_facture=row.date_derniere_facture,
                        date_dernier_paiement=row.date_dernier_paiement,
                        anciennete_jours=int(row.anciennete_jours),
                        anciennete_cappee=int(row.anciennete_cappee),
                        score_solde=float(row.score_solde),
                        score_activite=float(row.score_activite),
                        score_anciennete=float(row.score_anciennete),
                        score_client=float(row.score_client),
                        priorite_client=row.priorite_client,
                    )
                    for row in clients_df.itertuples(index=False)
                ]
                Client.objects.bulk_create(client_objects, batch_size=1000)

                zone_objects = [
                    Zone(
                        fab_import=fab_import,
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
                ]
                Zone.objects.bulk_create(zone_objects, batch_size=1000)

                fab_import.date_fab = import_summary["date_fab"]
                fab_import.nombre_lignes_total = import_summary["nombre_lignes_total"]
                fab_import.nombre_lignes_apres_nettoyage = import_summary["nombre_lignes_apres_nettoyage"]
                fab_import.nombre_clients_filtres = len(client_objects)
                fab_import.nombre_zones = len(zone_objects)
                fab_import.montant_total = round(float(clients_df["solde"].sum()), 2)
                fab_import.anciennete_moyenne_jours = round(float(clients_df["anciennete_jours"].mean()), 2)
                fab_import.score_moyen_zones = scoring_summary["score_moyen_zones"]
                fab_import.statut = FabImport.Statut.SUCCES
                fab_import.message_erreur = ""
                fab_import.save()
                fab_import.fichier_original.close()
            return fab_import
        except Exception as exc:
            fab_import.fichier_original.close()
            fab_import.statut = FabImport.Statut.ERREUR
            fab_import.message_erreur = str(exc)
            fab_import.save(update_fields=["statut", "message_erreur", "updated_at"])
            return None


class MinioWebhookAPIView(APIView):
    def post(self, request):
        try:
            records = request.data.get("Records", [])
            if not records:
                return Response({"detail": "Aucun événement reçu."}, status=200)

            traites = []
            for record in records:
                event_name = record.get("eventName", "")
                if "ObjectCreated" not in event_name:
                    continue

                filename = record.get("s3", {}).get("object", {}).get("key", "")
                if not filename.lower().endswith((".csv", ".txt")):
                    continue

                if FabImport.objects.filter(nom_fichier=filename).exists():
                    continue

                result = PollMinioAPIView._process_file(self, filename)
                if result:
                    traites.append(result)

            if not traites:
                return Response({"detail": "Aucun nouveau fichier à traiter."}, status=200)

            last = traites[-1]
            return Response({
                "summary": FabImportSerializer(last).data,
                "nb_fichiers": len(traites),
                "fichiers": [f.nom_fichier for f in traites],
            }, status=201)

        except Exception as exc:
            return Response({"detail": str(exc)}, status=500)


class ImportListAPIView(APIView):
    def get(self, request):
        imports = FabImport.objects.all().order_by("-date_import")
        return Response(FabImportSerializer(imports, many=True).data)


class LatestImportAPIView(APIView):
    def get(self, request):
        latest = FabImport.objects.filter(statut=FabImport.Statut.SUCCES).first()
        if not latest:
            return Response({"detail": "Aucun import reussi disponible."}, status=404)
        return Response(FabImportSerializer(latest).data)


class LatestImportComparisonAPIView(APIView):
    def get(self, request):
        return Response(compare_latest_imports())
