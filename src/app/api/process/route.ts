import { NextRequest, NextResponse } from 'next/server';
import { translateContent } from '@/lib/translator';

export async function POST(req: NextRequest) {
  try {
    const { text, apiKey, model } = await req.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Text content is required' }, { status: 400 });
    }

    if (text.trim().length === 0) {
        return NextResponse.json({ error: 'Text content cannot be empty' }, { status: 400 });
    }

    // Limit text length to avoid token limits or timeouts (rough estimate)
    // Increased limit slightly as full text models handle large context well
    const MAX_CHARS = 35000;
    if (text.length > MAX_CHARS) {
        return NextResponse.json({ error: `Text too long. Please limit to ${MAX_CHARS} characters.` }, { status: 400 });
    }

    // Translate
    const { translation, interpretation } = await translateContent(text, apiKey, model);

    return NextResponse.json({
      originalText: text,
      translation,
      interpretation
    });

  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ 
      error: error.message || 'Internal Server Error' 
    }, { status: 500 });
  }
}
