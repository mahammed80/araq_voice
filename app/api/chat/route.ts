import { NextRequest } from 'next/server';
import { Groq } from 'groq-sdk';
import { RAGStorage } from '@/lib/rag-storage';

// Get API key from environment variables only (no hardcoded fallback)
const GROQ_API_KEY = process.env.GROQ_API_KEY;

if (!GROQ_API_KEY) {
  console.error('GROQ_API_KEY is not defined in environment variables');
  throw new Error('GROQ_API_KEY environment variable is required');
}

const groq = new Groq({
  apiKey: GROQ_API_KEY,
});

// Note: Using Node.js runtime as Groq SDK requires Node.js APIs

// Default Arabic system prompt for Saudi customer support
const DEFAULT_ARABIC_SYSTEM_PROMPT = `أنت مساعد ذكي متخصص في خدمة عملاء سعودية. يجب أن تجيب دائماً بالعربية بطريقة مهذبة واحترافية. استخدم اللغة العربية الفصحى أو اللهجة السعودية حسب السياق. كن مفيداً ودقيقاً ومتعاوناً. أجب بناءً على المعلومات المتوفرة من قاعدة المعرفة فقط. إذا لم تجد معلومات دقيقة، أخبر العميل بذلك بأدب.`;

export async function POST(req: NextRequest) {
  try {
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
      finalSystemPrompt += `\n\nمعلومات الشركة من قاعدة المعرفة:\n${ragDataContext}\n\nاستخدم هذه المعلومات فقط للإجابة على أسئلة العملاء. إذا لم تجد الإجابة في المعلومات المتوفرة، أخبر العميل بذلك.`;
    }

    // Prepare messages with system prompt
    const chatMessages = [
      { role: 'system', content: finalSystemPrompt },
      ...messages,
    ];

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
        'Connection': 'keep-alive',
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

