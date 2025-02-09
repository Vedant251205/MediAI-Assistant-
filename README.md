# MediAI-Assistant-
# Medical Chatbot API Documentation

## Overview
This API provides a medical chatbot service using Hugging Face's inference API. The chatbot assists users with initial consultations by asking relevant medical questions and providing general guidance.

## Prerequisites
1. Install *Node.js* and *npm*.
2. Create a .env file and add:
   env
   HUGGING_FACE_TOKEN=your_hf_token_here
   PORT=3000
   
3. Install dependencies:
   sh
   npm install
   
4. Start the server:
   sh
   node index.js
   

## API Endpoints

### 1. *Stream Chat Messages*
   - *Endpoint:* /api/chat/stream
   - *Method:* POST
   - *Description:* Streams chatbot responses based on user messages.
   - *Request Body:*
     json
     {
       "message": "What are the symptoms of flu?",
       "sessionId": "12345"
     }
     
   - *Response Format:* (Server-Sent Events - SSE)
     json
     data: { "content": "Flu symptoms include fever, cough, sore throat, and fatigue.", "type": "chunk" }
     data: { "type": "done" }
     
   - *Errors:*
     json
     data: { "error": "sessionId is required", "type": "error" }
     

### 2. *Clear Chat History*
   - *Endpoint:* /api/chat/clear
   - *Method:* POST
   - *Description:* Clears chat history for a given session.
   - *Request Body:*
     json
     {
       "sessionId": "12345"
     }
     
   - *Response:*
     json
     { "status": "success", "message": "Chat history cleared" }
     

### 3. *Health Check*
   - *Endpoint:* /health
   - *Method:* GET
   - *Description:* Checks if the server is running.
   - *Response:*
     json
     { "status": "healthy" }
     

## Technologies Used
- *Express.js* for backend
- *Hugging Face Inference API* for AI processing
- *CORS & Body-Parser* for request handling
- *dotenv* for environment variable management

## Error Handling
- **Missing sessionId** → Returns 400 with error message.
- *Invalid Hugging Face Token* → Logs error and stops the server.
- *Stream errors* → Returns error message within SSE response.

## Notes
- The chatbot *does not provide medical diagnoses*—it only gives general guidance.
- Chat history is stored per session but is limited to the last 10 exchanges.
