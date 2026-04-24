import { colors, fonts, space, radius } from "../../tokens";

interface CausalPanelProps {
  showUncertainty?: boolean;
}

/**
 * CausalPanel — "Why this decision?" panel with three named causal factors.
 * DR8: Causal factors driving AI decisions must be named and visually associated.
 * 
 * Used by: Prototype B, C, D
 * - Prototype B: solid fills (no uncertainty)
 * - Prototype C: adds uncertainty qualifier to solar forecast
 */
export function CausalPanel({ showUncertainty = false }: CausalPanelProps) {
  return (
    <div>
      <h2
        style={{
          fontFamily: fonts.family.sans,
          fontSize: fonts.size.h3,
          fontWeight: fonts.weight.bold,
          color: colors.text.primary,
          margin: 0,
          marginBottom: space[4],
        }}
      >
        Why this decision?
      </h2>

      {/* Solar Forecast */}
      <div
        style={{
          backgroundColor: colors.bg.surface,
          border: `1px solid ${colors.border.default}`,
          borderRadius: radius.md,
          padding: space[4],
          marginBottom: space[3],
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: space[2], marginBottom: space[2] }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={colors.brand.solar} strokeWidth="2">
            <circle cx="12" cy="12" r="5" />
            <line x1="12" y1="1" x2="12" y2="3" />
            <line x1="12" y1="21" x2="12" y2="23" />
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
            <line x1="1" y1="12" x2="3" y2="12" />
            <line x1="21" y1="12" x2="23" y2="12" />
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
          </svg>
          <h3
            style={{
              fontFamily: fonts.family.sans,
              fontSize: fonts.size.body,
              fontWeight: fonts.weight.semibold,
              color: colors.text.primary,
              margin: 0,
            }}
          >
            Solar Forecast
          </h3>
        </div>
        <p
          style={{
            fontFamily: fonts.family.sans,
            fontSize: fonts.size.sm,
            color: colors.text.secondary,
            margin: 0,
            marginBottom: space[2],
            lineHeight: 1.5,
          }}
        >
          {showUncertainty
            ? "High solar generation forecast (moderate confidence) for 15:00–17:00 window."
            : "High solar generation forecast for 15:00–17:00 window."}
        </p>
        {/* Visual indicator bar */}
        <div style={{ position: "relative", height: 24, backgroundColor: colors.border.subtle, borderRadius: radius.sm }}>
          {showUncertainty ? (
            // Uncertainty mode: range indicator
            <>
              <div
                style={{
                  position: "absolute",
                  left: "20%",
                  right: "30%",
                  top: "50%",
                  transform: "translateY(-50%)",
                  height: 2,
                  backgroundColor: colors.brand.solar,
                }}
              />
              <div
                style={{
                  position: "absolute",
                  left: "20%",
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: 2,
                  height: 12,
                  backgroundColor: colors.brand.solar,
                }}
              />
              <div
                style={{
                  position: "absolute",
                  right: "30%",
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: 2,
                  height: 12,
                  backgroundColor: colors.brand.solar,
                }}
              />
            </>
          ) : (
            // Solid fill (Prototype B)
            <div
              style={{
                position: "absolute",
                left: "20%",
                width: "50%",
                top: 0,
                bottom: 0,
                backgroundColor: colors.brand.solar,
                borderRadius: radius.sm,
              }}
            />
          )}
          <div style={{ position: "absolute", left: "20%", bottom: -18, fontFamily: fonts.family.sans, fontSize: fonts.size.xs, color: colors.text.muted }}>
            15:00
          </div>
          <div style={{ position: "absolute", right: "30%", bottom: -18, fontFamily: fonts.family.sans, fontSize: fonts.size.xs, color: colors.text.muted }}>
            17:00
          </div>
        </div>
      </div>

      {/* Grid Pricing */}
      <div
        style={{
          backgroundColor: colors.bg.surface,
          border: `1px solid ${colors.border.default}`,
          borderRadius: radius.md,
          padding: space[4],
          marginBottom: space[3],
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: space[2], marginBottom: space[2] }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={colors.ai.decision} strokeWidth="2">
            <line x1="12" y1="1" x2="12" y2="23" />
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
          <h3
            style={{
              fontFamily: fonts.family.sans,
              fontSize: fonts.size.body,
              fontWeight: fonts.weight.semibold,
              color: colors.text.primary,
              margin: 0,
            }}
          >
            Grid Pricing
          </h3>
        </div>
        <p
          style={{
            fontFamily: fonts.family.sans,
            fontSize: fonts.size.sm,
            color: colors.text.secondary,
            margin: 0,
            marginBottom: space[2],
            lineHeight: 1.5,
          }}
        >
          Off-peak tariff (£0.10/kWh) until 18:00, then peak rate (£0.35/kWh).
        </p>
        {/* Two-segment pricing bar */}
        <div style={{ display: "flex", height: 24, gap: 2 }}>
          <div
            style={{
              flex: "0 0 75%",
              backgroundColor: colors.semantic.success,
              borderRadius: radius.sm,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span style={{ fontFamily: fonts.family.sans, fontSize: fonts.size.xs, fontWeight: fonts.weight.semibold, color: "#fff" }}>
              Off-peak
            </span>
          </div>
          <div
            style={{
              flex: 1,
              backgroundColor: colors.ai.decision,
              borderRadius: radius.sm,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span style={{ fontFamily: fonts.family.sans, fontSize: fonts.size.xs, fontWeight: fonts.weight.semibold, color: "#fff" }}>
              Peak
            </span>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: space[1] }}>
          <span style={{ fontFamily: fonts.family.sans, fontSize: fonts.size.xs, color: colors.text.muted }}>00:00</span>
          <span style={{ fontFamily: fonts.family.sans, fontSize: fonts.size.xs, color: colors.text.muted }}>18:00</span>
          <span style={{ fontFamily: fonts.family.sans, fontSize: fonts.size.xs, color: colors.text.muted }}>23:59</span>
        </div>
      </div>

      {/* Battery Headroom */}
      <div
        style={{
          backgroundColor: colors.bg.surface,
          border: `1px solid ${colors.border.default}`,
          borderRadius: radius.md,
          padding: space[4],
          marginBottom: space[4],
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: space[2], marginBottom: space[2] }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={colors.brand.battery} strokeWidth="2">
            <rect x="1" y="6" width="18" height="12" rx="2" ry="2" />
            <line x1="23" y1="13" x2="23" y2="11" />
          </svg>
          <h3
            style={{
              fontFamily: fonts.family.sans,
              fontSize: fonts.size.body,
              fontWeight: fonts.weight.semibold,
              color: colors.text.primary,
              margin: 0,
            }}
          >
            Battery Headroom
          </h3>
        </div>
        <p
          style={{
            fontFamily: fonts.family.sans,
            fontSize: fonts.size.sm,
            color: colors.text.secondary,
            margin: 0,
            marginBottom: space[2],
            lineHeight: 1.5,
          }}
        >
          Current SOC: 30% — sufficient capacity to store solar generation.
        </p>
        {/* Battery fill indicator */}
        <div style={{ position: "relative", height: 24, backgroundColor: colors.border.subtle, borderRadius: radius.sm }}>
          <div
            style={{
              position: "absolute",
              left: 0,
              width: "30%",
              top: 0,
              bottom: 0,
              backgroundColor: colors.brand.battery,
              borderRadius: radius.sm,
            }}
          />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: space[1] }}>
          <span style={{ fontFamily: fonts.family.sans, fontSize: fonts.size.xs, color: colors.text.muted }}>0%</span>
          <span style={{ fontFamily: fonts.family.sans, fontSize: fonts.size.xs, fontWeight: fonts.weight.semibold, color: colors.brand.battery }}>
            30%
          </span>
          <span style={{ fontFamily: fonts.family.sans, fontSize: fonts.size.xs, color: colors.text.muted }}>100%</span>
        </div>
      </div>

      {/* Consequence statement (DR6) */}
      <div
        style={{
          backgroundColor: colors.semantic.success + "11",
          border: `1px solid ${colors.semantic.success}`,
          borderRadius: radius.md,
          padding: space[4],
        }}
      >
        <p
          style={{
            fontFamily: fonts.family.sans,
            fontSize: fonts.size.sm,
            fontWeight: fonts.weight.semibold,
            color: colors.text.primary,
            margin: 0,
            lineHeight: 1.6,
          }}
        >
          💰 Charging now rather than during peak hours saves an estimated <strong style={{ color: colors.semantic.success }}>£0.42</strong>.
        </p>
      </div>
    </div>
  );
}