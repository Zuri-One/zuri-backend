// utils/email-templates/pharmacy-emails.util.js
exports.generateLowStockEmail = (data) => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            font-family: Arial, sans-serif;
          }
          .alert {
            background-color: #ffe6e6;
            border-left: 4px solid #ff3333;
            padding: 15px;
            margin-bottom: 20px;
          }
          .info {
            background-color: #f5f5f5;
            padding: 15px;
            margin: 10px 0;
          }
          .button {
            background-color: #4CAF50;
            color: white;
            padding: 10px 20px;
            text-decoration: none;
            border-radius: 5px;
            display: inline-block;
            margin-top: 15px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>Low Stock Alert</h2>
          <div class="alert">
            <p><strong>Attention Required:</strong> Medication stock level below minimum threshold</p>
          </div>
          
          <div class="info">
            <p><strong>Medication:</strong> ${data.medicationName}</p>
            <p><strong>Current Stock:</strong> ${data.currentStock} units</p>
            <p><strong>Minimum Stock Level:</strong> ${data.minStockLevel} units</p>
            <p><strong>Reorder Amount Recommended:</strong> ${data.reorderAmount} units</p>
          </div>
  
          <p>Please take necessary action to replenish the stock.</p>
          
          <a href="#" class="button">View Inventory</a>
          
          <p style="margin-top: 20px; font-size: 12px; color: #666;">
            This is an automated message from the Pharmacy Management System.
          </p>
        </div>
      </body>
      </html>
    `;
  };
  
  exports.generateExpiryAlertEmail = (data) => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            font-family: Arial, sans-serif;
          }
          .warning {
            background-color: #fff3e6;
            border-left: 4px solid #ff9933;
            padding: 15px;
            margin-bottom: 20px;
          }
          .medication-list {
            border-collapse: collapse;
            width: 100%;
            margin: 15px 0;
          }
          .medication-list th, .medication-list td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
          }
          .medication-list th {
            background-color: #f5f5f5;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>Medication Expiry Alert</h2>
          <div class="warning">
            <p><strong>Warning:</strong> The following medications are approaching their expiry date</p>
          </div>
          
          <table class="medication-list">
            <thead>
              <tr>
                <th>Medication</th>
                <th>Batch Number</th>
                <th>Expiry Date</th>
                <th>Current Stock</th>
              </tr>
            </thead>
            <tbody>
              ${data.medications.map(med => `
                <tr>
                  <td>${med.name}</td>
                  <td>${med.batchNumber}</td>
                  <td>${med.expiryDate}</td>
                  <td>${med.currentStock}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
  
          <p>Please take appropriate action to:</p>
          <ul>
            <li>Review the inventory</li>
            <li>Plan for disposal of expired medications</li>
            <li>Update stock records</li>
          </ul>
          
          <p style="margin-top: 20px; font-size: 12px; color: #666;">
            This is an automated message from the Pharmacy Management System.
          </p>
        </div>
      </body>
      </html>
    `;
  };
  
  exports.generateDispenseConfirmationEmail = (data) => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            font-family: Arial, sans-serif;
          }
          .success {
            background-color: #e6ffe6;
            border-left: 4px solid #33cc33;
            padding: 15px;
            margin-bottom: 20px;
          }
          .details {
            background-color: #f5f5f5;
            padding: 15px;
            margin: 10px 0;
            border-radius: 5px;
          }
          .instructions {
            border: 1px solid #ddd;
            padding: 15px;
            margin: 15px 0;
            border-radius: 5px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>Medication Dispensed</h2>
          <div class="success">
            <p>Your medication has been dispensed successfully</p>
          </div>
          
          <div class="details">
            <h3>Prescription Details</h3>
            <p><strong>Patient:</strong> ${data.patientName}</p>
            <p><strong>Medication:</strong> ${data.medicationName}</p>
            <p><strong>Quantity:</strong> ${data.quantity}</p>
            <p><strong>Date Dispensed:</strong> ${data.dispensedDate}</p>
            <p><strong>Dispensed By:</strong> ${data.pharmacistName}</p>
          </div>
  
          <div class="instructions">
            <h3>Instructions</h3>
            <p><strong>Dosage:</strong> ${data.dosage}</p>
            <p><strong>Frequency:</strong> ${data.frequency}</p>
            <p><strong>Duration:</strong> ${data.duration}</p>
            <p><strong>Special Instructions:</strong> ${data.instructions}</p>
          </div>
  
          <div style="margin-top: 20px;">
            <p><strong>Important Notes:</strong></p>
            <ul>
              <li>Keep this medication out of reach of children</li>
              <li>Store as per instructions provided</li>
              <li>Complete the full course as prescribed</li>
              <li>Contact your healthcare provider if you experience any adverse effects</li>
            </ul>
          </div>
          
          <p style="margin-top: 20px; font-size: 12px; color: #666;">
            This is an automated message from the Pharmacy Management System.<br>
            Please retain this email for your records.
          </p>
        </div>
      </body>
      </html>
    `;
  };