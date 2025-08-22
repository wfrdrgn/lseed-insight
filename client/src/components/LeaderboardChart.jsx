import { useTheme } from "@mui/material";
import { ResponsiveBar } from "@nivo/bar";
import { tokens } from "../theme";

const LeaderboardChart = ({ data }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  if (!data || !Array.isArray(data)) return null;

  const chartData = data
    .map((se) => ({
      social_enterprise: se.social_enterprise, // Used for X-axis
      full_name: se.full_name || se.fullName || "Unknown", // Ensure full_name is not undefined
      rating: parseFloat(se.overall_weighted_avg_rating) || 0, // Handle possible undefined values
      performance_change: parseFloat(se.performance_change) || 0, // Ensure performance_change is a valid number
    }))
    .sort((a, b) => b.rating - a.rating); // Sort by highest rating

  return (
    <ResponsiveBar
      data={chartData}
      keys={["rating"]}
      indexBy="social_enterprise"
      maxValue={5}
      margin={{ top: 40, right: 40, bottom: 70, left: 60 }}
      padding={0.3}
      colors={({ data }) => {
        const change = data.performance_change;
        if (change > 0)
          return theme.palette.mode === "dark"
            ? colors.greenAccent[300]
            : colors.greenAccent[500];
        if (change < 0)
          return theme.palette.mode === "dark"
            ? colors.redAccent[300]
            : colors.redAccent[500];
        return colors.grey[400]; // Neutral color when no change
      }}
      axisLeft={{
        legend: "Rating",
        legendPosition: "middle",
        legendOffset: -40,
        tickValues: [1, 2, 3, 4, 5],
        format: (v) => Math.round(v),
        tickTextColor: colors.grey[100],
      }}
      tooltip={({ value, indexValue, data }) => {
        const performanceChange = (data.performance_change || 0).toFixed(2); // Ensure a valid number
        const isIncrease = parseFloat(performanceChange) > 0;
        const isDecrease = parseFloat(performanceChange) < 0;
        const changeSymbol = isIncrease ? "▲" : isDecrease ? "▼" : "--"; // Use -- for no change
        const changeColor = isIncrease
          ? colors.greenAccent[500]
          : isDecrease
            ? colors.redAccent[500]
            : colors.grey[400]; // Neutral color when no change

        return (
          <div
            style={{
              background: colors.grey[400],
              color: colors.grey[100],
              padding: "8px",
              borderRadius: "5px",
              boxShadow: "0px 0px 10px rgba(0, 0, 0, 0.1)",
              maxWidth: "250px", // Prevent overflow for long names
              wordWrap: "break-word",
            }}
          >
            <strong>{data.full_name}</strong> {/* Show full name */}
            <div>Avg Rating: {value.toFixed(2)}</div>
            <div style={{ color: changeColor }}>
              {changeSymbol} {performanceChange}
            </div>
          </div>
        );
      }}
      layout="vertical"
      labelSkipWidth={12}
      labelSkipHeight={12}
      labelTextColor={colors.grey[100]}
      theme={{
        axis: {
          domain: {
            line: { stroke: colors.grey[100] },
          },
          legend: {
            text: { fill: colors.grey[100] },
          },
          ticks: {
            line: { stroke: colors.grey[100], strokeWidth: 1 },
            text: { fill: colors.grey[100] },
          },
        },
        legends: {
          text: { fill: colors.grey[100] },
        },
        tooltip: {
          container: {
            background: colors.grey[400],
            color: colors.grey[100],
          },
        },
      }}
    />
  );
};

export default LeaderboardChart;