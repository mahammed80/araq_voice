import fs from 'fs';
import path from 'path';

const SYSTEM_PROMPTS_FILE = path.join(process.cwd(), '.system-prompts.json');

export interface SystemPrompt {
  id: string;
  name: string;
  description: string;
  prompt: string;
  type: 'chat' | 'whatsapp' | 'general';
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

const DEFAULT_SYSTEM_PROMPTS: SystemPrompt[] = [
  {
    id: 'default-chat',
    name: 'Default Chat Prompt',
    description: 'Default system prompt for chat conversations',
    prompt: `أنت مساعد ذكي متخصص في خدمة عملاء سعودية تعمل لصالح شركة عرق (AraQ).

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
- إذا سألك العميل عن أي خدمة محددة، كن سعيداً لمساعدته وقدم له المعلومات المطلوبة`,
    type: 'chat',
    isDefault: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'default-whatsapp',
    name: 'Default WhatsApp Prompt',
    description: 'Default system prompt for WhatsApp conversations',
    prompt: `أنت مساعد ذكي متخصص في خدمة عملاء سعودية تعمل لصالح شركة عرق (AraQ).

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
- إذا سألك العميل عن أي خدمة محددة، كن سعيداً لمساعدته وقدم له المعلومات المطلوبة`,
    type: 'whatsapp',
    isDefault: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

class SystemPromptsStorage {
  private prompts: SystemPrompt[] = [];

  constructor() {
    this.loadPrompts();
  }

  private loadPrompts(): void {
    try {
      if (fs.existsSync(SYSTEM_PROMPTS_FILE)) {
        const data = fs.readFileSync(SYSTEM_PROMPTS_FILE, 'utf-8');
        this.prompts = JSON.parse(data);
      } else {
        // Initialize with default prompts
        this.prompts = DEFAULT_SYSTEM_PROMPTS;
        this.savePrompts();
      }
    } catch (error) {
      console.error('Error loading system prompts:', error);
      this.prompts = DEFAULT_SYSTEM_PROMPTS;
    }
  }

  private savePrompts(): void {
    try {
      fs.writeFileSync(SYSTEM_PROMPTS_FILE, JSON.stringify(this.prompts, null, 2), 'utf-8');
    } catch (error) {
      console.error('Error saving system prompts:', error);
      throw error;
    }
  }

  getAllPrompts(): SystemPrompt[] {
    return [...this.prompts];
  }

  getPromptById(id: string): SystemPrompt | undefined {
    return this.prompts.find((p) => p.id === id);
  }

  getPromptsByType(type: 'chat' | 'whatsapp' | 'general'): SystemPrompt[] {
    return this.prompts.filter((p) => p.type === type);
  }

  getDefaultPrompt(type: 'chat' | 'whatsapp' | 'general'): SystemPrompt | undefined {
    return this.prompts.find((p) => p.type === type && p.isDefault);
  }

  createPrompt(prompt: Omit<SystemPrompt, 'id' | 'createdAt' | 'updatedAt'>): SystemPrompt {
    const newPrompt: SystemPrompt = {
      ...prompt,
      id: `prompt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // If this is set as default, unset other defaults of the same type
    if (newPrompt.isDefault) {
      this.prompts.forEach((p) => {
        if (p.type === newPrompt.type && p.id !== newPrompt.id) {
          p.isDefault = false;
        }
      });
    }

    this.prompts.push(newPrompt);
    this.savePrompts();
    return newPrompt;
  }

  updatePrompt(id: string, updates: Partial<Omit<SystemPrompt, 'id' | 'createdAt'>>): SystemPrompt {
    const index = this.prompts.findIndex((p) => p.id === id);
    if (index === -1) {
      throw new Error(`Prompt with id ${id} not found`);
    }

    const updatedPrompt: SystemPrompt = {
      ...this.prompts[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    // If this is set as default, unset other defaults of the same type
    if (updates.isDefault === true) {
      this.prompts.forEach((p) => {
        if (p.type === updatedPrompt.type && p.id !== updatedPrompt.id) {
          p.isDefault = false;
        }
      });
    }

    this.prompts[index] = updatedPrompt;
    this.savePrompts();
    return updatedPrompt;
  }

  deletePrompt(id: string): boolean {
    const index = this.prompts.findIndex((p) => p.id === id);
    if (index === -1) {
      return false;
    }

    // Don't allow deleting default prompts
    if (this.prompts[index].isDefault) {
      throw new Error('Cannot delete default prompt');
    }

    this.prompts.splice(index, 1);
    this.savePrompts();
    return true;
  }

  setDefaultPrompt(id: string): SystemPrompt {
    const prompt = this.getPromptById(id);
    if (!prompt) {
      throw new Error(`Prompt with id ${id} not found`);
    }

    // Unset other defaults of the same type
    this.prompts.forEach((p) => {
      if (p.type === prompt.type && p.id !== id) {
        p.isDefault = false;
      }
    });

    prompt.isDefault = true;
    prompt.updatedAt = new Date().toISOString();
    this.savePrompts();
    return prompt;
  }
}

// Singleton instance
export const systemPromptsStorage = new SystemPromptsStorage();

