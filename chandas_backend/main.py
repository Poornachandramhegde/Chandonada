from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from raga_layer import assign_pitch, get_raga_info, RAGAS
import re
import os

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
    checks    = []
    violations= []
    score     = 0
    total     = 4

    ok = len(pattern) == 8
    if ok: score += 1
    else:  violations.append(f"Expected 8 syllables, got {len(pattern)}")
    checks.append({"pos": "Length", "expected": "8 syllables",
                   "got": f"{len(pattern)} syllables", "ok": ok,
                   "reason": "Anushtubh has exactly 8 syllables per pāda"})

    if len(pattern) < 7:
        return False, 0.0, violations, checks

    got5 = pattern[4]
    ok5  = got5 == "L"
    if ok5: score += 1
    else:   violations.append(f"Position 5 = {got5} (must be Laghu)")
    checks.append({"pos": "5", "expected": "L (Laghu)",
                   "got": "L (Laghu)" if got5=="L" else "G (Guru)",
                   "ok": ok5,
                   "reason": "5th syllable is always Laghu in Anushtubh"})

    got6 = pattern[5]
    ok6  = got6 == "G"
    if ok6: score += 1
    else:   violations.append(f"Position 6 = {got6} (must be Guru)")
    checks.append({"pos": "6", "expected": "G (Guru)",
                   "got": "G (Guru)" if got6=="G" else "L (Laghu)",
                   "ok": ok6,
                   "reason": "6th syllable is always Guru in Anushtubh"})

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


# ══════════════════════════════════════════════════════════════
# ── CHANT MODULE ──────────────────────────────────────────────
# ══════════════════════════════════════════════════════════════
try:
    from gtts import gTTS
    import librosa
    import soundfile as sf
    HAS_CHANT = True
except ImportError:
    HAS_CHANT = False

CHANT_OUTPUT_DIR = "chant_outputs"
os.makedirs(CHANT_OUTPUT_DIR, exist_ok=True)

# ── SLP1 → Devanagari ─────────────────────────────────────────
def slp1_to_dev(text: str) -> str:
    if HAS_TRANSLIT:
        return transliterate(text, sanscript.SLP1, sanscript.DEVANAGARI)
    return text

# ── Text → Speech (gTTS) ──────────────────────────────────────
def text_to_speech(dev_text: str, wav_file: str = "base.wav") -> str | None:
    if not HAS_CHANT:
        return None
    try:
        tts = gTTS(dev_text, lang="hi")
        mp3_path = os.path.join(CHANT_OUTPUT_DIR, "temp.mp3")
        tts.save(mp3_path)

        if not os.path.exists(mp3_path) or os.path.getsize(mp3_path) < 2000:
            return None

        y, sr = librosa.load(mp3_path)
        if len(y) == 0:
            return None

        wav_path = os.path.join(CHANT_OUTPUT_DIR, wav_file)
        sf.write(wav_path, y, sr)
        return wav_path
    except Exception as e:
        print("TTS Error:", e)
        return None

# ── Apply Rhythm (Chandas) ─────────────────────────────────────
def apply_rhythm(wav_file: str, lg_pattern: list[str], output_file: str = "rhythm.wav") -> str | None:
    if not HAS_CHANT:
        return None
    try:
        y, sr = librosa.load(wav_file)
        if "G" in lg_pattern:
            y = librosa.effects.time_stretch(y, rate=0.85)
        out_path = os.path.join(CHANT_OUTPUT_DIR, output_file)
        sf.write(out_path, y, sr)
        return out_path
    except Exception as e:
        print("Rhythm Error:", e)
        return None

# ── Apply Pitch (Raga Effect) ─────────────────────────────────
def apply_pitch(wav_file: str, output_file: str = "final_output.wav") -> str | None:
    if not HAS_CHANT:
        return None
    try:
        y, sr = librosa.load(wav_file)
        y_shifted = librosa.effects.pitch_shift(y, sr=sr, n_steps=2)
        out_path = os.path.join(CHANT_OUTPUT_DIR, output_file)
        sf.write(out_path, y_shifted, sr)
        return out_path
    except Exception as e:
        print("Pitch Error:", e)
        return None

# ── Full Chant Pipeline ────────────────────────────────────────
def generate_chant(slp1_text: str, lg_pattern: list[str], output_filename: str = "final_output.wav") -> str | None:
    dev_text = slp1_to_dev(slp1_text)
    wav_file = text_to_speech(dev_text, wav_file="base.wav")
    if wav_file is None:
        return None
    rhythm_file = apply_rhythm(wav_file, lg_pattern, output_file="rhythm.wav")
    if rhythm_file is None:
        return None
    final_file = apply_pitch(rhythm_file, output_file=output_filename)
    return final_file


# ══════════════════════════════════════════════════════════════
# ── Models ────────────────────────────────────────────────────
# ══════════════════════════════════════════════════════════════
class AnalyseRequest(BaseModel):
    text: str

class ChantRequest(BaseModel):
    text      : str
    lg_pattern: list[str] = []

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

class ChantResponse(BaseModel):
    success     : bool
    message     : str
    audio_url   : str | None = None
    devanagari  : str | None = None
    lg_pattern  : list[str] = []

class RagaRequest(BaseModel):
    syllables : list[str]
    weights   : list[str]
    raga_name : str = "Yaman"       # "Yaman" or "Mohanam"
    contour   : str = "arch"        # "arch" | "ascending" | "descending"
    pada_size : int = 8

class SyllablePitch(BaseModel):
    syllable         : str
    pada_idx         : int
    position_in_pada : int
    weight           : str
    pitch_hz         : float
    swara_label      : str
    is_gana_head     : bool
    role             : str

class RagaResponse(BaseModel):
    raga_name    : str
    description  : str
    vadi_swara   : str
    samvadi_swara: str
    contour      : str
    syllable_map : list[SyllablePitch]


# ══════════════════════════════════════════════════════════════
# ── Endpoints ─────────────────────────────────────────────────
# ══════════════════════════════════════════════════════════════

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


@app.post("/chant", response_model=ChantResponse)
def chant(req: ChantRequest):
    """
    Generate a chant audio file from Devanagari or SLP1 text.
    Applies rhythm (based on Laghu/Guru pattern) and pitch shift.
    Returns a URL to download the generated WAV file.
    """
    if not HAS_CHANT:
        return ChantResponse(
            success=False,
            message="Chant dependencies (gtts, librosa, soundfile) not installed."
        )

    text = req.text.strip()

    # Auto-detect script: if Devanagari, transliterate to SLP1 first
    is_devanagari = any('\u0900' <= ch <= '\u097F' for ch in text)
    if is_devanagari and HAS_TRANSLIT:
        slp1_text = transliterate(text, sanscript.DEVANAGARI, sanscript.SLP1)
        slp1_text = fix_slp(slp1_text).replace(" ", "")
        dev_text  = text
    else:
        slp1_text = fix_slp(text).replace(" ", "")
        dev_text  = slp1_to_dev(slp1_text)

    # Derive lg_pattern from analysis if not provided
    lg_pattern = req.lg_pattern
    if not lg_pattern:
        slp_clean  = clean_text(slp1_text)
        syls       = get_syllables(slp_clean)
        lg_pattern = get_weights(syls)

    import uuid
    output_filename = f"chant_{uuid.uuid4().hex[:8]}.wav"
    final_file = generate_chant(slp1_text, lg_pattern, output_filename=output_filename)

    if final_file is None:
        return ChantResponse(
            success=False,
            message="Chant generation failed. Check server logs.",
            devanagari=dev_text,
            lg_pattern=lg_pattern,
        )

    return ChantResponse(
        success    = True,
        message    = "Chant generated successfully.",
        audio_url  = f"/chant/audio/{output_filename}",
        devanagari = dev_text,
        lg_pattern = lg_pattern,
    )

@app.post("/raga", response_model=RagaResponse)
def raga(req: RagaRequest):
    """
    Layer 3: assign raga pitches to syllables from chanda detection.
    Feed syllables + weights from /analyse response directly here.
    """
    if req.raga_name not in RAGAS:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail=f"Choose: {list(RAGAS.keys())}")

    mapped = assign_pitch(
        syllables  = req.syllables,
        weights    = req.weights,
        pada_size  = req.pada_size,
        raga_name  = req.raga_name,
        contour    = req.contour,
    )
    info = get_raga_info(req.raga_name)

    return RagaResponse(
        raga_name     = req.raga_name,
        description   = info["description"],
        vadi_swara    = info["vadi_swara"],
        samvadi_swara = info["samvadi_swara"],
        contour       = req.contour,
        syllable_map  = mapped,
    )


@app.get("/raga/info/{raga_name}")
def raga_info(raga_name: str):
    """Return metadata for a raga (swaras, aroha, avaroha, vadi, samvadi)."""
    if raga_name not in RAGAS:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail=f"Choose: {list(RAGAS.keys())}")
    return get_raga_info(raga_name)


@app.get("/chant/audio/{filename}")
def get_chant_audio(filename: str):
    """Serve generated chant WAV files."""
    path = os.path.join(CHANT_OUTPUT_DIR, filename)
    if not os.path.exists(path):
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Audio file not found")
    return FileResponse(path, media_type="audio/wav", filename=filename)


@app.get("/")
def root():
    return {
        "message"    : "Chandas Detection API is running!",
        "chant_ready": HAS_CHANT,
        "translit_ready": HAS_TRANSLIT,
    }