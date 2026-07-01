/**
 * Dynamic Expo config — extends app.json with environment-aware overrides.
 * EAS sets APP_ENV via eas.json env block before running the build.
 *
 * - production → google-services-production.json
 * - staging/dev → google-services-staging.json (default)
 */
module.exports = ({ config }) => {
  const isProd = process.env.APP_ENV === "production";

  return {
    ...config,
    android: {
      ...config.android,
      googleServicesFile: isProd
        ? "./google-services-production.json"
        : "./google-services-staging.json",
    },
  };
};
