import { useTheme } from "@mui/material";
import { ResponsiveBar } from "@nivo/bar";
import { tokens } from "../theme";

const LikertChart = ({ data, isExporting = false }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  // Use black colors when exporting for better PDF visibility
  const textColor = isExporting ? "#000000" : colors.grey[100];
  const axisColor = isExporting ? "#000000" : colors.grey[100];

  const transformLikertData = (data) => {
    const categoryMap = {};

    data.forEach(({ category_name, rating, rating_count }) => {
      if (!categoryMap[category_name]) {
        categoryMap[category_name] = {
          category: category_name,
          "1 Star": 0,
          "2 Stars": 0,
          "3 Stars": 0,
          "4 Stars": 0,
          "5 Stars": 0,
        };
      }
      categoryMap[category_name][`${rating} Stars`] = parseInt(
        rating_count,
        10
      );
    });

    return Object.values(categoryMap);
  };

  const transformedData = transformLikertData(data);

  return (
    <ResponsiveBar
      data={transformedData}
      keys={["1 Star", "2 Stars", "3 Stars", "4 Stars", "5 Stars"]}
      indexBy="category"
      margin={{ top: 50, right: 130, bottom: 50, left: 60 }}
      padding={0.3}
      valueScale={{ type: "linear" }}
      indexScale={{ type: "band", round: true }}
      colors={{ scheme: "nivo" }}
      borderColor={{ from: "color", modifiers: [["darker", 1.6]] }}
      axisBottom={{
        tickSize: 5,
        tickPadding: 5,
        tickRotation: 0,
        legend: "Category",
        legendPosition: "middle",
        legendOffset: 32,
      }}
      axisLeft={{
        tickSize: 5,
        tickPadding: 5,
        tickRotation: 0,
        legend: "Number of Ratings",
        legendPosition: "middle",
        legendOffset: -40,
      }}
      labelSkipWidth={12}
      labelSkipHeight={12}
      labelTextColor={{ from: "color", modifiers: [["darker", 1.6]] }}
      legends={[
        {
          dataFrom: "keys",
          anchor: "bottom-right",
          direction: "column",
          justify: false,
          translateX: 120,
          translateY: 0,
          itemsSpacing: 2,
          itemWidth: 100,
          itemHeight: 20,
          itemDirection: "left-to-right",
          itemOpacity: 0.85,
          symbolSize: 20,
          effects: [{ on: "hover", style: { itemOpacity: 1 } }],
        },
      ]}
      role="application"
      ariaLabel="Likert Chart"
      theme={{
        axis: {
          domain: {
            line: {
              stroke: axisColor,
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
              stroke: axisColor,
              strokeWidth: isExporting ? 2 : 1,
            },
            text: {
              fill: textColor,
              fontSize: isExporting ? 14 : 11,
              fontWeight: isExporting ? "bold" : "normal",
            },
          },
        },
        legends: {
          text: {
            fill: textColor,
            fontSize: isExporting ? 14 : 11,
            fontWeight: isExporting ? "bold" : "normal",
          },
        },
        grid: {
          line: {
            stroke: axisColor,
            strokeWidth: isExporting ? 1 : 0.5,
            strokeOpacity: isExporting ? 0.8 : 0.5,
          },
        },
        tooltip: {
          container: {
            color: isExporting ? "#000000" : colors.primary[500],
            background: isExporting ? "#ffffff" : colors.primary[400],
          },
        },
      }}
    />
  );
};

export default LikertChart;