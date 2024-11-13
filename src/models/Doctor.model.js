const doctorSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    specialization: { type: String, required: true },
    licenseNumber: { type: String, required: true },
    qualifications: [String],
    experience: Number,
    availableSlots: [{
      day: { type: String, enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] },
      startTime: String,
      endTime: String
    }],
    consultationFee: Number
  }, { timestamps: true });