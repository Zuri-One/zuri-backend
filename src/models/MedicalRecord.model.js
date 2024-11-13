const medicalRecordSchema = new mongoose.Schema({
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
    appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
    diagnosis: String,
    symptoms: [String],
    vitals: {
      bloodPressure: String,
      temperature: Number,
      heartRate: Number,
      respiratoryRate: Number
    },
    prescription: [{
      medication: String,
      dosage: String,
      frequency: String,
      duration: String
    }],
    notes: String,
    attachments: [{
      fileName: String,
      fileType: String,
      fileUrl: String
    }]
  }, { timestamps: true });