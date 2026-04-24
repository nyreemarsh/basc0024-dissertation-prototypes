import { colors, fonts, space, radius } from "../../tokens";

/**
 * DecisionCard — timestamped AI action card (DR7 minimum).
 * Uses color/ai/decision exclusively for the AI decision hue (DR11 safeguard).
 */
export function DecisionCard() {
  // Derive charging state from system clock
  const now = new Date();
  const currentHour = now.getHours();
  const chargeStart = 14;
  const chargeEnd = 16;
  
  // Determine charging state
  const isBeforeCharge = currentHour < chargeStart;
  const isCharging = currentHour >= chargeStart && currentHour < chargeEnd;
  const isCharged = currentHour >= chargeEnd;
  
  // Get notification message
  let notificationMessage = "";
  if (isBeforeCharge) {
    notificationMessage = "Your battery is scheduled to charge today at 14:00. Charging will complete by 16:00.";
  } else if (isCharging) {
    notificationMessage = "Your battery is charging now. Started at 14:00, scheduled to complete by 16:00.";
  } else if (isCharged) {
    notificationMessage = "Your battery finished charging today at 16:00. Battery is now at 100%.";
  }
  
  return (
    <div
      style={{
        backgroundColor: colors.bg.surface,
        border: `2px solid ${colors.ai.decision}`,
        borderRadius: radius.lg,
        padding: space[4],
        marginBottom: space[4],
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: space[3], marginBottom: space[2] }}>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: radius.md,
            backgroundColor: colors.ai.decision + "22",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={colors.ai.decision} strokeWidth="2">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
          </svg>
        </div>
        <div style={{ flex: 1 }}>
          <p
            style={{
              fontFamily: fonts.family.sans,
              fontSize: fonts.size.xs,
              fontWeight: fonts.weight.semibold,
              color: colors.text.secondary,
              margin: 0,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            AI Decision
          </p>
          <h3
            style={{
              fontFamily: fonts.family.sans,
              fontSize: fonts.size.lg,
              fontWeight: fonts.weight.bold,
              color: colors.text.primary,
              margin: 0,
              marginTop: 2,
            }}
          >
            {isCharged ? "Battery charged" : "Charging battery"}
          </h3>
        </div>
      </div>
      
      {/* Notification message */}
      <div
        style={{
          backgroundColor: colors.ai.decision + "11",
          border: `1px solid ${colors.ai.decision}33`,
          borderRadius: radius.md,
          padding: space[3],
          marginBottom: space[3],
        }}
      >
        <p
          style={{
            fontFamily: fonts.family.sans,
            fontSize: fonts.size.sm,
            color: colors.text.primary,
            margin: 0,
          }}
        >
          {notificationMessage}
        </p>
      </div>

      <div
        style={{
          display: "flex",
          gap: space[4],
          paddingTop: space[3],
          borderTop: `1px solid ${colors.border.subtle}`,
        }}
      >
        <div>
          <p
            style={{
              fontFamily: fonts.family.sans,
              fontSize: fonts.size.xs,
              color: colors.text.secondary,
              margin: 0,
            }}
          >
            Start time
          </p>
          <p
            style={{
              fontFamily: fonts.family.sans,
              fontSize: fonts.size.body,
              fontWeight: fonts.weight.semibold,
              color: colors.ai.decision,
              margin: 0,
              marginTop: 2,
            }}
          >
            14:00
          </p>
        </div>
        <div>
          <p
            style={{
              fontFamily: fonts.family.sans,
              fontSize: fonts.size.xs,
              color: colors.text.secondary,
              margin: 0,
            }}
          >
            Expected completion
          </p>
          <p
            style={{
              fontFamily: fonts.family.sans,
              fontSize: fonts.size.body,
              fontWeight: fonts.weight.semibold,
              color: colors.text.primary,
              margin: 0,
              marginTop: 2,
            }}
          >
            16:00
          </p>
        </div>
        <div>
          <p
            style={{
              fontFamily: fonts.family.sans,
              fontSize: fonts.size.xs,
              color: colors.text.secondary,
              margin: 0,
            }}
          >
            Magnitude
          </p>
          <p
            style={{
              fontFamily: fonts.family.sans,
              fontSize: fonts.size.body,
              fontWeight: fonts.weight.semibold,
              color: colors.text.primary,
              margin: 0,
              marginTop: 2,
            }}
          >
            0 → 100%
          </p>
        </div>
      </div>
    </div>
  );
}