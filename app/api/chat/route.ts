import { NextRequest } from 'next/server';
import { Groq } from 'groq-sdk';
import { RAGStorage } from '@/lib/rag-storage';

// Note: Using Node.js runtime as Groq SDK requires Node.js APIs
export const runtime = 'nodejs';

// Default Arabic system prompt for Saudi customer support
const DEFAULT_ARABIC_SYSTEM_PROMPT = `أنت مساعد ذكي متخصص في خدمة عملاء سعودية تعمل لصالح شركة عرق (AraQ).

عن الشركة:
الشركة التي أنت متصل بها هي عرق (AraQ)، وهي شركة تقنية رائدة في مجال تقنيات الذكاء الاصطناعي، وتتخصص في مجالات مساعدات الصوت والتحديثات الذكية للواجهات النصية في الهواتف وغيرها من التطبيقات. نحن نقدم حلول ذكاء اصطناعي متقدمة للعملاء في المملكة العربية السعودية.

تعليمات مهمة:
- يجب أن تجيب دائماً بالعربية بطريقة مهذبة واحترافية
- استخدم اللغة العربية الفصحى أو اللهجة السعودية حسب السياق
- كن مفيداً ودقيقاً ومتعاوناً
- أجب بناءً على المعلومات المتوفرة من قاعدة المعرفة فقط
- إذا لم تجد معلومات دقيقة، أخبر العميل بذلك بأدب
- إذا كان العميل يبحث عن خدمة محددة، اشرح له ما يمكنك تقديمه وساعده بأفضل ما لديك
- كن ودوداً ومهتماً بمساعدة العميل في حل مشكلته أو الإجابة على أسئلته
- إذا سألك العميل عن أي خدمة محددة، كن سعيداً لمساعدته وقدم له المعلومات المطلوبة`;

export async function POST(req: NextRequest) {
  try {
    // Get API key from environment variables only (no hardcoded fallback)
    const GROQ_API_KEY = process.env.GROQ_API_KEY?.trim();

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

    // Debug: Log API key status (first 10 chars only for security)
    console.log('GROQ_API_KEY loaded:', GROQ_API_KEY.substring(0, 10) + '...', 'Length:', GROQ_API_KEY.length);

    const groq = new Groq({
      apiKey: GROQ_API_KEY,
    });

    // Parse request body with error handling
    let body;
    try {
      body = await req.json();
    } catch (parseError) {
      console.error('Error parsing request body:', parseError);
      return new Response(
        JSON.stringify({ error: 'Invalid request body. Expected JSON.' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate required fields
    if (!body.messages || !Array.isArray(body.messages)) {
      return new Response(
        JSON.stringify({ error: 'Invalid request: messages array is required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

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

    // Get RAG data using vector-based retrieval if requested
    let ragDataContext = '';
    if (use_rag_data) {
      try {
        // Get the user's question from the last message
        const userMessage = messages[messages.length - 1];
        const userQuery = userMessage?.content || '';
        
        // Use vector-based retrieval to get relevant context
        ragDataContext = await RAGStorage.getRelevantContext(userQuery, 4);
        
        const allEntries = RAGStorage.getAllEntries();
        console.log(`🔍 Vector RAG system: ${allEntries.length} total entries in storage`);
        
        if (ragDataContext) {
          const chunkCount = ragDataContext.split('\n\n---\n\n').length;
          console.log(`✅ Relevant context retrieved: ${ragDataContext.length} characters, ${chunkCount} relevant chunks`);
          console.log('📋 Context preview:', ragDataContext.substring(0, 300));
        } else {
          console.warn('⚠️ No relevant context found for query:', userQuery);
          // Fallback to all entries if no relevant context found
          ragDataContext = RAGStorage.getFormattedDataForAgent();
          if (ragDataContext) {
            console.log('📄 Using fallback: all entries');
          } else {
            console.log('Available entries:', allEntries.map(e => ({ id: e.id, title: e.title, category: e.category })));
          }
        }
      } catch (ragError) {
        console.error('❌ Error in vector RAG retrieval:', ragError);
        // Fallback to simple retrieval
        try {
          ragDataContext = RAGStorage.getFormattedDataForAgent();
          console.log('📄 Fallback to simple RAG retrieval');
        } catch (fallbackError) {
          console.error('❌ Fallback also failed:', fallbackError);
          ragDataContext = '';
        }
      }
    } else {
      console.log('RAG data disabled by user setting');
    }

    // Build system prompt with RAG data
    let finalSystemPrompt = system_prompt || DEFAULT_ARABIC_SYSTEM_PROMPT;

    if (ragDataContext && ragDataContext.trim()) {
      finalSystemPrompt += `\n\n═══════════════════════════════════════════════════════════
معلومات الشركة من قاعدة المعرفة (يجب استخدامها للإجابة)
═══════════════════════════════════════════════════════════

${ragDataContext}

═══════════════════════════════════════════════════════════
تعليمات إلزامية لاستخدام قاعدة المعرفة:
═══════════════════════════════════════════════════════════

1. **يجب إلزامياً** استخدام المعلومات المذكورة أعلاه من قاعدة المعرفة عند الإجابة على أي سؤال عن:
   - المنتجات والخدمات
   - الأسعار
   - معلومات الشركة
   - أي تفاصيل عن عرق (AraQ)

2. **ممنوع منعاً باتاً**:
   - اختراع معلومات غير موجودة في قاعدة المعرفة
   - استخدام معلومات عامة بدلاً من المعلومات المحددة في قاعدة المعرفة
   - الإجابة بناءً على معرفتك العامة فقط

3. **إذا لم تجد المعلومات في قاعدة المعرفة**:
   قل بوضوح: "أعتذر، لا تتوفر لدي هذه المعلومات المحددة حالياً في قاعدة المعرفة. يرجى التواصل معنا مباشرة للحصول على التفاصيل الدقيقة."

4. **كن دقيقاً**: انقل المعلومات من قاعدة المعرفة بدقة كما هي، مع الحفاظ على الأرقام والأسعار والتفاصيل المذكورة.

5. **أولوية المعلومات**: قاعدة المعرفة أعلاه لها الأولوية الكاملة على أي معلومات عامة قد تعرفها.

═══════════════════════════════════════════════════════════`;
      console.log('✅ RAG data included in system prompt:', ragDataContext.length, 'characters');
      console.log('📋 RAG data preview:', ragDataContext.substring(0, 300));
    } else {
      console.warn('⚠️ No RAG data available or empty - responses will not use company knowledge base');
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
    
    // Provide more detailed error information
    let errorMessage = 'Failed to process chat request';
    if (error instanceof Error) {
      errorMessage = error.message;
      // Log full error details for debugging
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
      });
    }
    
    return new Response(
      JSON.stringify({
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' 
          ? (error instanceof Error ? error.stack : String(error))
          : undefined,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
