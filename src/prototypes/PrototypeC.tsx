import { Shell } from "./components/shared/Shell";
import { Header } from "./components/shared/Header";
import { SummaryCard } from "./components/shared/SummaryCard";
import { TemporalNav } from "./components/shared/TemporalNav";
import { fonts } from "./tokens";

/**
 * Prototype C — Comprehensible+ / Uncertainty-Integrated (DR9)
 *
 * Inherits: All of Prototype A + B
 * Adds: Forecast uncertainty visualisation via confidence bands on the chart,
 *       and uncertainty qualifier in the CausalPanel's solar forecast block
 *
 * DR9: Forecast uncertainty must be visually encoded, not suppressed.
 *
 * The confidence band widens progressively from the current time toward the
 * forecast horizon, visually encoding degrading confidence over time.
 *
 * Still withholds:
 * - No comparison with alternative decisions
 *
 * Forecast encoding: diagonal hatched fill with confidence-based opacity/density (variant="hatched")
 */
export function PrototypeC() {
  // Causal explanation content (DR8)
  const explanationContent = (
    <div>
      <div
        style={{
          fontFamily: fonts.family.sans,
          fontSize: 14,
          color: "#1C1C1E",
          fontWeight: fonts.weight.regular,
          marginBottom: 12,
        }}
      >
        EnergyView charged at 14:00–16:00 because:
      </div>

      {/* Factor 1: Solar */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 10 }}>
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
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 10 }}>
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
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
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
    </div>
  );

  return (
    <Shell>
      <Header batterySOC={100} chargingState="idle" />

      <SummaryCard
        text="Your battery finished charging today at 16:00. Battery is now at 100%."
        costText="Estimated cost today: £3.40 · Estimated savings: £1.20 (£0.85 solar · £0.35 off-peak) · CO₂ avoided: 2.1 kg"
        forecastAccuracy="Forecast accuracy: 87% — yesterday's forecast was within ±8% of actual"
        showModifyButton={false}
        expandableExplanation={explanationContent}
      />

      <TemporalNav variant="hatched" showCausalContext={true} />
    </Shell>
  );
}