import { GoogleGenAI, Type, FunctionDeclaration, Tool } from "@google/genai";
import { CompanyData, TimelineEvent, OrgNode, GroundingSource } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Helper to extract JSON from a potentially messy markdown response
const extractJson = (text: string): any => {
  try {
    // Try to find JSON block
    const jsonBlockRegex = /```json\s*([\s\S]*?)\s*```/;
    const match = text.match(jsonBlockRegex);
    if (match && match[1]) {
      return JSON.parse(match[1]);
    }
    // Fallback: try parsing the whole text if it looks like JSON
    if (text.trim().startsWith('{')) {
      return JSON.parse(text);
    }
    throw new Error("No JSON found");
  } catch (e) {
    console.error("Failed to parse JSON from Gemini response", e);
    return null;
  }
};

export const fetchCompanyData = async (companyName: string): Promise<CompanyData> => {
  const modelId = "gemini-2.5-flash"; 
  
  const prompt = `
    I need a comprehensive analysis of the company "${companyName}".
    
    Please perform a Google Search to find:
    1. A brief summary of the company.
    2. Key historical milestones (founding, IPO, major product launches, major acquisitions, crises). Dates are important.
    3. The organizational structure (parent company, major subsidiaries, key divisions).
    
    Output the result as a strict JSON object wrapped in a \`\`\`json\`\`\` code block.
    The JSON must adhere to this schema:
    {
      "companyName": "Exact Company Name",
      "summary": "Brief 2-3 sentence overview.",
      "timeline": [
        { "year": 2024, "dateStr": "Oct 2024", "title": "Event Title", "description": "Details...", "category": "general" }
      ],
      "structure": {
        "name": "${companyName}",
        "role": "root",
        "description": "Headquarters",
        "children": [
           { "name": "Subsidiary A", "role": "subsidiary", "description": "..." }
        ]
      }
    }
    
    For the "timeline" category, use one of: 'founding', 'product', 'acquisition', 'scandal', 'general'.
    Ensure the "structure" is a tree starting with the main company as root. If it has a parent company, make the parent the root and the searched company a child.
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        systemInstruction: "You are a corporate historian and data analyst. You provide accurate, factual data based on search results.",
      }
    });

    const text = response.text || "";
    const parsedData = extractJson(text);

    if (!parsedData) {
      throw new Error("Could not parse structured data from the AI response.");
    }

    // Extract grounding metadata
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources: GroundingSource[] = groundingChunks
      .map((chunk: any) => {
        if (chunk.web) {
          return { title: chunk.web.title, uri: chunk.web.uri };
        }
        return null;
      })
      .filter((s: GroundingSource | null) => s !== null) as GroundingSource[];

    const uniqueSources = Array.from(new Map(sources.map(s => [s.uri, s])).values());

    return {
      ...parsedData,
      sources: uniqueSources
    };

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};

// --- Chat Functionality ---

const updateDataTool: FunctionDeclaration = {
  name: "update_company_data",
  description: "Updates the company's timeline or organizational structure visualization. Use this when the user corrects information, asks to add missing events, or provides new details that should be reflected in the visual charts.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      timeline: {
        type: Type.ARRAY,
        description: "The COMPLETE updated list of timeline events. You must include existing unchanged events plus the new/modified ones.",
        items: {
          type: Type.OBJECT,
          properties: {
            year: { type: Type.NUMBER },
            dateStr: { type: Type.STRING },
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            category: { type: Type.STRING, enum: ['founding', 'product', 'acquisition', 'scandal', 'general'] }
          },
          required: ['year', 'title', 'description', 'category']
        }
      },
      structure: {
        type: Type.OBJECT,
        description: "The COMPLETE updated organizational structure tree. Includes root and all children.",
        properties: {
          name: { type: Type.STRING },
          role: { type: Type.STRING },
          description: { type: Type.STRING },
          children: { 
            type: Type.ARRAY,
            items: { type: Type.OBJECT, description: "Recursive structure nodes (simplified schema for tool)" }
          }
        },
        required: ['name', 'role']
      }
    }
  }
};

export class CompanyChatSession {
  private chat: any;
  private onUpdate: (data: Partial<CompanyData>) => void;

  constructor(initialData: CompanyData, onUpdate: (data: Partial<CompanyData>) => void) {
    this.onUpdate = onUpdate;
    this.chat = ai.chats.create({
      model: "gemini-2.5-flash",
      config: {
        systemInstruction: `You are an intelligent assistant helping a user analyze a company. 
        Current Context: You have access to the following company data which is currently displayed to the user:
        ${JSON.stringify(initialData)}
        
        Your Goal: Answer user questions about the company. You can use Google Search to find latest info.
        
        CRITICAL: If the user provides corrections, asks to add specific events/nodes, or if you discover through search that the current data is outdated or incorrect, YOU MUST use the 'update_company_data' tool to update the visualization.
        When using the tool, provide the COMPLETE updated arrays/objects, not just the diff.
        `,
        tools: [
          { googleSearch: {} },
          { functionDeclarations: [updateDataTool] }
        ]
      }
    });
  }

  async sendMessage(message: string): Promise<string> {
    try {
      let response = await this.chat.sendMessage({ message });
      
      // Handle potential function calls (loop until text is returned)
      // Note: The SDK might handle automatic function calling if configured, 
      // but for manual state updates, we often intercept.
      // However, @google/genai typically returns functionCalls in the response candidates.
      
      // We need to check if the model wants to call a tool
      let functionCalls = response.functionCalls;

      while (functionCalls && functionCalls.length > 0) {
        const functionResponses = [];

        for (const call of functionCalls) {
          if (call.name === 'update_company_data') {
            console.log("Executing Update Tool:", call.args);
            // Execute the update on the client side
            this.onUpdate(call.args as Partial<CompanyData>);
            
            functionResponses.push({
              name: call.name,
              id: call.id,
              response: { result: "success: visualization updated" }
            });
          }
        }

        // Send function execution results back to the model
        if (functionResponses.length > 0) {
          response = await this.chat.sendMessage({
            message: functionResponses.map((fr: any) => ({
              functionResponse: {
                name: fr.name,
                response: fr.response,
                id: fr.id
              }
            }))
          });
          // Re-check for more function calls or final text
          functionCalls = response.functionCalls;
        } else {
          break;
        }
      }

      return response.text || "I updated the information.";
    } catch (error) {
      console.error("Chat Error:", error);
      return "I encountered an error processing your request.";
    }
  }
}