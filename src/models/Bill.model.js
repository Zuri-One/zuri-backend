const billSchema = new mongoose.Schema({
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
    items: [{
      description: String,
      quantity: Number,
      unitPrice: Number,
      amount: Number
    }],
    totalAmount: { type: Number, required: true },
    tax: Number,
    discount: Number,
    finalAmount: { type: Number, required: true },
    status: { 
      type: String, 
      enum: ['pending', 'paid', 'overdue', 'cancelled'],
      default: 'pending'
    },
    paymentMethod: String,
    paymentDate: Date,
    dueDate: Date
  }, { timestamps: true });