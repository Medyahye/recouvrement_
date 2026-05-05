import json

from django.db.models import Count, Sum
from django.http import StreamingHttpResponse
from django.utils import timezone
from groq import AuthenticationError, Groq
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from django.conf import settings
from imports.models import FabImport
from .models import Conversation, Message


def _build_data_context() -> str:
    latest_fab = FabImport.objects.filter(statut=FabImport.Statut.SUCCES).first()
    if not latest_fab:
        return "Aucun import FAB disponible dans le système pour le moment."

    zones_qs = latest_fab.zones.order_by("-score_zone")
    repartition = {
        "HAUTE": zones_qs.filter(priorite_zone="HAUTE").count(),
        "MOYENNE": zones_qs.filter(priorite_zone="MOYENNE").count(),
        "FAIBLE": zones_qs.filter(priorite_zone="FAIBLE").count(),
    }

    top_zones_lines = [
        f"  {z.zone_code} | {z.code_centre} | {z.nb_clients} clients | "
        f"solde {z.solde_total:.0f} MRU | score {z.score_zone:.2f} | {z.priorite_zone}"
        for z in zones_qs[:20]
    ]

    priority_lines = [
        f"  {r['priorite_client']} : {r['nb']} clients, solde {r['solde']:.0f} MRU"
        for r in latest_fab.clients.values("priorite_client").annotate(nb=Count("id"), solde=Sum("solde"))
    ]

    center_lines = [
        f"  Centre {r['code_centre']} : {r['nb']} clients, solde {r['solde']:.0f} MRU"
        for r in latest_fab.clients.values("code_centre").annotate(nb=Count("id"), solde=Sum("solde")).order_by("-solde")[:15]
    ]

    activite_lines = [
        f"  {r['famille_activite'] or 'Non renseigné'} : {r['nb']} clients, solde {r['solde']:.0f} MRU"
        for r in latest_fab.clients.values("famille_activite").annotate(nb=Count("id"), solde=Sum("solde")).order_by("-solde")[:10]
    ]

    date_str = latest_fab.date_import.strftime("%d/%m/%Y") if latest_fab.date_import else "N/A"

    return "\n".join([
        "=== RÉSUMÉ ===",
        f"Fichier : {latest_fab.nom_fichier} | Date : {date_str}",
        f"Clients retenus : {latest_fab.nombre_clients_filtres} | Zones : {latest_fab.nombre_zones}",
        f"Montant total impayé : {latest_fab.montant_total:.0f} MRU",
        f"Ancienneté moyenne : {latest_fab.anciennete_moyenne_jours:.0f} jours | Score moyen zones : {latest_fab.score_moyen_zones:.2f}",
        f"Zones HAUTE={repartition['HAUTE']} MOYENNE={repartition['MOYENNE']} FAIBLE={repartition['FAIBLE']}",
        "",
        "=== TOP 20 ZONES PAR SCORE ===",
        *top_zones_lines,
        "",
        "=== CLIENTS PAR PRIORITÉ ===",
        *priority_lines,
        "",
        "=== CLIENTS PAR CENTRE (top 15) ===",
        *center_lines,
        "",
        "=== CLIENTS PAR ACTIVITÉ (top 10) ===",
        *activite_lines,
    ])


class ConversationListCreateView(APIView):
    def get(self, request):
        convs = Conversation.objects.all()[:50]
        return Response([
            {
                "id": str(c.id),
                "titre": c.titre,
                "created_at": c.created_at.isoformat(),
                "updated_at": c.updated_at.isoformat(),
            }
            for c in convs
        ])

    def post(self, request):
        conv = Conversation.objects.create()
        return Response(
            {
                "id": str(conv.id),
                "titre": "",
                "created_at": conv.created_at.isoformat(),
                "updated_at": conv.updated_at.isoformat(),
            },
            status=status.HTTP_201_CREATED,
        )


class ConversationMessagesView(APIView):
    def get(self, request, conversation_id):
        try:
            conv = Conversation.objects.get(id=conversation_id)
        except Conversation.DoesNotExist:
            return Response({"detail": "Conversation introuvable."}, status=404)

        return Response([
            {
                "id": str(m.id),
                "role": m.role,
                "content": m.content,
                "created_at": m.created_at.isoformat(),
            }
            for m in conv.messages.all()
        ])


class ConversationChatView(APIView):
    def post(self, request, conversation_id):
        try:
            conversation = Conversation.objects.get(id=conversation_id)
        except Conversation.DoesNotExist:
            return Response({"detail": "Conversation introuvable."}, status=404)

        message = request.data.get("message", "").strip()
        if not message:
            return Response({"detail": "Le message est requis."}, status=400)

        if not settings.GROQ_API_KEY:
            return Response({"detail": "Clé API Groq non configurée."}, status=500)

        # Save user message and set conversation title on first message
        Message.objects.create(conversation=conversation, role="user", content=message)
        if not conversation.titre:
            conversation.titre = message[:80]
            conversation.save(update_fields=["titre", "updated_at"])

        context = _build_data_context()
        system_prompt = (
            "Tu es un assistant IA spécialisé pour le système de recouvrement de la SNDE "
            "(Société Nationale d'Eau de Mauritanie). "
            "Tu aides les agents à analyser les données : zones prioritaires, clients en impayé, imports FAB. "
            "Réponds toujours en français. Sois précis et concis. "
            "Utilise les données ci-dessous pour répondre. "
            "Si une question dépasse les données disponibles, dis-le clairement.\n\n"
            "=== DONNÉES ACTUELLES DU SYSTÈME ===\n"
            f"{context}\n"
            "=== FIN DES DONNÉES ==="
        )

        # Build history — last 6 messages max (3 exchanges) to stay within token limits
        all_messages = list(conversation.messages.order_by("created_at"))
        history = all_messages[:-1][-6:]

        groq_messages = [{"role": "system", "content": system_prompt}]
        for m in history:
            groq_messages.append({"role": m.role, "content": m.content})
        groq_messages.append({"role": "user", "content": message})

        def generate():
            full_response = []
            try:
                client = Groq(api_key=settings.GROQ_API_KEY)
                stream = client.chat.completions.create(
                    model="llama-3.3-70b-versatile",
                    messages=groq_messages,
                    max_tokens=1024,
                    stream=True,
                )
                for chunk in stream:
                    token = chunk.choices[0].delta.content or ""
                    if token:
                        full_response.append(token)
                        yield f"data: {json.dumps({'token': token})}\n\n"
            except AuthenticationError:
                yield f"data: {json.dumps({'error': 'Clé API Groq invalide.'})}\n\n"
            except Exception as e:
                yield f"data: {json.dumps({'error': str(e)})}\n\n"

            if full_response:
                Message.objects.create(
                    conversation=conversation,
                    role="assistant",
                    content="".join(full_response),
                )
                Conversation.objects.filter(id=conversation.id).update(
                    updated_at=timezone.now()
                )

            yield "data: [DONE]\n\n"

        response = StreamingHttpResponse(generate(), content_type="text/event-stream")
        response["Cache-Control"] = "no-cache"
        response["X-Accel-Buffering"] = "no"
        return response
