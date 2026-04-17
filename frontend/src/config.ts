// Configuration - modify these values as needed
export const CONFIG = {
  // Backend API URL
  // Format: "http://HOST:PORT" 
  // Use window.location.hostname for same-host deployments
  API_BASE_URL: (() => {
    // Auto-detect based on frontend URL
    const host = window.location.hostname
    const port = host === 'localhost' || host === '127.0.0.1' ? '8000' : '8080'
    return `http://${host}:${port}`
  })(),

  // SteamVR config path (for display/reference only, backend uses its own config)
  STEAMVR_CONFIG_PATH: 'C:\\Program Files (x86)\\Steam\\config',

  // Project root directory (for reference)
  PROJECT_ROOT: 'C:\\Users\\Jesse\\OneDrive\\Documents\\Generated AI Code\\SteamVR_SImple_Room_Mapper',

  // Upload settings
  MAX_PHOTOS: 6,
  MAX_FILE_SIZE_MB: 10,
}

// Override function for runtime config changes
export function updateConfig(updates: Partial<typeof CONFIG>) {
  Object.assign(CONFIG, updates)
}
