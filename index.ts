import { registerRootComponent } from 'expo';

import App from './App';

// ============================================
// SUPPRESS DEBUG LOGS IN PRODUCTION
// Di environment production (__DEV__ === false),
// semua output console.log / console.warn / console.info / console.debug
// dinonaktifkan secara global untuk menghindari kebocoran informasi
// dan meningkatkan performa aplikasi.
// console.error tetap aktif agar crash dapat terpantau.
// ============================================
if (!__DEV__) {
  console.log = () => {};
  console.warn = () => {};
  console.info = () => {};
  console.debug = () => {};
}

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);

