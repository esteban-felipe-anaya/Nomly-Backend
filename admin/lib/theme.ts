"use client";

import { createTheme, type Theme } from "@mui/material/styles";

export function buildTheme(mode: "light" | "dark"): Theme {
  return createTheme({
    palette: {
      mode,
      primary: { main: "#E0531F" },
      secondary: { main: "#2E9E5B" },
      success: { main: "#2E9E5B" },
      background:
        mode === "light"
          ? { default: "#FAF7F5", paper: "#FFFFFF" }
          : { default: "#161311", paper: "#1F1B19" },
    },
    shape: { borderRadius: 14 },
    typography: {
      fontFamily:
        'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      h4: { fontWeight: 700 },
      h5: { fontWeight: 700 },
      h6: { fontWeight: 600 },
      button: { textTransform: "none", fontWeight: 600 },
    },
    components: {
      MuiCard: {
        styleOverrides: {
          root: { borderRadius: 16 },
        },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: { root: { borderRadius: 12 } },
      },
      MuiPaper: {
        styleOverrides: { rounded: { borderRadius: 16 } },
      },
    },
  });
}
