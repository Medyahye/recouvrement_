from __future__ import annotations

import os
import re
from io import BytesIO
from typing import Dict, Iterable, Tuple

import pandas as pd
from django.utils import timezone

from scoring.models import ScoringSetting


DROP_COLUMNS = {"folio", "nb_paiements_par_jour", "gps_x", "gps_y", "whatsap", "whatsapp", "whats_app"}
REQUIRED_COLUMNS = {
    "code_centre",
    "secteur_facturation",
    "tournee_releve",
    "ref_abonnement",
    "solde",
    "code_relance",
    "activite_client",
    "date_dernier_paiement",
    "code_activite",
    "code_echeancier",
    "date_derniere_facture",
}
NULL_LIKE_VALUES = {"", "NAN", "NONE", "NULL", "NAT"}

CENTRE_MAPPING: dict[str, str] = {
    "14": "BENICHAB",
    "15": "CHAMI",
    "16": "AOUJEFT",
    "17": "CHINGHITI",
    "18": "OUADANE",
    "19": "MOUDJERIA",
    "20": "TICHIT",
    "21": "FDEIRICK",
    "22": "BIR_MOGHREIN",
    "23": "RKIZ",
    "24": "KEUR_MACENE",
    "25": "BABABE",
    "26": "M'BAGNE",
    "27": "MAGHAMA",
    "28": "MONGUEL",
    "29": "OULD_YENGE",
    "30": "BARKEOL",
    "31": "BOUMDEID",
    "32": "TAMCHAKET",
    "33": "OULATA",
    "34": "AMOURJ",
    "35": "ADEL_BAGROU",
    "36": "SANGRAVA",
    "37": "VASALA",
    "38": "TERMISSE",
    "39": "KIFFA2",
    "40": "NOUADHIBOU_3",
    "41": "TEYARETT2",
    "42": "CARREFOUR2",
    "43": "TEVRAGHZEINA_SUD",
    "44": "DAR_NAIM_NORD",
    "45": "MELLAH",
    "46": "MALLAH_2",
    "47": "TEYARETT",
    "48": "DAR_NAIM_SUD_2",
    "49": "TARHIL1",
    "50": "TARHIL2",
    "51": "TARHIL3",
    "52": "MALLAH_3",
    "53": "RIYAD2",
    "54": "DIR_TECHNICO_COMMERC",
    "55": "TEVRAGHZEINA_NORD_3",
    "60": "NOUADHIBOU_1",
    "61": "BOGHE",
    "62": "AKJOUJT",
    "63": "KHADAMATY",
    "64": "ROSSO",
    "65": "KAEDI",
    "66": "ATAR",
    "67": "ALEG",
    "68": "BOUTILIMIT",
    "69": "MEDERDRA",
    "70": "AIOUN_EL_ATROUSS",
    "71": "NEMA",
    "72": "TIMBEDRA",
    "73": "KIFFA1",
    "74": "GUEROU",
    "75": "SELIBABY",
    "76": "M'BOUT",
    "77": "MAGTALAHAJAR",
    "78": "TIDJIKJA",
    "79": "TINTANE_ANCIEN",
    "80": "NOUADHIBOU_2",
    "81": "DJIGUENI",
    "82": "KANKOUSSA",
    "83": "KOUBENNI",
    "84": "BASSIKNOU",
    "85": "TINTANE_NOUVEAU",
    "86": "WAD_NAGA",
    "87": "CHOGGAR",
    "88": "N'BEIKETTE_LEHWACH",
    "89": "RIYAD1",
    "90": "ARAFAT",
    "91": "TEVRAGHZEINA_NORD_1",
    "92": "CAPITALE",
    "93": "SEBKHA",
    "94": "EL_MINA",
    "95": "CARREFOUR1",
    "96": "KSAR",
    "97": "TEVRAGH_ZEINA_NORD_2",
    "98": "TOUJOUNINE",
    "99": "DAR_NAIM_SUD_1",
    "101": "AIWNAT_ZBEL",
    "102": "TOUIL",
    "103": "BOUHDIDA",
    "104": "MAAL",
    "105": "LEXEIBA",
    "106": "WOMPOU",
    "107": "GABOU",
    "108": "TEKANE",
    "109": "CHINGUITT_NOUVEAU",
}


def _normalize_columns(columns: Iterable[str]) -> list[str]:
    normalized = []
    for column in columns:
        column_name = str(column).strip().lstrip("﻿").lower()
        column_name = re.sub(r"[\s\-.]+", "_", column_name)
        normalized.append(column_name)
    return normalized


def _normalize_text(value: object) -> object:
    if pd.isna(value):
        return None
    text = str(value).strip().upper()
    if text in NULL_LIKE_VALUES:
        return None
    return text


def _read_dataframe(uploaded_file) -> pd.DataFrame:
    content = uploaded_file.read()
    if not content:
        raise ValueError("Le fichier est vide.")

    separator_candidates = [None, "|", ";", ",", "\t"]

    for encoding in ("utf-8-sig", "utf-8", "latin1"):
        fallback_single_column = None
        for separator in separator_candidates:
            try:
                if separator is None:
                    dataframe = pd.read_csv(
                        BytesIO(content),
                        sep=None,
                        engine="python",
                        encoding=encoding,
                        on_bad_lines="skip",
                    )
                else:
                    dataframe = pd.read_csv(
                        BytesIO(content),
                        sep=separator,
                        engine="python",
                        encoding=encoding,
                        on_bad_lines="skip",
                    )

                if dataframe.empty:
                    continue

                if dataframe.shape[1] > 1:
                    return dataframe
                fallback_single_column = dataframe
            except UnicodeDecodeError:
                break
            except pd.errors.EmptyDataError:
                continue
            except pd.errors.ParserError:
                continue

        if fallback_single_column is not None:
            return fallback_single_column

    raise ValueError("Impossible de lire le fichier avec utf-8 ou latin1.")


def _extract_date_fab(filename: str):
    patterns = [
        r"(\d{4})(\d{2})(\d{2})",
        r"(\d{2})[-_](\d{2})[-_](\d{4})",
    ]
    for pattern in patterns:
        match = re.search(pattern, filename)
        if not match:
            continue
        parts = match.groups()
        if len(parts[0]) == 4:
            return timezone.datetime(int(parts[0]), int(parts[1]), int(parts[2])).date()
        return timezone.datetime(int(parts[2]), int(parts[1]), int(parts[0])).date()
    return timezone.localdate()


def _appliquer_mapping_centre(df: pd.DataFrame) -> pd.DataFrame:
    if "code_centre" not in df.columns:
        return df
    df["code_centre"] = (
        df["code_centre"]
        .astype(str)
        .str.strip()
        .map(CENTRE_MAPPING)
    )
    return df


def process_fab_file(uploaded_file) -> Tuple[pd.DataFrame, Dict[str, object]]:
    raw_df = _read_dataframe(uploaded_file)
    raw_df.columns = _normalize_columns(raw_df.columns)
    raw_df = raw_df.drop(
        columns=[column for column in DROP_COLUMNS if column in raw_df.columns],
        errors="ignore",
    )

    raw_df = _appliquer_mapping_centre(raw_df)

    missing_columns = sorted(REQUIRED_COLUMNS - set(raw_df.columns))
    if missing_columns:
        raise ValueError(f"Colonnes obligatoires manquantes: {', '.join(missing_columns)}.")

    df = raw_df.copy()
    for column in df.columns:
        if df[column].dtype == object:
            df[column] = df[column].apply(_normalize_text)

    df["solde"] = (
        df["solde"]
        .astype(str)
        .str.replace(" ", "", regex=False)
        .str.replace(",", ".", regex=False)
    )
    df["solde"] = pd.to_numeric(df["solde"], errors="coerce")
    df["code_relance"] = pd.to_numeric(df["code_relance"], errors="coerce").fillna(0).astype(int)
    df["code_activite"] = pd.to_numeric(df["code_activite"], errors="coerce").fillna(0).astype(int)
    df["code_echeancier"] = pd.to_numeric(df["code_echeancier"], errors="coerce").fillna(0).astype(int)
    df["date_dernier_paiement"] = pd.to_datetime(
        df["date_dernier_paiement"], errors="coerce", dayfirst=True
    )

    if "date_derniere_facture" in df.columns:
        df["date_derniere_facture"] = pd.to_datetime(
            df["date_derniere_facture"], errors="coerce", dayfirst=True
        )
    else:
        df["date_derniere_facture"] = pd.NaT

    for optional_column in ["nom_client", "adresse_client", "telephone", "numero_compteur", "montant_derniere_facture"]:
        if optional_column not in df.columns:
            df[optional_column] = None

    if "montant_derniere_facture" in df.columns:
        df["montant_derniere_facture"] = pd.to_numeric(
            df["montant_derniere_facture"].astype(str).str.replace(" ", "", regex=False).str.replace(",", ".", regex=False),
            errors="coerce",
        )

    today = pd.Timestamp(timezone.localdate())
    before_count = len(df)

    # Filtrage selon les critères de la Note Explicative §3.1
    df = df[df["code_relance"] == 1]  # Coupure immédiate
    df = df[df["code_activite"] == 1]  # Abonné actif
    df = df[df["code_echeancier"] == 0]  # Pas d'échéancier
    df = df[df["solde"] > 0]  # Solde positif
    df = df[df["date_derniere_facture"].notna()]  # Date facture renseignée
    df = df[df["date_dernier_paiement"].notna()]  # Date dernier paiement renseignée
    df = df[df["activite_client"].notna()]  # Activité client renseignée
    for column in ["code_centre", "secteur_facturation", "tournee_releve", "ref_abonnement"]:
        df = df[df[column].notna()]

    df = df.drop_duplicates()
    if df.empty:
        raise ValueError("Aucune ligne exploitable apres filtrage.")

    # Renommer code_echeancier en code_echeance pour la BDD
    df = df.rename(columns={"code_echeancier": "code_echeance"})

    setting = ScoringSetting.objects.filter(actif=True).order_by("-updated_at").first()
    cap_anciennete = setting.cap_anciennete_jours if setting else 365

    df["zone_code"] = (
        df["code_centre"].astype(str).str.strip()
        + "_"
        + df["secteur_facturation"].astype(str).str.strip()
        + "_"
        + df["tournee_releve"].astype(str).str.strip()
    )
    df["anciennete_jours"] = (today - df["date_dernier_paiement"]).dt.days
    df["anciennete_cappee"] = df["anciennete_jours"].clip(upper=cap_anciennete)
    df["score_anciennete"] = (1 - (df["anciennete_cappee"] / float(cap_anciennete))).round(4)

    df["date_dernier_paiement"] = df["date_dernier_paiement"].dt.date
    df["date_derniere_facture"] = pd.to_datetime(
        df["date_derniere_facture"], errors="coerce"
    ).dt.date

    summary = {
        "date_fab": _extract_date_fab(uploaded_file.name),
        "nombre_lignes_total": int(len(raw_df)),
        "nombre_lignes_apres_nettoyage": int(len(df)),
        "nombre_lignes_avant_filtrage": int(before_count),
    }
    return df.reset_index(drop=True), summary
