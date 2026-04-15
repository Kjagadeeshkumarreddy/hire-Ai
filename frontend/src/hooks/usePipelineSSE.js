import { useEffect } from 'react';
import { usePipelineStore } from '../stores/pipelineStore';

export function usePipelineSSE(runId) {
  const updateProgress = usePipelineStore((s) => s.updateProgress);

  useEffect(() => {
    if (!runId) return;
    
    // We bind explicitly to the backend SSE endpoint defined natively in FastAPI
    const es = new EventSource(`${import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'}/pipeline/${runId}/status`);

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        updateProgress(data);
      } catch (e) {
        console.error("Failed to parse SSE event", e);
      }
    };

    es.onerror = () => es.close();

    return () => es.close();
  }, [runId, updateProgress]);
}
