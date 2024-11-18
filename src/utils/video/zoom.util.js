// utils/video/zoom.util.js
const axios = require('axios');
const { Buffer } = require('buffer');

class ZoomAPI {
  constructor() {
    this.baseURL = 'https://api.zoom.us/v2';
    // Match the exact env variable names you're using
    this.accountId = process.env.ZOOM_ACCOUNT_ID;
    this.apiKey = process.env.ZOOM_API_KEY;         // Changed from clientId
    this.apiSecret = process.env.ZOOM_API_SECRET;   // Changed from clientSecret
    this.accessToken = null;
    this.tokenExpiry = null;
  }

  async getAccessToken() {
    try {
      // Return existing token if still valid
      if (this.accessToken && this.tokenExpiry > Date.now()) {
        return this.accessToken;
      }

      console.log('Getting new Zoom access token...');
      console.log('Account ID:', this.accountId);
      console.log('API Key:', this.apiKey?.slice(0, 5) + '...');  // Log partial key for debugging

      const tokenResponse = await axios.post(
        'https://zoom.us/oauth/token',
        null,
        {
          params: {
            grant_type: 'account_credentials',
            account_id: this.accountId
          },
          headers: {
            'Authorization': `Basic ${Buffer.from(`${this.apiKey}:${this.apiSecret}`).toString('base64')}`
          }
        }
      );

      this.accessToken = tokenResponse.data.access_token;
      this.tokenExpiry = Date.now() + ((tokenResponse.data.expires_in - 300) * 1000); // Subtract 5 minutes for safety

      return this.accessToken;
    } catch (error) {
      console.error('Zoom token error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.reason || 'Failed to authenticate with Zoom');
    }
  }

  async createMeeting({ topic, startTime, duration = 30, agenda }) {
    try {
      const token = await this.getAccessToken();
      
      console.log('Creating Zoom meeting...');
      console.log('Token:', token?.slice(0, 10) + '...');

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
            join_before_host: true,  // Changed to true for easier testing
            mute_upon_entry: true,
            waiting_room: false,     // Changed to false for easier testing
            meeting_authentication: false  // Changed to false for easier testing
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('Meeting created successfully:', {
        id: response.data.id,
        join_url: response.data.join_url
      });

      return {
        success: true,
        meetingId: response.data.id,
        joinUrl: response.data.join_url,
        startUrl: response.data.start_url,
        password: response.data.password,
        platform: 'zoom'
      };
    } catch (error) {
      console.error('Zoom meeting creation error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to create Zoom meeting');
    }
  }
}

// Create and export a single instance
const zoomApi = new ZoomAPI();
module.exports = zoomApi;