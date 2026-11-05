'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Bot, LoaderCircle, Plus, Sparkles, Square } from 'lucide-react';

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

const suggestions = [
  'Wyjaśnij mi jeden trudny temat prostym językiem',
  'Pomóż rozbić pomysł na konkretne kroki',
  'Sprawdź ten fragment kodu i znajdź błąd',
];

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const conversationEndRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ block: 'end' });
  }, [messages]);

  function startNewChat() {
    controllerRef.current?.abort();
    controllerRef.current = null;
    setMessages([]);
    setDraft('');
    setError('');
    setIsStreaming(false);
    textareaRef.current?.focus();
  }

  function stopGenerating() {
    controllerRef.current?.abort();
  }

  async function sendMessage(text = draft) {
    const content = text.trim();
    if (!content || isStreaming) return;

    const nextMessages: Message[] = [...messages, { role: 'user', content }];
    const controller = new AbortController();
    controllerRef.current = controller;
    setMessages([...nextMessages, { role: 'assistant', content: '' }]);
    setDraft('');
    setError('');
    setIsStreaming(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: nextMessages }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const result = (await response.json()) as { error?: string };
        throw new Error(result.error ?? 'Nie udało się uzyskać odpowiedzi.');
      }

      if (!response.body) throw new Error('Brak strumienia odpowiedzi.');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      const appendChunk = (line: string) => {
        if (!line.trim()) return;
        const result = JSON.parse(line) as {
          message?: { content?: string };
        };
        const chunk = result.message?.content;
        if (!chunk) return;

        setMessages((current) => {
          const updated = [...current];
          const lastMessage = updated[updated.length - 1];
          if (lastMessage?.role === 'assistant') {
            updated[updated.length - 1] = { ...lastMessage, content: lastMessage.content + chunk };
          }
          return updated;
        });
      };

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';
          lines.forEach(appendChunk);
        }

        buffer += decoder.decode();
        appendChunk(buffer);
      } finally {
        reader.releaseLock();
      }
    } catch (caughtError) {
      if (caughtError instanceof Error && caughtError.name === 'AbortError') {
        setMessages((current) => {
          const updated = [...current];
          const lastMessage = updated[updated.length - 1];
          if (lastMessage?.role === 'assistant' && !lastMessage.content) {
            updated[updated.length - 1] = { ...lastMessage, content: 'Generowanie zatrzymane.' };
          }
          return updated;
        });
      } else {
        setError(caughtError instanceof Error ? caughtError.message : 'Wystąpił nieoczekiwany błąd.');
        setMessages((current) => current.filter((message) => message.role !== 'assistant' || message.content));
      }
    } finally {
      controllerRef.current = null;
      setIsStreaming(false);
      textareaRef.current?.focus();
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage();
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void sendMessage();
    }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Lokalnie, strona główna">
          <span className="brand-mark" aria-hidden="true"><span /><span /><span /><span /></span>
          <span>lokalnie</span>
        </a>
        <div className="topbar-right">
          <span className="model-status"><span className="status-dot" /> model lokalny</span>
          <button className="icon-button new-chat-button" onClick={startNewChat} title="Nowa rozmowa" aria-label="Nowa rozmowa">
            <Plus size={17} strokeWidth={2} />
            <span>Nowa rozmowa</span>
          </button>
        </div>
      </header>

      <section className={`chat-layout${messages.length ? ' has-messages' : ''}`}>
        {messages.length === 0 ? (
          <div className="welcome-view">
            <div className="welcome-orbit" aria-hidden="true">
              <div className="orbit-ring orbit-ring-outer" />
              <div className="orbit-ring orbit-ring-inner" />
              <div className="orbit-core"><Sparkles size={24} strokeWidth={1.6} /></div>
              <span className="orbit-dot orbit-dot-one" />
              <span className="orbit-dot orbit-dot-two" />
            </div>
            <p className="eyebrow">GEMMA 4 <span /> DZIAŁA LOKALNIE</p>
            <h1>Hej, co dziś<br /><em>rozgryziemy?</em></h1>
            <p className="welcome-copy">Od pierwszego pomysłu do działającego rozwiązania.</p>
            <div className="suggestions" aria-label="Propozycje tematów">
              {suggestions.map((suggestion, index) => (
                <button className="suggestion" key={suggestion} onClick={() => void sendMessage(suggestion)}>
                  <span className="suggestion-index">0{index + 1}</span>
                  <span>{suggestion}</span>
                  <ArrowDown className="suggestion-arrow" size={15} strokeWidth={1.7} />
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="conversation" role="log" aria-live="polite" aria-relevant="additions text">
            {messages.map((message, index) => (
              <article className={`message message-${message.role}`} key={`${index}-${message.role}`}>
                {message.role === 'assistant' ? (
                  <div className="assistant-mark" aria-hidden="true"><Bot size={17} strokeWidth={1.7} /></div>
                ) : null}
                <div className="message-content">
                  {message.role === 'assistant' ? <span className="message-label">ASYSTENT</span> : null}
                  {message.content ? (
                    <p>{message.content}</p>
                  ) : isStreaming && index === messages.length - 1 ? (
                    <span className="typing-indicator" aria-label="Asystent pisze">
                      <i /><i /><i />
                    </span>
                  ) : null}
                </div>
              </article>
            ))}
            <div ref={conversationEndRef} />
          </div>
        )}

        <div className="composer-wrap">
          {error ? <p className="error-message" role="alert">{error}</p> : null}
          <form className="composer" onSubmit={handleSubmit}>
            <textarea
              ref={textareaRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Napisz wiadomość..."
              aria-label="Wiadomość"
              rows={1}
              disabled={isStreaming}
            />
            <button
              className={`send-button${isStreaming ? ' is-stop' : ''}`}
              type={isStreaming ? 'button' : 'submit'}
              onClick={isStreaming ? stopGenerating : undefined}
              disabled={!isStreaming && !draft.trim()}
              title={isStreaming ? 'Zatrzymaj generowanie' : 'Wyślij wiadomość'}
              aria-label={isStreaming ? 'Zatrzymaj generowanie' : 'Wyślij wiadomość'}
            >
              {isStreaming ? <Square size={15} fill="currentColor" /> : <ArrowUp size={19} strokeWidth={2.2} />}
            </button>
          </form>
          <div className="composer-meta">
            <span>gemma4:e2b</span>
            <span className="meta-divider" />
            <span>Ollama <span className="status-dot status-dot-small" /></span>
          </div>
        </div>
      </section>
      {isStreaming ? <LoaderCircle className="streaming-indicator" size={15} aria-label="Trwa generowanie" /> : null}
    </main>
  );
}