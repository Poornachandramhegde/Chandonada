# raga_layer.py — Layer 3: Raga Pitch Mapping

import numpy as np

BASE_SA = 261.63  # Sa = C4


def ratio_to_hz(ratios, base=BASE_SA):
    return [round(base * r, 2) for r in ratios]


# ── Raga Definitions ──────────────────────────────────────────
RAGAS = {
    "Yaman": {
        "description": "Thaat Kalyan — evening, majestic, auspicious",
        "swaras":      ["Ni(l)", "Sa", "Re", "Ga", "Ma#", "Pa", "Dha", "Ni", "Sa'"],
        "aroha":       ratio_to_hz([15/16, 1, 9/8, 5/4, 45/32, 3/2, 5/3, 15/8, 2]),
        "avaroha":     ratio_to_hz([2, 15/8, 5/3, 3/2, 45/32, 5/4, 9/8, 1]),
        "vadi":        ratio_to_hz([5/4])[0],
        "samvadi":     ratio_to_hz([15/8])[0],
        "pakad":       ratio_to_hz([15/16, 9/8, 5/4, 45/32, 5/3, 15/8, 2]),
        "pakad_names": ["Ni(l)", "Re", "Ga", "Ma#", "Dha", "Ni", "Sa'"],
        "nyasa":       ratio_to_hz([5/4, 3/2, 2]),
        "graha":       ratio_to_hz([15/16, 1, 5/4]),
    },
    "Mohanam": {
        "description": "Carnatic Audava-Audava — bright, devotional, tranquil",
        "swaras":      ["Sa", "Re₂", "Ga₃", "Pa", "Dha₂", "Sa'"],
        "aroha":       ratio_to_hz([1, 9/8, 5/4, 3/2, 5/3, 2]),
        "avaroha":     ratio_to_hz([2, 5/3, 3/2, 5/4, 9/8, 1]),
        "vadi":        ratio_to_hz([5/4])[0],
        "samvadi":     ratio_to_hz([5/3])[0],
        "nyasa":       ratio_to_hz([5/4, 3/2]),
        "graha":       ratio_to_hz([1, 5/4, 5/3]),
    },
}


def hz_to_swara_label(hz: float, raga: dict) -> str:
    """Return the closest swara name for a given Hz value."""
    if hz == 0:
        return "—"
    all_hz  = raga["aroha"]
    swaras  = raga["swaras"]
    closest = min(range(len(all_hz)), key=lambda i: abs(all_hz[i] - hz))
    return swaras[min(closest, len(swaras) - 1)]


# ── Core pitch assignment ──────────────────────────────────────
def assign_pitch(
    syllables:  list[str],
    weights:    list[str],
    pada_size:  int = 8,
    raga_name:  str = "Yaman",
    contour:    str = "arch",
) -> list[dict]:
    """
    Public entry point called from main.py.

    Args:
        syllables : list of syllable strings from chanda detection
        weights   : parallel list of 'G' / 'L' strings
        pada_size : syllables per pada (default 8 for Anushtubh)
        raga_name : 'Yaman' or 'Mohanam'
        contour   : 'arch' | 'ascending' | 'descending'

    Returns:
        list of dicts, one per syllable:
        {
            syllable, pada_idx, position_in_pada,
            weight, pitch_hz, swara_label,
            is_gana_head, role
        }
    """
    if raga_name not in RAGAS:
        raise ValueError(f"raga_name must be one of {list(RAGAS.keys())}")

    raga    = RAGAS[raga_name]
    aroha   = raga["aroha"]
    avaroha = raga["avaroha"]
    n_a     = len(aroha)
    n_av    = len(avaroha)

    # Split into padas
    padas = []
    for i in range(0, len(syllables), pada_size):
        padas.append({
            "syllables": syllables[i : i + pada_size],
            "weights":   weights[i   : i + pada_size],
        })

    results = []

    for pada_idx, pada in enumerate(padas):
        syl_list = pada["syllables"]
        wt_list  = pada["weights"]
        n        = len(syl_list)

        for pos, (syl, wt) in enumerate(zip(syl_list, wt_list)):
            norm      = pos / max(n - 1, 1)
            is_head   = (pos == 0)          # Gaṇa head = first of each group of 4
            is_last   = (pos == n - 1)

            # ── Base pitch from melodic contour ───────────────
            if contour == "arch":
                if norm <= 0.5:
                    idx   = int((norm * 2) * (n_a - 1))
                    pitch = aroha[min(idx, n_a - 1)]
                else:
                    idx   = int(((norm - 0.5) * 2) * (n_av - 1))
                    pitch = avaroha[min(idx, n_av - 1)]
            elif contour == "ascending":
                idx   = int(norm * (n_a - 1))
                pitch = aroha[min(idx, n_a - 1)]
            else:  # descending
                idx   = int(norm * (n_av - 1))
                pitch = avaroha[min(idx, n_av - 1)]

            # ── Musicological rules (in priority order) ───────
            role = "passing"

            if pos == 0:
                pitch = raga["graha"][0]
                role  = "graha"

            elif is_head:
                pitch = raga["vadi"] if pada_idx % 2 == 0 else raga["samvadi"]
                role  = "vadi" if pada_idx % 2 == 0 else "samvadi"

            elif wt == "G":
                nyasa = raga["nyasa"]
                pitch = min(nyasa, key=lambda n: abs(n - pitch))
                role  = "nyasa"

            elif wt == "L":
                pitch = round(pitch * 0.985, 2)
                role  = "laghu-passing"

            # Last syllable resolves to Sa
            if is_last:
                pitch = BASE_SA
                role  = "resolution"

            results.append({
                "syllable":        syl,
                "pada_idx":        pada_idx,
                "position_in_pada": pos,
                "weight":          wt,
                "pitch_hz":        pitch,
                "swara_label":     hz_to_swara_label(pitch, raga),
                "is_gana_head":    is_head,
                "role":            role,
            })

    return results


def get_raga_info(raga_name: str) -> dict:
    """Return metadata for a raga (for display in the frontend)."""
    if raga_name not in RAGAS:
        raise ValueError(f"raga_name must be one of {list(RAGAS.keys())}")
    r = RAGAS[raga_name]
    return {
        "name":        raga_name,
        "description": r["description"],
        "swaras":      r["swaras"],
        "aroha_hz":    r["aroha"],
        "avaroha_hz":  r["avaroha"],
        "vadi_hz":     r["vadi"],
        "samvadi_hz":  r["samvadi"],
        "vadi_swara":  hz_to_swara_label(r["vadi"],    r),
        "samvadi_swara": hz_to_swara_label(r["samvadi"], r),
    }