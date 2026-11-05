import readline from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

type Message = {
    role: 'system' | 'user' | 'assistant';
    content: string;
};

const messages: Message[] = [
    {
      role: 'system',
      content: 'Jesteś pomocnym asystentem frontendowym. Odpowiadaj po polsku.',
    }
];

const rl  = readline.createInterface({
    input: stdin,
    output: stdout,
});

console.log('Napisz pytanie. Wpisz "exit", aby zakończyć.\n');

while (true) {
    const question = await rl.question('> ');

    if (question.trim().toLowerCase() === 'exit') {
        break;
    }

    messages.push({
        role: 'user',
        content: question,
    });

    const response = await fetch('http://localhost:11434/api/chat', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: 'gemma4:e2b',
            messages,
            stream: true,
        }),
    });

    if (!response.ok || !response.body) {
        console.error(`Błąd API: ${response.status}`);
        continue;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    let buffer = '';
    let fullAnswer = '';

    process.stdout.write('AI: ');

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

    console.log('\n');
    messages.push({
        role: 'assistant',
        content: fullAnswer,
    });
}

rl.close();
console.log('Koniec rozmowy. Dziękuję za skorzystanie z mini-chat.');