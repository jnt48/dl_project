// Ensure globalThis.expo is initialized before any Expo modules load
if (typeof (globalThis as any).expo === 'undefined') {
  (globalThis as any).expo = {};
}

import { registerRootComponent } from 'expo';

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
