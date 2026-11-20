// Lê o app.json e, no build do GitHub Pages, publica o app em /Cantina-App (EXPO_BASE_URL).
module.exports = ({ config }) => {
  if (!process.env.EXPO_BASE_URL) return config;
  return { ...config, experiments: { ...config.experiments, baseUrl: process.env.EXPO_BASE_URL } };
};
