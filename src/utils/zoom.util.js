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
      // Return existing token if still valid
      if (this.accessToken && this.tokenExpiry > Date.now()) {
        return this.accessToken;
      }

      const response = await axios.post(
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

      this.accessToken = response.data.access_token;
      // Set expiry to 5 minutes before actual expiry
      this.tokenExpiry = Date.now() + (response.data.expires_in - 300) * 1000;

      return this.accessToken;
    } catch (error) {
      console.error('Error getting Zoom access token:', error.response?.data || error);
      throw new Error('Failed to authenticate with Zoom');
    }
  }

  async createMeeting({ topic, startTime, duration = 30, agenda }) {
    try {
      const token = await this.getAccessToken();

      const response = await axios.post(
        `${this.baseURL}/users/me/meetings`,
        {
          topic,
          type: 2, // Scheduled meeting
          start_time: startTime,
          duration,
          timezone: 'UTC',
          agenda,
          settings: {
            host_video: true,
            participant_video: true,
            join_before_host: false,
            mute_upon_entry: true,
            waiting_room: true,
            meeting_authentication: false, // Set to false for easier access
            audio: 'both'
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
}

module.exports = new ZoomAPI();