import axios from "axios";

export const createCalendarEvents = async (googleUser, user) => {
  if (!googleUser) {
    console.error("Google User not found. Cannot create events.");
    return;
  }

  const mentorId = user?.id || user?.mentorId; // Still using system's user

  if (!mentorId) {
    console.error("Mentor ID not found. Cannot fetch mentorships.");
    return;
  }

  try {
    const mentorshipResponse = await axios.get(
      `/api/mentorships/${mentorId}`
    );

    const mentorships = mentorshipResponse.data;
    if (mentorships.length === 0) {
      console.log("No mentorship sessions found.");
      return;
    }

    for (const session of mentorships) {
      const { mentoring_session_date, start_time, end_time, social_enterprise_name } = session;
      const startDateTime = new Date(`${mentoring_session_date} ${start_time}`).toISOString();
      const endDateTime = new Date(`${mentoring_session_date} ${end_time}`).toISOString();

      await axios.post(
        "https://www.googleapis.com/calendar/v3/calendars/primary/events",
        {
          summary: `Mentorship with ${social_enterprise_name}`,
          description: "Scheduled mentorship session.",
          start: { dateTime: startDateTime, timeZone: "Asia/Manila" },
          end: { dateTime: endDateTime, timeZone: "Asia/Manila" },
        },
        {
          headers: {
            Authorization: `Bearer ${googleUser.access_token}`, // ✅ Use Google token
            "Content-Type": "application/json",
          },
        }
      );
    }

    console.log("✅ All mentorship sessions added to Google Calendar!");
  } catch (error) {
    console.error("❌ Error creating calendar events:", error.response?.data || error);
  }
};