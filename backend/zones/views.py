from django.db.models import Q
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView

from imports.models import FabImport
from zones.models import Zone
from zones.serializers import ZoneDetailSerializer, ZoneSerializer


class ZonePagination(PageNumberPagination):
    page_size = 12


class LatestZonesAPIView(APIView):
    def get(self, request):
        latest_fab = FabImport.objects.filter(statut=FabImport.Statut.SUCCES).first()
        if not latest_fab:
            return Response({"detail": "Aucun import reussi disponible."}, status=404)

        sort_map = {
            "score_zone":   "-score_zone",
            "solde_total":  "-solde_total",
            "nb_clients":   "-nb_clients",
            "anciennete":   "-anciennete_moyenne_jours",
        }
        sort_by = sort_map.get(request.GET.get("sort_by", ""), "-score_zone")
        queryset = latest_fab.zones.all().order_by(sort_by)

        priorite    = request.GET.get("priorite")
        code_centre = request.GET.get("code_centre")
        secteur     = request.GET.get("secteur_facturation")
        tournee     = request.GET.get("tournee_releve")
        activite    = request.GET.get("activite_dominante")
        search      = request.GET.get("search")

        nb_min    = request.GET.get("nb_clients_min")
        nb_max    = request.GET.get("nb_clients_max")
        solde_min = request.GET.get("solde_min")
        solde_max = request.GET.get("solde_max")
        anc_min   = request.GET.get("anciennete_min")
        anc_max   = request.GET.get("anciennete_max")
        score_min = request.GET.get("score_min")
        score_max = request.GET.get("score_max")

        if priorite:
            queryset = queryset.filter(priorite_zone=priorite.upper())
        if code_centre:
            queryset = queryset.filter(code_centre__iexact=code_centre)
        if secteur:
            queryset = queryset.filter(secteur_facturation__icontains=secteur)
        if tournee:
            queryset = queryset.filter(tournee_releve__icontains=tournee)
        if activite:
            queryset = queryset.filter(activite_dominante__icontains=activite)
        if search:
            queryset = queryset.filter(
                Q(zone_code__icontains=search)
                | Q(secteur_facturation__icontains=search)
                | Q(tournee_releve__icontains=search)
                | Q(code_centre__icontains=search)
            )
        if nb_min:
            queryset = queryset.filter(nb_clients__gte=int(nb_min))
        if nb_max:
            queryset = queryset.filter(nb_clients__lte=int(nb_max))
        if solde_min:
            queryset = queryset.filter(solde_total__gte=float(solde_min))
        if solde_max:
            queryset = queryset.filter(solde_total__lte=float(solde_max))
        if anc_min:
            queryset = queryset.filter(anciennete_moyenne_jours__gte=float(anc_min))
        if anc_max:
            queryset = queryset.filter(anciennete_moyenne_jours__lte=float(anc_max))
        if score_min:
            queryset = queryset.filter(score_zone__gte=float(score_min))
        if score_max:
            queryset = queryset.filter(score_zone__lte=float(score_max))

        paginator = ZonePagination()
        page = paginator.paginate_queryset(queryset, request)
        serializer = ZoneSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)


class ZoneDetailAPIView(APIView):
    def get(self, request, pk: int):
        latest_fab = FabImport.objects.filter(statut=FabImport.Statut.SUCCES).first()
        if not latest_fab:
            return Response({"detail": "Aucun import reussi disponible."}, status=404)

        zone = latest_fab.zones.filter(pk=pk).first()
        if not zone:
            return Response({"detail": "Zone introuvable."}, status=404)

        return Response(ZoneDetailSerializer(zone).data)
