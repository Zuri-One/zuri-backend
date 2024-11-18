const axios = require('axios');

class ZoomAPI {
  constructor() {
    this.baseURL = 'https://api.zoom.us/v2';
    this.accountId = process.env.ZOOM_ACCOUNT_ID;
    this.clientId = process.env.ZOOM_CLIENT_ID;
    this.clientSecret = process.env.ZOOM_CLIENT_SECRET;
    this.accessToken = null;
    this.tokenExpiry = null;
  }

  async getAccessToken() {
    try {
      if (this.accessToken && this.tokenExpiry > Date.now()) {
        return this.accessToken;
      }

      const tokenResponse = await axios.post(
        'https://zoom.us/oauth/token',
        null,
        {
          params: {
            grant_type: 'account_credentials',
            account_id: this.accountId
          },
          headers: {
            'Authorization': `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`
          }
        }
      );

      this.accessToken = tokenResponse.data.access_token;
      this.tokenExpiry = Date.now() + (tokenResponse.data.expires_in * 1000);

      return this.accessToken;
    } catch (error) {
      console.error('Error getting Zoom access token:', error);
      throw new Error('Failed to authenticate with Zoom');
    }
  }

  async createMeeting({
    topic,
    startTime,
    duration,
    timezone = 'UTC',
    settings = {}
  }) {
    try {
      const token = await this.getAccessToken();

      const response = await axios.post(
        `${this.baseURL}/users/me/meetings`,
        {
          topic,
          type: 2, // Scheduled meeting
          start_time: startTime,
          duration,
          timezone,
          settings: {
            host_video: true,
            participant_video: true,
            join_before_host: false,
            mute_upon_entry: true,
            waiting_room: true,
            meeting_authentication: true,
            ...settings
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: true,
        meetingId: response.data.id,
        joinUrl: response.data.join_url,
        startUrl: response.data.start_url,
        password: response.data.password,
        platform: 'zoom'
      };
    } catch (error) {
      console.error('Error creating Zoom meeting:', error.response?.data || error);
      throw new Error(error.response?.data?.message || 'Failed to create Zoom meeting');
    }
  }

  async getMeeting(meetingId) {
    try {
      const token = await this.getAccessToken();
      const response = await axios.get(
        `${this.baseURL}/meetings/${meetingId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('Error getting Zoom meeting:', error);
      throw new Error('Failed to get meeting details');
    }
  }

  async updateMeeting(meetingId, updates) {
    try {
      const token = await this.getAccessToken();
      const response = await axios.patch(
        `${this.baseURL}/meetings/${meetingId}`,
        updates,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('Error updating Zoom meeting:', error);
      throw new Error('Failed to update meeting');
    }
  }
}

const zoomClient = new ZoomAPI();
module.exports = zoomClient;