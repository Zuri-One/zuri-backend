const { LabTestTemplate, User } = require('../models');
const { Op } = require('sequelize');

exports.createTemplate = async (req, res, next) => {
  try {
    const {
      name,
      category,
      parameters,
      sampleType,
      instructions,
      turnaroundTime,
      cost
    } = req.body;

    // Validate parameters structure
    if (!Array.isArray(parameters)) {
      return res.status(400).json({
        success: false,
        message: 'Parameters must be an array'
      });
    }

    // Validate each parameter
    for (const param of parameters) {
      if (!param.name || !param.type) {
        return res.status(400).json({
          success: false,
          message: 'Each parameter must have a name and type'
        });
      }

      if (param.type === 'NUMERIC' && (!param.normalRange || !param.unit)) {
        return res.status(400).json({
          success: false,
          message: 'Numeric parameters must have normal range and unit'
        });
      }

      if (param.type === 'OPTION' && (!Array.isArray(param.options) || param.options.length === 0)) {
        return res.status(400).json({
          success: false,
          message: 'Option parameters must have valid options array'
        });
      }
    }

    const template = await LabTestTemplate.create({
      name,
      category,
      parameters,
      sampleType,
      instructions,
      turnaroundTime,
      cost,
      createdBy: req.user.id
    });

    res.status(201).json({
      success: true,
      message: 'Lab test template created successfully',
      template
    });
  } catch (error) {
    next(error);
  }
};

exports.getTemplates = async (req, res, next) => {
  try {
    const { category, search, page = 1, limit = 10 } = req.query;

    const whereClause = { isActive: true };
    
    if (category) {
      whereClause.category = category;
    }

    if (search) {
      whereClause.name = {
        [Op.iLike]: `%${search}%`
      };
    }

    const { count, rows: templates } = await LabTestTemplate.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name']
        }
      ],
      order: [['name', 'ASC']],
      limit,
      offset: (page - 1) * limit
    });

    res.json({
      success: true,
      count,
      pages: Math.ceil(count / limit),
      currentPage: page,
      templates
    });
  } catch (error) {
    next(error);
  }
};

exports.updateTemplate = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const template = await LabTestTemplate.findByPk(id);

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    // Validate parameters if they're being updated
    if (updateData.parameters) {
      if (!Array.isArray(updateData.parameters)) {
        return res.status(400).json({
          success: false,
          message: 'Parameters must be an array'
        });
      }

      for (const param of updateData.parameters) {
        if (!param.name || !param.type) {
          return res.status(400).json({
            success: false,
            message: 'Each parameter must have a name and type'
          });
        }
      }
    }

    await template.update(updateData);

    res.json({
      success: true,
      message: 'Template updated successfully',
      template
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteTemplate = async (req, res, next) => {
  try {
    const { id } = req.params;

    const template = await LabTestTemplate.findByPk(id);

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    // Soft delete by marking as inactive
    await template.update({ isActive: false });

    res.json({
      success: true,
      message: 'Template deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

exports.getTemplateById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const template = await LabTestTemplate.findOne({
      where: {
        id,
        isActive: true
      },
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name']
        }
      ]
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    res.json({
      success: true,
      template
    });
  } catch (error) {
    next(error);
  }
};

module.exports = exports;