import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Loader2, X, RotateCcw, Sparkles } from 'lucide-react';
import { CompanyData, ChatMessage } from '../types';
import { CompanyChatSession } from '../services/geminiService';

interface ChatWindowProps {
  companyData: CompanyData;
  onUpdateData: (data: Partial<CompanyData>) => void;
  isOpen: boolean;
  onClose: () => void;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ companyData, onUpdateData, isOpen, onClose }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatSessionRef = useRef<CompanyChatSession | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize chat session when company data changes significantly (e.g. new search)
  // We use a ref to track the company name to avoid re-init on small updates
  const currentCompanyRef = useRef<string>("");

  useEffect(() => {
    if (companyData.companyName !== currentCompanyRef.current) {
      currentCompanyRef.current = companyData.companyName;
      setMessages([{
        id: 'init',
        role: 'model',
        text: `Hi! I've analyzed ${companyData.companyName}. Ask me anything about its history or structure. If you see something missing, just let me know and I can update the charts!`,
        timestamp: new Date()
      }]);
      
      chatSessionRef.current = new CompanyChatSession(companyData, (updates) => {
        onUpdateData(updates);
        // We can add a system note or just let the model reply
      });
    }
  }, [companyData.companyName, onUpdateData, companyData]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || !chatSessionRef.current) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const responseText = await chatSessionRef.current.sendMessage(userMsg.text);
      
      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: responseText,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'model',
        text: "Sorry, I had trouble connecting. Please try again.",
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-96 bg-slate-900 border-l border-slate-800 shadow-2xl z-50 flex flex-col transform transition-transform duration-300 ease-in-out">
      {/* Header */}
      <div className="h-16 border-b border-slate-800 flex items-center justify-between px-4 bg-slate-900/95 backdrop-blur">
        <div className="flex items-center gap-2">
          <div className="bg-gradient-to-tr from-blue-600 to-purple-600 p-1.5 rounded-lg">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <h3 className="font-semibold text-slate-100">AI Assistant</h3>
        </div>
        <button 
          onClick={onClose}
          className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
              msg.role === 'user' ? 'bg-slate-700' : 'bg-blue-600'
            }`}>
              {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>
            <div className={`max-w-[80%] p-3 rounded-2xl text-sm leading-relaxed ${
              msg.role === 'user' 
                ? 'bg-slate-800 text-slate-100 rounded-tr-none' 
                : 'bg-gradient-to-br from-blue-600/10 to-purple-600/10 border border-blue-500/20 text-slate-200 rounded-tl-none'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 animate-pulse">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-slate-800/50 p-3 rounded-2xl rounded-tl-none">
              <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-slate-800 bg-slate-900">
        <form onSubmit={handleSend} className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about the company or suggest changes..."
            className="w-full bg-slate-800 text-slate-100 border border-slate-700 rounded-xl pl-4 pr-12 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-sm"
            disabled={isLoading}
          />
          <button 
            type="submit"
            disabled={!input.trim() || isLoading}
            className="absolute right-2 top-2 p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
        <p className="text-[10px] text-slate-500 mt-2 text-center">
          AI can make mistakes. Verify important info.
        </p>
      </div>
    </div>
  );
};

export default ChatWindow;
