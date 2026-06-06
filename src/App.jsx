const SeasonChart = ({ commodity }) => {
  // Validación: si no hay datos estacionales, mostrar mensaje
  const seasonalData = SEASONAL[commodity.id];
  if (!seasonalData) {
    return (
      <div style={{ textAlign: "center", padding: 20, color: "#ef4444", fontFamily: "DM Mono" }}>
        ⚠️ Datos estacionales no disponibles para {commodity.label}
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