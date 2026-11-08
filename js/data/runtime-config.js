export const RUNTIME_CONFIG = Object.freeze({
environment: 'production',
useLocalDemoUser: false,
enableRealPush: true,
enableRemoteNotifications: true,
});
export const IS_DEVELOPMENT = RUNTIME_CONFIG.environment === 'development';
