const { google } = require('googleapis');
const moment = require('moment');

exports.generateMeetLink = async ({ summary, description, startTime, duration, attendees }) => {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  // Set credentials (You'll need to implement token management)
  oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN
  });

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  const event = {
    summary,
    description,
    start: {
      dateTime: moment(startTime).format(),
      timeZone: 'UTC',
    },
    end: {
      dateTime: moment(startTime).add(duration, 'minutes').format(),
      timeZone: 'UTC',
    },
    attendees,
    conferenceData: {
      createRequest: {
        requestId: `med-appointment-${Date.now()}`,
        conferenceSolutionKey: { type: 'hangoutsMeet' },
      },
    },
  };

  const response = await calendar.events.insert({
    calendarId: 'primary',
    resource: event,
    conferenceDataVersion: 1,
  });

  return {
    joinUrl: response.data.hangoutLink,
    meetingId: response.data.id,
    calendarEventId: response.data.id
  };
};