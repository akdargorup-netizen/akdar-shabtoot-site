let _armed = false;
export async function initNativeBack() {
try {
if (_armed || !window.Capacitor?.isNativePlatform?.()) return;
const App = window.Capacitor?.Plugins?.App;
if (!App?.addListener) return;
_armed = true;
await App.addListener('backButton', async () => {
try {
const { handleDeviceBack } = await import('../core/router.js');
if (handleDeviceBack()) App.exitApp();
} catch (err) {
console.error('[NativeBack]', err);
try { history.back(); } catch {   }
}
});
} catch (err) { console.error('[NativeBack] init:', err); }
}
