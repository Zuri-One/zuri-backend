const appointmentSchema = new mongoose.Schema({
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
    dateTime: { type: Date, required: true },
    type: { type: String, enum: ['in-person', 'telehealth'], required: true },
    status: { 
      type: String, 
      enum: ['scheduled', 'completed', 'cancelled', 'no-show'],
      default: 'scheduled'
    },
    reason: String,
    notes: String,
    meetingLink: String, // for telehealth
    payment: {
      status: { type: String, enum: ['pending', 'completed', 'refunded'] },
      amount: Number,
      transactionId: String
    }
  }, { timestamps: true });