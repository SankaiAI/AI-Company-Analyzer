import React, { useState, useCallback } from 'react';
import { Search, Info, GitBranch, History, ExternalLink, Loader2, AlertCircle, MessageSquareText } from 'lucide-react';
import { fetchCompanyData } from './services/geminiService';
import { CompanyData } from './types';
import HistoryChart from './components/HistoryChart';
import OrgChart from './components/OrgChart';
import ChatWindow from './components/ChatWindow';

const App: React.FC = () => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<CompanyData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'timeline' | 'structure'>('timeline');
  const [isChatOpen, setIsChatOpen] = useState(false);

  const handleSearch = useCallback(async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setData(null);
    setIsChatOpen(false); 

    try {
      const result = await fetchCompanyData(query);
      setData(result);
    } catch (err: any) {
      setError(err.message || "Failed to fetch company data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [query]);

  // Handler for updates coming from the Chat AI
  const handleDataUpdate = useCallback((updates: Partial<CompanyData>) => {
    setData((prev) => {
      if (!prev) return null;
      return { ...prev, ...updates };
    });
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 relative overflow-hidden">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-1.5 rounded-lg">
              <History className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
              Corporate Chronicles
            </h1>
          </div>
          <div className="flex items-center gap-4">
             <div className="text-xs text-slate-500 hidden sm:block">
              Powered by Google Gemini 2.5
            </div>
            {data && (
              <button
                onClick={() => setIsChatOpen(!isChatOpen)}
                className={`p-2 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium ${
                  isChatOpen 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <MessageSquareText className="w-4 h-4" />
                <span className="hidden sm:inline">AI Assistant</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <main className={`flex-1 flex flex-col max-w-7xl mx-auto w-full px-4 py-8 transition-all duration-300 ${isChatOpen ? 'pr-0 sm:pr-4' : ''}`}>
        
        {/* Search Section */}
        <div className={`transition-all duration-500 ease-in-out flex flex-col items-center justify-center ${data ? 'min-h-[100px]' : 'min-h-[60vh]'}`}>
          {!data && !loading && (
             <div className="text-center mb-8 animate-fade-in">
               <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-4 tracking-tight">
                 Uncover the Story.
               </h2>
               <p className="text-slate-400 text-lg max-w-xl mx-auto">
                 Explore the history, milestones, and organizational structure of any company in seconds.
               </p>
             </div>
          )}

          <form onSubmit={handleSearch} className="w-full max-w-xl relative">
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className={`w-5 h-5 ${loading ? 'text-blue-400' : 'text-slate-400 group-focus-within:text-blue-400'}`} />
              </div>
              <input
                type="text"
                className="w-full pl-12 pr-4 py-4 bg-slate-900 border border-slate-700 rounded-2xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all shadow-xl shadow-black/20"
                placeholder="Enter a company name (e.g., Nintendo, Alphabet, SpaceX)..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                disabled={loading}
              />
              <button 
                type="submit" 
                disabled={loading || !query.trim()}
                className="absolute right-2 top-2 bottom-2 px-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 text-white font-medium rounded-xl transition-colors"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Analyze"}
              </button>
            </div>
          </form>

          {/* Error Message */}
          {error && (
            <div className="mt-6 p-4 bg-red-900/20 border border-red-800 rounded-lg text-red-200 flex items-center gap-3 animate-fade-in">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}
        </div>

        {/* Content Section */}
        {loading && !data && (
           <div className="flex-1 flex flex-col items-center justify-center space-y-4 animate-pulse">
             <div className="w-16 h-16 rounded-full bg-slate-800/50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
             </div>
             <p className="text-slate-400">Gathering intelligence from the web...</p>
           </div>
        )}

        {data && !loading && (
          <div className="flex-1 flex flex-col gap-6 animate-fade-in-up">
            
            {/* Company Info Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div>
                  <h2 className="text-3xl font-bold text-white mb-2">{data.companyName}</h2>
                  <p className="text-slate-300 leading-relaxed max-w-4xl">{data.summary}</p>
                </div>
                <div className="flex flex-wrap gap-2 md:justify-end">
                   <span className="px-3 py-1 bg-slate-800 text-slate-400 text-xs rounded-full border border-slate-700">
                     Founding Date: {data.timeline.find(e => e.category === 'founding')?.dateStr || data.timeline.find(e => e.category === 'founding')?.year || 'N/A'}
                   </span>
                </div>
              </div>
            </div>

            {/* View Toggle */}
            <div className="flex items-center gap-4 border-b border-slate-800 pb-1">
              <button
                onClick={() => setActiveTab('timeline')}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'timeline'
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <History className="w-4 h-4" />
                History Timeline
              </button>
              <button
                onClick={() => setActiveTab('structure')}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'structure'
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <GitBranch className="w-4 h-4" />
                Org Structure
              </button>
            </div>

            {/* Visualization Area */}
            <div className="flex-1 min-h-[500px] bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden relative">
              {activeTab === 'timeline' ? (
                <HistoryChart data={data.timeline} />
              ) : (
                <OrgChart data={data.structure} />
              )}
            </div>

            {/* Sources */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3 text-slate-400">
                <Info className="w-4 h-4" />
                <h3 className="text-sm font-semibold uppercase tracking-wider">Sources & References</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {data.sources.slice(0, 6).map((source, idx) => (
                  <a 
                    key={idx} 
                    href={source.uri} 
                    target="_blank" 
                    rel="noreferrer"
                    className="flex items-center gap-2 p-3 rounded-lg bg-slate-950 border border-slate-800 hover:border-blue-500/50 hover:bg-slate-800 transition-colors group"
                  >
                    <ExternalLink className="w-3 h-3 text-slate-500 group-hover:text-blue-400" />
                    <span className="text-xs text-slate-300 truncate">{source.title || source.uri}</span>
                  </a>
                ))}
                {data.sources.length === 0 && (
                  <span className="text-xs text-slate-600 italic">No specific source metadata returned.</span>
                )}
              </div>
            </div>

          </div>
        )}
      </main>

      {/* Chat Sidebar Overlay */}
      {data && (
        <ChatWindow 
          companyData={data} 
          onUpdateData={handleDataUpdate}
          isOpen={isChatOpen} 
          onClose={() => setIsChatOpen(false)} 
        />
      )}
    </div>
  );
};

export default App;
