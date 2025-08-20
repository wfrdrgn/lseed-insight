// src/components/FinancialPerformanceTrendChart.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Tooltip,
  IconButton,
  Select,
  MenuItem,
} from "@mui/material";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import { ResponsiveLine } from "@nivo/line";
import { useTheme } from "@mui/material";
import { tokens } from "../theme";
import axiosClient from "../api/axiosClient";

const SEsPerPage = 5;

const pad2 = (n) => String(n).padStart(2, "0");

// Map quarter -> { from, to } (to is END-EXCLUSIVE)
const quarterRange = (year, q) => {
  switch (q) {
    case "Q1": return { from: `${year}-01-01`, to: `${year}-04-01` };
    case "Q2": return { from: `${year}-04-01`, to: `${year}-07-01` };
    case "Q3": return { from: `${year}-07-01`, to: `${year}-10-01` };
    case "Q4": return { from: `${year}-10-01`, to: `${Number(year) + 1}-01-01` };
    default:   return { from: null, to: null };
  }
};

const FinancialPerformanceTrendChart = ({
  isDashboard = false,
}) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  const [rows, setRows] = useState([]);
  const [labels, setLabels] = useState({});
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);

  // --- Period selection state (like your other chart) ---
  const now = new Date();
  const defaultYear = now.getFullYear();
  const [periodMode, setPeriodMode] = useState("overall"); // overall | quarterly | yearly
  const [selectedQuarter, setSelectedQuarter] = useState("Q1");
  const [selectedYear, setSelectedYear] = useState(defaultYear);
  // quick year options (current ± 3)
  const yearOptions = Array.from({ length: 7 }, (_, i) => defaultYear - 3 + i);

  // fetch SE labels (abbr/team_name)
  useEffect(() => {
    (async () => {
      try {
        const { data } = await axiosClient.get("/api/get-all-social-enterprises");
        const m = {};
        for (const se of data || []) {
          m[se.se_id] = se.abbr || se.team_name || se.se_id;
        }
        setLabels(m);
      } catch (e) {
        console.warn("labels load failed:", e?.response?.data || e.message);
      }
    })();
  }, []);

  // Compute from/to based on period selection
  const { from, to, periodLabel } = useMemo(() => {
    if (periodMode === "overall") {
      return { from: null, to: null, periodLabel: "Overall" };
    }
    if (periodMode === "yearly") {
      const y = selectedYear;
      return {
        from: `${y}-01-01`,
        to: `${Number(y) + 1}-01-01`, // end-exclusive
        periodLabel: `Year ${y}`,
      };
    }
    // quarterly
    const { from, to } = quarterRange(selectedYear, selectedQuarter);
    return { from, to, periodLabel: `${selectedYear} ${selectedQuarter}` };
  }, [periodMode, selectedYear, selectedQuarter]);

  // fetch star trend rows (monthly)
  useEffect(() => {
    setLoading(true);
    setRows([]);
    setCurrentPage(0);

    (async () => {
      try {
        const params = {};
        if (from) params.from = from;
        if (to)   params.to   = to;

        // [{ se_id, month, stars_half, score_0_100 }, ...]
        const { data } = await axiosClient.get("/api/ratings/top-star-trend", { params });
        setRows(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error("load star trend:", e?.response?.data || e.message);
        setRows([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [from, to]);

  // Build series (group by se_id), sort months, compute union of all months for domain
  const { seriesAll, monthDomain } = useMemo(() => {
    const bySE = new Map();
    const monthsSet = new Set();

    const monthKey = (v) => {
      if (typeof v === "string") return v.slice(0, 7); // "YYYY-MM"
      if (v instanceof Date) return v.toISOString().slice(0, 7);
      try { return new Date(v).toISOString().slice(0, 7); } catch { return String(v ?? "").slice(0, 7); }
    };

    for (const r of rows) {
      const month = monthKey(r.month);
      if (!month) continue;
      monthsSet.add(month);
      if (!bySE.has(r.se_id)) bySE.set(r.se_id, []);
      bySE.get(r.se_id).push({
        x: month,
        y: typeof r.stars_half === "number" ? r.stars_half : Number(r.stars_half || 0),
      });
    }

    const seriesAll = Array.from(bySE.entries()).map(([se_id, pts]) => {
      pts.sort((a, b) => a.x.localeCompare(b.x));
      const avg = pts.length ? pts.reduce((s, p) => s + (p.y || 0), 0) / pts.length : 0;
      return {
        se_id,
        id: labels[se_id] || se_id.slice(0, 6),
        color: undefined,
        data: pts,
        _avg: avg,
      };
    });

    // rank by average (desc) so “Top 5” uses best lines
    seriesAll.sort((a, b) => b._avg - a._avg);

    const monthDomain = Array.from(monthsSet).sort((a, b) => a.localeCompare(b));
    return { seriesAll, monthDomain };
  }, [rows, labels]);

  // paging / top5 view
  const visibleSeries = useMemo(() => {
    if (seriesAll.length === 0) return [];
    if (!showAll) return seriesAll.slice(0, SEsPerPage);
    const start = currentPage * SEsPerPage;
    return seriesAll.slice(start, start + SEsPerPage);
  }, [seriesAll, showAll, currentPage]);

  const minY = 0;
  const maxY = 5;

  return (
    <Box gridColumn="span 12" gridRow="span 2" backgroundColor={colors.primary[400]} p="20px">
      {/* Header: title + tooltip + controls */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Box display="flex" alignItems="center">
          <Box>
            <Typography variant="h3" fontWeight="bold" color={colors.greenAccent[500]}>
              {loading
                ? "Loading…"
                : seriesAll.length === 0
                ? "No Data"
                : `Financial Performance Trend (${showAll ? "All" : "Top 5"})`}
            </Typography>
            {!loading && (
              <Typography variant="h6" color={colors.grey[300]} mt={0.5}>
                Stars (0–5, half-steps) per month — derived from composite scores
                {periodLabel ? ` • ${periodLabel}` : ""}
              </Typography>
            )}
          </Box>

          <Tooltip
            arrow
            placement="top"
            title={
              <Box sx={{ maxWidth: 360, p: 1 }}>
                <Typography variant="body1" fontWeight="bold">How to read this chart</Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  Each line is a Social Enterprise’s monthly performance shown as <b>star ratings</b>
                  (0–5 in 0.5 steps), computed from your monthly composite scores.
                </Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  Use the <b>Period</b> selectors to view Overall, a specific <b>Quarter</b>
                  (Q1 Jan–Mar, Q2 Apr–Jun, Q3 Jul–Sep, Q4 Oct–Dec), or a full <b>Year</b>.
                </Typography>
              </Box>
            }
          >
            <IconButton sx={{ ml: 1, color: colors.grey[300] }}>
              <HelpOutlineIcon />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Right controls: Period + (Quarter/Year) + Show All */}
        <Box display="flex" alignItems="center" gap={1}>
          {/* Period mode */}
          <Select
            value={periodMode}
            onChange={(e) => setPeriodMode(e.target.value)}
            disabled={loading}
            sx={{
              height: 40,
              minWidth: 130,
              backgroundColor: loading ? colors.grey[600] : colors.blueAccent[600],
              color: colors.grey[100],
              borderColor: colors.grey[100],
              fontWeight: "bold",
              "& .MuiSelect-icon": { color: colors.grey[100] },
              "& fieldset": { border: "none" },
            }}
          >
            <MenuItem value="overall">Overall</MenuItem>
            <MenuItem value="quarterly">Quarterly</MenuItem>
            <MenuItem value="yearly">Yearly</MenuItem>
          </Select>

          {/* Quarter select (only when quarterly) */}
          {periodMode === "quarterly" && (
            <Select
              value={selectedQuarter}
              onChange={(e) => setSelectedQuarter(e.target.value)}
              disabled={loading}
              sx={{
                height: 40,
                minWidth: 100,
                backgroundColor: loading ? colors.grey[600] : colors.blueAccent[600],
                color: colors.grey[100],
                borderColor: colors.grey[100],
                fontWeight: "bold",
                "& .MuiSelect-icon": { color: colors.grey[100] },
                "& fieldset": { border: "none" },
              }}
            >
              <MenuItem value="Q1">Q1</MenuItem>
              <MenuItem value="Q2">Q2</MenuItem>
              <MenuItem value="Q3">Q3</MenuItem>
              <MenuItem value="Q4">Q4</MenuItem>
            </Select>
          )}

          {/* Year select (for quarterly & yearly) */}
          {(periodMode === "quarterly" || periodMode === "yearly") && (
            <Select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              disabled={loading}
              sx={{
                height: 40,
                minWidth: 110,
                backgroundColor: loading ? colors.grey[600] : colors.blueAccent[600],
                color: colors.grey[100],
                borderColor: colors.grey[100],
                fontWeight: "bold",
                "& .MuiSelect-icon": { color: colors.grey[100] },
                "& fieldset": { border: "none" },
              }}
            >
              {yearOptions.map((y) => (
                <MenuItem key={y} value={y}>{y}</MenuItem>
              ))}
            </Select>
          )}

          {/* Show All / Top 5 */}
          <Button
            variant="outlined"
            onClick={() => {
              setShowAll((s) => !s);
              setCurrentPage(0);
            }}
            disabled={loading}
            sx={{
              height: 40,
              minWidth: 140,
              borderColor: colors.grey[100],   // ✅ correct prop
              backgroundColor: loading ? colors.grey[600] : colors.blueAccent[600],
              color: colors.grey[100],
              fontWeight: "bold",
              "&:hover": { backgroundColor: loading ? colors.grey[600] : colors.blueAccent[700] },
              "&:disabled": { backgroundColor: colors.grey[600], color: colors.grey[300] },
            }}
          >
            {showAll ? "Show Top 5" : "Show All"}
          </Button>
        </Box>
      </Box>

      <Box height="320px" display="flex" alignItems="center">
        {/* Prev (paging) */}
        {showAll && !loading && (
          <Button
            variant="contained"
            color="secondary"
            disabled={currentPage === 0}
            onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
            sx={{
              mx: 2,
              height: "fit-content",
              backgroundColor: colors.blueAccent[600],
              color: colors.grey[100],
              "&:disabled": { backgroundColor: colors.grey[600], color: colors.grey[300] },
            }}
          >
            ◀ Prev
          </Button>
        )}

        {/* Chart / Loading / Empty */}
        <Box flexGrow={1} minWidth={0} overflow="hidden" display="flex" justifyContent="center" alignItems="center" height="100%">
          {loading ? (
            <Box display="flex" flexDirection="column" alignItems="center" gap={2}>
              <CircularProgress
                size={60}
                sx={{ color: colors.greenAccent[500], "& .MuiCircularProgress-circle": { strokeLinecap: "round" } }}
              />
              <Typography variant="h6" color={colors.grey[300]}>Loading chart data…</Typography>
            </Box>
          ) : seriesAll.length === 0 ? (
            <Typography variant="h6" color={colors.grey[300]}>No data available for plotting.</Typography>
          ) : (
            <ResponsiveLine
              data={visibleSeries.map(({ id, color, data }) => ({ id, color, data }))}
              theme={{
                axis: {
                  domain: { line: { stroke: colors.grey[100] } },
                  legend: { text: { fill: colors.grey[100] } },
                  ticks: { line: { stroke: colors.grey[100], strokeWidth: 1 }, text: { fill: colors.grey[100] } },
                },
                legends: { text: { fill: colors.grey[100] } },
                tooltip: { container: { color: colors.primary[500] } },
              }}
              colors={isDashboard ? { datum: "color" } : { scheme: "nivo" }}
              margin={{ top: 50, right: 210, bottom: 50, left: 60 }}
              xScale={{ type: "point", domain: monthDomain }}
              yScale={{ type: "linear", min: minY, max: maxY, stacked: false, reverse: false }}
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
                tickSize: 3,
                tickPadding: 5,
                tickRotation: 0,
                tickValues: [0, 1, 2, 3, 4, 5],
                format: (v) => `${v}`,
                legend: isDashboard ? undefined : "Stars (0–5)",
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
              useMesh
              legends={[
                {
                  anchor: "bottom-right",
                  direction: "column",
                  translateX: 110,
                  translateY: -30,
                  itemsSpacing: 4,
                  itemDirection: "left-to-right",
                  itemWidth: 120,
                  itemHeight: 12,
                  itemOpacity: 1,
                  symbolSize: 12,
                  symbolShape: "circle",
                  symbolBorderColor: "rgba(0, 0, 0, .5)",
                  effects: [{ on: "hover", style: { itemBackground: "rgba(0, 0, 0, .03)", itemOpacity: 1 } }],
                },
              ]}
            />
          )}
        </Box>

        {/* Next (paging) */}
        {showAll && !loading && (
          <Button
            variant="contained"
            color="secondary"
            disabled={(currentPage + 1) * SEsPerPage >= seriesAll.length}
            onClick={() => setCurrentPage((p) => p + 1)}
            sx={{
              mx: 2,
              height: "fit-content",
              backgroundColor: colors.blueAccent[600],
              color: colors.grey[100],
              "&:disabled": { backgroundColor: colors.grey[600], color: colors.grey[300] },
            }}
          >
            Next ▶
          </Button>
        )}
      </Box>
    </Box>
  );
};

export default FinancialPerformanceTrendChart;