// controllers/department.controller.js
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

    // Validate department code uniqueness
    const existingDept = await Department.findOne({ where: { code } });
    if (existingDept) {
      return res.status(400).json({
        success: false,
        message: 'Department code already exists'
      });
    }

    // Create department
    const department = await Department.create({
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
    });

    // If head of department is specified, update their record
    if (headOfDepartmentId) {
      await User.update(
        { departmentId: department.id },
        { where: { id: headOfDepartmentId } }
      );
    }

    res.status(201).json({
      success: true,
      department
    });
  } catch (error) {
    next(error);
  }
};

exports.getDepartments = async (req, res, next) => {
  try {
    const { type, isActive } = req.query;
    const whereClause = {};

    if (type) whereClause.type = type;
    if (isActive !== undefined) whereClause.isActive = isActive;

    const departments = await Department.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'headOfDepartment',
          attributes: ['id', 'name', 'email', 'staffId']
        },
        {
          model: User,
          as: 'staff',
          attributes: ['id', 'name', 'role', 'staffId'],
          where: { isActive: true },
          required: false
        }
      ],
      order: [['name', 'ASC']]
    });

    res.json({
      success: true,
      departments
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
          attributes: ['id', 'name', 'email', 'staffId']
        },
        {
          model: User,
          as: 'staff',
          attributes: ['id', 'name', 'role', 'staffId'],
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

    // If head of department is being changed
    if (updateData.headOfDepartmentId && 
        updateData.headOfDepartmentId !== department.headOfDepartmentId) {
      // Update old head's record
      if (department.headOfDepartmentId) {
        await User.update(
          { departmentId: null },
          { where: { id: department.headOfDepartmentId } }
        );
      }
      
      // Update new head's record
      await User.update(
        { departmentId: id },
        { where: { id: updateData.headOfDepartmentId } }
      );
    }

    await department.update(updateData);

    res.json({
      success: true,
      message: 'Department updated successfully',
      department
    });
  } catch (error) {
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

    // If department is being deactivated, handle staff reassignment
    if (!isActive) {
      await User.update(
        { 
          departmentId: null,
          metadata: sequelize.literal(`
            jsonb_set(
              metadata::jsonb,
              '{previousDepartment}',
              '"${department.id}"'::jsonb
            )
          `)
        },
        { 
          where: { departmentId: id }
        }
      );
    }

    res.json({
      success: true,
      message: `Department ${isActive ? 'activated' : 'deactivated'} successfully`,
      department
    });
  } catch (error) {
    next(error);
  }
};

exports.getDepartmentStats = async (req, res, next) => {
  try {
    const { id } = req.params;

    const department = await Department.findByPk(id, {
      include: [
        {
          model: User,
          as: 'staff',
          attributes: ['id', 'role'],
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

    // Calculate staff distribution by role
    const staffDistribution = department.staff.reduce((acc, staff) => {
      acc[staff.role] = (acc[staff.role] || 0) + 1;
      return acc;
    }, {});

    // Calculate resource utilization
    const resourceStats = department.resources.reduce((acc, resource) => {
      acc[resource.type] = (acc[resource.type] || 0) + resource.quantity;
      return acc;
    }, {});

    res.json({
      success: true,
      stats: {
        totalStaff: department.staff.length,
        staffDistribution,
        resourceStats,
        operatingHours: department.operatingHours,
        capacity: department.capacity
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.assignStaffToDepartment = async (req, res, next) => {
  try {
    const { departmentId } = req.params;
    const { staffIds } = req.body;

    const department = await Department.findByPk(departmentId);
    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found'
      });
    }

    // Update staff records
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
    next(error);
  }
};

exports.updateDepartmentResources = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { resources } = req.body;

    const department = await Department.findByPk(id);
    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found'
      });
    }

    // Validate resource format
    if (!Array.isArray(resources)) {
      return res.status(400).json({
        success: false,
        message: 'Resources must be an array'
      });
    }

    // Update resources
    await department.update({ resources });

    res.json({
      success: true,
      message: 'Department resources updated successfully',
      department
    });
  } catch (error) {
    next(error);
  }
};

module.exports = exports;