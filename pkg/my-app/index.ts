// ./index.ts
import { importTypes } from '@rancher/auto-import';
import { IPlugin, TabLocation } from '@shell/core/types';
import extensionRouting from './routing/extension-routing';

// Init the package
export default function(plugin: IPlugin) {
  // Auto-import model, detail, edit from the folders
  importTypes(plugin);

  // Provide extension metadata from package.json
  // it will grab information such as `name` and `description`
  plugin.metadata = require('./package.json');

  // Load a product
  plugin.addProduct(require('./product'));

  plugin.addTab(
    TabLocation.RESOURCE_DETAIL,
    { resource: [
        'pod',
        'apps.deployment',
        'apps.statefulset',
        'apps.daemonset',
        'batch.job',
        'batch.cronjob'
      ]
    },
    {
      name: 'diagnosis-tab',
      labelKey: 'my-app.tab-diagnosis',
      weight: -5,
      showHeader: false,
      component: () => import('./components/DiagnosisTabComponent.vue')
    }
  );

  plugin.addTab(
    TabLocation.RESOURCE_DETAIL,
    { resource: [
        'pod',
        'apps.deployment',
        'apps.statefulset',
        'apps.daemonset',
        'batch.job',
        'batch.cronjob'
      ]
    },
    {
      name: 'chat-tab',
      labelKey: 'my-app.tab-chat',
      weight: -6,
      showHeader: false,
      component: () => import('./components/ChatTabComponent.vue')
    }
  );

  // Add Vue Routes
  plugin.addRoutes(extensionRouting);
}