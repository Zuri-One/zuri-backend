exports.createWebRTCRoom = async ({ appointmentId, doctorId, patientId }) => {
    // Implement your custom WebRTC room creation logic
    const roomId = `med-${appointmentId}`;
    const password = Math.random().toString(36).substring(7);
  
    return {
      joinUrl: `${process.env.FRONTEND_URL}/video-call/${roomId}`,
      meetingId: roomId,
      password
    };
  };