import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.wms.logistik',
  appName: 'WMS Logistik',
  webDir: 'www',
  server: {
  url: "https://wms-warehouse.vercel.app",
  androidScheme: "https",
  cleartext: false,

  },
};

export default config;