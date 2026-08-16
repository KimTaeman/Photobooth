import { createContext } from 'react';
import type { useUploadQueue } from '../hooks/useUploadQueue';

export type UploadQueueApi = ReturnType<typeof useUploadQueue>;
export const UploadQueueContext = createContext<UploadQueueApi | null>(null);
