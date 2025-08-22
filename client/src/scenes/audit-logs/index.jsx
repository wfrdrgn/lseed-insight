import { Alert, Box, Snackbar, Typography, useTheme } from "@mui/material";
import { DataGrid, GridToolbar } from "@mui/x-data-grid";
import { useEffect, useMemo, useState } from "react";
import axiosClient from "../../api/axiosClient";
import Header from "../../components/Header";
import { tokens } from "../../theme";

const AuditLogsPage = () => {
    const theme = useTheme();
    const colors = tokens(theme.palette.mode);

    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [snackbarOpen, setSnackbarOpen] = useState(false);

    // --- helpers ---
    const pickArray = (payload) => {
        if (Array.isArray(payload)) return payload;
        if (!payload || typeof payload !== "object") return [];
        return (
            payload.logs ||
            payload.rows ||
            payload.items ||
            payload.data ||
            payload.results ||
            []
        );
    };

    const normalizeRow = (r) => {
        const first = r.first_name ?? r.actor_first_name ?? r.actor?.first_name ?? "";
        const last = r.last_name ?? r.actor_last_name ?? r.actor?.last_name ?? "";

        const tmp = r.actor_name ?? [first, last].filter(Boolean).join(" ");
        const actor_name = tmp?.trim() ? tmp.trim() : "System";

        const details_text =
            typeof r.details === "object" && r.details !== null
                ? Object.entries(r.details).map(([k, v]) => `${k}: ${v}`).join(", ")
                : (r.details ?? r.message ?? "");

        const ts = r.timestamp ?? r.created_at ?? r.createdAt ?? null;
        const timestamp_str = ts ? (() => { try { return new Date(ts).toLocaleString(); } catch { return String(ts); } })() : "—";

        return {
            log_id: r.log_id ?? r.id ?? r.logId,
            actor_name,
            action: r.action ?? r.event ?? "",
            details_text,
            timestamp_str,
        };
    };

    useEffect(() => {
        const fetchLogs = async () => {
            try {
                setLoading(true);
                const res = await axiosClient.get(`/api/get-audit-logs`);
                const rawArray = pickArray(res.data); // your route returns the object, not { logs: [...] }
                const normalized = rawArray.map(normalizeRow);
                setLogs(normalized);
            } catch (err) {
                console.error(err);
                setError(err?.message || "An error occurred while fetching logs.");
                setSnackbarOpen(true);
            } finally {
                setLoading(false);
            }
        };
        fetchLogs();
    }, []);

    const wrapCentered = (content) => (
        <Box sx={{
            width: "100%",
            whiteSpace: "normal",
            wordBreak: "break-word",
            overflowWrap: "anywhere",
            textAlign: "center",
            lineHeight: 1.3,
            py: 1,
        }}>
            {content}
        </Box>
    );

    const columns = useMemo(() => ([
        {
            field: "actor_name",
            headerName: "Actor",
            flex: 1,
            headerAlign: "center",
            align: "center",
            renderCell: (p) => wrapCentered(p.value),
        },
        {
            field: "action",
            headerName: "Action",
            flex: 1,
            headerAlign: "center",
            align: "center",
            renderCell: (p) => wrapCentered(p.value),
        },
        {
            field: "details_text",
            headerName: "Details",
            flex: 2,
            headerAlign: "center",
            align: "center",
            renderCell: (p) => wrapCentered(p.value),
        },
        {
            field: "timestamp_str",
            headerName: "Timestamp",
            flex: 1,
            headerAlign: "center",
            align: "center",
            renderCell: (p) => wrapCentered(p.value),
        },
    ]), []);

    return (
        <Box m="20px">
            <Header title="AUDIT LOGS" subtitle="View all system activities" />

            <Box
                height="600px"
                minHeight="600px"
                sx={{
                    "& .MuiDataGrid-root": { border: "none" },
                    "& .MuiDataGrid-cell": { borderBottom: "none" },
                    "& .MuiDataGrid-columnHeaders, & .MuiDataGrid-columnHeader": {
                        backgroundColor: `${colors.blueAccent[700]} !important`,
                    },
                    "& .MuiDataGrid-virtualScroller": {
                        backgroundColor: colors.primary[400],
                    },
                    "& .MuiDataGrid-footerContainer": {
                        borderTop: "none",
                        backgroundColor: colors.blueAccent[700],
                        color: colors.grey[100],
                    },
                }}
            >
                {loading ? (
                    <Typography variant="h5">Loading audit logs...</Typography>
                ) : (
                    <DataGrid
                        getRowId={(row) => row.log_id}
                        rows={logs}
                        columns={columns}
                        getRowHeight={() => "auto"}
                        columnHeaderHeight={64}
                        pageSize={5}
                        rowsPerPageOptions={[5, 10]}
                        disableSelectionOnClick
                        slots={{ toolbar: GridToolbar }}
                        sx={{
                            "& .MuiDataGrid-columnHeader": {
                                whiteSpace: "normal",
                                lineHeight: 1.2,
                                textAlign: "center",
                                alignItems: "center",
                                justifyContent: "center",
                                py: 1,
                            },
                            "& .MuiDataGrid-cell": {
                                whiteSpace: "normal",
                                wordBreak: "break-word",
                                overflowWrap: "anywhere",
                                textAlign: "center",
                                lineHeight: 1.3,
                                py: 1.5,
                            },
                            "& .MuiDataGrid-toolbarContainer .MuiButton-text": {
                                color: `${colors.grey[100]} !important`,
                            },
                        }}
                    />
                )}
            </Box>

            <Snackbar
                open={snackbarOpen}
                autoHideDuration={3000}
                onClose={() => setSnackbarOpen(false)}
                anchorOrigin={{ vertical: "top", horizontal: "center" }}
            >
                <Alert onClose={() => setSnackbarOpen(false)} severity="error" sx={{ width: "100%" }}>
                    {error}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default AuditLogsPage;