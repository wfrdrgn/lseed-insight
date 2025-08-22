import { useTheme } from "@mui/material"; // ✅ Import useTheme from MUI
import { ResponsiveLine } from "@nivo/line"; // ✅ Import ResponsiveLine for charts
import { tokens } from "../theme"; // ✅ Ensure tokens is imported from your theme file

const DualAxisLineChart = ({ data, isDashboard = false }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  // ✅ Ensure data is not undefined before flattening
  const allYValues = data?.flatMap((d) => d.data.map((point) => point.y)) || [];

  const minDataY = allYValues.length ? Math.min(...allYValues) : 0;
  const maxDataY = allYValues.length ? Math.max(...allYValues) : 1;

  // ✅ Add a buffer around min/max values for better visibility
  const yBuffer = (maxDataY - minDataY) * 0.1; // 10% buffer
  const minY = minDataY - yBuffer;
  const maxY = maxDataY + yBuffer;

  return (
    <ResponsiveLine
      data={data || []} // ✅ Default to empty array if data is undefined
      theme={{
        axis: {
          domain: { line: { stroke: colors.grey[100] } },
          legend: { text: { fill: colors.grey[100] } },
          ticks: {
            line: { stroke: colors.grey[100], strokeWidth: 1 },
            text: { fill: colors.grey[100] },
          },
        },
        legends: { text: { fill: colors.grey[100] } },
        tooltip: {
          container: {
            background: colors.primary[400], // ✅ Dark background for better contrast
            color: colors.grey[100],
            padding: "10px",
            borderRadius: "5px",
          },
        },
      }}
      colors={[colors.greenAccent[500], colors.blueAccent[500]]} // Explicitly assign colors
      margin={{ top: 50, right: 210, bottom: 60, left: 60 }}
      xScale={{ type: "point" }}
      yScale={{
        type: "linear",
        min: minY, // ✅ Ensure a dynamic min/max range
        max: maxY,
        stacked: false,
        reverse: false,
      }}
      yFormat=" >-.2f"
      curve="catmullRom"
      axisTop={null}
      axisRight={null}
      axisBottom={{
        orient: "bottom",
        tickSize: 0,
        tickPadding: 10,
        tickRotation: data?.length > 6 ? -30 : 0, // ✅ Rotate if many quarters
        legend: isDashboard ? undefined : "Quarter",
        legendOffset: 50,
        legendPosition: "middle",
      }}
      axisLeft={{
        orient: "left",
        tickValues: 7, // ✅ Auto-generate ticks instead of hardcoding
        tickSize: 3,
        tickPadding: 5,
        tickRotation: 0,
        legend: isDashboard ? undefined : "Improvement Score",
        legendOffset: -50,
        legendPosition: "middle",
      }}
      enableGridX={false}
      enableGridY={true}
      pointSize={8}
      pointColor={{ theme: "background" }}
      pointBorderWidth={2}
      pointBorderColor={{ from: "serieColor" }}
      pointLabelYOffset={-12}
      useMesh={true}
      legends={[
        {
          anchor: "top-right", // ✅ Move legend to top-right for better visibility
          direction: "column",
          justify: false,
          translateX: 100,
          translateY: 0,
          itemsSpacing: 4,
          itemDirection: "left-to-right",
          itemWidth: 80,
          itemHeight: 10,
          itemOpacity: 1,
          symbolSize: 12,
          symbolShape: "circle",
          symbolBorderColor: "rgba(0, 0, 0, .5)",
          effects: [
            {
              on: "hover",
              style: {
                itemBackground: "rgba(0, 0, 0, .03)",
                itemOpacity: 1,
              },
            },
          ],
        },
      ]}
    />
  );
};

export default DualAxisLineChart;
