const { Department, User } = require('../models');
const { Op } = require('sequelize');

exports.createDepartment = async (req, res, next) => {
  try {
    const {
      name,
      code,
      type,
      description,
      location,
      operatingHours,
      capacity,
      headOfDepartmentId,
      contactExtension,
      emergencyContact,
      resources
    } = req.body;

    // Validate required fields
    if (!name || !code || !type) {
      return res.status(400).json({
        success: false,
        message: 'Name, code, and type are required'
      });
    }

    // Check for existing department code
    const existing = await Department.findOne({ where: { code } });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Department code already exists'
      });
    }

    const department = await Department.create({
      name,
      code,
      type,
      description,
      location,
      operatingHours: operatingHours || {},
      capacity,
      headOfDepartmentId,
      contactExtension,
      emergencyContact,
      resources: resources || [],
      isActive: true
    });

    res.status(201).json({
      success: true,
      department
    });
  } catch (error) {
    console.error('Error in createDepartment:', error);
    next(error);
  }
};

exports.getDepartments = async (req, res, next) => {
  try {
    const departments = await Department.findAll({
      include: [{
        model: User,
        as: 'headOfDepartment',
        attributes: ['id', 'surname', 'otherNames', 'email'], // Updated attributes
        required: false
      }],
      order: [['name', 'ASC']]
    });

    // Format response to include full name
    const formattedDepartments = departments.map(dept => ({
      ...dept.toJSON(),
      headOfDepartment: dept.headOfDepartment ? {
        ...dept.headOfDepartment.toJSON(),
        fullName: `${dept.headOfDepartment.surname} ${dept.headOfDepartment.otherNames}`
      } : null
    }));

    res.json({
      success: true,
      departments: formattedDepartments
    });
  } catch (error) {
    next(error);
  }
};

// Update getDoctorsByDepartment function
exports.getDoctorsByDepartment = async (req, res, next) => {
  try {
    const { departmentId } = req.params;

    const doctors = await User.findAll({
      where: {
        departmentId,
        role: 'DOCTOR',
        isActive: true
      },
      attributes: [
        'id', 
        'surname', 
        'otherNames',
        'specialization',
        'licenseNumber',
        'qualification'
      ],
      include: [{
        model: DoctorAvailability,
        attributes: ['weeklySchedule', 'isAcceptingAppointments']
      }],
      order: [['surname', 'ASC']]
    });

    // Format response to include full name and availability
    const formattedDoctors = doctors.map(doctor => ({
      id: doctor.id,
      fullName: `${doctor.surname} ${doctor.otherNames}`,
      specialization: doctor.specialization,
      licenseNumber: doctor.licenseNumber,
      qualification: doctor.qualification,
      isAvailable: doctor.DoctorAvailability?.isAcceptingAppointments || false,
      schedule: doctor.DoctorAvailability?.weeklySchedule || {}
    }));

    res.json({
      success: true,
      doctors: formattedDoctors
    });
  } catch (error) {
    next(error);
  }
};

exports.getDepartmentById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const department = await Department.findByPk(id, {
      include: [
        {
          model: User,
          as: 'headOfDepartment',
          attributes: ['id', 'name', 'email']
        },
        {
          model: User,
          as: 'staff',
          attributes: ['id', 'name', 'role'],
          where: { isActive: true },
          required: false
        }
      ]
    });

    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found'
      });
    }

    res.json({
      success: true,
      department
    });
  } catch (error) {
    console.error('Error in getDepartmentById:', error);
    next(error);
  }
};

exports.updateDepartment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const department = await Department.findByPk(id);
    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found'
      });
    }

    // Update department
    await department.update(updateData);

    // If head of department changes, update user's department
    if (updateData.headOfDepartmentId && 
        updateData.headOfDepartmentId !== department.headOfDepartmentId) {
      await User.update(
        { departmentId: id },
        { where: { id: updateData.headOfDepartmentId } }
      );
    }

    res.json({
      success: true,
      message: 'Department updated successfully',
      department
    });
  } catch (error) {
    console.error('Error in updateDepartment:', error);
    next(error);
  }
};

exports.toggleDepartmentStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    const department = await Department.findByPk(id);
    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found'
      });
    }

    await department.update({ isActive });

    res.json({
      success: true,
      message: `Department ${isActive ? 'activated' : 'deactivated'} successfully`,
      department
    });
  } catch (error) {
    console.error('Error in toggleDepartmentStatus:', error);
    next(error);
  }
};

exports.getDepartmentStats = async (req, res, next) => {
  try {
    const { id } = req.params;

    const department = await Department.findByPk(id, {
      include: [{
        model: User,
        as: 'staff',
        attributes: ['id', 'role'],
        where: { isActive: true },
        required: false
      }]
    });

    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found'
      });
    }

    // Calculate staff distribution
    const staffDistribution = department.staff.reduce((acc, staff) => {
      acc[staff.role] = (acc[staff.role] || 0) + 1;
      return acc;
    }, {});

    res.json({
      success: true,
      stats: {
        totalStaff: department.staff.length,
        staffDistribution,
        operatingHours: department.operatingHours,
        capacity: department.capacity,
        resourceCount: department.resources?.length || 0
      }
    });
  } catch (error) {
    console.error('Error in getDepartmentStats:', error);
    next(error);
  }
};

exports.assignStaffToDepartment = async (req, res, next) => {
  try {
    const { departmentId } = req.params;
    const { staffIds } = req.body;

    if (!Array.isArray(staffIds)) {
      return res.status(400).json({
        success: false,
        message: 'staffIds must be an array'
      });
    }

    const department = await Department.findByPk(departmentId);
    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found'
      });
    }

    await User.update(
      { departmentId },
      { 
        where: { 
          id: { [Op.in]: staffIds },
          isActive: true
        }
      }
    );

    res.json({
      success: true,
      message: 'Staff assigned successfully'
    });
  } catch (error) {
    console.error('Error in assignStaffToDepartment:', error);
    next(error);
  }
};

async function calculateEstimatedWaitTime(departmentId) {
  const lastFiveCompletedPatients = await DepartmentQueue.findAll({
    where: {
      departmentId,
      status: ['COMPLETED', 'TRANSFERRED'],
      endTime: { [Op.not]: null },
      startTime: { [Op.not]: null }
    },
    order: [['endTime', 'DESC']],
    limit: 5
  });

  if (lastFiveCompletedPatients.length === 0) {
    return 30; // Default 30 minutes if no historical data
  }

  // Calculate average wait time
  const totalWaitTime = lastFiveCompletedPatients.reduce((sum, patient) => {
    const waitTime = Math.floor(
      (new Date(patient.endTime) - new Date(patient.startTime)) / (1000 * 60)
    );
    return sum + waitTime;
  }, 0);

  return Math.floor(totalWaitTime / lastFiveCompletedPatients.length);
}


exports.updateDepartmentResources = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { resources } = req.body;

    if (!Array.isArray(resources)) {
      return res.status(400).json({
        success: false,
        message: 'Resources must be an array'
      });
    }

    const department = await Department.findByPk(id);
    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found'
      });
    }

    await department.update({ resources });

    res.json({
      success: true,
      message: 'Department resources updated successfully',
      department
    });
  } catch (error) {
    console.error('Error in updateDepartmentResources:', error);
    next(error);
  }
};