import { useEffect, useState, useRef, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { FileOpener } from '@capawesome-team/capacitor-file-opener';
import { CapacitorZip } from '@capgo/capacitor-zip';
import type { PluginListenerHandle } from '@capacitor/core';

const VERSION_URL = 'https://goog-65o.pages.dev/updates/version.json';

// Simple semantic version comparison (returns true if v1 > v2)
const isNewerVersion = (v1: string, v2: string) => {
  const v1Parts = v1.split('.').map(Number);
  const v2Parts = v2.split('.').map(Number);
  
  for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
    const p1 = v1Parts[i] || 0;
    const p2 = v2Parts[i] || 0;
    if (p1 > p2) return true;
    if (p1 < p2) return false;
  }
  return false;
};

export function AutoUpdater() {
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [updateAvailable, setUpdateAvailable] = useState<{ version: string; downloadUrl: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    
    // Cleanup old update files on mount (after restart)
    const cleanupOldUpdates = async () => {
      if (!Capacitor.isNativePlatform()) return;
      try {
        const cacheContents = await Filesystem.readdir({
          path: '',
          directory: Directory.Cache
        });
        
        for (const file of cacheContents.files) {
          if (file.name.startsWith('update-')) {
            if (file.type === 'directory') {
              await Filesystem.rmdir({
                path: file.name,
                directory: Directory.Cache,
                recursive: true
              });
            } else {
              await Filesystem.deleteFile({
                path: file.name,
                directory: Directory.Cache
              });
            }
          }
        }
      } catch (err) {
        console.error('Failed to cleanup old updates:', err);
      }
    };
    
    cleanupOldUpdates();

    return () => {
      isMounted.current = false;
    };
  }, []);

  const checkForUpdates = useCallback(async () => {
    if (!Capacitor.isNativePlatform()) return;

    try {
      const appInfo = await CapacitorApp.getInfo();
      const currentVersion = appInfo.version;

      const response = await fetch(`${VERSION_URL}?t=${Date.now()}`);
      if (!response.ok) throw new Error('Network response was not ok');
      
      const data = await response.json();
      
      const downloadUrl = data.zipUrl || data.apkUrl || data.url;
      
      if (data.version && downloadUrl && isNewerVersion(data.version, currentVersion)) {
        if (isMounted.current) {
          setUpdateAvailable({ version: data.version, downloadUrl: downloadUrl });
        }
      }
    } catch (err) {
      console.error('Failed to check for updates:', err);
    }
  }, []);

  useEffect(() => {
    checkForUpdates();
  }, [checkForUpdates]);

  const downloadAndInstallUpdate = async () => {
    if (!updateAvailable) return;
    
    setDownloading(true);
    setProgress(0);
    setError(null);
    setUpdateAvailable(null); // Hide the prompt
    
    let progressListener: PluginListenerHandle | null = null;

    try {
      let downloadUrl = updateAvailable.downloadUrl;
      let isZip = false;
      
      if (downloadUrl.includes('Lumina%20Notepad.apk') || downloadUrl.includes('Lumina Notepad.apk')) {
        downloadUrl = downloadUrl.replace('.apk', '.zip');
        isZip = true;
      } else if (downloadUrl.endsWith('.zip')) {
        isZip = true;
      }

      const fileName = isZip ? `update-${Date.now()}.zip` : `update-${Date.now()}.apk`;
      
      progressListener = await Filesystem.addListener('progress', (status) => {
        if (isMounted.current) {
          setProgress(Math.round((status.bytes / status.contentLength) * 100));
        }
      });

      const downloadResult = await Filesystem.downloadFile({
        url: downloadUrl,
        path: fileName,
        directory: Directory.Cache,
        progress: true,
      });

      if (downloadResult.path) {
        let apkPathToOpen = downloadResult.path;

        if (isZip) {
          const extractDir = `update-extracted-${Date.now()}`;
          
          const extractDirUri = await Filesystem.getUri({
            path: extractDir,
            directory: Directory.Cache,
          });

          await Filesystem.mkdir({
            path: extractDir,
            directory: Directory.Cache,
            recursive: true,
          });

          const sourcePath = downloadResult.path.replace(/^file:\/\//, '');
          const destPath = extractDirUri.uri.replace(/^file:\/\//, '');

          await CapacitorZip.unzip({
            source: sourcePath,
            destination: destPath,
          });

          const dirContents = await Filesystem.readdir({
            path: extractDir,
            directory: Directory.Cache,
          });

          const apkFile = dirContents.files.find(f => f.name.endsWith('.apk'));
          if (!apkFile) {
            throw new Error('No APK found in the extracted ZIP file');
          }

          const apkUri = await Filesystem.getUri({
            path: `${extractDir}/${apkFile.name}`,
            directory: Directory.Cache,
          });
          
          apkPathToOpen = apkUri.uri.replace(/^file:\/\//, '');
        }

        await FileOpener.openFile({
          path: apkPathToOpen,
          mimeType: 'application/vnd.android.package-archive',
        });
      }
    } catch (err) {
      console.error('Error downloading or opening APK:', err);
      if (isMounted.current) {
        setError('Failed to download the update. Please try again later.');
      }
    } finally {
      if (progressListener) {
        progressListener.remove();
      }
      if (isMounted.current) {
        setDownloading(false);
      }
    }
  };

  if (!downloading && !updateAvailable && !error) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 w-72">
      {updateAvailable && !downloading && (
        <div className="bg-card text-card-foreground border shadow-lg p-4 rounded-lg flex flex-col gap-3">
          <div className="font-semibold">Update Available</div>
          <div className="text-sm text-muted-foreground">
            Version {updateAvailable.version} is ready to install.
          </div>
          <div className="flex justify-end gap-2 mt-1">
            <button 
              onClick={() => setUpdateAvailable(null)}
              className="px-3 py-1.5 text-sm font-medium hover:bg-muted rounded-md transition-colors"
            >
              Later
            </button>
            <button 
              onClick={downloadAndInstallUpdate}
              className="px-3 py-1.5 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity"
            >
              Update Now
            </button>
          </div>
        </div>
      )}

      {downloading && (
        <div className="bg-primary text-primary-foreground p-4 rounded-lg shadow-lg flex flex-col gap-2">
          <div className="font-semibold text-sm">Downloading Update...</div>
          <div className="w-full bg-primary-foreground/20 rounded-full h-2 overflow-hidden">
            <div 
              className="bg-primary-foreground h-2 rounded-full transition-all duration-300" 
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="text-xs text-right">{progress}%</div>
        </div>
      )}

      {error && (
        <div className="bg-destructive text-destructive-foreground p-4 rounded-lg shadow-lg flex flex-col gap-2">
          <div className="font-semibold text-sm">Update Failed</div>
          <div className="text-xs opacity-90">{error}</div>
          <button 
            onClick={() => setError(null)}
            className="self-end text-xs font-medium underline mt-1 opacity-80 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
