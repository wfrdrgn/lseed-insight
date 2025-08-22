import { Box, CircularProgress, Typography, useTheme } from "@mui/material";
import { ResponsiveBar } from "@nivo/bar";
import { useEffect, useState } from "react";
import axiosClient from "../api/axiosClient";
import { useAuth } from "../context/authContext";
import { tokens } from "../theme";

const AcknowledgmentChart = () => {
  const [ackData, setAckData] = useState([]);
  const [loading, setLoading] = useState(true); // 🔹 Loading state
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const { user } = useAuth();
  const isCoordinator = user?.roles?.includes("LSEED-Coordinator");

  useEffect(() => {
    const fetchAckData = async () => {
      setLoading(true); // Start loading
      try {
        let response;

        if (isCoordinator) {
          const res = await axiosClient.get(`/api/get-program-coordinator`);
          const data = res.data;
          const program = data[0]?.name;

          if (!program) {
            throw new Error("No program found for this coordinator");
          }

          response = await axiosClient.get(`/api/ack-data?program=${program}`);
        } else {
          response = await axiosClient.get(`/api/ack-data`);
        }

        const rawData = response.data;

        const formattedData = rawData.map((item) => ({
          batch: item.se_name,
          acknowledged: Number(item.acknowledged_percentage) || 0,
          pending: Number(item.pending_percentage) || 0,
        }));

        setAckData(formattedData);
      } catch (error) {
        console.error("Error fetching acknowledgment data:", error);
        setAckData([]);
      } finally {
        setLoading(false); // End loading
      }
    };

    fetchAckData();
  }, []);

  // 🔹 Conditional Rendering based on loading and data
  if (loading) {
    return (
      <Box
        sx={{
          height: "350px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 2,
        }}
      >
        <CircularProgress
          size={60}
          sx={{
            color: colors.greenAccent[500],
            "& .MuiCircularProgress-circle": {
              strokeLinecap: "round",
            },
          }}
        />
        <Typography variant="h6" color={colors.grey[300]}>
          Loading acknowledgment data...
        </Typography>
      </Box>
    );
  }

  if (!ackData?.length) {
    return (
      <Typography variant="h6" textAlign="center" color="white">
        No data available
      </Typography>
    );
  }

  return (
    <Box sx={{ height: "100%", width: "100%", minHeight: "350px" }}>
      <Typography variant="h6" textAlign="center" sx={{ mb: 2 }} color="white">
        Acknowledgment & Pending Evaluations
      </Typography>
      <ResponsiveBar
        data={ackData}
        keys={["acknowledged", "pending"]}
        indexBy="batch"
        margin={{ top: 50, right: 50, bottom: 130, left: 60 }}
        padding={0.3}
        layout="vertical"
        colors={{ scheme: "set2" }}
        borderRadius={4}
        enableLabel={true}
        labelSkipWidth={12}
        labelSkipHeight={12}
        labelTextColor={colors.grey[100]}
        axisBottom={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: 0,
          legend: "Social Enterprises",
          legendPosition: "middle",
          legendOffset: 40,
          tickTextColor: "white",
        }}
        axisLeft={{
          tickSize: 5,
          tickPadding: 5,
          legend: "Percentage",
          legendPosition: "middle",
          legendOffset: -50,
          tickTextColor: "white",
        }}
        theme={{
          axis: {
            ticks: { text: { fill: colors.primary[100] } },
            legend: { text: { fill: colors.primary[100] } },
          },
        }}
        legends={[
          {
            dataFrom: "keys",
            anchor: "bottom-right",
            direction: "column",
            translateX: -10,
            translateY: 50,
            itemWidth: 90,
            itemHeight: 18,
            itemsSpacing: 2,
            symbolSize: 15,
            itemTextColor: colors.primary[100],
          },
        ]}
        groupMode="grouped"
        animate={true}
        motionConfig="wobbly"
        tooltip={({ id, value, color }) => (
          <Box
            sx={{
              p: 1,
              bgcolor: "#333",
              borderRadius: "5px",
              boxShadow: 3,
              color: "white",
            }}
          >
            <strong style={{ color }}>{id}</strong>: {value}%
          </Box>
        )}
      />
    </Box>
  );
};

export default AcknowledgmentChart;
