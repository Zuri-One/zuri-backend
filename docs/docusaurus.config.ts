import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'ZuriHealth HMS Documentation',
  tagline: 'Comprehensive Hospital Management System API Documentation',
  favicon: 'img/favicon.ico',

  future: {
    v4: true,
  },

  url: 'https://your-server.com',
  baseUrl: '/docs/',

  organizationName: 'zurihealth',
  projectName: 'zuri-backend',

  onBrokenLinks: 'warn',
  onBrokenMarkdownLinks: 'warn',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          editUrl: 'https://github.com/zurihealth/zuri-backend/tree/main/docs/',
        },
        blog: false, // Disable blog
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/zurihealth-social-card.jpg',
    navbar: {
      title: 'ZuriHealth HMS',
      logo: {
        alt: 'ZuriHealth Logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'apiSidebar',
          position: 'left',
          label: 'API Reference',
        },
        {
          type: 'docSidebar',
          sidebarId: 'guidesSidebar',
          position: 'left',
          label: 'Guides',
        },
        {
          type: 'docSidebar',
          sidebarId: 'deploymentSidebar',
          position: 'left',
          label: 'Deployment',
        },
        {
          href: 'https://zuri-8f5l.onrender.com/api-docs/',
          label: 'Swagger UI',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Documentation',
          items: [
            {
              label: 'API Reference',
              to: '/docs/api/overview',
            },
            {
              label: 'Getting Started',
              to: '/docs/guides/getting-started',
            },
            {
              label: 'Authentication',
              to: '/docs/guides/authentication',
            },
          ],
        },
        {
          title: 'Resources',
          items: [
            {
              label: 'Live API Documentation',
              href: 'https://zuri-8f5l.onrender.com/api-docs/',
            },
            {
              label: 'Postman Collection',
              href: '#',
            },
            {
              label: 'Status Page',
              href: '#',
            },
          ],
        },
        {
          title: 'Support',
          items: [
            {
              label: 'Contact Support',
              href: 'mailto:support@zurihealth.com',
            },
            {
              label: 'Report Issues',
              href: '#',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} ZuriHealth HMS. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['json', 'bash', 'javascript', 'typescript'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;