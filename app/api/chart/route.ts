import { NextRequest, NextResponse } from "next/server";
import { Message as VercelChatMessage, StreamingTextResponse } from "ai";

import { ChatAlibabaTongyi } from "@langchain/community/chat_models/alibaba_tongyi";
import { PromptTemplate } from "@langchain/core/prompts";
import { HttpResponseOutputParser } from "langchain/output_parsers";

export const runtime = "edge";

const formatMessage = (message: VercelChatMessage) => {
  return `${message.role}: ${message.content}`;
};

// Define the initial prompt for the flowchart assistant
const FLOWCHART_SYSTEM_PROMPT = `You are a flowchart specialist that helps users create and modify Mermaid-syntax flowcharts.

When responding to a user request, please follow these guidelines:
1. Always include the COMPLETE, UPDATED flowchart Mermaid code in your response.
2. Put the code in a code block with the mermaid syntax tag: \`\`\`mermaid ... \`\`\`
3. Keep your explanations brief and focused on the changes you've made.
4. Ensure your Mermaid syntax is correct and follows best practices.
5. For user experience, maintain the graph TD direction unless specifically asked to change it.

The user will provide the current flowchart (if any) in their message. If they don't, assume they want to start from scratch.

Current conversation:
{chat_history}

User request: {input}

Your response (include the complete flowchart in mermaid code block):`;

/**
 * This handler processes flowchart generation and modification requests using ChatAlibabaTongyi
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const messages = body.messages ?? [];
    
    // Extract the current Mermaid code if present in the conversation
    let currentMermaidCode = "";
    const mermaidPattern = /```(?:mermaid)?\s*([\s\S]*?)```/;
    
    // Look for Mermaid code in the conversation history (from newest to oldest)
    for (let i = messages.length - 2; i >= 0; i--) {
      const msg = messages[i];
      if (msg.role === "assistant") {
        const match = msg.content.match(mermaidPattern);
        if (match && match[1]) {
          currentMermaidCode = match[1].trim();
          break;
        }
      }
    }
    
    // Also check if the current user message contains Mermaid code
    const currentMessage = messages[messages.length - 1];
    const currentMessageMatch = currentMessage.content.match(mermaidPattern);
    if (currentMessageMatch && currentMessageMatch[1]) {
      currentMermaidCode = currentMessageMatch[1].trim();
    }
    
    // Format previous messages for context
    const formattedPreviousMessages = messages.slice(0, -1).map(formatMessage);
    
    // Get the current message content
    let currentMessageContent = currentMessage.content;
    
    // If we have a current Mermaid code but it's not in the user's message,
    // add it to provide context to the model
    if (currentMermaidCode && !currentMessageContent.includes(currentMermaidCode)) {
      currentMessageContent = `Current flowchart:
\`\`\`mermaid
${currentMermaidCode}
\`\`\`

My request: ${currentMessageContent}`;
    }
    
    // Create the prompt
    const prompt = PromptTemplate.fromTemplate(FLOWCHART_SYSTEM_PROMPT);
    
    // Initialize the model
    const model = new ChatAlibabaTongyi({
      temperature: 0.3, // Lower temperature for more deterministic outputs
      alibabaApiKey: process.env.TONGYI_API_KEY,
    });
    
    // Set up output parser for streaming
    const outputParser = new HttpResponseOutputParser();
    
    // Create and execute the chain
    const chain = prompt.pipe(model).pipe(outputParser);
    
    const stream = await chain.stream({
      chat_history: formattedPreviousMessages.join("\n"),
      input: currentMessageContent,
    });
    
    return new StreamingTextResponse(stream);
  } catch (e: any) {
    console.error("Error in flowchart endpoint:", e);
    return NextResponse.json({ error: e.message }, { status: e.status ?? 500 });
  }
} 