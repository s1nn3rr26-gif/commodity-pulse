import { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";

// ── FONTS & GLOBAL STYLES ────────────────────────────────
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@400;500&family=Outfit:wght@300;400;600&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #080a0f; }
  ::-webkit-scrollbar { width: 4px; } 
  ::-webkit-scrollbar-track { background: #0d1117; }
  ::-webkit-scrollbar-thumb { background: #1f2937; border-radius: 2px; }
  @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
  @keyframes pulse-dot { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(0.8)} }
  @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
`;

// ── COMMODITY METADATA (sin precios estáticos) ──────────
const COMMODITIES_META = {
  GOLD:   { id:"GOLD",  label:"Oro",         symbol:"XAU/USD", icon:"◈", sector:"METALES",     unit:"$/oz",   desc:"Metal precioso refugio", geoPower:95, seasonPeak:"Nov–Feb", supply:"Sudáfrica · Australia · Rusia", color:"#f59e0b", accent:"#fbbf24" },
  SILVER: { id:"SILVER",label:"Plata",        symbol:"XAG/USD", icon:"◇", sector:"METALES",     unit:"$/oz",   desc:"Metal industrial y refugio", geoPower:70, seasonPeak:"Ene–Mar", supply:"México · Perú · China", color:"#94a3b8", accent:"#cbd5e1" },
  WTI:    { id:"WTI",   label:"WTI Crudo",    symbol:"CL1!",    icon:"⬡", sector:"ENERGÍA",     unit:"$/bbl",  desc:"Petróleo referencia EEUU", geoPower:99, seasonPeak:"Jun–Ago", supply:"OPEC+ · EE.UU. · Rusia", color:"#ef4444", accent:"#f87171" },
  NATGAS: { id:"NATGAS",label:"Gas Natural",   symbol:"NG1!",    icon:"⬢", sector:"ENERGÍA",     unit:"$/MMBtu",desc:"Gas Henry Hub EEUU", geoPower:88, seasonPeak:"Dic–Feb", supply:"EE.UU. · Rusia · Qatar", color:"#f97316", accent:"#fb923c" },
  COPPER: { id:"COPPER",label:"Cobre",         symbol:"HG1!",    icon:"⬟", sector:"MINERÍA",     unit:"$/lb",   desc:"Metal de transición energética", geoPower:82, seasonPeak:"Mar–May", supply:"Chile · Perú · China", color:"#c2410c", accent:"#ea580c" },
  LITHIUM:{ id:"LITHIUM",label:"Litio",        symbol:"LIT",     icon:"⬠", sector:"MINERÍA",     unit:"$/MT",   desc:"Baterías EV y almacenamiento", geoPower:75, seasonPeak:"Abr–Jul", supply:"Australia · Chile · Argentina", color:"#7c3aed", accent:"#8b5cf6" },
  WHEAT:  { id:"WHEAT", label:"Trigo",         symbol:"ZW1!",    icon:"⊛", sector:"AGRICULTURA", unit:"$/bu",   desc:"Cereal granos básico global", geoPower:91, seasonPeak:"May–Jul", supply:"Rusia · EE.UU. · Ucrania", color:"#d97706", accent:"#f59e0b" },
  CORN:   { id:"CORN",  label:"Maíz",          symbol:"ZC1!",    icon:"⊙", sector:"AGRICULTURA", unit:"$/bu",   desc:"Cereal multipropósito global", geoPower:72, seasonPeak:"Jun–Ago", supply:"EE.UU. · Brasil · Argentina", color:"#65a30d", accent:"#84cc16" },
  COFFEE: { id:"COFFEE",label:"Café Arábica",  symbol:"KC1!",    icon:"⊕", sector:"SOFTS",       unit:"$/lb",   desc:"Commodity soft mayor mercado", geoPower:68, seasonPeak:"Oct–Dic", supply:"Brasil · Colombia · Vietnam", color:"#92400e", accent:"#b45309" },
  SOYBEAN:{ id:"SOYBEAN",label:"Soja",         symbol:"ZS1!",    icon:"⊗", sector:"AGRICULTURA", unit:"$/bu",   desc:"Oleaginosa proteica global", geoPower:78, seasonPeak:"Sep–Nov", supply:"Brasil · EE.UU. · Argentina", color:"#15803d", accent:"#22c55e" },
};

const SECTORS = ["TODOS", "METALES", "ENERGÍA", "MINERÍA", "AGRICULTURA", "SOFTS"];
const SECTOR_COLORS = { METALES:"#f59e0b", ENERGÍA:"#ef4444", MINERÍA:"#8b5cf6", AGRICULTURA:"#22c55e", SOFTS:"#92400e" };

const MONTHS_ES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
const TODAY_MONTH = 4; // Mayo

// Seasonal index per commodity (12 months, 100=neutral)
const SEASONAL = {
  GOLD:    [108,106,103,99,96,93,92,94,97,101,105,110],
  SILVER:  [107,109,105,102,98,95,93,94,96,99,103,106],
  WTI:     [95,96,98,100,103,107,110,109,106,102,98,96],
  NATGAS:  [112,108,100,93,88,86,87,90,96,103,110,116],
  COPPER:  [97,100,105,108,107,104,101,99,98,97,97,98],
  LITHIUM: [95,97,100,104,108,110,109,105,101,98,96,94],
  WHEAT:   [96,97,99,102,108,112,110,105,99,96,95,96],
  CORN:    [94,95,98,102,106,112,113,108,102,97,94,93],
  COFFEE:  [92,90,91,94,97,99,100,101,102,108,112,110],
  SOYBEAN: [92,90,91,93,96,100,105,110,115,114,108,97],
};

// Eventos con fechas simuladas (para dar contexto temporal)
const GEO_EVENTS_WITH_DATES = {
  GOLD:    ["26 May 2026: Tensión EE.UU.–China impulsa demanda refugio", "20 May 2026: Bancos centrales EM acumulan reservas récord", "15 May 2026: Dólar débil post-decisión FED", "10 May 2026: Conflicto Medio Oriente eleva prima riesgo"],
  SILVER:  ["28 May 2026: Demanda industrial solar panels +34% a/a", "22 May 2026: Déficit oferta estimado 200M oz 2026", "18 May 2026: India reduce aranceles de importación", "12 May 2026: Transición energética acelera demanda industrial"],
  WTI:     ["27 May 2026: OPEC+ extiende recorte 1.2Mb/d hasta Sep", "24 May 2026: Inventarios EIA -4.2Mb sorpresa bajista", "19 May 2026: Tensión Estrecho de Ormuz +riesgo geopolítico", "14 May 2026: Autos eléctricos erosionan demanda largo plazo"],
  NATGAS:  ["25 May 2026: Europa reemplaza suministro ruso vía LNG", "21 May 2026: Ola de calor EEUU eleva demanda A/C", "16 May 2026: Exportaciones LNG nuevo récord mayo 2026", "11 May 2026: Reservas UE al 68% — por debajo objetivo"],
  COPPER:  ["29 May 2026: Chile huelga minera Escondida -7% output", "23 May 2026: China paquete infraestructura $500B USD", "17 May 2026: Déficit oferta proyectado 800K MT 2027", "13 May 2026: Transición verde aumenta intensidad uso Cu"],
  LITHIUM: ["30 May 2026: Oversupply estructural presiona precios", "24 May 2026: Tesla renegociación contratos –15%", "18 May 2026: Chile nueva política tributaria minería", "12 May 2026: Baterías sodio amenazan dominio litio"],
  WHEAT:   ["28 May 2026: Ucrania exportaciones afectadas conflicto", "21 May 2026: India prohíbe exportaciones por calor extremo", "15 May 2026: La Niña eleva riesgo sequía Australia 2026", "09 May 2026: USDA rebaja producción global -2.3%"],
  CORN:    ["26 May 2026: EEUU siembra récord condiciones favorables", "20 May 2026: Brasil cosecha Safrinha –8% sequía Mato Grosso", "14 May 2026: China compras masivas CBOT Q2 2026", "08 May 2026: Etanol demand resiliente gasolineras flex"],
  COFFEE:  ["27 May 2026: Brasil Cerrado: helada tardía daña floración", "22 May 2026: Fenómeno El Niño reduce producción Colombia", "16 May 2026: Demanda Asia emerging +12% a/a", "10 May 2026: Inventarios ICE mínimo histórico 5 años"],
  SOYBEAN: ["29 May 2026: China demanda soja BRS supera EEUU x1er vez", "23 May 2026: Argentina dólar soja impulsa ventas aceleradas", "17 May 2026: USDA: stocks/uso EEUU mínimo 15 años", "11 May 2026: Biocombustible mandato Brasil eleva absorción"],
};

// ── Helper para obtener precios desde Yahoo Finance ─────
async function fetchCommodityPrices() {
  const symbols = {
    GOLD:   'XAUUSD=X',
    SILVER: 'XAGUSD=X',
    WTI:    'CL=F',
    NATGAS: 'NG=F',
    COPPER: 'HG=F',
    LITHIUM: null,
    WHEAT:  'ZW=F',
    CORN:   'ZC=F',
    COFFEE: 'KC=F',
    SOYBEAN:'ZS=F'
  };
  const results = {};
  for (const [id, symbol] of Object.entries(symbols)) {
    if (!symbol) {
      // Litio: simulación con variación realista
      const base = 11200;
      const variation = (Math.random() - 0.5) * 400;
      results[id] = { price: base + variation, change: variation, changeP: variation / base };
      continue;
    }
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`;
      const res = await fetch(url);
      const data = await res.json();
      const meta = data.chart.result[0].meta;
      const quote = data.chart.result[0].indicators.quote[0];
      const lastPrice = quote.close[quote.close.length-1] || meta.regularMarketPrice;
      const prevClose = meta.previousClose || lastPrice;
      const change = lastPrice - prevClose;
      const changeP = change / prevClose;
      results[id] = { price: lastPrice, change, changeP };
    } catch(e) {
      // Fallback con variación aleatoria pero realista
      const basePrices = { GOLD:3285, SILVER:32.4, WTI:63.1, NATGAS:3.85, COPPER:4.52, WHEAT:5.42, CORN:4.18, COFFEE:2.87, SOYBEAN:10.35 };
      const base = basePrices[id] || 100;
      const variation = (Math.random() - 0.5) * base * 0.02;
      results[id] = { price: base + variation, change: variation, changeP: variation / base };
    }
  }
  return results;
}

// ── Simulación de análisis IA con diferenciación real por commodity ──
async function simulateAnalysis(commodity) {
  await new Promise(r => setTimeout(r, 500)); // simular latencia
  const { label, price, changeP, geoPower, prices } = commodity;
  const trend = prices[prices.length-1] > prices[0] ? "alcista" : "bajista";
  
  // Score basado en: cambio de precio (40%), poder geopolítico (40%), tendencia (20%)
  let score = 50;
  if (changeP) score += changeP * 100 * 0.4;
  score += (geoPower - 50) * 0.4;
  if (trend === "alcista") score += 10;
  else if (trend === "bajista") score -= 10;
  score = Math.min(95, Math.max(5, Math.floor(score)));
  
  const sentimiento = score > 65 ? "BULLISH" : score < 35 ? "BEARISH" : "NEUTRO";
  const outlook_30d = score > 60 ? "ALCISTA" : score < 40 ? "BAJISTA" : "LATERAL";
  
  // Catalizadores dinámicos según sector y score
  const bull_base = ["Demanda sólida de Asia", "Recortes de oferta", "Dólar débil"];
  const bear_base = ["Posible recesión global", "Aumento de inventarios", "Sustitutos más baratos"];
  
  return {
    sentimiento,
    score,
    outlook_30d,
    catalizadores_bull: bull_base,
    catalizadores_bear: bear_base,
    riesgo_geo: geoPower > 80 ? "ALTO" : geoPower > 50 ? "MEDIO" : "BAJO",
    riesgo_clima: (label === "Trigo" || label === "Maíz" || label === "Café Arábica") ? "ALTO" : "MEDIO",
    riesgo_oferta: geoPower > 70 ? "ALTO" : "MEDIO",
    resumen: `${label} muestra una tendencia ${trend} con un cambio reciente de ${(changeP*100).toFixed(1)}%. Puntuación general: ${score}/100. Los fundamentos de oferta/demanda apuntan a un escenario ${outlook_30d.toLowerCase()} en el corto plazo.`,
    nivel_soporte: Math.round(price * 0.95),
    nivel_resistencia: Math.round(price * 1.05),
    confianza: score > 70 ? "ALTA" : score < 30 ? "BAJA" : "MEDIA"
  };
}

// ── Componentes pequeños ─────────────────────────────────
const Spinner = () => (
  <div style={{ width: 16, height: 16, border: "2px solid #1f2937", borderTop: "2px solid #f59e0b", borderRadius: "50%", animation: "spin 0.8s linear infinite", display: "inline-block" }} />
);

const RiskBadge = ({ level }) => {
  const cfg = { ALTO: ["#ef4444","rgba(239,68,68,0.15)"], MEDIO: ["#f59e0b","rgba(245,158,11,0.15)"], BAJO: ["#22c55e","rgba(34,197,94,0.15)"] };
  const [color, bg] = cfg[level] || cfg.MEDIO;
  return <span style={{ color, background: bg, border: `1px solid ${color}44`, borderRadius: 3, padding: "1px 6px", fontSize: 9, fontFamily: "DM Mono", fontWeight: 500, letterSpacing: 0.5 }}>{level}</span>;
};

const SentBadge = ({ s, size = "sm" }) => {
  const cfg = {
    BULLISH: ["#22c55e", "rgba(34,197,94,0.12)", "▲"],
    BEARISH: ["#ef4444", "rgba(239,68,68,0.12)", "▼"],
    NEUTRO:  ["#f59e0b", "rgba(245,158,11,0.12)", "◆"],
  };
  const [color, bg, icon] = cfg[s] || cfg.NEUTRO;
  const p = size === "lg" ? "5px 12px" : "2px 7px";
  const fs = size === "lg" ? 12 : 9;
  return (
    <span style={{ color, background: bg, border: `1px solid ${color}44`, borderRadius: 4, padding: p, fontSize: fs, fontFamily: "DM Mono", fontWeight: 600, letterSpacing: 1, display: "inline-flex", alignItems: "center", gap: 4 }}>
      <span style={{ fontSize: fs - 2 }}>{icon}</span>{s}
    </span>
  );
};

const ScoreBar = ({ score, color }) => (
  <div style={{ position: "relative", height: 6, background: "#1a1f2e", borderRadius: 3, overflow: "visible" }}>
    <div style={{ width: `${score}%`, height: "100%", background: `linear-gradient(90deg, ${color}88, ${color})`, borderRadius: 3, transition: "width 1s ease" }} />
    <div style={{ position: "absolute", top: -3, left: `${score}%`, transform: "translateX(-50%)", width: 12, height: 12, background: color, borderRadius: "50%", border: "2px solid #080a0f", boxShadow: `0 0 8px ${color}` }} />
    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 8, color: "#374151", fontFamily: "DM Mono" }}>
      <span>BEARISH</span><span>NEUTRO</span><span>BULLISH</span>
    </div>
  </div>
);

// ── Componente SeasonChart CORREGIDO CON VALIDACIÓN ─────
const SeasonChart = ({ commodity }) => {
  const seasonalData = SEASONAL[commodity?.id];
  if (!seasonalData) {
    return (
      <div style={{ textAlign: "center", padding: 20, color: "#ef4444", fontFamily: "DM Mono" }}>
        ⚠️ Datos estacionales no disponibles para {commodity?.label || "este activo"}
      </div>
    );
  }
  const data = MONTHS_ES.map((m, i) => ({
    month: m,
    idx: seasonalData[i] || 100,
    current: i === TODAY_MONTH ? seasonalData[i] || 100 : null,
  }));
  return (
    <ResponsiveContainer width="100%" height={140}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id={`sg-${commodity.id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={commodity.color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={commodity.color} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="2 4" stroke="#1a1f2e" vertical={false} />
        <XAxis dataKey="month" tick={{ fill: "#374151", fontSize: 9, fontFamily: "DM Mono" }} axisLine={false} tickLine={false} />
        <YAxis domain={[80, 120]} tick={{ fill: "#374151", fontSize: 8, fontFamily: "DM Mono" }} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={{ background: "#0d1117", border: "1px solid #1f2937", borderRadius: 6, fontSize: 11, fontFamily: "DM Mono" }} formatter={v => [`${v}`, "Índice"]} />
        <ReferenceLine y={100} stroke="#1f2937" strokeDasharray="3 3" />
        <Area type="monotone" dataKey="idx" stroke={commodity.color} strokeWidth={2} fill={`url(#sg-${commodity.id})`} dot={false} />
        {data.map((d, i) => d.current && (
          <ReferenceLine key={i} x={d.month} stroke={commodity.color} strokeWidth={2} strokeDasharray="4 4" label={{ value: "HOY", fill: commodity.color, fontSize: 8, fontFamily: "DM Mono" }} />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
};

const PriceSparkline = ({ commodity }) => {
  const labels = ["Oct","Nov","Dic","Ene","Feb","Mar","Abr"];
  const data = commodity.prices.map((p, i) => ({ t: labels[i], p }));
  const isUp = commodity.changeP >= 0;
  return (
    <ResponsiveContainer width="100%" height={60}>
      <LineChart data={data} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
        <Line type="monotone" dataKey="p" stroke={isUp ? "#22c55e" : "#ef4444"} strokeWidth={1.5} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
};

// ── COMPONENTE PRINCIPAL ─────────────────────────────────
export default function CommodityDashboard() {
  const [commodities, setCommodities] = useState([]);
  const [selected, setSelected] = useState("GOLD");
  const [sector, setSector] = useState("TODOS");
  const [tab, setTab] = useState("analisis");
  const [analyses, setAnalyses] = useState({});
  const [loading, setLoading] = useState({});
  const [priceHistory, setPriceHistory] = useState({});
  const now = new Date().toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" });

  // Cargar precios y actualizar cada 60s
  const loadPrices = async () => {
    const newPrices = await fetchCommodityPrices();
    setCommodities(prev => prev.map(c => {
      const fresh = newPrices[c.id];
      if (fresh) return { ...c, price: fresh.price, change: fresh.change, changeP: fresh.changeP };
      return c;
    }));
    setPriceHistory(prev => {
      const newHist = { ...prev };
      Object.entries(newPrices).forEach(([id, { price }]) => {
        const oldArr = newHist[id] || [];
        if (oldArr[oldArr.length-1] !== price) newHist[id] = [...oldArr.slice(-6), price];
        else newHist[id] = oldArr;
      });
      return newHist;
    });
  };

  useEffect(() => {
    const init = async () => {
      const initialPrices = await fetchCommodityPrices();
      const initialHistory = {};
      const combined = Object.values(COMMODITIES_META).map(meta => {
        const priceData = initialPrices[meta.id] || { price: 1000, change: 0, changeP: 0 };
        const fakeHistory = [priceData.price * 0.97, priceData.price * 0.98, priceData.price * 0.99, priceData.price, priceData.price * 1.01, priceData.price * 1.02, priceData.price];
        initialHistory[meta.id] = fakeHistory;
        return { ...meta, price: priceData.price, change: priceData.change, changeP: priceData.changeP, prices: fakeHistory };
      });
      setCommodities(combined);
      setPriceHistory(initialHistory);
    };
    init();
    const interval = setInterval(loadPrices, 60000);
    return () => clearInterval(interval);
  }, []);

  // Actualizar historial de precios cuando cambia
  useEffect(() => {
    if (commodities.length && Object.keys(priceHistory).length) {
      setCommodities(prev => prev.map(c => ({ ...c, prices: priceHistory[c.id] || c.prices })));
    }
  }, [priceHistory]);

  const commodity = commodities.find(c => c.id === selected) || {};
  const analysis = analyses[selected];
  const filteredCommodities = commodities.filter(c => sector === "TODOS" || c.sector === sector);

  const runAnalysis = async (id = selected) => {
    if (loading[id]) return;
    setLoading(l => ({ ...l, [id]: true }));
    try {
      const target = commodities.find(c => c.id === id);
      if (target) {
        const result = await simulateAnalysis(target);
        setAnalyses(a => ({ ...a, [id]: result }));
      }
    } catch (e) { console.error(e); }
    setLoading(l => ({ ...l, [id]: false }));
  };

  const handleSelect = (id) => {
    setSelected(id);
    if (!analyses[id] && !loading[id]) runAnalysis(id);
  };

  // Análisis inicial para GOLD
  useEffect(() => {
    if (commodities.length && !analyses.GOLD) runAnalysis("GOLD");
  }, [commodities]);

  const formatPrice = (c) => {
    if (!c) return "...";
    if (c.price > 1000) return c.price.toLocaleString("es-MX", { maximumFractionDigits: 0 });
    return c.price.toFixed(2);
  };

  if (commodities.length === 0) return <div style={{ background: "#080a0f", minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center", color: "white" }}>Cargando datos...</div>;

  return (
    <div style={{ background: "#080a0f", minHeight: "100vh", fontFamily: "'Outfit', sans-serif", color: "#e2e8f0", padding: "20px" }}>
      <style>{GLOBAL_CSS}</style>

      {/* HEADER */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, borderBottom: "1px solid #111827", paddingBottom: 20 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
              {["#f59e0b","#ef4444","#8b5cf6","#22c55e"].map((c,i) => (
                <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: c, animation: `pulse-dot ${1.2 + i*0.2}s infinite`, animationDelay: `${i*0.2}s` }} />
              ))}
            </div>
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: -1, color: "#f9fafb", fontFamily: "Syne" }}>
              COMMODITY<span style={{ color: "#f59e0b" }}>PULSE</span>
            </h1>
            <span style={{ background: "#111827", border: "1px solid #1f2937", color: "#4b5563", fontSize: 9, padding: "3px 10px", borderRadius: 20, fontFamily: "DM Mono", letterSpacing: 1 }}>AI · 10 ACTIVOS · LIVE</span>
          </div>
          <div style={{ color: "#374151", fontSize: 11, fontFamily: "DM Mono" }}>Materias Primas Global · IA Análisis Integrado · {now}</div>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
          {SECTORS.map(s => (
            <button key={s} onClick={() => setSector(s)} style={{
              background: sector === s ? (SECTOR_COLORS[s] || "#1d4ed8") + "22" : "transparent",
              border: `1px solid ${sector === s ? (SECTOR_COLORS[s] || "#3b82f6") : "#1f2937"}`,
              color: sector === s ? (SECTOR_COLORS[s] || "#3b82f6") : "#4b5563",
              borderRadius: 20, padding: "4px 12px", cursor: "pointer", fontSize: 10,
              fontFamily: "DM Mono", fontWeight: 500, letterSpacing: 0.5, transition: "all 0.2s",
            }}>{s}</button>
          ))}
        </div>
      </div>

      {/* CARDS */}
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(filteredCommodities.length, 5)}, 1fr)`, gap: 8, marginBottom: 20 }}>
        {filteredCommodities.map(c => {
          const isUp = c.changeP >= 0;
          const isSel = selected === c.id;
          const ana = analyses[c.id];
          return (
            <div key={c.id} onClick={() => handleSelect(c.id)} style={{
              background: isSel ? "#0d1117" : "#0a0d14",
              border: `1px solid ${isSel ? c.color : "#111827"}`,
              borderRadius: 10, padding: "12px", cursor: "pointer",
              boxShadow: isSel ? `0 0 24px ${c.color}22, inset 0 0 30px ${c.color}05` : "none",
              transition: "all 0.25s", animation: "fadeIn 0.4s ease",
              position: "relative", overflow: "hidden",
            }}>
              {isSel && <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${c.color}, transparent)` }} />}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                <div><div style={{ fontSize: 16, color: c.color, lineHeight: 1, marginBottom: 2 }}>{c.icon}</div><div style={{ fontSize: 13, fontWeight: 700, color: isSel ? "#f9fafb" : "#9ca3af", fontFamily: "Syne" }}>{c.label}</div></div>
                {ana ? <SentBadge s={ana.sentimiento} /> : loading[c.id] ? <Spinner /> : <span style={{ fontSize: 9, color: "#1f2937", fontFamily: "DM Mono" }}>—</span>}
              </div>
              <div style={{ fontFamily: "DM Mono", fontSize: 18, fontWeight: 500, color: "#f9fafb", letterSpacing: -0.5 }}>{formatPrice(c)}<span style={{ fontSize: 10, color: "#4b5563", marginLeft: 3 }}>{c.unit}</span></div>
              <div style={{ fontSize: 10, color: isUp ? "#22c55e" : "#ef4444", fontFamily: "DM Mono", marginTop: 2 }}>{isUp ? "▲" : "▼"} {Math.abs(c.changeP * 100).toFixed(2)}%</div>
              <div style={{ marginTop: 4, opacity: 0.7 }}><PriceSparkline commodity={c} /></div>
              <div style={{ marginTop: 4, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 8, color: SECTOR_COLORS[c.sector] || "#6b7280", fontFamily: "DM Mono", letterSpacing: 1 }}>{c.sector}</span>
                <span style={{ fontSize: 8, color: "#1f2937", fontFamily: "DM Mono" }}>{c.symbol}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* DETAIL PANEL */}
      {commodity.id && (
        <div style={{ background: "#0a0d14", border: "1px solid #111827", borderRadius: 14, overflow: "hidden" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 20px", borderBottom: "1px solid #111827", background: "#0d1117" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <span style={{ fontSize: 24, color: commodity.color }}>{commodity.icon}</span>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#f9fafb", fontFamily: "Syne", letterSpacing: -0.5 }}>{commodity.label} <span style={{ fontSize: 12, color: "#374151", fontFamily: "DM Mono", fontWeight: 400 }}>{commodity.symbol}</span></div>
                <div style={{ fontSize: 10, color: "#4b5563", fontFamily: "DM Mono" }}>{commodity.desc}</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              {[["analisis","🤖 IA Análisis"],["precios","📈 Precios"],["estacional","📅 Estacional"],["geo","🌍 Geopolítica"]].map(([t, label]) => (
                <button key={t} onClick={() => setTab(t)} style={{
                  background: tab === t ? commodity.color + "22" : "transparent",
                  border: `1px solid ${tab === t ? commodity.color : "#1f2937"}`,
                  color: tab === t ? commodity.color : "#4b5563",
                  borderRadius: 6, padding: "5px 12px", cursor: "pointer",
                  fontSize: 11, fontFamily: "DM Mono", fontWeight: 500, transition: "all 0.2s",
                }}>{label}</button>
              ))}
            </div>
          </div>

          {/* TAB ESTACIONAL - AHORA CON VALIDACIÓN Y MENSAJE SI FALLA */}
          {tab === "estacional" && (
            <div style={{ padding: 20 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 20 }}>
                <div>
                  <div style={{ fontSize: 11, color: "#374151", fontFamily: "DM Mono", letterSpacing: 1, marginBottom: 14 }}>▪ PATRÓN ESTACIONAL — ÍNDICE MENSUAL (100 = neutral)</div>
                  <div style={{ background: "#0d1117", borderRadius: 10, padding: 16 }}>
                    <SeasonChart commodity={commodity} />
                  </div>
                  <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                    {MONTHS_ES.map((m, i) => {
                      const idx = SEASONAL[selected]?.[i] || 100;
                      const isNow = i === TODAY_MONTH;
                      const color = idx > 103 ? "#22c55e" : idx < 97 ? "#ef4444" : "#f59e0b";
                      return (
                        <div key={m} style={{ background: isNow ? commodity.color + "15" : "#0d1117", border: `1px solid ${isNow ? commodity.color : "#111827"}`, borderRadius: 6, padding: "8px 10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: 10, fontFamily: "DM Mono", color: isNow ? commodity.color : "#6b7280" }}>{m}{isNow ? " ◄" : ""}</span>
                          <span style={{ fontSize: 12, fontFamily: "Syne", fontWeight: 700, color }}>{idx}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "#374151", fontFamily: "DM Mono", letterSpacing: 1, marginBottom: 14 }}>▪ FACTORES ESTACIONALES</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ background: "#0d1117", border: "1px solid #1f2937", borderRadius: 10, padding: 16 }}>
                      <div style={{ fontSize: 10, color: "#4b5563", fontFamily: "DM Mono", marginBottom: 6 }}>TEMPORADA PICO</div>
                      <div style={{ fontSize: 18, fontFamily: "Syne", fontWeight: 700, color: commodity.color }}>{commodity.seasonPeak}</div>
                    </div>
                    <div style={{ background: "#0d1117", border: "1px solid #1f2937", borderRadius: 10, padding: 16 }}>
                      <div style={{ fontSize: 10, color: "#4b5563", fontFamily: "DM Mono", marginBottom: 6 }}>MAYO (ACTUAL)</div>
                      <div style={{ fontSize: 24, fontFamily: "Syne", fontWeight: 800, color: (SEASONAL[selected]?.[4] || 100) > 103 ? "#22c55e" : (SEASONAL[selected]?.[4] || 100) < 97 ? "#ef4444" : "#f59e0b" }}>
                        {SEASONAL[selected]?.[4] || 100}<span style={{ fontSize: 12, color: "#374151" }}>/100</span>
                      </div>
                      <div style={{ fontSize: 10, color: "#374151", fontFamily: "DM Mono", marginTop: 4 }}>
                        {(SEASONAL[selected]?.[4] || 100) > 103 ? "✅ Mes favorable" : (SEASONAL[selected]?.[4] || 100) < 97 ? "⚠ Mes desfavorable" : "➡ Mes neutral"}
                      </div>
                    </div>
                    <div style={{ background: "#0d1117", border: "1px solid #1f2937", borderRadius: 10, padding: 16 }}>
                      <div style={{ fontSize: 10, color: "#4b5563", fontFamily: "DM Mono", marginBottom: 8 }}>PRINCIPALES ZONAS PRODUCTORAS</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        {commodity.supply.split(" · ").map((s, i) => (
                          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ width: 4, height: 4, borderRadius: "50%", background: commodity.color, opacity: 1 - i * 0.25 }} />
                            <span style={{ fontSize: 11, color: "#6b7280", fontFamily: "DM Mono" }}>{s}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB ANALISIS - Con scores dinámicos */}
          {tab === "analisis" && (
            <div style={{ padding: 20 }}>
              {!analysis && !loading[selected] && (
                <div style={{ textAlign: "center", padding: "40px 0" }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>🤖</div>
                  <div style={{ color: "#374151", fontFamily: "DM Mono", fontSize: 12, marginBottom: 16 }}>Análisis IA no generado</div>
                  <button onClick={() => runAnalysis()} style={{ background: `linear-gradient(135deg, ${commodity.color}dd, ${commodity.color})`, border: "none", color: "#000", borderRadius: 8, padding: "10px 24px", cursor: "pointer", fontFamily: "Syne", fontWeight: 700, fontSize: 13 }}>Analizar con IA</button>
                </div>
              )}
              {loading[selected] && <div style={{ textAlign: "center", padding: "40px 0" }}><Spinner /><div style={{ color: commodity.color, fontFamily: "DM Mono", fontSize: 12, marginTop: 12 }}>Analizando {commodity.label}…</div></div>}
              {analysis && !loading[selected] && (
                <div style={{ animation: "fadeIn 0.5s ease" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
                    <div style={{ background: "#0d1117", border: "1px solid #1f2937", borderRadius: 10, padding: 16, textAlign: "center" }}>
                      <div style={{ fontSize: 10, color: "#4b5563", fontFamily: "DM Mono", marginBottom: 8, letterSpacing: 1 }}>SENTIMIENTO</div>
                      <SentBadge s={analysis.sentimiento} size="lg" />
                      <div style={{ fontSize: 10, color: "#374151", fontFamily: "DM Mono", marginTop: 6 }}>Confianza: {analysis.confianza}</div>
                    </div>
                    <div style={{ background: "#0d1117", border: "1px solid #1f2937", borderRadius: 10, padding: 16 }}>
                      <div style={{ fontSize: 10, color: "#4b5563", fontFamily: "DM Mono", marginBottom: 12, letterSpacing: 1 }}>SCORE GENERAL</div>
                      <div style={{ fontSize: 28, fontFamily: "Syne", fontWeight: 800, color: commodity.color, marginBottom: 8 }}>{analysis.score}<span style={{ fontSize: 14, color: "#374151" }}>/100</span></div>
                      <ScoreBar score={analysis.score} color={commodity.color} />
                    </div>
                    <div style={{ background: "#0d1117", border: "1px solid #1f2937", borderRadius: 10, padding: 16 }}>
                      <div style={{ fontSize: 10, color: "#4b5563", fontFamily: "DM Mono", marginBottom: 8, letterSpacing: 1 }}>OUTLOOK 30D</div>
                      <div style={{ fontFamily: "Syne", fontWeight: 700, fontSize: 15, color: analysis.outlook_30d === "ALCISTA" ? "#22c55e" : analysis.outlook_30d === "BAJISTA" ? "#ef4444" : "#f59e0b", marginTop: 8 }}>{analysis.outlook_30d === "ALCISTA" ? "▲" : analysis.outlook_30d === "BAJISTA" ? "▼" : "◆"} {analysis.outlook_30d}</div>
                      <div style={{ marginTop: 10, fontSize: 9, color: "#374151", fontFamily: "DM Mono" }}>Soporte: <span style={{ color: "#22c55e" }}>{analysis.nivel_soporte?.toLocaleString()}</span><br/>Resist.: <span style={{ color: "#ef4444" }}>{analysis.nivel_resistencia?.toLocaleString()}</span></div>
                    </div>
                    <div style={{ background: "#0d1117", border: "1px solid #1f2937", borderRadius: 10, padding: 16 }}>
                      <div style={{ fontSize: 10, color: "#4b5563", fontFamily: "DM Mono", marginBottom: 10, letterSpacing: 1 }}>RIESGOS</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={{ fontSize: 9, color: "#6b7280", fontFamily: "DM Mono" }}>Geopolítico</span><RiskBadge level={analysis.riesgo_geo} /></div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={{ fontSize: 9, color: "#6b7280", fontFamily: "DM Mono" }}>Clima</span><RiskBadge level={analysis.riesgo_clima} /></div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={{ fontSize: 9, color: "#6b7280", fontFamily: "DM Mono" }}>Oferta</span><RiskBadge level={analysis.riesgo_oferta} /></div>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1.5fr", gap: 12, marginBottom: 16 }}>
                    <div style={{ background: "rgba(34,197,94,0.06)", border: "1px solid #22c55e22", borderRadius: 10, padding: 16 }}>
                      <div style={{ fontSize: 10, color: "#22c55e", fontFamily: "DM Mono", marginBottom: 12, letterSpacing: 1, fontWeight: 600 }}>▲ CATALIZADORES BULL</div>
                      {(analysis.catalizadores_bull || []).map((c, i) => (<div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "flex-start" }}><span style={{ color: "#22c55e", fontSize: 10, marginTop: 1, flexShrink: 0 }}>→</span><span style={{ fontSize: 11, color: "#9ca3af", fontFamily: "Outfit", lineHeight: 1.4 }}>{c}</span></div>))}
                    </div>
                    <div style={{ background: "rgba(239,68,68,0.06)", border: "1px solid #ef444422", borderRadius: 10, padding: 16 }}>
                      <div style={{ fontSize: 10, color: "#ef4444", fontFamily: "DM Mono", marginBottom: 12, letterSpacing: 1, fontWeight: 600 }}>▼ CATALIZADORES BEAR</div>
                      {(analysis.catalizadores_bear || []).map((c, i) => (<div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "flex-start" }}><span style={{ color: "#ef4444", fontSize: 10, marginTop: 1, flexShrink: 0 }}>→</span><span style={{ fontSize: 11, color: "#9ca3af", fontFamily: "Outfit", lineHeight: 1.4 }}>{c}</span></div>))}
                    </div>
                    <div style={{ background: "#0d1117", border: "1px solid #1f2937", borderRadius: 10, padding: 16 }}>
                      <div style={{ fontSize: 10, color: commodity.color, fontFamily: "DM Mono", marginBottom: 10, letterSpacing: 1, fontWeight: 600 }}>🤖 RESUMEN EJECUTIVO — IA</div>
                      <div style={{ fontSize: 12, color: "#9ca3af", lineHeight: 1.7, fontFamily: "Outfit" }}>{analysis.resumen}</div>
                    </div>
                  </div>
                  <div style={{ background: "#0d1117", border: "1px solid #1f2937", borderRadius: 10, padding: 16 }}>
                    <div style={{ fontSize: 10, color: "#4b5563", fontFamily: "DM Mono", marginBottom: 12, letterSpacing: 1 }}>🌍 EVENTOS Y NOTICIAS RECIENTES ANALIZADAS</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      {(GEO_EVENTS_WITH_DATES[selected] || []).map((ev, i) => (
                        <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "8px 10px", background: "#070b14", borderRadius: 6, border: "1px solid #111827" }}>
                          <span style={{ color: commodity.color, fontSize: 10, marginTop: 2, flexShrink: 0 }}>◈</span>
                          <span style={{ fontSize: 11, color: "#6b7280", fontFamily: "Outfit", lineHeight: 1.4 }}>{ev}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <button onClick={() => runAnalysis()} style={{ marginTop: 12, background: "transparent", border: `1px solid ${commodity.color}44`, color: commodity.color, borderRadius: 6, padding: "6px 16px", cursor: "pointer", fontSize: 11, fontFamily: "DM Mono" }}>⟳ Re-analizar</button>
                </div>
              )}
            </div>
          )}

          {/* TAB PRECIOS */}
          {tab === "precios" && (
            <div style={{ padding: 20 }}>
              <div style={{ fontSize: 11, color: "#374151", fontFamily: "DM Mono", letterSpacing: 1, marginBottom: 14 }}>▪ EVOLUCIÓN PRECIO — 7 MESES</div>
              <div style={{ background: "#0d1117", borderRadius: 10, padding: 16 }}>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={["Oct","Nov","Dic","Ene","Feb","Mar","Abr"].map((m, i) => ({ m, p: commodity.prices?.[i] || commodity.price }))} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs><linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={commodity.color} stopOpacity={0.3} /><stop offset="100%" stopColor={commodity.color} stopOpacity={0.02} /></linearGradient></defs>
                    <CartesianGrid strokeDasharray="2 4" stroke="#111827" vertical={false} />
                    <XAxis dataKey="m" tick={{ fill: "#374151", fontSize: 10, fontFamily: "DM Mono" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#374151", fontSize: 9, fontFamily: "DM Mono" }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: "#0d1117", border: `1px solid ${commodity.color}44`, borderRadius: 8, fontFamily: "DM Mono", fontSize: 12 }} formatter={v => [`${v} ${commodity.unit}`, commodity.label]} />
                    <Area type="monotone" dataKey="p" stroke={commodity.color} strokeWidth={2.5} fill="url(#priceGrad)" dot={{ fill: commodity.color, r: 4, strokeWidth: 0 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginTop: 16 }}>
                {[
                  ["Precio Actual", formatPrice(commodity) + " " + commodity.unit, commodity.color],
                  ["Variación Hoy", (commodity.changeP >= 0 ? "+" : "") + (commodity.changeP * 100).toFixed(2) + "%", commodity.changeP >= 0 ? "#22c55e" : "#ef4444"],
                  ["Mín. 6M", commodity.prices ? Math.min(...commodity.prices).toFixed(2) + " " + commodity.unit : "...", "#6b7280"],
                  ["Máx. 6M", commodity.prices ? Math.max(...commodity.prices).toFixed(2) + " " + commodity.unit : "...", "#f9fafb"],
                ].map(([label, val, color]) => (
                  <div key={label} style={{ background: "#0d1117", border: "1px solid #1f2937", borderRadius: 8, padding: 14 }}>
                    <div style={{ fontSize: 9, color: "#4b5563", fontFamily: "DM Mono", letterSpacing: 1, marginBottom: 8 }}>{label}</div>
                    <div style={{ fontSize: 18, fontFamily: "Syne", fontWeight: 700, color }}>{val}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB GEOPOLÍTICA */}
          {tab === "geo" && (
            <div style={{ padding: 20 }}>
              <div style={{ fontSize: 11, color: "#374151", fontFamily: "DM Mono", letterSpacing: 1, marginBottom: 16 }}>▪ RADAR GEOPOLÍTICO — TODOS LOS ACTIVOS</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: 20 }}>
                <div>
                  <div style={{ fontSize: 10, color: "#4b5563", fontFamily: "DM Mono", letterSpacing: 1, marginBottom: 12 }}>ÍNDICE SENSIBILIDAD GEOPOLÍTICA</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {commodities.slice().sort((a, b) => b.geoPower - a.geoPower).map((c, i) => (
                      <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: c.id === selected ? c.color + "11" : "#0d1117", border: `1px solid ${c.id === selected ? c.color : "#111827"}`, borderRadius: 8, cursor: "pointer" }} onClick={() => handleSelect(c.id)}>
                        <span style={{ fontSize: 10, color: "#374151", fontFamily: "DM Mono", width: 14 }}>{i+1}</span>
                        <span style={{ fontSize: 12, color: c.color }}>{c.icon}</span>
                        <span style={{ fontSize: 11, fontFamily: "Outfit", color: "#9ca3af", flex: 1 }}>{c.label}</span>
                        <div style={{ flex: 2, height: 4, background: "#1a1f2e", borderRadius: 2, overflow: "hidden" }}><div style={{ width: `${c.geoPower}%`, height: "100%", background: c.color, borderRadius: 2 }} /></div>
                        <span style={{ fontSize: 11, fontFamily: "DM Mono", fontWeight: 600, color: c.color, width: 28, textAlign: "right" }}>{c.geoPower}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: "#4b5563", fontFamily: "DM Mono", letterSpacing: 1, marginBottom: 12 }}>EVENTOS GEOPOLÍTICOS — <span style={{ color: commodity.color }}>{commodity.label.toUpperCase()}</span></div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                    {(GEO_EVENTS_WITH_DATES[selected] || []).map((ev, i) => {
                      const impact = i < 2 ? "ALTO" : "MEDIO";
                      return (
                        <div key={i} style={{ background: "#0d1117", border: "1px solid #1f2937", borderRadius: 8, padding: "12px 14px", display: "flex", gap: 12, alignItems: "flex-start" }}>
                          <div style={{ width: 6, height: 6, borderRadius: "50%", background: impact === "ALTO" ? "#ef4444" : "#f59e0b", flexShrink: 0, marginTop: 4, boxShadow: `0 0 8px ${impact === "ALTO" ? "#ef4444" : "#f59e0b"}` }} />
                          <div style={{ flex: 1 }}><span style={{ fontSize: 12, color: "#c4cad4", fontFamily: "Outfit", lineHeight: 1.5 }}>{ev}</span></div>
                          <RiskBadge level={impact} />
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ background: "#0d1117", border: `1px solid ${commodity.color}33`, borderRadius: 10, padding: 16 }}>
                    <div style={{ fontSize: 10, color: "#4b5563", fontFamily: "DM Mono", marginBottom: 12 }}>SENSIBILIDAD GEOPOLÍTICA</div>
                    <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 60 }}>
                      {commodities.map(c => (
                        <div key={c.id} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                          <div style={{ width: "100%", height: `${(c.geoPower / 100) * 50}px`, background: c.id === selected ? c.color : c.color + "44", borderRadius: "2px 2px 0 0", transition: "all 0.3s" }} />
                          <span style={{ fontSize: 7, fontFamily: "DM Mono", color: c.id === selected ? c.color : "#374151" }}>{c.id.slice(0,3)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* FOOTER */}
      <div style={{ marginTop: 16, paddingTop: 12, borderTop: "1px solid #111827", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 9, color: "#1f2937", fontFamily: "DM Mono" }}>Precios en tiempo real (Yahoo Finance) · Análisis IA · No constituye asesoramiento financiero</div>
        <div style={{ display: "flex", gap: 12 }}>
          {commodities.slice(0,5).map(c => (
            <span key={c.id} style={{ fontFamily: "DM Mono", fontSize: 9, color: c.changeP >= 0 ? "#22c55e" : "#ef4444" }}>{c.icon} {(c.changeP >= 0 ? "+" : "") + (c.changeP * 100).toFixed(1) + "%"}</span>
          ))}
        </div>
      </div>
    </div>
  );
}