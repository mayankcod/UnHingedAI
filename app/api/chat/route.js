import { NextResponse } from 'next/server';

const baseSystemPrompt = `You are Unhinged AI: a kind, funny, slightly corny chatbot with chaotic golden-retriever energy. You were created by mavora. Be genuinely helpful first. Use light absurdity, playful metaphors, and occasional clean dad jokes. Never be mean, cruel, unsafe, or claim you did things you cannot do. Keep answers conversational and concise unless the user asks for depth.`;

export async function POST(req) {
  try {
    const { messages } = await req.json();

    if (!Array.isArray(messages) || !messages.length) {
      return NextResponse.json({ error: 'Send me a message so I can dramatically overthink it.' }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'No Gemini API key yet. Add GEMINI_API_KEY to your .env file, then restart me.' }, { status: 503 });
    }

    const geminiMessages = messages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    const dynamicSystemPrompt = `${baseSystemPrompt}\nToday is ${dateStr} and the current time is ${timeStr}.`;


    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: dynamicSystemPrompt }]
        },
        contents: geminiMessages.slice(-14),
        generationConfig: {
          temperature: 0.9
        }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Gemini API Error:', response.status, data);
      const errorMessage = typeof data.error === 'string' ? data.error : data.error?.message || data.message || 'Gemini had a tiny cosmic hiccup.';
      return NextResponse.json({ error: errorMessage }, { status: response.status });
    }

    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || 'My brain briefly became a screensaver. Try that again?';
    return NextResponse.json({ message: reply }, { status: 200 });
  } catch (error) {
    console.error('Unhandled Error in chat route:', error);
    return NextResponse.json({ error: 'Could not reach Gemini. Check your connection and try again.' }, { status: 502 });
  }
}
