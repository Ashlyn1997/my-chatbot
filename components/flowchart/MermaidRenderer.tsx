"use client";

import { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";
import { useFlowchartStore } from "@/store/store";

interface MermaidRendererProps {
  height?: string;
}

export default function MermaidRenderer({ height = "500px" }: MermaidRendererProps) {
  const { mermaidCode, setError, setIsRendering, isRendering } = useFlowchartStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgContent, setSvgContent] = useState<string>("");
  const renderCount = useRef(0);
  const [renderKey, setRenderKey] = useState(0);
  
  // 清理之前渲染的内容
  const clearContainer = () => {
    if (containerRef.current) {
      containerRef.current.innerHTML = "";
    }
  };

  // 使用安全的方式初始化 mermaid
  useEffect(() => {
    try {
      mermaid.initialize({
        startOnLoad: false, // 我们手动控制渲染
        theme: "default",
        logLevel: "error",
        securityLevel: "loose",
        fontFamily: "monospace",
        flowchart: {
          useMaxWidth: true,
          htmlLabels: true,
          curve: 'basis'
        }
      });
      console.log("Mermaid initialized successfully");
    } catch (error) {
      console.error("Error initializing mermaid:", error);
    }
  }, []);

  // 每当 mermaidCode 改变时，带延迟地渲染图表
  useEffect(() => {
    let mounted = true;
    setIsRendering(true);
    
    // 清除任何现有内容
    clearContainer();
    
    // 使用超时确保 DOM 已经更新
    const timeoutId = setTimeout(async () => {
      if (!mounted || !containerRef.current) return;
      
      try {
        // 清除错误
        setError(null);
        console.log("Rendering Mermaid code:", mermaidCode);
        
        // 更新渲染计数
        renderCount.current += 1;
        const currentRender = renderCount.current;
        
        // 手动将代码渲染为 SVG
        const svg = await mermaid.render(
          `mermaid-${Date.now()}`, 
          mermaidCode
        );
        
        // 检查是否仍然是最新的渲染请求
        if (!mounted || currentRender !== renderCount.current) return;
        
        // 更新容器内容
        if (containerRef.current) {
          clearContainer();
          containerRef.current.innerHTML = svg.svg;
        }
        
        // 保存 SVG 内容以便导出
        setSvgContent(svg.svg);
      } catch (error) {
        console.error("Mermaid rendering error:", error);
        if (mounted) {
          setError(`渲染流程图时出错: ${error instanceof Error ? error.message : String(error)}`);
          
          // 在渲染失败时，显示一个简单的错误消息
          if (containerRef.current) {
            clearContainer();
            const errorDiv = document.createElement('div');
            errorDiv.className = "p-4 text-center text-red-500";
            errorDiv.innerText = "流程图渲染失败，请检查语法或尝试刷新页面";
            containerRef.current.appendChild(errorDiv);
          }
        }
      } finally {
        if (mounted) {
          setIsRendering(false);
        }
      }
    }, 100);
    
    // 清理函数
    return () => {
      mounted = false;
      clearTimeout(timeoutId);
    };
  }, [mermaidCode, setError, setIsRendering, renderKey]);

  // 强制重新渲染图表的函数
  const forceRender = () => {
    clearContainer();
    setRenderKey(prevKey => prevKey + 1);
  };

  // Function to download SVG
  const downloadSvg = () => {
    if (!svgContent) return;
    
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'flowchart.svg';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Function to download PNG
  const downloadPng = async () => {
    if (!svgContent) return;
    
    // Create an SVG blob
    const svgBlob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(svgBlob);
    
    // Create an image from the SVG
    const img = new Image();
    img.onload = () => {
      // Create a canvas to draw the image
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      
      // Draw the image to the canvas
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        
        // Convert canvas to PNG and download
        canvas.toBlob((blob) => {
          if (blob) {
            const pngUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = pngUrl;
            a.download = 'flowchart.png';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(pngUrl);
          }
        }, 'image/png');
      }
      
      URL.revokeObjectURL(url);
    };
    
    img.src = url;
  };

  return (
    <div className="h-full flex flex-col bg-white w-full">
      <div className="fixed top-0 right-0 z-10 p-2 text-xs text-gray-500 bg-white/80 rounded-md m-2">
        {isRendering ? (
          <span>正在渲染流程图...</span>
        ) : (
          <button 
            onClick={forceRender}
            className="text-blue-500 hover:text-blue-700 cursor-pointer"
          >
            重新渲染
          </button>
        )}
      </div>
      
      <div 
        ref={containerRef}
        className="flex-1 flex items-center justify-center overflow-auto p-4"
        style={{ maxHeight: height }}
      />
      
      {/* Hidden export buttons that can be triggered by the toolbar */}
      <div className="hidden">
        <button 
          onClick={downloadSvg}
          className="mermaid-svg-download"
        >
          Export SVG
        </button>
        <button 
          onClick={downloadPng}
          className="mermaid-png-download"
        >
          Export PNG
        </button>
      </div>
      
      {/* Visible floating export buttons at the bottom right */}
      <div className="absolute bottom-4 right-4 flex space-x-2">
        <button 
          onClick={downloadSvg}
          disabled={isRendering || !svgContent}
          className="px-3 py-1 bg-white border border-gray-300 rounded-md text-sm hover:bg-gray-50 disabled:opacity-50 shadow-sm"
        >
          Export SVG
        </button>
        <button 
          onClick={downloadPng}
          disabled={isRendering || !svgContent}
          className="px-3 py-1 bg-white border border-gray-300 rounded-md text-sm hover:bg-gray-50 disabled:opacity-50 shadow-sm"
        >
          Export PNG
        </button>
      </div>
    </div>
  );
} 