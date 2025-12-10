export interface ProcessingResult {
  id: string; 
  status: 'pending' | 'processing' | 'completed' | 'error';
  error?: string;
  originalText?: string;
  translation?: string;    // Full text translation
  interpretation?: string; // Full text interpretation/glossary
}

// Legacy Clause interface removed as we are moving to full text mode
// export interface Clause { ... }

export interface ProcessingRequest {
  text: string;
  apiKey?: string;
  model?: string;
}
