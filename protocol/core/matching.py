"""Encrypted cross-match: returns Safe / Caution / Unsafe without leaking the passport."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from .allergens import STATUS_CAUTION, STATUS_SAFE, STATUS_UNSAFE, allergen_label, worse
from .contamination import merge_vectors


@dataclass
class Profile:
    public_id: str
    allergens: list[str]
    pregnancy: bool = False
    diabetes: bool = False
    hypertension: bool = False
    sugar_limit_g: float | None = None
    sodium_limit_mg: float | None = None


@dataclass
class MatchResult:
    status: str
    reasons: list[str] = field(default_factory=list)

    def public(self) -> dict[str, str]:
        """Restaurant / kiosk view: binary-ish status, no medical reasons."""
        return {"status": self.status}


def _as_float(value: Any) -> float | None:
    if value is None or value == "":
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def evaluate_dish(
    dish: dict[str, Any],
    restaurant: dict[str, Any] | None,
    products_by_id: dict[str, dict[str, Any]],
    profile: Profile,
) -> MatchResult:
    status = STATUS_SAFE
    reasons: list[str] = []
    user = set(profile.allergens or [])

    def bump(next_status: str, reason: str) -> None:
        nonlocal status
        status = worse(status, next_status)
        if reason not in reasons:
            reasons.append(reason)

    declared = set(dish.get("allergeni_dichiarati") or [])
    traces = set(dish.get("tracce") or [])
    hit = sorted(declared & user)
    if hit:
        bump(STATUS_UNSAFE, "Contiene " + ", ".join(allergen_label(i) for i in hit))
    trace_hit = sorted(traces & user)
    if trace_hit:
        bump(STATUS_CAUTION, "Può contenere tracce di " + ", ".join(allergen_label(i) for i in trace_hit))

    if (dish.get("stato_certificazione") or "pending") != "certified":
        bump(STATUS_CAUTION, "Piatto non ancora certificato SafePlate (filiera o ricetta incompleta)")

    for product_id in dish.get("prodotti") or []:
        product = products_by_id.get(product_id)
        if not product:
            bump(STATUS_CAUTION, f"Ingrediente {product_id} non catalogato")
            continue
        name = product.get("nome") or product_id
        if (product.get("stato_certificazione") or "pending") != "certified":
            bump(STATUS_CAUTION, f"{name}: scheda tecnica non certificata / non rintracciabile")
        phit = sorted(set(product.get("allergeni") or []) & user)
        if phit:
            bump(STATUS_UNSAFE, f"{name} contiene " + ", ".join(allergen_label(i) for i in phit))
        ptraces = sorted(set(product.get("tracce") or []) & user)
        if ptraces:
            bump(STATUS_CAUTION, f"{name} può contenere tracce di " + ", ".join(allergen_label(i) for i in ptraces))
        if profile.pregnancy and product.get("rischio_listeria"):
            bump(STATUS_UNSAFE, f"{name}: rischio listeria (SafePlate Pregnancy)")
        if profile.pregnancy and product.get("rischio_toxo"):
            bump(STATUS_UNSAFE, f"{name}: rischio toxoplasmosi (SafePlate Pregnancy)")
        sugar = _as_float(product.get("zucchero_g"))
        sodium = _as_float(product.get("sodio_mg"))
        if profile.diabetes and profile.sugar_limit_g is not None and sugar is not None and sugar > profile.sugar_limit_g:
            bump(STATUS_CAUTION, f"{name}: zuccheri {sugar} g sopra la soglia {profile.sugar_limit_g} g")
        if (
            profile.hypertension
            and profile.sodium_limit_mg is not None
            and sodium is not None
            and sodium > profile.sodium_limit_mg
        ):
            bump(STATUS_CAUTION, f"{name}: sodio {sodium} mg sopra la soglia {profile.sodium_limit_mg} mg")

    if profile.pregnancy and dish.get("rischio_listeria"):
        bump(STATUS_UNSAFE, "Piatto a rischio listeria (processo non pastorizzato / crudo)")
    if profile.pregnancy and dish.get("rischio_toxo"):
        bump(STATUS_UNSAFE, "Piatto a rischio toxoplasmosi (crudo o non validato)")

    dish_sugar = _as_float(dish.get("zucchero_g"))
    dish_sodium = _as_float(dish.get("sodio_mg"))
    if profile.diabetes and profile.sugar_limit_g is not None and dish_sugar is not None and dish_sugar > profile.sugar_limit_g:
        bump(STATUS_CAUTION, f"Zuccheri del piatto {dish_sugar} g sopra la soglia")
    if (
        profile.hypertension
        and profile.sodium_limit_mg is not None
        and dish_sodium is not None
        and dish_sodium > profile.sodium_limit_mg
    ):
        bump(STATUS_CAUTION, f"Sodio del piatto {dish_sodium} mg sopra la soglia")

    vectors = merge_vectors((restaurant or {}).get("vettori"), dish.get("vettori"))
    if vectors["farina_volatile"] and "glutine" in user:
        bump(STATUS_CAUTION, "Farina volatile in cucina: possibile contaminazione da glutine")
    if vectors["olio_frittura_condiviso"]:
        oil_hit = sorted(set(vectors["allergeni_olio"]) & user)
        if oil_hit:
            bump(
                STATUS_UNSAFE,
                "Olio di frittura condiviso con " + ", ".join(allergen_label(i) for i in oil_hit),
            )
    if vectors["superfici_condivise"]:
        surface_hit = sorted(set(vectors["allergeni_superfici"]) & user)
        if surface_hit:
            bump(
                STATUS_CAUTION,
                "Superfici condivise con " + ", ".join(allergen_label(i) for i in surface_hit),
            )

    return MatchResult(status=status, reasons=reasons)
