import { Box, Typography, useTheme } from "@mui/material";
import { ResponsiveBar } from "@nivo/bar";
import { useEffect, useState } from "react";
import axiosClient from "../api/axiosClient";
import { tokens } from "../theme";

const MentorHorizontalBarChart = ({ mentorId, categoryType }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const [avgRatings, setAvgRatings] = useState([]);

  useEffect(() => {
    const fetchMentorAvgRatings = async () => {
      if (!mentorId) return;

      try {
        const response = await axiosClient.get(
          `/api/mentor-analytics/${mentorId}`
        );

        const data = response.data;

        if (!data.avgRatingPerCategory || !Array.isArray(data.avgRatingPerCategory)) {
          console.warn("❌ Unexpected response:", data);
          setAvgRatings([]);
          return;
        }

        const transformed = data.avgRatingPerCategory.map((item) => ({
          category: item.category_name,
          score: parseFloat(item.avg_rating) || 0,
        }));

        setAvgRatings(transformed);
      } catch (error) {
        console.error("❌ Error fetching mentor rating stats:", error);
        setAvgRatings([]);
      }
    };

    fetchMentorAvgRatings();
  }, [mentorId]);

  // Define categories for filtering
  const mentorCategories = [
    "Overall-coordination and all around presence",
    "Guidance of mentor to team all throughout the program implementation",
    "Knowledge and competence",
    "Communication",
    "Clarity",
    "Understanding and thought-processing",
    "Openness to Suggestions and Collaboration",
  ];

  const sessionCategories = [
    "Sufficiency of number/frequency of mentoring sessions",
    "Effectiveness of mentoring sessions",
    "Time allotment for mentoring sessions",
  ];

  // Filter data based on category type
  const transformedData = avgRatings.filter((item) =>
    categoryType === "mentor"
      ? mentorCategories.includes(item.category)
      : sessionCategories.includes(item.category)
  );

  return (
    <Box height="300px" width="80%">
      {transformedData.length === 0 ? (
        <Box
          display="flex"
          alignItems="center"
          justifyContent="center"
          height="100%"
        >
          <Typography variant="h6" color="error" textAlign="center">
            No data available for this mentor.
          </Typography>
        </Box>
      ) : (
        <ResponsiveBar
          data={transformedData}
          keys={["score"]}
          indexBy="category"
          margin={{ top: 50, right: 50, bottom: 50, left: 250 }}
          padding={0.3}
          layout="horizontal"
          valueScale={{ type: "linear" }}
          indexScale={{ type: "band", round: true }}
          colors={{ scheme: "nivo" }}
          borderColor={{ from: "color", modifiers: [["darker", 1.6]] }}
          axisTop={null}
          axisRight={null}
          axisBottom={{
            tickSize: 5,
            tickPadding: 5,
            tickRotation: 0,
            legend: "Average Rating",
            legendPosition: "middle",
            legendOffset: 40,
          }}
          axisLeft={{
            tickSize: 5,
            tickPadding: 5,
            tickRotation: 0,
            legend: "Categories",
            legendPosition: "middle",
            legendOffset: -200,
          }}
          enableLabel={true}
          labelSkipWidth={12}
          labelSkipHeight={12}
          labelTextColor={{ from: "color", modifiers: [["darker", 1.6]] }}
          tooltip={({ indexValue, value }) => (
            <div style={{ background: "#333", padding: "6px", borderRadius: "4px", color: "#fff" }}>
              <strong>{indexValue}</strong>
              <br />
              Score: {value}
            </div>
          )}
          legends={[]}
          role="application"
          ariaLabel="Mentor Average Ratings per Category"
          theme={{
            axis: {
              domain: { line: { stroke: colors.grey[100] } },
              legend: { text: { fill: colors.grey[100] } },
              ticks: {
                line: { stroke: colors.grey[100], strokeWidth: 1 },
                text: { fill: colors.grey[100] },
              },
            },
            tooltip: { container: { color: colors.primary[500] } },
          }}
        />
      )}
    </Box>
  );
};

export default MentorHorizontalBarChart;