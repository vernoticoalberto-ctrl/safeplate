"""SafePlate protocol core: allergens, matching, blockchain, QR."""

from .allergens import EU14, ALLERGENS, allergen_label
from .blockchain import GENESIS, event_hash, seal_chain, verify_chain
from .contamination import merge_vectors
from .matching import MatchResult, Profile, evaluate_dish
from .qr import encode_payload, parse_payload

__all__ = [
    "EU14",
    "ALLERGENS",
    "allergen_label",
    "GENESIS",
    "event_hash",
    "seal_chain",
    "verify_chain",
    "merge_vectors",
    "MatchResult",
    "Profile",
    "evaluate_dish",
    "encode_payload",
    "parse_payload",
]
