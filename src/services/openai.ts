import { Message } from "../taskpane/types";

// Azure Function Backend URL (local dev)
const BACKEND_URL = process.env.AZURE_FUNCTION_URL || "http://localhost:7071/api/chat";

export const openaiService = {
    chat: async (history: Message[], context?: string): Promise<string> => {
        try {
            const systemMessage = {
                role: 'system',
                content: "You are a helpful Microsoft Word assistant. When asked to draft or write document content, wrap the actual content in <doc>...</doc> tags. Do NOT use Markdown formatting (like **bold**, ## headers) inside the <doc> tags; use plain text/layout. Keep your conversational response outside the tags."
            };

            const messages = [
                systemMessage,
                ...history.map(m => ({
                    role: m.sender === 'user' ? 'user' : 'assistant',
                    content: m.text
                }))
            ];

            const response = await fetch(BACKEND_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    messages,
                    context: context // Pass the RAG context (file content or doc content)
                })
            });

            if (!response.ok) {
                throw new Error(`Backend error: ${response.statusText}`);
            }

            const data = await response.json();
            return data.response || "No response from AI";
        } catch (error: any) {
            console.error("Error calling backend:", error);
            return `Error calling AI: ${error.message}`;
        }
    },

    generateRedlines: async (text: string, instructions: string, context?: string): Promise<{ original: string, new: string, justification: string }[]> => {
        try {
            const systemPrompt = `You are an expert editor. Rewrite the provided text according to the user's instructions.
            
            CRITICAL RULES:
            1. MINIMAL CHANGES: Make ONLY the changes explicitly requested. Preserve all other wording, punctuation, and formatting exactly.
            2. NO REPHRASING: Do not improve style or flow unless asked.
            3. EXACT OUTPUT: Return the rewritten text exactly as it should appear.

            Inputs:
            1. Original Text: The text to rewrite.
            2. Instructions: How to rewrite it.
            3. Context: (Optional) A reference document/policy to adhere to.

            Output:
            Return ONLY a valid JSON object (no markdown, no extra text) with:
            {
                "rewritten_text": "The new version of the text",
                "justification": "A brief explanation (1-2 sentences) of why changes were made, citing the Context if used."
            }`;

            let userContent = `Here is the user's selected text to rewrite:\n\n[SELECTED_TEXT]\n${text}\n[/SELECTED_TEXT]\n\nINSTRUCTIONS:\n${instructions}`;
            console.log("Generat Redlines Prompt Preview:", userContent.substring(0, 200));
            if (context) {
                userContent = `Reference Context:\n${context}\n\n` + userContent;
            }

            const messages = [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userContent }
            ];

            const response = await fetch(BACKEND_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ messages })
            });

            if (!response.ok) {
                throw new Error(`Backend error: ${response.statusText}`);
            }

            const data = await response.json();
            const content = data.response?.trim();

            if (!content) throw new Error("No response from AI");

            // Parse JSON response robustly
            let result;
            try {
                // Find first '{' and last '}'
                const firstOpen = content.indexOf('{');
                const lastClose = content.lastIndexOf('}');

                if (firstOpen !== -1 && lastClose !== -1 && lastClose > firstOpen) {
                    const jsonString = content.substring(firstOpen, lastClose + 1);
                    result = JSON.parse(jsonString);
                } else {
                    throw new Error("No JSON object found in response");
                }
            } catch (e) {
                console.error("Failed to parse JSON explanation", e);
                console.log("Raw content:", content);

                const fallbackTextMatch = content.match(/"rewritten_text":\s*"([^"]+)"/);
                const fallbackJustificationMatch = content.match(/"justification":\s*"([^"]+)"/);

                if (fallbackTextMatch) {
                    result = {
                        rewritten_text: fallbackTextMatch[1],
                        justification: fallbackJustificationMatch ? fallbackJustificationMatch[1] : "Edited based on instructions"
                    };
                } else {
                    result = {
                        rewritten_text: content.replace(/```json/g, '').replace(/```/g, '').trim(),
                        justification: "Edited based on instructions"
                    };
                }
            }

            return [
                {
                    original: text,
                    new: result.rewritten_text,
                    justification: result.justification
                }
            ];
        } catch (error: any) {
            console.error("Error generating redlines:", error);
            throw error;
        }
    },

    analyzeCompliance: async (documentText: string, searchContext: { policies: string[], regulations: string[] }): Promise<{ status: string, issues: any[], summary: string }> => {
        try {
            const systemPrompt = `You are a Regulatory Compliance Expert for Medical Devices (FDA/ISO).
            Analyze the provided document text against the supplied Policy and Regulatory context.
            
            Inputs:
            1. Document Text: The content to analyze.
            2. Policies: Internal company guidelines.
            3. Regulations: External FDA/MAUDE/ISO data.

            Output:
            Return ONLY a valid JSON object with:
            {
                "status": "COMPLIANT" | "NON_COMPLIANT" | "NEEDS_REVIEW",
                "summary": "High-level executive summary of findings.",
                "issues": [
                    {
                        "type": "POLICY_VIOLATION" | "REGULATORY_RISK" | "MISSING_CITATION",
                        "severity": "HIGH" | "MEDIUM" | "LOW",
                        "text": "The exact text segment causing the issue",
                        "description": "Explanation of why this is non-compliant",
                        "remediation": "Suggestion to fix it",
                        "citation": "Reference to specific Policy or Regulation (e.g., 'FNSB Policy Sec 4.1' or 'FDA K203456')"
                    }
                ]
            }`;

            const userContent = `DOCUMENT TEXT:\n${documentText.substring(0, 5000)}...\n\n` +
                `INTERNAL POLICIES:\n${searchContext.policies.join('\n\n')}\n\n` +
                `REGULATORY CONTEXT:\n${searchContext.regulations.join('\n\n')}`;

            const messages = [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userContent }
            ];

            const response = await fetch(BACKEND_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages })
            });

            if (!response.ok) throw new Error(`Backend error: ${response.statusText}`);

            const data = await response.json();
            const content = data.response?.trim();

            // Robust JSON parsing
            const firstOpen = content.indexOf('{');
            const lastClose = content.lastIndexOf('}');
            if (firstOpen !== -1 && lastClose !== -1) {
                return JSON.parse(content.substring(firstOpen, lastClose + 1));
            } else {
                return {
                    status: "NEEDS_REVIEW",
                    summary: "AI response format error. Please review manually.",
                    issues: []
                };
            }
        } catch (error: any) {
            console.error("Error analyzing compliance:", error);
            throw error;
        }
    }
};
