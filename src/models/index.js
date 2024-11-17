// src/models/index.js
const { sequelize } = require('../config/database');
const User = require('./user.model');
const Appointment = require('./appointment.model');
const DoctorAvailability = require('./doctor-availability.model');

// Initialize models with sequelize instance
const models = {
  User: User.init(User.schema, { sequelize }),
  Appointment: Appointment.init(Appointment.schema, { sequelize }),
  DoctorAvailability: DoctorAvailability.init(DoctorAvailability.schema, { sequelize })
};

// Define associations
Object.keys(models).forEach(modelName => {
  if (models[modelName].associate) {
    models[modelName].associate(models);
  }
});

module.exports = {
  sequelize,
  ...models
};