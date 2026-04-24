import { colors, fonts, space, radius } from "../../tokens";

interface ChartProps {
  showUncertainty?: boolean;
  showCounterfactual?: boolean;
}

/**
 * Chart — primary line chart showing battery SOC% on y-axis, 24h on x-axis.
 * DR3/DR4: conventional chart format with visual temporal data representation.
 * 
 * Properties:
 * - showUncertainty: false (A, B), true (C, D) — adds confidence bands
 * - showCounterfactual: false (A, B, C), true (D) — adds counterfactual trajectory
 */
export function Chart({ showUncertainty = false, showCounterfactual = false }: ChartProps) {
  const width = 800;
  const height = 400;
  const padding = { top: 40, right: 60, bottom: 40, left: 60 };

  // Mock battery SOC data (0-100%)
  const hours = Array.from({ length: 24 }, (_, i) => i);
  
  // Actual SOC trajectory: battery charges at 14:00, then discharges during peak
  const socData = hours.map((h) => {
    if (h < 14) return 30; // starting level
    if (h >= 14 && h < 16) return 30 + ((h - 14) * 35); // charging
    if (h >= 16 && h < 20) return 100 - ((h - 16) * 15); // discharging
    return 40; // overnight
  });

  // Counterfactual: if charged at 19:00 instead
  const counterfactualData = hours.map((h) => {
    if (h < 19) return 30;
    if (h >= 19 && h < 21) return 30 + ((h - 19) * 35);
    return 100 - ((h - 21) * 10);
  });

  const xScale = (h: number) => padding.left + ((width - padding.left - padding.right) / 23) * h;
  const yScale = (soc: number) => padding.top + ((height - padding.top - padding.bottom) * (100 - soc)) / 100;

  // SVG path for battery SOC
  const socPath = socData.map((soc, i) => `${i === 0 ? "M" : "L"} ${xScale(i)},${yScale(soc)}`).join(" ");
  const counterfactualPath = counterfactualData.map((soc, i) => `${i === 0 ? "M" : "L"} ${xScale(i)},${yScale(soc)}`).join(" ");

  // Decision markers
  const aiDecisionX = xScale(14);
  const sunsetX = xScale(18.5);

  return (
    <div
      style={{
        backgroundColor: colors.bg.surface,
        border: `1px solid ${colors.border.default}`,
        borderRadius: radius.lg,
        padding: space[4],
        marginBottom: space[6],
      }}
    >
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        {/* Grid lines */}
        {[0, 25, 50, 75, 100].map((soc) => (
          <g key={soc}>
            <line
              x1={padding.left}
              y1={yScale(soc)}
              x2={width - padding.right}
              y2={yScale(soc)}
              stroke={colors.border.subtle}
              strokeWidth={1}
            />
            <text
              x={padding.left - 10}
              y={yScale(soc)}
              textAnchor="end"
              alignmentBaseline="middle"
              style={{
                fontFamily: fonts.family.sans,
                fontSize: fonts.size.xs,
                fill: colors.text.secondary,
              }}
            >
              {soc}%
            </text>
          </g>
        ))}

        {/* Hour markers */}
        {[0, 6, 12, 18, 24].map((h) => (
          <text
            key={h}
            x={h === 24 ? width - padding.right : xScale(h)}
            y={height - padding.bottom + 20}
            textAnchor="middle"
            style={{
              fontFamily: fonts.family.sans,
              fontSize: fonts.size.xs,
              fill: colors.text.secondary,
            }}
          >
            {h}:00
          </text>
        ))}

        {/* Uncertainty band (Prototype C/D only) */}
        {showUncertainty && (
          <g>
            <path
              d={`
                M ${xScale(14)},${yScale(socData[14]) - 20}
                L ${xScale(23)},${yScale(socData[23]) - 40}
                L ${xScale(23)},${yScale(socData[23]) + 40}
                L ${xScale(14)},${yScale(socData[14]) + 20}
                Z
              `}
              fill={colors.uncertainty.band}
              stroke="none"
            />
          </g>
        )}

        {/* Battery SOC line */}
        <path
          d={socPath}
          fill="none"
          stroke={colors.brand.battery}
          strokeWidth={3}
          strokeLinecap="round"
        />

        {/* Counterfactual trajectory (Prototype D only) */}
        {showCounterfactual && (
          <path
            d={counterfactualPath}
            fill="none"
            stroke={colors.ai.counterfactual}
            strokeWidth={2}
            strokeDasharray="4 4"
            strokeLinecap="round"
          />
        )}

        {/* AI Decision marker at 14:00 */}
        <g>
          <line
            x1={aiDecisionX}
            y1={padding.top}
            x2={aiDecisionX}
            y2={height - padding.bottom}
            stroke={colors.ai.decision}
            strokeWidth={2}
            strokeDasharray="6 3"
          />
          <rect
            x={aiDecisionX - 40}
            y={padding.top - 30}
            width={80}
            height={24}
            fill={colors.ai.decision}
            rx={4}
          />
          <text
            x={aiDecisionX}
            y={padding.top - 16}
            textAnchor="middle"
            alignmentBaseline="middle"
            style={{
              fontFamily: fonts.family.sans,
              fontSize: fonts.size.xs,
              fontWeight: fonts.weight.bold,
              fill: "#fff",
            }}
          >
            AI CHARGE
          </text>
        </g>

        {/* Sunset marker at ~18:30 */}
        <g>
          <line
            x1={sunsetX}
            y1={padding.top}
            x2={sunsetX}
            y2={height - padding.bottom}
            stroke={colors.text.muted}
            strokeWidth={1}
            strokeDasharray="2 2"
          />
          <text
            x={sunsetX + 5}
            y={padding.top + 10}
            style={{
              fontFamily: fonts.family.sans,
              fontSize: fonts.size.xs,
              fill: colors.text.muted,
            }}
          >
            Sunset
          </text>
        </g>

        {/* Y-axis label */}
        <text
          x={20}
          y={padding.top + (height - padding.top - padding.bottom) / 2}
          textAnchor="middle"
          transform={`rotate(-90, 20, ${padding.top + (height - padding.top - padding.bottom) / 2})`}
          style={{
            fontFamily: fonts.family.sans,
            fontSize: fonts.size.sm,
            fontWeight: fonts.weight.semibold,
            fill: colors.text.primary,
          }}
        >
          Battery SOC (%)
        </text>

        {/* X-axis label */}
        <text
          x={padding.left + (width - padding.left - padding.right) / 2}
          y={height - 5}
          textAnchor="middle"
          style={{
            fontFamily: fonts.family.sans,
            fontSize: fonts.size.sm,
            fontWeight: fonts.weight.semibold,
            fill: colors.text.primary,
          }}
        >
          Time (24h)
        </text>
      </svg>

      {/* Legend */}
      <div style={{ display: "flex", gap: space[4], marginTop: space[3], justifyContent: "center", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: space[2] }}>
          <div style={{ width: 24, height: 3, backgroundColor: colors.brand.battery }} />
          <span style={{ fontFamily: fonts.family.sans, fontSize: fonts.size.xs, color: colors.text.secondary }}>
            Battery SOC%
          </span>
        </div>
        {showCounterfactual && (
          <div style={{ display: "flex", alignItems: "center", gap: space[2] }}>
            <div style={{ width: 24, height: 2, backgroundColor: colors.ai.counterfactual, borderTop: "2px dashed" }} />
            <span style={{ fontFamily: fonts.family.sans, fontSize: fonts.size.xs, color: colors.text.secondary }}>
              Counterfactual (if charged at 19:00)
            </span>
          </div>
        )}
        {showUncertainty && (
          <div style={{ display: "flex", alignItems: "center", gap: space[2] }}>
            <div style={{ width: 24, height: 12, backgroundColor: colors.uncertainty.band, border: `1px solid ${colors.brand.battery}` }} />
            <span style={{ fontFamily: fonts.family.sans, fontSize: fonts.size.xs, color: colors.text.secondary }}>
              Forecast confidence band
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
