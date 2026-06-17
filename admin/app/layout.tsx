import { AppRouterCacheProvider } from "@mui/material-nextjs/v15-appRouter";
import type { Metadata } from "next";
import ColorModeProvider from "@/components/providers/ColorModeProvider";
import QueryProvider from "@/components/providers/QueryProvider";
import SnackbarProvider from "@/components/providers/SnackbarProvider";

export const metadata: Metadata = {
  title: "Nomly Admin",
  description: "Admin dashboard for the Nomly food-delivery platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AppRouterCacheProvider options={{ key: "mui" }}>
          <ColorModeProvider>
            <QueryProvider>
              <SnackbarProvider>{children}</SnackbarProvider>
            </QueryProvider>
          </ColorModeProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
