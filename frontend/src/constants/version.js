// ============================================================
// App Version — Semantic Versioning (https://semver.org)
//   MAJOR.MINOR.PATCH
//   • MAJOR — breaking changes / big redesigns
//   • MINOR — new features, backwards-compatible
//   • PATCH — bug fixes, small tweaks
//
// Bump this ONE value on every meaningful update, and keep it in sync
// with "version" in package.json and app.json.
// ============================================================

export const APP_VERSION = '5.4.0';

// Short build channel label shown next to the version.
export const APP_CHANNEL = 'AI Priority Care';

// Full display string used on the Welcome screen, etc.
export const APP_VERSION_LABEL = `SehatLine v${APP_VERSION}  •  ${APP_CHANNEL}`;

export default { APP_VERSION, APP_CHANNEL, APP_VERSION_LABEL };
