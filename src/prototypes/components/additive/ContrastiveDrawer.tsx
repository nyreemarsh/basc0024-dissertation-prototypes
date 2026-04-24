import { useState } from "react";
import { colors, fonts, space, radius, shadows } from "../../tokens";

/**
 * ContrastiveDrawer — "Why this decision, not another?" drawer with
 * contrastive reasoning components (DR10).
 * 
 * Contains:
 * 1. Two-column decision comparison (actual vs. counterfactual)
 * 2. Mini comparison chart showing both SOC trajectories
 * 3. What-if scenario chips
 * 
 * Used by: Prototype D only
 */
export function ContrastiveDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null);

  const scenarios = [
    "If solar forecast was 50% lower",
    "If peak tariff started at 16:00",
    "If battery started at 30% charge",
  ];

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(true)}
        style={{
          width: "100%",
          padding: space[4],
          borderRadius: radius.lg,
          border: `2px solid ${colors.ai.decision}`,
          backgroundColor: colors.ai.decision + "11",
          cursor: "pointer",
          fontFamily: fonts.family.sans,
          fontSize: fonts.size.body,
          fontWeight: fonts.weight.semibold,
          color: colors.ai.decision,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: space[2],
          transition: "all 0.2s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = colors.ai.decision + "22";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = colors.ai.decision + "11";
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={colors.ai.decision} strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
        Why this decision, not another?
      </button>

      {/* Drawer overlay */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setIsOpen(false)}
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(28, 28, 46, 0.4)",
              zIndex: 100,
            }}
          />

          {/* Drawer panel */}
          <div
            style={{
              position: "fixed",
              bottom: 0,
              left: 0,
              right: 0,
              maxHeight: "70vh",
              backgroundColor: colors.bg.surfaceElevated,
              borderRadius: `${radius.drawer}px ${radius.drawer}px 0 0`,
              boxShadow: shadows.drawer,
              zIndex: 101,
              overflowY: "auto",
              padding: space[6],
            }}
          >
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: space[6] }}>
              <h2
                style={{
                  fontFamily: fonts.family.sans,
                  fontSize: fonts.size.h2,
                  fontWeight: fonts.weight.bold,
                  color: colors.text.primary,
                  margin: 0,
                }}
              >
                Why this decision, not another?
              </h2>
              <button
                onClick={() => setIsOpen(false)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: radius.md,
                  border: `1px solid ${colors.border.default}`,
                  backgroundColor: "transparent",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={colors.text.secondary} strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Two-column decision comparison */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: space[4], marginBottom: space[6] }}>
              {/* Actual decision */}
              <div
                style={{
                  backgroundColor: colors.bg.surface,
                  border: `2px solid ${colors.ai.decision}`,
                  borderRadius: radius.lg,
                  padding: space[4],
                  position: "relative",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: -12,
                    left: space[4],
                    padding: `${space[1]}px ${space[3]}px`,
                    borderRadius: radius.sm,
                    backgroundColor: colors.ai.decision,
                    fontFamily: fonts.family.sans,
                    fontSize: fonts.size.xs,
                    fontWeight: fonts.weight.bold,
                    color: "#fff",
                  }}
                >
                  SELECTED
                </div>
                <h3
                  style={{
                    fontFamily: fonts.family.sans,
                    fontSize: fonts.size.lg,
                    fontWeight: fonts.weight.semibold,
                    color: colors.text.primary,
                    margin: 0,
                    marginBottom: space[3],
                  }}
                >
                  Charge at 14:00
                </h3>
                <div style={{ fontFamily: fonts.family.sans, fontSize: fonts.size.sm, color: colors.text.secondary, lineHeight: 1.6 }}>
                  <p style={{ margin: 0, marginBottom: space[2] }}>
                    <strong>Rate:</strong> Off-peak (£0.10/kWh)
                  </p>
                  <p style={{ margin: 0, marginBottom: space[2] }}>
                    <strong>Cost:</strong> ~£0.29
                  </p>
                  <p style={{ margin: 0 }}>
                    <strong>Solar:</strong> Available by 15:00
                  </p>
                </div>
              </div>

              {/* Counterfactual */}
              <div
                style={{
                  backgroundColor: colors.bg.surface,
                  border: `1px solid ${colors.border.default}`,
                  borderRadius: radius.lg,
                  padding: space[4],
                  position: "relative",
                  opacity: 0.8,
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: -12,
                    left: space[4],
                    padding: `${space[1]}px ${space[3]}px`,
                    borderRadius: radius.sm,
                    backgroundColor: colors.semantic.warning,
                    fontFamily: fonts.family.sans,
                    fontSize: fonts.size.xs,
                    fontWeight: fonts.weight.bold,
                    color: "#fff",
                  }}
                >
                  +£0.41 MORE
                </div>
                <h3
                  style={{
                    fontFamily: fonts.family.sans,
                    fontSize: fonts.size.lg,
                    fontWeight: fonts.weight.semibold,
                    color: colors.text.primary,
                    margin: 0,
                    marginBottom: space[3],
                  }}
                >
                  Charge at 19:00
                </h3>
                <div style={{ fontFamily: fonts.family.sans, fontSize: fonts.size.sm, color: colors.text.secondary, lineHeight: 1.6 }}>
                  <p style={{ margin: 0, marginBottom: space[2] }}>
                    <strong>Rate:</strong> Peak (£0.35/kWh)
                  </p>
                  <p style={{ margin: 0, marginBottom: space[2] }}>
                    <strong>Cost:</strong> ~£0.70
                  </p>
                  <p style={{ margin: 0 }}>
                    <strong>Solar:</strong> None (post-sunset)
                  </p>
                </div>
              </div>
            </div>

            {/* Mini comparison chart placeholder */}
            <div
              style={{
                backgroundColor: colors.bg.surface,
                border: `1px solid ${colors.border.default}`,
                borderRadius: radius.lg,
                padding: space[4],
                marginBottom: space[6],
                height: 120,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div style={{ textAlign: "center" }}>
                <p
                  style={{
                    fontFamily: fonts.family.sans,
                    fontSize: fonts.size.sm,
                    color: colors.text.secondary,
                    margin: 0,
                  }}
                >
                  Mini comparison chart: 14:00–23:00 window
                </p>
                <div style={{ display: "flex", gap: space[3], marginTop: space[2], justifyContent: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: space[1] }}>
                    <div style={{ width: 24, height: 3, backgroundColor: colors.ai.decision }} />
                    <span style={{ fontFamily: fonts.family.sans, fontSize: fonts.size.xs, color: colors.text.secondary }}>
                      Actual (14:00)
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: space[1] }}>
                    <div
                      style={{
                        width: 24,
                        height: 2,
                        borderTop: `2px dashed ${colors.ai.counterfactual}`,
                      }}
                    />
                    <span style={{ fontFamily: fonts.family.sans, fontSize: fonts.size.xs, color: colors.text.secondary }}>
                      Counterfactual (19:00)
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* What-if scenario chips */}
            <div>
              <p
                style={{
                  fontFamily: fonts.family.sans,
                  fontSize: fonts.size.sm,
                  fontWeight: fonts.weight.semibold,
                  color: colors.text.primary,
                  margin: 0,
                  marginBottom: space[3],
                }}
              >
                Explore alternative conditions:
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: space[2] }}>
                {scenarios.map((scenario) => (
                  <button
                    key={scenario}
                    onClick={() => setSelectedScenario(selectedScenario === scenario ? null : scenario)}
                    style={{
                      padding: `${space[2]}px ${space[3]}px`,
                      borderRadius: radius.md,
                      border: `1px solid ${selectedScenario === scenario ? colors.ai.decision : colors.border.default}`,
                      backgroundColor: selectedScenario === scenario ? colors.ai.decision + "11" : colors.bg.surface,
                      cursor: "pointer",
                      fontFamily: fonts.family.sans,
                      fontSize: fonts.size.sm,
                      color: selectedScenario === scenario ? colors.ai.decision : colors.text.secondary,
                      fontWeight: selectedScenario === scenario ? fonts.weight.semibold : fonts.weight.regular,
                    }}
                  >
                    {scenario}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}