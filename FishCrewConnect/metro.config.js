const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require('nativewind/metro');
 
const config = getDefaultConfig(__dirname);

// Simplified configuration to prevent Metro errors
config.resolver = {
  ...config.resolver,
  sourceExts: [...(config.resolver?.sourceExts || []), 'jsx', 'js', 'ts', 'tsx'],
};

// Simple transformer configuration
config.transformer = {
  ...config.transformer,
  getTransformOptions: async () => ({
    transform: {
      experimentalImportSupport: false,
      inlineRequires: false,
    },
  }),
};

// Add error handling for symbolication without breaking Metro
const originalGetConfig = config.server?.enhanceMiddleware;
config.server = {
  ...config.server,
  enhanceMiddleware: (middleware) => {
    return (req, res, next) => {
      // Only handle symbolication requests
      if (req.url && req.url.includes('symbolicate')) {
        // Add error boundary for symbolication
        try {
          return middleware(req, res, (err) => {
            if (err) {
              console.warn('Symbolication error handled:', err.message);
              // Return empty stack instead of crashing
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ stack: [] }));
              return;
            }
            next(err);
          });
        } catch (error) {
          console.warn('Symbolication request handled:', error.message);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ stack: [] }));
          return;
        }
      }
      
      // Apply original middleware if it exists
      if (originalGetConfig) {
        return originalGetConfig(middleware)(req, res, next);
      }
      
      return middleware(req, res, next);
    };
  },
};
 
module.exports = withNativeWind(config, { input: './app/global.css' })