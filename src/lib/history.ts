import { TranslationHistory } from './types';

const HISTORY_STORAGE_KEY = 'jp_translator_history';
const MAX_HISTORY_ITEMS = 20;

export function saveTranslationToHistory(
  originalText: string,
  translation: string,
  interpretation: string,
  model: string
): void {
  try {
    const history = getTranslationHistory();
    
    const newRecord: TranslationHistory = {
      id: `trans-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      model,
      originalText,
      translation,
      interpretation,
      preview: originalText.substring(0, 100) + (originalText.length > 100 ? '...' : ''),
    };

    // Add to beginning and keep only last MAX_HISTORY_ITEMS
    const updatedHistory = [newRecord, ...history].slice(0, MAX_HISTORY_ITEMS);
    
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updatedHistory));
  } catch (error) {
    console.error('Failed to save translation history:', error);
  }
}

export function getTranslationHistory(): TranslationHistory[] {
  try {
    const stored = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!stored) return [];
    
    const history = JSON.parse(stored) as TranslationHistory[];
    // Sort by timestamp descending (newest first)
    return history.sort((a, b) => b.timestamp - a.timestamp);
  } catch (error) {
    console.error('Failed to load translation history:', error);
    return [];
  }
}

export function deleteTranslationFromHistory(id: string): void {
  try {
    const history = getTranslationHistory();
    const updatedHistory = history.filter(item => item.id !== id);
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updatedHistory));
  } catch (error) {
    console.error('Failed to delete translation from history:', error);
  }
}

export function clearTranslationHistory(): void {
  try {
    localStorage.removeItem(HISTORY_STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear translation history:', error);
  }
}

export function exportToMarkdown(history: TranslationHistory): string {
  const date = new Date(history.timestamp);
  const dateStr = date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

  return `# 翻译报告

**生成时间**: ${dateStr}  
**使用模型**: ${history.model}

---

## 原文 (Original Text)

${history.originalText}

---

## 译文 (Translation)

${history.translation}

---

## 专业解读 (Professional Interpretation)

${history.interpretation}

---

*此文档由 JP Legal Translator 自动生成*
`;
}

