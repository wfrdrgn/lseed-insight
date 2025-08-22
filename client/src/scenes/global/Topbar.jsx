import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import LightModeOutlinedIcon from "@mui/icons-material/LightModeOutlined";
import NotificationsOutlinedIcon from "@mui/icons-material/NotificationsOutlined";
import PersonOutlinedIcon from "@mui/icons-material/PersonOutlined";
import SearchIcon from "@mui/icons-material/Search";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import {
  Box,
  Button,
  Divider,
  FormControlLabel,
  IconButton,
  Menu,
  MenuItem,
  Switch,
  Typography,
  useTheme,
  Badge,
  InputBase,
  Collapse,
  Stack,
  Tooltip,
  Chip,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useContext, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosClient from "../../api/axiosClient";
import { useAuth } from "../../context/authContext";
import { ColorModeContext, tokens } from "../../theme";

const Topbar = ({ notifications, setNotifications }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const colorMode = useContext(ColorModeContext);
  const [anchorEl, setAnchorEl] = useState(null);
  const [notifAnchorEl, setNotifAnchorEl] = useState(null);
  const navigate = useNavigate();
  const [expandedNotificationId, setExpandedNotificationId] = useState(null);
  const { logout, user, isMentorView, toggleView } = useAuth();
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  // NEW: keep "just-read" items visible while Unread-only is on
  const [stickyReadIds, setStickyReadIds] = useState([]); // string[]

  const unreadCount = useMemo(
    () => (notifications || []).filter((n) => !n.is_read).length,
    [notifications]
  );

  const handleMenuOpen = (event) => setAnchorEl(event.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);
  const handleNotifOpen = (event) => setNotifAnchorEl(event.currentTarget);
  const handleNotifClose = () => {
    setNotifAnchorEl(null);
    setStickyReadIds([]); // clear stickies when closing the panel
  };

  const stickySet = useMemo(() => new Set(stickyReadIds), [stickyReadIds]);

  const filteredNotifications = useMemo(
    () =>
      (notifications || []).filter((n) =>
        showUnreadOnly ? (!n.is_read || stickySet.has(n.notification_id)) : true
      ),
    [notifications, showUnreadOnly, stickySet]
  );

  const handleToggleExpand = async (notifId) => {
    setExpandedNotificationId((prev) => (prev === notifId ? null : notifId));
    await markNotificationAsRead(notifId);
  };

  const handleNotificationClick = (notif) => {
    handleNotifClose();
    navigate(notif.target_route || "/");
  };

  const markNotificationAsRead = async (notificationId) => {
    try {
      await axiosClient.put(`/api/notifications/${notificationId}/read`);
      setNotifications((prev) =>
        prev.map((n) =>
          n.notification_id === notificationId ? { ...n, is_read: true } : n
        )
      );
      // keep visible if user is filtering unread
      setStickyReadIds((prev) =>
        showUnreadOnly && !prev.includes(notificationId)
          ? [...prev, notificationId]
          : prev
      );
    } catch (e) {
      console.error("Failed to mark notification as read:", e);
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      await axiosClient.delete(`/api/notifications/${notificationId}`);
      setNotifications((prev) =>
        prev.filter((n) => n.notification_id !== notificationId)
      );
      setStickyReadIds((prev) => prev.filter((id) => id !== notificationId));
      if (expandedNotificationId === notificationId) setExpandedNotificationId(null);
    } catch (e) {
      console.error("Failed to delete notification:", e);
    }
  };

  const markAllAsRead = async () => {
    const unread = (notifications || []).filter((n) => !n.is_read);
    if (unread.length === 0) return;
    try {
      await Promise.allSettled(
        unread.map((n) =>
          axiosClient.put(`/api/notifications/${n.notification_id}/read`)
        )
      );
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setStickyReadIds([]); // don't keep all of them sticky; list can clear
    } catch (e) {
      console.error("Failed to mark all notifications as read:", e);
    }
  };

  const hasBothRoles =
    user?.roles?.includes("LSEED-Coordinator") &&
    user?.roles?.includes("Mentor");

  const primary = theme.palette.primary.main;

  return (
    <Box display="flex" justifyContent="space-between" p={2}>
      {/* Search Bar */}
      <Box display="flex" backgroundColor={colors.primary[400]} borderRadius="3px">
        <InputBase sx={{ ml: 2, flex: 1 }} placeholder="Search" />
        <IconButton type="button" sx={{ p: 1 }}>
          <SearchIcon />
        </IconButton>
      </Box>

      {/* Icons */}
      <Box display="flex" alignItems="center">
        {hasBothRoles && (
          <Box display="flex" alignItems="center" mr={2}>
            <FormControlLabel
              control={<Switch checked={isMentorView} onChange={toggleView} color="secondary" />}
              label={
                <Typography variant="body1" color={colors.grey[100]}>
                  {isMentorView ? "Mentor View" : "Coordinator View"}
                </Typography>
              }
            />
          </Box>
        )}

        <Tooltip title={theme.palette.mode === "dark" ? "Light mode" : "Dark mode"}>
          <IconButton onClick={colorMode.toggleColorMode}>
            {theme.palette.mode === "dark" ? <DarkModeOutlinedIcon /> : <LightModeOutlinedIcon />}
          </IconButton>
        </Tooltip>

        {/* Notifications Button */}
        <Tooltip title="Notifications">
          <IconButton onClick={handleNotifOpen} aria-haspopup="true" aria-controls="notifications-menu">
            <Badge badgeContent={unreadCount} color="error">
              <NotificationsOutlinedIcon />
            </Badge>
          </IconButton>
        </Tooltip>

        {/* Notifications Menu */}
        <Menu
          id="notifications-menu"
          anchorEl={notifAnchorEl}
          open={Boolean(notifAnchorEl)}
          onClose={handleNotifClose}
          PaperProps={{
            sx: {
              width: 420,
              maxWidth: "92vw",
              bgcolor: theme.palette.background.paper,
              color: theme.palette.text.primary,
              border: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
              boxShadow: "0px 8px 24px rgba(0,0,0,0.18)",
              maxHeight: 480,
              display: "flex",
              flexDirection: "column",
            },
          }}
          MenuListProps={{ dense: true, disablePadding: true }}
        >
          {/* Sticky Header */}
          <Box
            sx={{
              position: "sticky",
              top: 0,
              zIndex: 1,
              px: 2,
              py: 1.25,
              bgcolor: theme.palette.mode === "dark" ? colors.greenAccent[900] : "#1E4D2B",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderBottom: "1px solid rgba(255,255,255,0.15)",
            }}
          >
            <Typography variant="subtitle1" fontWeight={800}>
              Notifications
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center">
              <FormControlLabel
                sx={{ m: 0, "& .MuiFormControlLabel-label": { color: "white", fontSize: 12 } }}
                control={
                  <Switch
                    size="small"
                    checked={showUnreadOnly}
                    onChange={(_, v) => {
                      setShowUnreadOnly(v);
                      if (!v) setStickyReadIds([]); // clear when switching to "All"
                    }}
                    color="success"
                  />
                }
                label="Unread only"
              />
              <Button
                size="small"
                variant="contained"
                onClick={markAllAsRead}
                sx={{
                  bgcolor: alpha("#fff", 0.15),
                  color: "#fff",
                  "&:hover": { bgcolor: alpha("#fff", 0.3) },
                  textTransform: "none",
                  fontWeight: 700,
                }}
              >
                Mark all read
              </Button>
            </Stack>
          </Box>

          {/* List */}
          <Box sx={{ overflowY: "auto" }}>
            {filteredNotifications.length > 0 ? (
              filteredNotifications.map((notif, index) => {
                const expanded = expandedNotificationId === notif.notification_id;
                const unread = !notif.is_read;

                const unreadStyles = unread
                  ? {
                      borderLeft: `6px solid ${primary}`,
                      bgcolor:
                        theme.palette.mode === "dark"
                          ? alpha(primary, 0.35)
                          : alpha(primary, 0.14),
                      "&:hover": {
                        bgcolor:
                          theme.palette.mode === "dark"
                            ? alpha(primary, 0.45)
                            : alpha(primary, 0.22),
                      },
                    }
                  : { borderLeft: "6px solid transparent" };

                return (
                  <Box key={notif.notification_id}>
                    <MenuItem
                      onClick={() => handleToggleExpand(notif.notification_id)}
                      aria-expanded={expanded}
                      sx={{
                        alignItems: "stretch",
                        py: 1,
                        px: 1.5,
                        gap: 1,
                        whiteSpace: "normal",
                        ...unreadStyles,
                      }}
                    >
                      {/* Title + Timestamp + Actions */}
                      <Box sx={{ width: "100%" }}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Typography
                            variant="subtitle2"
                            sx={{
                              fontWeight: 800,
                              flexGrow: 1,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                            title={notif.title}
                          >
                            {notif.title}
                          </Typography>

                          {!notif.is_read && (
                            <Chip size="small" label="NEW" color="primary" sx={{ fontWeight: 700 }} />
                          )}

                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ mr: 0.5, minWidth: 64, textAlign: "right" }}
                            title={new Date(notif.created_at).toLocaleString()}
                          >
                            {formatRelativeTime(notif.created_at)}
                          </Typography>

                          {/* Expand */}
                          <IconButton
                            size="small"
                            edge="end"
                            sx={{ color: "inherit" }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleExpand(notif.notification_id);
                            }}
                            aria-label={expanded ? "Collapse" : "Expand"}
                          >
                            {expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                          </IconButton>

                          {/* Delete (single) */}
                          <IconButton
                            size="small"
                            edge="end"
                            sx={{ color: theme.palette.error.main }}
                            aria-label="Delete notification"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.confirm("Delete this notification?")) {
                                deleteNotification(notif.notification_id);
                              }
                            }}
                          >
                            <DeleteOutlineIcon fontSize="small" />
                          </IconButton>
                        </Stack>

                        {/* Preview line (clamped) */}
                        {!expanded && !!notif.message && (
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                              mt: 0.5,
                            }}
                          >
                            {notif.message}
                          </Typography>
                        )}

                        {/* Expanded body */}
                        <Collapse in={expanded} timeout="auto" unmountOnExit>
                          <Box
                            sx={{
                              mt: 1,
                              p: 1,
                              borderRadius: 1,
                              bgcolor:
                                theme.palette.mode === "dark" ? alpha("#fff", 0.04) : "#f9f9f9",
                              border: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
                              display: "flex",
                              flexDirection: "column",
                              gap: 1,
                              wordWrap: "break-word",
                              overflowWrap: "break-word",
                            }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {!!notif.message && (
                              <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                                {notif.message}
                              </Typography>
                            )}

                            <Typography variant="caption" color="text.disabled">
                              {new Date(notif.created_at).toLocaleString()}
                            </Typography>

                            <Stack direction="row" spacing={1}>
                              <Button
                                size="small"
                                variant="contained"
                                onClick={() => handleNotificationClick(notif)}
                                sx={{ textTransform: "none", fontWeight: 700 }}
                              >
                                Go to page
                              </Button>
                              {!notif.is_read && (
                                <Button
                                  size="small"
                                  color="inherit"
                                  onClick={async () => {
                                    await markNotificationAsRead(notif.notification_id);
                                  }}
                                  sx={{ textTransform: "none" }}
                                >
                                  Mark read
                                </Button>
                              )}
                              <Button
                                size="small"
                                color="error"
                                onClick={() => {
                                  if (window.confirm("Delete this notification?")) {
                                    deleteNotification(notif.notification_id);
                                  }
                                }}
                                sx={{ textTransform: "none" }}
                                startIcon={<DeleteOutlineIcon />}
                              >
                                Delete
                              </Button>
                            </Stack>
                          </Box>
                        </Collapse>
                      </Box>
                    </MenuItem>

                    {index < filteredNotifications.length - 1 && <Divider />}
                  </Box>
                );
              })
            ) : (
              <Box sx={{ px: 2, py: 6, textAlign: "center" }}>
                <Typography variant="h6" gutterBottom>
                  No notifications
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  You’re all caught up.
                </Typography>
              </Box>
            )}
          </Box>
        </Menu>

        <Tooltip title="Account">
          <IconButton onClick={handleMenuOpen}>
            <PersonOutlinedIcon />
          </IconButton>
        </Tooltip>

        <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
          <MenuItem
            onClick={() => {
              handleMenuClose();
              navigate("/profile");
            }}
          >
            Profile
          </MenuItem>
          <MenuItem
            onClick={() => {
              logout();
              navigate("/");
            }}
            sx={{ color: colors.redAccent[400], mt: 1 }}
          >
            <Typography>Logout</Typography>
          </MenuItem>
        </Menu>
      </Box>
    </Box>
  );
};

export default Topbar;

// ------- helpers -------
function formatRelativeTime(iso) {
  const d = new Date(iso);
  const s = Math.max(0, (Date.now() - d.getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  const w = Math.floor(days / 7);
  if (w < 5) return `${w}w ago`;
  return d.toLocaleDateString();
}