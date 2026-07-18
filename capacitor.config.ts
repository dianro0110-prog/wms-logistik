import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.wms.logistik',
  appName: 'WMS Logistik',

  server: {
    url: 'https://wms-warehouse.vercel.app/login',
    cleartext: false,
  },

  webDir: 'www',
};

export default config;