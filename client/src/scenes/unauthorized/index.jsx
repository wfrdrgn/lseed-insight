import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import LoginOutlinedIcon from "@mui/icons-material/LoginOutlined";
import {
  Box,
  Button,
  Container,
  Divider,
  Link as MuiLink,
  Paper,
  Stack,
  Typography,
  useTheme,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";

// Optional: wire to your auth if available
// import { useAuth } from "../../context/authContext";
import { tokens } from "../../theme";

/**
 * A polished, accessible 403 page (Access Denied) with theme tokens integration.
 * Drop-in usage in your router:
 *   <Route path="/403" element={<Unauthorized />} />
 */
export default function Unauthorized({
  title = "403 — Access Denied",
  subtitle = "You don’t have permission to view this page.",
  homePath = "/",
  loginPath = "/login",
  supportEmail = "support@example.com",
}) {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const navigate = useNavigate();
  const location = useLocation();
  // const { user } = useAuth?.() ?? {};
  const isDark = theme.palette.mode === "dark";

  // Extract optional request id from query (?rid= or ?requestId=)
  const params = new URLSearchParams(location.search);
  const requestId = params.get("rid") || params.get("requestId") || undefined;

  useEffect(() => {
    document.title = "403 • Access Denied";
  }, []);

  // Page background uses your theme background plus a subtle radial grid tied to text color
  const pageBg = useMemo(
    () => ({
      backgroundImage: `radial-gradient(${alpha(theme.palette.text.primary, 0.06)} 1px, transparent 1px)`,
      backgroundSize: "16px 16px",
      backgroundPosition: "-8px -8px",
      backgroundColor: theme.palette.background.default,
    }),
    [theme.palette.text.primary, theme.palette.background.default]
  );

  // Accents draw from your token palette so light/dark stay consistent
  const primaryMain = theme.palette.primary.main; // already mapped from tokens in themeSettings
  const secondaryMain = theme.palette.secondary.main; // maps to colors.greenAccent[500]
  const emblemBg = alpha(primaryMain, 0.10);
  const ringColor = isDark ? colors.primary[400] : colors.primary[600];

  const handleBack = () => navigate(-1);
  const handleHome = () => navigate(homePath);
  const handleLogin = () => navigate(loginPath);

  return (
    <Box sx={{ minHeight: "100dvh", display: "flex", alignItems: "center", ...pageBg }}>
      <Container maxWidth="sm">
        <Paper
          elevation={isDark ? 8 : 4}
          sx={{
            p: { xs: 3, sm: 4 },
            borderRadius: 3,
            position: "relative",
            overflow: "hidden",
            backdropFilter: "saturate(180%) blur(3px)",
            '&:before': {
              content: '""',
              position: "absolute",
              inset: 0,
              borderRadius: 3,
              pointerEvents: "none",
              border: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
            },
          }}
          role="alert"
          aria-live="polite"
        >
          {/* Emblem */}
          <Stack alignItems="center" spacing={2} sx={{ mb: 2 }}>
            <Box
              sx={{
                width: 72,
                height: 72,
                borderRadius: "50%",
                display: "grid",
                placeItems: "center",
                bgcolor: emblemBg,
                border: `2px solid ${ringColor}`,
              }}
            >
              <LockOutlinedIcon sx={{ fontSize: 34, color: primaryMain }} />
            </Box>

            <Typography
              variant="h2"
              sx={{
                fontWeight: 800,
                letterSpacing: 1,
                lineHeight: 1,
                textAlign: "center",
                background: `linear-gradient(90deg, ${theme.palette.text.primary}, ${secondaryMain})`,
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              403
            </Typography>

            <Typography variant="h5" fontWeight={700} textAlign="center">
              {title}
            </Typography>
            <Typography variant="body1" color="text.secondary" textAlign="center">
              {subtitle}
            </Typography>
            {requestId && (
              <Typography variant="caption" color="text.disabled" textAlign="center">
                Request ID: <code>{requestId}</code>
              </Typography>
            )}
          </Stack>

          <Stack spacing={2}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} justifyContent="center">
              <Button onClick={handleBack} startIcon={<ArrowBackIosNewIcon />} variant="outlined">
                Go Back
              </Button>
              <Button onClick={handleHome} startIcon={<HomeOutlinedIcon />} variant="contained" color="primary">
                Go Home
              </Button>
              <Button onClick={handleLogin} startIcon={<LoginOutlinedIcon />} color="secondary" variant="text">
                Sign In
              </Button>
            </Stack>

            <Divider flexItem sx={{ my: 1 }} />

            <Typography variant="body2" color="text.secondary" textAlign="center">
              If you believe this is a mistake, please{' '}
              <MuiLink
                href={`mailto:${supportEmail}?subject=Access%20request&body=Request%20access%20to:%20${encodeURIComponent(
                  location.pathname
                )}${requestId ? `%0ARequestId:%20${requestId}` : ''}`}
                underline="hover"
              >
                contact support
              </MuiLink>
              .
            </Typography>
          </Stack>
        </Paper>

        {/* Footer note */}
        <Typography variant="caption" color="text.disabled" sx={{ display: "block", textAlign: "center", mt: 2 }}>
          You are seeing this page because your account lacks the required permissions.
        </Typography>
      </Container>
    </Box>
  );
}