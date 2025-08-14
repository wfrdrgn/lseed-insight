import { useState, useEffect } from "react";
import { ResponsiveBar } from "@nivo/bar";
import { useTheme, Button, MenuItem, Select, Typography } from "@mui/material";
import { tokens } from "../theme";
import { useAuth } from "../context/authContext";
import axiosClient from "../api/axiosClient";

const CustomTooltip = ({ value, indexValue, id, data }) => {
  const entry = data.find((d) => d.category === indexValue);
  const abbrMap = entry?.abbrMap || {};

  const currentLabel = abbrMap[id] || id;
  const isInflow = id.includes("inflow");
  const flowType = isInflow ? "inflow" : "outflow";

  // Get the current SE and the other SE based on flow type
  const allKeys = Object.keys(entry).filter((k) => k.includes(flowType));
  const otherId = allKeys.find((k) => k !== id); // the other SE with same flow type

  const otherValue = entry?.[otherId] ?? 0;
  const otherLabel = abbrMap[otherId] || otherId;

  let comparisonText = "";

  if (otherId) {
    const currentValFormatted = value.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const otherValFormatted = otherValue.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    if (value > otherValue) {
      comparisonText = `${currentLabel} (${currentValFormatted}) is higher than ${otherLabel} (${otherValFormatted})`;
    } else if (value < otherValue) {
      comparisonText = `${otherLabel} (${otherValFormatted}) is higher than ${currentLabel} (${currentValFormatted})`;
    } else {
      comparisonText = `${currentLabel} and ${otherLabel} are equal at ₱${currentValFormatted}`;
    }
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
      <strong>
        {new Date(indexValue).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })}
      </strong>
      <br />
      <span>
        {currentLabel}:{" "}
        {value.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}
      </span>
      <br />
      <em style={{ fontSize: "12px", color: "#555" }}>{comparisonText}</em>
    </div>
  );
};

const CashFlowBarChart = ({ }) => {
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
            {
              params: { program },
              withCredentials: true,
            }
          );
        } else {
          response = await axiosClient.get(
            `/api/getAllSocialEnterprisesForComparison`, {
            withCredentials: true,
          });
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
      const response = await axiosClient.get(`/api/cashflow`);

      // Filter cashflow data for the selected SEs
      const filtered = response.data.filter(
        (entry) => entry.se_id === se1 || entry.se_id === se2
      );

      const groupByDate = {};
      const abbrMap = {};

      filtered.forEach(({ date, inflow, outflow, se_abbr, se_id }) => {
        if (!groupByDate[date]) {
          groupByDate[date] = { category: date }; // category is used for indexBy
        }
        groupByDate[date][`${se_id}_inflow`] = inflow;
        groupByDate[date][`${se_id}_outflow`] = outflow;
        abbrMap[`${se_id}_inflow`] = `${se_abbr} Inflow`;
        abbrMap[`${se_id}_outflow`] = `${se_abbr} Outflow`;
      });

      const formattedData = Object.values(groupByDate).map((row) => ({
        ...row,
        abbrMap,
      }));

      setChartData(formattedData);
    } catch (error) {
      console.error("Error fetching cashflow data:", error);
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

  console.log("chart data: ", chartData);
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
                keys={
                  selectedSEs.length === 2
                    ? [
                      `${selectedSEs[0].id}_inflow`,
                      `${selectedSEs[1].id}_inflow`,
                      `${selectedSEs[0].id}_outflow`,
                      `${selectedSEs[1].id}_outflow`,
                    ]
                    : []
                }
                indexBy="category"
                margin={{ top: 40, right: 130, bottom: 70, left: 60 }}
                padding={0.1}
                groupMode="grouped"
                colors={({ id }) => {
                  const se1Id = selectedSEs[0]?.id;
                  const se2Id = selectedSEs[1]?.id;

                  if (id.includes(se1Id)) return colors.greenAccent[500]; // SE 1 = green
                  if (id.includes(se2Id)) return colors.blueAccent[500]; // SE 2 = blue
                  return "#ccc"; // fallback
                }}
                axisBottom={{
                  tickSize: 0,
                  tickPadding: 0,
                  tickRotation: 0,
                  format: () => "",

                  color: colors.grey[100],
                }}
                axisLeft={{
                  tickPadding: -20,
                  legend: "Cash Flow (₱)",
                  legendPosition: "middle",
                  legendOffset: -50,
                  format: (value) => value.toLocaleString("en-US"),
                }}
                enableLabel={true} // Enables labels
                labelSkipHeight={12} // Hides labels on very small bars
                labelTextColor={colors.grey[100]} // Ensures text is visible inside the bars
                label={({ value }) =>
                  value.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })
                } // Shows numbers inside bars
                minValue={0}
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
                    data: selectedSEs.map((se, i) => ({
                      id: se.id,
                      label: se.name,
                      color:
                        i === 0
                          ? colors.greenAccent[500]
                          : colors.blueAccent[500],
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

export default CashFlowBarChart;