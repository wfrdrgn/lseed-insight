import { useTheme } from "@mui/material";
import { ResponsivePie } from "@nivo/pie";
import { tokens } from "../theme";

const PieChart = ({ data, isDashboard = false, isExporting = false }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  if (!data || !Array.isArray(data) || data.length === 0)
    return <p>No data available</p>;

  const isDarkMode = isExporting ? true : theme.palette.mode === "dark";

  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <ResponsivePie
      data={data}
      margin={{ top: 40, right: 100, bottom: 80, left: 100 }}
      innerRadius={0.4}
      padAngle={2}
      cornerRadius={6}
      activeOuterRadiusOffset={10}
      animate={!isExporting}
      enableArcLabels={true} // Always enabled for both modes
      arcLabel={(e) => `${e.value}`} // Display raw value inside slice
      enableArcLinkLabels={true} // ✅ Always show category outside
      arcLinkLabelsSkipAngle={10}
      arcLabelsTextColor={isExporting ? "#000" : isDarkMode ? "#fff" : "#333"} 
      arcLinkLabelsTextColor={isExporting ? "#000" : isDarkMode ? "#fff" : "#333"} 
      arcLinkLabelsThickness={2}
      arcLinkLabelsColor={{ from: "color" }}
      colors={{ scheme: "category10" }}
      borderWidth={2}
      borderColor={{ from: "color", modifiers: [["darker", 0.3]] }}
      theme={{
        axis: {
          ticks: {
            text: {
              fill: isDarkMode ? "#fff" : "#333",
              fontSize: 12,
              fontWeight: 500,
            },
          },
        },
        legends: {
          text: {
             fill: isExporting ? "#000" : isDarkMode ? "#fff" : "#333", 
          },
        },
        tooltip: {
          container: {
            background: isDarkMode ? "#333" : "#fff",
            color: isDarkMode ? "#fff" : "#333",
            padding: "10px",
            borderRadius: "5px",
            boxShadow: "0px 0px 10px rgba(0, 0, 0, 0.2)",
          },
        },
      }}
      tooltip={({ datum }) => {
        const percent = ((datum.data.value / total) * 100).toFixed(2);
        return (
          <div
            style={{
              background: isDarkMode ? "#222" : "#fff",
              color: isDarkMode ? "#fff" : "#333",
              padding: "8px",
              borderRadius: "5px",
              boxShadow: "0px 2px 10px rgba(0, 0, 0, 0.1)",
            }}
          >
            <strong>{datum.id}</strong>
            <div>Percentage: {percent}%</div>
          </div>
        );
      }}
      legends={[
        {
          anchor: "bottom",
          direction: "row",
          justify: false,
          translateX: 0,
          translateY: 56,
          itemsSpacing: 10,
          itemWidth: 120,
          itemHeight: 18,
          itemTextColor: isExporting ? "#000" : isDarkMode ? "#fff" : "#333",
          symbolSize: 18,
          symbolShape: "circle",
        },
      ]}
    />
  );
};

export default PieChart;