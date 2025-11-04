import { headers } from 'next/headers';
import { ChatBot } from '@/components/chatbot/chatbot';
import { getAppConfig } from '@/lib/utils';

export default async function ChatPage() {
  const hdrs = await headers();
  await getAppConfig(hdrs);

  return <ChatBot />;
}
