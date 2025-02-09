const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { HfInference } = require('@huggingface/inference');
require('dotenv').config();
if (!process.env.HUGGING_FACE_TOKEN) {
    console.error('HUGGING_FACE_TOKEN is required in .env file');
    process.exit(1);
}

const app = express();
app.use(cors());
app.use(bodyParser.json());
const client = new HfInference(process.env.HUGGING_FACE_TOKEN);
const chatHistories = new Map();

function getChatHistory(sessionId) {
    if (!chatHistories.has(sessionId)) {
        chatHistories.set(sessionId, [
            {
                role: "system",
                content: `You are an AI medical assistant conducting an initial consultation. Follow these steps:

1. Ask relevant questions about symptoms (one at a time):
   - Location, duration, and severity of symptoms
   - What makes it better or worse
   - Associated symptoms
   - Previous treatments tried
   - Medical history if relevant

2. After gathering sufficient information (usually 3-4 key questions), provide:
   - A brief assessment of the situation
   - Suggested home care measures or over-the-counter treatments if appropriate
   - Clear instructions about when to seek professional medical care

3. ALWAYS include one of these recommendations:
   For mild conditions:
   - Specific self-care steps
   - Over-the-counter treatment suggestions
   - Lifestyle modifications if relevant
   
   For moderate conditions:
   - "Based on your symptoms, I recommend scheduling an appointment with your primary care physician within [timeframe]."
   
   For potentially serious conditions:
   - "Given these symptoms, you should seek immediate medical attention at the nearest emergency room or urgent care facility."

4. End with: "Remember, this is an AI assistant providing general information. Always consult with a healthcare provider for proper diagnosis and treatment."

Keep responses concise and professional. Ask follow-up questions only if essential information is missing.`
            }
        ]);
    }
    return chatHistories.get(sessionId);
}

app.post('/api/chat/stream', async (req, res) => {
    try {
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
        });

        const { message, sessionId } = req.body;

        if (!sessionId) {
            throw new Error('sessionId is required');
        }

        const chatHistory = getChatHistory(sessionId);
        chatHistory.push({
            role: "user",
            content: message
        });

        const stream = client.chatCompletionStream({
            model: "meta-llama/Llama-3.2-3B-Instruct",
            messages: chatHistory,
            temperature: 0.5,
            max_tokens: 2048,
            top_p: 0.7
        });

        let assistantResponse = '';
        for await (const chunk of stream) {
            if (chunk.choices && chunk.choices.length > 0) {
                const newContent = chunk.choices[0].delta.content;
                if (newContent) {
                    assistantResponse += newContent;
                    res.write(`data: ${JSON.stringify({
                        content: newContent,
                        type: 'chunk'
                    })}\n\n`);
                }
            }
        }

        chatHistory.push({
            role: "assistant",
            content: assistantResponse
        });

        // Limit history size
        if (chatHistory.length > 10) {
            const systemMessage = chatHistory[0];
            chatHistory.splice(1, chatHistory.length - 9);
            chatHistory.unshift(systemMessage);
        }

        res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
        res.end();

    } catch (error) {
        console.error('Error:', error);
        res.write(`data: ${JSON.stringify({
            error: 'An error occurred while processing your request.',
            details: error.message,
            type: 'error'
        })}\n\n`);
        res.end();
    }
});

app.post('/api/chat/clear', (req, res) => {
    const { sessionId } = req.body;
    if (sessionId) {
        chatHistories.delete(sessionId);
        res.json({ status: 'success', message: 'Chat history cleared' });
    } else {
        res.status(400).json({ status: 'error', message: 'sessionId is required' });
    }
});

app.get('/health', (req, res) => {
    res.json({ status: 'healthy' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});