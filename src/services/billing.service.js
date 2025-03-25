// services/billing.service.js

const axios = require('axios');
const { Department } = require('../models');

/**
 * Service for handling billing operations
 */
class BillingService {
  /**
   * Add items to a patient's bill
   * 
   * @param {string} patientId - The ID of the patient
   * @param {string} serviceType - The type of service (PHARMACY, LAB, etc.)
   * @param {Array} items - Array of items to add to bill
   * @param {string} notes - Additional notes
   * @param {string} token - Authentication token
   * @returns {Promise} Response from billing API
   */
  static async addToBill(patientId, serviceType, items, notes, token) {
    try {
      // Get department ID for the service type
      const department = await Department.findOne({
        where: { name: serviceType }
      });
      
      if (!department) {
        throw new Error(`Department for service type ${serviceType} not found`);
      }
      
      // Format request body
      const billingRequest = {
        patientId,
        type: serviceType,
        departmentId: department.id,
        items: items.map(item => ({
          id: item.id,
          type: item.type || 'ITEM',
          quantity: item.quantity
        })),
        notes: notes || `${serviceType} service`
      };
      
      // Make API call to billing service
      const response = await axios.post(
        `${process.env.API_BASE_URL || ''}/api/v1/billing/add-items`,
        billingRequest,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token
          }
        }
      );
      
      return response.data;
    } catch (error) {
      console.error(`Error adding to ${serviceType} bill:`, error);
      throw error;
    }
  }
  
  /**
   * Get current bill for a patient
   * 
   * @param {string} patientId - The ID of the patient
   * @param {string} token - Authentication token
   * @returns {Promise} Current bill information
   */
  static async getCurrentBill(patientId, token) {
    try {
      const response = await axios.get(
        `${process.env.API_BASE_URL || ''}/api/v1/billing/patient/${patientId}/current`,
        {
          headers: {
            'Authorization': token
          }
        }
      );
      
      return response.data;
    } catch (error) {
      console.error('Error fetching current bill:', error);
      throw error;
    }
  }
  
  /**
   * Add pharmacy medications to bill
   * 
   * @param {string} patientId - The ID of the patient
   * @param {Array} medications - Array of dispensed medications
   * @param {string} notes - Additional notes
   * @param {string} token - Authentication token
   * @returns {Promise} Response from billing API
   */
  static async addPharmacyItems(patientId, medications, notes, token) {
    try {
      const billingItems = medications.map(med => ({
        id: med.medicationId,
        type: 'ITEM',
        quantity: med.quantity
      }));
      
      return await this.addToBill(patientId, 'PHARMACY', billingItems, notes, token);
    } catch (error) {
      console.error('Error adding pharmacy items to bill:', error);
      throw error;
    }
  }
}

module.exports = BillingService;