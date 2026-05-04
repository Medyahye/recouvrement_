from django.db import models


class ScoringSetting(models.Model):
    poids_solde_client = models.FloatField(default=0.55)
    poids_activite_client = models.FloatField(default=0.25)
    poids_anciennete_client = models.FloatField(default=0.20)
    poids_solde_zone = models.FloatField(default=0.50)
    poids_nb_clients_zone = models.FloatField(default=0.25)
    poids_anciennete_zone = models.FloatField(default=0.15)
    poids_activite_zone = models.FloatField(default=0.10)
    cap_anciennete_jours = models.PositiveIntegerField(default=90)
    seuil_haute = models.FloatField(default=70)
    seuil_moyenne = models.FloatField(default=40)
    actif = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-actif", "-updated_at"]

    def __str__(self) -> str:
        return f"Scoring actif={self.actif}"
