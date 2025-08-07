// ./routing/extension-routing.ts
import ListResource from '@shell/pages/c/_cluster/_product/_resource/index.vue';
import CreateResource from '@shell/pages/c/_cluster/_product/_resource/create.vue';
import ViewResource from '@shell/pages/c/_cluster/_product/_resource/_id.vue';
import ViewNamespacedResource from '@shell/pages/c/_cluster/_product/_resource/_namespace/_id.vue';
import AIAgentChat from '../pages/AIAgentChat.vue';

// to achieve naming consistency throughout the extension
// we recommend this to be defined on a config file and exported
// so that the developer can import it wherever it needs to be used
const YOUR_PRODUCT_NAME = 'AI Agent';
const CUSTOM_PAGE_NAME = 'Troubleshooting Agent';

const routes = [
  // this covers the "custom page"
  {
    name:      `c-cluster-${ YOUR_PRODUCT_NAME }-${ CUSTOM_PAGE_NAME }`,
    path:      `/c/:cluster/${ YOUR_PRODUCT_NAME }/${ CUSTOM_PAGE_NAME }`,
    component: AIAgentChat,
    meta:      { product: YOUR_PRODUCT_NAME },
  },
//   the following routes cover the "resource page"
//   registering routes for list/edit/create views
  {
    name:      `c-cluster-${ YOUR_PRODUCT_NAME }-resource`,
    path:      `/c/:cluster/${ YOUR_PRODUCT_NAME }/:resource`,
    component: ListResource,
    meta:      { product: YOUR_PRODUCT_NAME },
  },
  {
    name:      `c-cluster-${ YOUR_PRODUCT_NAME }-resource-create`,
    path:      `/c/:cluster/${ YOUR_PRODUCT_NAME }/:resource/create`,
    component: CreateResource,
    meta:      { product: YOUR_PRODUCT_NAME },
  },
  {
    name:      `c-cluster-${ YOUR_PRODUCT_NAME }-resource-id`,
    path:      `/c/:cluster/${ YOUR_PRODUCT_NAME }/:resource/:id`,
    component: ViewResource,
    meta:      { product: YOUR_PRODUCT_NAME },
  },
  {
    name:      `c-cluster-${ YOUR_PRODUCT_NAME }-resource-namespace-id`,
    path:      `/:cluster/${ YOUR_PRODUCT_NAME }/:resource/:namespace/:id`,
    component: ViewNamespacedResource,
    meta:      { product: YOUR_PRODUCT_NAME },
  }
];

export default routes;