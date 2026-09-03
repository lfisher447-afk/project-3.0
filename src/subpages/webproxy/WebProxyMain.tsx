import React, { useState } from 'react';
import {
  Globe,
  ArrowLeft,
  ArrowRight,
  RotateCw,
  Home,
  Shield,
  Search,
  Plus,
  X,
  Lock,
  ExternalLink,
  Sparkles,
} from 'lucide-react';

interface BrowserTab {
  id: string;
  title: string;
  url: string;
  favicon?: string;
}

export const WebProxyMain: React.FC = () => {
  const [tabs, setTabs] = useState<BrowserTab[]>([
    {
      id: 'tab-1',
      title: 'Wikipedia Portal',
      url: 'https://en.wikipedia.org/wiki/Main_Page',
    },
    {
      id: 'tab-2',
      title: 'DuckDuckGo Search',
      url: 'https://duckduckgo.com',
    },
  ]);
  const [activeTabId, setActiveTabId] = useState<string>('tab-1');
  const [addressBar, setAddressBar] = useState<string>('https://en.wikipedia.org/wiki/Main_Page');
  const [iframeKey, setIframeKey] = useState<number>(0);
  const [stealthMode, setStealthMode] = useState<boolean>(true);

  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];

  const handleNavigate = (e: React.FormEvent) => {
    e.preventDefault();
    let url = addressBar.trim();
    if (!url) return;

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      if (url.includes('.') && !url.includes(' ')) {
        url = 'https://' + url;
      } else {
        url = `https://duckduckgo.com/?q=${encodeURIComponent(url)}`;
      }
    }

    setTabs((prev) =>
      prev.map((t) => (t.id === activeTabId ? { ...t, url, title: new URL(url).hostname } : t))
    );
    setAddressBar(url);
    setIframeKey((prev) => prev + 1);
  };

  const handleNewTab = () => {
    const newId = `tab-${Date.now()}`;
    const newTab: BrowserTab = {
      id: newId,
      title: 'DuckDuckGo Search',
      url: 'https://duckduckgo.com',
    };
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newId);
    setAddressBar(newTab.url);
  };

  const handleCloseTab = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (tabs.length === 1) return;
    const nextTabs = tabs.filter((t) => t.id !== id);
    setTabs(nextTabs);
    if (activeTabId === id) {
      setActiveTabId(nextTabs[0].id);
      setAddressBar(nextTabs[0].url);
    }
  };

  const quickBookmarks = [
    { title: 'Wikipedia', url: 'https://en.wikipedia.org' },
    { title: 'DuckDuckGo', url: 'https://duckduckgo.com' },
    { title: 'OpenStreetMap', url: 'https://www.openstreetmap.org' },
    { title: 'Hacker News', url: 'https://news.ycombinator.com' },
    { title: 'Archive.org', url: 'https://archive.org' },
  ];

  const proxySrc = `/api/proxy?url=${encodeURIComponent(activeTab.url)}`;

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] select-none bg-[#030a0c] border border-[#14343d] rounded-3xl overflow-hidden shadow-2xl animate-in fade-in duration-300">
      {/* Tab Strip */}
      <div className="flex items-center gap-1 bg-[#061417] px-3 pt-2 border-b border-[#122e36] overflow-x-auto">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          return (
            <div
              key={tab.id}
              onClick={() => {
                setActiveTabId(tab.id);
                setAddressBar(tab.url);
              }}
              className={`group flex items-center gap-2 px-3.5 py-2 rounded-t-xl text-xs cursor-pointer border-t border-x transition max-w-[200px] ${
                isActive
                  ? 'bg-[#0a1f24] border-[#1a444f] text-white font-bold'
                  : 'bg-[#040e10] border-transparent text-zinc-400 hover:bg-[#07191d] hover:text-zinc-200'
              }`}
            >
              <Globe size={13} className={isActive ? 'text-[#48e4ff]' : 'text-zinc-500'} />
              <span className="truncate flex-1">{tab.title}</span>
              {tabs.length > 1 && (
                <button
                  onClick={(e) => handleCloseTab(e, tab.id)}
                  className="opacity-0 group-hover:opacity-100 hover:text-rose-400 transition p-0.5 rounded"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          );
        })}

        <button
          onClick={handleNewTab}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-[#0c262d] transition ml-1"
          title="New Tab"
        >
          <Plus size={14} />
        </button>
      </div>

      {/* Navigation Toolbar */}
      <div className="p-2.5 bg-[#091f24] border-b border-[#143a44] flex items-center gap-2">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIframeKey((prev) => prev + 1)}
            className="p-1.5 rounded-xl hover:bg-[#123640] text-zinc-400 hover:text-white transition"
            title="Reload Frame"
          >
            <RotateCw size={14} />
          </button>
          <button
            onClick={() => {
              setAddressBar('https://duckduckgo.com');
              setTabs((prev) =>
                prev.map((t) =>
                  t.id === activeTabId
                    ? { ...t, url: 'https://duckduckgo.com', title: 'DuckDuckGo' }
                    : t
                )
              );
              setIframeKey((prev) => prev + 1);
            }}
            className="p-1.5 rounded-xl hover:bg-[#123640] text-zinc-400 hover:text-white transition"
            title="Home"
          >
            <Home size={14} />
          </button>
        </div>

        {/* Address Bar Form */}
        <form onSubmit={handleNavigate} className="flex-1 flex items-center relative">
          <div className="absolute left-3 text-zinc-500 flex items-center gap-1">
            <Lock size={12} className="text-emerald-400" />
          </div>
          <input
            type="text"
            value={addressBar}
            onChange={(e) => setAddressBar(e.target.value)}
            placeholder="Type a URL or search query..."
            className="w-full bg-[#051114] border border-[#163c46] focus:border-[#48e4ff] rounded-xl pl-8 pr-20 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none transition font-mono"
          />
          <button
            type="submit"
            className="absolute right-1.5 px-3 py-1 bg-[#15414d] hover:bg-[#1f5664] text-[#48e4ff] text-xs font-bold rounded-lg transition"
          >
            Go
          </button>
        </form>

        {/* Stealth Shield Indicator */}
        <button
          onClick={() => setStealthMode(!stealthMode)}
          className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 border transition ${
            stealthMode
              ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/40'
              : 'bg-zinc-900 text-zinc-400 border-zinc-700'
          }`}
        >
          <Shield size={13} />
          <span>{stealthMode ? 'Anti-DPI Stealth ON' : 'Direct'}</span>
        </button>
      </div>

      {/* Bookmarks Toolbar */}
      <div className="px-4 py-1.5 bg-[#061417] border-b border-[#122e36] flex items-center gap-2 overflow-x-auto text-[11px]">
        <span className="text-zinc-500 font-mono">Bookmarks:</span>
        {quickBookmarks.map((bm) => (
          <button
            key={bm.title}
            onClick={() => {
              setAddressBar(bm.url);
              setTabs((prev) =>
                prev.map((t) =>
                  t.id === activeTabId ? { ...t, url: bm.url, title: bm.title } : t
                )
              );
              setIframeKey((prev) => prev + 1);
            }}
            className="px-2.5 py-0.5 rounded-lg bg-[#0a1e23] hover:bg-[#13353d] text-zinc-300 hover:text-white transition border border-[#163942]"
          >
            {bm.title}
          </button>
        ))}
      </div>

      {/* Sandbox Stealth Iframe */}
      <div className="flex-1 bg-white relative">
        <iframe
          key={iframeKey}
          src={proxySrc}
          title={activeTab.title}
          className="w-full h-full border-0"
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
        />
      </div>
    </div>
  );
};
