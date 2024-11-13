const landingPage = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Zuri Health API</title>
    <style>
        body {
            font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            max-width: 800px;
            margin: 0 auto;
            padding: 2rem;
            background-color: #f9fafb;
        }
        .container {
            background-color: white;
            padding: 2rem;
            border-radius: 8px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        h1 {
            color: #111827;
            margin-bottom: 1rem;
        }
        .version {
            color: #6b7280;
            font-size: 0.875rem;
        }
        .description {
            color: #374151;
            margin: 1rem 0;
        }
        .status {
            display: inline-block;
            background-color: #10b981;
            color: white;
            padding: 0.25rem 0.75rem;
            border-radius: 9999px;
            font-size: 0.875rem;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Zuri Health API</h1>
        <span class="version">v1.0.0</span>
        <div class="description">
            <p>Welcome to the Zuri Health Management System API. This API provides endpoints for managing hospital operations including:</p>
            <ul>
                <li>Patient Management</li>
                <li>Doctor Management</li>
                <li>Appointment Scheduling</li>
                <li>Medical Records</li>
                <li>Inventory Management</li>
                <li>Billing & Payments</li>
            </ul>
        </div>
        <span class="status">API is running</span>
    </div>
</body>
</html>
`;

module.exports = landingPage;