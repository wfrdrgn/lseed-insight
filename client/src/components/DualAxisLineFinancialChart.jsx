import { ResponsiveLine } from "@nivo/line";
import { useTheme } from "@mui/material";
import { tokens } from "../theme";

const DualAxisLineFinancialChart = ({
  data,
  isDashboard = false,
  isExporting = false,
}) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  // Set specific colors based on data type and export state
  const getLineColor = (seriesId) => {
    if (seriesId === "Revenue") {
      return "#4CAF50"; // Green for revenue
    } else if (seriesId === "Expenses") {
      return "#f44336"; // Red for expenses
    } else if (seriesId === "Equity") {
      return "#4CAF50"; // Green for equity
    } else {
      return "#000000"; // Black for other lines
    }
  };

  const axisAndGridColor = isExporting ? "#000000" : colors.grey[100];
  const textColor = isExporting ? "#000000" : "#ffffff";

  const allYValues = data?.flatMap((d) => d.data.map((point) => point.y)) || [];
  const minDataY = allYValues.length ? Math.min(...allYValues) : 0;
  const maxDataY = allYValues.length ? Math.max(...allYValues) : 1;
  const yBuffer = (maxDataY - minDataY) * 0.1;
  const minY = minDataY - yBuffer;
  const maxY = maxDataY + yBuffer;

  return (
    <div
      style={{
        width: isExporting ? "100%" : "80%",
        height: "100%",
        margin: "0 auto",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        position: "relative",
      }}
    >
      <ResponsiveLine
        data={data || []}
        theme={{
          axis: {
            domain: {
              line: {
                stroke: axisAndGridColor,
                strokeWidth: isExporting ? 2 : 1,
              },
            },
            legend: {
              text: {
                fill: textColor,
                fontSize: isExporting ? 16 : 12,
                fontWeight: isExporting ? "bold" : "normal",
              },
            },
            ticks: {
              line: {
                stroke: axisAndGridColor,
                strokeWidth: isExporting ? 2 : 1,
              },
              text: {
                fill: textColor,
                fontSize: isExporting ? 14 : 11,
                fontWeight: isExporting ? "bold" : "normal",
              },
            },
          },
          grid: {
            line: {
              stroke: axisAndGridColor,
              strokeWidth: isExporting ? 2 : 1,
              strokeOpacity: isExporting ? 0.8 : 1,
            },
          },
          legends: {
            text: {
              fill: textColor,
              fontSize: isExporting ? 14 : 11,
              fontWeight: isExporting ? "bold" : "normal",
            },
          },
          tooltip: {
            container: {
              background: isExporting ? "#ffffff" : colors.primary[500],
              color: isExporting ? "#000000" : "#ffffff",
              padding: "10px",
              borderRadius: "5px",
              fontSize: isExporting ? 14 : 12,
            },
          },
        }}
        colors={({ id }) => getLineColor(id)}
        margin={
          isExporting
            ? { top: 80, right: 240, bottom: 100, left: 100 }
            : { top: 60, right: 100, bottom: 80, left: 80 }
        }
        xScale={{ type: "point" }}
        yScale={{
          type: "linear",
          min: minY,
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
          tickPadding: 14,
          tickRotation: data?.length > 6 ? -30 : 0,
          legend: isExporting ? undefined : isDashboard ? undefined : "Quarter",
          legendOffset: isExporting ? 0 : 50,
          legendPosition: "middle",
        }}
        axisLeft={{
          orient: "left",
          tickValues: 7,
          tickSize: 3,
          tickPadding: 5,
          legend: isExporting
            ? undefined
            : isDashboard
            ? undefined
            : "Amount (₱)",
          legendOffset: -50,
          legendPosition: "middle",
        }}
        enableGridX={false}
        enableGridY={true}
        pointSize={isExporting ? 12 : 8}
        lineWidth={isExporting ? 4 : 2}
        pointColor="#ffffff"
        pointBorderWidth={isExporting ? 3 : 2}
        pointBorderColor={({ serieId }) => getLineColor(serieId)}
        pointLabelYOffset={-12}
        useMesh={true}
        legends={[
          {
            anchor: "bottom-right",
            direction: "column",
            translateX: isExporting ? 120 : 150,
            translateY: isExporting ? 0 : 0,
            itemsSpacing: 6,
            itemDirection: "left-to-right",
            itemWidth: 120,
            itemHeight: 20,
            itemOpacity: 1,
            symbolSize: isExporting ? 16 : 12,
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
    </div>
  );
};

export default DualAxisLineFinancialChart;
