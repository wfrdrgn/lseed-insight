import { useTheme } from "@mui/material";
import { ResponsiveBar } from "@nivo/bar";
import { tokens } from "../theme";

const HorizontalBarChart = ({ data, type }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  const transformData = (data = [], type) => {
    if (!data || data.length === 0) {
      console.warn("No data available for", type);
      return [];
    }

    return data.map((item) => ({
      label:
        type === "allCommonChallenges"
          ? item.comment || "No Comment"
          : item.category || "Unknown Category",
      value:
        parseFloat(
          type === "allCommonChallenges" ? item.percentage : item.score
        ) || 0,
    }));
  };

  const transformedData = transformData(data, type);

  return (
    <ResponsiveBar
      data={transformedData}
      keys={["value"]}
      indexBy="label"
      margin={{
        top: 50,
        right: 50,
        bottom: 50,
        left: type === "allCommonChallenges" ? 50 : 250,
      }}
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
        legend: type === "allCommonChallenges" ? "Percentage (%)" : "Score",
        legendPosition: "middle",
        legendOffset: 40,
      }}
      axisLeft={{
        tickSize: 5,
        tickPadding: 5,
        tickRotation: 0,
        legend:
          type === "allCommonChallenges" ? "Common Challenges" : "Categories", // Remove legend for Common Challenges
        legendPosition: "middle",
        legendOffset: -220,
        tickValues: type === "allCommonChallenges" ? [] : undefined, // Hide tick labels for Common Challenges
      }}
      enableLabel={true}
      labelSkipWidth={12}
      labelSkipHeight={12}
      labelTextColor={{ from: "color", modifiers: [["darker", 1.6]] }}
      tooltip={({ indexValue, value }) => (
        <div
          style={{ background: "#333", padding: "6px", borderRadius: "4px" }}
        >
          <strong>{indexValue}</strong>
          <br />
          {type === "allCommonChallenges"
            ? `Score: ${value}%`
            : `Score: ${value}`}
        </div>
      )}
      legends={[]}
      role="application"
      ariaLabel="Dynamic Horizontal Bar Chart"
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
  );
};

export default HorizontalBarChart;
