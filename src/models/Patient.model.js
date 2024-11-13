const patientSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    dateOfBirth: Date,
    gender: { type: String, enum: ['male', 'female', 'other'] },
    bloodGroup: String,
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String
    },
    emergencyContact: {
      name: String,
      relationship: String,
      phone: String
    },
    medicalHistory: [{
      condition: String,
      diagnosedDate: Date,
      notes: String
    }],
    allergies: [String],
    currentMedications: [{
      name: String,
      dosage: String,
      frequency: String
    }]
  }, { timestamps: true });