const { AzureOpenAI } = require("openai");

// Initialize client with correct Azure configuration
const client = new AzureOpenAI({
    endpoint: process.env.AZURE_OPENAI_ENDPOINT,
    apiKey: process.env.AZURE_OPENAI_KEY,
    apiVersion: "2025-01-01-preview",
    deployment: process.env.AZURE_OPENAI_DEPLOYMENT_NAME || "gpt-4o-deployment"
});

const deployment = process.env.AZURE_OPENAI_DEPLOYMENT_NAME || "gpt-4o-deployment";

module.exports = async function (context, req) {
    context.log('Chat function triggered');
    context.log('Using deployment:', deployment);
    context.log('Endpoint:', process.env.AZURE_OPENAI_ENDPOINT);

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        context.res = {
            status: 200,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type"
            }
        };
        return;
    }

    try {
        const body = req.body;

        if (!body.messages || !Array.isArray(body.messages)) {
            context.res = {
                status: 400,
                body: { error: "Invalid request: messages array required" }
            };
            return;
        }

        const systemMessage = "You are a helpful AI assistant for Microsoft Word. " +
            "You help users redline documents, summarize content, and answer questions. " +
            (body.context ? `\n\nContext from Repository/Document:\n${body.context}` : "");

        const messages = [
            { role: "system", content: systemMessage },
            ...body.messages
        ];

        context.log('Calling OpenAI with', messages.length, 'messages');

        const response = await client.chat.completions.create({
            model: deployment,
            messages: messages,
        });

        context.log('Got response from OpenAI');

        context.res = {
            status: 200,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type"
            },
            body: {
                response: response.choices[0].message.content
            }
        };
    } catch (error) {
        context.log.error('Error calling OpenAI:', error);
        context.log.error('Error details:', JSON.stringify(error, null, 2));
        context.res = {
            status: 500,
            headers: {
                "Access-Control-Allow-Origin": "*"
            },
            body: { error: error.message }
        };
    }
};
