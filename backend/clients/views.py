from django.db.models import Q
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView

from clients.serializers import ClientSerializer
from imports.models import FabImport


class ClientPagination(PageNumberPagination):
    page_size = 10


class LatestClientsAPIView(APIView):
    def get(self, request):
        latest_fab = FabImport.objects.filter(statut=FabImport.Statut.SUCCES).first()
        if not latest_fab:
            return Response({"detail": "Aucun import reussi disponible."}, status=404)

        sort_map = {
            "score_client": "-score_client",
            "solde":        "-solde",
            "anciennete":   "-anciennete_jours",
        }
        sort_by = sort_map.get(request.GET.get("sort_by", ""), "-score_client")
        queryset = latest_fab.clients.all().order_by(sort_by)

        zone_code   = request.GET.get("zone_code")
        code_centre = request.GET.get("code_centre")
        secteur     = request.GET.get("secteur_facturation")
        activite    = request.GET.get("activite")
        famille     = request.GET.get("famille_activite")
        priorite    = request.GET.get("priorite")
        search      = request.GET.get("search")

        solde_min   = request.GET.get("solde_min")
        solde_max   = request.GET.get("solde_max")
        anc_min     = request.GET.get("anciennete_min")
        anc_max     = request.GET.get("anciennete_max")
        score_min   = request.GET.get("score_min")
        score_max   = request.GET.get("score_max")
        dp_min      = request.GET.get("date_paiement_min")
        dp_max      = request.GET.get("date_paiement_max")
        df_min      = request.GET.get("date_facture_min")
        df_max      = request.GET.get("date_facture_max")

        if zone_code:
            queryset = queryset.filter(zone_code__iexact=zone_code)
        if code_centre:
            queryset = queryset.filter(code_centre__iexact=code_centre)
        if secteur:
            queryset = queryset.filter(secteur_facturation__icontains=secteur)
        if activite:
            queryset = queryset.filter(activite_client__icontains=activite)
        if famille:
            queryset = queryset.filter(famille_activite__icontains=famille)
        if priorite:
            queryset = queryset.filter(priorite_client=priorite.upper())
        if search:
            queryset = queryset.filter(
                Q(ref_abonnement__icontains=search)
                | Q(nom_client__icontains=search)
                | Q(adresse_client__icontains=search)
                | Q(telephone__icontains=search)
            )
        if solde_min:
            queryset = queryset.filter(solde__gte=float(solde_min))
        if solde_max:
            queryset = queryset.filter(solde__lte=float(solde_max))
        if anc_min:
            queryset = queryset.filter(anciennete_jours__gte=int(anc_min))
        if anc_max:
            queryset = queryset.filter(anciennete_jours__lte=int(anc_max))
        if score_min:
            queryset = queryset.filter(score_client__gte=float(score_min))
        if score_max:
            queryset = queryset.filter(score_client__lte=float(score_max))
        if dp_min:
            queryset = queryset.filter(date_dernier_paiement__gte=dp_min)
        if dp_max:
            queryset = queryset.filter(date_dernier_paiement__lte=dp_max)
        if df_min:
            queryset = queryset.filter(date_derniere_facture__gte=df_min)
        if df_max:
            queryset = queryset.filter(date_derniere_facture__lte=df_max)

        paginator = ClientPagination()
        page = paginator.paginate_queryset(queryset, request)
        serializer = ClientSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)
