import { useState, useEffect, useRef } from "react";
import * as THREE from "three";
import Papa from "papaparse";
import {
  X, ArrowDown, MessageCircle, ChevronRight,
  Check, AlertTriangle, XCircle, Loader2,
} from "lucide-react";

// ═══════════════════════════════════════════════════════════════
//  CONFIG — pas hier je gegevens aan
// ═══════════════════════════════════════════════════════════════
const config = {
  businessName:           "PrintLab",
  tagline:                "Custom 3D prints op maat",
  ownerName:              "Thijn",
  printerNaam:            "Elegoo Centauri Carbon",
  contactEmail:           "thijnfigo@gmail.com",
  whatsappNumber:         "+31612345678",   // bijv. +31612345678
  uurtarief:              2.50,             // € per uur printtijd
  vasteMarge:             1.00,             // € vaste opstartkosten
  vriendenkortingProcent: 15,

  // ── Formspree e-mail ─────────────────────────────────────────
  // 1. Ga naar https://formspree.io en maak een gratis account
  // 2. Maak een nieuw formulier aan voor thijnfigo@gmail.com
  // 3. Kopieer het form-ID (bijv. "xpwzgkqr") en plak het hieronder
  formspreeId: "mkoypkea",
};

// ═══════════════════════════════════════════════════════════════
//  CSV KOLOMMEN — pas aan als je de kolomnamen in je CSV wijzigt
// ═══════════════════════════════════════════════════════════════
// filamenten.csv vereiste kolommen:
//   naam | kleur | hex | materiaal | prijs_per_kilo | status | is_glittery
//   status: beschikbaar / bijna op / uitverkocht
//   is_glittery: ja / nee
//
// prints.csv vereiste kolommen:
//   naam | beschrijving | bestand | materiaalAdvies | gewichtGram | type | prijsIndicatie
//   type: vase / box / torus

// ═══════════════════════════════════════════════════════════════
//  GLOBAL CSS
// ═══════════════════════════════════════════════════════════════
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Space+Mono:ital,wght@0,400;0,700;1,400&family=Inter:wght@300;400;500;600&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --bg:         #0a0a0a;
  --surface:    #111111;
  --surface-2:  #181818;
  --fg:         #ede8e0;
  --fg-muted:   #6a6560;
  --accent:     #e8611a;
  --accent-dim: rgba(232,97,26,.16);
  --border:     rgba(237,232,224,.07);
  --border-hi:  rgba(232,97,26,.3);
  --ease-out:   cubic-bezier(.23,1,.32,1);
  --ease-io:    cubic-bezier(.77,0,.175,1);
}
body {
  background: var(--bg); color: var(--fg);
  font-family: 'Inter', system-ui, sans-serif;
  overflow-x: hidden;
}
.mono { font-family: 'Space Mono', monospace; }

/* ── hero grid ───────────────────────────────────────── */
.hero-grid {
  background-image:
    linear-gradient(rgba(232,97,26,.045) 1px, transparent 1px),
    linear-gradient(90deg, rgba(232,97,26,.045) 1px, transparent 1px);
  background-size: 40px 40px;
  animation: grid-pan 42s linear infinite;
}
@keyframes grid-pan { to { background-position: 40px 40px; } }

/* ── 3D wireframe cube ───────────────────────────────── */
.cube-stage {
  perspective: 800px;
  position: absolute; right: -80px; top: 50%;
  transform: translateY(-50%);
  width: 420px; height: 420px;
  pointer-events: none;
}
@media (max-width: 900px) { .cube-stage { display: none; } }
.cube {
  width: 100%; height: 100%; position: relative;
  transform-style: preserve-3d;
  animation: cube-spin 28s linear infinite;
}
@keyframes cube-spin {
  from { transform: rotateX(20deg) rotateY(0deg); }
  to   { transform: rotateX(20deg) rotateY(360deg); }
}
.cube-face {
  position: absolute; inset: 0;
  border: 1px solid rgba(232,97,26,.32);
  box-shadow: inset 0 0 40px rgba(232,97,26,.07);
}

/* ── hero letter entrance ────────────────────────────── */
@keyframes letter-in {
  from { opacity:0; transform:translateY(28px) skewY(2deg); }
  to   { opacity:1; transform:translateY(0) skewY(0deg); }
}
.letter { display:inline-block; animation:letter-in .55s var(--ease-out) both; }

/* ── badge ───────────────────────────────────────────── */
@keyframes badge-in {
  from { opacity:0; transform:translateY(-10px); }
  to   { opacity:1; transform:translateY(0); }
}
.hero-badge { animation: badge-in .5s var(--ease-out) .1s both; }

/* ── blinking cursor ─────────────────────────────────── */
@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
.cursor-blink {
  animation: blink 1.1s step-start infinite;
  display:inline-block; width:.11em;
  background:var(--accent);
  margin-left:4px; vertical-align:middle; transform:translateY(2px);
}

/* ── hero buttons entrance ───────────────────────────── */
@keyframes btns-in {
  from { opacity:0; transform:translateY(16px); }
  to   { opacity:1; transform:translateY(0); }
}
.hero-btns { animation: btns-in .6s var(--ease-out) .7s both; }

/* ── glow button ─────────────────────────────────────── */
.btn-glow {
  box-shadow: 0 0 28px rgba(232,97,26,.38) !important;
  transition: background 210ms ease, color 210ms ease, border-color 210ms ease,
              box-shadow 210ms ease, transform 120ms ease !important;
}
@media (hover:hover) {
  .btn-glow:hover { box-shadow:0 0 44px rgba(232,97,26,.58) !important; transform:scale(1.025); }
  .btn-glow:hover.btn-p { background:transparent !important; color:var(--accent) !important; }
}

/* ── pulsing status dot ──────────────────────────────── */
@keyframes dot-pulse {
  0%,100% { box-shadow:0 0 0 0 rgba(74,222,128,0); }
  50%      { box-shadow:0 0 0 5px rgba(74,222,128,.12); }
}
.dot-online { animation: dot-pulse 2.2s ease-in-out infinite; }

/* ── scroll reveal ───────────────────────────────────── */
.rev { opacity:0; transform:translateY(18px); transition:opacity 680ms var(--ease-out),transform 680ms var(--ease-out); }
.rev.in { opacity:1; transform:none; }
.d1{transition-delay:65ms}  .d2{transition-delay:130ms}
.d3{transition-delay:195ms} .d4{transition-delay:260ms}
.d5{transition-delay:325ms} .d6{transition-delay:390ms}

/* ── filament card ───────────────────────────────────── */
.fc {
  border:1px solid var(--border); background:var(--surface);
  position:relative; overflow:hidden;
  transition:border-color 220ms ease, transform 220ms ease;
}
.fc::after {
  content:''; position:absolute; inset:0;
  background:radial-gradient(ellipse at 50% -10%, var(--accent-dim) 0%, transparent 62%);
  opacity:0; transition:opacity 300ms ease; pointer-events:none;
}
@media (hover:hover) and (pointer:fine) {
  .fc:hover { border-color:var(--border-hi); transform:translateY(-3px); }
  .fc:hover::after { opacity:1; }
}

/* ── glitter sparkle overlay ─────────────────────────── */
@keyframes sparkle-pop {
  0%,100% { opacity:0; transform:scale(0) rotate(0deg); }
  15%     { opacity:1; transform:scale(1) rotate(0deg); }
  35%     { opacity:0; transform:scale(.5) rotate(60deg); }
  55%     { opacity:.8; transform:scale(1.1) rotate(120deg); }
  75%     { opacity:0; transform:scale(.3) rotate(180deg); }
}
@keyframes shimmer-sweep {
  0%   { background-position: -200% center; }
  100% { background-position:  200% center; }
}
.glitter-shimmer {
  position:absolute; inset:0; border-radius:50%;
  background: linear-gradient(
    105deg,
    transparent 25%,
    rgba(255,255,255,.55) 50%,
    transparent 75%
  );
  background-size: 200% 100%;
  animation: shimmer-sweep 2.2s ease-in-out infinite;
  pointer-events:none;
}
.glitter-star {
  position:absolute;
  clip-path:polygon(50% 0%,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%);
  background:white;
  pointer-events:none;
}

/* ── swatch pulse ────────────────────────────────────── */
.sw-ok { animation: sw-pulse 3.8s ease-in-out infinite; }
@keyframes sw-pulse {
  0%,100% { box-shadow:0 0 0 0 rgba(232,97,26,0); }
  50%      { box-shadow:0 0 0 6px rgba(232,97,26,.1); }
}

/* ── print card ──────────────────────────────────────── */
.pc {
  border:1px solid var(--border); background:var(--surface);
  cursor:pointer; position:relative; overflow:hidden;
  transition:border-color 240ms ease;
}
.pc-cta {
  display:flex; align-items:center; gap:4px;
  color:var(--fg-muted); font-family:'Space Mono',monospace;
  font-size:10px; letter-spacing:.1em; text-transform:uppercase;
  background:none; border:none; cursor:pointer; padding:0;
  transition:color 200ms ease, gap 200ms ease;
}
@media (hover:hover) and (pointer:fine) {
  .pc:hover { border-color:var(--border-hi); }
  .pc:hover .pc-cta { color:var(--accent); gap:8px; }
}

/* ── range slider ────────────────────────────────────── */
input[type=range] { -webkit-appearance:none; appearance:none; width:100%; height:20px; background:transparent; outline:none; cursor:pointer; }
input[type=range]::-webkit-slider-runnable-track { height:2px; border-radius:1px; background:linear-gradient(to right,var(--accent) 0%,var(--accent) var(--p,0%),rgba(237,232,224,.1) var(--p,0%),rgba(237,232,224,.1) 100%); }
input[type=range]::-webkit-slider-thumb { -webkit-appearance:none; width:18px; height:18px; border-radius:50%; background:var(--accent); cursor:pointer; margin-top:-8px; box-shadow:0 0 0 4px rgba(232,97,26,.18); transition:transform 120ms ease,box-shadow 120ms ease; }
input[type=range]::-webkit-slider-thumb:active { transform:scale(1.3); box-shadow:0 0 0 7px rgba(232,97,26,.28); }
input[type=range]::-moz-range-track { height:2px; border-radius:1px; background:rgba(237,232,224,.1); }
input[type=range]::-moz-range-progress { height:2px; background:var(--accent); border-radius:1px; }
input[type=range]::-moz-range-thumb { width:18px; height:18px; border-radius:50%; background:var(--accent); border:none; cursor:pointer; }

/* ── buttons ─────────────────────────────────────────── */
.btn {
  display:inline-flex; align-items:center; gap:8px;
  padding:13px 26px;
  font-family:'Space Mono',monospace; font-size:12px;
  font-weight:700; letter-spacing:.09em; text-transform:uppercase;
  border:1px solid; cursor:pointer; text-decoration:none;
  transition:background 210ms ease,color 210ms ease,border-color 210ms ease;
}
.btn:active { transform:scale(.97); }
.btn-p { background:var(--accent); color:#fff; border-color:var(--accent); }
@media (hover:hover) { .btn-p:hover { background:transparent; color:var(--accent); } }
.btn-o { background:transparent; color:var(--fg); border-color:var(--border); }
@media (hover:hover) { .btn-o:hover { border-color:var(--accent); color:var(--accent); } }
.btn:disabled { opacity:.45; cursor:not-allowed; }

/* ── form fields ─────────────────────────────────────── */
.inp {
  width:100%; background:var(--surface-2);
  border:1px solid var(--border); color:var(--fg);
  padding:12px 16px; font-family:'Inter',sans-serif; font-size:14px;
  outline:none; -webkit-appearance:none; appearance:none;
  transition:border-color 200ms ease;
}
.inp:focus { border-color:var(--accent); }
.inp::placeholder { color:var(--fg-muted); }
select.inp {
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='7' viewBox='0 0 12 7'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%236a6560' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  background-repeat:no-repeat; background-position:right 16px center; padding-right:42px; cursor:pointer;
}
textarea.inp { resize:vertical; min-height:96px; }

/* ── checkbox row ────────────────────────────────────── */
.chk-row { display:flex; align-items:center; gap:14px; padding:14px 18px; cursor:pointer; border:1px solid var(--border); transition:border-color 200ms ease,background 200ms ease; }
.chk-row.on { border-color:var(--border-hi); background:var(--accent-dim); }
.chk-box { width:18px; height:18px; flex-shrink:0; border:1px solid var(--border); display:flex; align-items:center; justify-content:center; transition:background 140ms ease,border-color 140ms ease; }
.chk-box.on { background:var(--accent); border-color:var(--accent); }

/* ── modal ───────────────────────────────────────────── */
.modal-bg { position:fixed; inset:0; z-index:1000; background:rgba(0,0,0,.9); backdrop-filter:blur(12px); display:flex; align-items:center; justify-content:center; padding:16px; animation:fade-in 200ms ease; }
@keyframes fade-in { from { opacity:0; } }
.modal-box { animation:modal-up 260ms var(--ease-out); }
@keyframes modal-up { from { opacity:0; transform:translateY(14px) scale(.96); } }

/* ── grain ───────────────────────────────────────────── */
.grain { position:fixed; inset:0; pointer-events:none; z-index:9999; opacity:.038; background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.88' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E"); background-size:180px; }

/* ── layout ──────────────────────────────────────────── */
.two-col { display:grid; grid-template-columns:1fr 1fr; gap:72px; }
@media (max-width:768px) { .two-col { grid-template-columns:1fr; gap:48px; } }
@keyframes bob { 0%,100%{transform:translateY(0)} 50%{transform:translateY(6px)} }
::-webkit-scrollbar { width:3px; }
::-webkit-scrollbar-track { background:var(--bg); }
::-webkit-scrollbar-thumb { background:rgba(237,232,224,.1); border-radius:2px; }

/* ── loading screen ──────────────────────────────────── */
.loading-screen {
  min-height:100dvh; display:flex; align-items:center; justify-content:center;
  flex-direction:column; gap:18px; background:var(--bg);
}
@keyframes spin { to { transform:rotate(360deg); } }
.spinner { animation:spin 1s linear infinite; }

/* ── reduced motion ──────────────────────────────────── */
@media (prefers-reduced-motion:reduce) {
  .rev { transition:opacity 200ms ease; transform:none; }
  .hero-grid,.cube,.sw-ok,.glitter-shimmer { animation:none; }
  .letter { animation:none; opacity:1; transform:none; }
  .cursor-blink { animation:none; }
}
`;

// ═══════════════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════════════
const fmt  = (n) => `€${Number(n).toFixed(2)}`;
const pct  = (v, mn, mx) => ({ '--p': `${(((v - mn) / (mx - mn)) * 100).toFixed(1)}%` });

const statusMeta = {
  beschikbaar: { label:'Beschikbaar', color:'#4ade80', Icon:Check        },
  'bijna op':  { label:'Bijna op',    color:'#fb923c', Icon:AlertTriangle },
  uitverkocht: { label:'Uitverkocht', color:'#52524e', Icon:XCircle       },
};

// Parse CSV text → array of objects with trimmed keys
function parseCsv(text) {
  const result = Papa.parse(text.trim(), {
    header: true,
    skipEmptyLines: true,
    transformHeader: h => h.trim(),
    transform: v => v.trim(),
  });
  return result.data;
}

function useReveal(deps = []) {
  useEffect(() => {
    const io = new IntersectionObserver(
      entries => entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      }),
      { threshold:.09 }
    );
    document.querySelectorAll('.rev').forEach(el => io.observe(el));
    return () => io.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

// ═══════════════════════════════════════════════════════════════
//  CSV DATA HOOK
// ═══════════════════════════════════════════════════════════════
function useCsvData() {
  const [filamenten, setFilamenten] = useState([]);
  const [prints,     setPrints]     = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);

  useEffect(() => {
    Promise.all([
      fetch('/data/filamenten.csv').then(r => r.text()),
      fetch('/data/prints.csv').then(r => r.text()),
    ])
      .then(([filTxt, printTxt]) => {
        const rawFil = parseCsv(filTxt).map((f, i) => ({
          ...f,
          id:           i + 1,
          // prijs_per_kilo → prijs_per_gram
          prijsPerGram: parseFloat(f.prijs_per_kilo || 0) / 1000,
          isGlittery:   (f.is_glittery || '').toLowerCase() === 'ja',
        }));

        const rawPrint = parseCsv(printTxt).map((p, i) => ({
          ...p,
          id:           i + 1,
          gewichtGram:  parseFloat(p.gewichtGram  || 0),
          prijsIndicatie: parseFloat(p.prijsIndicatie || 0),
        }));

        setFilamenten(rawFil);
        setPrints(rawPrint);
        setLoading(false);
      })
      .catch(err => {
        console.error('CSV load error:', err);
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return { filamenten, prints, loading, error };
}

// ═══════════════════════════════════════════════════════════════
//  SECTION HEADER
// ═══════════════════════════════════════════════════════════════
function SHead({ num, title }) {
  return (
    <div className="rev" style={{ marginBottom:56 }}>
      <div className="mono" style={{ fontSize:11, letterSpacing:'.2em', color:'var(--fg-muted)', textTransform:'uppercase', marginBottom:14 }}>
        — {num}
      </div>
      <h2 className="mono" style={{ fontSize:'clamp(30px,5.5vw,60px)', fontWeight:700, letterSpacing:'-.035em', lineHeight:.93, color:'var(--fg)' }}>
        {title}
      </h2>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  HERO
// ═══════════════════════════════════════════════════════════════
const CUBE_FACES = [
  'translateZ(210px)',
  'rotateY(180deg) translateZ(210px)',
  'rotateY(90deg) translateZ(210px)',
  'rotateY(-90deg) translateZ(210px)',
  'rotateX(90deg) translateZ(210px)',
  'rotateX(-90deg) translateZ(210px)',
];

function Hero() {
  const go      = id => document.getElementById(id)?.scrollIntoView({ behavior:'smooth' });
  const letters = config.businessName.split('');

  return (
    <section style={{ minHeight:'100dvh', background:'var(--bg)', position:'relative', overflow:'hidden', display:'flex', flexDirection:'column' }}>
      <div className="hero-grid" style={{ position:'absolute', inset:0 }} />
      <div style={{ position:'absolute', inset:0, pointerEvents:'none', background:'radial-gradient(ellipse at center, transparent 0%, var(--bg) 78%)' }} />
      <div style={{ position:'absolute', top:'10%', right:'8%',  width:480, height:480, background:'radial-gradient(circle, rgba(232,97,26,.10) 0%, transparent 68%)', pointerEvents:'none' }} />
      <div style={{ position:'absolute', bottom:'16%', left:'-4%', width:340, height:340, background:'radial-gradient(circle, rgba(232,97,26,.05) 0%, transparent 65%)', pointerEvents:'none' }} />

      {/* 3D rotating wireframe cube */}
      <div className="cube-stage">
        <div className="cube">
          {CUBE_FACES.map((t, i) => (
            <div key={i} className="cube-face" style={{ transform:t }} />
          ))}
        </div>
      </div>

      <div style={{ position:'relative', zIndex:1, maxWidth:1400, margin:'0 auto', width:'100%', padding:'0 32px', flex:1, display:'flex', flexDirection:'column' }}>
        {/* Top bar */}
        <div style={{ display:'flex', justifyContent:'space-between', paddingTop:34 }}>
          <span className="mono" style={{ fontSize:11, color:'var(--fg-muted)', letterSpacing:'.2em', textTransform:'uppercase' }}>{config.businessName}</span>
          <span className="mono" style={{ fontSize:11, color:'var(--fg-muted)', letterSpacing:'.1em' }}>[ 01 ]</span>
        </div>

        <div style={{ flex:1, display:'flex', flexDirection:'column', justifyContent:'flex-end', paddingBottom:72 }}>
          {/* Badge */}
          <div className="hero-badge" style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'6px 14px', border:'1px solid var(--border)', background:'rgba(10,10,10,.6)', backdropFilter:'blur(10px)', marginBottom:28, alignSelf:'flex-start' }}>
            <div className="dot-online" style={{ width:7, height:7, borderRadius:'50%', background:'#4ade80', flexShrink:0 }} />
            <span className="mono" style={{ fontSize:10, letterSpacing:'.18em', textTransform:'uppercase', color:'var(--fg-muted)' }}>
              Printer online · {config.printerNaam}
            </span>
          </div>

          {/* Letter-by-letter title */}
          <h1 className="mono" style={{ fontSize:'clamp(72px,14vw,210px)', fontWeight:700, lineHeight:.87, letterSpacing:'-.045em', color:'var(--fg)' }}>
            {letters.map((char, i) => (
              <span key={i} className="letter" style={{ animationDelay:`${0.25 + i * 0.055}s` }}>
                {char === ' ' ? '\u00A0' : char}
              </span>
            ))}
            <span className="cursor-blink" style={{ height:'.8em', animationDelay:`${0.25 + letters.length * 0.055 + 0.1}s` }} />
          </h1>

          {/* Tagline */}
          <div style={{ display:'flex', alignItems:'center', gap:16, marginTop:26 }}>
            <div style={{ width:34, height:2, background:'var(--accent)', flexShrink:0 }} />
            <span className="mono" style={{ fontSize:12, color:'var(--fg-muted)', letterSpacing:'.16em', textTransform:'uppercase' }}>{config.tagline}</span>
          </div>

          {/* CTAs */}
          <div className="hero-btns" style={{ display:'flex', gap:12, flexWrap:'wrap', marginTop:44 }}>
            <button className="btn btn-p btn-glow" onClick={() => go('showcase')}>Bekijk prints <ChevronRight size={13} /></button>
            <button className="btn btn-o"          onClick={() => go('calculator')}>Bereken prijs</button>
          </div>

          <div style={{ marginTop:64, display:'flex', alignItems:'center', gap:8, color:'var(--fg-muted)', cursor:'pointer' }} onClick={() => go('filamenten')}>
            <ArrowDown size={14} style={{ animation:'bob 2.4s ease-in-out infinite' }} />
            <span className="mono" style={{ fontSize:10, letterSpacing:'.15em', textTransform:'uppercase' }}>scroll</span>
          </div>
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════
//  GLITTER OVERLAY — animated sparkles over de kleur-swatch
// ═══════════════════════════════════════════════════════════════
const SPARKLE_POS = [
  { top:'18%', left:'22%', size:9,  delay:'0s'    },
  { top:'62%', left:'68%', size:7,  delay:'0.45s' },
  { top:'30%', left:'74%', size:11, delay:'0.9s'  },
  { top:'72%', left:'28%', size:8,  delay:'1.35s' },
  { top:'14%', left:'58%', size:6,  delay:'0.65s' },
  { top:'50%', left:'12%', size:9,  delay:'1.6s'  },
  { top:'42%', left:'50%', size:5,  delay:'0.25s' },
];

function GlitterOverlay() {
  return (
    <div style={{ position:'absolute', inset:0, borderRadius:'50%', overflow:'hidden', pointerEvents:'none' }}>
      {/* Shimmer sweep */}
      <div className="glitter-shimmer" />
      {/* Sparkle stars */}
      {SPARKLE_POS.map((s, i) => (
        <div
          key={i}
          className="glitter-star"
          style={{
            top: s.top, left: s.left,
            width: s.size, height: s.size,
            animation: `sparkle-pop 2.4s ${s.delay} ease-in-out infinite`,
          }}
        />
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  FILAMENT GRID
// ═══════════════════════════════════════════════════════════════
function FilCard({ f, idx }) {
  const meta    = statusMeta[f.status] || statusMeta.uitverkocht;
  const isLight = ['#f0ede6','#b8d8e8'].includes((f.hex || '').toLowerCase());

  return (
    <div className={`fc rev d${Math.min(idx + 1, 6)}`} style={{ padding:'28px 22px' }}>
      {/* Swatch with optional glitter */}
      <div style={{ position:'relative', width:62, height:62, marginBottom:22, flexShrink:0 }}>
        <div style={{
          width:'100%', height:'100%', borderRadius:'50%', background:f.hex,
          border: isLight ? '1px solid rgba(0,0,0,.1)' : 'none',
          position:'relative', overflow:'hidden',
        }} className={f.status === 'beschikbaar' && !f.isGlittery ? 'sw-ok' : ''}>
          {f.isGlittery && <GlitterOverlay />}
        </div>

        {/* Glitter badge */}
        {f.isGlittery && (
          <div style={{
            position:'absolute', top:-4, right:-4,
            background:'var(--accent)', borderRadius:'50%',
            width:18, height:18, display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:10, boxShadow:'0 0 8px rgba(232,97,26,.5)',
          }} title="Glitter filament">
            ✦
          </div>
        )}
      </div>

      <div className="mono" style={{ fontSize:10, color:'var(--fg-muted)', letterSpacing:'.08em', marginBottom:4 }}>{f.naam}</div>
      <div style={{ fontSize:18, fontWeight:600, color:'var(--fg)', marginBottom:14, letterSpacing:'-.01em' }}>{f.kleur}</div>

      <div style={{ display:'inline-flex', padding:'3px 10px', border:'1px solid var(--border)', marginBottom:f.isGlittery ? 8 : 16 }}>
        <span className="mono" style={{ fontSize:10, letterSpacing:'.12em', color:'var(--fg-muted)', textTransform:'uppercase' }}>{f.materiaal}</span>
      </div>

      {f.isGlittery && (
        <div style={{ display:'inline-flex', marginLeft:6, padding:'3px 10px', border:'1px solid rgba(232,97,26,.3)', background:'rgba(232,97,26,.08)', marginBottom:16 }}>
          <span className="mono" style={{ fontSize:10, letterSpacing:'.1em', color:'var(--accent)', textTransform:'uppercase' }}>✦ Glitter</span>
        </div>
      )}

      <div style={{ fontSize:13, color:'var(--fg-muted)', marginBottom:14 }}>
        <span style={{ color:'var(--accent)', fontWeight:600 }}>
          €{parseFloat(f.prijs_per_kilo).toFixed(2)}
        </span> / kg
        <span style={{ marginLeft:8, fontSize:11, opacity:.6 }}>
          (€{f.prijsPerGram.toFixed(3)}/g)
        </span>
      </div>

      <div style={{ display:'flex', alignItems:'center', gap:7 }}>
        <div style={{ width:6, height:6, borderRadius:'50%', background:meta.color, flexShrink:0 }} />
        <span className="mono" style={{ fontSize:10, color:meta.color, letterSpacing:'.07em' }}>{meta.label}</span>
      </div>
    </div>
  );
}

function FilamentGrid({ filamenten }) {
  return (
    <section id="filamenten" style={{ padding:'112px 32px', maxWidth:1400, margin:'0 auto' }}>
      <SHead num="02 / Materialen" title={<>Beschikbare<br />kleuren</>} />
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(185px,1fr))', gap:1, background:'var(--border)' }}>
        {filamenten.map((f, i) => <FilCard key={f.id} f={f} idx={i} />)}
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════
//  CALCULATOR
// ═══════════════════════════════════════════════════════════════
function SliderRow({ label, value, unit, min, max, step, set }) {
  return (
    <div style={{ marginBottom:38 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:14 }}>
        <label className="mono" style={{ fontSize:11, color:'var(--fg-muted)', letterSpacing:'.14em', textTransform:'uppercase' }}>{label}</label>
        <span className="mono" style={{ fontSize:22, fontWeight:700, color:'var(--accent)' }}>{value}{unit}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => set(Number(e.target.value))} style={pct(value, min, max)} />
    </div>
  );
}

function PriceRow({ label, value, dim, disc }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:13 }}>
      <span className="mono" style={{ fontSize:11, color:'var(--fg-muted)', letterSpacing:'.08em', textTransform:'uppercase' }}>{label}</span>
      <span className="mono" style={{ fontSize:11, color:disc ? '#4ade80' : dim ? 'var(--fg-muted)' : 'var(--fg)' }}>{value}</span>
    </div>
  );
}

function Calculator({ filamenten }) {
  const avail = filamenten.filter(f => f.status !== 'uitverkocht');
  const [g,   setG]  = useState(50);
  const [h,   setH]  = useState(2);
  const [fid, setFid]= useState(null);
  const [vk,  setVk] = useState(false);

  // Auto-select first available when data loads
  useEffect(() => {
    if (avail.length > 0 && fid === null) setFid(avail[0].id);
  }, [avail.length]);

  const fil  = avail.find(f => f.id === fid) || avail[0];
  const mat  = g * (fil?.prijsPerGram || 0);
  const tijd = h * config.uurtarief;
  const vast = config.vasteMarge;
  const sub  = mat + tijd + vast;
  const tot  = vk ? sub * (1 - config.vriendenkortingProcent / 100) : sub;

  return (
    <section id="calculator" style={{ background:'var(--surface)', borderTop:'1px solid var(--border)', borderBottom:'1px solid var(--border)', padding:'112px 32px' }}>
      <div style={{ maxWidth:1400, margin:'0 auto' }}>
        <SHead num="03 / Prijscalculator" title={<>Bereken<br />je print</>} />
        <div className="two-col">
          <div className="rev">
            <SliderRow label="Gewicht"   value={g} unit="g" min={1}   max={500} step={1}   set={setG} />
            <SliderRow label="Printtijd" value={h} unit="u" min={0.5} max={48}  step={0.5} set={setH} />
            <div style={{ marginBottom:24 }}>
              <label className="mono" style={{ display:'block', fontSize:11, color:'var(--fg-muted)', letterSpacing:'.14em', textTransform:'uppercase', marginBottom:10 }}>Filament</label>
              <select className="inp" value={fid || ''} onChange={e => setFid(Number(e.target.value))}>
                {avail.map(f => (
                  <option key={f.id} value={f.id}>
                    {f.kleur} — {f.naam}{f.isGlittery ? ' ✦' : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className={`chk-row${vk ? ' on' : ''}`} onClick={() => setVk(!vk)}>
              <div className={`chk-box${vk ? ' on' : ''}`}>{vk && <Check size={11} color="#fff" strokeWidth={3} />}</div>
              <div>
                <div style={{ fontSize:14, fontWeight:500, color:'var(--fg)' }}>Vriendenprijsje</div>
                <div style={{ fontSize:12, color:'var(--fg-muted)', marginTop:2 }}>{config.vriendenkortingProcent}% korting voor vrienden</div>
              </div>
            </div>
          </div>

          <div className="rev d2" style={{ display:'flex', flexDirection:'column', justifyContent:'center' }}>
            <div style={{ paddingTop:32, borderTop:'1px solid var(--border)' }}>
              <PriceRow label="Materiaalkosten" value={fmt(mat)} />
              <PriceRow label="Tijdkosten"      value={fmt(tijd)} />
              <PriceRow label="Vaste kosten"    value={fmt(vast)} dim />
            </div>
            <div style={{ paddingTop:24, marginTop:8, borderTop:'1px solid var(--border)' }}>
              {vk && <>
                <PriceRow label="Subtotaal"                              value={fmt(sub)} dim />
                <PriceRow label={`Korting (${config.vriendenkortingProcent}%)`} value={`-${fmt(sub - tot)}`} disc />
              </>}
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginTop:14 }}>
                <span className="mono" style={{ fontSize:11, color:'var(--fg-muted)', letterSpacing:'.12em', textTransform:'uppercase' }}>Totaal</span>
                <span className="mono" style={{ fontSize:'clamp(40px,6vw,60px)', fontWeight:700, color:'var(--accent)', letterSpacing:'-.03em', lineHeight:1, transition:'color 200ms ease' }}>{fmt(tot)}</span>
              </div>
            </div>
            <p style={{ fontSize:12, color:'var(--fg-muted)', marginTop:18, lineHeight:1.65 }}>
              Indicatieve prijs. Definitieve prijs na bespreking van uw wensen.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════
//  THREE.JS VIEWER
// ═══════════════════════════════════════════════════════════════
function makeMesh(type) {
  let geo;
  if      (type === 'vase')  geo = new THREE.CylinderGeometry(.55, .88, 2.2, 32);
  else if (type === 'torus') geo = new THREE.TorusGeometry(.78, .28, 20, 56);
  else                       geo = new THREE.BoxGeometry(1.05, 1.78, .36, 4, 6, 2);
  const mat = new THREE.MeshStandardMaterial({ color:0xe8611a, metalness:.3, roughness:.42 });
  return { mesh: new THREE.Mesh(geo, mat), dispose: () => { geo.dispose(); mat.dispose(); } };
}

function STLViewer({ print, onClose }) {
  const ref = useRef();
  const [grab, setGrab] = useState(false);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias:true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(720, 405, false);
    renderer.setClearColor(0x0a0a0a);
    const camera = new THREE.PerspectiveCamera(38, 720/405, .1, 120);
    camera.position.set(0, .5, 5.2);
    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x0a0a0a, 20, 40);
    scene.add(new THREE.AmbientLight(0xffffff, .5));
    const key = new THREE.DirectionalLight(0xffd8b0, 1.5); key.position.set(5,8,6); scene.add(key);
    const rim = new THREE.PointLight(0xe8611a, 4, 14);    rim.position.set(-4,2.5,3); scene.add(rim);
    const fill = new THREE.DirectionalLight(0x5070ff,.22); fill.position.set(-6,-5,-5); scene.add(fill);
    const grid = new THREE.GridHelper(18, 36, 0x2e1908, 0x1a1a1a); grid.position.y = -1.65; scene.add(grid);
    const { mesh, dispose } = makeMesh(print.type);
    scene.add(mesh);
    let rotY=.22, rotX=.12, zoom=5.2, dragging=false, px=0, py=0;
    const down = e => { dragging=true; setGrab(true); px=e.clientX??e.touches?.[0]?.clientX??0; py=e.clientY??e.touches?.[0]?.clientY??0; };
    const up   = () => { dragging=false; setGrab(false); };
    const move = e => {
      if (!dragging) return;
      const cx=e.clientX??e.touches?.[0]?.clientX??0; const cy=e.clientY??e.touches?.[0]?.clientY??0;
      rotY+=(cx-px)*.012; rotX+=(cy-py)*.009; rotX=Math.max(-.6,Math.min(.6,rotX)); px=cx; py=cy;
    };
    const wheel = e => { zoom=Math.max(2.5,Math.min(11,zoom+e.deltaY*.008)); };
    canvas.addEventListener('mousedown',  down);
    canvas.addEventListener('touchstart', down, { passive:true });
    window.addEventListener('mouseup',    up);
    window.addEventListener('touchend',   up);
    window.addEventListener('mousemove',  move);
    window.addEventListener('touchmove',  move, { passive:true });
    canvas.addEventListener('wheel',      wheel, { passive:true });
    let raf;
    const loop = () => {
      raf=requestAnimationFrame(loop);
      if (!dragging) rotY+=.005;
      mesh.rotation.x=rotX; mesh.rotation.y=rotY; camera.position.z=zoom;
      renderer.render(scene, camera);
    };
    loop();
    return () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener('mousedown',  down);
      canvas.removeEventListener('touchstart', down);
      window.removeEventListener('mouseup',    up);
      window.removeEventListener('touchend',   up);
      window.removeEventListener('mousemove',  move);
      window.removeEventListener('touchmove',  move);
      canvas.removeEventListener('wheel',      wheel);
      dispose(); renderer.dispose();
    };
  }, [print]);

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal-box" style={{ width:'100%', maxWidth:760, background:'var(--surface)', border:'1px solid var(--border-hi)' }} onClick={e => e.stopPropagation()}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'18px 24px', borderBottom:'1px solid var(--border)' }}>
          <div>
            <div className="mono" style={{ fontSize:15, fontWeight:700, color:'var(--fg)' }}>{print.naam}</div>
            <div style={{ fontSize:12, color:'var(--fg-muted)', marginTop:3 }}>{print.beschrijving}</div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'1px solid var(--border)', color:'var(--fg-muted)', cursor:'pointer', padding:'7px 9px', display:'flex', transition:'border-color 150ms ease' }}>
            <X size={15} />
          </button>
        </div>
        <div style={{ position:'relative', background:'var(--bg)' }}>
          <canvas ref={ref} width={720} height={405} style={{ display:'block', width:'100%', cursor:grab?'grabbing':'grab' }} />
          <div style={{ position:'absolute', bottom:10, left:14, fontSize:10, color:'rgba(237,232,224,.22)', fontFamily:'Space Mono', letterSpacing:'.07em', pointerEvents:'none' }}>
            drag to rotate — scroll to zoom
          </div>
        </div>
        <div style={{ display:'flex', gap:40, padding:'14px 24px', borderTop:'1px solid var(--border)' }}>
          {[['Materiaal', print.materiaalAdvies], ['Gewicht', `${print.gewichtGram}g`], ['Prijs indicatie', fmt(print.prijsIndicatie)], ['Bestand', print.bestand]].map(([l, v]) => (
            <div key={l}>
              <div className="mono" style={{ fontSize:9, color:'var(--fg-muted)', letterSpacing:'.14em', textTransform:'uppercase', marginBottom:4 }}>{l}</div>
              <div style={{ fontSize:13, color: l === 'Prijs indicatie' ? 'var(--accent)' : 'var(--fg)' }}>{v}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  SHOWCASE
// ═══════════════════════════════════════════════════════════════
function PrintIcon({ type }) {
  return (
    <svg width="68" height="68" viewBox="0 0 68 68" fill="none" style={{ opacity:.45 }}>
      {type === 'vase' && <>
        <ellipse cx="34" cy="17" rx="11" ry="3.5" stroke="var(--accent)" strokeWidth="1"/>
        <path d="M23 17 L19 55" stroke="var(--accent)" strokeWidth="1"/>
        <path d="M45 17 L49 55" stroke="var(--accent)" strokeWidth="1"/>
        <ellipse cx="34" cy="55" rx="15" ry="4" stroke="var(--accent)" strokeWidth="1"/>
        <path d="M23 36 L45 36" stroke="var(--accent)" strokeWidth=".6" strokeDasharray="3 2"/>
      </>}
      {type === 'torus' && <>
        <ellipse cx="34" cy="34" rx="21" ry="21" stroke="var(--accent)" strokeWidth="1"/>
        <ellipse cx="34" cy="34" rx="9"  ry="9"  stroke="var(--accent)" strokeWidth=".6" strokeDasharray="3 2"/>
      </>}
      {(type === 'box' || !type) && <>
        <rect x="16" y="22" width="28" height="34" stroke="var(--accent)" strokeWidth="1"/>
        <path d="M16 22 L24 13 L52 13 L52 47" stroke="var(--accent)" strokeWidth="1"/>
        <path d="M52 13 L44 22" stroke="var(--accent)" strokeWidth="1"/>
        <path d="M16 56 L24 47" stroke="var(--accent)" strokeWidth=".6" strokeDasharray="3 2"/>
        <path d="M24 13 L24 47" stroke="var(--accent)" strokeWidth=".6" strokeDasharray="3 2"/>
      </>}
    </svg>
  );
}

function Showcase({ prints }) {
  const [sel, setSel] = useState(null);
  return (
    <section id="showcase" style={{ padding:'112px 32px', maxWidth:1400, margin:'0 auto' }}>
      <SHead num="04 / Portfolio" title={<>Eerder<br />gemaakt</>} />
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(250px,1fr))', gap:18 }}>
        {prints.map((p, i) => (
          <div key={p.id} className={`pc rev d${Math.min(i + 1, 6)}`} onClick={() => setSel(p)} style={{ padding:28 }}>
            <div style={{ height:144, background:'var(--bg)', border:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:24, position:'relative' }}>
              <PrintIcon type={p.type} />
              <span className="mono" style={{ position:'absolute', top:8, right:10, fontSize:9, color:'var(--fg-muted)', letterSpacing:'.1em' }}>3D</span>
            </div>
            <div className="mono" style={{ fontSize:14, fontWeight:700, color:'var(--fg)', marginBottom:7 }}>{p.naam}</div>
            <div style={{ fontSize:13, color:'var(--fg-muted)', marginBottom:22, lineHeight:1.58 }}>{p.beschrijving}</div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span className="mono" style={{ fontSize:10, color:'var(--fg-muted)', letterSpacing:'.05em' }}>
                {p.materiaalAdvies} · {p.gewichtGram}g · {fmt(p.prijsIndicatie)}
              </span>
              <button className="pc-cta">Bekijk 3D <ChevronRight size={11} /></button>
            </div>
          </div>
        ))}
      </div>
      {sel && <STLViewer print={sel} onClose={() => setSel(null)} />}
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════
//  CONTACT — stuurt naar thijnfigo@gmail.com via Formspree
// ═══════════════════════════════════════════════════════════════
function Field({ label, children }) {
  return (
    <div>
      <label className="mono" style={{ display:'block', fontSize:10, color:'var(--fg-muted)', letterSpacing:'.15em', textTransform:'uppercase', marginBottom:9 }}>{label}</label>
      {children}
    </div>
  );
}

function Contact({ filamenten }) {
  const [d,  setD]  = useState({ naam:'', email:'', filament:'', beschrijving:'' });
  const [st, setSt] = useState('idle'); // idle | sending | done | error
  const set = k => e => setD(p => ({ ...p, [k]: e.target.value }));
  const ok  = d.naam.trim() && d.email.includes('@');

  const submit = async () => {
    if (!ok) return;
    setSt('sending');

    if (config.formspreeId === 'JOUW_FORMSPREE_ID') {
      // Dev mode: simulate success
      setTimeout(() => setSt('done'), 1200);
      return;
    }

    try {
      const res = await fetch(`https://formspree.io/f/${config.formspreeId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          naam:        d.naam,
          email:       d.email,
          filament:    d.filament || '(niet opgegeven)',
          beschrijving: d.beschrijving || '(geen)',
          _replyto:    d.email,
          _subject:    `PrintLab aanvraag van ${d.naam}`,
        }),
      });
      if (res.ok) setSt('done');
      else        setSt('error');
    } catch {
      setSt('error');
    }
  };

  return (
    <section id="contact" style={{ background:'var(--surface)', borderTop:'1px solid var(--border)', padding:'112px 32px' }}>
      <div style={{ maxWidth:1400, margin:'0 auto' }}>
        <div className="two-col">
          <div>
            <SHead num="05 / Bestellen" title={<>Print<br />aanvragen</>} />
            <p className="rev" style={{ fontSize:15, color:'var(--fg-muted)', lineHeight:1.78, maxWidth:'40ch', marginBottom:40 }}>
              Stuur je bestand mee of beschrijf wat je wilt. Je hoort zo snel mogelijk terug met een exacte prijs en levertijd.
            </p>
            {config.whatsappNumber && (
              <a href={`https://wa.me/${config.whatsappNumber.replace(/\D/g,'')}`} target="_blank" rel="noopener noreferrer" className="btn btn-o rev" style={{ display:'inline-flex' }}>
                <MessageCircle size={13} /> WhatsApp
              </a>
            )}
            <div className="rev" style={{ marginTop:52, paddingTop:40, borderTop:'1px solid var(--border)' }}>
              <div className="mono" style={{ fontSize:10, letterSpacing:'.16em', color:'var(--fg-muted)', textTransform:'uppercase', marginBottom:8 }}>E-mail</div>
              <div style={{ fontSize:15, color:'var(--fg)' }}>{config.contactEmail}</div>
            </div>
          </div>

          <div className="rev d2">
            {st === 'done' ? (
              <div style={{ border:'1px solid rgba(74,222,128,.2)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:380, gap:16, textAlign:'center', padding:48 }}>
                <div style={{ width:48, height:48, borderRadius:'50%', background:'rgba(74,222,128,.12)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Check size={20} color="#4ade80" />
                </div>
                <div className="mono" style={{ fontSize:20, fontWeight:700, color:'var(--fg)' }}>Verstuurd!</div>
                <div style={{ fontSize:14, color:'var(--fg-muted)' }}>Je hoort zo snel mogelijk van me.</div>
              </div>
            ) : st === 'error' ? (
              <div style={{ border:'1px solid rgba(239,68,68,.2)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:200, gap:14, textAlign:'center', padding:32 }}>
                <XCircle size={24} color="#ef4444" />
                <div style={{ fontSize:14, color:'var(--fg-muted)' }}>Versturen mislukt. Probeer het opnieuw of mail direct naar {config.contactEmail}.</div>
                <button className="btn btn-o" onClick={() => setSt('idle')}>Opnieuw</button>
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:22 }}>
                <Field label="Naam *">
                  <input className="inp" type="text" placeholder="Jouw naam" value={d.naam} onChange={set('naam')} />
                </Field>
                <Field label="E-mail *">
                  <input className="inp" type="email" placeholder="jouw@email.nl" value={d.email} onChange={set('email')} />
                </Field>
                <Field label="Filament kleur">
                  <select className="inp" value={d.filament} onChange={set('filament')}>
                    <option value="">Kies een kleur...</option>
                    {filamenten.map(f => (
                      <option key={f.id} value={`${f.kleur} — ${f.materiaal}`}>
                        {f.kleur} — {f.materiaal}{f.isGlittery ? ' ✦' : ''}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Omschrijving / opmerkingen">
                  <textarea className="inp" rows={4}
                    placeholder="Beschrijf je print. Welk STL bestand? Afmetingen? Bijzonderheden?"
                    value={d.beschrijving} onChange={set('beschrijving')} />
                </Field>
                <button className="btn btn-p btn-glow" onClick={submit} disabled={!ok || st === 'sending'}>
                  {st === 'sending'
                    ? <><Loader2 size={13} className="spinner" /> Versturen...</>
                    : <>Aanvraag versturen <ChevronRight size={13} /></>
                  }
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════
//  APP
// ═══════════════════════════════════════════════════════════════
export default function App() {
  const { filamenten, prints, loading, error } = useCsvData();
  useReveal([loading]);

  if (loading) {
    return (
      <>
        <style>{CSS}</style>
        <div className="loading-screen">
          <Loader2 size={28} color="var(--accent)" className="spinner" />
          <span className="mono" style={{ fontSize:11, color:'var(--fg-muted)', letterSpacing:'.16em', textTransform:'uppercase' }}>
            Data laden...
          </span>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <style>{CSS}</style>
        <div className="loading-screen">
          <XCircle size={28} color="#ef4444" />
          <span className="mono" style={{ fontSize:13, color:'var(--fg-muted)', maxWidth:400, textAlign:'center', lineHeight:1.6 }}>
            CSV-bestanden konden niet worden geladen.<br />
            Controleer of <code style={{ color:'var(--accent)' }}>public/data/filamenten.csv</code> en{' '}
            <code style={{ color:'var(--accent)' }}>public/data/prints.csv</code> bestaan.
          </span>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{CSS}</style>
      <div className="grain" />
      <Hero />
      <div style={{ borderTop:'1px solid var(--border)' }} />
      <FilamentGrid filamenten={filamenten} />
      <Calculator filamenten={filamenten} />
      <Showcase prints={prints} />
      <Contact filamenten={filamenten} />
      <footer style={{ borderTop:'1px solid var(--border)', padding:'26px 32px' }}>
        <div style={{ maxWidth:1400, margin:'0 auto', display:'flex', justifyContent:'space-between' }}>
          <span className="mono" style={{ fontSize:11, color:'var(--fg-muted)', letterSpacing:'.1em' }}>{config.businessName}</span>
          <span className="mono" style={{ fontSize:11, color:'var(--fg-muted)' }}>© {new Date().getFullYear()} {config.ownerName}</span>
        </div>
      </footer>
    </>
  );
}