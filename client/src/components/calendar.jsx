import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItem,
  ListItemText,
  Typography,
  useTheme,
} from "@mui/material";
import dayjs from "dayjs";
import { useEffect, useRef, useState } from "react";
import { tokens } from "../theme";
import Header from "./Header";

const Calendar = ({ events }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  const [selectedEvent, setSelectedEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const calendarRef = useRef(null);

  // Simulate loading (or wrap your actual events fetching logic)
  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => {
      setLoading(false);
    }, 800); // mimic a short loading delay
    return () => clearTimeout(timer);
  }, [events]);

  // Event click in the calendar
  const handleEventClick = (clickInfo) => {
    if (!loading) {
      setSelectedEvent(clickInfo.event);
    }
  };

  // Sidebar item click
  const handleSidebarEventClick = (event) => {
    if (!loading && calendarRef.current) {
      const api = calendarRef.current.getApi();
      api.gotoDate(event.start); // Jump to the date
      setSelectedEvent({ ...event }); // Open details
    }
  };

  // Close dialog
  const handleCloseDialog = () => {
    setSelectedEvent(null);
  };

  return (
    <Box m="20px">
      <Header
        title="Calendar"
        subtitle="View, plan, and track all your mentoring sessions"
      />

      {loading ? (
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          height="70vh"
        >
          <CircularProgress
            size={60}
            sx={{ color: colors.greenAccent[500], mb: 2 }}
          />
          <Typography>Loading calendar...</Typography>
        </Box>
      ) : (
        <Box display="flex" gap="20px" mt="20px">
          {/* Sidebar */}
          <Box
            flex="1 1 25%"
            backgroundColor={colors.primary[400]}
            p="16px"
            borderRadius="8px"
            height="80vh"
            sx={{ overflowY: "auto" }}
          >
            <Typography
              variant="h5"
              fontWeight="bold"
              color={colors.grey[100]}
              mb={2}
            >
              Events
            </Typography>

            {events.length === 0 ? (
              <Typography variant="body2" color={colors.grey[300]}>
                No events added.
              </Typography>
            ) : (
              <List>
                {events.map((event) => (
                  <ListItem
                    button
                    key={event.id}
                    onClick={() => handleSidebarEventClick(event)}
                    sx={{
                      backgroundColor: colors.greenAccent[500],
                      borderRadius: "4px",
                      mb: "8px",
                      px: "8px",
                    }}
                  >
                    <ListItemText
                      primary={event.title}
                      primaryTypographyProps={{
                        fontWeight: "bold",
                        color: colors.grey[900],
                      }}
                      secondary={
                        <Typography variant="body2" color={colors.grey[900]}>
                          {new Date(event.start).toLocaleDateString(undefined, {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </Typography>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </Box>

          {/* Calendar */}
          <Box
            flex="1 1 75%"
            backgroundColor={colors.primary[400]}
            borderRadius="8px"
            p="16px"
          >
            <FullCalendar
              ref={calendarRef}
              height="80vh"
              plugins={[
                dayGridPlugin,
                timeGridPlugin,
                interactionPlugin,
                listPlugin,
              ]}
              initialView="dayGridMonth"
              headerToolbar={{
                left: "prev,next today",
                center: "title",
                right: "dayGridMonth,timeGridWeek,timeGridDay,listMonth",
              }}
              events={events}
              eventClick={handleEventClick}
              editable={false}
              selectable={false}
              dayMaxEvents
            />
          </Box>
        </Box>
      )}

      {/* Event Detail Dialog */}
      <Dialog
        open={!!selectedEvent}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
        PaperProps={{
          style: {
            backgroundColor: "#fff",
            color: "#000",
            border: "1px solid #000",
          },
        }}
      >
        {selectedEvent && (
          <>
            <DialogTitle
              sx={{
                backgroundColor: "#1E4D2B", // DLSU Green header
                color: "#fff",
                textAlign: "center",
                fontSize: "1.5rem",
                fontWeight: "bold",
              }}
            >
              {selectedEvent.title}
            </DialogTitle>
            <DialogContent
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: "16px",
                padding: "24px",
              }}
            >
              {/* WHEN */}
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: "bold" }}>
                  When:
                </Typography>
                <Typography>
                  {dayjs(selectedEvent.start).format("MMMM D, YYYY⋅h:mm A")} –{" "}
                  {dayjs(selectedEvent.end).format("h:mm A")}
                </Typography>
              </Box>

              {/* ZOOM LINK */}
              {selectedEvent.extendedProps?.zoom_link && (
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: "bold" }}>
                    Zoom Link:
                  </Typography>
                  <Typography>
                    <a
                      href={selectedEvent.extendedProps.zoom_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "#1E4D2B", textDecoration: "underline" }}
                    >
                      {selectedEvent.extendedProps.zoom_link}
                    </a>
                  </Typography>
                </Box>
              )}

              {/* STATUS */}
              {selectedEvent.extendedProps?.status && (
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: "bold" }}>
                    Status:
                  </Typography>
                  <Typography>{selectedEvent.extendedProps.status}</Typography>
                </Box>
              )}

              {/* TEAM */}
              {selectedEvent.extendedProps?.team_name && (
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: "bold" }}>
                    Team:
                  </Typography>
                  <Typography>
                    {selectedEvent.extendedProps.team_name}
                  </Typography>
                </Box>
              )}

              {/* MENTOR */}
              {selectedEvent.extendedProps?.mentor_name && (
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: "bold" }}>
                    Mentor:
                  </Typography>
                  <Typography>
                    {selectedEvent.extendedProps.mentor_name}
                  </Typography>
                </Box>
              )}

              {/* PROGRAM */}
              {selectedEvent.extendedProps?.program_name && (
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: "bold" }}>
                    Program:
                  </Typography>
                  <Typography>
                    {selectedEvent.extendedProps.program_name}
                  </Typography>
                </Box>
              )}
            </DialogContent>
            <DialogActions
              sx={{
                padding: "16px",
                borderTop: "1px solid #000",
                justifyContent: "space-between",
              }}
            >
              <Button
                onClick={handleCloseDialog}
                sx={{
                  color: "#000",
                  border: "1px solid #000",
                  "&:hover": {
                    backgroundColor: "#f0f0f0",
                  },
                }}
              >
                Close
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default Calendar;
