// App.jsx
import React, { Suspense, lazy } from "react";
import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";

import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { Box, CircularProgress } from "@mui/material";

import { AuthContextProvider, useAuth } from "./context/authContext";
import { ColorModeContext, useMode } from "./theme";

// Layouts
import AppLayout from "./layouts/AppLayout";
import PublicLayout from "./layouts/PublicLayout";

// Scenes (lazy for code-splitting)
const Admin = lazy(() => import("./scenes/admin"));
const AnalyticsHub = lazy(() => import("./scenes/analytics-hub"));
const EvaluatePage = lazy(() => import("./scenes/assess"));
const AuditLogs = lazy(() => import("./scenes/audit-logs"));
const CollaborationDashboard = lazy(() => import("./scenes/collaborationdashboard"));
const Dashboard = lazy(() => import("./scenes/dashboard"));
const ForgotPassword = lazy(() => import("./scenes/forgotpassword"));
const Login = lazy(() => import("./scenes/login"));
const LSEEDSignup = lazy(() => import("./scenes/lseed-signup"));
const MentorAnalytics = lazy(() => import("./scenes/mentoranalytics"));
const Mentors = lazy(() => import("./scenes/mentors"));
const Mentorships = lazy(() => import("./scenes/mentorships"));
const ProfilePage = lazy(() => import("./scenes/profile"));
const ProgramPage = lazy(() => import("./scenes/programs"));
const Reports = lazy(() => import("./scenes/reports"));
const ResetPassword = lazy(() => import("./scenes/resetpassword"));
const Scheduling = lazy(() => import("./scenes/scheduling"));
const SEAnalytics = lazy(() => import("./scenes/seanalytics"));
const SocialEnterprise = lazy(() => import("./scenes/socialenterprise"));
const Unauthorized = lazy(() => import("./scenes/unauthorized"));

/* =========================
   Roles & Guard Utilities
   ========================= */
const ROLES = {
  ADMIN: "Administrator",
  DIRECTOR: "LSEED-Director",
  COORD: "LSEED-Coordinator",
  MENTOR: "Mentor",
  GUEST: "Guest User",
};

const PRIVILEGED = []; // no blanket bypass

function getUserRoles(user) {
  if (!user?.roles) return [];
  return Array.isArray(user.roles)
    ? user.roles
    : String(user.roles)
        .split(",")
        .map((r) => r.trim())
        .filter(Boolean);
}

function hasAnyRole(userRoles, allowed) {
  return userRoles.some((r) => allowed.includes(r));
}

function isAuthorized(user, allowedRoles) {
  const roles = getUserRoles(user);
  if (hasAnyRole(roles, PRIVILEGED)) return true;
  return hasAnyRole(roles, allowedRoles);
}

/* Dashboards are for LSEED users + mentors only */
const DASHBOARD_ROLES = [ROLES.DIRECTOR, ROLES.COORD, ROLES.MENTOR];

/* ===============
   Route Guards
   =============== */
function ProtectedRoute({ allowedRoles }) {
  const { user } = useAuth();

  if (!user) return <Navigate to="/" replace />;

  if (!isAuthorized(user, allowedRoles)) {
    return <Navigate to="/unauthorized" replace />;
  }
  return <Outlet />;
}

/* ======================
   Loading Fallback UI
   ====================== */
function LoadingScreen() {
  return (
    <Box sx={{ minHeight: "60vh", display: "grid", placeItems: "center" }}>
      <CircularProgress />
    </Box>
  );
}

/* =======================
   Main Route Collection
   ======================= */
function MainContent() {
  const { user, loading, isMentorView } = useAuth();

  if (loading) return <LoadingScreen />;

  const roles = getUserRoles(user);
  const hasDashboardAccess = hasAnyRole(roles, DASHBOARD_ROLES);

  // Default home redirect logic
  const homeRedirect = user
    ? roles.includes(ROLES.ADMIN)
      ? "/admin"
      : hasDashboardAccess
        ? (isMentorView ? "/dashboard/mentor" : "/dashboard/lseed")
        : "/unauthorized"
    : "/";

  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        {/* PUBLIC (no AppLayout) */}
        <Route element={<PublicLayout />}>
          <Route path="/lseed-signup" element={<LSEEDSignup />} />
          <Route
            path="/"
            element={user ? <Navigate to={homeRedirect} replace /> : <Login />}
          />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/unauthorized" element={<Unauthorized />} />
        </Route>

        {/* PROTECTED (with AppLayout) */}
        <Route element={<AppLayout />}>
          {/* Common */}
          <Route path="/profile" element={<ProfilePage />} />

          {/* DASHBOARD (restricted to LSEED users + mentors) */}
          <Route element={<ProtectedRoute allowedRoles={DASHBOARD_ROLES} />}>
            <Route
              path="/dashboard"
              element={
                <Navigate
                  to={isMentorView ? "/dashboard/mentor" : "/dashboard/lseed"}
                  replace
                />
              }
            />
            <Route path="/dashboard/lseed" element={<Dashboard />} />
            <Route path="/dashboard/mentor" element={<Dashboard />} />
          </Route>

          {/* Coordinator/Director */}
          <Route
            element={<ProtectedRoute allowedRoles={[ROLES.DIRECTOR, ROLES.COORD]} />}
          >
            <Route path="/socialenterprise" element={<SocialEnterprise />} />
            <Route path="/mentors" element={<Mentors />} />
            <Route path="/programs" element={<ProgramPage />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/evaluate" element={<EvaluatePage />} />
            <Route path="/analytics" element={<AnalyticsHub />} />
          </Route>

          {/* Mentor + Coordinator/Director (assess/scheduling) */}
          <Route
            element={
              <ProtectedRoute
                allowedRoles={[ROLES.DIRECTOR, ROLES.COORD, ROLES.MENTOR]}
              />
            }
          >
            <Route path="/assess" element={<EvaluatePage />} />
            <Route path="/scheduling" element={<Scheduling />} />
          </Route>

          {/* Mentor-only */}
          <Route element={<ProtectedRoute allowedRoles={[ROLES.MENTOR]} />}>
            <Route path="/mentorships" element={<Mentorships />} />
            <Route path="/mentor-analytics/:id" element={<MentorAnalytics />} />
            <Route path="/collaboration-dashboard" element={<CollaborationDashboard />} />
          </Route>

          {/* Admin only */}
          <Route element={<ProtectedRoute allowedRoles={[ROLES.ADMIN]} />}>
            <Route path="/audit-logs" element={<AuditLogs />} />
          </Route>

          {/* Admin & Directors only */}
          <Route element={<ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.DIRECTOR]} />}>
            <Route path="/admin" element={<Admin />} />
          </Route>

          {/* SE analytics (wide access) */}
          <Route
            element={
              <ProtectedRoute
                allowedRoles={[ROLES.COORD, ROLES.MENTOR, ROLES.GUEST, ROLES.DIRECTOR]}
              />
            }
          >
            <Route path="/se-analytics/:id" element={<SEAnalytics />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to={user ? "/dashboard" : "/"} />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

/* =========
   App root
   ========= */
export default function App() {
  const [theme, colorMode] = useMode();

  return (
    <GoogleOAuthProvider clientId="1025918978584-niisk93pun37oujtrjdkpra1cn1b8esv.apps.googleusercontent.com">
      <AuthContextProvider>
        <ColorModeContext.Provider value={colorMode}>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            <Box sx={{ display: "flex", minHeight: "100vh" }}>
              <MainContent />
            </Box>
          </ThemeProvider>
        </ColorModeContext.Provider>
      </AuthContextProvider>
    </GoogleOAuthProvider>
  );
}