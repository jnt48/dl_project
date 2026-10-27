// metro.config.js
// Extends the default Expo Metro config to support .tflite model files
// as bundleable assets. Without this, Metro would reject the require()
// for the TFLite model binary.

const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Register .tflite as a known asset extension so Metro can bundle it
config.resolver.assetExts.push('tflite');

module.exports = config;
