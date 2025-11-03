import { headers } from 'next/headers';
import { getAppConfig } from '@/lib/utils';
import { ChatBot } from '@/components/chatbot/chatbot';

export default async function ChatPage() {
  const hdrs = await headers();
  await getAppConfig(hdrs);

  return <ChatBot />;
}

