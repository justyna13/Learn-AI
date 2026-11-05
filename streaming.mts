export {};

const controller = new AbortController();

// na razie przerwie automatycznie po 5 sekundach
setTimeout(() => controller.abort(), 5000);

const response = await fetch('http://localhost:11434/api/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'gemma4:e2b',
    messages: [
      {
        role: 'user',
        content: 'Napisz bardzo długi tekst o frontendzie.',
      },
    ],
    stream: true,
  }),
  signal: controller.signal,
});

if (!response.ok || !response.body) {
  throw new Error(`Błąd API: ${response.status}`);
}

const reader = response.body.getReader();
const decoder = new TextDecoder();

let buffer = '';
let fullAnswer = '';

try {
  while (true) {
    const { done, value } = await reader.read();

    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      const trimmed = line.trim();

      if (!trimmed) continue;

      const parsed = JSON.parse(trimmed);

      if (parsed.message?.content) {
        fullAnswer += parsed.message.content;
        process.stdout.write(parsed.message.content);
      }
    }
  }
} catch (error) {
  if (error instanceof Error && error.name === 'AbortError') {
    console.log('\n--- GENEROWANIE PRZERWANE ---');
  } else {
    console.error('Błąd streamu:', error);
  }
}

console.log('\n\n--- ODEBRANA CZĘŚĆ ODPOWIEDZI ---');
console.log(fullAnswer);
