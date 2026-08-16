import { useContext } from 'react';
import { UploadQueueContext, type UploadQueueApi } from './uploadQueueContextValue';

export function useUploadQueueContext(): UploadQueueApi {
  const context = useContext(UploadQueueContext);
  if (!context) throw new Error('useUploadQueueContext must be used inside UploadQueueProvider');
  return context;
}
