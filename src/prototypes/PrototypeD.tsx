import { useState } from "react";
import { Shell } from "./components/shared/Shell";
import { Header } from "./components/shared/Header";
import { SummaryCard } from "./components/shared/SummaryCard";
import { TemporalNav } from "./components/shared/TemporalNav";
import { fonts } from "./tokens";

/**
 * Prototype D — Truly Explainable (DR10)
 *
 * Inherits: All of Prototype A + B + C
 * Adds: Contrastive reasoning drawer with:
 *       - Two-column decision comparison (actual vs. counterfactual)
 *       - Mini comparison chart (both SOC trajectories)
 *       - What-if scenario chips for exploring alternative input conditions
 *
 * DR10: Prototype D must support contrastive and counterfactual reasoning,
 *       not merely describe the current state.
 *
 * Miller (2019): People do not ask "why P happened" — they ask "why P rather
 * than Q." This prototype operationalises contrastive explanation.
 *
 * Forecast encoding: diagonal hatched fill with confidence-based opacity/density (variant="hatched")
 */
export function PrototypeD() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeScenario, setActiveScenario] = useState<"lowerSolar" | "peakRate" | "fullBattery" | null>(null);

  // Generate modal content based on active scenario
  const getScenarioContent = () => {
    if (activeScenario === "lowerSolar") {
      return {
        title: "What if solar was 50% lower?",
        chartTitle: "Battery level comparison",
        yAxisLabel: "%",
        summary: (
          <>
            With 50% less solar, charging at 16:00 instead of 19:00 saves{" "}
            <span style={{ fontWeight: fonts.weight.semibold }}>£0.32</span> and avoids{" "}
            <span style={{ fontWeight: fonts.weight.semibold }}>0.8 kg</span> of additional CO₂.
          </>
        ),
        actualCard: {
          time: "Charge at 16:00",
          rate: "Off-peak (£0.10/kWh)",
          cost: "~£0.38",
          solar: "Reduced — 50% lower generation",
          carbon: "190g CO₂/kWh",
        },
        alternativeCard: {
          badge: "+£0.32 MORE",
          time: "Charge at 19:00",
          rate: "Peak (£0.35/kWh)",
          cost: "~£0.70",
          solar: "None (post-sunset)",
          carbon: "240g CO₂/kWh",
        },
        chartPaths: {
          actual: "M 0,196 L 40,196 L 80,196 L 120,196 L 160,196 L 200,196 L 240,56 L 280,56 L 320,71 L 360,90 L 400,103",
          actualFill: "M 0,196 L 40,196 L 80,196 L 120,196 L 160,196 L 200,196 L 240,56 L 280,56 L 320,71 L 360,90 L 400,103 L 400,280 L 0,280 Z",
          alternative: "M 0,196 L 40,196 L 80,196 L 120,196 L 160,196 L 200,196 L 240,196 L 280,69 L 320,69 L 360,97 L 400,112",
        },
        actualLegend: "Actual (16:00)",
        alternativeLegend: "If charged at 19:00",
        xAxisLabels: ["14:00", "16:00", "19:00", "21:00", "23:00"],
        yAxisLabels: ["100%", "67%", "33%", "0%"],
      };
    } else if (activeScenario === "peakRate") {
      return {
        title: "What if you charged at peak rate?",
        chartTitle: "Cost comparison",
        yAxisLabel: "£",
        summary: null,
        causalText: "AI shifted charging to off-peak hours (01:00–05:00 at 7p/kWh), avoiding 34p/kWh peak.",
        metricCards: [
          { label: "Saved today", value: "£1.40" },
          { label: "Peak rate", value: "£2.85 vs actual: £1.45" },
        ],
        chartPaths: {
          actual: "M 0,50 L 50,180 L 100,240 L 150,260 L 200,270 L 250,270 L 300,270 L 350,270 L 400,270",
          actualFill: "M 0,50 L 50,180 L 100,240 L 150,260 L 200,270 L 250,270 L 300,270 L 350,270 L 400,270 L 400,280 L 0,280 Z",
          alternative: "M 0,270 L 50,270 L 100,270 L 150,270 L 200,270 L 250,140 L 300,60 L 350,40 L 400,30",
        },
        actualLegend: "AI-scheduled cost",
        alternativeLegend: "Peak rate cost",
        xAxisLabels: ["00:00", "03:00", "06:00", "12:00", "18:00"],
        yAxisLabels: ["£3.00", "£2.00", "£1.00", "£0"],
      };
    } else if (activeScenario === "fullBattery") {
      return {
        title: "What if battery was already full?",
        chartTitle: "Grid dependency",
        yAxisLabel: "kWh",
        summary: null,
        causalText: "At 15% SOC, AI prioritised solar charging. Full battery would have exported surplus.",
        metricCards: [
          { label: "Grid import reduced", value: "3.2 kWh" },
          { label: "Excess solar", value: "Exports 2.1 kWh" },
        ],
        chartPaths: {
          actual: "M 0,210 L 50,200 L 100,150 L 150,120 L 200,100 L 250,140 L 300,180 L 350,220 L 400,240",
          actualFill: "M 0,210 L 50,200 L 100,150 L 150,120 L 200,100 L 250,140 L 300,180 L 350,220 L 400,240 L 400,280 L 0,280 Z",
          alternative: "M 0,265 L 50,268 L 100,270 L 150,272 L 200,275 L 250,270 L 300,268 L 350,265 L 400,268",
        },
        actualLegend: "Actual grid use",
        alternativeLegend: "Full battery scenario",
        xAxisLabels: ["00:00", "06:00", "09:00", "14:00", "18:00"],
        yAxisLabels: ["4 kWh", "3 kWh", "2 kWh", "1 kWh", "0"],
      };
    }

    // Default scenario (original)
    return {
      title: "Why did EnergyView make that choice?",
      chartTitle: "Battery level comparison",
      yAxisLabel: "%",
      summary: (
        <>
          Charging at 14:00 instead of 19:00 saves{" "}
          <span style={{ fontWeight: fonts.weight.semibold }}>£0.41</span> and avoids{" "}
          <span style={{ fontWeight: fonts.weight.semibold }}>1.2 kg</span> of additional CO₂.
        </>
      ),
      actualCard: {
        time: "Charge at 14:00",
        rate: "Off-peak (£0.10/kWh)",
        cost: "~£0.29",
        solar: "Available by 15:00",
        carbon: "160g CO₂/kWh",
      },
      alternativeCard: {
        badge: "+£0.41 MORE",
        time: "Charge at 19:00",
        rate: "Peak (£0.35/kWh)",
        cost: "~£0.70",
        solar: "None (post-sunset)",
        carbon: "240g CO₂/kWh",
      },
      chartPaths: {
        actual: "M 0,196 L 40,196 L 80,28 L 120,28 L 160,28 L 200,43 L 240,60 L 280,80 L 320,99 L 360,118 L 400,125",
        actualFill: "M 0,196 L 40,196 L 80,28 L 120,28 L 160,28 L 200,43 L 240,60 L 280,80 L 320,99 L 360,118 L 400,125 L 400,280 L 0,280 Z",
        alternative: "M 0,196 L 40,196 L 80,196 L 120,196 L 160,196 L 200,196 L 240,196 L 280,69 L 320,69 L 360,97 L 400,112",
      },
      actualLegend: "Actual (14:00)",
      alternativeLegend: "If charged at 19:00",
      xAxisLabels: ["14:00", "16:00", "19:00", "21:00", "23:00"],
      yAxisLabels: ["100%", "67%", "33%", "0%"],
    };
  };

  const scenarioData = getScenarioContent();

  const modalContent = (
    <>
      {/* Section A: Causal factors - only show for default/lowerSolar scenarios */}
      {(activeScenario === null || activeScenario === "lowerSolar") && (
        <>
          <div
            style={{
              fontFamily: fonts.family.sans,
              fontSize: 12,
              color: "#1C1C1E",
              fontWeight: fonts.weight.regular,
              marginBottom: 8,
            }}
          >
            EnergyView charged at 14:00–16:00 because:
          </div>

      {/* Factor 1: Solar */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            backgroundColor: "#E8971A",
            marginTop: 5,
            flexShrink: 0,
          }}
        />
        <div style={{ fontFamily: fonts.family.sans, fontSize: 13, lineHeight: 1.5 }}>
          <span style={{ color: "#374151", fontWeight: fonts.weight.semibold }}>Solar generation is forecast to peak 12:00–15:00</span>
          {" "}
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#1F2937", opacity: 0.6, display: "inline-block" }} />
            <span style={{ fontSize: 12, fontWeight: fonts.weight.semibold, color: "#6B7280" }}>High confidence</span>
          </span>
          <span style={{ color: "#6B7280" }}> — maximising free energy capture</span>
        </div>
      </div>

      {/* Factor 2: Grid tariff */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            backgroundColor: "#2FA75A",
            marginTop: 5,
            flexShrink: 0,
          }}
        />
        <div style={{ fontFamily: fonts.family.sans, fontSize: 13, lineHeight: 1.5 }}>
          <span style={{ color: "#374151", fontWeight: fonts.weight.semibold }}>Grid tariff is expected to remain at £0.10/kWh until 18:00</span>
          {" "}
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#1F2937", opacity: 0.35, display: "inline-block" }} />
            <span style={{ fontSize: 12, fontWeight: fonts.weight.semibold, color: "#6B7280" }}>Moderate</span>
          </span>
          <span style={{ color: "#6B7280" }}> — charging before the evening price rise saves £0.85</span>
        </div>
      </div>

      {/* Factor 3: Battery level */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            backgroundColor: "#2596BE",
            marginTop: 5,
            flexShrink: 0,
          }}
        />
        <div style={{ fontFamily: fonts.family.sans, fontSize: 13, lineHeight: 1.5 }}>
          <span style={{ color: "#374151", fontWeight: fonts.weight.semibold }}>Battery was at 30%, below recommended level</span>
          {" "}
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#1F2937", opacity: 1, display: "inline-block" }} />
            <span style={{ fontSize: 12, fontWeight: fonts.weight.semibold, color: "#6B7280" }}>Confirmed</span>
          </span>
          <span style={{ color: "#6B7280" }}> — prioritising charge to maintain household supply</span>
        </div>
      </div>
        </>
      )}

      {/* Section B: Contrastive summary or metric cards */}
      {scenarioData.metricCards ? (
        <div style={{ display: "flex", gap: 8, marginTop: 8, marginBottom: 8 }}>
          {scenarioData.metricCards.map((card, idx) => (
            <div
              key={idx}
              style={{
                flex: 1,
                backgroundColor: "#F9FAFB",
                border: "1px solid #E5E7EB",
                borderRadius: 6,
                padding: "6px 10px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ fontFamily: fonts.family.sans, fontSize: 11, color: "#6B7280", textTransform: "uppercase" }}>
                {card.label}
              </div>
              <div style={{ fontFamily: fonts.family.sans, fontSize: 13, fontWeight: fonts.weight.semibold, color: "#1C1C1E" }}>
                {card.value}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          <div style={{ borderTop: "1px solid #E5E7EB", paddingTop: 8, marginTop: 8, marginBottom: 8 }}>
            <div style={{ fontFamily: fonts.family.sans, fontSize: 12, color: "#1C1C1E", fontWeight: fonts.weight.regular, lineHeight: 1.4, maxHeight: "2.8em", overflow: "hidden" }}>
              {scenarioData.summary}
            </div>
          </div>

          {/* Section C: Comparison cards - only for default/lowerSolar */}
          {scenarioData.actualCard && (
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              {/* Left card: Actual decision */}
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: fonts.family.sans, fontSize: 11, textTransform: "uppercase", color: "#9CA3AF", marginBottom: 6 }}>
                  Actual decision
                </div>
                <div
                  style={{
                    backgroundColor: "#FFFFFF",
                    border: "1px solid #E5E7EB",
                    borderLeft: "4px solid #F59E0B",
                    borderRadius: 8,
                    padding: 10,
                    position: "relative",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      top: 8,
                      right: 8,
                      backgroundColor: "#F59E0B",
                      color: "#FFFFFF",
                      fontSize: 10,
                      fontWeight: fonts.weight.bold,
                      textTransform: "uppercase",
                      padding: "4px 8px",
                      borderRadius: 4,
                    }}
                  >
                    SELECTED
                  </div>
                  <div style={{ fontFamily: fonts.family.sans, fontSize: 13, fontWeight: fonts.weight.semibold, color: "#1C1C1E", marginBottom: 6 }}>
                    {scenarioData.actualCard.time}
                  </div>
                  <div style={{ fontFamily: fonts.family.sans, fontSize: 12, color: "#374151", lineHeight: 1.5 }}>
                    <div>Rate: {scenarioData.actualCard.rate}</div>
                    <div>Cost: {scenarioData.actualCard.cost}</div>
                    <div>Solar: {scenarioData.actualCard.solar}</div>
                    <div>Carbon: {scenarioData.actualCard.carbon}</div>
                  </div>
                </div>
              </div>

              {/* Right card: Counterfactual alternative */}
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: fonts.family.sans, fontSize: 11, textTransform: "uppercase", color: "#9CA3AF", marginBottom: 6 }}>
                  Alternative scenario
                </div>
                <div
                  style={{
                    backgroundColor: "#F9FAFB",
                    border: "1px solid #E5E7EB",
                    borderLeft: "4px solid #9CA3AF",
                    borderRadius: 8,
                    padding: 10,
                    position: "relative",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      top: 8,
                      right: 8,
                      backgroundColor: "#E8735F",
                      color: "#FFFFFF",
                      fontSize: 10,
                      fontWeight: fonts.weight.bold,
                      textTransform: "uppercase",
                      padding: "4px 8px",
                      borderRadius: 4,
                    }}
                  >
                    {scenarioData.alternativeCard.badge}
                  </div>
                  <div style={{ fontFamily: fonts.family.sans, fontSize: 13, fontWeight: fonts.weight.semibold, color: "#374151", marginBottom: 6 }}>
                    {scenarioData.alternativeCard.time}
                  </div>
                  <div style={{ fontFamily: fonts.family.sans, fontSize: 12, color: "#6B7280", lineHeight: 1.5 }}>
                    <div>Rate: {scenarioData.alternativeCard.rate}</div>
                    <div>Cost: {scenarioData.alternativeCard.cost}</div>
                    <div>Solar: {scenarioData.alternativeCard.solar}</div>
                    <div>Carbon: {scenarioData.alternativeCard.carbon}</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Section D: Mini comparison chart with title and labels */}
      <div style={{ marginTop: 8 }}>
        <div style={{ fontFamily: fonts.family.sans, fontSize: 12, fontWeight: fonts.weight.semibold, color: "#374151", marginBottom: 6 }}>
          {scenarioData.chartTitle}
        </div>
        <div
          style={{
            backgroundColor: "#F9FAFB",
            border: "1px solid #E5E7EB",
            borderRadius: 8,
            padding: 8,
            paddingLeft: 36,
            paddingBottom: 24,
            position: "relative",
          }}
        >
          {/* Y-axis labels */}
          {scenarioData.yAxisLabels ? (
            <>
              <div style={{ position: "absolute", left: 4, top: 8, fontFamily: fonts.family.sans, fontSize: 10, color: "#9CA3AF" }}>{scenarioData.yAxisLabels[0]}</div>
              <div style={{ position: "absolute", left: 4, top: "33%", transform: "translateY(-50%)", fontFamily: fonts.family.sans, fontSize: 10, color: "#9CA3AF" }}>{scenarioData.yAxisLabels[1]}</div>
              <div style={{ position: "absolute", left: 4, top: "66%", transform: "translateY(-50%)", fontFamily: fonts.family.sans, fontSize: 10, color: "#9CA3AF" }}>{scenarioData.yAxisLabels[2]}</div>
              <div style={{ position: "absolute", left: 4, bottom: 24, fontFamily: fonts.family.sans, fontSize: 10, color: "#9CA3AF" }}>{scenarioData.yAxisLabels[3]}</div>
            </>
          ) : (
            <>
              <div style={{ position: "absolute", left: 4, top: 8, fontFamily: fonts.family.sans, fontSize: 10, color: "#9CA3AF" }}>100%</div>
              <div style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", fontFamily: fonts.family.sans, fontSize: 10, color: "#9CA3AF" }}>50%</div>
              <div style={{ position: "absolute", left: 12, bottom: 24, fontFamily: fonts.family.sans, fontSize: 10, color: "#9CA3AF" }}>0%</div>
            </>
          )}

          <svg width="100%" height="180" viewBox="0 0 400 280" preserveAspectRatio="none">
            {/* Grid lines */}
            <line x1="0" y1="0" x2="400" y2="0" stroke="#E5E7EB" strokeWidth="1" />
            <line x1="0" y1="93" x2="400" y2="93" stroke="#E5E7EB" strokeWidth="1" />
            <line x1="0" y1="186" x2="400" y2="186" stroke="#E5E7EB" strokeWidth="1" />
            <line x1="0" y1="280" x2="400" y2="280" stroke="#E5E7EB" strokeWidth="1" />

            {/* Actual trajectory (solid blue or orange based on scenario) */}
            <path
              d={scenarioData.chartPaths.actual}
              fill="none"
              stroke={activeScenario === "peakRate" ? "#2563EB" : activeScenario === "fullBattery" ? "#2563EB" : "#F59E0B"}
              strokeWidth="2.5"
            />
            <path
              d={scenarioData.chartPaths.actualFill}
              fill={activeScenario === "peakRate" ? "#2563EB" : activeScenario === "fullBattery" ? "#2563EB" : "#F59E0B"}
              fillOpacity="0.1"
            />

            {/* Alternative trajectory (dashed grey/red/green) */}
            <path
              d={scenarioData.chartPaths.alternative}
              fill="none"
              stroke={activeScenario === "peakRate" ? "#EF4444" : activeScenario === "fullBattery" ? "#10B981" : "#9CA3AF"}
              strokeWidth="2.5"
              strokeDasharray="6,4"
            />
          </svg>

          {/* X-axis labels */}
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, paddingLeft: 0, paddingRight: 0 }}>
            {scenarioData.xAxisLabels.map((label, idx) => (
              <span key={idx} style={{ fontFamily: fonts.family.sans, fontSize: 10, color: "#9CA3AF" }}>{label}</span>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div style={{ display: "flex", gap: 12, marginTop: 6, justifyContent: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ width: 16, height: 2, backgroundColor: activeScenario === "peakRate" ? "#2563EB" : activeScenario === "fullBattery" ? "#2563EB" : "#F59E0B" }} />
            <span style={{ fontFamily: fonts.family.sans, fontSize: 11, color: "#6B7280" }}>
              {scenarioData.actualLegend}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ width: 16, height: 2, backgroundColor: activeScenario === "peakRate" ? "#EF4444" : activeScenario === "fullBattery" ? "#10B981" : "#9CA3AF", backgroundImage: "repeating-linear-gradient(90deg, transparent, transparent 6px, #F9FAFB 6px, #F9FAFB 10px)" }} />
            <span style={{ fontFamily: fonts.family.sans, fontSize: 11, color: "#6B7280" }}>{scenarioData.alternativeLegend}</span>
          </div>
        </div>
      </div>

      {/* Causal text for peakRate and fullBattery scenarios */}
      {scenarioData.causalText && (
        <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid #E5E7EB" }}>
          <div style={{ fontFamily: fonts.family.sans, fontSize: 12, color: "#1C1C1E", lineHeight: 1.4, maxHeight: "2.8em", overflow: "hidden" }}>
            {scenarioData.causalText}
          </div>
        </div>
      )}
    </>
  );

  return (
    <Shell>
      <Header batterySOC={100} chargingState="idle" />

      <SummaryCard
        text="Your battery finished charging today at 16:00. Battery is now at 100%."
        costText="Estimated cost today: £3.40 · Estimated savings: £1.20 (£0.85 solar · £0.35 off-peak) — £0.41 more than next best option · CO₂ avoided: 2.1 kg"
        forecastAccuracy="Forecast accuracy: 87% — yesterday's forecast was within ±8% of actual"
        showModifyButton={false}
        onExplainClick={() => setIsModalOpen(true)}
      />

      <TemporalNav variant="hatched" showCausalContext={true} />

      {/* Modal overlay */}
      {isModalOpen && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setIsModalOpen(false)}
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0, 0, 0, 0.4)",
              zIndex: 100,
            }}
          />

          {/* Modal */}
          <div
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: "90%",
              height: "80%",
              overflow: "hidden",
              backgroundColor: "#FFFFFF",
              border: "1px solid #E5E7EB",
              borderRadius: 12,
              padding: 16,
              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.16)",
              zIndex: 101,
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Close button */}
            <button
              onClick={() => setIsModalOpen(false)}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "#1F2937";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "#6B7280";
              }}
              style={{
                position: "absolute",
                top: 12,
                right: 12,
                width: 20,
                height: 20,
                background: "none",
                border: "none",
                fontSize: 20,
                color: "#6B7280",
                cursor: "pointer",
                lineHeight: 1,
                padding: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "color 0.2s",
              }}
            >
              ✕
            </button>

            {/* Modal title */}
            <h2 style={{ fontFamily: fonts.family.sans, fontSize: 16, fontWeight: fonts.weight.bold, color: "#1C1C1E", marginTop: 0, marginBottom: 8, paddingRight: 32 }}>
              {scenarioData.title}
            </h2>

            {/* What-if pill selector row */}
            <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
              <button
                onClick={() => setActiveScenario(activeScenario === "lowerSolar" ? null : "lowerSolar")}
                onMouseEnter={(e) => {
                  if (activeScenario !== "lowerSolar") {
                    e.currentTarget.style.backgroundColor = "#F3F4F6";
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeScenario !== "lowerSolar") {
                    e.currentTarget.style.backgroundColor = "#FFFFFF";
                  }
                }}
                style={{
                  backgroundColor: activeScenario === "lowerSolar" ? "#FFFFFF" : "#FFFFFF",
                  border: activeScenario === "lowerSolar" ? "2px solid #2563EB" : "1px solid #D1D5DB",
                  borderRadius: 16,
                  padding: "4px 10px",
                  fontFamily: fonts.family.sans,
                  fontSize: 12,
                  color: "#374151",
                  cursor: "pointer",
                  transition: "background-color 0.2s",
                }}
              >
                Solar 50% lower
              </button>
              <button
                onClick={() => setActiveScenario(activeScenario === "peakRate" ? null : "peakRate")}
                onMouseEnter={(e) => {
                  if (activeScenario !== "peakRate") {
                    e.currentTarget.style.backgroundColor = "#F3F4F6";
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeScenario !== "peakRate") {
                    e.currentTarget.style.backgroundColor = "#FFFFFF";
                  }
                }}
                style={{
                  backgroundColor: activeScenario === "peakRate" ? "#FFFFFF" : "#FFFFFF",
                  border: activeScenario === "peakRate" ? "2px solid #2563EB" : "1px solid #D1D5DB",
                  borderRadius: 16,
                  padding: "4px 10px",
                  fontFamily: fonts.family.sans,
                  fontSize: 12,
                  color: "#374151",
                  cursor: "pointer",
                  transition: "background-color 0.2s",
                }}
              >
                Peak rate
              </button>
              <button
                onClick={() => setActiveScenario(activeScenario === "fullBattery" ? null : "fullBattery")}
                onMouseEnter={(e) => {
                  if (activeScenario !== "fullBattery") {
                    e.currentTarget.style.backgroundColor = "#F3F4F6";
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeScenario !== "fullBattery") {
                    e.currentTarget.style.backgroundColor = "#FFFFFF";
                  }
                }}
                style={{
                  backgroundColor: activeScenario === "fullBattery" ? "#FFFFFF" : "#FFFFFF",
                  border: activeScenario === "fullBattery" ? "2px solid #2563EB" : "1px solid #D1D5DB",
                  borderRadius: 16,
                  padding: "4px 10px",
                  fontFamily: fonts.family.sans,
                  fontSize: 12,
                  color: "#374151",
                  cursor: "pointer",
                  transition: "background-color 0.2s",
                }}
              >
                Battery full
              </button>
            </div>

            {/* Modal content - compact layout */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8, overflow: "hidden" }}>
              {modalContent}
            </div>
          </div>
        </>
      )}
    </Shell>
  );
}
