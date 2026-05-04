from __future__ import annotations

from typing import Dict, Tuple

import numpy as np
import pandas as pd

from scoring.models import ScoringSetting
from scoring.services.activity_classifier import classer_activite


def get_active_scoring_setting() -> ScoringSetting:
    setting = ScoringSetting.objects.filter(actif=True).order_by("-updated_at").first()
    if setting:
        return setting
    return ScoringSetting.objects.create(actif=True)


def _normalize_series(series: pd.Series) -> pd.Series:
    if series.empty:
        return series
    minimum = series.min()
    maximum = series.max()
    if pd.isna(minimum) or pd.isna(maximum):
        return pd.Series([0.0] * len(series), index=series.index)
    if minimum == maximum:
        return pd.Series([1.0] * len(series), index=series.index)
    return (series - minimum) / (maximum - minimum)


def _normalize_log(series: pd.Series) -> pd.Series:
    if series.empty:
        return series
    log_series = np.log1p(series.clip(lower=0))
    return _normalize_series(log_series)


def _priority_from_score(score: float, seuil_haute: float, seuil_moyenne: float) -> str:
    if score >= seuil_haute:
        return "HAUTE"
    if score >= seuil_moyenne:
        return "MOYENNE"
    return "FAIBLE"


def score_clients_and_zones(df: pd.DataFrame) -> Tuple[pd.DataFrame, pd.DataFrame, Dict[str, float]]:
    setting = get_active_scoring_setting()
    scored = df.copy()

    activity_data = scored["activite_client"].apply(classer_activite)
    scored["famille_activite"] = activity_data.apply(lambda item: item[0])
    scored["score_activite"] = activity_data.apply(lambda item: item[1])
    scored["score_solde"] = _normalize_log(scored["solde"].astype(float))
    scored["score_anciennete"] = scored["anciennete_cappee"].astype(float) / float(setting.cap_anciennete_jours)
    scored["score_client"] = (
        setting.poids_solde_client * scored["score_solde"]
        + setting.poids_activite_client * scored["score_activite"]
        + setting.poids_anciennete_client * scored["score_anciennete"]
    ) * 100.0
    scored["score_client"] = scored["score_client"].round(2)
    seuil_haute_client = scored["score_client"].quantile(0.75)
    seuil_moyenne_client = scored["score_client"].quantile(0.50)
    scored["priorite_client"] = scored["score_client"].apply(
        lambda score: _priority_from_score(score, seuil_haute_client, seuil_moyenne_client)
    )

    grouped = (
        scored.groupby(["zone_code", "code_centre", "secteur_facturation", "tournee_releve"], dropna=False)
        .agg(
            nb_clients=("ref_abonnement", "count"),
            solde_total=("solde", "sum"),
            solde_moyen=("solde", "mean"),
            solde_max=("solde", "max"),
            anciennete_moyenne_jours=("anciennete_jours", "mean"),
            anciennete_max_jours=("anciennete_jours", "max"),
            score_activite_moyen=("score_activite", "mean"),
            activite_dominante=("famille_activite", lambda values: values.mode().iloc[0] if not values.mode().empty else ""),
        )
        .reset_index()
    )

    grouped["score_solde_total"] = _normalize_log(grouped["solde_total"].astype(float))
    grouped["score_nb_clients"] = _normalize_series(grouped["nb_clients"].astype(float))
    grouped["score_anciennete_zone"] = _normalize_series(grouped["anciennete_moyenne_jours"].astype(float))
    grouped["score_activite_zone"] = _normalize_series(grouped["score_activite_moyen"].astype(float))
    grouped["score_zone"] = (
        setting.poids_solde_zone * grouped["score_solde_total"]
        + setting.poids_nb_clients_zone * grouped["score_nb_clients"]
        + setting.poids_anciennete_zone * grouped["score_anciennete_zone"]
        + setting.poids_activite_zone * grouped["score_activite_zone"]
    ) * 100.0
    grouped["score_zone"] = grouped["score_zone"].round(2)
    seuil_haute_zone = grouped["score_zone"].quantile(0.75)
    seuil_moyenne_zone = grouped["score_zone"].quantile(0.50)
    grouped["priorite_zone"] = grouped["score_zone"].apply(
        lambda score: _priority_from_score(score, seuil_haute_zone, seuil_moyenne_zone)
    )
    grouped = grouped.sort_values(by="score_zone", ascending=False).reset_index(drop=True)

    summary = {
        "score_moyen_zones": round(float(grouped["score_zone"].mean()), 2) if not grouped.empty else 0.0,
        "clients_haute_priorite": int((scored["priorite_client"] == "HAUTE").sum()),
        "zones_haute_priorite": int((grouped["priorite_zone"] == "HAUTE").sum()),
    }
    return scored, grouped, summary
