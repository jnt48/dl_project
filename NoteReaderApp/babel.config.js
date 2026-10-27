// babel.config.js
// Required for:
//  - react-native-reanimated: worklet support ('worklet' directive)
//  - react-native-vision-camera: frame processor worklets
//
// The reanimated plugin MUST be listed last in the plugins array.
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // react-native-reanimated plugin enables 'worklet' directive
      // so frame processors can run on the C++ thread
      'react-native-reanimated/plugin',
    ],
  };
};
