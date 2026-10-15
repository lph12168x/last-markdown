import { app } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import StoreCtor from 'electron-store'
import type Store from 'electron-store'
import type { WorkspaceRoot } from '../../types/file'
import type {
  RecentFile,
  RecentSshConnection,
  SettingsSchema,
  ThemeSetting,
  WindowState
} from '../../types/ipc'

const ElectronStore =
  (StoreCtor as unknown as { default?: typeof Store }).default ??
  (StoreCtor as unknown as typeof Store)

/** The store keeps its original file name across the rename, so migrating is one copy. */
const SETTINGS_FILE = 'composer-markdown-editor-settings.json'

/**
 * Renaming the app to "Last Markdown" moved `userData` to a new folder, which
 * would otherwise look like every recent folder, SSH connection and open
 * workspace had been deleted. Copy the previous settings in once, before the
 * store is built, and leave the old folder in place so a downgrade still works.
 */
function migrateLegacySettings(): void {
  try {
    const current = app.getPath('userData')
    if (fs.existsSync(path.join(current, SETTINGS_FILE))) return

    for (const legacy of ['Composer Markdown Editor', 'composer-markdown-editor']) {
      const source = path.join(path.dirname(current), legacy, SETTINGS_FILE)
      if (!fs.existsSync(source)) continue
      fs.mkdirSync(current, { recursive: true })
      fs.copyFileSync(source, path.join(current, SETTINGS_FILE))
      break
    }
  } catch (err) {
    // Never block startup on a failed migration; the app just starts fresh.
    console.error('Failed to migrate settings from the previous app name:', err)
  }
}

migrateLegacySettings()

const store = new ElectronStore<SettingsSchema>({
  name: 'composer-markdown-editor-settings',
  defaults: {
    recentLocalDirs: [],
    recentSshConnections: [],
    recentFiles: [],
    windowState: { width: 0, height: 0 },
    theme: 'light'
  }
})

export function getSetting<K extends keyof SettingsSchema>(key: K): SettingsSchema[K] {
  return store.get(key)
}

export function setSetting<K extends keyof SettingsSchema>(key: K, value: SettingsSchema[K]): void {
  store.set(key, value)
}

export function addRecentLocalDir(path: string): void {
  const dirs = store.get('recentLocalDirs').filter((p) => p !== path)
  dirs.unshift(path)
  store.set('recentLocalDirs', dirs.slice(0, 10))
}

export function listRecentLocalDirs(): string[] {
  return store.get('recentLocalDirs')
}

export function clearRecentLocalDirs(): void {
  store.set('recentLocalDirs', [])
}

export function addRecentConnection(connection: RecentSshConnection): void {
  const connections = store
    .get('recentSshConnections')
    .filter(
      (c) =>
        !(
          c.host === connection.host &&
          c.username === connection.username &&
          c.port === connection.port
        )
    )
  connections.unshift(connection)
  store.set('recentSshConnections', connections.slice(0, 10))
}

export function listRecentConnections(): RecentSshConnection[] {
  return store.get('recentSshConnections')
}

export function removeRecentConnection(host: string, username: string): void {
  const connections = store
    .get('recentSshConnections')
    .filter((c) => !(c.host === host && c.username === username))
  store.set('recentSshConnections', connections)
}

export function clearRecentConnections(): void {
  store.set('recentSshConnections', [])
}

export function addRecentFile(file: RecentFile): void {
  const files = store.get('recentFiles').filter((f) => f.id !== file.id)
  files.unshift(file)
  store.set('recentFiles', files.slice(0, 10))
}

export function listRecentFiles(): RecentFile[] {
  return store.get('recentFiles')
}

export function clearRecentFiles(): void {
  store.set('recentFiles', [])
}

export function removeRecentFile(id: string): void {
  const files = store.get('recentFiles').filter((f) => f.id !== id)
  store.set('recentFiles', files)
}

export function saveWorkspace(roots: WorkspaceRoot[]): void {
  store.set('workspaceRoots', roots)
}

export function loadWorkspace(): WorkspaceRoot[] {
  return (store.get('workspaceRoots') ?? []) as WorkspaceRoot[]
}

export function getWindowState(): WindowState {
  return store.get('windowState')
}

export function setWindowState(state: WindowState): void {
  store.set('windowState', state)
}

export function getTheme(): ThemeSetting {
  return store.get('theme')
}

export function setTheme(theme: ThemeSetting): void {
  store.set('theme', theme)
}
