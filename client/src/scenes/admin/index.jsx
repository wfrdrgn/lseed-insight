import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Snackbar,
  TextField,
  Typography,
  useTheme,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { useEffect, useState } from "react";
import axiosClient from "../../api/axiosClient";
import Header from "../../components/Header";
import { useAuth } from "../../context/authContext";
import { tokens } from "../../theme";

const AdminPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const [inviteCoordinatorFormData, setInviteCoordinatorFormData] = useState({
    email: "",
  });
  const { user, isMentorView } = useAuth();
  const [emailError, setEmailError] = useState("");
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");
  const [openInviteCoordinator, setOpenInviteCoordinator] = useState(false);
  const handleOpenInviteCoordinator = () => setOpenInviteCoordinator(true);
  const handleCloseInviteCoordinator = () => setOpenInviteCoordinator(false);

  const activeRole = (() => {
    if (!user || !user.roles) return null;

    const hasLSEED = user.roles.some((role) => role.startsWith("LSEED"));
    const hasMentor = user.roles.includes("Mentor");

    if (hasLSEED && hasMentor) {
      return isMentorView ? "Mentor" : "LSEED-Coordinator";
    } else if (hasMentor) {
      return "Mentor";
    } else if (hasLSEED) {
      return user.roles.find((r) => r.startsWith("LSEED")); // either LSEED-Coordinator or LSEED-Director
    } else if (user.roles.includes("Administrator")) {
      return "Administrator";
    }
    return null;
  })();

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const res = await axiosClient.get("/api/admin/users");

        // Unwrap envelope safely: supports either raw array or { data: [...] }
        const list = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
        setUsers(list);
      } catch (err) {
        setError(err?.message || "An error occurred while fetching users.");
        setUsers([]); // fail-safe
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  if (loading) {
    return (
      <Box m="20px">
        <Typography variant="h5">Loading users...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box m="20px">
        <Typography variant="h5" color={colors.redAccent[500]}>
          {error}
        </Typography>
      </Box>
    );
  }

  const validateEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  const handleInviteCoordinatorSubmit = async () => {
    try {
      if (
        !inviteCoordinatorFormData.email ||
        !inviteCoordinatorFormData.email.trim()
      ) {
        setSnackbarMessage("Please input email");
        setSnackbarSeverity("error");
        setSnackbarOpen(true);
        return;
      }

      if (!validateEmail(inviteCoordinatorFormData.email.trim())) {
        setSnackbarMessage("Please enter a valid email address");
        setSnackbarSeverity("error");
        setSnackbarOpen(true);
        return;
      }

      const response = await axiosClient.post(`/api/invite-lseed-user`, {
        email: inviteCoordinatorFormData.email.trim(),
      });

      if (response.status === 201) {
        setSnackbarMessage("Invite sent successfully");
        setSnackbarSeverity("success");
        setSnackbarOpen(true);

        handleCloseInviteCoordinator();
        setInviteCoordinatorFormData({ email: "" });

        setTimeout(() => {
          window.location.reload();
        }, 3000);
      }
    } catch (error) {
      console.error("Failed to invite coordinator:", error);
      setSnackbarMessage("Failed to send invite");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
    }
  };

  const handleInviteCoordinatorInputChange = (e) => {
    const { value } = e.target;

    setInviteCoordinatorFormData((prev) => ({
      ...prev,
      email: value,
    }));

    if (value === "") {
      setEmailError("");
    } else if (!validateEmail(value)) {
      setEmailError("Please enter a valid email address");
    } else {
      setEmailError("");
    }
  };

  // Read-only columns (no editing)
  const columns = [
    {
      field: "first_name",
      headerName: "First Name",
      flex: 1,
      renderCell: (params) => `${params.row.first_name}`,
      editable: false,
    },
    {
      field: "last_name",
      headerName: "Last Name",
      flex: 1,
      renderCell: (params) => `${params.row.last_name}`,
      editable: false,
    },
    {
      field: "email",
      headerName: "Email",
      flex: 1,
      editable: false,
    },
    {
      field: "roles",
      headerName: "Roles",
      flex: 1.5,
      renderCell: (params) => (
        <Box>
          {params.value && params.value.length > 0 ? (
            params.value.join(", ")
          ) : (
            <Typography variant="body2" color="textSecondary">
              No Roles
            </Typography>
          )}
        </Box>
      ),
      editable: false,
    },
    {
      field: "isactive",
      headerName: "Active Status",
      flex: 1,
      renderCell: (params) => (
        <span
          style={{
            color: params.value
              ? colors.greenAccent[500]
              : colors.redAccent[500],
          }}
        >
          {params.value ? "Active" : "Inactive"}
        </span>
      ),
      editable: false,
    },
  ];

  // Close Snackbar
  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  return (
    <Box m="20px">
      {/* HEADER */}
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Header title="ADMIN PAGE" subtitle="Manage users and roles" />
      </Box>

      <Box display="flex" alignItems="center" gap={2} mb={2}>
        {/* Create LSEED-Coordinator/Director Button */}
        <Button
          variant="contained"
          sx={{
            backgroundColor: colors.greenAccent[500],
            color: "black",
            "&:hover": {
              backgroundColor: colors.greenAccent[600],
            },
          }}
          onClick={handleOpenInviteCoordinator}
        >
          {activeRole === "LSEED-Director"
            ? "Create LSEED-Coordinator"
            : activeRole === "Administrator"
              ? "Create LSEED-Director"
              : "Create User"}
        </Button>
      </Box>

      <Dialog
        open={openInviteCoordinator}
        onClose={handleCloseInviteCoordinator}
        maxWidth="md"
        fullWidth
        PaperProps={{
          style: {
            backgroundColor: "#fff",
            color: "#000",
            border: "1px solid #000",
            borderRadius: "4px",
          },
        }}
      >
        <DialogTitle
          sx={{
            backgroundColor: "#1E4D2B",
            color: "#fff",
            textAlign: "center",
            fontSize: "1.5rem",
            fontWeight: "bold",
            borderBottom: "1px solid #000",
          }}
        >
          Invite Coordinator
        </DialogTitle>

        <DialogContent
          sx={{
            padding: "24px",
            maxHeight: "70vh",
            overflowY: "auto",
          }}
        >
          <Box display="flex" flexDirection="column" gap={2}>
            <Box>
              <Typography
                variant="subtitle1"
                sx={{ fontWeight: "bold", marginBottom: "8px" }}
              >
                Email
              </Typography>

              <TextField
                name="email"
                type="email"
                label="Enter Email Address"
                fullWidth
                margin="dense"
                value={inviteCoordinatorFormData.email}
                onChange={handleInviteCoordinatorInputChange}
                sx={{
                  "& .MuiOutlinedInput-notchedOutline": {
                    borderColor: "#000",
                    borderWidth: "1px",
                  },
                  "&:hover .MuiOutlinedInput-notchedOutline": {
                    borderColor: "#000",
                  },
                  "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                    borderColor: "#000",
                  },
                  "& .MuiInputBase-input": {
                    color: "#000",
                  },
                }}
                error={Boolean(emailError)}
                helperText={emailError}
              />
            </Box>
          </Box>
        </DialogContent>

        <DialogActions
          sx={{
            padding: "16px",
            borderTop: "1px solid #000",
          }}
        >
          <Button
            onClick={() => {
              handleCloseInviteCoordinator();
              setTimeout(() => {
                window.location.reload();
              }, 500);
            }}
            sx={{
              color: "#000",
              border: "1px solid #000",
              borderRadius: "4px",
              "&:hover": { backgroundColor: "#f0f0f0" },
            }}
          >
            Cancel
          </Button>

          <Button
            onClick={handleInviteCoordinatorSubmit}
            variant="contained"
            disabled={!inviteCoordinatorFormData.email}
            sx={{
              backgroundColor: inviteCoordinatorFormData.email
                ? "#1E4D2B"
                : "#A0A0A0",
              color: "#fff",
              borderRadius: "4px",
              "&:hover": {
                backgroundColor: inviteCoordinatorFormData.email
                  ? "#145A32"
                  : "#A0A0A0",
              },
            }}
          >
            Send Invite
          </Button>
        </DialogActions>
      </Dialog>

      {/* Manage Users */}
      <Box width="100%" backgroundColor={colors.primary[400]} padding="20px">
        <Typography
          variant="h3"
          fontWeight="bold"
          color={colors.greenAccent[500]}
          marginBottom="15px"
        >
          Manage Users
        </Typography>

        <Box
          height="600px"
          minHeight="600px"
          sx={{
            "& .MuiDataGrid-root": { border: "none" },
            "& .MuiDataGrid-cell": { borderBottom: "none" },
            "& .MuiDataGrid-columnHeaders, & .MuiDataGrid-columnHeader": {
              backgroundColor: colors.blueAccent[700] + " !important",
            },
            "& .MuiDataGrid-virtualScroller": {
              backgroundColor: colors.primary[400],
            },
            "& .MuiDataGrid-footerContainer": {
              borderTop: "none",
              backgroundColor: colors.blueAccent[700],
              color: colors.grey[100],
            },
          }}
        >
          <DataGrid
            rows={users}
            columns={columns}
            getRowId={(row) => row.user_id}
            pageSize={5}
            rowsPerPageOptions={[5, 10]}
          />

          <Snackbar
            open={snackbarOpen}
            autoHideDuration={3000}
            onClose={handleSnackbarClose}
            anchorOrigin={{ vertical: "top", horizontal: "center" }}
          >
            <Alert
              onClose={handleSnackbarClose}
              severity={snackbarSeverity}
              sx={{ width: "100%" }}
            >
              {snackbarMessage}
            </Alert>
          </Snackbar>
        </Box>
      </Box>
    </Box>
  );
};

export default AdminPage;