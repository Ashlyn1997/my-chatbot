"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Editor, { Monaco } from "@monaco-editor/react";
import { useFlowchartStore } from "@/store/store";

interface CodeEditorProps {
  height?: string;
}

export default function CodeEditor({ height = "500px" }: CodeEditorProps) {
  const { mermaidCode, setMermaidCode, setActiveMode } = useFlowchartStore();
  const [isEditorReady, setIsEditorReady] = useState(false);
  const changeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Set up Monaco editor with syntax highlighting for Mermaid
  const handleEditorDidMount = (editor: any, monaco: Monaco) => {
    setIsEditorReady(true);

    // Register Mermaid language if not already registered
    if (!monaco.languages.getLanguages().some(lang => lang.id === 'mermaid')) {
      monaco.languages.register({ id: 'mermaid' });

      // Define basic syntax highlighting for Mermaid
      monaco.languages.setMonarchTokensProvider('mermaid', {
        tokenizer: {
          root: [
            [/graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|gantt|pie|journey/, 'keyword'],
            [/\[|\]|\(|\)|\{|\}/, 'delimiter'],
            [/-->|-->|==>|-.->|--o|--x|<-->|--/, 'operator'],
            [/".*?"/, 'string'],
            [/#.*$/, 'comment'],
            [/\w+/, 'identifier'],
          ]
        }
      });

      // Set editor theme
      monaco.editor.defineTheme('mermaidTheme', {
        base: 'vs',
        inherit: true,
        rules: [
          { token: 'keyword', foreground: '0000FF', fontStyle: 'bold' },
          { token: 'operator', foreground: 'FF0000' },
          { token: 'string', foreground: '008800' },
          { token: 'comment', foreground: '008800', fontStyle: 'italic' },
        ],
        colors: {
          'editor.foreground': '#000000',
          'editor.background': '#FFFFFF',
          'editor.lineHighlightBackground': '#F0F0F0',
        }
      });
    }
  };

  // Debounced editor change handler to prevent too frequent updates
  const handleEditorChange = useCallback((value: string | undefined) => {
    if (!value) return;

    // 切换到代码模式
    setActiveMode('code');

    // Clear any pending timeout
    if (changeTimeoutRef.current) {
      clearTimeout(changeTimeoutRef.current);
    }

    // 设置一个较短的延时以实现"近乎实时"的效果
    changeTimeoutRef.current = setTimeout(() => {
      setMermaidCode(value);
    }, 100); // 降低到100ms以提供更好的实时感
  }, [setMermaidCode, setActiveMode]);

  // Cleanup when component unmounts
  useEffect(() => {
    return () => {
      if (changeTimeoutRef.current) {
        clearTimeout(changeTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="h-full w-full bg-white">
      <Editor
        height={height}
        defaultLanguage="mermaid"
        language="mermaid"
        theme="mermaidTheme"
        value={mermaidCode}
        onChange={handleEditorChange}
        onMount={handleEditorDidMount}
        options={{
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          fontSize: 14,
          tabSize: 2,
          wordWrap: 'on',
          automaticLayout: true,
          scrollbar: {
            vertical: 'auto',
            horizontal: 'auto',
          },
        }}
      />
    </div>
  );
} 