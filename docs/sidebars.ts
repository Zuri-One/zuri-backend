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
      ],
    },
    {
      type: 'category',
      label: 'Patient Management',
      items: [
        'api/patients/overview',
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