"use client";

import { Alert, Snackbar, type AlertColor } from "@mui/material";
import { createContext, useCallback, useContext, useState } from "react";

interface SnackbarState {
  open: boolean;
  message: string;
  severity: AlertColor;
}

interface SnackbarContextValue {
  notify: (message: string, severity?: AlertColor) => void;
}

const SnackbarContext = createContext<SnackbarContextValue>({
  notify: () => {},
});

export function useSnackbar(): SnackbarContextValue {
  return useContext(SnackbarContext);
}

export default function SnackbarProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [state, setState] = useState<SnackbarState>({
    open: false,
    message: "",
    severity: "success",
  });

  const notify = useCallback(
    (message: string, severity: AlertColor = "success") => {
      setState({ open: true, message, severity });
    },
    [],
  );

  const handleClose = useCallback(() => {
    setState((s) => ({ ...s, open: false }));
  }, []);

  return (
    <SnackbarContext.Provider value={{ notify }}>
      {children}
      <Snackbar
        open={state.open}
        autoHideDuration={4000}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={handleClose}
          severity={state.severity}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {state.message}
        </Alert>
      </Snackbar>
    </SnackbarContext.Provider>
  );
}
