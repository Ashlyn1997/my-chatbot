"use client";

import { useFlowchartStore } from "@/store/store";
import { useRef } from "react";

// 创建一个可变引用，用于存储CanvasEditor组件的同步函数
export const syncFromCanvasRef = { current: null as (() => void) | null };

export default function Toolbar() {
  const {
    undo,
    redo,
    history,
    historyIndex,
    error,
    setActiveMode,
    activeMode,
    mermaidCode
  } = useFlowchartStore();

  const handleSyncFromCanvas = () => {
    if (syncFromCanvasRef.current) {
      syncFromCanvasRef.current();
    }
  };

  return (
    <div className="flex items-center justify-between p-1 bg-gray-50 border-b border-gray-200">
      <div className="flex items-center space-x-4">
        <div className="flex items-center border border-gray-200 rounded-md overflow-hidden">
          <button
            onClick={() => setActiveMode('ai')}
            className={`px-4 py-1 text-sm ${activeMode === 'ai'
              ? 'bg-white font-medium text-blue-600'
              : 'bg-gray-100 hover:bg-gray-200'
              }`}
          >
            AI 对话
          </button>
          <button
            onClick={() => setActiveMode('code')}
            className={`px-4 py-1 text-sm ${activeMode === 'code'
              ? 'bg-white font-medium text-blue-600'
              : 'bg-gray-100 hover:bg-gray-200'
              }`}
          >
            代码编辑
          </button>
          <button
            onClick={() => setActiveMode('canvas')}
            className={`px-4 py-1 text-sm ${activeMode === 'canvas'
              ? 'bg-white font-medium text-blue-600'
              : 'bg-gray-100 hover:bg-gray-200'
              }`}
          >
            画布编辑
          </button>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleSyncFromCanvas}
            className="flex items-center px-3 py-1 text-sm text-indigo-600 hover:bg-indigo-50 rounded border border-indigo-200"
            title="从画布同步到代码"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            从画布同步
          </button>
          <button
            onClick={() => {
              const downloadButton = document.querySelector('.mermaid-svg-download') as HTMLButtonElement;
              if (downloadButton) downloadButton.click();
            }}
            className="flex items-center px-3 py-1 text-sm text-gray-700 hover:bg-gray-100 rounded"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            导出SVG
          </button>
          <button
            onClick={() => {
              const downloadButton = document.querySelector('.mermaid-png-download') as HTMLButtonElement;
              if (downloadButton) downloadButton.click();
            }}
            className="flex items-center px-3 py-1 text-sm text-gray-700 hover:bg-gray-100 rounded"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            导出PNG
          </button>
        </div>
      </div>

      <div className="flex space-x-2">
        <button
          onClick={undo}
          disabled={historyIndex <= 0}
          className="p-1 rounded-md bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-400"
          title="撤销"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 15l-3-3m0 0l3-3m-3 3h8M3 12a9 9 0 1118 0 9 9 0 01-18 0z" />
          </svg>
        </button>
        <button
          onClick={redo}
          disabled={historyIndex >= history.length - 1}
          className="p-1 rounded-md bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-400"
          title="重做"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 9l3 3m0 0l-3 3m3-3H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
      </div>

      {error && (
        <div className="absolute top-16 left-0 right-0 mx-auto max-w-md p-2 bg-red-50 text-red-700 border border-red-200 rounded-md text-sm">
          {error}
        </div>
      )}
    </div>
  );
} 