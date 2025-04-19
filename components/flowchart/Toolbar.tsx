"use client";

import { useFlowchartStore } from "@/store/store";
import AvatarDropdown from "@/components/ui/avatarDropdown";
import { GithubIcon } from "lucide-react";

// 创建一个可变引用，用于存储CanvasEditor组件的同步函数
export const syncFromCanvasRef = { current: null as (() => void) | null };

export default function Toolbar() {
  const {
    error,
    setActiveMode,
    activeMode,
  } = useFlowchartStore();

  const handleSyncFromCanvas = () => {
    if (syncFromCanvasRef.current) {
      syncFromCanvasRef.current();
    }
  };

  return (
    <div className="flex items-center justify-between p-1 border-b border-gray-200 h-14 px-4">
      <div className="flex items-center gap-4">
        <GithubIcon className="size-3" />
        <div className="flex justify-center items-center border border-gray-200 rounded-md overflow-hidden">
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
        </div>
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
      {/* 展示当前登录人的名字和头像，没有上传头像用默认头像 */}
      <AvatarDropdown />

      {error && (
        <div className="absolute top-16 left-0 right-0 mx-auto max-w-md p-2 bg-red-50 text-red-700 border border-red-200 rounded-md text-sm">
          {error}
        </div>
      )}
    </div>
  );
} 