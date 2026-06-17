"use client";

import AccessTimeIcon from "@mui/icons-material/AccessTime";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import PaidIcon from "@mui/icons-material/Paid";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import {
  Alert,
  Box,
  Card,
  CardContent,
  Grid2 as Grid,
  LinearProgress,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import { BarChart } from "@mui/x-charts/BarChart";
import { LineChart } from "@mui/x-charts/LineChart";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";
import type { Stats } from "@/lib/types";

function formatCurrency(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function KpiCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <Card sx={{ height: "100%" }}>
      <CardContent>
        <Stack direction="row" spacing={2} alignItems="center">
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 2,
              bgcolor: color,
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {icon}
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">
              {label}
            </Typography>
            <Typography variant="h5">{value}</Typography>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.stats,
    queryFn: async () => {
      const res = await api.get<Stats>("/admin-api/stats");
      return res.data;
    },
  });

  if (isError) {
    return (
      <Alert severity="error">
        Could not load dashboard statistics. Make sure the API is running.
      </Alert>
    );
  }

  const kpis = data
    ? [
        {
          label: "Orders today",
          value: String(data.ordersToday),
          icon: <ReceiptLongIcon />,
          color: "#E0531F",
        },
        {
          label: "Revenue total",
          value: formatCurrency(data.revenueTotal),
          icon: <PaidIcon />,
          color: "#2E9E5B",
        },
        {
          label: "Active orders",
          value: String(data.activeOrders),
          icon: <LocalShippingIcon />,
          color: "#1976D2",
        },
        {
          label: "Avg delivery",
          value: `${data.avgDeliveryMinutes} min`,
          icon: <AccessTimeIcon />,
          color: "#8E24AA",
        },
      ]
    : [];

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Dashboard
      </Typography>

      <Grid container spacing={2.5} sx={{ mb: 1 }}>
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Grid key={i} size={{ xs: 12, sm: 6, md: 3 }}>
                <Skeleton variant="rounded" height={96} />
              </Grid>
            ))
          : kpis.map((k) => (
              <Grid key={k.label} size={{ xs: 12, sm: 6, md: 3 }}>
                <KpiCard {...k} />
              </Grid>
            ))}
      </Grid>

      <Grid container spacing={2.5} sx={{ mt: 0.5 }}>
        <Grid size={{ xs: 12, lg: 7 }}>
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 1 }}>
                Orders over time
              </Typography>
              {isLoading || !data ? (
                <LinearProgress />
              ) : (
                <LineChart
                  height={300}
                  xAxis={[
                    {
                      scaleType: "point",
                      data: data.ordersOverTime.map((d) =>
                        d.date.slice(5),
                      ),
                    },
                  ]}
                  series={[
                    {
                      data: data.ordersOverTime.map((d) => d.orders),
                      label: "Orders",
                      color: "#E0531F",
                      area: true,
                    },
                  ]}
                />
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, lg: 5 }}>
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 1 }}>
                Revenue by cuisine
              </Typography>
              {isLoading || !data ? (
                <LinearProgress />
              ) : (
                <BarChart
                  height={300}
                  xAxis={[
                    {
                      scaleType: "band",
                      data: data.revenueByCuisine.map((d) => d.cuisine),
                    },
                  ]}
                  series={[
                    {
                      data: data.revenueByCuisine.map((d) => d.revenue),
                      label: "Revenue",
                      color: "#2E9E5B",
                    },
                  ]}
                />
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Top restaurants
              </Typography>
              {isLoading || !data ? (
                <LinearProgress />
              ) : data.topRestaurants.length === 0 ? (
                <Typography color="text.secondary">No data yet.</Typography>
              ) : (
                <Stack spacing={1.5}>
                  {(() => {
                    const max = Math.max(
                      ...data.topRestaurants.map((r) => r.orders),
                      1,
                    );
                    return data.topRestaurants.map((r) => (
                      <Box key={r.name}>
                        <Stack
                          direction="row"
                          justifyContent="space-between"
                          sx={{ mb: 0.5 }}
                        >
                          <Typography variant="body2">{r.name}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {r.orders} orders · {formatCurrency(r.revenue)}
                          </Typography>
                        </Stack>
                        <LinearProgress
                          variant="determinate"
                          value={(r.orders / max) * 100}
                          sx={{ height: 8, borderRadius: 4 }}
                        />
                      </Box>
                    ));
                  })()}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
