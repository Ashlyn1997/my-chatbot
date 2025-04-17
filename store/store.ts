import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

interface FlowchartState {
  // Mermaid code for the flowchart
  mermaidCode: string;
  // History of changes for undo/redo functionality
  history: string[];
  // Current position in history
  historyIndex: number;
  // Flag to track if the chart is currently being rendered
  isRendering: boolean;
  // Flag to track which editing mode is active
  activeMode: 'code' | 'canvas' | 'ai';
  // Error message if any
  error: string | null;
  // Actions
  setMermaidCode: (code: string) => void;
  updateFromCanvas: (code: string) => void;
  updateFromAI: (code: string) => void;
  undo: () => void;
  redo: () => void;
  setActiveMode: (mode: 'code' | 'canvas' | 'ai') => void;
  setError: (error: string | null) => void;
  setIsRendering: (isRendering: boolean) => void;
}

// Default Mermaid code for a simple flowchart
const DEFAULT_MERMAID_CODE = `graph TD
  A[Start] --> B[Process]
  B --> C[End]`;

export const useFlowchartStore = create<FlowchartState>()(
  immer((set) => ({
    mermaidCode: DEFAULT_MERMAID_CODE,
    history: [DEFAULT_MERMAID_CODE],
    historyIndex: 0,
    isRendering: false,
    activeMode: 'code',
    error: null,

    setMermaidCode: (code) => 
      set((state) => {
        // Add to history only if code is different from current
        if (state.mermaidCode !== code) {
          // Remove any forward history if we're not at the end
          const newHistory = state.history.slice(0, state.historyIndex + 1);
          newHistory.push(code);
          
          state.mermaidCode = code;
          state.history = newHistory;
          state.historyIndex = newHistory.length - 1;
          state.error = null;
        }
      }),

    updateFromCanvas: (code) => 
      set((state) => {
        if (state.mermaidCode !== code) {
          const newHistory = state.history.slice(0, state.historyIndex + 1);
          newHistory.push(code);
          
          state.mermaidCode = code;
          state.history = newHistory;
          state.historyIndex = newHistory.length - 1;
          state.activeMode = 'canvas';
          state.error = null;
        }
      }),

    updateFromAI: (code) => 
      set((state) => {
        if (state.mermaidCode !== code) {
          const newHistory = state.history.slice(0, state.historyIndex + 1);
          newHistory.push(code);
          
          state.mermaidCode = code;
          state.history = newHistory;
          state.historyIndex = newHistory.length - 1;
          state.activeMode = 'ai';
          state.error = null;
        }
      }),

    undo: () => 
      set((state) => {
        if (state.historyIndex > 0) {
          state.historyIndex--;
          state.mermaidCode = state.history[state.historyIndex];
        }
      }),

    redo: () => 
      set((state) => {
        if (state.historyIndex < state.history.length - 1) {
          state.historyIndex++;
          state.mermaidCode = state.history[state.historyIndex];
        }
      }),

    setActiveMode: (mode) => 
      set((state) => {
        state.activeMode = mode;
      }),

    setError: (error) => 
      set((state) => {
        state.error = error;
      }),

    setIsRendering: (isRendering) => 
      set((state) => {
        state.isRendering = isRendering;
      }),
  }))
); 