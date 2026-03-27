import { useState } from "react";

const API = process.env.REACT_APP_API_URL || "http://localhost:8000";

const SAMPLE_SHLOKAS = [
  { label: "Ganesha Shloka", text: "वक्रतुण्ड महाकाय सूर्यकोटि समप्रभ निर्विघ्नं कुरु मे देव सर्वकार्येषु सर्वदा" },
  { label: "Bhagavad Gita 1.1", text: "धर्मक्षेत्रे कुरुक्षेत्रे समवेता युयुत्सवः मामकाः पाण्डवाश्चैव किमकुर्वत सञ्जय" },
];

const SAFFRON = "#E8670A";
const GOLD    = "#F0A500";
const DARK    = "#0F0A00";
const SURFACE = "#1A1200";
const CARD_BG = "#231800";
const BORDER  = "#3A2800";
const TEXT    = "#F5DFA0";
const MUTED   = "#9A8060";
const GREEN   = "#4CAF50";
const RED     = "#EF5350";

// ── Syllable Position Labels ──────────────────────────────────
const POSITION_RULES = [
  { pos: 1, rule: "Free",  desc: "Any" },
  { pos: 2, rule: "Free",  desc: "Any" },
  { pos: 3, rule: "Free",  desc: "Any" },
  { pos: 4, rule: "Free",  desc: "Any" },
  { pos: 5, rule: "L",     desc: "Always Laghu" },
  { pos: 6, rule: "G",     desc: "Always Guru" },
  { pos: 7, rule: "G/L",   desc: "Guru (odd) / Laghu (even)" },
  { pos: 8, rule: "Free",  desc: "Any (treated as Guru)" },
];

export default function App() {
  const [text, setText]     = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState("");

  async function analyse() {
    if (!text.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res  = await fetch(`${API}/analyse`, {
        method : "POST",
        headers: { "Content-Type": "application/json" },
        body   : JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error("API error");
      setResult(await res.json());
    } catch {
      setError("Could not connect to backend. Make sure FastAPI is running on port 8000.");
    }
    setLoading(false);
  }

  return (
    <div style={s.root}>
      <div style={s.bgCircle1} />
      <div style={s.bgCircle2} />

      {/* Header */}
      <header style={s.header}>
        <div style={s.headerInner}>
          <span style={s.om}>ॐ</span>
          <div>
            <h1 style={s.title}>Chandonāda</h1>
            <p style={s.subtitle}>Chandas Recognition and Melodic Sanskrit Recitation System</p>
          </div>
        </div>
      </header>

      <main style={s.main}>

        {/* Metre Info Box */}
        <div style={s.infoBox}>
          <div style={s.infoTitle}>📜 Anushtubh Metre Rules</div>

          {/* Definition Shloka */}
          <div style={s.defShloka}>
            <div style={s.defDevanagari}>
              श्लोके षष्ठं गुरु ज्ञेयं सर्वत्र लघु पञ्चमम् ।
            </div>
            <div style={s.defDevanagari}>
              द्विचतुष्पादयोर्ह्रस्वं सप्तमं दीर्घमन्ययोः ॥
            </div>
            <div style={s.defTranslation}>
              "In a Shloka, the 6th syllable is always <b style={{color: SAFFRON}}>Guru</b> and
              the 5th is always <b style={{color: GREEN}}>Laghu</b>. In the 2nd and 4th pādas,
              the 7th is <b style={{color: GREEN}}>Laghu (short)</b>; in the 1st and 3rd,
              it is <b style={{color: SAFFRON}}>Guru (long)</b>."
            </div>
          </div>

          <div style={s.posGrid}>
            {POSITION_RULES.map(r => (
              <div key={r.pos} style={s.posCard(r.rule)}>
                <div style={s.posNum}>Pos {r.pos}</div>
                <div style={s.posRule(r.rule)}>{r.rule}</div>
                <div style={s.posDesc}>{r.desc}</div>
              </div>
            ))}
          </div>
          <div style={s.infoNote}>
            ★ 7th syllable: <b style={{color: SAFFRON}}>Guru</b> in odd pādas (1,3) &nbsp;|&nbsp;
            <b style={{color: GREEN}}>Laghu</b> in even pādas (2,4)
          </div>
        </div>

        {/* Input Card */}
        <div style={s.card}>
          <label style={s.label}>Enter Sanskrit Shloka (Devanagari) — 32 syllables / 4 pādas</label>
          <textarea
            style={s.textarea}
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="वक्रतुण्ड महाकाय सूर्यकोटि समप्रभ निर्विघ्नं कुरु मे देव सर्वकार्येषु सर्वदा"
            rows={3}
          />
          <div style={s.sampleRow}>
            <span style={s.sampleLabel}>Samples:</span>
            {SAMPLE_SHLOKAS.map(s2 => (
              <button key={s2.label} style={s.sampleBtn} onClick={() => setText(s2.text)}>
                {s2.label}
              </button>
            ))}
          </div>
          <button
            style={{...s.analyseBtn, opacity: loading ? 0.7 : 1}}
            onClick={analyse}
            disabled={loading}
          >
            {loading ? "Analysing…" : "Detect Anushtubh →"}
          </button>
          {error && <div style={s.error}>{error}</div>}
        </div>

        {/* Results */}
        {result && <>

          {/* Verdict Banner */}
          <div style={s.verdictBanner(result.is_anushtubh)}>
            <div>
              <div style={s.verdictTag}>Detected Chandas</div>
              <div style={s.verdictName}>
                {result.is_anushtubh ? "✅ Anushtubh (Shloka)" : "⚠️ Partial Anushtubh"}
              </div>
              <div style={s.verdictDesc}>
                {result.is_anushtubh
                  ? "All 4 pādas satisfy Anushtubh metre rules — the most common Sanskrit metre used in Bhagavad Gita, Ramayana, and Mahabharata."
                  : `${result.total_padas} pādas detected. Some pādas do not fully satisfy the Anushtubh rules. Check violations below.`
                }
              </div>
            </div>
            <div style={s.verdictScore}>
              <div style={s.scoreNum}>{result.overall_score}%</div>
              <div style={s.scoreLabel}>match</div>
            </div>
          </div>

          {/* Stats Row */}
          <div style={s.statsRow}>
            {[
              { label: "Total Syllables", value: result.total_syllables },
              { label: "Total Pādas",     value: result.total_padas },
              { label: "Match Score",     value: `${result.overall_score}%` },
              { label: "Valid Pādas",     value: result.padas.filter(p => p.is_valid).length + " / " + result.total_padas },
            ].map(stat => (
              <div key={stat.label} style={s.statCard}>
                <div style={s.statVal}>{stat.value}</div>
                <div style={s.statLabel}>{stat.label}</div>
              </div>
            ))}
          </div>

          {/* SLP1 */}
          <div style={s.card}>
            <div style={s.sectionTitle}>SLP1 Transliteration</div>
            <div style={s.slp1Box}>{result.slp1}</div>
          </div>

          {/* Per-Pāda Analysis */}
          <div style={s.card}>
            <div style={s.sectionTitle}>Pāda-wise Analysis</div>
            {result.padas.map(pada => (
              <div key={pada.pada_number} style={s.padaCard(pada.is_valid)}>

                {/* Pāda Header */}
                <div style={s.padaHeader}>
                  <div style={s.padaTitle}>
                    Pāda {pada.pada_number}
                    <span style={s.padaParity}> ({pada.parity})</span>
                  </div>
                  <div style={s.padaScore(pada.is_valid)}>
                    {pada.is_valid ? "✅ Valid" : "❌ Invalid"} · {pada.score}%
                  </div>
                </div>

                {/* Syllable Grid */}
                <div style={s.sylRow}>
                  {pada.syllables.map((syl, i) => (
                    <div key={i} style={s.sylCard(pada.weights[i], i, pada.pada_number)}>
                      <div style={s.sylPos}>{i + 1}</div>
                      <div style={s.sylText}>{syl}</div>
                      <div style={s.sylWeight(pada.weights[i])}>
                        {pada.weights[i] === "G" ? "–" : "◡"}
                      </div>
                      <div style={s.sylLabel(pada.weights[i])}>
                        {pada.weights[i] === "G" ? "Guru" : "Laghu"}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pattern Display */}
                <div style={s.patternRow}>
                  <span style={s.patternLabel}>Pattern:</span>
                  {pada.pattern.split("").map((p, i) => (
                    <span key={i} style={s.patternCell(p)}>{p}</span>
                  ))}
                  <span style={s.patternLabel}>Expected:</span>
                  {["x","x","x","x","L","G", pada.pada_number % 2 ? "G" : "L","x"].map((e, i) => (
                    <span key={i} style={s.expectedCell(e)}>{e}</span>
                  ))}
                </div>

                {/* Rule Checks */}
                <div style={s.checksGrid}>
                  {pada.checks.map((chk, i) => (
                    <div key={i} style={s.checkCard(chk.ok)}>
                      <div style={s.checkHeader}>
                        <span style={s.checkPos}>Pos {chk.pos}</span>
                        <span style={s.checkIcon}>{chk.ok ? "✅" : "❌"}</span>
                      </div>
                      <div style={s.checkExpected}>Expected: <b>{chk.expected}</b></div>
                      <div style={s.checkGot}>Got: <b style={{color: chk.ok ? GREEN : RED}}>{chk.got}</b></div>
                      <div style={s.checkReason}>{chk.reason}</div>
                    </div>
                  ))}
                </div>

                {/* Violations */}
                {pada.violations.length > 0 && (
                  <div style={s.violations}>
                    <div style={s.violTitle}>⚠️ Violations:</div>
                    {pada.violations.map((v, i) => (
                      <div key={i} style={s.violItem}>• {v}</div>
                    ))}
                  </div>
                )}

              </div>
            ))}
          </div>

          {/* Why Anushtubh explanation */}
          <div style={s.card}>
            <div style={s.sectionTitle}>Why Anushtubh?</div>
            <div style={s.whyBox}>
              <p style={s.whyText}>
                The <b style={{color: GOLD}}>Anushtubh</b> (also called <b style={{color: GOLD}}>Shloka</b>)
                is the most common metre in Sanskrit literature. It has <b>4 pādas</b> of <b>8 syllables</b> each,
                totalling <b>32 syllables</b>.
              </p>
              <div style={s.whyRules}>
                <div style={s.whyRule}><span style={s.whyBullet}>①</span> Positions 1–4 are <b>free</b> (Laghu or Guru)</div>
                <div style={s.whyRule}><span style={s.whyBullet}>②</span> Position 5 is always <b style={{color: GREEN}}>Laghu</b></div>
                <div style={s.whyRule}><span style={s.whyBullet}>③</span> Position 6 is always <b style={{color: SAFFRON}}>Guru</b></div>
                <div style={s.whyRule}><span style={s.whyBullet}>④</span> Position 7 is <b style={{color: SAFFRON}}>Guru</b> in odd pādas, <b style={{color: GREEN}}>Laghu</b> in even pādas</div>
                <div style={s.whyRule}><span style={s.whyBullet}>⑤</span> Position 8 is <b>free</b> (treated as Guru at line end)</div>
              </div>
              <p style={s.whyText}>
                Found in: <b style={{color: GOLD}}>Bhagavad Gita, Ramayana, Mahabharata</b> and most Sanskrit shlokas.
              </p>
            </div>
          </div>

        </>}
      </main>

      <footer style={s.footer}>
        Anushtubh Chandas Detector · AI-Driven Sanskrit Chanting Systems
      </footer>
    </div>
  );
}

// ── Styles ─────────────────────────────────────────────────────
const s = {
  root: {
    minHeight: "100vh", background: DARK, color: TEXT,
    fontFamily: "'Georgia', 'Palatino Linotype', serif",
    position: "relative", overflow: "hidden",
  },
  bgCircle1: {
    position: "fixed", top: -200, right: -200,
    width: 600, height: 600, borderRadius: "50%",
    background: "radial-gradient(circle, rgba(232,103,10,0.08) 0%, transparent 70%)",
    pointerEvents: "none",
  },
  bgCircle2: {
    position: "fixed", bottom: -300, left: -200,
    width: 700, height: 700, borderRadius: "50%",
    background: "radial-gradient(circle, rgba(240,165,0,0.06) 0%, transparent 70%)",
    pointerEvents: "none",
  },
  header: {
    borderBottom: `1px solid ${BORDER}`, padding: "20px 40px",
    background: `${SURFACE}CC`, backdropFilter: "blur(10px)",
    position: "sticky", top: 0, zIndex: 10,
  },
  headerInner: { display: "flex", alignItems: "center", gap: 20, maxWidth: 960, margin: "0 auto" },
  om: { fontSize: 48, color: SAFFRON, textShadow: `0 0 30px ${SAFFRON}88`, lineHeight: 1 },
  title: { margin: 0, fontSize: 24, color: GOLD, fontWeight: "bold", letterSpacing: 1 },
  subtitle: { margin: "4px 0 0", fontSize: 12, color: MUTED, fontStyle: "italic" },
  main: { maxWidth: 960, margin: "0 auto", padding: "28px 24px 64px" },

  // Metre Info Box
  infoBox: {
    background: "#1A1000", border: `1px solid ${GOLD}33`,
    borderRadius: 12, padding: "20px 24px", marginBottom: 20,
  },
  infoTitle: { fontSize: 14, color: GOLD, marginBottom: 14, fontWeight: "bold" },
  defShloka: { background: "#0F0800", border: `1px solid ${GOLD}33`, borderLeft: `3px solid ${GOLD}`, borderRadius: 8, padding: "14px 18px", marginBottom: 16 },
  defDevanagari: { fontSize: 18, color: GOLD, lineHeight: 1.9, fontFamily: "serif" },
  defTranslation: { fontSize: 12, color: MUTED, fontStyle: "italic", marginTop: 10, lineHeight: 1.7, borderTop: `1px solid ${BORDER}`, paddingTop: 10 },
  posGrid: { display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 },
  posCard: (rule) => ({
    background: rule === "L" ? "#0E2A0E" : rule === "G" ? "#2A1500" : rule === "G/L" ? "#1A1A00" : SURFACE,
    border: `1px solid ${rule === "L" ? "#2A6A2A" : rule === "G" ? SAFFRON+"44" : rule === "G/L" ? GOLD+"33" : BORDER}`,
    borderRadius: 8, padding: "8px 12px", textAlign: "center", minWidth: 70,
  }),
  posNum:  { fontSize: 10, color: MUTED, marginBottom: 4 },
  posRule: (rule) => ({
    fontSize: 16, fontWeight: "bold",
    color: rule === "L" ? GREEN : rule === "G" ? SAFFRON : rule === "G/L" ? GOLD : MUTED,
  }),
  posDesc: { fontSize: 9, color: MUTED, marginTop: 4 },
  infoNote: { fontSize: 12, color: MUTED, fontStyle: "italic" },

  // Input
  card: {
    background: CARD_BG, border: `1px solid ${BORDER}`,
    borderRadius: 12, padding: "24px", marginBottom: 20,
  },
  label: { display: "block", fontSize: 12, color: MUTED, marginBottom: 10, letterSpacing: 1, textTransform: "uppercase" },
  textarea: {
    width: "100%", boxSizing: "border-box",
    background: SURFACE, border: `1px solid ${BORDER}`,
    borderRadius: 8, padding: "14px 16px",
    color: TEXT, fontSize: 18,
    fontFamily: "'Noto Sans Devanagari', serif",
    resize: "vertical", outline: "none", lineHeight: 1.7,
  },
  sampleRow: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 12 },
  sampleLabel: { fontSize: 12, color: MUTED },
  sampleBtn: {
    background: "transparent", border: `1px solid ${BORDER}`,
    borderRadius: 20, padding: "4px 12px",
    color: MUTED, fontSize: 12, cursor: "pointer",
  },
  analyseBtn: {
    marginTop: 16,
    background: `linear-gradient(135deg, ${SAFFRON}, ${GOLD})`,
    border: "none", borderRadius: 8,
    padding: "14px 32px", fontSize: 16,
    color: DARK, fontWeight: "bold",
    cursor: "pointer", width: "100%",
  },
  error: {
    marginTop: 12, padding: "10px 14px",
    background: "#3A0A0A", border: "1px solid #7A2020",
    borderRadius: 8, color: "#FF8080", fontSize: 13,
  },

  // Verdict
  verdictBanner: (valid) => ({
    background: valid ? "linear-gradient(135deg, #1A2A0A, #0E1A06)" : "linear-gradient(135deg, #2A1500, #1A0E00)",
    border: `1px solid ${valid ? GREEN+"44" : SAFFRON+"44"}`,
    borderLeft: `4px solid ${valid ? GREEN : SAFFRON}`,
    borderRadius: 12, padding: "24px", marginBottom: 20,
    display: "flex", justifyContent: "space-between", alignItems: "center",
  }),
  verdictTag:  { fontSize: 11, color: MUTED, letterSpacing: 2, textTransform: "uppercase", marginBottom: 6 },
  verdictName: { fontSize: 28, color: GOLD, fontWeight: "bold", marginBottom: 8 },
  verdictDesc: { fontSize: 13, color: MUTED, fontStyle: "italic", maxWidth: 550, lineHeight: 1.6 },
  verdictScore:{ textAlign: "center", padding: "0 20px" },
  scoreNum:    { fontSize: 44, color: SAFFRON, fontWeight: "bold", lineHeight: 1 },
  scoreLabel:  { fontSize: 11, color: MUTED, textTransform: "uppercase" },

  // Stats
  statsRow: { display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" },
  statCard: {
    flex: 1, minWidth: 120,
    background: CARD_BG, border: `1px solid ${BORDER}`,
    borderRadius: 10, padding: "16px", textAlign: "center",
  },
  statVal:   { fontSize: 24, color: GOLD, fontWeight: "bold" },
  statLabel: { fontSize: 11, color: MUTED, textTransform: "uppercase", letterSpacing: 1, marginTop: 4 },

  sectionTitle: { fontSize: 11, color: SAFFRON, letterSpacing: 2, textTransform: "uppercase", marginBottom: 16 },
  slp1Box: {
    background: SURFACE, borderRadius: 8,
    padding: "12px 16px", fontFamily: "monospace",
    fontSize: 15, color: GOLD, letterSpacing: 2, wordBreak: "break-all",
  },

  // Pāda Cards
  padaCard: (valid) => ({
    background: valid ? "#131F0A" : "#1F0F0A",
    border: `1px solid ${valid ? GREEN+"33" : RED+"33"}`,
    borderRadius: 10, padding: "16px", marginBottom: 16,
  }),
  padaHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  padaTitle:  { fontSize: 16, color: GOLD, fontWeight: "bold" },
  padaParity: { fontSize: 12, color: MUTED },
  padaScore:  (valid) => ({ fontSize: 13, color: valid ? GREEN : RED, fontWeight: "bold" }),

  // Syllable Row
  sylRow: { display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 },
  sylCard: (w, i, padaNum) => {
    const isFixed = i === 4 || i === 5 || i === 6;
    return {
      background: w === "G" ? "#2A1800" : "#0A1A0A",
      border: `2px solid ${isFixed ? (w === "G" ? SAFFRON : GREEN) : BORDER}`,
      borderRadius: 8, padding: "8px 10px", textAlign: "center", minWidth: 52,
    };
  },
  sylPos:    { fontSize: 9, color: MUTED, marginBottom: 2 },
  sylText:   { fontFamily: "monospace", fontSize: 13, color: TEXT, marginBottom: 4 },
  sylWeight: (w) => ({ fontSize: 18, color: w === "G" ? SAFFRON : GREEN }),
  sylLabel:  (w) => ({ fontSize: 9, color: w === "G" ? SAFFRON : GREEN, textTransform: "uppercase" }),

  // Pattern
  patternRow: { display: "flex", alignItems: "center", gap: 6, marginBottom: 12, flexWrap: "wrap" },
  patternLabel: { fontSize: 11, color: MUTED, marginRight: 4 },
  patternCell: (p) => ({
    width: 28, height: 28, borderRadius: 4,
    background: p === "G" ? SAFFRON+"33" : GREEN+"22",
    border: `1px solid ${p === "G" ? SAFFRON+"66" : GREEN+"66"}`,
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    fontSize: 13, fontWeight: "bold",
    color: p === "G" ? SAFFRON : GREEN,
  }),
  expectedCell: (e) => ({
    width: 28, height: 28, borderRadius: 4,
    background: e === "x" ? SURFACE : e === "G" ? SAFFRON+"22" : GREEN+"22",
    border: `1px solid ${e === "x" ? BORDER : e === "G" ? SAFFRON+"55" : GREEN+"55"}`,
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    fontSize: 11, color: e === "x" ? MUTED : e === "G" ? SAFFRON : GREEN,
  }),

  // Rule Checks
  checksGrid: { display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 },
  checkCard:  (ok) => ({
    background: ok ? "#0A1A0A" : "#1A0A0A",
    border: `1px solid ${ok ? GREEN+"44" : RED+"44"}`,
    borderRadius: 8, padding: "10px 12px", minWidth: 140, flex: 1,
  }),
  checkHeader:   { display: "flex", justifyContent: "space-between", marginBottom: 6 },
  checkPos:      { fontSize: 11, color: MUTED, fontWeight: "bold" },
  checkIcon:     { fontSize: 14 },
  checkExpected: { fontSize: 11, color: MUTED, marginBottom: 3 },
  checkGot:      { fontSize: 11, color: TEXT, marginBottom: 4 },
  checkReason:   { fontSize: 10, color: MUTED, fontStyle: "italic", lineHeight: 1.4 },

  // Violations
  violations: {
    background: "#2A0A0A", border: `1px solid ${RED}33`,
    borderRadius: 8, padding: "10px 14px", marginTop: 8,
  },
  violTitle: { fontSize: 12, color: RED, marginBottom: 6, fontWeight: "bold" },
  violItem:  { fontSize: 12, color: "#FF8080", marginBottom: 3 },

  // Why Box
  whyBox:   { lineHeight: 1.8 },
  whyText:  { fontSize: 14, color: TEXT, marginBottom: 14 },
  whyRules: { background: SURFACE, borderRadius: 8, padding: "16px", marginBottom: 14 },
  whyRule:  { fontSize: 13, color: TEXT, marginBottom: 8, display: "flex", alignItems: "flex-start", gap: 10 },
  whyBullet:{ color: SAFFRON, fontSize: 16, minWidth: 24 },

  footer: {
    textAlign: "center", padding: "20px",
    fontSize: 12, color: MUTED, borderTop: `1px solid ${BORDER}`,
  },
};