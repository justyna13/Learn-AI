import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

const ollamaUrl = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434';
const model = process.env.OLLAMA_MODEL ?? 'gemma4:e2b';

export async function POST(request: Request) {
  let messages: ChatMessage[];

  try {
    const body = (await request.json()) as { messages?: ChatMessage[] };
    messages = body.messages ?? [];
  } catch {
    return NextResponse.json({ error: 'Nieprawidłowe dane żądania.' }, { status: 400 });
  }

  if (
    !Array.isArray(messages) ||
    messages.length === 0 ||
    messages.length > 40 ||
    messages.some(
      (message) =>
        !message ||
        !['user', 'assistant'].includes(message.role) ||
        typeof message.content !== 'string' ||
        message.content.length > 12000,
    )
  ) {
    return NextResponse.json({ error: 'Wiadomość jest nieprawidłowa lub zbyt długa.' }, { status: 400 });
  }

  try {
    const ollamaResponse = await fetch(`${ollamaUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: 'Jesteś pomocnym asystentem. Odpowiadaj po polsku.' },
          ...messages,
        ],
        stream: true,
      }),
      signal: request.signal,
    });

    if (!ollamaResponse.ok || !ollamaResponse.body) {
      return NextResponse.json(
        { error: `Ollama zwróciła błąd (${ollamaResponse.status}).` },
        { status: 502 },
      );
    }

    return new Response(ollamaResponse.body, {
      headers: {
        'Content-Type': 'application/x-ndjson; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch {
    return NextResponse.json(
      { error: 'Nie można połączyć się z Ollama. Sprawdź, czy działa lokalnie.' },
      { status: 502 },
    );
  }
}