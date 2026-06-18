"use client";

import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";
import LogoutIcon from "@mui/icons-material/Logout";
import ManageAccountsIcon from "@mui/icons-material/ManageAccounts";
import MenuIcon from "@mui/icons-material/Menu";
import MenuOpenIcon from "@mui/icons-material/MenuOpen";
import DashboardIcon from "@mui/icons-material/Dashboard";
import StorefrontIcon from "@mui/icons-material/Storefront";
import RestaurantMenuIcon from "@mui/icons-material/RestaurantMenu";
import CategoryIcon from "@mui/icons-material/Category";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import ViewCarouselIcon from "@mui/icons-material/ViewCarousel";
import LocalOfferIcon from "@mui/icons-material/LocalOffer";
import TwoWheelerIcon from "@mui/icons-material/TwoWheeler";
import PeopleIcon from "@mui/icons-material/People";
import NotificationsIcon from "@mui/icons-material/Notifications";
import {
  AppBar,
  Avatar,
  Box,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Toolbar,
  Tooltip,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import MotionContent from "@/components/MotionContent";
import ProfileDialog from "@/components/ProfileDialog";
import { useColorMode } from "@/components/providers/ColorModeProvider";
import { mediaUrl } from "@/lib/api";
import { accents, tintBg, type Accent } from "@/lib/accent";
import { clearSession, getUser } from "@/lib/auth";
import type { AuthUser } from "@/lib/types";

const DRAWER_WIDTH = 248;
const DRAWER_WIDTH_COLLAPSED = 76;
const COLLAPSE_KEY = "nomly_admin_sidebar_collapsed";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  accent: Accent;
}

const NAV: NavItem[] = [
  { label: "Dashboard", href: "/", icon: <DashboardIcon />, accent: accents.orange },
  { label: "Restaurants", href: "/restaurants", icon: <StorefrontIcon />, accent: accents.blue },
  { label: "Dishes", href: "/dishes", icon: <RestaurantMenuIcon />, accent: accents.green },
  { label: "Cuisines", href: "/cuisines", icon: <CategoryIcon />, accent: accents.amber },
  { label: "Orders", href: "/orders", icon: <ReceiptLongIcon />, accent: accents.purple },
  { label: "Banners", href: "/banners", icon: <ViewCarouselIcon />, accent: accents.teal },
  { label: "Promos", href: "/promos", icon: <LocalOfferIcon />, accent: accents.pink },
  { label: "Couriers", href: "/couriers", icon: <TwoWheelerIcon />, accent: accents.red },
  { label: "Users", href: "/users", icon: <PeopleIcon />, accent: accents.indigo },
  {
    label: "Notifications",
    href: "/notifications",
    icon: <NotificationsIcon />,
    accent: accents.cyan,
  },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const reduced = useReducedMotion() ?? false;
  const { mode, toggle } = useColorMode();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [user, setUserState] = useState<AuthUser | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    setUserState(getUser());
    const stored = window.localStorage.getItem(COLLAPSE_KEY);
    if (stored === "1") setCollapsed(true);
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      window.localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      return next;
    });
  };

  const handleLogout = () => {
    clearSession();
    router.replace("/login");
  };

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  // On desktop the drawer width reflects the collapsed state; mobile is always full.
  const desktopWidth = collapsed ? DRAWER_WIDTH_COLLAPSED : DRAWER_WIDTH;
  const showLabels = isMobile || !collapsed;

  const drawerContent = (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <Toolbar sx={{ px: 2, justifyContent: showLabels ? "flex-start" : "center" }}>
        {showLabels ? (
          <>
            <Typography
              variant="h5"
              sx={{ fontWeight: 800, color: "primary.main" }}
            >
              Nomly
            </Typography>
            <Typography
              variant="caption"
              sx={{
                ml: 1,
                color: "text.secondary",
                alignSelf: "flex-end",
                mb: 1.2,
              }}
            >
              admin
            </Typography>
          </>
        ) : (
          <Typography variant="h5" sx={{ fontWeight: 800, color: "primary.main" }}>
            N
          </Typography>
        )}
      </Toolbar>
      <Divider />
      <List sx={{ px: 1, py: 1, flex: 1 }}>
        {NAV.map((item) => {
          const active = isActive(item.href);
          const button = (
            <ListItemButton
              component={Link}
              href={item.href}
              selected={active}
              onClick={() => isMobile && setMobileOpen(false)}
              sx={{
                borderRadius: 2,
                mb: 0.5,
                justifyContent: showLabels ? "flex-start" : "center",
                px: showLabels ? 2 : 1.5,
                "&.Mui-selected": {
                  bgcolor: "primary.main",
                  color: "primary.contrastText",
                  "&:hover": { bgcolor: "primary.dark" },
                  "& .MuiListItemIcon-root": { color: "primary.contrastText" },
                },
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: showLabels ? 40 : 0,
                  justifyContent: "center",
                  color: active ? "inherit" : item.accent.main,
                }}
              >
                {item.icon}
              </ListItemIcon>
              {showLabels && <ListItemText primary={item.label} />}
            </ListItemButton>
          );
          return (
            <Box key={item.href}>
              {showLabels ? (
                button
              ) : (
                <Tooltip title={item.label} placement="right">
                  {button}
                </Tooltip>
              )}
            </Box>
          );
        })}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <AppBar
        position="fixed"
        color="default"
        elevation={0}
        sx={{
          zIndex: (t) => t.zIndex.drawer + 1,
          borderBottom: 1,
          borderColor: "divider",
          bgcolor: "background.paper",
        }}
      >
        <Toolbar>
          <Tooltip title={isMobile ? "Menu" : collapsed ? "Expand sidebar" : "Collapse sidebar"}>
            <IconButton
              edge="start"
              onClick={() => (isMobile ? setMobileOpen(true) : toggleCollapsed())}
              sx={{ mr: 1 }}
            >
              {isMobile ? <MenuIcon /> : collapsed ? <MenuIcon /> : <MenuOpenIcon />}
            </IconButton>
          </Tooltip>
          <Typography
            variant="h6"
            sx={{ fontWeight: 800, color: "primary.main", flexGrow: 1 }}
          >
            Nomly
          </Typography>
          <Tooltip title={mode === "light" ? "Dark mode" : "Light mode"}>
            <IconButton onClick={toggle} color="inherit">
              {mode === "light" ? <DarkModeIcon /> : <LightModeIcon />}
            </IconButton>
          </Tooltip>
          <Tooltip title="Account">
            <IconButton
              onClick={(e) => setMenuAnchor(e.currentTarget)}
              sx={{ ml: 1 }}
              aria-label="account menu"
            >
              {user?.avatar ? (
                <Avatar src={mediaUrl(user.avatar)} sx={{ width: 32, height: 32 }} />
              ) : (
                <Avatar
                  sx={{
                    width: 32,
                    height: 32,
                    bgcolor: tintBg(accents.orange.main, "33"),
                    color: "primary.main",
                  }}
                >
                  {user?.name?.[0]?.toUpperCase() ?? "A"}
                </Avatar>
              )}
            </IconButton>
          </Tooltip>
          <Menu
            anchorEl={menuAnchor}
            open={!!menuAnchor}
            onClose={() => setMenuAnchor(null)}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            transformOrigin={{ vertical: "top", horizontal: "right" }}
            slotProps={{ paper: { sx: { minWidth: 220, mt: 0.5 } } }}
          >
            <Box sx={{ px: 2, py: 1 }}>
              <Typography variant="subtitle2" noWrap>
                {user?.name ?? "Account"}
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap>
                {user?.email ?? ""}
              </Typography>
            </Box>
            <Divider />
            <MenuItem
              onClick={() => {
                setMenuAnchor(null);
                setProfileOpen(true);
              }}
            >
              <ListItemIcon>
                <ManageAccountsIcon fontSize="small" color="primary" />
              </ListItemIcon>
              Edit profile
            </MenuItem>
            <MenuItem
              onClick={() => {
                setMenuAnchor(null);
                handleLogout();
              }}
            >
              <ListItemIcon>
                <LogoutIcon fontSize="small" color="error" />
              </ListItemIcon>
              Logout
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Box
        component="nav"
        sx={{ width: { md: desktopWidth }, flexShrink: { md: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: "block", md: "none" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: DRAWER_WIDTH,
            },
          }}
        >
          {drawerContent}
        </Drawer>
        <Drawer
          variant="permanent"
          open
          PaperProps={{
            component: motion.div,
            animate: { width: desktopWidth },
            transition: { duration: reduced ? 0 : 0.3, ease: [0.4, 0, 0.2, 1] },
          }}
          sx={{
            display: { xs: "none", md: "block" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: desktopWidth,
              overflowX: "hidden",
              borderRight: 1,
              borderColor: "divider",
            },
          }}
        >
          {drawerContent}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { md: `calc(100% - ${desktopWidth}px)` },
          minWidth: 0,
          transition: reduced
            ? undefined
            : theme.transitions.create("width", {
                easing: theme.transitions.easing.sharp,
                duration: 300,
              }),
        }}
      >
        <Toolbar />
        <Box sx={{ p: { xs: 2, md: 3 } }}>
          <MotionContent>{children}</MotionContent>
        </Box>
      </Box>

      {user && (
        <ProfileDialog
          open={profileOpen}
          user={user}
          onClose={() => setProfileOpen(false)}
          onSaved={(u) => setUserState(u)}
        />
      )}
    </Box>
  );
}
