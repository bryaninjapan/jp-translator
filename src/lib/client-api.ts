import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';

const SYSTEM_PROMPT = `
You are an expert legal translator and interpreter specializing in Japanese to Simplified Chinese translation.
Your task is to provide a comprehensive, high-precision translation of the entire provided text, followed by a professional interpretation of key terms and nuances.

**CORE REQUIREMENTS:**

1.  **Full Text Translation (整体翻译)**:
    *   Translate the entire text fluently into formal, written Simplified Chinese (公文体).
    *   Maintain the original structure (paragraphs, bullet points) as much as possible using Markdown.
    *   Do NOT split the text into arbitrary segments; keep the flow natural and professional.
    *   Handle terms like '別途定める' (另行规定), '甲の責任において' (由甲方负责), '準拠する' (依据/遵循), '鑑み' (鉴于) accurately.

2.  **Professional Interpretation (专业解读)**:
    *   After the translation, provide a separate section titled "## 专业解读与术语辨析".
    *   Select key legal/professional terms, ambiguous phrases, or complex clauses from the source text.
    *   Explain their specific legal meaning, binding effects, or why a specific Chinese term was chosen.
    *   Format this section clearly with bullet points.

**OUTPUT FORMAT:**

The output must be strictly in the following Markdown format:

---TRANSLATION_START---
(Place the full Simplified Chinese translation here...)
---TRANSLATION_END---

---INTERPRETATION_START---
(Place the detailed interpretation and glossary here...)
---INTERPRETATION_END---
`;

function parseOutput(content: string): { translation: string, interpretation: string } {
    const translationMatch = content.match(/---TRANSLATION_START---([\s\S]*?)---TRANSLATION_END---/);
    const interpretationMatch = content.match(/---INTERPRETATION_START---([\s\S]*?)---INTERPRETATION_END---/);
    
    let translation = translationMatch ? translationMatch[1].trim() : "";
    let interpretation = interpretationMatch ? interpretationMatch[1].trim() : "";
    
    if (!translation && !interpretation) {
        const parts = content.split(/##\s*专业解读|##\s*Interpretation/i);
        if (parts.length > 1) {
            translation = parts[0].replace(/---TRANSLATION_START---/g, '').trim();
            interpretation = parts[1].replace(/---INTERPRETATION_END---/g, '').trim();
        } else {
            translation = content;
        }
    }
    
    return { translation, interpretation };
}

export async function translateContentClient(text: string, apiKey: string, model: string): Promise<{ translation: string, interpretation: string }> {
  if (model.toLowerCase().includes('gemini')) {
    return await translateWithGeminiClient(text, apiKey, model);
  } else {
    return await translateWithOpenAIClient(text, apiKey, model);
  }
}

async function translateWithGeminiClient(text: string, apiKey: string, model: string): Promise<{ translation: string, interpretation: string }> {
  const genAI = new GoogleGenerativeAI(apiKey.trim());
  const generativeModel = genAI.getGenerativeModel({ 
    model: model,
    generationConfig: { 
      temperature: 0.1,
    }
  });

  const prompt = `${SYSTEM_PROMPT}\n\nTranslate and interpret the following text:\n\n${text}`;
  const result = await generativeModel.generateContent(prompt);
  const response = await result.response;
  const textResponse = response.text();
  
  if (!textResponse) {
    throw new Error("No response text from Gemini API");
  }

  return parseOutput(textResponse);
}

async function translateWithOpenAIClient(text: string, apiKey: string, model: string): Promise<{ translation: string, interpretation: string }> {
  const openai = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
  
  const response = await openai.chat.completions.create({
    model: model,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: `Translate and interpret the following text:\n\n${text}` }
    ],
    temperature: 0.1,
  });

  const content = response.choices[0].message.content;
  if (!content) throw new Error("No content received from OpenAI");

  return parseOutput(content);
}

export async function testConnectionClient(apiKey: string, provider: string, model: string): Promise<{ success: boolean, message: string }> {
  try {
    if (provider === 'google') {
      const genAI = new GoogleGenerativeAI(apiKey.trim());
      const generativeModel = genAI.getGenerativeModel({ model: model || "gemini-1.5-flash" });
      const result = await generativeModel.generateContent("Hello");
      const response = await result.response;
      const text = response.text();
      return { success: true, message: 'Gemini API Connected!' };
    } else if (provider === 'openai') {
      const openai = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
      await openai.models.list();
      return { success: true, message: 'OpenAI API Connected!' };
    }
    return { success: false, message: 'Unknown provider' };
  } catch (error: any) {
    if (error.message?.includes('404') || error.message?.includes('not found')) {
      return { success: false, message: 'Connection Failed: Model not found (404).' };
    }
    if (error.message?.includes('401') || error.message?.includes('403') || error.message?.includes('API key not valid')) {
      return { success: false, message: 'Connection Failed: Invalid Key or Permission Denied.' };
    }
    return { success: false, message: `Connection Failed: ${error.message || 'Unknown error'}` };
  }
}

