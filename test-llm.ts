export {};

// 1. Najpierw pierwsze żądanie
const response = await fetch('http://localhost:11434/api/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'gemma4:e2b',
    messages: [
      { role: 'system', content: 'Odpowiadaj zawsze po polsku' },
      { role: 'user', content: 'Powiedz mi, kim jesteś' },
    ],
    stream: false,
  }),
});

// 2. Dopiero teraz tworzysz zmienną data
const data = await response.json();

console.log(data.message.content);

// 3. Dopiero teraz możesz użyć data.message.content
const response2 = await fetch('http://localhost:11434/api/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'gemma4:e2b',
    messages: [
      { role: 'system', content: 'Odpowiadaj zawsze po polsku' },
      { role: 'user', content: 'Powiedz mi, kim jesteś' },
      {
        role: 'assistant',
        content: data.message.content,
      },
      {
        role: 'user',
        content: 'W jakim języku właśnie odpowiedziałeś?',
      },
    ],
    stream: false,
  }),
});

const data2 = await response2.json();

console.log(data2.message.content);
