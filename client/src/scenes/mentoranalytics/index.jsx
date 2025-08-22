import AssignmentIcon from "@mui/icons-material/Assignment";
import GroupsIcon from "@mui/icons-material/Groups";
import StarIcon from "@mui/icons-material/Star";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { DataGrid, GridToolbar } from "@mui/x-data-grid";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom"; // Import useNavigate
import axiosClient from "../../api/axiosClient";
import MentorHorizontalBarChart from "../../components/MentorHorizontalBarChart";
import RadarChart from "../../components/RadarChart";
import StatBox from "../../components/StatBox"; // Adjust the path based on your project structure
import { tokens } from "../../theme";

const MentorAnalytics = () => {
  const theme = useTheme(); // Now 'useTheme' is defined
  const colors = tokens(theme.palette.mode);
  const { id } = useParams(); // Extract the `id` from the URL
  const [selectedMentorId, setSelectedMentorId] = useState(id);
  const [mentorAnalytics, setMentorAnalytics] = useState([]);
  const navigate = useNavigate(); // Initialize useNavigate
  const [categoryType, setCategoryType] = useState("mentor"); // ✅ Define state here
  const [evaluationsData, setEvaluationsData] = useState([]);
  const [isLoadingEvaluations, setIsLoadingEvaluations] = useState(false);
  const [selectedEvaluation, setSelectedEvaluation] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [criticalAreas, setCriticalAreas] = useState([]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await axiosClient.get(
          `/api/mentor-analytics/${selectedMentorId}`
        );
        const data = response.data;

        // Extract values correctly
        setMentorAnalytics({
          totalEvaluations: data.totalEvaluations || 0,
          avgRating: data.avgRating || "N/A",
          mostFrequentRating: data.mostFrequentRating || "N/A",
          numHandledSEs: data.numHandledSEs || 0,
          avgRatingPerCategory: data.avgRatingPerCategory || [],
          performanceOverview: data.performanceOverview || [],
        });

        // ✅ Fetch mentor critical areas
        const areasResponse = await axiosClient.get(
          `/api/mentor-critical-areas/${selectedMentorId}`
        );
        const areasData = areasResponse.data;

        setCriticalAreas(areasData.criticalAreas || []);
        
      } catch (error) {
        console.error("❌ Error fetching analytics stats:", error);
      }
    };

    if (selectedMentorId) {
      fetchStats();
    }
  }, [selectedMentorId]);

  useEffect(() => {
    const fetchEvaluations = async () => {
      try {
        setIsLoadingEvaluations(true);

        const response = await axiosClient.get(
          `/api/get-mentor-evaluations-by-mentor-id`,
          { params: { mentor_id: id } } // ✅ Correct query parameter usage
        );

        const data = response.data; // ✅ Axios already returns JSON, no need for .json()

        if (!Array.isArray(data)) {
          console.error("❌ Unexpected API Response (Not an Array):", data);
          return;
        }

        // Ensure evaluation_id is included and set as `id`
        const formattedData = data.map((evaluation) => ({
          id: evaluation.evaluation_id, // ✅ Use evaluation_id as the unique ID
          mentor_name: evaluation.mentor_name,
          evaluator_name: evaluation.evaluator_name, // ✅ SE evaluating the mentor
          evaluation_date: evaluation.evaluation_date,
        }));

        console.log("✅ Formatted Evaluations Data:", formattedData);
        setEvaluationsData(formattedData);
      } catch (error) {
        console.error("❌ Error fetching evaluations:", error);
      } finally {
        setIsLoadingEvaluations(false);
      }
    };

    if (id) {
      fetchEvaluations();
    }
  }, [id]);

  const columns = [
    { field: "mentor_name", headerName: "Mentor", flex: 1, minWidth: 150 },
    { field: "evaluator_name", headerName: "Evaluator (SE)", flex: 1, minWidth: 150 },
    { field: "evaluation_date", headerName: "Evaluation Date", flex: 1, minWidth: 150 },
    {
      field: "action",
      headerName: "Action",
      flex: 1,
      minWidth: 150,  
      renderCell: (params) => (
        <Button
          variant="contained"
          style={{ backgroundColor: colors.primary[600], color: "white" }}
          onClick={() => handleViewExistingEvaluation(params.row.id)} // ✅ Pass evaluation_id
        >
          View
        </Button>
      ),
    },
  ];

  const handleViewExistingEvaluation = async (evaluation_id) => {
    try {
      const response = await axiosClient.get(
        `/api/get-evaluation-details-for-mentor-evaluation`,
        { params: { evaluation_id } }
      );

      // 🚨 Ensure response.data is an array
      if (
        !response.data ||
        !Array.isArray(response.data) ||
        response.data.length === 0
      ) {
        console.warn("⚠️ No evaluation details found.");
        return;
      }

      // ✅ Process evaluation details safely
      const groupedEvaluation = response.data.reduce((acc, evalItem) => {
        const {
          evaluation_date,
          evaluator_name,
          mentor_name,
          category_name,
          star_rating,
          selected_comments,
          additional_comment,
        } = evalItem;

        if (!acc.id) {
          acc.id = evaluation_id;
          acc.evaluator_name = evaluator_name; // ✅ Social Enterprise (Evaluator)
          acc.mentor_name = mentor_name; // ✅ Mentor being evaluated
          acc.evaluation_date = evaluation_date;
          acc.categories = [];
        }

        acc.categories.push({
          category_name,
          star_rating,
          selected_comments: Array.isArray(selected_comments)
            ? selected_comments
            : [], // ✅ Ensure it's always an array
          additional_comment: additional_comment || "", // ✅ Ensure empty comments don't cause issues
        });

        return acc;
      }, {});

      console.log("✅ Processed Evaluation Data:", groupedEvaluation);
      setSelectedEvaluation(groupedEvaluation);
      setOpenDialog(true);
    } catch (error) {
      console.error("❌ Error fetching evaluation details:", error);
    }
  };

  if (!selectedMentorId) {
    return <Box>No Mentor found</Box>;
  }

  return (
    <Box m="20px">
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center">
        {/* Page Title */}
        <Typography variant="h4" fontWeight="bold" color={colors.grey[100]}>
          {selectedMentorId.mentorName} Analytics
        </Typography>
      </Box>

      {/* Row 1 - StatBoxes */}
      <Box
        display="flex"
        flexWrap="wrap"
        gap="20px"
        justifyContent="space-between"
        mt="20px"
      >
        {/* Total Evaluations */}
        <Box
          flex="1 1 22%"
          backgroundColor={colors.primary[400]}
          display="flex"
          alignItems="center"
          justifyContent="center"
          p="20px"
        >
          <StatBox
            title={mentorAnalytics.totalEvaluations}
            subtitle="Total Evaluations"
            progress={1} // Always full bar
            increase={`${mentorAnalytics.totalEvaluations} Evaluations`}
            icon={
              <AssignmentIcon
                sx={{ fontSize: "26px", color: colors.blueAccent[500] }}
              />
            }
          />
        </Box>

        {/* Most Frequent Rating */}
        <Box
          flex="1 1 22%"
          backgroundColor={colors.primary[400]}
          display="flex"
          alignItems="center"
          justifyContent="center"
          p="20px"
        >
          <StatBox
            title={mentorAnalytics.mostFrequentRating}
            subtitle="Most Frequent Rating"
            progress={null} // No progress bar needed
            sx={{ "& .MuiBox-root.css-1ntui4p": { display: "none" } }} // Hide the progress circle
            icon={
              <StarIcon
                sx={{ fontSize: "26px", color: colors.greenAccent[500] }}
              />
            }
          />
        </Box>

        {/* Number of SEs Handled */}
        <Box
          flex="1 1 22%"
          backgroundColor={colors.primary[400]}
          display="flex"
          alignItems="center"
          justifyContent="center"
          p="20px"
        >
          <StatBox
            title={mentorAnalytics.numHandledSEs}
            subtitle="Mentorships"
            progress={null} // No progress bar needed
            sx={{ "& .MuiBox-root.css-1ntui4p": { display: "none" } }} // Hide the progress circle
            icon={
              <GroupsIcon
                sx={{ fontSize: "26px", color: colors.greenAccent[500] }}
              />
            }
          />
        </Box>

        {/* Average Rating */}
        <Box
          flex="1 1 22%"
          backgroundColor={colors.primary[400]}
          display="flex"
          alignItems="center"
          justifyContent="center"
          p="20px"
        >
          <StatBox
            title={mentorAnalytics.avgRating}
            subtitle="Average Rating"
            progress={mentorAnalytics.avgRating / 5} // Normalize to 0-1 scale
            increase={`${mentorAnalytics.avgRating} / 5`}
            icon={
              <TrendingUpIcon
                sx={{ fontSize: "26px", color: colors.blueAccent[500] }}
              />
            }
          />
        </Box>
      </Box>

      <Box
        flex="1 1 100%"
        height="450px"
        backgroundColor={colors.primary[400]}
        marginTop="20px"
        p="20px"
      >
        {/* Title */}
        <Typography
          variant="h3"
          fontWeight="bold"
          color={colors.greenAccent[500]}
          mb={2}
        >
          Average Rating per Category
        </Typography>

        {/* Toggle Button */}
        <Box display="flex" justifyContent="flex-end" mb={2}>
          <Button
            variant="contained"
            sx={{
              backgroundColor: colors.blueAccent[500],
              color: "black",
              "&:hover": { backgroundColor: colors.blueAccent[700] },
            }}
            onClick={() =>
              setCategoryType(categoryType === "mentor" ? "session" : "mentor")
            }
          >
            {categoryType === "mentor"
              ? "Show Mentoring Sessions"
              : "Show Mentor Categories"}
          </Button>
        </Box>

        {/* Chart Container */}
        <Box 
          display="flex"
          flexDirection="column"
          gap={3}
          marginBottom={2}
          marginTop={2}
        >
          <MentorHorizontalBarChart
            mentorId={selectedMentorId}
            categoryType={categoryType}
          />
        </Box>
      </Box>

      <Box display="flex" gap="20px" width="100%" mt="20px">
        {/* Evaluations Table */}
        <Box
          sx={{
            backgroundColor: colors.primary[400],
            padding: "20px",
            boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
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
          <Typography
            variant="h5"
            fontWeight="bold"
            color={colors.grey[100]}
            mb={2}
          >
            Evaluations
          </Typography>
          <DataGrid
            rows={evaluationsData}
            columns={columns}
            getRowId={(row) => row.id}
            getRowHeight={() => 'auto'}
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
                  whiteSpace: "normal",
                  wordBreak: "break-word",
                  overflowWrap: "break-word",
                },
                "& .MuiDataGrid-toolbarContainer .MuiButton-text": {
                color: `${colors.grey[100]} !important`,
                },
              }}
              slots={{ toolbar: GridToolbar }}
          />
        </Box>

        {/* Critical Areas of Focus Table */}
        <Box
          flex="1"
          backgroundColor={colors.primary[400]}
          height="500px"
          display="flex"
          flexDirection="column"
        >
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            borderBottom={`4px solid ${colors.primary[500]}`}
            p="15px"
            flexShrink={0}
          >
            <Typography
              color={colors.greenAccent[500]}
              variant="h3"
              fontWeight="600"
            >
              Critical Areas of Focus
            </Typography>
          </Box>
          {/* Scrollable List */}
          <Box
            sx={{
              flex: 1,
              overflowY: "auto",
            }}
          >
            {criticalAreas.map((area, i) => (
              <Box
                key={i}
                display="flex"
                alignItems="center"
                borderBottom={`4px solid ${colors.primary[500]}`}
                p="15px"
              >
                {/* Icon */}
                <Box sx={{ pr: 2, fontSize: "24px" }}>📌</Box>

                {/* Area Name */}
                <Typography
                  color={colors.grey[100]}
                  variant="h6"
                  fontWeight="500"
                  sx={{
                    whiteSpace: "normal",
                    wordBreak: "break-word",
                  }}
                >
                  {area}
                </Typography>
              </Box>
            ))}
          </Box>

        </Box>
      </Box>

      {/* Mentor Evaluation Details Dialog - Read-Only */}
      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
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
        {/* Title with DLSU Green Background */}
        <DialogTitle
          sx={{
            backgroundColor: "#1E4D2B", // DLSU Green header
            color: "#fff", // White text
            textAlign: "center",
            fontSize: "1.5rem",
            fontWeight: "bold",
          }}
        >
          View Mentor Evaluation
        </DialogTitle>

        {/* Content Section */}
        <DialogContent
          sx={{
            padding: "24px",
            maxHeight: "70vh", // Ensure it doesn't overflow the screen
            overflowY: "auto", // Enable scrolling if content is too long
          }}
        >
          {selectedEvaluation ? (
            <>
              {/* Evaluator (Social Enterprise) and Evaluation Date */}
              <Box
                sx={{
                  marginBottom: "16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                }}
              >
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: "bold",
                    borderBottom: "1px solid #000", // Separator line
                    paddingBottom: "8px",
                  }}
                >
                  Evaluator (Social Enterprise):{" "}
                  {selectedEvaluation.evaluator_name}
                </Typography>
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: "bold",
                    borderBottom: "1px solid #000", // Separator line
                    paddingBottom: "8px",
                  }}
                >
                  Mentor Evaluated: {selectedEvaluation.mentor_name}
                </Typography>
                <Typography variant="subtitle1" sx={{ color: "#000" }}>
                  Evaluation Date: {selectedEvaluation.evaluation_date}
                </Typography>
              </Box>

              {/* Ratings Section */}
              {selectedEvaluation.categories &&
              selectedEvaluation.categories.length > 0 ? (
                selectedEvaluation.categories.map((category, index) => (
                  <Box
                    key={index}
                    sx={{
                      marginBottom: "16px",
                      padding: "12px",
                      border: "1px solid #000", // Border for each category
                      borderRadius: "8px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    {/* Category Name */}
                    <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
                      {category.category_name}
                    </Typography>

                    {/* Star Rating */}
                    <Typography
                      variant="h6"
                      sx={{ fontWeight: "bold", color: "#1E4D2B" }} // DLSU Green color for rating
                    >
                      {category.star_rating} ★
                    </Typography>
                  </Box>
                ))
              ) : (
                <Typography variant="body1" sx={{ fontStyle: "italic" }}>
                  No categories found for this evaluation.
                </Typography>
              )}
            </>
          ) : (
            <Typography variant="body1" sx={{ fontStyle: "italic" }}>
              Loading evaluation details...
            </Typography>
          )}
        </DialogContent>

        {/* Action Buttons */}
        <DialogActions sx={{ padding: "16px", borderTop: "1px solid #000" }}>
          <Button
            onClick={() => setOpenDialog(false)}
            sx={{
              color: "#000",
              border: "1px solid #000",
              "&:hover": { backgroundColor: "#f0f0f0" }, // Hover effect
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Performance Overview */}
      <Box
        mt="20px"
        sx={{
          backgroundColor: colors.primary[400],
          padding: "20px",
          boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
        }}
      >
        <Typography variant="h5" fontWeight="bold" color={colors.grey[100]}>
          Performance Overview
        </Typography>
        <Box
          height="300px"
          display="flex"
          justifyContent="center"
          alignItems="center"
        >
          {!mentorAnalytics.performanceOverview ||
          mentorAnalytics.performanceOverview.length === 0 ? (
            <Typography variant="h6" color={colors.grey[300]}>
              Performance Overview Unavailable.
            </Typography>
          ) : (
            <RadarChart radarData={mentorAnalytics.performanceOverview} />
          )}
        </Box>
      </Box>

      {/* Back Button with Spacing */}
      <Box mt="20px" display="flex" justifyContent="start">
        <Button
          variant="contained"
          sx={{
            backgroundColor: colors.blueAccent[500],
            color: "black",
            "&:hover": {
              backgroundColor: colors.blueAccent[800],
            },
            width: "2/12", // Take up 2/12 of the space
            maxWidth: "150px", // Optional: Add a max-width for better control
          }}
          onClick={() => navigate(-1)} // Navigate back to the Mentors page
        >
          Back
        </Button>
      </Box>
    </Box>
  );
};

export default MentorAnalytics;
