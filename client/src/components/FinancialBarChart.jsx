import { useTheme } from "@mui/material";
import { ResponsiveBar } from "@nivo/bar";
import { tokens } from "../theme";

const FinancialBarChart = ({ data, dataKey, label }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  return (
    <ResponsiveBar
      data={data}
      keys={[dataKey]}
      indexBy="name"
      margin={{ top: 40, right: 150, bottom: 70, left: 100 }}
      padding={0.3}
      groupMode="grouped"
      colors={colors.greenAccent[500]}
      axisBottom={{
        tickSize: 0,
        tickPadding: 10,
        tickRotation: 0,
        legend: label,
        legendPosition: "middle",
        legendOffset: 50,
      }}
      axisLeft={{
        legend: dataKey === "profit" ? "Profit" : "Revenue",
        legendPosition: "middle",
        legendOffset: -80,
      }}
      enableLabel={true}
      labelSkipHeight={12}
      labelTextColor={colors.grey[100]}
      label={({ value }) => value.toLocaleString()}
      theme={{
        axis: {
          ticks: {
            text: {
              fill: colors.grey[100],
            },
          },
          legend: {
            text: {
              fill: colors.grey[100],
            },
          },
        },
        legends: {
          text: {
            fill: colors.grey[100],
          },
        },
      }}
      tooltip={({ id, value, indexValue }) => (
        <div
          style={{
            background: "white",
            padding: "10px",
            borderRadius: "5px",
            boxShadow: "0px 2px 6px rgba(0,0,0,0.2)",
            color: "black",
          }}
        >
          <strong>{indexValue}</strong>
          <br />
          {id.charAt(0).toUpperCase() + id.slice(1)}: ₱{value.toLocaleString()}
        </div>
      )}
    />
  );
};

export default FinancialBarChart;