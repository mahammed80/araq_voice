import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ChatEntryProps extends React.HTMLAttributes<HTMLLIElement> {
  /** The locale to use for the timestamp. */
  locale: string;
  /** The timestamp of the message. */
  timestamp: number;
  /** The message to display. */
  message: string;
  /** The origin of the message. */
  messageOrigin: 'local' | 'remote';
  /** The sender's name. */
  name?: string;
  /** Whether the message has been edited. */
  hasBeenEdited?: boolean;
  /** Whether the message is from an agent. */
  isAgent?: boolean;
}

export const ChatEntry = ({
  name,
  locale,
  timestamp,
  message,
  messageOrigin,
  hasBeenEdited = false,
  isAgent = false,
  className,
  ...props
}: ChatEntryProps) => {
  const time = new Date(timestamp);
  const title = time.toLocaleTimeString(locale, { timeStyle: 'full' });

  // Determine display name based on agent status or provided name
  const displayName = name || (isAgent ? 'Agent' : messageOrigin === 'local' ? 'You' : 'User');

  return (
    <li
      title={title}
      data-lk-message-origin={messageOrigin}
      data-lk-is-agent={isAgent}
      className={cn('group flex w-full flex-col gap-0.5', className)}
      {...props}
    >
      <header
        className={cn(
          'text-muted-foreground flex items-center gap-2 text-sm',
          messageOrigin === 'local' ? 'flex-row-reverse' : 'text-left'
        )}
      >
        <strong>{displayName}</strong>
        <span className="font-mono text-xs opacity-0 transition-opacity ease-linear group-hover:opacity-100">
          {hasBeenEdited && '*'}
          {time.toLocaleTimeString(locale, { timeStyle: 'short' })}
        </span>
      </header>
      <span
        className={cn(
          'max-w-4/5 rounded-[20px] p-2',
          messageOrigin === 'local'
            ? 'bg-muted ml-auto'
            : isAgent
              ? 'border-primary/20 mr-auto border bg-primary/10'
              : 'bg-muted mr-auto'
        )}
      >
        {message}
      </span>
    </li>
  );
};
