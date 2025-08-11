import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  useTheme,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Snackbar,
  Alert,
  FormLabel,
  FormGroup,
  FormControlLabel,
  Checkbox,
  FormHelperText,
  Menu,
  Grid,
} from "@mui/material";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import { DataGrid, GridToolbar } from "@mui/x-data-grid";
import { tokens } from "../../theme";
import Header from "../../components/Header";
import SEPerformanceTrendChart from "../../components/SEPerformanceTrendChart";
import { useNavigate } from "react-router-dom"; // For navigation
import { useAuth } from "../../context/authContext";
import axiosClient from "../../api/axiosClient";

const SocialEnterprise = ({ }) => {
  const theme = useTheme();
  const { user } = useAuth();
  const isLSEEDCoordinator = user?.roles?.some((role) =>
    role?.startsWith("LSEED")
  );
  const hasMentorRole = user?.roles?.includes("Mentor");
  const colors = tokens(theme.palette.mode);
  const navigate = useNavigate(); // Initialize navigation
  const [socialEnterpriseData, setSocialEnterpriseData] = useState({
    name: "",
    selectedSDG: "",
    contact: "",
    numberOfMembers: "",
    selectedProgram: "",
    selectedStatus: "",
    abbr: "",
    criticalAreas: [],
    description: "",
    preferred_mentoring_time: [],
    mentoring_time_note: "",
  });

  const predefinedTimes = [
    "Weekday (Morning) 8AM - 12NN",
    "Weekday (Afternoon) 1PM - 5PM",
  ];

  const selectedTimes = socialEnterpriseData.preferred_mentoring_time || [];

  // Extract predefined and custom
  const selectedPredefined = selectedTimes.filter((time) =>
    predefinedTimes.includes(time)
  );
  const customTimes = selectedTimes.filter(
    (time) => !predefinedTimes.includes(time) && time !== "Other"
  );
  const customTimeValue = customTimes.join(", "); // handle multiple custom values if needed

  const isOtherChecked =
    selectedTimes.includes("Other") || customTimes.length > 0;

  const [openAddSE, setOpenAddSE] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showEditButtons, setShowEditButtons] = useState(false);
  const [isSuccessEditPopupOpen, setIsSuccessEditPopupOpen] = useState(false);
  const [isSuccessSEPopupOpen, setIsSuccessSEPopupOpen] = useState(false);
  const [mentors, setMentors] = useState([]);
  const [sdgs, setSdgs] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [anchorEl, setAnchorEl] = useState(null);
  const [menuRowId, setMenuRowId] = useState(null);
  const [openApplicationDialog, setOpenApplicationDialog] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "info",
  });
  // State for fetched data
  const [socialEnterprises, setSocialEnterprises] = useState([]);
  const [loading, setLoading] = useState(true); // Loading state for API call
  // Handle dialog open/close
  const handleCloseAddSE = () => setOpenAddSE(false);
  const [applications, setApplications] = useState([]);
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setSocialEnterpriseData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleOpenMenu = (event, rowId) => {
    setAnchorEl(event.currentTarget);
    setMenuRowId(rowId);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
    setMenuRowId(null);
  };

  const handleMenuAction = async (action, row) => {
    console.log(`Action: ${action}`, row);

    if (action === "Accept") {
      setSocialEnterpriseData((prev) => ({
        ...prev,
        name: row.team_name || "",
        abbr: row.se_abbreviation || "",
        selectedStatus: "Active",
        contact: [row.focal_email, row.focal_phone].filter(Boolean).join(" / "),
        applicationId: row.id,
        criticalAreas: row.critical_areas,
        description: row.se_description,
        preferred_mentoring_time: row.preferred_mentoring_time,
        mentoring_time_note: row.mentoring_time_note,
      }));
      setOpenAddSE(true); // Open the dialog
    }

    if (action === "Decline") {
      const applicationId = row.id;
      const focalEmail = row.focal_email;
      const team_name = row.team_name;

      try {
        await axiosClient.put(`/api/application/${applicationId}/status`, {
          status: "Declined",
          email: focalEmail,
          team_name,
        });

        console.log("✅ Status updated to Declined.");
        setSnackbar({
          open: true,
          message: "Application declined successfully",
          severity: "success",
        });

        await new Promise((r) => setTimeout(r, 1500));
        window.location.reload();
      } catch (error) {
        console.error("❌ Failed to decline application:", error);
        setSnackbar({
          open: true,
          message:
            error?.response?.data?.message || error?.message || "Decline failed",
          severity: "error",
        });
      } finally {
        handleCloseMenu(); // Close the dropdown
      }
    }

    if (action === "View") {
      // Open the application view dialog
      setSelectedApplication(row); // set the clicked application details
      setOpenApplicationDialog(true); // show the dialog
    }

    handleCloseMenu();
  };

  const toggleEditing = () => {
    setIsEditing((prev) => !prev); // Toggle editing mode
    setShowEditButtons((prev) => !prev); // Show/hide the "Cancel" and "Save Changes" buttons
  };

  // Fetch social enterprises from the backend
  useEffect(() => {
    const fetchSocialEnterprise = async () => {
      try {
        let response;

        if (user?.roles?.includes("LSEED-Coordinator")) {
          const res = await axiosClient.get(`/api/get-program-coordinator`);

          const program = res.data[0]?.name;

          response = await axiosClient.get(
            `/api/get-all-social-enterprises-with-mentorship`,
            { params: { program } }
          );
        } else {
          response = await axiosClient.get(
            `/api/get-all-social-enterprises-with-mentorship`
          );
        }

        const updatedSocialEnterprises = response.data.map((se) => ({
          id: se.se_id,
          name: se.team_name || "Unnamed SE",
          program: se.program_name || "No Program",
          contact: se.contactnum || "No Contact",
          mentors:
            se.mentors.map((m) => m.mentor_name).join(", ") || "No mentor",
        }));

        setSocialEnterprises(updatedSocialEnterprises);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching social enterprises:", error);
        setLoading(false);
      }
    };

    const fetchMentors = async () => {
      try {
        const response = await axiosClient.get(
          `/api/mentors`
        ); // Fetch mentors from API
        setMentors(response.data);
        console.log("mentorsdata", response.data);
      } catch (error) {
        console.error("❌ Error fetching mentors:", error);
      }
    };

    fetchSocialEnterprise();
    fetchMentors();
  }, []);

  useEffect(() => {
    const fetchSDGs = async () => {
      try {
        const response = await axiosClient.get(
          `/api/get-all-sdg`
        ); // Call the API endpoint
        const data = response.data;
        setSdgs(data); // Update the state with the fetched SDGs
      } catch (error) {
        console.error("Error fetching SDGs:", error);
      }
    };
    fetchSDGs();
  }, []);

  useEffect(() => {
    const fetchApplications = async () => {
      try {
        const response = await axiosClient.get(
          `/api/list-se-applications`
        ); // adjust endpoint as needed
        const data = response.data;

        // Format date_applied in all items
        const formatted = data.map((item) => ({
          ...item,
          date_applied: new Date(item.date_applied).toLocaleDateString(
            "en-US",
            {
              year: "numeric",
              month: "long",
              day: "numeric",
            }
          ),
        }));
        setApplications(formatted);
      } catch (error) {
        console.error("Error fetching SE applications:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchApplications();
  }, []);

  useEffect(() => {
    const fetchPrograms = async () => {
      try {
        const response = await axiosClient.get(
          `/api/get-all-programs`
        ); // Call the API endpoint
        setPrograms(response.data); // Update the state with the fetched programs
      } catch (error) {
        console.error("Error fetching programs:", error);
      }
    };
    fetchPrograms();
  }, []);

  const MentorDropdown = ({ value, onChange, mentors = [] }) => {
    return (
      <Select
        value={value || ""}
        onChange={(event) => onChange(event.target.value)}
        fullWidth
      >
        {mentors.length === 0 ? (
          <MenuItem disabled>No mentors available</MenuItem>
        ) : (
          mentors.map((mentor) => {
            const fullName = `${mentor.mentor_firstName} ${mentor.mentor_lastName}`;
            return (
              <MenuItem key={mentor.mentor_id} value={fullName}>
                {fullName}
              </MenuItem>
            );
          })
        )}
      </Select>
    );
  };

  const handleSERowUpdate = async (updatedRow) => {
    try {
      const response = await axiosClient.put(
        `/api/update-social-enterprise/${updatedRow.id}`,
        updatedRow
      );

      if (response.status === 200) {
        console.log(
          "✅ Social Enterprise updated successfully:",
          response.data
        );
        setIsSuccessEditPopupOpen(true);
      } else {
        console.error("❌ Failed to update Social Enterprise:", response.data);
      }
    } catch (error) {
      console.error("❌ Error updating SE:", error);
    }
  };

  const handleSubmit = async () => {
    try {
      // Basic validation
      if (!socialEnterpriseData.name.trim()) {
        alert("Name is required");
        return;
      }
      if (
        !socialEnterpriseData.selectedSDGs ||
        socialEnterpriseData.selectedSDGs.length === 0
      ) {
        alert("At least one SDG is required");
        return;
      }
      if (!String(socialEnterpriseData.contact).trim()) {
        alert("Contact is required");
        return;
      }
      if (!socialEnterpriseData.selectedProgram) {
        alert("Program is required");
        return;
      }
      if (!socialEnterpriseData.selectedStatus) {
        alert("Status is required");
        return;
      }

      // Prepare submission data
      const newSocialEnterprise = {
        name: socialEnterpriseData.name,
        sdg_ids: socialEnterpriseData.selectedSDGs,
        contactnum: socialEnterpriseData.contact,
        number_of_members: socialEnterpriseData.numberOfMembers || 0,
        program_id: socialEnterpriseData.selectedProgram,
        isactive: socialEnterpriseData.selectedStatus === "Active",
        abbr: socialEnterpriseData.abbr || null,
        criticalAreas: socialEnterpriseData.criticalAreas || [],
        description: socialEnterpriseData.description,
        preferred_mentoring_time:
          socialEnterpriseData.preferred_mentoring_time || [],
        mentoring_time_note: socialEnterpriseData.mentoring_time_note || null,
        accepted_application_id: socialEnterpriseData.applicationId,
      };

      const resp = await axiosClient.post(
        `/api/add-social-enterprise`,
        newSocialEnterprise
      );

      // Axios succeeded; payload is in resp.data
      const created = resp.data?.data;
      console.log("Social Enterprise added successfully with SE ID:", created?.se_id);

      setIsSuccessSEPopupOpen(true);
      handleCloseAddSE();
      setSocialEnterpriseData({
        name: "",
        selectedSDGs: [],
        contact: "",
        numberOfMembers: "",
        selectedProgram: "",
        selectedStatus: "",
        abbr: "",
        applicationId: "",
      });

      await new Promise((r) => setTimeout(r, 1500));
      window.location.reload();
    } catch (error) {
      console.error("Failed to add Social Enterprise:", error);
    }
  };

  // Handle row click
  const handleRowClick = (params) => {
    if (isEditing) {
      setSelectedRow(params.row);
      setOpenEditDialog(true);
    }
  };

  const columns = [
    {
      field: "name",
      headerName: "Social Enterprise",
      flex: 1,
      minWidth: 100,
      editable: isEditing,
      renderCell: (params) => (
        <Typography
          variant="body2"
          sx={{
            whiteSpace: "normal",
            wordBreak: "break-word",
          }}
        >
          {params.row.name}
        </Typography>
      ),
    },
    {
      field: "program",
      headerName: "Program",
      flex: 1,
      minWidth: 100,
      editable: isEditing,
      renderCell: (params) => (
        <Box
          sx={{
            width: "100%",
            display: "flex",
            alignItems: "center",
          }}
        >
          <Typography variant="body2">{params.row.program}</Typography>
        </Box>
      ),
    },
    {
      field: "contact",
      headerName: "Contact Person",
      flex: 1,
      minWidth: 100,
      editable: false,
      renderCell: (params) => (
        <Box
          sx={{
            width: "100%",
            display: "flex",
            alignItems: "center",
          }}
        >
          <Typography variant="body2">{params.row.contact}</Typography>
        </Box>
      ),
    },
    {
      field: "mentors",
      headerName: "Mentors",
      flex: 1,
      minWidth: 100,
      editable: isEditing,
      renderCell: (params) => (
        <Box
          sx={{
            width: "100%",
            display: "flex",
            alignItems: "center",
          }}
        >
          <Typography variant="body2">{params.row.mentors}</Typography>
        </Box>
      ),
      renderEditCell: (params) => (
        <MentorDropdown
          value={params.value}
          onChange={(newValue) =>
            params.api.setEditCellValue({
              id: params.id,
              field: params.field,
              value: newValue,
            })
          }
          mentors={mentors}
        />
      ),
    },
    {
      field: "actions",
      headerName: "Actions",
      minWidth: 100,
      renderCell: (params) => (
        <Box
          sx={{
            width: "100%",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Button
            onClick={() => navigate(`/se-analytics/${params.row.id}`)}
            sx={{
              color: "#fff",
              backgroundColor: colors.primary[700],
              "&:hover": { backgroundColor: colors.primary[800] },
            }}
          >
            View SE
          </Button>
        </Box>
      ),
    },
  ];

  return (
    <Box m="20px">
      <Header title="SOCIAL ENTERPRISE" subtitle="Manage Social Enterprises" />
      {/* SE Performance Trend*/}
      <Box
        gridColumn="span 12"
        gridRow="span 2"
        backgroundColor={colors.primary[400]}
        paddingTop="10px"
      >
        <SEPerformanceTrendChart />{" "}
        {/* ✅ Embed the SEPerformanceChart component here */}
      </Box>
      <Box display="flex" gap="10px" mt="20px">
        <Dialog
          open={openAddSE}
          onClose={handleCloseAddSE}
          maxWidth="md"
          fullWidth
          PaperProps={{
            style: {
              backgroundColor: "#fff", // White background
              color: "#000", // Black text
              border: "1px solid #000", // Black border for contrast
            },
          }}
        >
          {/* Dialog Title */}
          <DialogTitle
            sx={{
              backgroundColor: "#1E4D2B", // DLSU Green header
              color: "#fff", // White text
              textAlign: "center",
              fontSize: "1.5rem",
              fontWeight: "bold",
            }}
          >
            Add Social Enterprise
          </DialogTitle>

          {/* Dialog Content */}
          <DialogContent
            sx={{
              padding: "24px",
              maxHeight: "70vh", // Ensure it doesn't overflow the screen
              overflowY: "auto", // Enable scrolling if content is too long
            }}
          >
            {/* Input Fields */}
            <Box display="flex" flexDirection="column" gap={2}>
              {/* Name Field */}
              <Box>
                {/* Name Label */}
                <Typography
                  variant="subtitle1"
                  sx={{
                    fontWeight: "bold",
                    marginBottom: "8px", // Space between title and input
                  }}
                >
                  Name
                </Typography>

                {/* TextField */}
                <TextField
                  label="Enter Name"
                  name="name"
                  value={socialEnterpriseData.name}
                  onChange={handleInputChange}
                  fullWidth
                  margin="dense"
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      border: "1px solid #000", // Consistent border color
                      borderRadius: "4px", // Rounded corners
                      "&:hover": {
                        borderColor: "#000", // Darken border on hover
                      },
                      "&.Mui-focused": {
                        borderColor: "#000", // Consistent border color when focused
                      },
                    },
                    "& .MuiInputLabel-root": {
                      backgroundColor: "#fff", // Prevent overlap with the border
                      padding: "0 4px", // Add padding for readability
                      "&.Mui-focused": {
                        backgroundColor: "#fff", // Ensure the background remains white when focused
                      },
                    },
                    "& .MuiInputBase-input": {
                      color: "#000", // Set text color to black
                    },
                  }}
                />
              </Box>

              {/* Description Field */}
              <Box>
                {/* Label */}
                <Typography
                  variant="subtitle1"
                  sx={{
                    fontWeight: "bold",
                    marginBottom: "8px",
                  }}
                >
                  Description of Social Enterprise
                </Typography>

                {/* Multiline TextField */}
                <TextField
                  label="Enter Description"
                  name="description"
                  value={socialEnterpriseData.description}
                  onChange={handleInputChange}
                  fullWidth
                  margin="dense"
                  multiline
                  rows={6} // ⬅️ You can adjust this as needed
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      border: "1px solid #000",
                      borderRadius: "4px",
                      alignItems: "start", // Ensures text starts from top
                      "&:hover": {
                        borderColor: "#000",
                      },
                      "&.Mui-focused": {
                        borderColor: "#000",
                      },
                    },
                    "& .MuiInputLabel-root": {
                      backgroundColor: "#fff",
                      padding: "0 4px",
                      "&.Mui-focused": {
                        backgroundColor: "#fff",
                      },
                    },
                    "& .MuiInputBase-input": {
                      color: "#000",
                    },
                  }}
                />
              </Box>

              {/* SDG Dropdown */}
              <Box>
                {/* SDG Label */}
                <Typography
                  variant="subtitle1"
                  sx={{
                    fontWeight: "bold",
                    marginBottom: "8px", // Space between label and dropdown
                  }}
                >
                  SDG
                </Typography>

                {/* Select Dropdown */}
                <FormControl component="fieldset" fullWidth margin="dense">
                  <FormLabel
                    component="legend"
                    sx={{ color: "black", fontWeight: "bold" }}
                  >
                    Select SDGs
                  </FormLabel>
                  <FormGroup>
                    {sdgs.length > 0 ? (
                      sdgs.map((sdg) => {
                        const isChecked =
                          socialEnterpriseData.selectedSDGs?.includes(sdg.id) ||
                          false;

                        return (
                          <FormControlLabel
                            key={sdg.id}
                            control={
                              <Checkbox
                                checked={isChecked}
                                onChange={(e) => {
                                  const selected = new Set(
                                    socialEnterpriseData.selectedSDGs || []
                                  );

                                  if (e.target.checked) {
                                    selected.add(sdg.id);
                                  } else {
                                    selected.delete(sdg.id);
                                  }

                                  const updatedSDGs = Array.from(selected);

                                  console.log(
                                    "Updated selected SDGs:",
                                    updatedSDGs
                                  );

                                  handleInputChange({
                                    target: {
                                      name: "selectedSDGs",
                                      value: updatedSDGs,
                                    },
                                  });
                                }}
                                sx={{
                                  color: "black",
                                  "&.Mui-checked": { color: "black" },
                                }}
                              />
                            }
                            label={sdg.name}
                            sx={{ color: "black" }}
                          />
                        );
                      })
                    ) : (
                      <FormHelperText>No SDGs available</FormHelperText>
                    )}
                  </FormGroup>
                </FormControl>
              </Box>

              {/* Contact Field */}
              <Box>
                {/* Contact Label */}
                <Typography
                  variant="subtitle1"
                  sx={{
                    fontWeight: "bold",
                    marginBottom: "8px", // Space between title and input
                  }}
                >
                  Contact
                </Typography>

                {/* TextField */}
                <TextField
                  name="contact"
                  value={socialEnterpriseData.contact}
                  onChange={handleInputChange}
                  label="Enter Contact"
                  fullWidth
                  margin="dense"
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      border: "1px solid #000", // Consistent border color
                      borderRadius: "4px", // Rounded corners
                      "&:hover": {
                        borderColor: "#000", // Darken border on hover
                      },
                      "&.Mui-focused": {
                        borderColor: "#000", // Consistent border color when focused
                      },
                    },
                    "& .MuiInputLabel-root": {
                      backgroundColor: "#fff", // Prevent overlap with the border
                      padding: "0 4px", // Add padding for readability
                      "&.Mui-focused": {
                        backgroundColor: "#fff", // Ensure the background remains white when focused
                      },
                    },
                    "& .MuiInputBase-input": {
                      color: "#000", // Set text color to black
                    },
                  }}
                />
              </Box>

              {/* Program Dropdown */}
              <Box>
                {/* Program Label */}
                <Typography
                  variant="subtitle1"
                  sx={{
                    fontWeight: "bold",
                    marginBottom: "8px",
                  }}
                >
                  Program
                </Typography>

                {/* Show loading state if programs are not yet fetched */}
                {loading ? (
                  <Typography>Loading programs...</Typography>
                ) : (
                  <FormControl fullWidth margin="dense">
                    <InputLabel
                      id="program-label"
                      sx={{
                        backgroundColor: "#fff",
                        padding: "0 4px",
                        "&.Mui-focused": {
                          backgroundColor: "#fff",
                        },
                      }}
                    >
                      Select Program
                    </InputLabel>
                    <Select
                      labelId="program-label"
                      name="selectedProgram"
                      value={socialEnterpriseData.selectedProgram || ""}
                      onChange={handleInputChange}
                      label="Select Program"
                      sx={{
                        color: "#000",
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
                      }}
                    >
                      <MenuItem value="" disabled>
                        Select Program
                      </MenuItem>
                      {programs.length > 0 ? (
                        programs.map((program) => (
                          <MenuItem
                            key={program.id}
                            value={program.id}
                            title={`Program: ${program.name}`}
                          >
                            {program.name}
                          </MenuItem>
                        ))
                      ) : (
                        <MenuItem value="" disabled>
                          No programs available
                        </MenuItem>
                      )}
                    </Select>
                  </FormControl>
                )}
              </Box>

              {/* Preferred Time Box */}
              <Box>
                {/* Label */}
                <Typography
                  variant="subtitle1"
                  sx={{
                    fontWeight: "bold",
                    marginBottom: "8px",
                  }}
                >
                  Preferred Time
                </Typography>

                {/* Fieldset */}
                <FormControl component="fieldset" fullWidth margin="dense">
                  <FormGroup>
                    {/* Predefined Times */}
                    {predefinedTimes.map((time) => (
                      <FormControlLabel
                        key={time}
                        control={
                          <Checkbox
                            checked={selectedPredefined.includes(time)}
                            onChange={(e) => {
                              const selected = new Set(selectedTimes);
                              e.target.checked
                                ? selected.add(time)
                                : selected.delete(time);

                              // Remove "Other" if at least one predefined is checked
                              if (
                                [...selected].some((t) =>
                                  predefinedTimes.includes(t)
                                )
                              ) {
                                selected.delete("Other");
                              }

                              handleInputChange({
                                target: {
                                  name: "preferred_mentoring_time",
                                  value: Array.from(selected),
                                },
                              });
                            }}
                            sx={{
                              color: "black",
                              "&.Mui-checked": { color: "black" },
                            }}
                          />
                        }
                        label={time}
                        sx={{ color: "black" }}
                      />
                    ))}

                    {/* Other Checkbox + TextField */}
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={isOtherChecked}
                          onChange={(e) => {
                            const selected = new Set(selectedTimes);
                            if (e.target.checked) {
                              selected.add("Other");
                            } else {
                              selected.delete("Other");
                              customTimes.forEach((t) => selected.delete(t));
                            }

                            handleInputChange({
                              target: {
                                name: "preferred_mentoring_time",
                                value: Array.from(selected),
                              },
                            });
                          }}
                          sx={{
                            color: "black",
                            "&.Mui-checked": { color: "black" },
                          }}
                        />
                      }
                      label={
                        <TextField
                          label="Other"
                          variant="outlined"
                          fullWidth
                          multiline
                          minRows={1}
                          maxRows={4}
                          value={isOtherChecked ? customTimeValue : ""}
                          onChange={(e) => {
                            const value = e.target.value.trim();
                            const selected = new Set(
                              selectedTimes.filter(
                                (t) => !customTimes.includes(t) && t !== "Other"
                              )
                            );

                            if (value) {
                              selected.add("Other");
                              value.split(",").forEach((v) => {
                                const trimmed = v.trim();
                                if (trimmed) selected.add(trimmed);
                              });
                            } else {
                              selected.delete("Other");
                              customTimes.forEach((t) => selected.delete(t));
                            }

                            handleInputChange({
                              target: {
                                name: "preferred_mentoring_time",
                                value: Array.from(selected),
                              },
                            });
                          }}
                          InputProps={{
                            readOnly: false,
                            style: { color: "#000" },
                          }}
                          InputLabelProps={{
                            style: {
                              color: "#000",
                              backgroundColor: "#fff",
                              padding: "0 4px",
                            },
                          }}
                          sx={{
                            "& .MuiOutlinedInput-root": {
                              "& fieldset": {
                                borderColor: "#000",
                              },
                              "&:hover fieldset": {
                                borderColor: "#000",
                              },
                              "&.Mui-focused fieldset": {
                                borderColor: "#000",
                              },
                            },
                          }}
                        />
                      }
                      sx={{ alignItems: "start", color: "black" }}
                    />
                  </FormGroup>
                </FormControl>
              </Box>

              {/* Time Notes Field (Read-only) */}
              <Box sx={{ marginTop: "10px" }}>
                <Typography
                  variant="subtitle1"
                  sx={{
                    fontWeight: "bold",
                    marginBottom: "4px",
                  }}
                >
                  Time Notes / Specifics
                </Typography>
                <TextField
                  variant="outlined"
                  fullWidth
                  multiline
                  minRows={2}
                  maxRows={4}
                  value={
                    socialEnterpriseData.mentoring_time_note?.trim()
                      ? socialEnterpriseData.mentoring_time_note
                      : "N/A"
                  }
                  InputProps={{
                    readOnly: true,
                    style: { color: "#000" },
                  }}
                  InputLabelProps={{
                    style: {
                      color: "#000",
                      backgroundColor: "#fff",
                      padding: "0 4px",
                    },
                  }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      "& fieldset": {
                        borderColor: "#000",
                      },
                      "&:hover fieldset": {
                        borderColor: "#000",
                      },
                      "&.Mui-focused fieldset": {
                        borderColor: "#000",
                      },
                    },
                  }}
                />
              </Box>

              {/* Status Dropdown */}
              <Box>
                {/* Status Label */}
                <Typography
                  variant="subtitle1"
                  sx={{
                    fontWeight: "bold",
                    marginBottom: "8px", // Space between label and dropdown
                  }}
                >
                  Status
                </Typography>

                {/* Select Dropdown */}
                <FormControl fullWidth margin="dense">
                  <InputLabel
                    id="status-label"
                    sx={{
                      backgroundColor: "#fff", // Prevent overlap with the border
                      padding: "0 4px", // Add padding for readability
                      "&.Mui-focused": {
                        backgroundColor: "#fff", // Ensure the background remains white when focused
                      },
                    }}
                  >
                    Select Status
                  </InputLabel>
                  <Select
                    labelId="status-label"
                    name="selectedStatus"
                    value={socialEnterpriseData.selectedStatus || ""}
                    onChange={handleInputChange}
                    label="Select Status"
                    sx={{
                      color: "#000",
                      "& .MuiOutlinedInput-notchedOutline": {
                        borderColor: "#000", // Consistent border color
                        borderWidth: "1px", // Solid 1px border
                      },
                      "&:hover .MuiOutlinedInput-notchedOutline": {
                        borderColor: "#000", // Darken border on hover
                      },
                      "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                        borderColor: "#000", // Consistent border color when focused
                      },
                    }}
                  >
                    <MenuItem value="">Select Status</MenuItem>
                    <MenuItem value="Active">Active</MenuItem>
                    <MenuItem value="Inactive">Inactive</MenuItem>
                  </Select>
                </FormControl>
              </Box>

              {/* Abbreviation Field */}
              <Box>
                {/* Abbreviation Label */}
                <Typography
                  variant="subtitle1"
                  sx={{
                    fontWeight: "bold",
                    marginBottom: "8px", // Space between title and input
                  }}
                >
                  Abbreviation
                </Typography>

                {/* TextField */}
                <TextField
                  name="abbr"
                  value={socialEnterpriseData.abbr}
                  onChange={handleInputChange}
                  label="Enter Abbreviation"
                  fullWidth
                  margin="dense"
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      border: "1px solid #000", // Consistent border color
                      borderRadius: "4px", // Rounded corners
                      "&:hover": {
                        borderColor: "#000", // Darken border on hover
                      },
                      "&.Mui-focused": {
                        borderColor: "#000", // Consistent border color when focused
                      },
                    },
                    "& .MuiInputLabel-root": {
                      backgroundColor: "#fff", // Prevent overlap with the border
                      padding: "0 4px", // Add padding for readability
                      "&.Mui-focused": {
                        backgroundColor: "#fff", // Ensure the background remains white when focused
                      },
                    },
                    "& .MuiInputBase-input": {
                      color: "#000", // Set text color to black
                    },
                  }}
                />
              </Box>
            </Box>
          </DialogContent>

          {/* Dialog Actions */}
          <DialogActions
            sx={{
              padding: "16px",
              borderTop: "1px solid #000", // Separator line
            }}
          >
            <Button
              onClick={() => {
                handleCloseAddSE(); // ✅ Closes after timeout
                setTimeout(() => {
                  window.location.reload();
                }, 1500); // Adjust delay if needed
              }}
              sx={{
                color: "#000",
                border: "1px solid #000",
                "&:hover": {
                  backgroundColor: "#f0f0f0", // Hover effect
                },
              }}
            >
              Cancel
            </Button>

            <Button
              onClick={handleSubmit}
              variant="contained"
              disabled={
                !socialEnterpriseData.name ||
                !socialEnterpriseData.selectedSDGs ||
                socialEnterpriseData.selectedSDGs.length === 0 ||
                !socialEnterpriseData.contact ||
                !socialEnterpriseData.selectedProgram ||
                !socialEnterpriseData.selectedStatus ||
                !socialEnterpriseData.abbr
              }
              sx={{
                backgroundColor:
                  socialEnterpriseData.name &&
                    socialEnterpriseData.selectedSDGs &&
                    socialEnterpriseData.selectedSDGs.length > 0 &&
                    socialEnterpriseData.contact &&
                    socialEnterpriseData.selectedProgram &&
                    socialEnterpriseData.selectedStatus
                    ? "#1E4D2B"
                    : "#A0A0A0", // Change color if disabled
                color: "#fff",
                "&:hover": {
                  backgroundColor:
                    socialEnterpriseData.name &&
                      socialEnterpriseData.selectedSDGs &&
                      socialEnterpriseData.selectedSDGs.length > 0 &&
                      socialEnterpriseData.contact &&
                      socialEnterpriseData.selectedProgram &&
                      socialEnterpriseData.selectedStatus
                      ? "#145A32"
                      : "#A0A0A0",
                },
              }}
            >
              Add
            </Button>
          </DialogActions>
        </Dialog>

        <Snackbar
          open={isSuccessSEPopupOpen} // Controlled by state
          autoHideDuration={3000} // Automatically close after 3 seconds
          onClose={() => setIsSuccessSEPopupOpen(false)} // Close on click or timeout
          anchorOrigin={{ vertical: "top", horizontal: "center" }} // Position of the popup
        >
          <Alert
            onClose={() => setIsSuccessSEPopupOpen(false)}
            severity="success"
            sx={{ width: "100%" }}
          >
            Social Enterprise added successfully!
          </Alert>
        </Snackbar>

        <Snackbar
          open={snackbar.open}
          autoHideDuration={4000}
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          anchorOrigin={{ vertical: "top", horizontal: "center" }}
        >
          <Alert
            onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
            severity={snackbar.severity}
            sx={{ width: "100%" }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>

        <Dialog
          open={openApplicationDialog}
          onClose={() => setOpenApplicationDialog(false)}
          maxWidth="md"
          fullWidth
          PaperProps={{
            style: {
              backgroundColor: "#fff",
              color: "#000",
              border: "1px solid #000",
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
            }}
          >
            Application Details
          </DialogTitle>

          <DialogContent
            sx={{ padding: 3, maxHeight: "70vh", overflowY: "auto" }}
          >
            {selectedApplication ? (
              <Grid container spacing={2}>
                {/* Team Information */}
                <Grid item xs={12}>
                  <Typography variant="h6" fontWeight="bold" gutterBottom>
                    About the Team
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <strong>Team Name:</strong> {selectedApplication.team_name}
                </Grid>
                <Grid item xs={6}>
                  <strong>Abbreviation:</strong>{" "}
                  {selectedApplication.se_abbreviation}
                </Grid>
                <Grid item xs={6}>
                  <strong>Started:</strong>{" "}
                  {selectedApplication.enterprise_idea_start}
                </Grid>
                <Grid item xs={6}>
                  <strong>People Involved:</strong>{" "}
                  {selectedApplication.involved_people}
                </Grid>
                <Grid item xs={6}>
                  <strong>Current Phase:</strong>{" "}
                  {selectedApplication.current_phase}
                </Grid>
                <Grid item xs={6}>
                  <strong>Meeting Frequency:</strong>{" "}
                  {selectedApplication.meeting_frequency}
                </Grid>
                <Grid item xs={12}>
                  <strong>Social Problem:</strong>{" "}
                  {selectedApplication.social_problem || <i>Not provided</i>}
                </Grid>
                <Grid item xs={12}>
                  <strong>Nature:</strong> {selectedApplication.se_nature}
                </Grid>
                <Grid item xs={12}>
                  <strong>Social Enterprise Description:</strong>{" "}
                  {selectedApplication.se_description}
                </Grid>
                <Grid item xs={12}>
                  <strong>Team Characteristics:</strong>{" "}
                  {selectedApplication.team_characteristics}
                </Grid>
                <Grid item xs={12}>
                  <strong>Challenges:</strong>{" "}
                  {selectedApplication.team_challenges}
                </Grid>
                <Grid item xs={12}>
                  <strong>Critical Areas:</strong>{" "}
                  {(selectedApplication.critical_areas || []).join(", ")}
                </Grid>
                <Grid item xs={12}>
                  <strong>Action Plans:</strong>{" "}
                  {selectedApplication.action_plans}
                </Grid>
                <Grid item xs={12}>
                  <strong>Communication Modes:</strong>{" "}
                  {(selectedApplication.communication_modes || []).join(", ")}
                </Grid>
                <Grid item xs={12}>
                  <strong>Social Media:</strong>{" "}
                  {selectedApplication.social_media_link}
                </Grid>

                {/* Focal Person */}
                <Grid item xs={12} mt={2}>
                  <Typography variant="h6" fontWeight="bold" gutterBottom>
                    Focal Person
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <strong>Email:</strong>{" "}
                  {selectedApplication.focal_email || <i>Not provided</i>}
                </Grid>
                <Grid item xs={6}>
                  <strong>Phone:</strong>{" "}
                  {selectedApplication.focal_phone || <i>Not provided</i>}
                </Grid>

                {/* Mentoring Preferences */}
                <Grid item xs={12} mt={2}>
                  <Typography variant="h6" fontWeight="bold" gutterBottom>
                    Mentoring Details
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <strong>Team Members:</strong>{" "}
                  {selectedApplication.mentoring_team_members}
                </Grid>
                <Grid item xs={6}>
                  <strong>Preferred Time:</strong>{" "}
                  {(selectedApplication.preferred_mentoring_time || []).join(
                    ", "
                  )}
                </Grid>
                <Grid item xs={6}>
                  <strong>Time Notes:</strong>{" "}
                  {selectedApplication.mentoring_time_note}
                </Grid>

                {/* Pitch Deck */}
                <Grid item xs={12}>
                  <strong>Pitch Deck:</strong>{" "}
                  {selectedApplication.pitch_deck_url ? (
                    <a
                      href={selectedApplication.pitch_deck_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "#1E4D2B", fontWeight: "bold" }}
                    >
                      View Document
                    </a>
                  ) : (
                    <i>No pitch deck provided</i>
                  )}
                </Grid>
              </Grid>
            ) : (
              <Typography>Loading...</Typography>
            )}
          </DialogContent>

          <DialogActions sx={{ padding: "16px", borderTop: "1px solid #000" }}>
            <Button
              onClick={() => setOpenApplicationDialog(false)}
              sx={{
                color: "#000",
                border: "1px solid #000",
                "&:hover": { backgroundColor: "#f0f0f0" },
              }}
            >
              Close
            </Button>
          </DialogActions>
        </Dialog>

        <Box display="flex" alignItems="center" gap={2}>
          {!showEditButtons && (
            <Button
              variant="contained"
              sx={{
                backgroundColor: colors.blueAccent[500],
                color: "black",
                "&:hover": {
                  backgroundColor: colors.blueAccent[800],
                },
              }}
              onClick={toggleEditing}
            >
              Enable Editing
            </Button>
          )}
          {/* Cancel and Save Changes Buttons */}
          {showEditButtons && (
            <>
              <Button
                variant="outlined"
                sx={{
                  backgroundColor: colors.redAccent[500],
                  color: "black",
                  "&:hover": {
                    backgroundColor: colors.redAccent[600],
                  },
                }}
                onClick={() => {
                  setIsEditing(false); // Disable editing mode
                  setShowEditButtons(false);
                  setTimeout(() => {
                    window.location.reload();
                  }, 500); // Adjust delay if needed
                }}
              >
                Cancel
              </Button>

              <Button
                variant="contained"
                sx={{
                  backgroundColor: colors.blueAccent[500],
                  color: "black",
                  "&:hover": {
                    backgroundColor: colors.blueAccent[600],
                  },
                }}
                onClick={() => {
                  setIsEditing(false); // Disable editing mode
                  setShowEditButtons(false);
                  setIsSuccessEditPopupOpen(true);
                  setTimeout(() => {
                    window.location.reload();
                  }, 500); // Adjust delay if needed
                }}
              >
                Save Changes
              </Button>
            </>
          )}
        </Box>
        <Snackbar
          open={isSuccessEditPopupOpen}
          autoHideDuration={3000} // Automatically close after 3 seconds
          onClose={() => setIsSuccessEditPopupOpen(false)} // Close on click or timeout
          anchorOrigin={{ vertical: "top", horizontal: "center" }} // Position of the popup
        >
          <Alert
            onClose={() => setIsSuccessEditPopupOpen(false)}
            severity="success"
            sx={{ width: "100%" }}
          >
            Successfully saved!
          </Alert>
        </Snackbar>
      </Box>

      <Box display="flex" gap="20px" width="100%" mt="20px">
        {/* SOCIAL ENTERPRISES TABLE */}
        <Box flex="2" backgroundColor={colors.primary[400]} padding="20px">
          <Typography
            variant="h3"
            fontWeight="bold"
            color={colors.greenAccent[500]}
            marginBottom="15px"
          >
            Social Enterprise List
          </Typography>
          <Box
            width="100%"
            height="600px"
            minHeight="400px"
            sx={{
              "& .MuiDataGrid-root": { border: "none" },
              "& .MuiDataGrid-cell": { borderBottom: "none" },
              "& .name-column--cell": { color: colors.greenAccent[300] },
              "& .MuiDataGrid-columnHeaders, & .MuiDataGrid-columnHeader": {
                backgroundColor: colors.blueAccent[700] + " !important",
              },
              "& .MuiDataGrid-virtualScroller": {
                backgroundColor: colors.primary[400],
              },
              "& .MuiDataGrid-footerContainer": {
                borderTop: "none",
                backgroundColor: colors.blueAccent[700],
              },
            }}
          >
            {loading ? (
              <Typography>Loading...</Typography>
            ) : (
              <DataGrid
                rows={socialEnterprises}
                columns={columns}
                getRowId={(row) => row.id}
                getRowHeight={() => "auto"}
                processRowUpdate={(params) => {
                  handleSERowUpdate(params);
                  return params;
                }}
                onRowClick={handleRowClick}
                editMode="row"
                // REFERERENCE for GridToolbar
                sx={{
                  "& .MuiDataGrid-cell": {
                    display: "flex",
                    alignItems: "center", // vertical centering
                    paddingTop: "12px",
                    paddingBottom: "12px",
                  },
                  "& .MuiDataGrid-columnHeader": {
                    alignItems: "center", // optional: center header label vertically
                  },
                  "& .MuiDataGrid-cellContent": {
                    whiteSpace: "normal", // allow line wrap
                    wordBreak: "break-word",
                  },
                  "& .MuiDataGrid-toolbarContainer .MuiButton-text": {
                    color: `${colors.grey[100]} !important`,
                  },
                }}
                slots={{ toolbar: GridToolbar }}
              />
            )}
          </Box>
        </Box>

        {/* APPLICATIONS TABLE */}
        {user?.roles?.includes("LSEED-Director") && (
          <Box
            flex="1"
            backgroundColor={colors.primary[400]}
            sx={{
              height: "700px", // 👈 adjust height as needed
              overflowY: "auto", // 👈 enables vertical scroll
            }}
          >
            <Box
              display="flex"
              justifyContent="space-between"
              alignItems="center"
              borderBottom={`4px solid ${colors.primary[500]}`}
              p="15px"
            >
              <Typography
                color={colors.greenAccent[500]}
                variant="h3"
                fontWeight="600"
              >
                Applications
              </Typography>
            </Box>

            {applications.map((list, i) => (
              <Box
                key={`${list.txId}-${i}`}
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                borderBottom={`4px solid ${colors.primary[500]}`}
                p="15px"
                sx={{ minHeight: "72px" }} // Ensures enough vertical space
              >
                {/* Left: Team Name & Abbreviation */}
                <Box
                  sx={{
                    flex: 1,
                    overflowWrap: "break-word",
                    whiteSpace: "normal",
                  }}
                >
                  <Typography
                    color={colors.greenAccent[500]}
                    variant="h5"
                    fontWeight="600"
                    sx={{
                      whiteSpace: "normal",
                      wordBreak: "break-word",
                    }}
                  >
                    {list.team_name}
                  </Typography>
                  <Typography
                    color={colors.grey[100]}
                    sx={{
                      whiteSpace: "normal",
                      wordBreak: "break-word",
                    }}
                  >
                    {list.se_abbreviation}
                  </Typography>
                </Box>

                {/* Middle: Date */}
                <Box
                  sx={{
                    flexShrink: 0,
                    color: colors.grey[100],
                    paddingLeft: "20px",
                    paddingRight: "20px",
                  }}
                >
                  {list.date_applied}
                </Box>

                {/* Right: Button */}
                <Button
                  onClick={(e) => handleOpenMenu(e, list.id)}
                  endIcon={<KeyboardArrowDownIcon />}
                  sx={{
                    backgroundColor: colors.greenAccent[500],
                    color: "#fff",
                    border: `2px solid ${colors.greenAccent[500]}`,
                    borderRadius: "4px",
                    textTransform: "none",
                    padding: "6px 12px",
                    "&:hover": {
                      backgroundColor: colors.greenAccent[600],
                      borderColor: colors.greenAccent[600],
                    },
                  }}
                >
                  Action
                </Button>

                {menuRowId === list.id && (
                  <Menu
                    anchorEl={anchorEl}
                    open={Boolean(anchorEl)}
                    onClose={handleCloseMenu}
                    anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                    transformOrigin={{ vertical: "top", horizontal: "right" }}
                  >
                    <MenuItem
                      onClick={() => handleMenuAction("View", list)}
                      sx={{
                        color: colors.grey[100],
                        fontWeight: 500,
                        "&:hover": {
                          backgroundColor: colors.blueAccent[700],
                          color: "#fff",
                        },
                      }}
                    >
                      View
                    </MenuItem>

                    <MenuItem
                      onClick={() => handleMenuAction("Accept", list)}
                      sx={{
                        color: colors.greenAccent[500],
                        fontWeight: 500,
                        "&:hover": {
                          backgroundColor: colors.greenAccent[500],
                          color: "#fff",
                        },
                      }}
                    >
                      Accept
                    </MenuItem>

                    <MenuItem
                      onClick={() => handleMenuAction("Decline", list)}
                      sx={{
                        color: "#f44336", // red
                        fontWeight: 500,
                        "&:hover": {
                          backgroundColor: "#f44336",
                          color: "#fff",
                        },
                      }}
                    >
                      Decline
                    </MenuItem>
                  </Menu>
                )}
              </Box>
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default SocialEnterprise;
