import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';

export async function POST(req: NextRequest) {
  try {
    const { apiKey, provider, model: selectedModel } = await req.json();

    if (!apiKey) {
      return NextResponse.json({ success: false, message: 'API Key is missing' }, { status: 400 });
    }

    if (provider === 'google') {
      const genAI = new GoogleGenerativeAI(apiKey.trim());
      // Use the selected model for testing, fallback to 1.5-flash only if not provided
      // This ensures if the user has a special key that only works with specific models (e.g. 2.5/3.0), it works.
      const modelName = selectedModel || "gemini-1.5-flash";
      const model = genAI.getGenerativeModel({ model: modelName });
      
      try {
        const result = await model.generateContent("Hello");
        const response = await result.response;
        const text = response.text();
        return NextResponse.json({ success: true, message: 'Gemini API Connected!', detail: `Response: ${text.substring(0, 10)}...` });
      } catch (geminiError: any) {
         // Check specific error types
         if (geminiError.message?.includes('404')) {
             return NextResponse.json({ success: false, message: 'Connection Failed: Model not found (404). Key might be valid but lacks "Generative Language API" access.' }, { status: 400 });
         }
         if (geminiError.message?.includes('403') || geminiError.message?.includes('401')) {
             return NextResponse.json({ success: false, message: 'Connection Failed: Invalid Key or Permission Denied (403/401).' }, { status: 400 });
         }
         throw geminiError;
      }

    } else if (provider === 'openai') {
      const openai = new OpenAI({ apiKey });
      await openai.models.list(); // Simple list models call to verify key
      return NextResponse.json({ success: true, message: 'OpenAI API Connected!' });
    }

    return NextResponse.json({ success: false, message: 'Unknown provider' }, { status: 400 });

  } catch (error: any) {
    console.error('Test API Error:', error);
    return NextResponse.json({ 
      success: false, 
      message: `Connection Failed: ${error.message || 'Unknown error'}` 
    }, { status: 500 });
  }
}

