import { useTheme } from "@mui/material"; // ✅ Fix: Import useTheme from MUI
import { ResponsiveLine } from "@nivo/line"; // ✅ Fix: Import ResponsiveLine for charts
import { addDays, format } from "date-fns"; // ✅ Fix: Import format and addDays from date-fns
import { tokens } from "../theme"; // ✅ Fix: Ensure tokens is imported from your theme file

const LineChart = ({ data, isDashboard = false, dateRange = 60 }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  // ✅ Generate date range dynamically (default: today + 60 days)
  const generateDateRange = (numDays) => {
    const today = new Date();
    return Array.from(
      { length: numDays },
      (_, i) => format(addDays(today, i), "yyyy-MM") // Format as "YYYY-MM"
    );
  };

  // ✅ Default to today + 60 days unless overridden
  const xAxisDates = generateDateRange(dateRange);

  // ✅ Ensure data is not undefined before flattening
  const allYValues = data?.flatMap((d) => d.data.map((point) => point.y)) || [];
  const minY = allYValues.length ? Math.min(...allYValues, 0) : 0;
  const maxY = allYValues.length ? Math.max(...allYValues, 5) : 5;

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
        tooltip: { container: { color: colors.primary[500] } },
      }}
      colors={isDashboard ? { datum: "color" } : { scheme: "nivo" }}
      margin={{ top: 50, right: 180, bottom: 60, left: 60 }}
      xScale={{
        type: "point",
        domain: xAxisDates, // ✅ Controlled inside LineChart
      }}
      yScale={{
        type: "linear",
        min: minY, // ✅ Dynamic min based on dataset
        max: maxY, // ✅ Dynamic max based on dataset
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
        tickPadding: 5,
        tickRotation: 0,
        legend: isDashboard ? undefined : "Month",
        legendOffset: 36,
        legendPosition: "middle",
      }}
      axisLeft={{
        orient: "left",
        tickValues: [0, 1, 2, 3, 4, 5], // ✅ Y-axis based on dataset
        tickSize: 3,
        tickPadding: 5,
        tickRotation: 0,
        legend: isDashboard ? undefined : "Average Rating",
        legendOffset: -40,
        legendPosition: "middle",
      }}
      enableGridX={false}
      enableGridY={false}
      pointSize={8}
      pointColor={{ theme: "background" }}
      pointBorderWidth={2}
      pointBorderColor={{ from: "serieColor" }}
      pointLabelYOffset={-12}
      useMesh={true}
      legends={[
        {
          anchor: "bottom-right", // ✅ Move legend to bottom-right
          direction: "column",
          justify: false,
          translateX: 110, // ✅ Adjust position horizontally
          translateY: -30, // ✅ Move down
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

export default LineChart;