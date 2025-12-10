import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ProcessingResult } from './types'; // Using partial ProcessingResult for return type

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

// Model name mapping: Ensuring exact match for Google AI Studio models
// But we keep the map structure if we want to alias something in future
const GEMINI_MODEL_MAP: Record<string, string> = {
  // 'gemini-pro': 'gemini-1.5-pro', // Example alias if needed
};

export async function translateContent(text: string, apiKey?: string, model: string = 'gpt-4-1106-preview'): Promise<{ translation: string, interpretation: string }> {
  // If no key provided, return mock data
  if (!apiKey) {
    console.warn("No API Key provided. Returning mock data.");
    return mockTranslation(text, model);
  }

  try {
    if (model.toLowerCase().includes('gemini')) {
      return await translateWithGemini(text, apiKey, model);
    } else {
      return await translateWithOpenAI(text, apiKey, model);
    }
  } catch (error: any) {
    console.error("Translation error:", error);
    // Preserve the original error message if it's already descriptive
    if (error.message && error.message.includes('Model') || error.message.includes('API') || error.message.includes('key')) {
      throw error;
    }
    throw new Error(`Translation failed with model ${model}: ${error.message || 'Unknown error'}`);
  }
}

async function translateWithOpenAI(text: string, apiKey: string, model: string): Promise<{ translation: string, interpretation: string }> {
  const openai = new OpenAI({ apiKey });

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

async function translateWithGemini(text: string, apiKey: string, model: string): Promise<{ translation: string, interpretation: string }> {
  const genAI = new GoogleGenerativeAI(apiKey.trim()); // Ensure no spaces
  
  // Use model name directly as per user request (trusted list)
  const modelName = model;
  
  try {
    // For full text generation, we don't force JSON mode anymore. Text mode is better for long form.
    const generativeModel = genAI.getGenerativeModel({ 
      model: modelName,
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
    
  } catch (error: any) {
    // Provide more detailed error information
    console.error("Gemini API Error Detail:", error);

    if (error.message?.includes('404') || error.message?.includes('not found')) {
      throw new Error(`Gemini API Error: Model "${modelName}" not found (404). Your key might not have access to this specific preview model yet.`);
    }
    if (error.message?.includes('400') || error.message?.includes('API key not valid')) {
      throw new Error(`Gemini API Key Error (400): The API Key is invalid. Please check for extra spaces or typo.`);
    }
    if (error.message?.includes('401') || error.message?.includes('403')) {
      throw new Error(`Gemini API Permission Error: ${error.message}. Check your API Key.`);
    }
    if (error.message?.includes('429')) {
      throw new Error("Rate limit exceeded. Please try again later.");
    }
    throw new Error(`Gemini API error: ${error.message || 'Unknown error'}`);
  }
}

function parseOutput(content: string): { translation: string, interpretation: string } {
    const translationMatch = content.match(/---TRANSLATION_START---([\s\S]*?)---TRANSLATION_END---/);
    const interpretationMatch = content.match(/---INTERPRETATION_START---([\s\S]*?)---INTERPRETATION_END---/);
    
    // Fallback if tags are missing (sometimes models forget exact tags)
    let translation = translationMatch ? translationMatch[1].trim() : "";
    let interpretation = interpretationMatch ? interpretationMatch[1].trim() : "";
    
    if (!translation && !interpretation) {
        // If rigid parsing fails, try to split by the Interpretation header
        const parts = content.split(/##\s*专业解读|##\s*Interpretation/i);
        if (parts.length > 1) {
            translation = parts[0].replace(/---TRANSLATION_START---/g, '').trim();
            interpretation = parts[1].replace(/---INTERPRETATION_END---/g, '').trim();
        } else {
            // Worst case: treat everything as translation
            translation = content;
        }
    }
    
    return { translation, interpretation };
}

function mockTranslation(text: string, model: string): { translation: string, interpretation: string } {
  return {
      translation: `[${model} 模拟全⽂翻译]\n\n这是对原文本的模拟翻译结果。在真实模式下，这里将显示完整、流畅的简体中文公文体翻译，保留段落结构。\n\n例如：\n本合同（以下简称“本合同”）由以下双方于...签署。`,
      interpretation: `[${model} 模拟专业解读]\n\n* **模拟术语1**: 解释...\n* **模拟术语2**: 解释...`
  };
}
