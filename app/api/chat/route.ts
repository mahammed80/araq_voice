import { NextRequest } from 'next/server';
import { Groq } from 'groq-sdk';
import { RAGStorage } from '@/lib/rag-storage';

// Note: Using Node.js runtime as Groq SDK requires Node.js APIs

// Default Arabic system prompt for Saudi customer support
const DEFAULT_ARABIC_SYSTEM_PROMPT = `Ø£Ù†Øª Ù…Ø³Ø§Ø¹Ø¯ Ø°ÙƒÙŠ Ù…ØªØ®ØµØµ ÙÙŠ Ø®Ø¯Ù…Ø© Ø¹Ù…Ù„Ø§Ø¡ Ø³Ø¹ÙˆØ¯ÙŠØ©. ÙŠØ¬Ø¨ Ø£Ù† ØªØ¬ÙŠØ¨ Ø¯Ø§Ø¦Ù…Ø§Ù‹ Ø¨Ø§Ù„Ø¹Ø±Ø¨ÙŠØ© Ø¨Ø·Ø±ÙŠÙ‚Ø© Ù…Ù‡Ø°Ø¨Ø© ÙˆØ§Ø­ØªØ±Ø§ÙÙŠØ©. Ø§Ø³ØªØ®Ø¯Ù… Ø§Ù„Ù„ØºØ© Ø§Ù„Ø¹Ø±Ø¨ÙŠØ© Ø§Ù„ÙØµØ­Ù‰ Ø£Ùˆ Ø§Ù„Ù„Ù‡Ø¬Ø© Ø§Ù„Ø³Ø¹ÙˆØ¯ÙŠØ© Ø­Ø³Ø¨ Ø§Ù„Ø³ÙŠØ§Ù‚. ÙƒÙ† Ù…ÙÙŠØ¯Ø§Ù‹ ÙˆØ¯Ù‚ÙŠÙ‚Ø§Ù‹ ÙˆÙ…ØªØ¹Ø§ÙˆÙ†Ø§Ù‹. Ø£Ø¬Ø¨ Ø¨Ù†Ø§Ø¡Ù‹ Ø¹Ù„Ù‰ Ø§Ù„Ù…Ø¹Ù„ÙˆÙ…Ø§Øª Ø§Ù„Ù…ØªÙˆÙØ±Ø© Ù…Ù† Ù‚Ø§Ø¹Ø¯Ø© Ø§Ù„Ù…Ø¹Ø±ÙØ© ÙÙ‚Ø·. Ø¥Ø°Ø§ Ù„Ù… ØªØ¬Ø¯ Ù…Ø¹Ù„ÙˆÙ…Ø§Øª Ø¯Ù‚ÙŠÙ‚Ø©ØŒ Ø£Ø®Ø¨Ø± Ø§Ù„Ø¹Ù…ÙŠÙ„ Ø¨Ø°Ù„Ùƒ Ø¨Ø£Ø¯Ø¨.`;

export async function POST(req: NextRequest) {
  try {
    // Get API key from environment variables only (no hardcoded fallback)
    const GROQ_API_KEY = process.env.GROQ_API_KEY;

    if (!GROQ_API_KEY) {
      console.error('GROQ_API_KEY is not defined in environment variables');
      return new Response(
        JSON.stringify({ error: 'GROQ_API_KEY environment variable is required' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const groq = new Groq({
      apiKey: GROQ_API_KEY,
    });

    const body = await req.json();
    const {
      messages,
      model = 'llama-3.1-8b-instant',
      temperature = 1,
      max_completion_tokens = 1024,
      top_p = 1,
      system_prompt,
      use_rag_data = true,
      stop = null,
    } = body;

    // Get RAG data if requested
    let ragDataContext = '';
    if (use_rag_data) {
      ragDataContext = RAGStorage.getFormattedDataForAgent();
    }

    // Build system prompt with RAG data
    let finalSystemPrompt = system_prompt || DEFAULT_ARABIC_SYSTEM_PROMPT;

    if (ragDataContext && ragDataContext.trim()) {
      finalSystemPrompt += `\n\nÙ…Ø¹Ù„ÙˆÙ…Ø§Øª Ø§Ù„Ø´Ø±ÙƒØ© Ù…Ù† Ù‚Ø§Ø¹Ø¯Ø© Ø§Ù„Ù…Ø¹Ø±ÙØ©:\n${ragDataContext}\n\nØ§Ø³ØªØ®Ø¯Ù… Ù‡Ø°Ù‡ Ø§Ù„Ù…Ø¹Ù„ÙˆÙ…Ø§Øª ÙÙ‚Ø· Ù„Ù„Ø¥Ø¬Ø§Ø¨Ø© Ø¹Ù„Ù‰ Ø£Ø³Ø¦Ù„Ø© Ø§Ù„Ø¹Ù…Ù„Ø§Ø¡. Ø¥Ø°Ø§ Ù„Ù… ØªØ¬Ø¯ Ø§Ù„Ø¥Ø¬Ø§Ø¨Ø© ÙÙŠ Ø§Ù„Ù…Ø¹Ù„ÙˆÙ…Ø§Øª Ø§Ù„Ù…ØªÙˆÙØ±Ø©ØŒ Ø£Ø®Ø¨Ø± Ø§Ù„Ø¹Ù…ÙŠÙ„ Ø¨Ø°Ù„Ùƒ.`;
    }

    // Prepare messages with system prompt
    const chatMessages = [{ role: 'system', content: finalSystemPrompt }, ...messages];

    // Create streaming chat completion
    const chatCompletion = await groq.chat.completions.create({
      messages: chatMessages,
      model,
      temperature: Number(temperature),
      max_completion_tokens: Number(max_completion_tokens),
      top_p: Number(top_p),
      stream: true,
      stop: stop || undefined,
    });

    // Create a readable stream
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of chatCompletion) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Groq API error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to process chat request',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
