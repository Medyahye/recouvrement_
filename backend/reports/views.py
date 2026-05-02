from rest_framework.response import Response
from rest_framework.views import APIView

from imports.models import FabImport
from reports.models import Report
from reports.serializers import ReportSerializer
from reports.services.report_generator import generate_word_report


class ReportListAPIView(APIView):
    def get(self, request):
        reports = Report.objects.all().order_by("-date_generation")
        return Response(ReportSerializer(reports, many=True).data)


class GenerateReportAPIView(APIView):
    def post(self, request):
        latest_fab = FabImport.objects.filter(statut=FabImport.Statut.SUCCES).first()
        if not latest_fab:
            return Response({"detail": "Aucun import reussi disponible."}, status=404)

        generated = generate_word_report(latest_fab)
        history = Report.objects.all().order_by("-date_generation")
        return Response(
            {
                "generated": generated,
                "history": ReportSerializer(history, many=True).data,
            }
        )
