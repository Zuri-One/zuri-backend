import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  // API Reference Sidebar
  apiSidebar: [
    {
      type: 'category',
      label: 'API Overview',
      items: [
        'api/overview',
        'api/base-url',
        'api/response-format',
        'api/error-handling',
        'api/rate-limiting',
      ],
    },
    {
      type: 'category',
      label: 'Authentication',
      items: [
        'api/auth/overview',
        'api/auth/registration',
        'api/auth/login',
        'api/auth/password-reset',
      ],
    },
    {
      type: 'category',
      label: 'Patient Management',
      items: [
        'api/patients/overview',
        'api/patients/registration',
      ],
    },
    {
      type: 'category',
      label: 'Appointments',
      items: [
        'api/appointments/create',
      ],
    },
    {
      type: 'category',
      label: 'Prescriptions',
      items: [
        'api/prescriptions/overview',
      ],
    },
    {
      type: 'category',
      label: 'Queue Management',
      items: [
        'api/queue/overview',
      ],
    },
    {
      type: 'category',
      label: 'Departments',
      items: [
        'api/departments/overview',
      ],
    },
    {
      type: 'category',
      label: 'Medications',
      items: [
        'api/medications/overview',
      ],
    },
    {
      type: 'category',
      label: 'CCP (Chronic Care Program)',
      items: [
        'api/ccp/overview',
        'api/ccp/external-api',
        'api/ccp/internal-api',
      ],
    },
  ],

  // Guides Sidebar
  guidesSidebar: [
    'guides/getting-started',
  ],

  // Deployment Sidebar
  deploymentSidebar: [
    'deployment/overview',
    'deployment/ec2-deployment',
  ],
};

export default sidebars;