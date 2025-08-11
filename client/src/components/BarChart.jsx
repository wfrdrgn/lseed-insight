import { useState, useEffect } from "react";
import { ResponsiveBar } from "@nivo/bar";
import { useTheme, Button, MenuItem, Select, Typography } from "@mui/material";
import { tokens } from "../theme";
import { useAuth } from "../context/authContext";
import axiosClient from "../api/axiosClient";

const CustomTooltip = ({ value, indexValue, id, data }) => {
  const se1 = data.find((d) => d.category === indexValue);
  const abbrMap = se1?.abbrMap || {}; // Get abbreviation mapping

  const se1Value = se1?.[id] || 0;

  // Extract the second SE key dynamically (excluding "category" and "abbrMap")
  const seKeys = Object.keys(se1).filter(
    (key) => key !== "category" && key !== "abbrMap" && key !== id
  );
  const se2Key = seKeys.length > 0 ? seKeys[0] : null;
  const se2Value = se2Key ? se1[se2Key] : 0;

  // Convert SE IDs to abbreviations using abbrMap
  const se1Abbr = abbrMap[id] || id; // Fallback to ID if abbr missing
  const se2Abbr = se2Key ? abbrMap[se2Key] || se2Key : "Unknown";

  let comparisonText;
  if (se1Value > se2Value) {
    comparisonText = `${se1Abbr} outperforms ${se2Abbr} in this category.`;
  } else if (se1Value < se2Value) {
    comparisonText = `${se2Abbr} outperforms ${se1Abbr} in this category.`;
  } else {
    comparisonText = `Both ${se1Abbr} and ${se2Abbr} have the same rating in this category.`;
  }

  return (
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
      <span style={{ color: id === se2Key ? "blue" : "green" }}>
        {se1Abbr}: {value.toFixed(1)}
      </span>
      <br />
      <em style={{ fontSize: "12px", color: "#555" }}>{comparisonText}</em>
    </div>
  );
};

const BarChart = ( {} ) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const { user } = useAuth();
  const [seList, setSeList] = useState([]);
  const [selectedSEs, setSelectedSEs] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(false);
  const isLSEEDCoordinator = user?.roles?.includes("LSEED-Coordinator");

  useEffect(() => {
    const fetchSEs = async () => {
      
      let response;
      
      try {
        if (isLSEEDCoordinator) {
          const res = await axiosClient.get(`/api/get-program-coordinator`);
          
          const program = res.data[0]?.name;
            
          response = await axiosClient.get(
            `/api/getAllSocialEnterprisesForComparison`,
            { params: { program } }
          );
        } else {
          response = await axiosClient.get(
            `/api/getAllSocialEnterprisesForComparison`
          );
        }
        setSeList(response.data);
      } catch (error) {
        console.error("Error fetching SE list:", error);
      }
    };
    fetchSEs();
  }, []);

  useEffect(() => {
    if (selectedSEs.length === 2) {
      fetchComparisonData(selectedSEs[0].id, selectedSEs[1].id);
    }
  }, [selectedSEs]);

  const fetchComparisonData = async (se1, se2) => {
    setLoading(true);
    try {
      const response = await axiosClient.get(`/api/compare-performance-score/${se1}/${se2}`);

      const categoryMap = {};
      const abbrMap = {}; // Store abbreviations for each SE ID

      response.data.forEach(({ category_name, se_id, abbr, avg_rating }) => {
        if (!categoryMap[category_name]) {
          categoryMap[category_name] = { category: category_name };
        }
        categoryMap[category_name][se_id] = Number(avg_rating);
        abbrMap[se_id] = abbr; // Store abbreviation mapping
      });

      // Attach abbreviation mapping for use in tooltips
      const formattedData = Object.values(categoryMap).map((category) => ({
        ...category,
        abbrMap, // Add abbreviation mapping for reference
      }));

      setChartData(formattedData);
    } catch (error) {
      console.error("Error fetching comparison data:", error);
    }
    setLoading(false);
  };

  const handleSelectSE = (index, seId) => {
    const se = seList.find((s) => s.se_id === seId);
    const newSelection = [...selectedSEs];
    newSelection[index] = { id: se.se_id, name: se.abbr };
    setSelectedSEs(newSelection);
  };

  const handleSelectAgain = () => {
    setSelectedSEs([]);
    setChartData([]);
  };

  return (
    <div style={{ height: "100%", width: "100%" }}>
      {selectedSEs.length < 2 ? (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: "50vh", // Ensures the div takes full height of the viewport
            flexDirection: "column",
          }}
        >
          <Typography variant="h6" gutterBottom>
            Select 2 Social Enterprises
          </Typography>
          <Select
            value={selectedSEs[0]?.id || ""}
            onChange={(e) => handleSelectSE(0, e.target.value)}
            displayEmpty
            fullWidth
            style={{ marginBottom: 10 }}
          >
            <MenuItem value="" disabled>
              Select First SE
            </MenuItem>
            {seList.map((se) => (
              <MenuItem
                key={se.se_id}
                value={se.se_id}
                disabled={se.se_id === selectedSEs[1]?.id}
              >
                {se.abbr}
              </MenuItem>
            ))}
          </Select>

          <Select
            value={selectedSEs[1]?.id || ""}
            onChange={(e) => handleSelectSE(1, e.target.value)}
            displayEmpty
            fullWidth
          >
            <MenuItem value="" disabled>
              Select Second SE
            </MenuItem>
            {seList.map((se) => (
              <MenuItem
                key={se.se_id}
                value={se.se_id}
                disabled={se.se_id === selectedSEs[0]?.id}
              >
                {se.abbr}
              </MenuItem>
            ))}
          </Select>
        </div>
      ) : (
        <>
          {loading ? (
            <Typography variant="h6">Loading data...</Typography>
          ) : (
            <div style={{ height: 400 }}>
              <ResponsiveBar
                data={chartData}
                keys={selectedSEs.map((se) => se.id)}
                indexBy="category"
                margin={{ top: 40, right: 130, bottom: 70, left: 60 }}
                padding={0.3}
                groupMode="grouped"
                colors={({ id }) =>
                  id === selectedSEs[0].id
                    ? colors.blueAccent[500]
                    : colors.greenAccent[500]
                }
                axisBottom={{
                  tickSize: 0,
                  tickPadding: 0,
                  tickRotation: 0,
                  format: () => "",
                  legend: "Hover for Category",
                  legendPosition: "middle",
                  legendOffset: 40,
                  color: colors.grey[100],
                }}
                axisLeft={{
                  legend: "Average Rating",
                  legendPosition: "middle",
                  legendOffset: -50,
                }}
                enableLabel={true} // Enables labels
                labelSkipHeight={12} // Hides labels on very small bars
                labelTextColor={colors.grey[100]} // Ensures text is visible inside the bars
                label={({ value }) => value.toFixed(1)} // Shows numbers inside bars
                minValue={0}
                maxValue={5}
                theme={{
                  axis: {
                    ticks: {
                      text: {
                        fill: colors.grey[100], // Change tick labels color
                      },
                    },
                    legend: {
                      text: {
                        fill: colors.grey[100], // Change legend color
                      },
                    },
                  },
                  legends: {
                    text: {
                      fill: colors.grey[100], // Change legend text color
                    },
                  },
                }}
                tooltip={({ value, indexValue, id }) => (
                  <CustomTooltip
                    value={value}
                    indexValue={indexValue}
                    id={id}
                    data={chartData}
                  />
                )}
                legends={[
                  {
                    data: selectedSEs.map((se) => ({
                      id: se.id,
                      label:
                        chartData.length > 0
                          ? chartData[0].abbrMap[se.id]
                          : se.id, // Map SE ID to abbreviation
                      color:
                        se.id === selectedSEs[0].id
                          ? colors.blueAccent[500]
                          : colors.greenAccent[500],
                    })),
                    anchor: "right",
                    direction: "column",
                    justify: false,
                    translateX: 0,
                    translateY: 190,
                    itemsSpacing: 2,
                    itemWidth: 100,
                    itemHeight: 20,
                    itemDirection: "left-to-right",
                    itemOpacity: 1,
                    symbolSize: 20,
                    symbolShape: "circle",
                    effects: [
                      {
                        on: "hover",
                        style: {
                          itemOpacity: 0.85,
                        },
                      },
                    ],
                  },
                ]}
              />
            </div>
          )}
          <Button
            variant="contained"
            onClick={handleSelectAgain}
            sx={{
              backgroundColor: colors.blueAccent[500], // Change button color
              "&:hover": { backgroundColor: "darkviolet" }, // Change hover color
            }}
          >
            Select Again
          </Button>
        </>
      )}
    </div>
  );
};

export default BarChart;
