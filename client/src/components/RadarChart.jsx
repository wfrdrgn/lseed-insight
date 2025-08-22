import { useTheme } from "@mui/material";
import { ResponsiveRadar } from "@nivo/radar";
import { tokens } from "../theme";

const RadarChart = ({ radarData = [], isExporting = false }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  const formattedData =
    radarData?.map((item) => ({
      category: item.category,
      Overview: parseFloat(item.score),
    })) || [];

  // Adjusted colors
  const chartColor = isExporting
    ? "#00796b"
    : theme.palette.mode === "dark"
      ? colors.greenAccent[300]
      : colors.greenAccent[400];

  const borderChartColor = isExporting
    ? "#000000"
    : theme.palette.mode === "dark"
      ? colors.primary[300]
      : "#333333";

  const gridLineColor = isExporting
    ? "#000000"
    : theme.palette.mode === "dark"
      ? colors.grey[100]
      : "#ffffff"; // Light mode uses white for visibility

  const axisTextColor = isExporting ? "#000000" : "#ffffff";

  return (
    <ResponsiveRadar
      data={formattedData}
      keys={["Overview"]}
      indexBy="category"
      maxValue={5}
      margin={{ top: 50, right: 80, bottom: 40, left: 80 }}
      curve="linearClosed"
      borderWidth={2}
      borderColor={borderChartColor}
      gridLevels={5}
      gridShape="circular"
      gridLabelOffset={36}
      enableDots={true}
      dotSize={8}
      dotColor={chartColor}
      dotBorderWidth={2}
      dotBorderColor={borderChartColor}
      colors={chartColor}
      fillOpacity={isExporting ? 0.8 : 0.6}
      blendMode="multiply"
      motionConfig="wobbly"
      theme={{
        grid: {
          line: {
            stroke: gridLineColor,
            strokeWidth: isExporting ? 1.5 : 1,
            strokeOpacity: 1, // Ensure full visibility
          },
        },
        axis: {
          domain: {
            line: {
              stroke: gridLineColor,
              strokeWidth: isExporting ? 1.5 : 1,
            },
          },
          ticks: {
            line: {
              stroke: gridLineColor,
              strokeWidth: isExporting ? 1.5 : 1,
            },
            text: {
              fill: axisTextColor,
              fontSize: isExporting ? 12 : 11,
              fontWeight: 500,
            },
          },
        },
        legends: {
          text: { fill: axisTextColor },
        },
        tooltip: {
          container: {
            background: isExporting ? "#ffffff" : colors.primary[500],
            color: isExporting ? "#000000" : "#ffffff",
          },
        },
      }}
      legends={
        isExporting
          ? [] // Don't include legends when exporting
          : [
            {
              anchor: "top-left",
              direction: "column",
              translateX: -50,
              translateY: -40,
              itemWidth: 80,
              itemHeight: 20,
              itemOpacity: 0.9,
              symbolSize: 12,
              symbolShape: "circle",
              symbolBorderColor: colors.grey[700],
              effects: [
                {
                  on: "hover",
                  style: {
                    itemBackground: "rgba(0, 0, 0, 0.7)",
                    itemOpacity: 1,
                    color: "#ffffff",
                  },
                },
              ],
            },
          ]
      }
    />
  );
};

export default RadarChart;