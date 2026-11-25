import type { CapacitorConfig } from "@capacitor/cli";

/**
 * App das lojas. O conteúdo é o mesmo do site (pasta "out", gerada por
 * `npm run build:native`), e as chamadas de IA, conta e pagamento vão para
 * o servidor publicado (NEXT_PUBLIC_API_BASE).
 */
const config: CapacitorConfig = {
  appId: "app.domeni",
  appName: "Domeni",
  webDir: "out",
  backgroundColor: "#ffffff",
  ios: {
    contentInset: "never",
    limitsNavigationsToAppBoundDomains: false,
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
