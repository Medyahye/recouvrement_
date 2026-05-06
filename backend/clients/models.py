from django.db import models


class Client(models.Model):
    class Priorite(models.TextChoices):
        HAUTE = "HAUTE", "Haute"
        MOYENNE = "MOYENNE", "Moyenne"
        FAIBLE = "FAIBLE", "Faible"

    fab_import = models.ForeignKey(
        "imports.FabImport",
        on_delete=models.CASCADE,
        related_name="clients",
    )
    ref_abonnement = models.CharField(max_length=100, db_index=True)
    nom_client = models.CharField(max_length=255, blank=True, default="")
    adresse_client = models.CharField(max_length=255, blank=True, default="")
    telephone = models.CharField(max_length=50, blank=True, default="")
    numero_compteur = models.CharField(max_length=100, blank=True, default="")
    code_centre = models.CharField(max_length=50, db_index=True)
    secteur_facturation = models.CharField(max_length=50, db_index=True)
    tournee_releve = models.CharField(max_length=50, db_index=True)
    zone_code = models.CharField(max_length=120, db_index=True)
    activite_client = models.CharField(max_length=255, blank=True, default="")
    famille_activite = models.CharField(max_length=100, blank=True, default="")
    solde = models.FloatField(default=0)
    code_relance = models.IntegerField(default=0)
    code_activite = models.IntegerField(default=0)
    code_echeance = models.IntegerField(default=0)
    date_derniere_facture = models.DateField(null=True, blank=True)
    date_dernier_paiement = models.DateField(null=True, blank=True)
    anciennete_jours = models.IntegerField(default=0)
    anciennete_cappee = models.IntegerField(default=0)
    score_solde = models.FloatField(default=0)
    score_activite = models.FloatField(default=0)
    score_anciennete = models.FloatField(default=0)
    score_client = models.FloatField(default=0, db_index=True)
    priorite_client = models.CharField(
        max_length=10,
        choices=Priorite.choices,
        default=Priorite.FAIBLE,
        db_index=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-score_client", "-solde"]

    def __str__(self) -> str:
        return f"{self.ref_abonnement} - {self.nom_client}"
