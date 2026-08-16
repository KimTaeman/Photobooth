import { useCallback, useEffect, useRef, useState } from 'react';
import { z } from 'zod';
import { uploadToCloudinary, type CloudinaryResourceType } from './useCloudinary';
import { getAppRole, logSession, supabase } from './useSupabase';
import {
  BaseDirectory,
  exists,
  mkdir,
  readDir,
  readFile,
  remove,
  rename,
  stat,
  writeFile,
} from '@tauri-apps/plugin-fs';
import { join } from '@tauri-apps/api/path';

export interface QueuedUpload {
  id: string;
  sessionId: string;
  type: CloudinaryResourceType;
  mimeType: string;
  filename: string;
  localPath: string;
  retryCount: number;
  createdAt: number;
  nextAttemptAt: number;
  lastError?: string;
  metadata?: Record<string, unknown>;
}

const queuedUploadSchema = z.object({
  id: z.string().min(1),
  sessionId: z.string().min(1),
  type: z.enum(['image', 'video', 'raw']),
  mimeType: z.string().min(1).default('application/octet-stream'),
  filename: z.string().min(1),
  localPath: z.string().min(1),
  retryCount: z.number().int().min(0).default(0),
  createdAt: z.number().int().positive(),
  nextAttemptAt: z.number().int().nonnegative().default(0),
  lastError: z.string().max(500).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const metadataSchema = z.object({
  version: z.literal(2),
  items: z.array(queuedUploadSchema),
});

const QUEUE_DIR = 'upload_queue';
const METADATA_FILE = 'queue_metadata.json';
const METADATA_TEMP_FILE = 'queue_metadata.tmp';
const MAX_RETRIES = 8;
export const MAX_QUEUE_AGE_MS = 24 * 60 * 60 * 1000;
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000;
const PROCESS_INTERVAL_MS = 30 * 1000;

const isTauri = () => !!(window as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__;

export function retryDelay(attempt: number, random = Math.random): number {
  const maximum = 5 * 60_000;
  const exponential = Math.min(2 ** Math.max(0, attempt) * 1_000, maximum);
  return Math.round(exponential + random() * exponential * 0.2);
}

export function isQueueFileExpired(
  fileName: string,
  mtime: Date | null,
  birthtime: Date | null,
  now = Date.now(),
): boolean {
  const timestampPrefix = Number.parseInt(fileName.split('_', 1)[0], 10);
  const createdAt = birthtime?.getTime();
  const modifiedAt = mtime?.getTime();
  const fileTimestamp = Number.isFinite(timestampPrefix)
    ? timestampPrefix
    : (createdAt ?? modifiedAt ?? null);

  return fileTimestamp !== null && now - fileTimestamp >= MAX_QUEUE_AGE_MS;
}

export function parseQueueMetadata(value: unknown, now = Date.now()): QueuedUpload[] {
  const current = metadataSchema.safeParse(value);
  if (current.success) return current.data.items;

  // Upgrade the original unversioned array without discarding recoverable media.
  if (!Array.isArray(value)) return [];
  return value.flatMap((legacy) => {
    if (!legacy || typeof legacy !== 'object') return [];
    const item = legacy as Record<string, unknown>;
    const timestamp = Number.parseInt(String(item.id ?? '').split('_', 1)[0], 10);
    const upgraded = queuedUploadSchema.safeParse({
      ...item,
      mimeType:
        item.type === 'video'
          ? 'video/webm'
          : item.filename && String(item.filename).endsWith('_clip')
            ? 'image/gif'
            : 'image/jpeg',
      createdAt: Number.isFinite(timestamp) ? timestamp : now,
      nextAttemptAt: 0,
    });
    return upgraded.success ? [upgraded.data] : [];
  });
}

function safeErrorMessage(error: unknown): string {
  return (error instanceof Error ? error.message : 'Upload failed').slice(0, 500);
}

export function useUploadQueue() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const processingRef = useRef(false);
  const cleanupRef = useRef(false);
  const queueOperationRef = useRef<Promise<void>>(Promise.resolve());

  const runQueueOperation = useCallback(function runQueueOperation<T>(
    operation: () => Promise<T>,
  ): Promise<T> {
    const nextOperation = queueOperationRef.current.then(operation, operation);
    queueOperationRef.current = nextOperation.then(
      () => undefined,
      () => undefined,
    );
    return nextOperation;
  }, []);

  const getMetadata = useCallback(async (): Promise<QueuedUpload[]> => {
    if (!isTauri()) return [];
    try {
      if (!(await exists(METADATA_FILE, { baseDir: BaseDirectory.AppCache }))) return [];
      const content = await readFile(METADATA_FILE, { baseDir: BaseDirectory.AppCache });
      return parseQueueMetadata(JSON.parse(new TextDecoder().decode(content)));
    } catch (error) {
      console.warn('Upload queue metadata could not be read; media files are preserved.', error);
      return [];
    }
  }, []);

  const saveMetadata = useCallback(async (items: QueuedUpload[]) => {
    if (!isTauri()) return;
    const content = new TextEncoder().encode(JSON.stringify({ version: 2, items }));
    await writeFile(METADATA_TEMP_FILE, content, { baseDir: BaseDirectory.AppCache });
    await rename(METADATA_TEMP_FILE, METADATA_FILE, {
      oldPathBaseDir: BaseDirectory.AppCache,
      newPathBaseDir: BaseDirectory.AppCache,
    });
  }, []);

  const updatePendingCount = useCallback(async () => {
    const metadata = await getMetadata();
    setPendingCount(metadata.filter((item) => item.retryCount < MAX_RETRIES).length);
    setFailedCount(metadata.filter((item) => item.retryCount >= MAX_RETRIES).length);
  }, [getMetadata]);

  const initQueue = useCallback(async () => {
    if (!isTauri()) return;
    try {
      if (!(await exists(QUEUE_DIR, { baseDir: BaseDirectory.AppCache }))) {
        await mkdir(QUEUE_DIR, { baseDir: BaseDirectory.AppCache, recursive: true });
      }
      await updatePendingCount();
    } catch (error) {
      console.error('Failed to initialize upload queue:', error);
    }
  }, [updatePendingCount]);

  const cleanupExpiredQueue = useCallback(
    async (now = Date.now()): Promise<number> => {
      if (!isTauri() || processingRef.current || cleanupRef.current) return 0;
      cleanupRef.current = true;

      return runQueueOperation(async () => {
        let deletedCount = 0;
        try {
          const entries = await readDir(QUEUE_DIR, { baseDir: BaseDirectory.AppCache });
          const retainedPaths = new Set<string>();

          for (const entry of entries) {
            if (!entry.isFile || entry.isSymlink) continue;
            const localPath = await join(QUEUE_DIR, entry.name);
            try {
              const fileInfo = await stat(localPath, { baseDir: BaseDirectory.AppCache });
              if (isQueueFileExpired(entry.name, fileInfo.mtime, fileInfo.birthtime, now)) {
                await remove(localPath, { baseDir: BaseDirectory.AppCache });
                deletedCount += 1;
              } else {
                retainedPaths.add(localPath);
              }
            } catch (error) {
              retainedPaths.add(localPath);
              console.warn(`Failed to inspect queued file ${entry.name}:`, error);
            }
          }

          const metadata = await getMetadata();
          const retainedMetadata = metadata.filter(
            (item) => retainedPaths.has(item.localPath) && now - item.createdAt < MAX_QUEUE_AGE_MS,
          );
          if (retainedMetadata.length !== metadata.length) await saveMetadata(retainedMetadata);
          await updatePendingCount();
          if (deletedCount > 0) {
            console.info(
              `Privacy cleanup deleted ${deletedCount} queued media file(s) older than 24 hours.`,
            );
          }
          return deletedCount;
        } catch (error) {
          console.error('Failed to clean expired upload queue files:', error);
          return 0;
        } finally {
          cleanupRef.current = false;
        }
      });
    },
    [getMetadata, runQueueOperation, saveMetadata, updatePendingCount],
  );

  const addToQueue = async (
    blob: Blob,
    resourceType: CloudinaryResourceType,
    filename: string,
    sessionId: string,
    metadata?: Record<string, unknown>,
  ) => {
    if (!isTauri()) {
      console.warn('Local queue unavailable outside the Tauri application.');
      return;
    }

    return runQueueOperation(async () => {
      const createdAt = Date.now();
      const id = `${createdAt}_${crypto.randomUUID()}`;
      const extension =
        blob.type === 'image/gif'
          ? 'gif'
          : resourceType === 'video'
            ? 'webm'
            : resourceType === 'image'
              ? 'jpg'
              : 'bin';
      const localPath = await join(QUEUE_DIR, `${id}.${extension}`);
      await writeFile(localPath, new Uint8Array(await blob.arrayBuffer()), {
        baseDir: BaseDirectory.AppCache,
      });

      const items = await getMetadata();
      items.push({
        id,
        sessionId,
        type: resourceType,
        mimeType: blob.type || 'application/octet-stream',
        filename,
        localPath,
        retryCount: 0,
        createdAt,
        nextAttemptAt: 0,
        metadata,
      });
      await saveMetadata(items);
      await updatePendingCount();
    });
  };

  const processQueue = useCallback(async () => {
    if (!isTauri() || processingRef.current || cleanupRef.current || !navigator.onLine) return;
    const { data: authData } = await supabase.auth.getSession();
    if (!getAppRole(authData.session?.user)) return;
    processingRef.current = true;

    return runQueueOperation(async () => {
      const items = await getMetadata();
      if (items.length === 0) return;
      setIsProcessing(true);

      try {
        const now = Date.now();
        const updated = [...items];
        const completed = new Set<number>();
        const loggedSessions = new Set<string>();

        for (let index = 0; index < items.length; index += 1) {
          const item = items[index];
          if (item.retryCount >= MAX_RETRIES || item.nextAttemptAt > now) continue;

          try {
            if (!loggedSessions.has(item.sessionId)) {
              await logSession(
                item.sessionId,
                typeof item.metadata?.frame === 'string' ? item.metadata.frame : null,
                item.metadata?.hasVideo === true,
              );
              loggedSessions.add(item.sessionId);
            }

            const content = await readFile(item.localPath, { baseDir: BaseDirectory.AppCache });
            const blob = new Blob([content], { type: item.mimeType });
            await uploadToCloudinary(blob, item.type, item.filename, item.sessionId);
            await remove(item.localPath, { baseDir: BaseDirectory.AppCache });
            completed.add(index);
          } catch (error) {
            const retryCount = item.retryCount + 1;
            updated[index] = {
              ...item,
              retryCount,
              nextAttemptAt: now + retryDelay(retryCount),
              lastError: safeErrorMessage(error),
            };
            console.error(
              `Queued upload ${item.filename} failed (attempt ${retryCount}/${MAX_RETRIES}).`,
              error,
            );
          }
        }

        await saveMetadata(updated.filter((_, index) => !completed.has(index)));
        await updatePendingCount();
      } finally {
        setIsProcessing(false);
      }
    }).finally(() => {
      processingRef.current = false;
    });
  }, [getMetadata, runQueueOperation, saveMetadata, updatePendingCount]);

  useEffect(() => {
    let cancelled = false;
    const bootstrap = async () => {
      await initQueue();
      if (cancelled) return;
      await cleanupExpiredQueue();
      if (!cancelled) await processQueue();
    };
    void bootstrap();

    const handleOnline = () => void processQueue();
    const cleanupTimer = window.setInterval(() => void cleanupExpiredQueue(), CLEANUP_INTERVAL_MS);
    const processTimer = window.setInterval(() => void processQueue(), PROCESS_INTERVAL_MS);
    window.addEventListener('online', handleOnline);

    return () => {
      cancelled = true;
      window.clearInterval(cleanupTimer);
      window.clearInterval(processTimer);
      window.removeEventListener('online', handleOnline);
    };
  }, [cleanupExpiredQueue, initQueue, processQueue]);

  return {
    addToQueue,
    processQueue,
    cleanupExpiredQueue,
    pendingCount,
    failedCount,
    isProcessing,
  };
}
