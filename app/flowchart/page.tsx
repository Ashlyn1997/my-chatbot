"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useFlowchartStore } from "@/store/store";
import Toolbar from "@/components/flowchart/Toolbar";
import { Message } from "ai";
import { useChat } from "ai/react";
import { toast } from "sonner";
import { IntermediateStep } from "@/components/IntermediateStep";
import { ChatMessageBubble } from "@/components/ChatMessageBubble";
import { Button } from "@/components/ui/button";
import { LoaderCircle } from "lucide-react";

// Dynamically import components to avoid server-side rendering issues
// with browser-specific dependencies
const CodeEditor = dynamic(() => import("@/components/flowchart/CodeEditor"), { ssr: false });
const MermaidRenderer = dynamic(() => import("@/components/flowchart/MermaidRenderer"), { ssr: false });
const CanvasEditor = dynamic(() => import("@/components/flowchart/CanvasEditor"), { ssr: false });
// Use our custom endpoint for flowchart AI
const FLOWCHART_ENDPOINT = "/api/chart";

// 一个简单的用户注册流程图示例
const SAMPLE_FLOWCHART = `graph TD
  A[开始] --> B[输入用户信息]
  B --> C{验证信息}
  C -->|有效| D[创建账户]
  C -->|无效| E[显示错误]
  E --> B
  D --> F[发送确认邮件]
  F --> G[完成注册]`;

export default function FlowchartPage() {
  const { activeMode, updateFromAI, mermaidCode, setMermaidCode, setActiveMode } = useFlowchartStore();
  const [isClient, setIsClient] = useState(false);

  // Chat state
  const chat = useChat({
    api: FLOWCHART_ENDPOINT,
    onError: (e) => toast.error(`处理请求时出错`, { description: e.message }),
  });

  // Handle hydration issues by ensuring components only render client-side
  useEffect(() => {
    setIsClient(true);

    // 确保有一个初始流程图
    if (!mermaidCode || mermaidCode === 'graph TD\n  A[Start] --> B[Process]\n  B --> C[End]') {
      console.log("Setting initial flowchart...");
      setMermaidCode(SAMPLE_FLOWCHART);
    }
  }, [mermaidCode, setMermaidCode]);

  // Set up message interceptor to extract mermaid code from AI responses
  useEffect(() => {
    // Override fetch for our flowchart endpoint
    const originalFetch = window.fetch;
    window.fetch = async (input, init) => {
      // If we're making a POST request to our endpoint, add the current Mermaid code to the request
      if (typeof input === 'string' && input === FLOWCHART_ENDPOINT && init?.method === 'POST' && init.body) {
        try {
          const body = JSON.parse(init.body as string);
          const userMessage = body.messages[body.messages.length - 1];

          // Only add the Mermaid code if it's not already in the message
          if (userMessage && userMessage.role === 'user' && !userMessage.content.includes('```mermaid')) {
            userMessage.content = `Current flowchart:
\`\`\`mermaid
${useFlowchartStore.getState().mermaidCode}
\`\`\`

My request: ${userMessage.content}`;

            // Create a new init object with modified body
            init = {
              ...init,
              body: JSON.stringify(body)
            };
          }
        } catch (e) {
          console.error('Error modifying request:', e);
        }
      }

      const response = await originalFetch(input, init);

      // Only intercept responses from our specific endpoint
      if (typeof input === 'string' && input === FLOWCHART_ENDPOINT && response.ok) {
        const originalJson = response.json;
        response.json = async () => {
          const data = await originalJson.call(response);

          // Find the last assistant message
          const assistantMessages = data.messages.filter(
            (msg: Message) => msg.role === "assistant"
          );

          if (assistantMessages.length > 0) {
            const lastMessage = assistantMessages[assistantMessages.length - 1];

            // Try to extract mermaid code
            const mermaidPattern = /```(?:mermaid)?\s*([\s\S]*?)```/;
            const match = lastMessage.content.match(mermaidPattern);

            if (match && match[1]) {
              // Update the flowchart with the extracted code
              updateFromAI(match[1].trim());
            }
          }

          return data;
        };
      }

      return response;
    };

    // Cleanup
    return () => {
      window.fetch = originalFetch;
    };
  }, [updateFromAI]);

  // Handle chat form submission
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (chat.input.trim()) {
      chat.handleSubmit(e);
    }
  };

  if (!isClient) {
    return (
      <div className="flex justify-center items-center min-h-[70vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  console.log("Current mode:", activeMode);
  console.log("Current mermaid code:", mermaidCode);

  return (
    <div className="h-screen flex flex-col">
      <div className="container mx-auto px-4 py-2">
        {/* <h1 className="text-2xl font-bold mb-2">流程图助手</h1> */}
        <Toolbar />
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left side: Editor or AI Chat based on mode */}
        <div className="w-[500px] border-r border-gray-200 flex flex-col bg-white">
          {activeMode === 'ai' ? (
            <>
              <div className="flex-1 overflow-y-auto px-4 py-4">
                {chat.messages.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    <p>请告诉我您想要设计的流程图内容</p>
                    <p className="text-sm mt-2">例如:</p>
                    <ul className="text-sm list-disc list-inside">
                      <li>&quot;我需要一个简单的用户注册流程图&quot;</li>
                      <li>&quot;创建一个订单处理流程图&quot;</li>
                      <li>&quot;设计一个数据处理管道流程图&quot;</li>
                    </ul>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {chat.messages.map((message) => (
                      <ChatMessageBubble
                        key={message.id}
                        message={message}
                        aiEmoji="📊"
                        sources={[]}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Chat input */}
              <div className="p-4 border-t border-gray-200">
                <form onSubmit={handleSubmit} className="flex items-center space-x-2">
                  <input
                    value={chat.input}
                    onChange={chat.handleInputChange}
                    placeholder="输入您的需求..."
                    className="flex-1 p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <Button type="submit" disabled={chat.isLoading}>
                    {chat.isLoading ? (
                      <span role="status">
                        <LoaderCircle className="animate-spin w-4 h-4" />
                        <span className="sr-only">Loading...</span>
                      </span>
                    ) : (
                      <span>发送</span>
                    )}
                  </Button>
                </form>
              </div>
            </>
          ) : (
            <CodeEditor height="calc(100vh - 80px)" />
          )}
        </div>

        {/* Right side: Always show the canvas */}
        <div className="flex-1 bg-white">
          <CanvasEditor height="calc(100vh - 80px)" />
        </div>
      </div>
    </div>
  );
} 