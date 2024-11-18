const axios = require('axios');
const jwt = require('jsonwebtoken');

exports.generateZoomLink = async ({ topic, start_time, duration }) => {
  const token = generateZoomJWT(); // Implement JWT generation for Zoom

  const response = await axios.post(
    'https://api.zoom.us/v2/users/me/meetings',
    {
      topic,
      type: 2, // Scheduled meeting
      start_time,
      duration,
      settings: {
        host_video: true,
        participant_video: true,
        join_before_host: false,
        waiting_room: true,
      },
    },
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  return {
    joinUrl: response.data.join_url,
    meetingId: response.data.id,
    password: response.data.password
  };
};