import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { AzureOpenAI } from "openai";

const client = new AzureOpenAI({
    endpoint: process.env.AZURE_OPENAI_ENDPOINT,
    apiKey: process.env.AZURE_OPENAI_KEY,
    apiVersion: "2024-05-01-preview"
});

const deployment = process.env.AZURE_OPENAI_DEPLOYMENT_NAME || "gpt-4o-prod";

export async function chat(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log('Chat function triggered');

    try {
        const body = await request.json() as { messages: any[], context?: string };

        if (!body.messages || !Array.isArray(body.messages)) {
            return {
                status: 400,
                jsonBody: { error: "Invalid request: messages array required" }
            };
        }

        const systemMessage = "You are a helpful AI assistant for Microsoft Word. " +
            "You help users redline documents, summarize content, and answer questions. " +
            (body.context ? `\n\nContext from Repository/Document:\n${body.context}` : "");

        const messages = [
            { role: "system", content: systemMessage },
            ...body.messages
        ];

        const response = await client.chat.completions.create({
            model: deployment,
            messages: messages,
        });

        return {
            status: 200,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*", // For development; restrict in production
                "Access-Control-Allow-Methods": "POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type"
            },
            jsonBody: {
                response: response.choices[0].message.content
            }
        };
    } catch (error: any) {
        context.error('Error calling OpenAI:', error);
        return {
            status: 500,
            jsonBody: { error: error.message }
        };
    }
}

app.http('chat', {
    methods: ['POST', 'OPTIONS'],
    authLevel: 'anonymous',
    handler: chat
});
