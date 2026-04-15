import { create } from 'zustand';

export const usePipelineStore = create((set) => ({
  activeRunId: null,
  progress: {
    status: 'idle',
    current_step: null,
    processed: 0,
    total: 0,
    errors: []
  },
  
  setActiveRun: (runId, initialTotal) => set({ 
    activeRunId: runId, 
    progress: { status: 'running', current_step: 'upload_processor', processed: 0, total: initialTotal, errors: [] } 
  }),
  
  updateProgress: (payload) => set((state) => ({
    progress: { ...state.progress, ...payload }
  })),

  clearPipeline: () => set({ 
    activeRunId: null, 
    progress: { status: 'idle', current_step: null, processed: 0, total: 0, errors: [] } 
  })
}));
