// src/models/user.model.js
const { Model, DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

class User extends Model {
 static schema = {
   id: {
     type: DataTypes.UUID,
     defaultValue: DataTypes.UUIDV4,
     primaryKey: true
   },
   name: {
     type: DataTypes.STRING,
     allowNull: false,
     validate: {
       notEmpty: true
     }
   },
   email: {
     type: DataTypes.STRING,
     allowNull: false,
     unique: true,
     validate: {
       isEmail: true,
       notEmpty: true
     }
   },
   password: {
     type: DataTypes.STRING,
     allowNull: false,
     validate: {
       len: [8, 100]
     }
   },
   role: {
     type: DataTypes.ENUM('patient', 'doctor', 'admin', 'staff'),
     defaultValue: 'patient'
   },
   isEmailVerified: {
     type: DataTypes.BOOLEAN,
     defaultValue: false
   },
   emailVerificationToken: DataTypes.STRING,
   emailVerificationCode: DataTypes.STRING,
   emailVerificationExpires: DataTypes.DATE,
   resetPasswordToken: DataTypes.STRING,
   resetPasswordExpires: DataTypes.DATE,
   twoFactorSecret: DataTypes.STRING,
   twoFactorEnabled: {
     type: DataTypes.BOOLEAN,
     defaultValue: false
   },
   lastLogin: DataTypes.DATE,
   isActive: {
     type: DataTypes.BOOLEAN,
     defaultValue: true
   },
   loginAttempts: {
     type: DataTypes.INTEGER,
     defaultValue: 0
   },
   lockUntil: DataTypes.DATE
 };

 // Instance method to compare password
 async comparePassword(candidatePassword) {
   try {
     console.log('Comparing passwords:', {
       candidatePassword,
       hashedPassword: this.password,
       passwordLength: this.password?.length
     });
     const isMatch = await bcrypt.compare(candidatePassword, this.password);
     console.log('Password match result:', isMatch);
     return isMatch;
   } catch (error) {
     console.error('Error comparing passwords:', error);
     return false;
   }
 }

 // Instance method to generate JWT token
 generateAuthToken() {
   return jwt.sign(
     { id: this.id, role: this.role },
     process.env.JWT_SECRET,
     { expiresIn: process.env.JWT_EXPIRE || '24h' }
   );
 }

 // Instance method to generate verification token
 generateVerificationToken() {
   const verificationToken = crypto.randomBytes(32).toString('hex');
   this.emailVerificationToken = crypto
     .createHash('sha256')
     .update(verificationToken)
     .digest('hex');
   this.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
   return verificationToken;
 }

 // Static method to define model associations
 static associate(models) {
  this.hasMany(models.Appointment, { 
    as: 'patientAppointments',
    foreignKey: 'patientId'
  });
  this.hasMany(models.Appointment, { 
    as: 'doctorAppointments',
    foreignKey: 'doctorId'
  });
  this.hasOne(models.DoctorAvailability, {
    foreignKey: 'doctorId'
  });

  this.hasOne(models.DoctorProfile, {
    foreignKey: 'userId'
  });
}

 // Static method to initialize the model
 static initModel(sequelize) {
   return this.init(this.schema, {
     sequelize,
     modelName: 'User',
     hooks: {
       // Single hook for password hashing
       beforeSave: async (user) => {
         try {
           // Only hash password if it's new or modified
           if (user.changed('password')) {
             console.log('Hashing password for user:', user.email);
             const salt = await bcrypt.genSalt(10);
             user.password = await bcrypt.hash(user.password, salt);
             console.log('Password hashed successfully:', {
               hashedLength: user.password.length,
               isBcryptHash: user.password.startsWith('$2')
             });
           }
         } catch (error) {
           console.error('Error hashing password:', error);
           throw error;
         }
       }
     },
     // Add indexes for commonly queried fields
     indexes: [
       {
         unique: true,
         fields: ['email']
       },
       {
         fields: ['role']
       },
       {
         fields: ['isEmailVerified']
       }
     ],
     // Enable timestamps
     timestamps: true
   });
 }

 // Helper method to safely get user data without sensitive fields
 toSafeObject() {
   const { password, resetPasswordToken, emailVerificationToken, ...safeUser } = this.toJSON();
   return safeUser;
 }

 // Helper method to check if account is locked
 isAccountLocked() {
   return this.lockUntil && this.lockUntil > Date.now();
 }

 // Helper method to increment login attempts
 async incrementLoginAttempts() {
   // Reset login attempts if lock has expired
   if (this.lockUntil && this.lockUntil < Date.now()) {
     this.loginAttempts = 1;
     this.lockUntil = null;
   } else {
     this.loginAttempts += 1;
     
     // Lock account if max attempts reached (e.g., 5 attempts)
     if (this.loginAttempts >= 5) {
       this.lockUntil = Date.now() + (60 * 60 * 1000); // Lock for 1 hour
     }
   }
   
   await this.save();
 }

 // Helper method to reset login attempts
 async resetLoginAttempts() {
   this.loginAttempts = 0;
   this.lockUntil = null;
   await this.save();
 }
}

module.exports = User;