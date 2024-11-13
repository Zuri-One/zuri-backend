const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { 
      type: String, 
      enum: ['patient', 'doctor', 'admin', 'staff'],
      required: true 
    },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    phone: String,
    active: { type: Boolean, default: true },
    lastLogin: Date
  }, { timestamps: true });