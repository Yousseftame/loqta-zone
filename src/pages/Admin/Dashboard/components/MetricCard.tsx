/**
 * src/pages/Admin/Dashboard/components/MetricCard.tsx
 */

import { Box, Paper } from "@mui/material";
import { colors } from "../../Products/products-data";
import type { ReactNode } from "react";

interface MetricCardProps {
  label: string;
  value: string | number;
  icon: ReactNode;
  sub?: string;
  accent?: string;
  loading?: boolean;
}

export default function MetricCard({
  label,
  value,
  icon,
  sub,
  accent = colors.primary,
  loading = false,
}: MetricCardProps) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 2, md: 2.5 },
        borderRadius: 3,
        border: `1px solid ${colors.border}`,
        bgcolor: "#fff",
        display: "flex",
        alignItems: "center",
        gap: 2,
        transition: "box-shadow 0.2s, transform 0.2s",
        "&:hover": {
          boxShadow: "0 4px 20px rgba(42,72,99,0.1)",
          transform: "translateY(-2px)",
        },
      }}
    >
      <Box
        sx={{
          width: 52,
          height: 52,
          borderRadius: 2.5,
          background: `${accent}15`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          color: accent,
        }}
      >
        {icon}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <p
          style={{
            margin: 0,
            fontSize: "0.7rem",
            fontWeight: 700,
            color: colors.textMuted,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          {label}
        </p>
        {loading ? (
          <Box
            sx={{
              mt: 0.5,
              height: 24,
              width: 80,
              borderRadius: 1,
              background:
                "linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%)",
              backgroundSize: "200% 100%",
              animation: "shimmer 1.4s infinite",
            }}
          />
        ) : (
          <p
            style={{
              margin: "2px 0 0",
              fontSize: "1.6rem",
              fontWeight: 800,
              color: colors.textPrimary,
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
            }}
          >
            {typeof value === "number" ? value.toLocaleString() : value}
          </p>
        )}
        {sub && (
          <p
            style={{
              margin: "3px 0 0",
              fontSize: "0.72rem",
              color: colors.textMuted,
              fontWeight: 500,
            }}
          >
            {sub}
          </p>
        )}
      </Box>
    </Paper>
  );
}
