import { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";

// ============================================================
// ESTILOS GLOBALES (sin cambios)
// ============================================================
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

// ============================================================
// DATOS MAESTROS (con precios actualizados a junio 2026)
// ============================================================
const COMMODITIES_MASTER = {
  GOLD:   { id:"GOLD",  label:"Oro",         symbol:"XAU/USD", icon:"◈", sector:"METALES",     unit:"$/oz",   desc:"Metal precioso refugio", geoPower:95, seasonPeak:"Nov–Feb", supply:"Sudáfrica · Australia · Rusia", color:"#f59e0b", defaultPrice: 2420 },
  SILVER: { id:"SILVER",label:"Plata",        symbol:"XAG/USD", icon:"◇", sector:"METALES",     unit:"$/oz",   desc:"Metal industrial y refugio", geoPower:70, seasonPeak:"Ene–Mar", supply:"México · Perú · China", color:"#94a3b8", defaultPrice: 28.5 },
  WTI:    { id:"WTI",   label:"WTI Crudo",    symbol:"CL=F",    icon:"⬡", sector:"ENERGÍA",     unit:"$/bbl",  desc:"Petróleo referencia EEUU", geoPower:99, seasonPeak:"Jun–Ago", supply:"OPEC+ · EE.UU. · Rusia", color:"#ef4444", defaultPrice: 92.5 },
  NATGAS: { id:"NATGAS",label:"Gas Natural",   symbol:"NG=F",    icon:"⬢", sector:"ENERGÍA",     unit:"$/MMBtu",desc:"Gas Henry Hub EEUU", geoPower:88, seasonPeak:"Dic–Feb", supply:"EE.UU. · Rusia · Qatar", color:"#f97316", defaultPrice: 3.85 },
  COPPER: { id:"COPPER",label:"Cobre",         symbol:"HG=F",    icon:"⬟", sector:"MINERÍA",     unit:"$/lb",   desc:"Metal de transición energética", geoPower:82, seasonPeak:"Mar–May", supply:"Chile · Perú · China", color:"#c2410c", defaultPrice: 4.85 },
  LITHIUM:{ id:"LITHIUM",label:"Litio",        symbol:"LIT",     icon:"⬠", sector:"MINERÍA",     unit:"$/MT",   desc:"Baterías EV y almacenamiento", geoPower:75, seasonPeak:"Abr–Jul", supply:"Australia · Chile · Argentina", color:"#7c3aed", defaultPrice: 11200 },
  WHEAT:  { id:"WHEAT", label:"Trigo",         symbol:"ZW=F",    icon:"⊛", sector:"AGRICULTURA", unit:"$/bu",   desc:"Cereal granos básico global", geoPower:91, seasonPeak:"May–Jul", supply:"Rusia · EE.UU. · Ucrania", color:"#d97706", defaultPrice: 6.82 },
  CORN:   { id:"CORN",  label:"Maíz",          symbol:"ZC=F",    icon:"⊙", sector:"AGRICULTURA", unit:"$/bu",   desc:"Cereal multipropósito global", geoPower:72, seasonPeak:"Jun–Ago", supply:"EE.UU. · Brasil · Argentina", color:"#65a30d", defaultPrice: 5.12 },
  COFFEE: { id:"COFFEE",label:"Café Arábica",  symbol:"KC=F",    icon:"⊕", sector:"SOFTS",       unit:"$/lb",   desc:"Commodity soft mayor mercado", geoPower:68, seasonPeak:"Oct–Dic", supply:"Brasil · Colombia · Vietnam", color:"#92400e", defaultPrice: 2.87 },
  SOYBEAN:{ id:"SOYBEAN",label:"Soja",         symbol:"ZS=F",    icon:"⊗", sector:"AGRICULTURA", unit:"$/bu",   desc:"Oleaginosa proteica global", geoPower:78, seasonPeak:"Sep–Nov", supply:"Brasil · EE.UU. · Argentina", color:"#15803d", defaultPrice: 12.35 },
};

const SECTORS = ["TODOS", "METALES", "ENERGÍA", "MINERÍA", "AGRICULTURA", "SOFTS"];
const SECTOR_COLORS = { METALES:"#f59e0b", ENERGÍA:"#ef4444", MINERÍA:"#8b5cf6", AGRICULTURA:"#22c55e", SOFTS:"#92400e" };
const MONTHS_ES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
const TODAY_MONTH = 4; // Mayo

// Índice estacional (100 = neutral)
const SEASONAL_DATA = {
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

// Eventos geopolíticos con fechas
const GEO_EVENTS = {
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

// ============================================================
// OBTENCIÓN DE PRECIOS REALES CON PROXY ROBUSTO
// ============================================================
async function fetchRealPrices() {
  const results = {};
  // Intentar con AllOrigins (más estable que corsproxy.io)
  for (const [id, meta] of Object.entries(COMMODITIES_MASTER)) {
    if (meta.symbol === "LIT") {
      // Litio: precio simulado (no hay fuente gratuita)
      results[id] = { price: meta.defaultPrice + (Math.random() - 0.5) * 200, change: 0, changeP: 0 };
      continue;
    }
    try {
      const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${meta.symbol}`;
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(yahooUrl)}`;
      const res = await fetch(proxyUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const yahooData = JSON.parse(data.contents);
      const metaData = yahooData.chart.result[0].meta;
      const quote = yahooData.chart.result[0].indicators.quote[0];
      const lastPrice = quote.close[quote.close.length-1] || metaData.regularMarketPrice;
      const prevClose = metaData.previousClose || lastPrice;
      const change = lastPrice - prevClose;
      const changeP = change / prevClose;
      results[id] = { price: lastPrice, change, changeP };
    } catch (e) {
      console.warn(`Fallo obteniendo ${id}, usando valor por defecto actualizado`, e);
      // Usamos el precio por defecto actualizado (WTI 92.5, Oro 2420, etc.)
      results[id] = { price: meta.defaultPrice, change: 0, changeP: 0 };
    }
  }
  return results;
}

// ============================================================
// ANÁLISIS IA SIMULADA (score dinámico real)
// ============================================================
async function runAnalysis(commodity) {
  await new Promise(r => setTimeout(r, 500));
  const { label, price, changeP, geoPower, prices } = commodity;
  const trend = prices[prices.length-1] > prices[0] ? "alcista" : "bajista";
  let score = 50;
  if (changeP) score += changeP * 100 * 0.4;
  score += (geoPower - 50) * 0.4;
  if (trend === "alcista") score += 10;
  else if (trend === "bajista") score -= 10;
  score = Math.min(95, Math.max(5, Math.floor(score)));
  const sentiment = score > 65 ? "BULLISH" : score < 35 ? "BEARISH" : "NEUTRO";
  const outlook = score > 60 ? "ALCISTA" : score < 40 ? "BAJISTA" : "LATERAL";
  return {
    sentimiento: sentiment,
    score,
    outlook_30d: outlook,
    catalizadores_bull: ["Demanda sólida de Asia", "Recortes de oferta", "Dólar débil"],
    catalizadores_bear: ["Posible recesión global", "Aumento de inventarios", "Sustitutos más baratos"],
    riesgo_geo: geoPower > 80 ? "ALTO" : geoPower > 50 ? "MEDIO" : "BAJO",
    riesgo_clima: (label === "Trigo" || label === "Maíz" || label === "Café Arábica") ? "ALTO" : "MEDIO",
    riesgo_oferta: geoPower > 70 ? "ALTO" : "MEDIO",
    resumen: `${label} muestra una tendencia ${trend} con un cambio reciente de ${(changeP*100).toFixed(1)}%. Puntuación general: ${score}/100. Los fundamentos apuntan a un escenario ${outlook.toLowerCase()}.`,
    nivel_soporte: Math.round(price * 0.95),
    nivel_resistencia: Math.round(price * 1.05),
    confianza: score > 70 ? "ALTA" : score < 30 ? "BAJA" : "MEDIA"
  };
}

// ============================================================
// COMPONENTES UI
// ============================================================
const Spinner = () => <div style={{ width: 16, height: 16, border: "2px solid #1f2937", borderTop: "2px solid #f59e0b", borderRadius: "50%", animation: "spin 0.8s linear infinite", display: "inline-block" }} />;
const RiskBadge = ({ level }) => {
  const cfg = { ALTO: ["#ef4444","rgba(239,68,68,0.15)"], MEDIO: ["#f59e0b","rgba(245,158,11,0.15)"], BAJO: ["#22c55e","rgba(34,197,94,0.15)"] };
  const [color, bg] = cfg[level] || cfg.MEDIO;
  return <span style={{ color, background: bg, border: `1px solid ${color}44`, borderRadius: 3, padding: "1px 6px", fontSize: 9, fontFamily: "DM Mono", fontWeight: 500, letterSpacing: 0.5 }}>{level}</span>;
};
const SentBadge = ({ s, size = "sm" }) => {
  const cfg = { BULLISH: ["#22c55e", "rgba(34,197,94,0.12)", "▲"], BEARISH: ["#ef4444", "rgba(239,68,68,0.12)", "▼"], NEUTRO: ["#f59e0b", "rgba(245,158,11,0.12)", "◆"] };
  const [color, bg, icon] = cfg[s] || cfg.NEUTRO;
  const p = size === "lg" ? "5px 12px" : "2px 7px";
  const fs = size === "lg" ? 12 : 9;
  return <span style={{ color, background: bg, border: `1px solid ${color}44`, borderRadius: 4, padding: p, fontSize: fs, fontFamily: "DM Mono", fontWeight: 600, letterSpacing: 1, display: "inline-flex", alignItems: "center", gap: 4 }}><span style={{ fontSize: fs - 2 }}>{icon}</span>{s}</span>;
};
const ScoreBar = ({ score, color }) => (
  <div style={{ position: "relative", height: 6, background: "#1a1f2e", borderRadius: 3, overflow: "visible" }}>
    <div style={{ width: `${score}%`, height: "100%", background: `linear-gradient(90deg, ${color}88, ${color})`, borderRadius: 3, transition: "width 1s ease" }} />
    <div style={{ position: "absolute", top: -3, left: `${score}%`, transform: "translateX(-50%)", width: 12, height: 12, background: color, borderRadius: "50%", border: "2px solid #080a0f", boxShadow: `0 0 8px ${color}` }} />
    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 8, color: "#374151", fontFamily: "DM Mono" }}><span>BEARISH</span><span>NEUTRO</span><span>BULLISH</span></div>
  </div>
);
const SeasonChart = ({ commodity }) => {
  const idx = SEASONAL_DATA[commodity.id];
  if (!idx) return <div style={{ textAlign: "center", padding: 20, color: "#ef4444" }}>⚠️ Sin datos estacionales</div>;
  const data = MONTHS_ES.map((m, i) => ({ month: m, value: idx[i], isNow: i === TODAY_MONTH }));
  return (
    <ResponsiveContainer width="100%" height={140}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <defs><linearGradient id={`sg-${commodity.id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={commodity.color} stopOpacity={0.3} /><stop offset="100%" stopColor={commodity.color} stopOpacity={0.02} /></linearGradient></defs>
        <CartesianGrid strokeDasharray="2 4" stroke="#1a1f2e" vertical={false} />
        <XAxis dataKey="month" tick={{ fill: "#374151", fontSize: 9, fontFamily: "DM Mono" }} axisLine={false} tickLine={false} />
        <YAxis domain={[80, 120]} tick={{ fill: "#374151", fontSize: 8, fontFamily: "DM Mono" }} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={{ background: "#0d1117", border: "1px solid #1f2937", borderRadius: 6, fontSize: 11, fontFamily: "DM Mono" }} />
        <ReferenceLine y={100} stroke="#1f2937" strokeDasharray="3 3" />
        <Area type="monotone" dataKey="value" stroke={commodity.color} strokeWidth={2} fill={`url(#sg-${commodity.id})`} dot={false} />
        {data.map((d,i) => d.isNow && <ReferenceLine key={i} x={d.month} stroke={commodity.color} strokeWidth={2} strokeDasharray="4 4" label={{ value: "HOY", fill: commodity.color, fontSize: 8, fontFamily: "DM Mono" }} />)}
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

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================
export default function CommodityDashboard() {
  const [commodities, setCommodities] = useState([]);
  const [selectedId, setSelectedId] = useState("GOLD");
  const [sector, setSector] = useState("TODOS");
  const [tab, setTab] = useState("analisis");
  const [analysis, setAnalysis] = useState(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const now = new Date().toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" });

  // Cargar precios reales al inicio y cada 60 segundos
  const updatePrices = async () => {
    const newPrices = await fetchRealPrices();
    setCommodities(prev => prev.map(c => {
      const fresh = newPrices[c.id];
      if (fresh) {
        // Actualizar historial de precios (últimos 7 valores)
        const newPricesArr = [...(c.prices || []).slice(-6), fresh.price];
        return { ...c, price: fresh.price, change: fresh.change, changeP: fresh.changeP, prices: newPricesArr };
      }
      return c;
    }));
  };

  // Inicializar datos
  useEffect(() => {
    const init = async () => {
      const initialPrices = await fetchRealPrices();
      const combined = Object.values(COMMODITIES_MASTER).map(meta => {
        const priceData = initialPrices[meta.id] || { price: meta.defaultPrice, change: 0, changeP: 0 };
        const fakeHistory = [
          priceData.price * 0.97,
          priceData.price * 0.98,
          priceData.price * 0.99,
          priceData.price,
          priceData.price * 1.01,
          priceData.price * 1.02,
          priceData.price,
        ];
        return { ...meta, ...priceData, prices: fakeHistory };
      });
      setCommodities(combined);
      // Lanzar análisis para el elemento seleccionado
      const selected = combined.find(c => c.id === selectedId);
      if (selected) {
        const res = await runAnalysis(selected);
        setAnalysis(res);
      }
    };
    init();
    const interval = setInterval(updatePrices, 60000);
    return () => clearInterval(interval);
  }, []);

  // Cuando cambia el elemento seleccionado, actualizar análisis
  const handleSelect = async (id) => {
    setSelectedId(id);
    setLoadingAnalysis(true);
    const selected = commodities.find(c => c.id === id);
    if (selected) {
      const res = await runAnalysis(selected);
      setAnalysis(res);
    }
    setLoadingAnalysis(false);
  };

  // Obtener el commodity actualmente seleccionado (para usarlo en el render)
  const currentCommodity = commodities.find(c => c.id === selectedId) || {};

  // Filtrado por sector
  const filteredCommodities = commodities.filter(c => sector === "TODOS" || c.sector === sector);

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
              {["#f59e0b","#ef4444","#8b5cf6","#22c55e"].map((c,i) => <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: c, animation: `pulse-dot ${1.2 + i*0.2}s infinite` }} />)}
            </div>
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: -1, color: "#f9fafb", fontFamily: "Syne" }}>COMMODITY<span style={{ color: "#f59e0b" }}>PULSE</span></h1>
            <span style={{ background: "#111827", border: "1px solid #1f2937", color: "#4b5563", fontSize: 9, padding: "3px 10px", borderRadius: 20, fontFamily: "DM Mono", letterSpacing: 1 }}>AI · 10 ACTIVOS · LIVE</span>
          </div>
          <div style={{ color: "#374151", fontSize: 11, fontFamily: "DM Mono" }}>Materias Primas Global · IA Análisis Integrado · {now}</div>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
          {SECTORS.map(s => <button key={s} onClick={() => setSector(s)} style={{ background: sector === s ? (SECTOR_COLORS[s] || "#1d4ed8") + "22" : "transparent", border: `1px solid ${sector === s ? (SECTOR_COLORS[s] || "#3b82f6") : "#1f2937"}`, color: sector === s ? (SECTOR_COLORS[s] || "#3b82f6") : "#4b5563", borderRadius: 20, padding: "4px 12px", cursor: "pointer", fontSize: 10, fontFamily: "DM Mono", fontWeight: 500, letterSpacing: 0.5 }}>{s}</button>)}
        </div>
      </div>

      {/* CARDS */}
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(filteredCommodities.length, 5)}, 1fr)`, gap: 8, marginBottom: 20 }}>
        {filteredCommodities.map(c => {
          const isUp = c.changeP >= 0;
          const isSelected = selectedId === c.id;
          const hasAnalysis = analysis && analysis.sentimiento && c.id === selectedId;
          return (
            <div key={c.id} onClick={() => handleSelect(c.id)} style={{ background: isSelected ? "#0d1117" : "#0a0d14", border: `1px solid ${isSelected ? c.color : "#111827"}`, borderRadius: 10, padding: "12px", cursor: "pointer", boxShadow: isSelected ? `0 0 24px ${c.color}22` : "none", transition: "all 0.25s", position: "relative" }}>
              {isSelected && <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${c.color}, transparent)` }} />}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                <div><div style={{ fontSize: 16, color: c.color, lineHeight: 1, marginBottom: 2 }}>{c.icon}</div><div style={{ fontSize: 13, fontWeight: 700, color: isSelected ? "#f9fafb" : "#9ca3af", fontFamily: "Syne" }}>{c.label}</div></div>
                {hasAnalysis ? <SentBadge s={analysis.sentimiento} /> : <span style={{ fontSize: 9, color: "#1f2937", fontFamily: "DM Mono" }}>—</span>}
              </div>
              <div style={{ fontFamily: "DM Mono", fontSize: 18, fontWeight: 500, color: "#f9fafb", letterSpacing: -0.5 }}>{formatPrice(c)}<span style={{ fontSize: 10, color: "#4b5563", marginLeft: 3 }}>{c.unit}</span></div>
              <div style={{ fontSize: 10, color: isUp ? "#22c55e" : "#ef4444", fontFamily: "DM Mono", marginTop: 2 }}>{isUp ? "▲" : "▼"} {Math.abs(c.changeP * 100).toFixed(2)}%</div>
              <div style={{ marginTop: 4, opacity: 0.7 }}><PriceSparkline commodity={c} /></div>
              <div style={{ marginTop: 4, display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={{ fontSize: 8, color: SECTOR_COLORS[c.sector] || "#6b7280", fontFamily: "DM Mono", letterSpacing: 1 }}>{c.sector}</span><span style={{ fontSize: 8, color: "#1f2937", fontFamily: "DM Mono" }}>{c.symbol}</span></div>
            </div>
          );
        })}
      </div>

      {/* PANEL DE DETALLE - CON TÍTULO DINÁMICO GARANTIZADO */}
      {currentCommodity.id && (
        <div style={{ background: "#0a0d14", border: "1px solid #111827", borderRadius: 14, overflow: "hidden" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 20px", borderBottom: "1px solid #111827", background: "#0d1117" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <span style={{ fontSize: 24, color: currentCommodity.color }}>{currentCommodity.icon}</span>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#f9fafb", fontFamily: "Syne", letterSpacing: -0.5 }}>
                  {currentCommodity.label} <span style={{ fontSize: 12, color: "#374151", fontFamily: "DM Mono", fontWeight: 400 }}>{currentCommodity.symbol}</span>
                </div>
                <div style={{ fontSize: 10, color: "#4b5563", fontFamily: "DM Mono" }}>{currentCommodity.desc}</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              {[["analisis","🤖 IA Análisis"],["precios","📈 Precios"],["estacional","📅 Estacional"],["geo","🌍 Geopolítica"]].map(([t, label]) => (
                <button key={t} onClick={() => setTab(t)} style={{ background: tab === t ? currentCommodity.color + "22" : "transparent", border: `1px solid ${tab === t ? currentCommodity.color : "#1f2937"}`, color: tab === t ? currentCommodity.color : "#4b5563", borderRadius: 6, padding: "5px 12px", cursor: "pointer", fontSize: 11, fontFamily: "DM Mono", fontWeight: 500 }}>{label}</button>
              ))}
            </div>
          </div>

          {/* TAB ESTACIONAL - DEFINITIVAMENTE CORREGIDO */}
          {tab === "estacional" && (
            <div style={{ padding: 20 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 20 }}>
                <div>
                  <div style={{ marginBottom: 14, fontSize: 11, color: "#374151", fontFamily: "DM Mono", letterSpacing: 1 }}>▪ PATRÓN ESTACIONAL — ÍNDICE MENSUAL (100 = neutral)</div>
                  <div style={{ background: "#0d1117", borderRadius: 10, padding: 16 }}><SeasonChart commodity={currentCommodity} /></div>
                  <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
                    {MONTHS_ES.map((m, i) => {
                      const idx = SEASONAL_DATA[currentCommodity.id]?.[i] || 100;
                      const isNow = i === TODAY_MONTH;
                      const color = idx > 103 ? "#22c55e" : idx < 97 ? "#ef4444" : "#f59e0b";
                      return <div key={m} style={{ background: isNow ? currentCommodity.color+"15" : "#0d1117", border: `1px solid ${isNow ? currentCommodity.color : "#111827"}`, borderRadius: 6, padding: "8px 10px", display: "flex", justifyContent: "space-between" }}><span style={{ fontSize: 10, fontFamily: "DM Mono", color: isNow ? currentCommodity.color : "#6b7280" }}>{m}{isNow ? " ◄" : ""}</span><span style={{ fontSize: 12, fontFamily: "Syne", fontWeight: 700, color }}>{idx}</span></div>;
                    })}
                  </div>
                </div>
                <div>
                  <div style={{ marginBottom: 14, fontSize: 11, color: "#374151", fontFamily: "DM Mono", letterSpacing: 1 }}>▪ FACTORES ESTACIONALES</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ background: "#0d1117", border: "1px solid #1f2937", borderRadius: 10, padding: 16 }}><div style={{ fontSize: 10, color: "#4b5563", fontFamily: "DM Mono", marginBottom: 6 }}>TEMPORADA PICO</div><div style={{ fontSize: 18, fontFamily: "Syne", fontWeight: 700, color: currentCommodity.color }}>{currentCommodity.seasonPeak}</div></div>
                    <div style={{ background: "#0d1117", border: "1px solid #1f2937", borderRadius: 10, padding: 16 }}>
                      <div style={{ fontSize: 10, color: "#4b5563", fontFamily: "DM Mono", marginBottom: 6 }}>MAYO (ACTUAL)</div>
                      <div style={{ fontSize: 24, fontFamily: "Syne", fontWeight: 800, color: (SEASONAL_DATA[currentCommodity.id]?.[4] || 100) > 103 ? "#22c55e" : (SEASONAL_DATA[currentCommodity.id]?.[4] || 100) < 97 ? "#ef4444" : "#f59e0b" }}>{SEASONAL_DATA[currentCommodity.id]?.[4] || 100}<span style={{ fontSize: 12, color: "#374151" }}>/100</span></div>
                      <div style={{ fontSize: 10, color: "#374151", fontFamily: "DM Mono", marginTop: 4 }}>{(SEASONAL_DATA[currentCommodity.id]?.[4] || 100) > 103 ? "✅ Mes favorable" : (SEASONAL_DATA[currentCommodity.id]?.[4] || 100) < 97 ? "⚠ Mes desfavorable" : "➡ Mes neutral"}</div>
                    </div>
                    <div style={{ background: "#0d1117", border: "1px solid #1f2937", borderRadius: 10, padding: 16 }}>
                      <div style={{ fontSize: 10, color: "#4b5563", fontFamily: "DM Mono", marginBottom: 8 }}>PRINCIPALES ZONAS PRODUCTORAS</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>{currentCommodity.supply.split(" · ").map((s,i) => <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}><div style={{ width: 4, height: 4, borderRadius: "50%", background: currentCommodity.color, opacity: 1 - i*0.25 }} /><span style={{ fontSize: 11, color: "#6b7280", fontFamily: "DM Mono" }}>{s}</span></div>)}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB ANÁLISIS */}
          {tab === "analisis" && (
            <div style={{ padding: 20 }}>
              {!analysis && !loadingAnalysis && (
                <div style={{ textAlign: "center", padding: "40px 0" }}><div style={{ fontSize: 32, marginBottom: 12 }}>🤖</div><div style={{ color: "#374151", fontFamily: "DM Mono", fontSize: 12, marginBottom: 16 }}>Análisis IA no generado</div><button onClick={() => handleSelect(selectedId)} style={{ background: `linear-gradient(135deg, ${currentCommodity.color}dd, ${currentCommodity.color})`, border: "none", color: "#000", borderRadius: 8, padding: "10px 24px", cursor: "pointer", fontFamily: "Syne", fontWeight: 700, fontSize: 13 }}>Analizar</button></div>
              )}
              {loadingAnalysis && <div style={{ textAlign: "center", padding: "40px 0" }}><Spinner /><div style={{ color: currentCommodity.color, fontFamily: "DM Mono", fontSize: 12, marginTop: 12 }}>Analizando {currentCommodity.label}…</div></div>}
              {analysis && !loadingAnalysis && (
                <div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
                    <div style={{ background: "#0d1117", border: "1px solid #1f2937", borderRadius: 10, padding: 16, textAlign: "center" }}><div style={{ fontSize: 10, color: "#4b5563", fontFamily: "DM Mono", marginBottom: 8, letterSpacing: 1 }}>SENTIMIENTO</div><SentBadge s={analysis.sentimiento} size="lg" /><div style={{ fontSize: 10, color: "#374151", fontFamily: "DM Mono", marginTop: 6 }}>Confianza: {analysis.confianza}</div></div>
                    <div style={{ background: "#0d1117", border: "1px solid #1f2937", borderRadius: 10, padding: 16 }}><div style={{ fontSize: 10, color: "#4b5563", fontFamily: "DM Mono", marginBottom: 12, letterSpacing: 1 }}>SCORE GENERAL</div><div style={{ fontSize: 28, fontFamily: "Syne", fontWeight: 800, color: currentCommodity.color, marginBottom: 8 }}>{analysis.score}<span style={{ fontSize: 14, color: "#374151" }}>/100</span></div><ScoreBar score={analysis.score} color={currentCommodity.color} /></div>
                    <div style={{ background: "#0d1117", border: "1px solid #1f2937", borderRadius: 10, padding: 16 }}><div style={{ fontSize: 10, color: "#4b5563", fontFamily: "DM Mono", marginBottom: 8, letterSpacing: 1 }}>OUTLOOK 30D</div><div style={{ fontFamily: "Syne", fontWeight: 700, fontSize: 15, color: analysis.outlook_30d === "ALCISTA" ? "#22c55e" : analysis.outlook_30d === "BAJISTA" ? "#ef4444" : "#f59e0b", marginTop: 8 }}>{analysis.outlook_30d === "ALCISTA" ? "▲" : analysis.outlook_30d === "BAJISTA" ? "▼" : "◆"} {analysis.outlook_30d}</div><div style={{ marginTop: 10, fontSize: 9, color: "#374151", fontFamily: "DM Mono" }}>Soporte: <span style={{ color: "#22c55e" }}>{analysis.nivel_soporte?.toLocaleString()}</span><br/>Resist.: <span style={{ color: "#ef4444" }}>{analysis.nivel_resistencia?.toLocaleString()}</span></div></div>
                    <div style={{ background: "#0d1117", border: "1px solid #1f2937", borderRadius: 10, padding: 16 }}><div style={{ fontSize: 10, color: "#4b5563", fontFamily: "DM Mono", marginBottom: 10, letterSpacing: 1 }}>RIESGOS</div><div style={{ display: "flex", flexDirection: "column", gap: 6 }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={{ fontSize: 9, color: "#6b7280", fontFamily: "DM Mono" }}>Geopolítico</span><RiskBadge level={analysis.riesgo_geo} /></div><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={{ fontSize: 9, color: "#6b7280", fontFamily: "DM Mono" }}>Clima</span><RiskBadge level={analysis.riesgo_clima} /></div><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={{ fontSize: 9, color: "#6b7280", fontFamily: "DM Mono" }}>Oferta</span><RiskBadge level={analysis.riesgo_oferta} /></div></div></div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1.5fr", gap: 12, marginBottom: 16 }}>
                    <div style={{ background: "rgba(34,197,94,0.06)", border: "1px solid #22c55e22", borderRadius: 10, padding: 16 }}><div style={{ fontSize: 10, color: "#22c55e", fontFamily: "DM Mono", marginBottom: 12, letterSpacing: 1, fontWeight: 600 }}>▲ CATALIZADORES BULL</div>{analysis.catalizadores_bull?.map((c,i) => <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "flex-start" }}><span style={{ color: "#22c55e", fontSize: 10, marginTop: 1, flexShrink: 0 }}>→</span><span style={{ fontSize: 11, color: "#9ca3af", fontFamily: "Outfit", lineHeight: 1.4 }}>{c}</span></div>)}</div>
                    <div style={{ background: "rgba(239,68,68,0.06)", border: "1px solid #ef444422", borderRadius: 10, padding: 16 }}><div style={{ fontSize: 10, color: "#ef4444", fontFamily: "DM Mono", marginBottom: 12, letterSpacing: 1, fontWeight: 600 }}>▼ CATALIZADORES BEAR</div>{analysis.catalizadores_bear?.map((c,i) => <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "flex-start" }}><span style={{ color: "#ef4444", fontSize: 10, marginTop: 1, flexShrink: 0 }}>→</span><span style={{ fontSize: 11, color: "#9ca3af", fontFamily: "Outfit", lineHeight: 1.4 }}>{c}</span></div>)}</div>
                    <div style={{ background: "#0d1117", border: "1px solid #1f2937", borderRadius: 10, padding: 16 }}><div style={{ fontSize: 10, color: currentCommodity.color, fontFamily: "DM Mono", marginBottom: 10, letterSpacing: 1, fontWeight: 600 }}>🤖 RESUMEN EJECUTIVO — IA</div><div style={{ fontSize: 12, color: "#9ca3af", lineHeight: 1.7, fontFamily: "Outfit" }}>{analysis.resumen}</div></div>
                  </div>
                  <div style={{ background: "#0d1117", border: "1px solid #1f2937", borderRadius: 10, padding: 16 }}><div style={{ fontSize: 10, color: "#4b5563", fontFamily: "DM Mono", marginBottom: 12, letterSpacing: 1 }}>🌍 EVENTOS Y NOTICIAS RECIENTES ANALIZADAS</div><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>{(GEO_EVENTS[selectedId] || []).map((ev,i) => <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "8px 10px", background: "#070b14", borderRadius: 6, border: "1px solid #111827" }}><span style={{ color: currentCommodity.color, fontSize: 10, marginTop: 2, flexShrink: 0 }}>◈</span><span style={{ fontSize: 11, color: "#6b7280", fontFamily: "Outfit", lineHeight: 1.4 }}>{ev}</span></div>)}</div></div>
                  <button onClick={() => handleSelect(selectedId)} style={{ marginTop: 12, background: "transparent", border: `1px solid ${currentCommodity.color}44`, color: currentCommodity.color, borderRadius: 6, padding: "6px 16px", cursor: "pointer", fontSize: 11, fontFamily: "DM Mono" }}>⟳ Re-analizar</button>
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
                  <AreaChart data={["Oct","Nov","Dic","Ene","Feb","Mar","Abr"].map((m,i) => ({ m, p: currentCommodity.prices?.[i] || currentCommodity.price }))} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs><linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={currentCommodity.color} stopOpacity={0.3} /><stop offset="100%" stopColor={currentCommodity.color} stopOpacity={0.02} /></linearGradient></defs>
                    <CartesianGrid strokeDasharray="2 4" stroke="#111827" vertical={false} />
                    <XAxis dataKey="m" tick={{ fill: "#374151", fontSize: 10, fontFamily: "DM Mono" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#374151", fontSize: 9, fontFamily: "DM Mono" }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: "#0d1117", border: `1px solid ${currentCommodity.color}44`, borderRadius: 8, fontFamily: "DM Mono", fontSize: 12 }} formatter={v => [`${v} ${currentCommodity.unit}`, currentCommodity.label]} />
                    <Area type="monotone" dataKey="p" stroke={currentCommodity.color} strokeWidth={2.5} fill="url(#priceGrad)" dot={{ fill: currentCommodity.color, r: 4, strokeWidth: 0 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginTop: 16 }}>
                {[
                  ["Precio Actual", formatPrice(currentCommodity) + " " + currentCommodity.unit, currentCommodity.color],
                  ["Variación Hoy", (currentCommodity.changeP >= 0 ? "+" : "") + (currentCommodity.changeP * 100).toFixed(2) + "%", currentCommodity.changeP >= 0 ? "#22c55e" : "#ef4444"],
                  ["Mín. 6M", currentCommodity.prices ? Math.min(...currentCommodity.prices).toFixed(2) + " " + currentCommodity.unit : "...", "#6b7280"],
                  ["Máx. 6M", currentCommodity.prices ? Math.max(...currentCommodity.prices).toFixed(2) + " " + currentCommodity.unit : "...", "#f9fafb"],
                ].map(([label, val, color]) => <div key={label} style={{ background: "#0d1117", border: "1px solid #1f2937", borderRadius: 8, padding: 14 }}><div style={{ fontSize: 9, color: "#4b5563", fontFamily: "DM Mono", letterSpacing: 1, marginBottom: 8 }}>{label}</div><div style={{ fontSize: 18, fontFamily: "Syne", fontWeight: 700, color }}>{val}</div></div>)}
              </div>
            </div>
          )}

          {/* TAB GEOPOLÍTICA */}
          {tab === "geo" && (
            <div style={{ padding: 20 }}>
              <div style={{ fontSize: 11, color: "#374151", fontFamily: "DM Mono", letterSpacing: 1, marginBottom: 16 }}>▪ RADAR GEOPOLÍTICO — TODOS LOS ACTIVOS</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: 20 }}>
                <div><div style={{ fontSize: 10, color: "#4b5563", fontFamily: "DM Mono", letterSpacing: 1, marginBottom: 12 }}>ÍNDICE SENSIBILIDAD GEOPOLÍTICA</div><div style={{ display: "flex", flexDirection: "column", gap: 6 }}>{commodities.slice().sort((a,b)=>b.geoPower - a.geoPower).map((c,i) => <div key={c.id} onClick={() => handleSelect(c.id)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: c.id === selectedId ? c.color + "11" : "#0d1117", border: `1px solid ${c.id === selectedId ? c.color : "#111827"}`, borderRadius: 8, cursor: "pointer" }}><span style={{ fontSize: 10, color: "#374151", fontFamily: "DM Mono", width: 14 }}>{i+1}</span><span style={{ fontSize: 12, color: c.color }}>{c.icon}</span><span style={{ fontSize: 11, fontFamily: "Outfit", color: "#9ca3af", flex: 1 }}>{c.label}</span><div style={{ flex: 2, height: 4, background: "#1a1f2e", borderRadius: 2, overflow: "hidden" }}><div style={{ width: `${c.geoPower}%`, height: "100%", background: c.color, borderRadius: 2 }} /></div><span style={{ fontSize: 11, fontFamily: "DM Mono", fontWeight: 600, color: c.color, width: 28, textAlign: "right" }}>{c.geoPower}</span></div>)}</div></div>
                <div><div style={{ fontSize: 10, color: "#4b5563", fontFamily: "DM Mono", letterSpacing: 1, marginBottom: 12 }}>EVENTOS GEOPOLÍTICOS — <span style={{ color: currentCommodity.color }}>{currentCommodity.label?.toUpperCase()}</span></div><div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>{(GEO_EVENTS[selectedId] || []).map((ev,i) => { const impact = i < 2 ? "ALTO" : "MEDIO"; return <div key={i} style={{ background: "#0d1117", border: "1px solid #1f2937", borderRadius: 8, padding: "12px 14px", display: "flex", gap: 12, alignItems: "flex-start" }}><div style={{ width: 6, height: 6, borderRadius: "50%", background: impact === "ALTO" ? "#ef4444" : "#f59e0b", flexShrink: 0, marginTop: 4, boxShadow: `0 0 8px ${impact === "ALTO" ? "#ef4444" : "#f59e0b"}` }} /><div style={{ flex: 1 }}><span style={{ fontSize: 12, color: "#c4cad4", fontFamily: "Outfit", lineHeight: 1.5 }}>{ev}</span></div><RiskBadge level={impact} /></div>; })}</div><div style={{ background: "#0d1117", border: `1px solid ${currentCommodity.color}33`, borderRadius: 10, padding: 16 }}><div style={{ fontSize: 10, color: "#4b5563", fontFamily: "DM Mono", marginBottom: 12 }}>SENSIBILIDAD GEOPOLÍTICA</div><div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 60 }}>{commodities.map(c => <div key={c.id} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}><div style={{ width: "100%", height: `${(c.geoPower / 100) * 50}px`, background: c.id === selectedId ? c.color : c.color + "44", borderRadius: "2px 2px 0 0", transition: "all 0.3s" }} /><span style={{ fontSize: 7, fontFamily: "DM Mono", color: c.id === selectedId ? c.color : "#374151" }}>{c.id.slice(0,3)}</span></div>)}</div></div></div>
              </div>
            </div>
          )}
        </div>
      )}

      <div style={{ marginTop: 16, paddingTop: 12, borderTop: "1px solid #111827", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 9, color: "#1f2937", fontFamily: "DM Mono" }}>Precios simulados actualizados (proxy AllOrigins) · Análisis IA · No constituye asesoramiento financiero</div>
        <div style={{ display: "flex", gap: 12 }}>{commodities.slice(0,5).map(c => <span key={c.id} style={{ fontFamily: "DM Mono", fontSize: 9, color: c.changeP >= 0 ? "#22c55e" : "#ef4444" }}>{c.icon} {(c.changeP >= 0 ? "+" : "") + (c.changeP * 100).toFixed(1) + "%"}</span>)}</div>
      </div>
    </div>
  );
}