// tsx falls back to os.userInfo() on Windows to name a temporary directory.
// Expose a stable development-only uid so this does not depend on Windows user lookup.
if (typeof process.geteuid !== 'function') {
  process.geteuid = () => 1
}
