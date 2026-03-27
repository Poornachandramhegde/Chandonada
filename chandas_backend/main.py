from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import re

try:
    from indic_transliteration import sanscript
    from indic_transliteration.sanscript import transliterate
    HAS_TRANSLIT = True
except ImportError:
    HAS_TRANSLIT = False

app = FastAPI(title="Chandas Detection API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Constants ──────────────────────────────────────────────────
SLP_ALL    = "aAiIuUfFxXeEoOkKgGNcCjJYwWqQRtTdDnpPbBmyrlvzSshMH"
VOWELS     = "aAiIuUfFxXeEoO"
CONSONANTS = set("kKgGNcCjJYwWqQRtTdDnpPbBmyrlvzSsh")
LONG_V     = set("AIUFXeEoO")

# ── Text Helpers ───────────────────────────────────────────────
def fix_slp(slp: str) -> str:
    return slp.replace("z", "S")

def clean_text(text: str) -> str:
    return re.sub(f"[^{SLP_ALL}]", "", text)

# ── Syllabification ────────────────────────────────────────────
def get_syllables(text: str):
    syllables = []
    i = 0
    while i < len(text):
        syl   = ""
        start = i
        if i < len(text) and text[i] in CONSONANTS and text[i] not in "MH":
            syl += text[i]
            i   += 1
        if i < len(text) and text[i] in VOWELS:
            syl += text[i]
            i   += 1
            while i < len(text) and text[i] in CONSONANTS and text[i] not in "MH":
                if i + 1 < len(text) and text[i+1] in CONSONANTS and text[i+1] not in "MH":
                    syl += text[i]
                    i   += 1
                else:
                    break
            if i < len(text) and text[i] in "MH":
                syl += text[i]
                i   += 1
        if i == start:
            i += 1
        if syl:
            syllables.append(syl)
    return syllables

# ── Laghu / Guru Weight ────────────────────────────────────────
def syllable_weight(syl: str, next_syl: str = None) -> str:
    vowel = ""
    for ch in syl:
        if ch in VOWELS:
            vowel = ch
            break
    if not vowel:
        return "G"
    if vowel in LONG_V:
        return "G"
    if syl.endswith("M") or syl.endswith("H"):
        return "G"
    vowel_pos = syl.index(vowel)
    coda = syl[vowel_pos + 1:]
    if any(c in CONSONANTS and c not in "MH" for c in coda):
        return "G"
    if next_syl:
        leading = []
        for ch in next_syl:
            if ch in CONSONANTS and ch not in "MH":
                leading.append(ch)
            else:
                break
        if len(leading) >= 2:
            return "G"
    return "L"

def get_weights(syllables):
    weights = []
    for idx, syl in enumerate(syllables):
        next_syl = syllables[idx+1] if idx+1 < len(syllables) else None
        weights.append(syllable_weight(syl, next_syl))
    return weights

# ── Pāda Splitting ─────────────────────────────────────────────
def split_into_padas(slp_clean: str, pada_size: int = 8):
    all_syls = get_syllables(slp_clean)
    all_wts  = get_weights(all_syls)
    padas = []
    for i in range(0, len(all_syls), pada_size):
        chunk_syls = all_syls[i : i+pada_size]
        chunk_wts  = list(all_wts[i : i+pada_size])
        if chunk_wts:
            chunk_wts[-1] = "G"   # end-of-pāda rule
        padas.append((chunk_syls, chunk_wts, "".join(chunk_wts)))
    return padas

# ── Anushtubh Rule Checker ─────────────────────────────────────
def check_anushtubh_pada(pattern: str, pada_number: int):
    """
    Anushtubh rules (8 syllables per pāda):
      Pos 1-4 : free
      Pos 5   : Laghu  (L)
      Pos 6   : Guru   (G)
      Pos 7   : Guru   for odd  pādas (1, 3)
                Laghu  for even pādas (2, 4)
      Pos 8   : free
    """
    checks    = []
    violations= []
    score     = 0
    total     = 4

    # Length
    ok = len(pattern) == 8
    if ok: score += 1
    else:  violations.append(f"Expected 8 syllables, got {len(pattern)}")
    checks.append({"pos": "Length", "expected": "8 syllables",
                   "got": f"{len(pattern)} syllables", "ok": ok,
                   "reason": "Anushtubh has exactly 8 syllables per pāda"})

    if len(pattern) < 7:
        return False, 0.0, violations, checks

    # Position 5 → L
    got5 = pattern[4]
    ok5  = got5 == "L"
    if ok5: score += 1
    else:   violations.append(f"Position 5 = {got5} (must be Laghu)")
    checks.append({"pos": "5", "expected": "L (Laghu)",
                   "got": "L (Laghu)" if got5=="L" else "G (Guru)",
                   "ok": ok5,
                   "reason": "5th syllable is always Laghu in Anushtubh"})

    # Position 6 → G
    got6 = pattern[5]
    ok6  = got6 == "G"
    if ok6: score += 1
    else:   violations.append(f"Position 6 = {got6} (must be Guru)")
    checks.append({"pos": "6", "expected": "G (Guru)",
                   "got": "G (Guru)" if got6=="G" else "L (Laghu)",
                   "ok": ok6,
                   "reason": "6th syllable is always Guru in Anushtubh"})

    # Position 7
    expected_7 = "G" if pada_number in [1, 3] else "L"
    label_7    = "Guru" if expected_7 == "G" else "Laghu"
    parity     = "odd" if pada_number in [1, 3] else "even"
    got7       = pattern[6]
    ok7        = got7 == expected_7
    if ok7: score += 1
    else:   violations.append(f"Position 7 = {got7} (must be {label_7} for {parity} pāda)")
    checks.append({"pos": "7", "expected": f"{expected_7} ({label_7})",
                   "got": "G (Guru)" if got7=="G" else "L (Laghu)",
                   "ok": ok7,
                   "reason": f"7th syllable is {label_7} in {parity} pādas (pāda {pada_number})"})

    score_pct = round(score / total * 100, 1)
    return len(violations) == 0, score_pct, violations, checks

# ── Full Analysis ──────────────────────────────────────────────
def analyse_anushtubh(slp_clean: str):
    padas        = split_into_padas(slp_clean, pada_size=8)
    pada_results = []
    total_score  = 0
    all_valid    = True

    for i, (syls, wts, pattern) in enumerate(padas):
        pada_num = i + 1
        is_valid, score, violations, checks = check_anushtubh_pada(pattern, pada_num)
        total_score += score
        if not is_valid:
            all_valid = False

        pada_results.append({
            "pada_number": pada_num,
            "parity"     : "odd" if pada_num % 2 else "even",
            "syllables"  : syls,
            "weights"    : wts,
            "pattern"    : pattern,
            "score"      : score,
            "is_valid"   : is_valid,
            "violations" : violations,
            "checks"     : checks,
        })

    return {
        "padas"          : pada_results,
        "overall_score"  : round(total_score / max(len(padas), 1), 1),
        "is_anushtubh"   : all_valid,
        "total_syllables": sum(len(p["syllables"]) for p in pada_results),
        "total_padas"    : len(padas),
    }

# ── Models ─────────────────────────────────────────────────────
class AnalyseRequest(BaseModel):
    text: str

class CheckResult(BaseModel):
    pos     : str
    expected: str
    got     : str
    ok      : bool
    reason  : str

class PadaResult(BaseModel):
    pada_number: int
    parity     : str
    syllables  : list[str]
    weights    : list[str]
    pattern    : str
    score      : float
    is_valid   : bool
    violations : list[str]
    checks     : list[CheckResult]

class AnalyseResponse(BaseModel):
    input_text     : str
    slp1           : str
    total_syllables: int
    total_padas    : int
    overall_score  : float
    is_anushtubh   : bool
    padas          : list[PadaResult]

# ── Endpoint ───────────────────────────────────────────────────
@app.post("/analyse", response_model=AnalyseResponse)
def analyse(req: AnalyseRequest):
    text = req.text.strip()
    if HAS_TRANSLIT:
        slp = transliterate(text, sanscript.DEVANAGARI, sanscript.SLP1)
    else:
        slp = text
    slp       = fix_slp(slp).replace(" ", "")
    slp_clean = clean_text(slp)
    result    = analyse_anushtubh(slp_clean)

    return AnalyseResponse(
        input_text      = text,
        slp1            = slp_clean,
        total_syllables = result["total_syllables"],
        total_padas     = result["total_padas"],
        overall_score   = result["overall_score"],
        is_anushtubh    = result["is_anushtubh"],
        padas           = result["padas"],
    )

@app.get("/")
def root():
    return {"message": "Chandas Detection API is running!"}
