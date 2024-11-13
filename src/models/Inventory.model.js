const inventorySchema = new mongoose.Schema({
    name: { type: String, required: true },
    category: { type: String, required: true },
    quantity: { type: Number, required: true },
    unit: String,
    minimumLevel: Number,
    supplier: {
      name: String,
      contact: String
    },
    cost: Number,
    expiryDate: Date,
    location: String,
    status: { 
      type: String, 
      enum: ['in-stock', 'low-stock', 'out-of-stock'],
      default: 'in-stock'
    }
  }, { timestamps: true });
  