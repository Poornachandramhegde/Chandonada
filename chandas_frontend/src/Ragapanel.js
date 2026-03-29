// RagaPanel.js
// Behaviour:
//   1. Box appears as soon as text is entered (like Generate Chant box)
//   2. Click the box → expands to show Yaman / Mohanam raga options
//   3. Select a raga → full analysis renders below

import { useState } from "react";

const API = process.env.REACT_APP_API_URL || "http://localhost:8000";

const SAFFRON = "#E8670A";
const GOLD    = "#F0A500";
const DARK    = "#0F0A00";
const SURFACE = "#1A1200";
const CARD_BG = "#231800";
const BORDER  = "#3A2800";
const TEXT    = "#F5DFA0";
const MUTED   = "#9A8060";
const GREEN   = "#4CAF50";
const BLUE    = "#64B5F6";

const RAGA_META = {
  Yaman: {
    tradition: "Hindustani",
    time     : "Evening",
    mood     : "Majestic · Auspicious · Serene",
    aroha    : "Ni Re Ga Ma# Pa Dha Ni Sa'",
    avaroha  : "Sa' Ni Dha Pa Ma# Ga Re Sa",
    symbol   : "♩",
    accent   : GOLD,
    desc     : "Evening rāga of grandeur and peace",
  },
  Mohanam: {
    tradition: "Carnatic",
    time     : "Morning / Devotional",
    mood     : "Bright · Tranquil · Devotional",
    aroha    : "Sa Re₂ Ga₃ Pa Dha₂ Sa'",
    avaroha  : "Sa' Dha₂ Pa Ga₃ Re₂ Sa",
    symbol   : "♪",
    accent   : SAFFRON,
    desc     : "Bright devotional rāga of 5 notes",
  },
};

const ROLE_STYLE = {
  graha          : { bg: GOLD    + "22", border: GOLD    + "66", color: GOLD    },
  vadi           : { bg: SAFFRON + "33", border: SAFFRON + "77", color: SAFFRON },
  samvadi        : { bg: BLUE    + "22", border: BLUE    + "55", color: BLUE    },
  nyasa          : { bg: GREEN   + "22", border: GREEN   + "55", color: GREEN   },
  resolution     : { bg: GOLD    + "22", border: GOLD    + "55", color: GOLD    },
  "laghu-passing": { bg: "#1A1200",      border: BORDER,          color: MUTED   },
  passing        : { bg: "#1A1200",      border: BORDER,          color: MUTED   },
};

function roleStyle(role) {
  return ROLE_STYLE[role] || ROLE_STYLE.passing;
}

function ContourIcon({ type, active, accent }) {
  const paths = {
    arch      : "M4,20 Q20,4 36,20",
    ascending : "M4,20 L36,4",
    descending: "M4,4 L36,20",
  };
  return (
    <svg width={36} height={22} viewBox="0 0 40 24" style={{ display: "block" }}>
      <path d={paths[type]} stroke={active ? accent : MUTED}
        strokeWidth={2} fill="none" strokeLinecap="round" />
    </svg>
  );
}

// ── 3-step state machine ──────────────────────────────────────
// "idle"      → box visible, click to expand
// "selecting" → raga + contour options shown, no result yet
// "done"      → analysis result shown

export default function RagaPanel({ analyseResult }) {
  const [step,     setStep]     = useState("idle");       // idle | selecting | done
  const [raga,     setRaga]     = useState(null);         // null until chosen
  const [contour,  setContour]  = useState("arch");
  const [loading,  setLoading]  = useState(false);
  const [ragaData, setRagaData] = useState(null);
  const [error,    setError]    = useState("");

  const syllables = analyseResult.padas.flatMap(p => p.syllables);
  const weights   = analyseResult.padas.flatMap(p => p.weights);

  // Called when user picks a raga card
  async function selectRaga(ragaName) {
    setRaga(ragaName);
    setLoading(true);
    setError("");
    setRagaData(null);
    try {
      const res = await fetch(`${API}/raga`, {
        method : "POST",
        headers: { "Content-Type": "application/json" },
        body   : JSON.stringify({
          syllables,
          weights,
          raga_name : ragaName,
          contour,
          pada_size : 8,
        }),
      });
      if (!res.ok) throw new Error("API error");
      const data = await res.json();
      setRagaData(data);
      setStep("done");
    } catch {
      setError("Could not connect to backend. Make sure FastAPI is running on port 8000.");
      setStep("selecting");
    }
    setLoading(false);
  }

  function reset() {
    setStep("idle");
    setRaga(null);
    setRagaData(null);
    setError("");
  }

  const accent   = raga ? RAGA_META[raga].accent : GOLD;
  const meta     = raga ? RAGA_META[raga] : null;

  const byPada = ragaData
    ? ragaData.syllable_map.reduce((acc, sv) => {
        acc[sv.pada_idx] = acc[sv.pada_idx] || [];
        acc[sv.pada_idx].push(sv);
        return acc;
      }, {})
    : {};

  // ── STEP 1: idle box (mirrors Generate Chant box exactly) ────
  if (step === "idle") {
    return (
      <div
        onClick={() => setStep("selecting")}
        style={{
          background  : "#1A1500",
          border      : `1px solid ${GOLD}44`,
          borderLeft  : `4px solid ${GOLD}`,
          borderRadius: 12,
          padding     : "18px 20px",
          marginTop   : 16,
          cursor      : "pointer",
          transition  : "border-color 0.2s",
        }}
        onMouseEnter={e => e.currentTarget.style.borderColor = GOLD + "99"}
        onMouseLeave={e => e.currentTarget.style.borderColor = GOLD + "44"}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ fontSize: 28, lineHeight: 1 }}>🎼</span>
          <div>
            <div style={{ fontSize: 15, color: GOLD, fontWeight: "bold" }}>
              Rāga Pitch Analysis
            </div>
            <div style={{ fontSize: 11, color: MUTED, marginTop: 3, fontStyle: "italic" }}>
              Select a rāga and map each syllable to its swara
            </div>
          </div>
          {/* Arrow hint */}
          <span style={{ marginLeft: "auto", color: GOLD, fontSize: 20, opacity: 0.6 }}>›</span>
        </div>
      </div>
    );
  }

  // ── STEP 2: selecting — show raga cards + contour ─────────────
  if (step === "selecting") {
    return (
      <div style={{
        background  : "#1A1500",
        border      : `1px solid ${GOLD}44`,
        borderLeft  : `4px solid ${GOLD}`,
        borderRadius: 12,
        padding     : "18px 20px",
        marginTop   : 16,
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
          <span style={{ fontSize: 28, lineHeight: 1 }}>🎼</span>
          <div>
            <div style={{ fontSize: 15, color: GOLD, fontWeight: "bold" }}>
              Rāga Pitch Analysis
            </div>
            <div style={{ fontSize: 11, color: MUTED, marginTop: 3, fontStyle: "italic" }}>
              Choose a rāga to analyse the śloka
            </div>
          </div>
        </div>

        {/* Contour picker */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 10, color: MUTED, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
            Melodic Contour
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {["arch", "ascending", "descending"].map(c => {
              const act = contour === c;
              return (
                <button
                  key={c}
                  onClick={() => setContour(c)}
                  style={{
                    display      : "flex",
                    flexDirection: "column",
                    alignItems   : "center",
                    gap          : 3,
                    background   : act ? GOLD + "18" : SURFACE,
                    border       : `1px solid ${act ? GOLD + "88" : BORDER}`,
                    borderRadius : 8,
                    padding      : "7px 16px",
                    cursor       : "pointer",
                  }}
                >
                  <ContourIcon type={c} active={act} accent={GOLD} />
                  <span style={{ fontSize: 10, color: act ? GOLD : MUTED, textTransform: "capitalize" }}>{c}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Raga cards — the 2 clickable options */}
        <div style={{ fontSize: 10, color: MUTED, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>
          Select Rāga
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {["Yaman", "Mohanam"].map(name => {
            const m  = RAGA_META[name];
            const ac = m.accent;
            return (
              <button
                key={name}
                onClick={() => selectRaga(name)}
                disabled={loading}
                style={{
                  flex        : 1,
                  minWidth    : 200,
                  background  : SURFACE,
                  border      : `1px solid ${ac}55`,
                  borderLeft  : `4px solid ${ac}`,
                  borderRadius: 10,
                  padding     : "14px 18px",
                  textAlign   : "left",
                  cursor      : loading ? "wait" : "pointer",
                  opacity     : loading ? 0.6 : 1,
                  transition  : "background 0.15s, border-color 0.15s",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = ac + "18"; e.currentTarget.style.borderColor = ac; }}
                onMouseLeave={e => { e.currentTarget.style.background = SURFACE;   e.currentTarget.style.borderColor = ac + "55"; }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: 26, color: ac }}>{m.symbol}</span>
                  <div>
                    <div style={{ fontSize: 16, color: ac, fontWeight: "bold" }}>{name}</div>
                    <div style={{ fontSize: 10, color: MUTED, textTransform: "uppercase", letterSpacing: 1 }}>
                      {m.tradition}
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: 11, color: TEXT, marginBottom: 6, fontStyle: "italic" }}>{m.desc}</div>
                <div style={{ fontSize: 10, color: MUTED, marginBottom: 2 }}>
                  <span style={{ color: ac }}>Āroha: </span>{m.aroha}
                </div>
                <div style={{ fontSize: 10, color: MUTED }}>
                  <span style={{ color: ac }}>Avaroha: </span>{m.avaroha}
                </div>
                <div style={{
                  display    : "inline-block",
                  marginTop  : 10,
                  background : `linear-gradient(135deg, ${ac}, ${GOLD})`,
                  borderRadius: 6,
                  padding    : "5px 14px",
                  fontSize   : 11,
                  color      : DARK,
                  fontWeight : "bold",
                }}>
                  {loading && raga === name ? "Analysing…" : `Analyse in ${name} →`}
                </div>
              </button>
            );
          })}
        </div>

        {error && (
          <div style={{
            marginTop: 12, padding: "10px 14px",
            background: "#3A0A0A", border: "1px solid #7A2020",
            borderRadius: 8, color: "#FF8080", fontSize: 12,
          }}>
            {error}
          </div>
        )}
      </div>
    );
  }

  // ── STEP 3: done — full analysis result ───────────────────────
  return (
    <div style={{
      background  : "#1A1500",
      border      : `1px solid ${accent}44`,
      borderLeft  : `4px solid ${accent}`,
      borderRadius: 12,
      padding     : "18px 20px",
      marginTop   : 16,
    }}>

      {/* Header with selected raga + change button */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16, flexWrap: "wrap" }}>
        <span style={{ fontSize: 28, lineHeight: 1 }}>🎼</span>
        <div>
          <div style={{ fontSize: 15, color: accent, fontWeight: "bold" }}>
            {meta.symbol} Rāga {raga} — Pitch Analysis
          </div>
          <div style={{ fontSize: 11, color: MUTED, marginTop: 3, fontStyle: "italic" }}>
            {meta.tradition} · {meta.time} · {meta.mood}
          </div>
        </div>
        <button
          onClick={reset}
          style={{
            marginLeft  : "auto",
            background  : "transparent",
            border      : `1px solid ${BORDER}`,
            borderRadius: 6,
            padding     : "6px 14px",
            color       : MUTED,
            fontSize    : 11,
            cursor      : "pointer",
          }}
        >
          ↩ Change Rāga
        </button>
      </div>

      {/* Result card */}
      <div style={{ background: SURFACE, borderRadius: 10, padding: "14px 16px" }}>

        {/* Raga info strip */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
          <span style={{ fontSize: 10, color: MUTED, textTransform: "uppercase", letterSpacing: 1, minWidth: 90, paddingTop: 2 }}>
            Rāga Info
          </span>
          <div style={{
            display     : "flex",
            flexWrap    : "wrap",
            background  : CARD_BG,
            border      : `1px solid ${accent}33`,
            borderLeft  : `3px solid ${accent}`,
            borderRadius: 8,
            padding     : "8px 14px",
            flex        : 1,
            gap         : 0,
          }}>
            {[
              { key: "Rāga",    val: ragaData.raga_name     },
              { key: "Vādi",    val: ragaData.vadi_swara    },
              { key: "Samvādi", val: ragaData.samvadi_swara },
              { key: "Contour", val: ragaData.contour       },
              { key: "Āroha",  val: meta.aroha             },
              { key: "Avaroha",val: meta.avaroha           },
            ].map((item, i) => (
              <div key={item.key} style={{ display: "flex", alignItems: "stretch" }}>
                {i > 0 && <div style={{ width: 1, background: BORDER, margin: "2px 0", alignSelf: "stretch" }} />}
                <div style={{ display: "flex", flexDirection: "column", gap: 2, padding: "0 12px" }}>
                  <span style={{ fontSize: 9, color: MUTED, textTransform: "uppercase", letterSpacing: 1 }}>{item.key}</span>
                  <span style={{
                    fontSize  : 12, color: accent, fontWeight: "bold",
                    fontFamily: item.key === "Āroha" || item.key === "Avaroha" ? "monospace" : "inherit",
                  }}>
                    {item.val}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Role key row */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
          <span style={{ fontSize: 10, color: MUTED, textTransform: "uppercase", letterSpacing: 1, minWidth: 90, paddingTop: 2 }}>
            Role Key
          </span>
          <span style={{ display: "flex", flexWrap: "wrap", gap: 4, flex: 1 }}>
            {Object.entries({
              graha: "Starting", vadi: "Vādi", samvadi: "Samvādi",
              nyasa: "Resting", resolution: "Sa", "laghu-passing": "Passing",
            }).map(([role, label]) => {
              const rs = roleStyle(role);
              return (
                <span key={role} style={{
                  display: "inline-flex", alignItems: "center", gap: 4,
                  background: rs.bg, border: `1px solid ${rs.border}`,
                  borderRadius: 4, padding: "3px 8px",
                  fontSize: 10, fontWeight: "bold", color: rs.color,
                }}>
                  {role}
                  <span style={{ color: MUTED, fontWeight: "normal", fontSize: 9 }}>{label}</span>
                </span>
              );
            })}
          </span>
        </div>

        {/* Per-pada blocks */}
        {Object.entries(byPada).map(([pada_idx, syls]) => (
          <div key={pada_idx} style={{
            background: CARD_BG, borderRadius: 8,
            padding: "12px 14px", marginBottom: 10,
            border: `1px solid ${BORDER}`,
          }}>
            <div style={{ fontSize: 12, color: accent, fontWeight: "bold", marginBottom: 10 }}>
              Pāda {parseInt(pada_idx) + 1}
              <span style={{ color: MUTED, fontWeight: "normal", fontSize: 10, marginLeft: 8 }}>
                {parseInt(pada_idx) % 2 === 0 ? "odd" : "even"}
              </span>
            </div>

            {/* Syllable cards */}
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 10 }}>
              {syls.map((sv, i) => {
                const rs = roleStyle(sv.role);
                return (
                  <div key={i} style={{
                    background: rs.bg, border: `1px solid ${rs.border}`,
                    borderRadius: 8, padding: "7px 9px", textAlign: "center",
                    minWidth: 56, display: "flex", flexDirection: "column", gap: 3,
                  }}>
                    <div style={{ fontSize: 9, color: MUTED }}>{sv.position_in_pada + 1}</div>
                    <div style={{ fontFamily: "monospace", fontSize: 13, color: TEXT }}>{sv.syllable}</div>
                    <div style={{ fontSize: 14, color: rs.color, fontWeight: "bold", fontFamily: "serif" }}>{sv.swara_label}</div>
                    <div style={{ fontSize: 9, color: MUTED, fontFamily: "monospace" }}>{sv.pitch_hz} Hz</div>
                    <div style={{ fontSize: 15, color: sv.weight === "G" ? SAFFRON : GREEN }}>
                      {sv.weight === "G" ? "–" : "◡"}
                    </div>
                    <div style={{ fontSize: 8, color: rs.color, textTransform: "uppercase", letterSpacing: 0.5 }}>
                      {sv.role}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pitch flow bar */}
            <div style={{
              display: "flex", gap: 3, alignItems: "flex-end", height: 52,
              background: SURFACE, borderRadius: 6, padding: "5px 6px",
              border: `1px solid ${BORDER}`,
            }}>
              {syls.map((sv, i) => {
                const pct = Math.max(0, Math.min(1, (sv.pitch_hz - 220) / (530 - 220)));
                const rs  = roleStyle(sv.role);
                return (
                  <div key={i}
                    title={`${sv.syllable} · ${sv.swara_label} · ${sv.pitch_hz} Hz`}
                    style={{
                      flex: 1, display: "flex", flexDirection: "column",
                      alignItems: "center", justifyContent: "flex-end",
                      gap: 2, height: "100%",
                    }}
                  >
                    <div style={{
                      width: "100%", borderRadius: "3px 3px 0 0",
                      height: `${Math.max(6, pct * 32)}px`,
                      background: rs.color, opacity: 0.85,
                      transition: "height 0.4s ease",
                    }} />
                    <div style={{
                      fontSize: 8, color: rs.color, textAlign: "center",
                      whiteSpace: "nowrap", overflow: "hidden", maxWidth: "100%",
                    }}>
                      {sv.swara_label}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
