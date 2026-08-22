import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useJobStore = create(
  persist(
    (set) => ({
      activeJobId: null,
      activeJobTitle: 'Select Active Role',
      jobs: [],
      setJobs: (jobs) => set({ jobs }),
      setActiveJob: (job) => set({ 
        activeJobId: job.id, 
        activeJobTitle: job.title 
      }),
      clearActiveJob: () => set({ 
        activeJobId: null, 
        activeJobTitle: 'Select Active Role' 
      }),
    }),
    {
      name: 'hireai-job-storage',
    }
  )
);
