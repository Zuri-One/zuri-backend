// src/utils/video/whereby.util.js
const axios = require('axios');

const createWherebyRoom = async (appointment) => {
  if (!process.env.WHEREBY_API_KEY) {
    throw new Error('WHEREBY_API_KEY is not configured');
  }

  const endDateTime = new Date(appointment.dateTime);
  endDateTime.setMinutes(endDateTime.getMinutes() + (appointment.duration || 30));

  try {
    const response = await axios.post('https://api.whereby.dev/v1/meetings', {
      endDate: endDateTime.toISOString(),
      roomMode: 'normal',  // or 'group' based on your needs
      roomNamePattern: 'human-short',
      fields: ['hostRoomUrl', 'roomUrl', 'meetingId']
    }, {
      headers: {
        Authorization: `Bearer ${process.env.WHEREBY_API_KEY}`,
        'Content-Type': 'application/json',
      }
    });

    return {
      meetingLink: response.data.roomUrl,
      startUrl: response.data.hostRoomUrl,
      meetingId: response.data.meetingId,
      platform: 'whereby'
    };
  } catch (error) {
    console.error('Whereby API error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.message || 'Failed to create Whereby room');
  }
};

const deleteWherebyRoom = async (meetingId) => {
  if (!process.env.WHEREBY_API_KEY) {
    throw new Error('WHEREBY_API_KEY is not configured');
  }

  try {
    await axios.delete(`https://api.whereby.dev/v1/meetings/${meetingId}`, {
      headers: {
        Authorization: `Bearer ${process.env.WHEREBY_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    return true;
  } catch (error) {
    if (error.response?.status === 404) {
      // Room already deleted or doesn't exist
      return true;
    }
    console.error('Error deleting Whereby room:', error.response?.data || error.message);
    throw new Error(error.response?.data?.message || 'Failed to delete Whereby room');
  }
};

module.exports = {
  createWherebyRoom,
  deleteWherebyRoom
};

