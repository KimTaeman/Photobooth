import type { ReactNode } from 'react';
import { useUploadQueue } from '../hooks/useUploadQueue';
import { UploadQueueContext } from './uploadQueueContextValue';

export function UploadQueueProvider({ children }: { children: ReactNode }) {
  const queue = useUploadQueue();
  const showStatus = queue.pendingCount > 0 || queue.failedCount > 0 || queue.isProcessing;
  return (
    <UploadQueueContext.Provider value={queue}>
      {showStatus && (
        <div className="queue-status" role="status">
          {queue.failedCount > 0
            ? `${queue.failedCount} private upload(s) need operator attention`
            : queue.isProcessing
              ? `Uploading ${queue.pendingCount} queued item(s)…`
              : `${queue.pendingCount} upload(s) safely queued`}
        </div>
      )}
      {children}
    </UploadQueueContext.Provider>
  );
}
