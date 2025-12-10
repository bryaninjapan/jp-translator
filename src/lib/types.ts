export interface ProcessingResult {
  id: string; 
  status: 'pending' | 'processing' | 'completed' | 'error';
  error?: string;
  originalText?: string;
  translation?: string;    // Full text translation
  interpretation?: string; // Full text interpretation/glossary
}

export interface TranslationHistory {
  id: string;
  timestamp: number;
  model: string;
  originalText: string;
  translation: string;
  interpretation: string;
  preview: string; // First 100 chars of original text for quick preview
}

export interface ProcessingRequest {
  text: string;
  apiKey?: string;
  model?: string;
}
