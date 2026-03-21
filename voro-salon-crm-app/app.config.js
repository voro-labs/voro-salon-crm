const { writeFileSync, existsSync, readFileSync, copyFileSync } = require('fs');
const { resolve } = require('path');

const googleServicesPath = resolve(__dirname, 'google-services.json');

if (process.env.GOOGLE_SERVICES) {
  const envValue = process.env.GOOGLE_SERVICES;

  // Caso 1: env var é um caminho de arquivo (comportamento de --type file no EAS)
  if (existsSync(envValue)) {
    copyFileSync(envValue, googleServicesPath);
  } else {
    // Caso 2: env var é o conteúdo JSON diretamente
    let content = envValue;

    // Tenta validar como JSON; se falhar, tenta decodificar base64
    try {
      JSON.parse(content);
    } catch {
      try {
        const decoded = Buffer.from(content, 'base64').toString('utf-8');
        JSON.parse(decoded);
        content = decoded;
      } catch {
        // usa o conteúdo original mesmo assim
      }
    }

    writeFileSync(googleServicesPath, content, 'utf-8');
  }
}

module.exports = {
  expo: {
    name: 'Voro Salon CRM',
    slug: 'voro-salon-crm',
    version: '1.0.0',
    scheme: 'vorosaloncrm',
    web: {
      favicon: './assets/favicon.png',
      bundler: 'metro',
    },
    experiments: {
      tsconfigPaths: true,
    },
    plugins: ['expo-secure-store', 'expo-router', 'expo-notifications'],
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    splash: {
      image: './assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    assetBundlePatterns: ['**/*'],
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.vorolabs.vorosaloncrm',
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#ffffff',
      },
      package: 'com.vorolabs.vorosaloncrm',
      googleServicesFile: './google-services.json',
    },
    extra: {
      eas: {
        projectId: 'd424753f-823b-4e87-8021-4f3671af12be',
      },
    },
  },
};
