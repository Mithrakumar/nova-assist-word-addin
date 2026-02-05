const { app } = require("@azure/functions");
const { AzureOpenAI } = require("openai");

const client = new AzureOpenAI({
    endpoint: process.env.AZURE_OPENAI_ENDPOINT,
    apiKey: process.env.AZURE_OPENAI_KEY,
    apiVersion: "2024-05-01-preview"
});

const deployment = process.env.AZURE_OPENAI_DEPLOYMENT_NAME || "gpt-4o-prod";

app.http('chat', {
    methods: ['POST', 'OPTIONS'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        context.log('Chat function triggered');

        // Handle CORS preflight
        if (request.method === 'OPTIONS') {
            return {
                status: 200,
                headers: {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "POST, OPTIONS",
                    "Access-Control-Allow-Headers": "Content-Type"
                }
            };
        }

        try {
            const body = await request.json();

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
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "POST, OPTIONS",
                    "Access-Control-Allow-Headers": "Content-Type"
                },
                jsonBody: {
                    response: response.choices[0].message.content
                }
            };
        } catch (error) {
            context.error('Error calling OpenAI:', error);
            return {
                status: 500,
                headers: {
                    "Access-Control-Allow-Origin": "*"
                },
                jsonBody: { error: error.message }
            };
        }
    }
});
