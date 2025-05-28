import { GoogleGenAI } from '@google/genai';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

export const sendGemini = async (messages, userId, max = 100, temp = 1) => {
  try {
    console.log('Ask Gemini >>>');
    messages.forEach((m) =>
      console.log(` - ${m.role.toUpperCase()}: ${m.content}`)
    );

    // Usually: { author: "user" | "system" | "assistant", content: string }
    const contents = messages.map((m) => ({
      author: m.role,
      content: m.content,
    }));

    const response = await ai.models.generateMessage({
      model: 'gemini-2.0-flash-001',
      messages: contents,
      temperature: temp,
      maxOutputTokens: max,
    });

    const answer = response.candidates?.[0]?.message?.content || '';
    console.log('>>> ' + answer);
    console.log('\n');
    return answer;
  } catch (e) {
    console.error('Gemini Error:', e);
    return null;
  }
};