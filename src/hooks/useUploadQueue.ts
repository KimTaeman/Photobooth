import { useState, useEffect, useCallback } from 'react';
import { uploadToCloudinary } from './useCloudinary';
import { logSession } from './useSupabase';
import { 
  writeFile, 
  remove, 
  mkdir, 
  exists, 
  BaseDirectory,
  readFile
} from '@tauri-apps/plugin-fs';
import { join } from '@tauri-apps/api/path';

export interface QueuedUpload {
  id: string;
  sessionId: string;
  type: 'image' | 'video' | 'raw';
  filename: string;
  localPath: string;
  retryCount: number;
  metadata?: any;
}

const QUEUE_DIR = 'upload_queue';
const METADATA_FILE = 'queue_metadata.json';

export function useUploadQueue() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  // Initialize the queue directory
  const initQueue = useCallback(async () => {
    try {
      const queueExists = await exists(QUEUE_DIR, { baseDir: BaseDirectory.AppCache });
      if (!queueExists) {
        await mkdir(QUEUE_DIR, { baseDir: BaseDirectory.AppCache, recursive: true });
      }
      await updatePendingCount();
    } catch (err) {
      console.error('Failed to initialize upload queue:', err);
    }
  }, []);

  const updatePendingCount = useCallback(async () => {
    try {
      const metadata = await getMetadata();
      setPendingCount(metadata.length);
    } catch (err) {
      setPendingCount(0);
    }
  }, []);

  const getMetadata = async (): Promise<QueuedUpload[]> => {
    try {
      const metadataExists = await exists(METADATA_FILE, { baseDir: BaseDirectory.AppCache });
      if (!metadataExists) return [];
      const content = await readFile(METADATA_FILE, { baseDir: BaseDirectory.AppCache });
      return JSON.parse(new TextDecoder().decode(content));
    } catch (err) {
      return [];
    }
  };

  const saveMetadata = async (metadata: QueuedUpload[]) => {
    const content = new TextEncoder().encode(JSON.stringify(metadata));
    await writeFile(METADATA_FILE, content, { baseDir: BaseDirectory.AppCache });
  };

  const addToQueue = async (
    blob: Blob, 
    resourceType: 'image' | 'video' | 'raw', 
    filename: string, 
    sessionId: string,
    metadata?: any
  ) => {
    try {
      const id = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const extension = resourceType === 'video' ? 'webm' : (resourceType === 'image' ? 'jpg' : 'bin');
      const localFileName = `${id}.${extension}`;
      const localPath = await join(QUEUE_DIR, localFileName);
      
      // Save the blob to the local filesystem
      const arrayBuffer = await blob.arrayBuffer();
      await writeFile(localPath, new Uint8Array(arrayBuffer), { baseDir: BaseDirectory.AppCache });

      // Update metadata
      const currentMetadata = await getMetadata();
      currentMetadata.push({
        id,
        sessionId,
        type: resourceType,
        filename,
        localPath,
        retryCount: 0,
        metadata
      });
      await saveMetadata(currentMetadata);
      await updatePendingCount();
      
      console.log(`Queued upload: ${filename} (ID: ${id})`);
    } catch (err) {
      console.error('Failed to add to upload queue:', err);
    }
  };

  const processQueue = useCallback(async () => {
    if (isProcessing || !navigator.onLine) return;
    
    const metadata = await getMetadata();
    if (metadata.length === 0) return;

    setIsProcessing(true);
    console.log(`Processing ${metadata.length} queued uploads...`);

    const updatedMetadata = [...metadata];
    const toRemoveIndices: number[] = [];

    for (let i = 0; i < metadata.length; i++) {
      const item = metadata[i];
      try {
        const fileContent = await readFile(item.localPath, { baseDir: BaseDirectory.AppCache });
        const blob = new Blob([fileContent], { type: item.type === 'video' ? 'video/webm' : 'image/jpeg' });
        
        await uploadToCloudinary(blob, item.type, item.filename);
        
        // If it was the final session log that failed
        if (item.filename.endsWith('_final')) {
            await logSession(item.sessionId, item.metadata?.frame || null, item.metadata?.hasVideo || false);
        }

        // Success: mark for removal
        await remove(item.localPath, { baseDir: BaseDirectory.AppCache });
        toRemoveIndices.push(i);
        console.log(`Successfully uploaded queued item: ${item.filename}`);
      } catch (err) {
        console.error(`Failed to upload queued item ${item.filename}:`, err);
        updatedMetadata[i].retryCount += 1;
        // Optionally: implement max retries and move to 'failed' folder
      }
    }

    // Remove successful items from metadata
    const finalMetadata = updatedMetadata.filter((_, idx) => !toRemoveIndices.includes(idx));
    await saveMetadata(finalMetadata);
    await updatePendingCount();
    setIsProcessing(false);
  }, [isProcessing, updatePendingCount]);

  useEffect(() => {
    initQueue();
    
    // Process queue on mount and when coming back online
    processQueue();
    
    window.addEventListener('online', processQueue);
    return () => window.removeEventListener('online', processQueue);
  }, [initQueue, processQueue]);

  return {
    addToQueue,
    processQueue,
    pendingCount,
    isProcessing
  };
}
