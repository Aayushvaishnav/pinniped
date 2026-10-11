// Runs with context isolation; keep the surface minimal.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('cinnyDesktop', {
  platform: process.platform,
  versions: {
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node,
  },
  // MSC4320 rich-presence publisher: the main process impersonates Discord's
  // local RPC pipe and forwards activity here for the renderer to publish.
  showWindow: () => ipcRenderer.send('window:show'),
  setBadgeCount: (count, overlay, hasUnread) =>
    ipcRenderer.send('badge:set', { count, overlay, hasUnread }),
  supportsRichPresenceBridge: true,
  startRichPresenceBridge: () => ipcRenderer.invoke('rich-presence:start'),
  stopRichPresenceBridge: () => ipcRenderer.invoke('rich-presence:stop'),
  onRichPresenceActivity: (cb) => {
    const listener = (_event, activity) => cb(activity);
    ipcRenderer.on('rich-presence:activity', listener);
    return () => ipcRenderer.removeListener('rich-presence:activity', listener);
  },
});
