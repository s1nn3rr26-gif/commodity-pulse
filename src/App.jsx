import { useState, useEffect } from "react";

const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@400;500&family=Outfit:wght@300;400;600&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #080a0f; }
  ::-webkit-scrollbar { width: 4px; } 
  ::-webkit-scrollbar-track { background: #0d1117; }
  ::-webkit-scrollbar-thumb { background: #1f2937; border-radius: 2px; }
  @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
  @keyframes pulse-dot { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(0.8)} }
  .card { transition: all 0.2s; }
  .card:hover { transform: translateY(-2px); }
`;

// Datos maestros con precios actualizados (junio 2026)
const COMMODITIES_DATA = {
  GOLD:   { id: "GOLD", label: "Oro", symbol: "XAU/USD", icon: "◈", sector: "METALES", unit: "$/oz", desc: "Metal precioso refugio", geoPower: 95, seasonPeak: "Nov–Feb", supply: "Sudáfrica · Australia · Rusia", color: "#f59e0b", price: 4320, changeP: 0.012 },
  SILVER: { id: "SILVER", label: "Plata", symbol: "XAG/USD", icon: "◇", sector: "METALES", unit: "$/oz", desc: "Metal industrial", geoPower: 70, seasonPeak: "Ene–Mar", supply: "México · Perú · China", color: "#94a3b8", price: 67.5, changeP: 0.008 },
  WTI:    { id: "WTI", label: "WTI Crudo", symbol: "CL=F", icon: "⬡", sector: "ENERGÍA", unit: "$/bbl", desc: "Petróleo EEUU", geoPower: 99, seasonPeak: "Jun–Ago", supply: "OPEC+ · EE.UU. · Rusia", color: "#ef4444", price: 90.5, changeP: -0.005 },
  NATGAS: { id: "NATGAS", label: "Gas Natural", symbol: "NG=F", icon: "⬢", sector: "ENERGÍA", unit: "$/MMBtu", desc: "Gas Henry Hub", geoPower: 88, seasonPeak: "Dic–Feb", supply: "EE.UU. · Rusia · Qatar", color: "#f97316", price: 3.23, changeP: 0.02 },
  COPPER: { id: "COPPER", label: "Cobre", symbol: "HG=F", icon: "⬟", sector: "MINERÍA", unit: "$/lb", desc: "Metal transición", geoPower: 82, seasonPeak: "Mar–May", supply: "Chile · Perú · China", color: "#c2410c", price: 6.30, changeP: 0.015 },
  LITHIUM:{ id: "LITHIUM", label: "Litio", symbol: "LIT", icon: "⬠", sector: "MINERÍA", unit: "$/MT", desc: "Baterías EV", geoPower: 75, seasonPeak: "Abr–Jul", supply: "Australia · Chile · Argentina", color: "#7c3aed", price: 11200, changeP: -0.03 },
  WHEAT:  { id: "WHEAT", label: "Trigo", symbol: "ZW=F", icon: "⊛", sector: "AGRICULTURA", unit: "$/bu", desc: "Cereal global", geoPower: 91, seasonPeak: "May–Jul", supply: "Rusia · EE.UU. · Ucrania", color: "#d97706", price: 645.0, changeP: 0.005 },
  CORN:   { id: "CORN", label: "Maíz", symbol: "ZC=F", icon: "⊙", sector: "AGRICULTURA", unit: "$/bu", desc: "Cereal multipropósito", geoPower: 72, seasonPeak: "Jun–Ago", supply: "EE.UU. · Brasil · Argentina", color: "#65a30d", price: 450.0, changeP: -0.01 },
  COFFEE: { id: "COFFEE", label: "Café Arábica", symbol: "KC=F", icon: "⊕", sector: "SOFTS", unit: "$/lb", desc: "Soft commodity", geoPower: 68, seasonPeak: "Oct–Dic", supply: "Brasil · Colombia · Vietnam", color: "#92400e", price: 270.0, changeP: 0.018 },
  SOYBEAN:{ id: "SOYBEAN", label: "Soja", symbol: "ZS=F", icon: "⊗", sector: "AGRICULTURA", unit: "$/bu", desc: "Oleaginosa", geoPower: 78, seasonPeak: "Sep–Nov", supply: "Brasil · EE.UU. · Argentina", color: "#15803d", price: 1185.0, changeP: -0.007 },
};

// Índice estacional por mes (100 = neutral)
const SEASONAL_INDEX = {
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

const MONTHS_ES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
const TODAY_MONTH = 4; // Mayo

const SECTORS = ["TODOS", "METALES", "ENERGÍA", "MINERÍA", "AGRICULTURA", "SOFTS"];
const SECTOR_COLORS = { METALES:"#f59e0b", ENERGÍA:"#ef4444", MINERÍA:"#8b5cf6", AGRICULTURA:"#22c55e", SOFTS:"#92400e" };

const formatPrice = (p, unit) => {
  if (p > 1000) return p.toLocaleString("es-MX", { maximumFractionDigits: 0 }) + " " + unit;
  return p.toFixed(2) + " " + unit;
};

// Componente de gráfico estacional SIN recharts (barras CSS)
const SeasonBarChart = ({ commodity }) => {
  const idx = SEASONAL_INDEX[commodity.id];
  if (!idx) return <div className="text-center text-red-500">Sin datos</div>;
  const maxVal = Math.max(...idx);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: "4px", height: "120px", marginTop: "20px" }}>
      {MONTHS_ES.map((month, i) => {
        const value = idx[i];
        const height = (value / maxVal) * 100;
        const isNow = i === TODAY_MONTH;
        return (
          <div key={month} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
            <div style={{ 
              width: "100%", 
              height: `${height}%`, 
              backgroundColor: commodity.color, 
              opacity: isNow ? 1 : 0.6,
              borderRadius: "2px 2px 0 0",
              transition: "height 0.3s"
            }} />
            <span style={{ fontSize: "8px", color: isNow ? commodity.color : "#374151", fontFamily: "DM Mono" }}>{month}</span>
            <span style={{ fontSize: "8px", color: "#6b7280", fontFamily: "DM Mono" }}>{value}</span>
          </div>
        );
      })}
    </div>
  );
};

export default function CommodityDashboard() {
  const [commodities] = useState(Object.values(COMMODITIES_DATA));
  const [selectedId, setSelectedId] = useState("GOLD");
  const [sectorFilter, setSectorFilter] = useState("TODOS");
  const [activeTab, setActiveTab] = useState("analisis");

  const selectedCommodity = commodities.find(c => c.id === selectedId);
  const filtered = sectorFilter === "TODOS" ? commodities : commodities.filter(c => c.sector === sectorFilter);

  // Si el commodity seleccionado no existe (por ejemplo, al filtrar), seleccionar el primero
  useEffect(() => {
    if (!selectedCommodity && filtered.length > 0) {
      setSelectedId(filtered[0].id);
    }
  }, [selectedCommodity, filtered]);

  const handleSelect = (id) => {
    setSelectedId(id);
  };

  return (
    <div style={{ background: "#080a0f", minHeight: "100vh", fontFamily: "'Outfit', sans-serif", color: "#e2e8f0", padding: "20px" }}>
      <style>{GLOBAL_CSS}</style>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, borderBottom: "1px solid #111827", paddingBottom: 20 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 6 }}>
            <div style={{ display: "flex", gap: 3 }}>
              {["#f59e0b","#ef4444","#8b5cf6","#22c55e"].map((c,i) => (
                <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: c, animation: `pulse-dot 1.2s infinite` }} />
              ))}
            </div>
            <h1 style={{ fontSize: 26, fontWeight: 800, fontFamily: "Syne" }}>COMMODITY<span style={{ color: "#f59e0b" }}>PULSE</span></h1>
            <span style={{ background: "#111827", border: "1px solid #1f2937", color: "#4b5563", fontSize: 9, padding: "3px 10px", borderRadius: 20, fontFamily: "DM Mono" }}>AI · 10 ACTIVOS · LIVE</span>
          </div>
          <div style={{ color: "#374151", fontSize: 11, fontFamily: "DM Mono" }}>{new Date().toLocaleString("es-MX")}</div>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {SECTORS.map(s => (
            <button key={s} onClick={() => setSectorFilter(s)} style={{
              background: sectorFilter === s ? (SECTOR_COLORS[s] || "#1d4ed8") + "22" : "transparent",
              border: `1px solid ${sectorFilter === s ? (SECTOR_COLORS[s] || "#3b82f6") : "#1f2937"}`,
              color: sectorFilter === s ? (SECTOR_COLORS[s] || "#3b82f6") : "#4b5563",
              borderRadius: 20, padding: "4px 12px", cursor: "pointer", fontSize: 10, fontFamily: "DM Mono"
            }}>{s}</button>
          ))}
        </div>
      </div>

      {/* Tarjetas */}
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(filtered.length, 5)}, 1fr)`, gap: 8, marginBottom: 20 }}>
        {filtered.map(c => {
          const isSelected = selectedId === c.id;
          const isUp = c.changeP >= 0;
          return (
            <div key={c.id} onClick={() => handleSelect(c.id)} style={{
              background: isSelected ? "#0d1117" : "#0a0d14",
              border: `1px solid ${isSelected ? c.color : "#111827"}`,
              borderRadius: 10, padding: "12px", cursor: "pointer",
              boxShadow: isSelected ? `0 0 20px ${c.color}33` : "none",
              position: "relative"
            }}>
              {isSelected && <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${c.color}, transparent)` }} />}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontSize: 16, color: c.color }}>{c.icon}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#f9fafb", fontFamily: "Syne" }}>{c.label}</div>
                </div>
                <span style={{ fontSize: 9, color: isUp ? "#22c55e" : "#ef4444", fontFamily: "DM Mono" }}>
                  {isUp ? "▲" : "▼"} {Math.abs(c.changeP * 100).toFixed(1)}%
                </span>
              </div>
              <div style={{ fontFamily: "DM Mono", fontSize: 18, fontWeight: 500, color: "#f9fafb", marginTop: 4 }}>
                {formatPrice(c.price, c.unit)}
              </div>
              <div style={{ marginTop: 4, fontSize: 8, color: SECTOR_COLORS[c.sector] || "#6b7280", fontFamily: "DM Mono" }}>{c.sector}</div>
            </div>
          );
        })}
      </div>

      {/* Panel detalle - con título dinámico */}
      {selectedCommodity && (
        <div style={{ background: "#0a0d14", border: "1px solid #111827", borderRadius: 14, overflow: "hidden" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 20px", borderBottom: "1px solid #111827", background: "#0d1117" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <span style={{ fontSize: 24, color: selectedCommodity.color }}>{selectedCommodity.icon}</span>
              <div>
                {/* Aquí se muestra el nombre y símbolo del activo seleccionado - DEBE CAMBIAR */}
                <div style={{ fontSize: 18, fontWeight: 800, color: "#f9fafb", fontFamily: "Syne" }}>
                  {selectedCommodity.label} <span style={{ fontSize: 12, color: "#374151", fontFamily: "DM Mono" }}>{selectedCommodity.symbol}</span>
                </div>
                <div style={{ fontSize: 10, color: "#4b5563", fontFamily: "DM Mono" }}>{selectedCommodity.desc}</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              {[["analisis","🤖 IA Análisis"],["estacional","📅 Estacional"]].map(([t, label]) => (
                <button key={t} onClick={() => setActiveTab(t)} style={{
                  background: activeTab === t ? selectedCommodity.color + "22" : "transparent",
                  border: `1px solid ${activeTab === t ? selectedCommodity.color : "#1f2937"}`,
                  color: activeTab === t ? selectedCommodity.color : "#4b5563",
                  borderRadius: 6, padding: "5px 12px", cursor: "pointer", fontSize: 11, fontFamily: "DM Mono"
                }}>{label}</button>
              ))}
            </div>
          </div>

          {/* Contenido de pestañas */}
          {activeTab === "analisis" && (
            <div style={{ padding: 20 }}>
              <div style={{ background: "#0d1117", borderRadius: 10, padding: 16, border: "1px solid #1f2937" }}>
                <div style={{ fontSize: 10, color: "#4b5563", fontFamily: "DM Mono", marginBottom: 8 }}>ANÁLISIS RÁPIDO</div>
                <div style={{ fontSize: 14, color: "#f9fafb", lineHeight: 1.6 }}>{selectedCommodity.label} se mantiene en terreno alcista con alta demanda de refugio. Los fundamentos apuntan a una consolidación en el corto plazo.</div>
              </div>
            </div>
          )}

          {activeTab === "estacional" && (
            <div style={{ padding: 20 }}>
              <div style={{ background: "#0d1117", borderRadius: 10, padding: 16, border: "1px solid #1f2937" }}>
                <div style={{ fontSize: 11, color: "#374151", fontFamily: "DM Mono", marginBottom: 14, letterSpacing: 1 }}>▪ PATRÓN ESTACIONAL — ÍNDICE MENSUAL</div>
                <SeasonBarChart commodity={selectedCommodity} />
                <div style={{ marginTop: 16, fontSize: 10, color: "#6b7280", fontFamily: "DM Mono", textAlign: "center" }}>
                  Valores > 103 = favorables, &lt; 97 = desfavorables. Mayo: {SEASONAL_INDEX[selectedCommodity.id]?.[4] || 100}/100
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}