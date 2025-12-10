"use client";

import React, { useState, useEffect } from 'react';
import { Loader2, CheckCircle, AlertCircle, FileDown, Languages, Settings2, Sparkles, Key, Send, BookOpen } from 'lucide-react';
import axios from 'axios';
import { ProcessingResult } from '@/lib/types';
import { Document, Packer, Paragraph, Table, TableRow, TableCell, WidthType, TextRun } from 'docx';
import { saveAs } from 'file-saver';
import { translateContentClient, testConnectionClient } from '@/lib/client-api';

const AVAILABLE_MODELS = [
  { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro Preview (Latest)' },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro (Stable)' },
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash (Fast)' },
  { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash' },
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro (Legacy Stable)' },
  { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash (Legacy)' },
  { id: 'gpt-4-1106-preview', name: 'GPT-4 Turbo (OpenAI Key)' },
];

export default function Home() {
  const [inputText, setInputText] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState(AVAILABLE_MODELS[0].id);
  const [result, setResult] = useState<ProcessingResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  // Test Connection States
  const [isTestingKey, setIsTestingKey] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');

  // Load API key from local storage on mount
  useEffect(() => {
    const savedKey = localStorage.getItem('jp_translator_api_key');
    if (savedKey) setApiKey(savedKey);
  }, []);

  const handleSaveKey = () => {
    if (apiKey.trim()) {
      localStorage.setItem('jp_translator_api_key', apiKey.trim());
      setTestStatus('idle'); 
      setTestMessage('Key saved locally!');
      setTimeout(() => setTestMessage(''), 2000);
    } else {
      localStorage.removeItem('jp_translator_api_key');
      setTestMessage('Key removed.');
      setTimeout(() => setTestMessage(''), 2000);
    }
  };

  const handleTestConnection = async () => {
    if (!apiKey.trim()) {
      setTestStatus('error');
      setTestMessage('Please enter an API Key first.');
      return;
    }

    setIsTestingKey(true);
    setTestStatus('idle');
    setTestMessage('');

    try {
      const provider = model.includes('gpt') ? 'openai' : 'google';
      
      // Try server-side API first, fallback to client-side if 404 (static site)
      try {
        const response = await axios.post('/api/test-key', { 
          apiKey, 
          provider,
          model
        });
        
        if (response.data.success) {
          setTestStatus('success');
          setTestMessage(response.data.message || 'Connected successfully!');
        } else {
          setTestStatus('error');
          setTestMessage(response.data.message || 'Connection failed');
        }
      } catch (serverError: any) {
        // If 404 or network error, use client-side API (for GitHub Pages)
        if (serverError.response?.status === 404 || serverError.code === 'ERR_NETWORK') {
          const result = await testConnectionClient(apiKey, provider, model);
          setTestStatus(result.success ? 'success' : 'error');
          setTestMessage(result.message);
        } else {
          throw serverError;
        }
      }
    } catch (error: any) {
      setTestStatus('error');
      setTestMessage(error.message || 'Connection failed');
    } finally {
      setIsTestingKey(false);
    }
  };

  const handleProcess = async () => {
    if (!inputText.trim()) return;

    setIsProcessing(true);
    setResult({ id: 'current', status: 'pending' });

    // Save key to local storage for convenience
    if (apiKey) localStorage.setItem('jp_translator_api_key', apiKey);

    try {
      // Try server-side API first, fallback to client-side if 404 (static site)
      try {
        const response = await axios.post('/api/process', { 
          text: inputText, 
          apiKey: apiKey || undefined, 
          model 
        });
        const data = response.data;
        
        setResult({ 
          id: 'current',
          status: 'completed', 
          originalText: data.originalText,
          translation: data.translation,
          interpretation: data.interpretation
        });
      } catch (serverError: any) {
        // If 404 or network error, use client-side API (for GitHub Pages)
        if (serverError.response?.status === 404 || serverError.code === 'ERR_NETWORK') {
          if (!apiKey) {
            throw new Error('API Key is required for client-side translation');
          }
          
          const { translation, interpretation } = await translateContentClient(inputText, apiKey, model);
          
          setResult({ 
            id: 'current',
            status: 'completed', 
            originalText: inputText,
            translation,
            interpretation
          });
        } else {
          throw serverError;
        }
      }
    } catch (error: any) {
      setResult({ 
        id: 'current',
        status: 'error', 
        error: error.message || 'Translation failed'
      });
    }

    setIsProcessing(false);
  };

  const exportToDocx = async () => {
    if (!result || !result.translation) return;

    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({ text: `Translation Report`, heading: "Heading1" }),
          new Paragraph({ text: `Model: ${model}`, heading: "Heading2" }),
          new Paragraph({ text: " " }),
          
          new Paragraph({ text: "全文译文 (Full Translation)", heading: "Heading1" }),
          new Paragraph({ text: result.translation || "" }),
          
          new Paragraph({ text: " " }),
          new Paragraph({ text: "专业解读 (Interpretation)", heading: "Heading1" }),
          new Paragraph({ text: result.interpretation || "" }),
          
          new Paragraph({ text: " " }),
          new Paragraph({ text: "原文 (Original)", heading: "Heading1" }),
          new Paragraph({ text: result.originalText || "" }),
        ],
      }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `translation-${new Date().getTime()}.docx`);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 text-slate-900 font-sans">
      <div className="max-w-[95%] mx-auto p-4 md:p-6 space-y-6">
        
        {/* Header */}
        <header className="flex items-center justify-between pb-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2.5 rounded-xl shadow-lg shadow-blue-600/20">
              <Languages className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">JP Legal Translator</h1>
              <p className="text-sm text-slate-500 font-medium">Professional Full-Text Interpretation</p>
            </div>
          </div>
          
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2 rounded-lg transition-all ${showSettings ? 'bg-slate-200 text-slate-900' : 'hover:bg-slate-100 text-slate-500'}`}
            title="API Settings"
          >
            <Settings2 className="w-6 h-6" />
          </button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-180px)]">
          
          {/* Left Column: Input */}
          <div className="flex flex-col space-y-4 h-full">
            
            {/* Settings Panel (Collapsible) */}
            {showSettings && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 space-y-4 animate-in slide-in-from-top-2 fade-in">
                <h3 className="font-semibold flex items-center gap-2 text-slate-700">
                  <Key className="w-4 h-4" /> API Configuration
                </h3>
                
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-slate-600">Model Selection</label>
                  <select
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-slate-50"
                  >
                    {AVAILABLE_MODELS.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-3">
                  <label className="block text-sm font-medium text-slate-600">API Key</label>
                  <div className="relative">
                    <input
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="sk-..."
                      className={`w-full p-2.5 pr-24 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-mono ${
                        testStatus === 'success' ? 'border-green-400 bg-green-50' : 
                        testStatus === 'error' ? 'border-red-400 bg-red-50' : 
                        'border-slate-300'
                      }`}
                    />
                    <div className="absolute right-1 top-1 flex gap-1">
                       <button
                          onClick={handleSaveKey}
                          className="px-2 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-md transition-colors"
                          title="Save to browser"
                        >
                          Save
                        </button>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-500">
                      {testMessage ? (
                         <span className={
                           testStatus === 'success' ? 'text-green-600 font-medium' :
                           testStatus === 'error' ? 'text-red-600 font-medium' : 
                           'text-blue-600'
                         }>
                           {testMessage}
                         </span>
                      ) : (
                        "Key is saved locally."
                      )}
                    </p>
                    <button
                      onClick={handleTestConnection}
                      disabled={isTestingKey || !apiKey}
                      className="text-xs flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-full font-medium transition-colors disabled:opacity-50"
                    >
                      {isTestingKey ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                      Test Connection
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Input Area */}
            <div className="bg-white rounded-xl shadow-lg shadow-slate-200/50 border border-slate-100 p-1 flex flex-col flex-1 min-h-[400px]">
              <div className="px-5 py-3 border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Original Text (Japanese)
              </div>
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Paste Japanese legal text here..."
                className="flex-1 w-full p-5 resize-none outline-none text-base leading-relaxed text-slate-700 placeholder:text-slate-300 rounded-lg font-jp"
              />
              
              <div className="p-4 border-t border-slate-100 bg-slate-50 rounded-b-lg flex justify-between items-center">
                 <div className="text-xs text-slate-400 font-medium px-2">
                    {inputText.length} chars
                 </div>
                 <button
                  onClick={handleProcess}
                  disabled={isProcessing || !inputText.trim()}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-all shadow-md shadow-blue-600/20 disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed active:scale-95"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Translating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Translate Full Text
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Output */}
          <div className="flex flex-col h-full space-y-4">
            {!result && !isProcessing && (
              <div className="h-full flex flex-col items-center justify-center text-slate-300 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                <BookOpen className="w-16 h-16 mb-4 opacity-50" />
                <p className="text-lg font-medium">Translation Result</p>
                <p className="text-sm">Full text translation and interpretation will appear here</p>
              </div>
            )}

            {isProcessing && !result && (
               <div className="h-full flex flex-col items-center justify-center bg-white rounded-xl shadow-sm border border-slate-200">
                  <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
                  <p className="text-slate-600 font-medium animate-pulse">Generating full text translation...</p>
                  <p className="text-slate-400 text-sm mt-2">Using {model}</p>
               </div>
            )}

            {result && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
                {/* Result Header */}
                <div className="bg-slate-50/80 p-4 border-b border-slate-200 flex items-center justify-between backdrop-blur-sm sticky top-0 z-10">
                  <div className="flex items-center gap-3">
                    {result.status === 'completed' && <CheckCircle className="w-5 h-5 text-green-500" />}
                    {result.status === 'error' && <AlertCircle className="w-5 h-5 text-red-500" />}
                    <span className="font-semibold text-slate-700">Translation Result</span>
                  </div>
                  {result.status === 'completed' && (
                    <button
                      onClick={exportToDocx}
                      className="text-sm bg-white border border-slate-200 hover:border-blue-300 hover:text-blue-600 px-3 py-1.5 rounded-md flex items-center gap-2 transition-all shadow-sm"
                    >
                      <FileDown className="w-4 h-4" />
                      Download .docx
                    </button>
                  )}
                </div>

                {/* Result Body (Scrollable) */}
                <div className="flex-1 overflow-auto p-6 space-y-8">
                  {result.error && (
                    <div className="p-8 text-center bg-red-50 rounded-lg">
                      <h3 className="text-red-900 font-medium mb-2">Translation Failed</h3>
                      <p className="text-red-600">{result.error}</p>
                    </div>
                  )}

                  {result.translation && (
                    <div>
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">
                            Full Translation (Simplified Chinese)
                        </div>
                        <div className="prose prose-slate max-w-none text-slate-800 leading-relaxed whitespace-pre-wrap">
                            {result.translation}
                        </div>
                    </div>
                  )}
                  
                  {result.interpretation && (
                    <div className="bg-blue-50/40 p-6 rounded-xl border border-blue-100/50">
                        <div className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-4 border-b border-blue-100 pb-2 flex items-center gap-2">
                            <Sparkles className="w-3 h-3" />
                            Professional Interpretation & Glossary
                        </div>
                        <div className="prose prose-sm prose-blue max-w-none text-slate-700 leading-relaxed whitespace-pre-wrap">
                            {result.interpretation}
                        </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
