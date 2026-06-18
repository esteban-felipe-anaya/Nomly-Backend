"use client";

import AccessTimeIcon from "@mui/icons-material/AccessTime";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import PaidIcon from "@mui/icons-material/Paid";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import TodayIcon from "@mui/icons-material/Today";
import {
  Alert,
  Avatar,
  Box,
  Card,
  CardContent,
  Chip,
  Grid2 as Grid,
  LinearProgress,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import { BarChart } from "@mui/x-charts/BarChart";
import { LineChart } from "@mui/x-charts/LineChart";
import { PieChart } from "@mui/x-charts/PieChart";
import { useQuery } from "@tanstack/react-query";
import { motion, useReducedMotion } from "framer-motion";
import CountUp from "@/components/CountUp";
import { api } from "@/lib/api";
import { accents, tintBg } from "@/lib/accent";
import { fadeSlideUp, scaleIn, staggerContainer } from "@/lib/motion";
import { queryKeys } from "@/lib/queryKeys";
import type { Order, OrderStatus, Paginated, Stats } from "@/lib/types";

function formatCurrency(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

const STATUS_COLOR: Record<OrderStatus, string> = {
  confirmed: accents.blue.main,
  preparing: accents.amber.main,
  picked_up: accents.purple.main,
  on_the_way: accents.orange.main,
  delivered: accents.green.main,
  cancelled: accents.pink.main,
};

const STATUS_CHIP: Record<
  OrderStatus,
  "default" | "info" | "warning" | "secondary" | "primary" | "success" | "error"
> = {
  confirmed: "info",
  preparing: "warning",
  picked_up: "secondary",
  on_the_way: "primary",
  delivered: "success",
  cancelled: "error",
};

function statusLabel(s: string): string {
  return s.replace(/_/g, " ");
}

interface Kpi {
  label: string;
  value: number;
  format: (n: number) => string;
  icon: React.ReactNode;
  color: string;
}

function KpiCard({ kpi }: { kpi: Kpi }) {
  return (
    <Card
      sx={{
        height: "100%",
        bgcolor: tintBg(kpi.color, "0d"),
        border: 1,
        borderColor: tintBg(kpi.color, "22"),
      }}
    >
      <CardContent>
        <Stack direction="row" spacing={2} alignItems="center">
          <Avatar
            sx={{
              width: 48,
              height: 48,
              bgcolor: tintBg(kpi.color, "22"),
              color: kpi.color,
            }}
          >
            {kpi.icon}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" color="text.secondary" noWrap>
              {kpi.label}
            </Typography>
            <Typography variant="h5">
              <CountUp value={kpi.value} format={kpi.format} />
            </Typography>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const reduced = useReducedMotion() ?? false;

  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.stats,
    queryFn: async () => {
      const res = await api.get<Stats>("/admin-api/stats");
      return res.data;
    },
  });

  const { data: recent } = useQuery({
    queryKey: queryKeys.orders({ recent: 6 }),
    queryFn: async () => {
      const res = await api.get<Paginated<Order>>("/admin-api/orders", {
        params: { ordering: "-placed_at", page_size: 6 },
      });
      return res.data.results;
    },
  });

  if (isError) {
    return (
      <Alert severity="error">
        Could not load dashboard statistics. Make sure the API is running.
      </Alert>
    );
  }

  const kpis: Kpi[] = data
    ? [
        {
          label: "Orders today",
          value: data.ordersToday,
          format: (n) => String(Math.round(n)),
          icon: <TodayIcon />,
          color: accents.orange.main,
        },
        {
          label: "Revenue total",
          value: data.revenueTotal,
          format: formatCurrency,
          icon: <PaidIcon />,
          color: accents.green.main,
        },
        {
          label: "Revenue today",
          value: data.revenueToday,
          format: formatCurrency,
          icon: <PaidIcon />,
          color: accents.teal.main,
        },
        {
          label: "Active orders",
          value: data.activeOrders,
          format: (n) => String(Math.round(n)),
          icon: <LocalShippingIcon />,
          color: accents.blue.main,
        },
        {
          label: "Avg delivery",
          value: data.avgDeliveryMinutes,
          format: (n) => `${Math.round(n)} min`,
          icon: <AccessTimeIcon />,
          color: accents.purple.main,
        },
      ]
    : [];

  // Status breakdown from recent orders for the donut.
  const statusCounts = (recent ?? []).reduce<Record<string, number>>(
    (acc, o) => {
      acc[o.status] = (acc[o.status] ?? 0) + 1;
      return acc;
    },
    {},
  );
  const statusData = Object.entries(statusCounts).map(([status, count], i) => ({
    id: i,
    value: count,
    label: statusLabel(status),
    color: STATUS_COLOR[status as OrderStatus] ?? accents.indigo.main,
  }));

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Dashboard
      </Typography>

      {/* KPI cards: stagger-in */}
      <Box
        component={motion.div}
        variants={staggerContainer(reduced)}
        initial="hidden"
        animate="visible"
      >
        <Grid container spacing={2.5} sx={{ mb: 1 }}>
          {isLoading
            ? Array.from({ length: 5 }).map((_, i) => (
                <Grid key={i} size={{ xs: 12, sm: 6, md: 4, lg: 2.4 }}>
                  <Skeleton variant="rounded" height={96} />
                </Grid>
              ))
            : kpis.map((k) => (
                <Grid
                  key={k.label}
                  size={{ xs: 12, sm: 6, md: 4, lg: 2.4 }}
                  component={motion.div}
                  variants={fadeSlideUp(reduced)}
                >
                  <KpiCard kpi={k} />
                </Grid>
              ))}
        </Grid>
      </Box>

      {/* Charts + sections: stagger-in */}
      <Box
        component={motion.div}
        variants={staggerContainer(reduced)}
        initial="hidden"
        animate="visible"
      >
        <Grid container spacing={2.5} sx={{ mt: 0.5 }}>
          <Grid
            size={{ xs: 12, lg: 7 }}
            component={motion.div}
            variants={fadeSlideUp(reduced)}
          >
            <Card sx={{ height: "100%" }}>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 1 }}>
                  Orders over time
                </Typography>
                {isLoading || !data ? (
                  <LinearProgress />
                ) : (
                  <Box
                    component={motion.div}
                    variants={scaleIn(reduced)}
                    sx={{ width: "100%" }}
                  >
                    <LineChart
                      height={300}
                      skipAnimation={reduced}
                      sx={{
                        "& .MuiAreaElement-root": {
                          fill: "url(#ordersGradient)",
                        },
                      }}
                      xAxis={[
                        {
                          scaleType: "point",
                          data: data.ordersOverTime.map((d) => d.date.slice(5)),
                        },
                      ]}
                      series={[
                        {
                          data: data.ordersOverTime.map((d) => d.orders),
                          label: "Orders",
                          color: accents.orange.main,
                          area: true,
                          showMark: false,
                        },
                      ]}
                    >
                      <defs>
                        <linearGradient
                          id="ordersGradient"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="0%"
                            stopColor={accents.orange.main}
                            stopOpacity={0.5}
                          />
                          <stop
                            offset="100%"
                            stopColor={accents.orange.main}
                            stopOpacity={0.02}
                          />
                        </linearGradient>
                      </defs>
                    </LineChart>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid
            size={{ xs: 12, lg: 5 }}
            component={motion.div}
            variants={fadeSlideUp(reduced)}
          >
            <Card sx={{ height: "100%" }}>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 1 }}>
                  Revenue by cuisine
                </Typography>
                {isLoading || !data ? (
                  <LinearProgress />
                ) : (
                  <Box component={motion.div} variants={scaleIn(reduced)}>
                    <BarChart
                      height={300}
                      skipAnimation={reduced}
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
                          color: accents.green.main,
                          valueFormatter: (v) =>
                            v == null ? "" : formatCurrency(v),
                        },
                      ]}
                    />
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid
            size={{ xs: 12, md: 7 }}
            component={motion.div}
            variants={fadeSlideUp(reduced)}
          >
            <Card sx={{ height: "100%" }}>
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

          <Grid
            size={{ xs: 12, md: 5 }}
            component={motion.div}
            variants={fadeSlideUp(reduced)}
          >
            <Card sx={{ height: "100%" }}>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 1 }}>
                  Order status
                </Typography>
                {!recent ? (
                  <LinearProgress />
                ) : statusData.length === 0 ? (
                  <Typography color="text.secondary">No recent orders.</Typography>
                ) : (
                  <Box component={motion.div} variants={scaleIn(reduced)}>
                    <PieChart
                      height={260}
                      skipAnimation={reduced}
                      series={[
                        {
                          data: statusData,
                          innerRadius: 60,
                          paddingAngle: 2,
                          cornerRadius: 4,
                        },
                      ]}
                    />
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid
            size={{ xs: 12 }}
            component={motion.div}
            variants={fadeSlideUp(reduced)}
          >
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Recent orders
                </Typography>
                {!recent ? (
                  <LinearProgress />
                ) : recent.length === 0 ? (
                  <Typography color="text.secondary">No orders yet.</Typography>
                ) : (
                  <Stack divider={<Box sx={{ borderBottom: 1, borderColor: "divider" }} />}>
                    {recent.map((o) => (
                      <Stack
                        key={o.id}
                        direction="row"
                        alignItems="center"
                        spacing={2}
                        sx={{ py: 1 }}
                      >
                        <Typography
                          variant="body2"
                          sx={{ fontFamily: "monospace", color: "text.secondary" }}
                        >
                          {o.id}
                        </Typography>
                        <Typography variant="body2" sx={{ flex: 1, minWidth: 0 }} noWrap>
                          {o.restaurant_name ?? "—"}
                        </Typography>
                        <Typography variant="body2" sx={{ width: 90, textAlign: "right" }}>
                          {formatCurrency(o.total)}
                        </Typography>
                        <Chip
                          size="small"
                          label={statusLabel(o.status)}
                          color={STATUS_CHIP[o.status] ?? "default"}
                          sx={{ textTransform: "capitalize", width: 110 }}
                        />
                      </Stack>
                    ))}
                  </Stack>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
}
