"use client";

import { useEffect, useState, useRef, useCallback, useLayoutEffect } from "react";
import { useFlowchartStore } from "@/store/store";
import dynamic from "next/dynamic";
import { parseMermaidToExcalidraw } from "@excalidraw/mermaid-to-excalidraw";
import { convertToExcalidrawElements } from "@excalidraw/excalidraw"
import { getNonDeletedElements } from "@excalidraw/excalidraw";
import mermaid from "mermaid";
import { syncFromCanvasRef } from "./Toolbar";

// import "@/node_modules/@excalidraw/excalidraw/dist/dev/index.css";
import "@excalidraw/excalidraw/index.css";


// 控制解析过程的互斥锁
let isMermaidParsingInProgress = false;
let isInitialized = false;

// 安全的 Mermaid 解析函数
const safeParseWithMermaid = async (mermaidCode: string) => {
  // 如果已经有一个解析过程在进行中，等待一段时间后重试
  if (isMermaidParsingInProgress) {
    await new Promise(resolve => setTimeout(resolve, 50));
    return safeParseWithMermaid(mermaidCode);
  }

  try {
    // 设置解析标志
    isMermaidParsingInProgress = true;

    // 初始化 Mermaid（如果需要）
    if (!isInitialized) {
      try {
        // 重置 mermaid 以避免多次注册错误
        // @ts-ignore
        window.mermaid = undefined;

        // 重新初始化
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: 'loose',
        });
        isInitialized = true;
      } catch (error) {
        console.error("Failed to initialize mermaid:", error);
      }
    }

    // 处理代码
    let codeToUse = mermaidCode;
    if (!mermaidCode.trim().startsWith('graph') && !mermaidCode.trim().startsWith('flowchart')) {
      codeToUse = `graph TD\n${mermaidCode}`;
    }

    // 解析为 Excalidraw 元素
    const result = await parseMermaidToExcalidraw(codeToUse);
    return result;
  } catch (error) {
    console.error("Mermaid parsing error:", error);
    throw error;
  } finally {
    // 解析完成，重置标志
    isMermaidParsingInProgress = false;
  }
};

// 确保使用动态导入并禁用 SSR
const Excalidraw = dynamic(
  () => import("@excalidraw/excalidraw").then((mod) => mod.Excalidraw),
  { ssr: false }
);


interface CanvasEditorProps {
  height?: string;
}

// Define types for Excalidraw elements and API
type ExcalidrawElement = any;
type AppState = any;
type ExcalidrawImperativeAPI = any;

// Utility function to convert Excalidraw elements to Mermaid code
const convertExcalidrawToMermaid = (
  elements: readonly ExcalidrawElement[]
): string => {
  // Extract nodes (rectangles, diamonds, etc) and connections (arrows)
  const nodes: Record<string, { id: string, label: string, shape: string }> = {};
  const connections: { from: string; to: string; label?: string }[] = [];

  // First, find all text elements to potentially associate with shapes
  const textElements: Record<string, string> = {};
  elements.forEach((element) => {
    if (element.type === "text") {
      textElements[element.id] = element.text || "";
    }
  });

  console.log("Text elements found:", Object.keys(textElements).length);
  console.log("Converting elements:", elements.length);

  // Process elements
  elements.forEach((element) => {
    // Skip elements without an ID
    if (!element.id) return;

    // Handle regular shapes
    if (element.type === "rectangle") {
      nodes[element.id] = {
        id: element.id,
        label: extractTextContent(element),
        shape: "rectangle"
      };
    } else if (element.type === "diamond") {
      nodes[element.id] = {
        id: element.id,
        label: extractTextContent(element),
        shape: "diamond"
      };
    } else if (element.type === "ellipse") {
      nodes[element.id] = {
        id: element.id,
        label: extractTextContent(element),
        shape: "oval"
      };
    } else if (element.type === "rhombus") { // Alias for diamond
      nodes[element.id] = {
        id: element.id,
        label: extractTextContent(element),
        shape: "diamond"
      };
    } else if (element.type === "circle") { // Handle circle as oval
      nodes[element.id] = {
        id: element.id,
        label: extractTextContent(element),
        shape: "oval"
      };
    }
    // Handle arrow connectors
    else if (element.type === "arrow") {
      // Only add arrows that connect two elements
      if (element.startBinding?.elementId && element.endBinding?.elementId) {
        connections.push({
          from: element.startBinding.elementId,
          to: element.endBinding.elementId,
          label: extractTextContent(element)
        });
      }
    }
  });

  // Helper function to extract text content from an element
  function extractTextContent(element: ExcalidrawElement): string {
    // First try to get text directly from element
    if (element.text && element.text.trim() !== "") {
      return element.text.trim();
    }

    // For Excalidraw v2 format, sometimes text is in a separate property
    // @ts-ignore
    if (element.properties?.text && element.properties.text.trim() !== "") {
      // @ts-ignore
      return element.properties.text.trim();
    }

    // For arrows, check if there's a text element near the middle of the arrow
    if (element.type === "arrow" && element.points && element.points.length > 1) {
      // Return simple default for now
      return "";
    }

    // Default labels based on shape
    if (element.type === "rectangle") {
      return `Node_${element.id.substring(0, 4)}`;
    } else if (element.type === "diamond" || element.type === "rhombus") {
      return `Decision_${element.id.substring(0, 4)}`;
    } else if (element.type === "ellipse" || element.type === "circle") {
      return `Oval_${element.id.substring(0, 4)}`;
    }

    return "";
  }

  // Sanitize node labels - replace characters that may break Mermaid
  Object.values(nodes).forEach(node => {
    // Replace any characters that could break Mermaid syntax
    if (node.label) {
      node.label = node.label
        .replace(/[\[\](){}]/g, "_") // Replace brackets with underscores
        .replace(/["']/g, "") // Remove quotes
        .trim();
    }
  });

  // Debug info
  console.log("Processed nodes:", Object.keys(nodes).length);
  console.log("Processed connections:", connections.length);

  // Generate nodeIds map for consistent IDs
  const nodeIds: Record<string, string> = {};
  Object.values(nodes).forEach((node, index) => {
    // Create a short, deterministic ID for each node
    nodeIds[node.id] = `n${index + 1}`;
  });

  // Convert to Mermaid code
  let mermaidCode = "graph TD\n";

  // Add nodes with their labels
  Object.values(nodes).forEach((node) => {
    const nodeId = nodeIds[node.id];

    if (!nodeId) return; // Skip nodes without IDs

    if (node.shape === "rectangle") {
      mermaidCode += `  ${nodeId}[${node.label}]\n`;
    } else if (node.shape === "diamond") {
      mermaidCode += `  ${nodeId}{${node.label}}\n`;
    } else if (node.shape === "oval") {
      mermaidCode += `  ${nodeId}((${node.label}))\n`;
    }
  });

  // Add connections
  connections.forEach((conn) => {
    // Skip connections to nodes that don't exist
    if (!nodeIds[conn.from] || !nodeIds[conn.to]) return;

    const fromId = nodeIds[conn.from];
    const toId = nodeIds[conn.to];

    if (conn.label && conn.label.trim()) {
      mermaidCode += `  ${fromId} -->|${conn.label}| ${toId}\n`;
    } else {
      mermaidCode += `  ${fromId} --> ${toId}\n`;
    }
  });

  return mermaidCode;
};

export default function CanvasEditor({ height = "500px" }: CanvasEditorProps) {
  // 状态
  const { mermaidCode, activeMode, updateFromCanvas, setError, setActiveMode } = useFlowchartStore();
  const [excalidrawAPI, setExcalidrawAPI] = useState<ExcalidrawImperativeAPI | null>(null);
  const [elements, setElements] = useState<readonly ExcalidrawElement[]>([]);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [canvasCode, setCanvasCode] = useState<string | null>(null); // 存储画布生成的Mermaid代码

  // 引用
  const containerRef = useRef<HTMLDivElement>(null);
  const isUpdatingRef = useRef(false);
  const lastCodeRef = useRef(mermaidCode);
  const changeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const initialLoadRef = useRef(false);
  const scrollContentRef = useRef(false);
  const excalidrawReadyRef = useRef(false);

  // 更新 Excalidraw 场景
  const updateExcalidrawScene = useCallback(
    async (code: string, forceUpdate = false) => {
      if (isUpdatingRef.current && !forceUpdate) return;

      const effectiveCode = code.trim();
      // 如果代码为空，使用默认例子
      if (!effectiveCode) {
        console.warn("Mermaid code is empty");
        return;
      }

      // 跳过相同代码的更新，除非强制更新
      if (effectiveCode === lastCodeRef.current && !forceUpdate) {
        console.log("相同代码，跳过更新");
        return;
      }

      console.log("Updating Excalidraw from Mermaid code:", effectiveCode);
      lastCodeRef.current = effectiveCode;
      isUpdatingRef.current = true;
      setIsLoading(true);
      setLoadError(null);

      try {
        // 解析 Mermaid 代码
        const result = await safeParseWithMermaid(effectiveCode);
        if (!result || !result.elements) {
          throw new Error("无法解析Mermaid代码");
        }

        const newElements = convertToExcalidrawElements(result.elements);
        console.log("Parsed elements:", newElements.length);

        // 更新元素
        setElements(newElements);

        // 如果 API 已就绪，更新场景
        if (excalidrawAPI) {
          excalidrawAPI.updateScene({
            elements: newElements,
            appState: {
              viewBackgroundColor: "#ffffff",
              currentItemFontFamily: 1,
              viewModeEnabled: isReadOnly,
              gridSize: 20,
            },
          });

          // 延迟滚动到内容
          setTimeout(() => {
            try {
              // 适应内容并滚动到视图中心
              // 老是滚动到内容之外，需要手动点击scroll back to content
              // excalidrawAPI.scrollToContent({
              //   fitToContent: true,
              //   viewportZoomFactor: 0.8,
              //   animate: true,
              // });

              // 刷新组件
              excalidrawAPI.refresh();
            } catch (err) {
              console.error("调整视图失败:", err);
            }
            setIsLoading(false);
          }, 300);
        }
      } catch (error) {
        console.error("解析或更新失败:", error);
        setLoadError(`处理错误: ${error instanceof Error ? error.message : String(error)}`);
        setIsLoading(false);
      } finally {
        // 延迟重置更新标志，防止快速重复更新
        setTimeout(() => {
          isUpdatingRef.current = false;
        }, 100);
      }
    },
    [excalidrawAPI, isReadOnly]
  );

  // 当 Excalidraw API 准备好时
  const onExcalidrawAPIReady = useCallback((api: ExcalidrawImperativeAPI) => {
    setExcalidrawAPI(api);
    excalidrawReadyRef.current = true;

    // 立即执行初始加载
    if (!initialLoadRef.current) {
      console.log("Excalidraw API 已准备就绪，执行初始加载");
      setTimeout(() => {
        updateExcalidrawScene(mermaidCode, true);
      }, 100);
    }
  }, [mermaidCode, updateExcalidrawScene]);

  // 强制初始加载，作为后备机制
  useLayoutEffect(() => {
    if (excalidrawAPI && !initialLoadRef.current) {
      initialLoadRef.current = true;
      console.log("执行初始布局加载", mermaidCode);
      updateExcalidrawScene(mermaidCode, true);
    }
  }, [excalidrawAPI, mermaidCode, updateExcalidrawScene]);

  // 当Mermaid代码变化时更新Canvas
  useEffect(() => {
    if (excalidrawAPI && !isUpdatingRef.current && activeMode !== 'canvas') {
      updateExcalidrawScene(mermaidCode);
    }
  }, [mermaidCode, excalidrawAPI, activeMode, updateExcalidrawScene]);

  // 当切换到画布模式时重新加载画布
  useEffect(() => {
    if (activeMode === 'canvas' && excalidrawAPI && !isUpdatingRef.current) {
      // 如果是手动切换到画布模式，确保画布内容是最新的
      if (excalidrawAPI) {
        excalidrawAPI.refresh();
      }
    }
  }, [activeMode, excalidrawAPI]);

  // 窗口调整大小时重置视图
  useEffect(() => {
    // 当窗口大小改变时，重新计算视图
    const handleResize = () => {
      if (excalidrawAPI && scrollContentRef.current) {
        excalidrawAPI.refresh();
        excalidrawAPI.scrollToContent({
          fitToContent: true,
          viewportZoomFactor: 0.8,
          animate: true,
        });
      }
    };

    // 监听窗口大小变化
    window.addEventListener('resize', handleResize);

    // 初始窗口尺寸设置
    const timer = setTimeout(() => {
      if (containerRef.current) {
        const resizeEvent = new Event('resize');
        window.dispatchEvent(resizeEvent);
      }
    }, 200);

    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timer);
    };
  }, [excalidrawAPI]);

  // 处理 Excalidraw 元素变化
  const handleElementsChange = useCallback((newElements: readonly ExcalidrawElement[]) => {
    console.log("handleElementsChange====");
    // 立即更新本地状态
    setElements(newElements);

    // 处理画布到 Mermaid 的转换（加防抖）
    if (changeTimeoutRef.current) {
      clearTimeout(changeTimeoutRef.current);
    }

    changeTimeoutRef.current = setTimeout(() => {
      if (!excalidrawAPI) return;

      try {
        // 获取非删除的元素并转换
        const currentElements = getNonDeletedElements(newElements);
        const convertedCode = convertExcalidrawToMermaid(currentElements);

        console.log("Canvas generated code:", convertedCode);

        // 将代码保存到本地状态，但不更新到store
        setCanvasCode(convertedCode);
      } catch (error) {
        console.error("Canvas 到 Mermaid 转换失败:", error);
        setError(`转换错误: ${error instanceof Error ? error.message : String(error)}`);
      }
    }, 300);
  }, [excalidrawAPI, setError]);

  // 将画布内容同步到编辑器
  const syncToEditor = useCallback(() => {
    if (canvasCode) {
      console.log("同步画布内容到编辑器:", canvasCode);
      updateFromCanvas(canvasCode);
    }
  }, [canvasCode, updateFromCanvas]);

  // 注册同步函数到全局引用，让Toolbar可以访问
  useEffect(() => {
    syncFromCanvasRef.current = syncToEditor;

    return () => {
      syncFromCanvasRef.current = null;
    };
  }, [syncToEditor]);

  // 强制重新加载
  const forceReload = useCallback(() => {
    if (!excalidrawAPI) return;

    // 重置场景并重新加载
    excalidrawAPI.resetScene({ resetLoadingState: true });
    scrollContentRef.current = false;
    updateExcalidrawScene(mermaidCode, true);
    excalidrawAPI.resetScene();
    updateExcalidrawScene(mermaidCode);
  }, [excalidrawAPI, mermaidCode, updateExcalidrawScene]);

  // 切换只读模式
  const toggleReadOnly = useCallback(() => {
    const newMode = !isReadOnly;
    setIsReadOnly(newMode);

    if (excalidrawAPI) {
      excalidrawAPI.updateScene({
        appState: {
          viewModeEnabled: newMode
        }
      });
    }
  }, [excalidrawAPI, isReadOnly]);

  // 自定义UI选项
  const uiOptions = {
    canvasActions: {
      export: {},
      saveAsImage: true,
      saveToActiveFile: true,
      loadScene: true,
      clearCanvas: true,
      changeViewBackgroundColor: true,
    },
    tools: {
      selection: true,
      rectangle: true,
      diamond: true,
      ellipse: true,
      arrow: true,
      line: true,
      freedraw: true,
      text: true,
      image: true,
    }
  } as any;

  return (
    <div
      className="w-full h-full bg-white relative"
      ref={containerRef}
      style={{
        height: height || '100%',
        minHeight: "300px",
        display: "flex",
        flexDirection: "column",
        position: "relative",
      }}
    >
      {/* 控制按钮 */}
      <div className="absolute top-2 right-2 z-10 p-2 bg-white/90 rounded shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">画布编辑模式</span>
          <button
            onClick={forceReload}
            className="text-blue-500 hover:text-blue-700 text-xs px-2 py-1 rounded border border-blue-200 hover:bg-blue-50"
            disabled={isLoading}
          >
            {isLoading ? "加载中..." : "重新加载"}
          </button>
          <button
            onClick={toggleReadOnly}
            className={`text-xs px-2 py-1 rounded border ${isReadOnly
              ? "border-orange-200 text-orange-500 hover:bg-orange-50"
              : "border-green-200 text-green-500 hover:bg-green-50"
              }`}
          >
            {isReadOnly ? "进入编辑" : "只读模式"}
          </button>
          {canvasCode && canvasCode !== mermaidCode && activeMode === 'canvas' && (
            <button
              onClick={syncToEditor}
              className="text-indigo-500 hover:text-indigo-700 text-xs px-2 py-1 rounded border border-indigo-200 hover:bg-indigo-50"
            >
              同步到编辑器
            </button>
          )}
        </div>
      </div>

      {/* 错误提示 */}
      {loadError && (
        <div className="absolute top-12 right-2 z-10 p-2 bg-red-50 border border-red-200 rounded shadow-sm max-w-xs">
          <div className="flex items-start">
            <span className="text-xs text-red-600 flex-1">{loadError}</span>
            <button
              className="text-gray-500 hover:text-gray-700 ml-1"
              onClick={() => setLoadError(null)}
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* 加载指示器 */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/70 z-20">
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 border-t-2 border-b-2 border-blue-500 rounded-full animate-spin"></div>
            <span className="mt-2 text-sm text-gray-600">加载流程图...</span>
          </div>
        </div>
      )}

      {/* Excalidraw 组件 */}
      <div className="flex-1 w-full h-full">
        <Excalidraw
          excalidrawAPI={onExcalidrawAPIReady}
          initialData={{
            appState: {
              viewBackgroundColor: "#ffffff",
              currentItemFontFamily: 1,
              viewModeEnabled: isReadOnly,
              zenModeEnabled: false,
              gridSize: 20,
            },
            scrollToContent: true,
          }}
          onChange={handleElementsChange}
          viewModeEnabled={isReadOnly}
          zenModeEnabled={false}
          gridModeEnabled={true}
          theme="light"
          name="flowchart-editor"
          UIOptions={uiOptions}
        />
      </div>
    </div>
  );
}