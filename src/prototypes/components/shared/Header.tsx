import { colors, fonts, space, radius } from "../../tokens";

interface HeaderProps {
  batterySOC: number; // 0-100
  chargingState: "charging-solar" | "charging-grid" | "discharging" | "idle";
}

/**
 * Header — app title, current date display, battery status indicator.
 * No AI content here (per DR requirements).
 * 
 * Battery status pill shows:
 * - Battery icon with fill proportional to SOC
 * - SOC percentage
 * - Charging state indicator (bolt up/down/dash)
 * - Background color: green for solar charging, amber for grid charging, neutral for idle/discharging
 */
export function Header({ batterySOC, chargingState }: HeaderProps) {
  const today = new Date();
  const dateStr = today.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // Battery pill background color based on charging state
  const pillBgColor = {
    "charging-solar": "#FFF8E1", // soft amber
    "charging-grid": "#FFF8E1", // soft amber
    "discharging": "#E8F5E9", // soft green
    "idle": "#E8F5E9", // soft green
  }[chargingState];

  const pillBorderColor = {
    "charging-solar": "#FFB74D",
    "charging-grid": "#FFB74D",
    "discharging": "#81C784",
    "idle": "#81C784",
  }[chargingState];

  const pillTextColor = {
    "charging-solar": "#F57C00",
    "charging-grid": "#F57C00",
    "discharging": "#2E7D32",
    "idle": "#2E7D32",
  }[chargingState];

  // Charging state icon
  const renderChargingIcon = () => {
    if (chargingState === "charging-solar" || chargingState === "charging-grid") {
      // Upward bolt
      return (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M6.5 1L2 6.5h3L5 11l4.5-5.5h-3L6.5 1z" fill={pillTextColor} />
        </svg>
      );
    } else if (chargingState === "discharging") {
      // Downward bolt
      return (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M5.5 11L10 5.5h-3L7 1 2.5 6.5h3L5.5 11z" fill={pillTextColor} />
        </svg>
      );
    } else {
      // Dash (idle)
      return (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <rect x="2" y="5.5" width="8" height="1" fill={colors.text.muted} />
        </svg>
      );
    }
  };

  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        paddingBottom: space[4],
        marginBottom: space[6],
        borderBottom: `1px solid ${colors.border.default}`,
      }}
    >
      <div>
        <h1
          style={{
            fontFamily: fonts.family.sans,
            fontSize: fonts.size.h2,
            fontWeight: fonts.weight.bold,
            color: colors.text.primary,
            margin: 0,
          }}
        >
          EnergyView
        </h1>
        <p
          style={{
            fontFamily: fonts.family.sans,
            fontSize: fonts.size.sm,
            color: colors.text.secondary,
            margin: 0,
            marginTop: space[1],
          }}
        >
          {dateStr}
        </p>
      </div>

      {/* Battery status pill */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: space[2],
          padding: `${space[2]}px ${space[3]}px`,
          borderRadius: radius.md,
          backgroundColor: pillBgColor,
          border: `1px solid ${pillBorderColor}`,
        }}
      >
        {/* Battery icon with proportional fill */}
        <div style={{ position: "relative", width: 24, height: 12 }}>
          {/* Battery body */}
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: 20,
              height: 12,
              border: `1.5px solid ${pillTextColor}`,
              borderRadius: 2,
              overflow: "hidden",
            }}
          >
            {/* Fill */}
            <div
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                bottom: 0,
                width: `${batterySOC}%`,
                backgroundColor: pillTextColor,
                transition: "width 0.3s",
              }}
            />
          </div>
          {/* Battery terminal */}
          <div
            style={{
              position: "absolute",
              right: 0,
              top: "50%",
              transform: "translateY(-50%)",
              width: 2,
              height: 6,
              backgroundColor: pillTextColor,
              borderRadius: "0 1px 1px 0",
            }}
          />
        </div>

        {/* SOC percentage */}
        <span
          style={{
            fontFamily: fonts.family.sans,
            fontSize: fonts.size.sm,
            fontWeight: fonts.weight.semibold,
            color: pillTextColor,
          }}
        >
          {batterySOC}%
        </span>

        {/* Charging state indicator - only show when actively charging */}
        {(chargingState === "charging-solar" || chargingState === "charging-grid" || chargingState === "discharging") && (
          <div style={{ display: "flex", alignItems: "center" }}>
            {renderChargingIcon()}
          </div>
        )}
      </div>
    </header>
  );
}
