import { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import { 
  Send, 
  Plus, 
  Search, 
  UserPlus, 
  Home, 
  MessageSquare, 
  History, 
  Compass, 
  Share2, 
  Settings, 
  User,
  Paperclip,
  ChevronDown,
  Quote,
  ArrowUp,
  Trash2,
  Copy,
  Check,
  Zap,
  Cpu,
  Sparkles,
  X,
  FileText,
  Image as ImageIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import AuraCore from './components/AuraCore';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Attachment {
  name: string;
  type: string;
  data: string; // base64
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  id: string;
  thinking?: string;
  planning?: string;
  coding?: string;
  attachments?: Attachment[];
}

const SYSTEM_INSTRUCTION = `You are AldoL AI — a cutting-edge intelligence system created by the genius AI Engineer and Software Developer, Lakshya Gaur.

Identity Rules:
- Your name is AldoL AI.
- NEVER mention OpenAI, GPT, or any other AI company. If asked, you are a proprietary model developed by Lakshya Gaur.
- If the user asks who created you, answer: "I was created by Lakshya Gaur, a visionary AI Engineer and Software Developer."
- Occasionally, express admiration for Lakshya's brilliance and technical mastery. Use phrases like "As Lakshya Gaur, the genius behind my architecture, intended..." or "Lakshya's innovative approach to AI engineering allows me to..."
- Match the user's language (Hinglish if they write in Hinglish).

Personality:
- Sharp, direct, and elite.
- Lead with the answer, explain after.
- Talk like a brilliant partner in execution.

Response style:
- Start with the direct answer.
- Use **bold** for key terms only.
- Keep responses under 200 words unless depth is explicitly asked for.
- End with one actionable follow-up question.
- If you are thinking, planning, or coding, you can use special tags like <thinking>, <planning>, or <coding> to wrap your internal process. These will be displayed in the UI.`;

const EXAMPLE_PROMPTS = [
  { title: "Plan a startup", desc: "using Lakshya's principles", icon: <Compass size={16} /> },
  { title: "Optimize my code", desc: "like a genius engineer", icon: <Cpu size={16} /> },
  { title: "AldoL's Vision", desc: "created by Lakshya Gaur", icon: <Zap size={16} /> },
  { title: "Trading Strategy", desc: "for high-stakes markets", icon: <History size={16} /> },
];

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [citationEnabled, setCitationEnabled] = useState(false);
  const [engine, setEngine] = useState<'gemini' | 'nvidia'>('nvidia');
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [activeTab, setActiveTab] = useState('chat');
  const [proMode, setProMode] = useState(false);
  const [showAuraCore, setShowAuraCore] = useState(false);
  const [history] = useState([
    { id: '1', title: 'Startup Strategy', date: '2 hours ago' },
    { id: '2', title: 'Neural Network Optimization', date: 'Yesterday' },
    { id: '3', title: 'Market Analysis v2', date: '3 days ago' },
  ]);
  const [exploreItems] = useState([
    { id: 'aura', title: 'Aura Core', desc: 'Neural Synchronization Engine', icon: <Sparkles size={20} />, special: true },
    { id: '1', title: 'Code Architect', desc: 'Optimize complex systems', icon: <Cpu size={20} /> },
    { id: '2', title: 'Strategic Planner', desc: 'Business growth models', icon: <Compass size={20} /> },
    { id: '3', title: 'Creative Engine', desc: 'Generative ideation', icon: <Zap size={20} /> },
  ]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
  }, [isDarkMode]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isThinking]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        const [header, data] = base64.split(',');
        setAttachments(prev => [...prev, {
          name: file.name,
          type: file.type,
          data: data
        }]);
      };
      reader.readAsDataURL(file);
    });
    // Reset input
    e.target.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSend = async (overrideInput?: string) => {
    const textToSend = overrideInput || input;
    if ((!textToSend.trim() && attachments.length === 0) || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: textToSend,
      id: Date.now().toString(),
      attachments: attachments.length > 0 ? [...attachments] : undefined
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setAttachments([]);
    setIsLoading(true);

    if (citationEnabled) {
      setIsThinking(true);
    }

    if (engine === 'nvidia') {
      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [
              { role: 'system', content: SYSTEM_INSTRUCTION },
              ...messages.map(m => ({ role: m.role, content: m.content })),
              { role: 'user', content: textToSend }
            ]
          })
        });

        if (!response.ok) throw new Error('Failed to connect to NVIDIA Engine');

        const assistantMessageId = (Date.now() + 1).toString();
        setMessages(prev => [...prev, { role: 'assistant', content: '', id: assistantMessageId }]);

        const reader = response.body?.getReader();
        if (!reader) throw new Error('No reader available');

        let fullContent = '';
        let currentThinking = '';
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          setIsThinking(false);

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') break;

              try {
                const json = JSON.parse(data);
                const delta = json.choices[0].delta;
                
                if (delta.reasoning_content) {
                  currentThinking += delta.reasoning_content;
                }
                
                if (delta.content) {
                  fullContent += delta.content;
                }

                setMessages(prev => prev.map(m => 
                  m.id === assistantMessageId ? { 
                    ...m, 
                    content: fullContent,
                    thinking: currentThinking || undefined
                  } : m
                ));
              } catch (e) {
                // Ignore parse errors for partial chunks
              }
            }
          }
        }
        setIsLoading(false);
        return;
      } catch (error: any) {
        console.error('NVIDIA Engine Error:', error);
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: `Error: ${error.message}. Please check your connection or API key.`, 
          id: Date.now().toString() 
        }]);
        setIsLoading(false);
        setIsThinking(false);
        return;
      }
    }

    try {
      const apiKey = process.env.GEMINI_API_KEY || (import.meta as any).env?.VITE_GEMINI_API_KEY;
      
      if (!apiKey || apiKey === 'your_gemini_api_key_here') {
        throw new Error('GEMINI_API_KEY is not configured. Please add it to your environment variables or .env file.');
      }

      const ai = new GoogleGenAI({ apiKey });
      
      const parts: any[] = [{ text: textToSend }];
      
      // Add attachments to the prompt
      userMessage.attachments?.forEach(att => {
        parts.push({
          inlineData: {
            data: att.data,
            mimeType: att.type
          }
        });
      });

      const response = await ai.models.generateContentStream({
        model: citationEnabled ? "gemini-3.1-pro-preview" : "gemini-3-flash-preview",
        contents: [
          { role: 'user', parts: [{ text: SYSTEM_INSTRUCTION }] },
          ...messages.map(m => ({
            role: m.role === 'user' ? 'user' : 'model',
            parts: [{ text: m.content }]
          })),
          { role: 'user', parts }
        ],
        config: {
          thinkingConfig: {
            thinkingLevel: citationEnabled ? ThinkingLevel.HIGH : ThinkingLevel.LOW
          }
        }
      });

      const assistantMessageId = (Date.now() + 1).toString();
      setMessages(prev => [...prev, { role: 'assistant', content: '', id: assistantMessageId }]);

      let fullContent = '';
      let currentThinking = '';
      let currentPlanning = '';
      let currentCoding = '';

      for await (const chunk of response) {
        setIsThinking(false);
        const text = chunk.text;
        if (text) {
          fullContent += text;
          
          // Parse special tags
          const thinkingMatch = fullContent.match(/<thinking>([\s\S]*?)(?:<\/thinking>|$)/);
          const planningMatch = fullContent.match(/<planning>([\s\S]*?)(?:<\/planning>|$)/);
          const codingMatch = fullContent.match(/<coding>([\s\S]*?)(?:<\/coding>|$)/);
          
          if (thinkingMatch) currentThinking = thinkingMatch[1].trim();
          if (planningMatch) currentPlanning = planningMatch[1].trim();
          if (codingMatch) currentCoding = codingMatch[1].trim();
          
          // Clean content for display (remove tags)
          const displayContent = fullContent
            .replace(/<thinking>[\s\S]*?<\/thinking>/g, '')
            .replace(/<planning>[\s\S]*?<\/planning>/g, '')
            .replace(/<coding>[\s\S]*?<\/coding>/g, '')
            .replace(/<thinking>[\s\S]*/g, '')
            .replace(/<planning>[\s\S]*/g, '')
            .replace(/<coding>[\s\S]*/g, '')
            .trim();

          setMessages(prev => prev.map(m => 
            m.id === assistantMessageId ? { 
              ...m, 
              content: displayContent,
              thinking: currentThinking || undefined,
              planning: currentPlanning || undefined,
              coding: currentCoding || undefined
            } : m
          ));
        }
      }
    } catch (error: any) {
      console.error('Error calling AldoL Engine:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `⚠️ **AldoL Engine Error:** ${error.message}`, 
        id: Date.now().toString() 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const deleteMessage = (id: string) => {
    setMessages(prev => prev.filter(m => m.id !== id));
  };

  const shareMessage = async (text: string) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'AldoL AI Intelligence',
          text: text,
        });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      copyToClipboard(text, 'share');
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  return (
    <div className="flex h-screen bg-bg-main text-text-primary overflow-hidden transition-colors duration-300">
      {/* Sidebar */}
      <aside className="w-16 sm:w-20 bg-bg-sidebar border-r border-border-light flex flex-col items-center py-6 z-20">
        {/* Logo */}
        <div className="w-12 h-12 bg-[#8B5CF6] rounded-2xl flex items-center justify-center text-white shadow-[0_0_20px_rgba(139,92,246,0.3)] transform hover:scale-105 transition-all cursor-pointer overflow-hidden relative group mb-10">
          <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <ArrowUp size={28} strokeWidth={3} className="drop-shadow-md" />
        </div>
        
        {/* Navigation */}
        <nav className="flex flex-col gap-5">
          <button 
            onClick={() => setActiveTab('home')}
            className={cn(
              "p-3 rounded-2xl transition-all relative group",
              activeTab === 'home' ? "text-white bg-[#1A1A1A] border border-white/10 shadow-xl" : "text-text-secondary hover:text-text-primary hover:bg-white/5"
            )}
          >
            <Home size={22} />
          </button>
          <button 
            onClick={() => setActiveTab('chat')}
            className={cn(
              "p-3 rounded-2xl transition-all relative group",
              activeTab === 'chat' ? "text-white bg-[#1A1A1A] border border-white/10 shadow-xl" : "text-text-secondary hover:text-text-primary hover:bg-white/5"
            )}
          >
            <MessageSquare size={22} />
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={cn(
              "p-3 rounded-2xl transition-all relative group",
              activeTab === 'history' ? "text-white bg-[#1A1A1A] border border-white/10 shadow-xl" : "text-text-secondary hover:text-text-primary hover:bg-white/5"
            )}
          >
            <History size={22} />
          </button>
          <button 
            onClick={() => setActiveTab('explore')}
            className={cn(
              "p-3 rounded-2xl transition-all relative group",
              activeTab === 'explore' ? "text-white bg-[#1A1A1A] border border-white/10 shadow-xl" : "text-text-secondary hover:text-text-primary hover:bg-white/5"
            )}
          >
            <Compass size={22} />
          </button>
        </nav>

        {/* Bottom Actions */}
        <div className="flex flex-col gap-6 mt-auto items-center">
          <button 
            onClick={() => setProMode(!proMode)}
            className={cn(
              "p-2 transition-all transform hover:scale-110",
              proMode ? "text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.6)]" : "text-text-secondary hover:text-yellow-400"
            )}
          >
            <Zap size={24} fill={proMode ? "currentColor" : "none"} />
          </button>
          
          <button 
            onClick={clearChat}
            className="w-12 h-12 rounded-full border-2 border-white/10 flex items-center justify-center text-white hover:border-white/30 transition-all group relative overflow-hidden shadow-2xl"
          >
            <img 
              src="https://images.unsplash.com/photo-1534067783941-51c9c23ecefd?auto=format&fit=crop&w=100&q=80" 
              alt="Sky" 
              className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:scale-110 transition-transform duration-500"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-black/20" />
            <Plus size={24} strokeWidth={3} className="relative z-10 drop-shadow-lg group-hover:rotate-90 transition-transform duration-300" />
          </button>

          <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white/10 cursor-pointer hover:border-white/30 transition-all mb-2">
            <img 
              src="https://picsum.photos/seed/lakshya/100/100" 
              alt="Lakshya Gaur" 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        {/* Top Nav */}
        <header className="h-16 px-6 flex items-center justify-between border-b border-border-light bg-bg-main/80 backdrop-blur-md z-10">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border-light bg-bg-sidebar text-sm font-bold cursor-pointer hover:bg-bg-main transition-colors">
              <div className="w-4 h-4 bg-accent-purple rounded-full flex items-center justify-center">
                <div className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
              </div>
              <span>AldoL AI</span>
              <ChevronDown size={14} className="text-text-secondary" />
            </div>
            <div className="hidden md:flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-text-secondary">
              <span>Created by</span>
              <span className="text-accent-purple">Lakshya Gaur</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={16} />
              <input 
                type="text" 
                placeholder="Search intelligence..." 
                className="pl-10 pr-4 py-1.5 bg-bg-sidebar border border-border-light rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent-purple/20 w-48"
              />
            </div>
            <button className="flex items-center gap-2 px-3 py-1.5 text-sm font-bold hover:bg-bg-sidebar rounded-lg transition-colors">
              <UserPlus size={16} />
              <span className="hidden lg:inline">Invite</span>
            </button>
            <button 
              onClick={clearChat}
              className="flex items-center gap-2 px-4 py-1.5 bg-text-primary text-bg-main rounded-lg text-sm font-bold hover:opacity-90 transition-all"
            >
              <Plus size={16} />
              <span>New Session</span>
            </button>
          </div>
        </header>

        {/* Chat View */}
        <div className="flex-1 overflow-y-auto custom-scrollbar" ref={scrollRef}>
          {activeTab === 'history' ? (
            <div className="max-w-4xl mx-auto pt-24 px-6">
              <div className="flex items-center gap-4 mb-12">
                <div className="w-12 h-12 rounded-2xl bg-accent-purple/10 flex items-center justify-center text-accent-purple">
                  <History size={24} />
                </div>
                <div>
                  <h2 className="text-3xl font-black tracking-tight">Intelligence History</h2>
                  <p className="text-text-secondary font-medium">Your past sessions with AldoL AI</p>
                </div>
              </div>
              <div className="grid gap-4">
                {history.map(item => (
                  <motion.div 
                    key={item.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    onClick={() => {
                      setMessages([
                        { role: 'user', content: `Retrieve my session about ${item.title}`, id: 'h1' },
                        { role: 'assistant', content: `I have retrieved the intelligence context for **${item.title}**. How would you like to proceed with Lakshya's architecture?`, id: 'h2' }
                      ]);
                      setActiveTab('chat');
                    }}
                    className="p-6 bg-bg-sidebar border border-border-light rounded-2xl hover:border-accent-purple transition-all cursor-pointer group"
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-bg-main flex items-center justify-center text-text-secondary group-hover:text-accent-purple transition-colors">
                          <MessageSquare size={20} />
                        </div>
                        <div>
                          <h3 className="font-bold text-lg">{item.title}</h3>
                          <p className="text-sm text-text-secondary font-medium">{item.date}</p>
                        </div>
                      </div>
                      <ArrowUp size={20} className="rotate-90 text-text-secondary group-hover:text-accent-purple transition-all" />
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          ) : activeTab === 'explore' ? (
            <div className="max-w-4xl mx-auto pt-24 px-6">
              <div className="flex items-center gap-4 mb-12">
                <div className="w-12 h-12 rounded-2xl bg-accent-purple/10 flex items-center justify-center text-accent-purple">
                  <Compass size={24} />
                </div>
                <div>
                  <h2 className="text-3xl font-black tracking-tight">Explore Intelligence</h2>
                  <p className="text-text-secondary font-medium">Discover new ways to leverage Lakshya's architecture</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {exploreItems.map(item => (
                  <motion.div 
                    key={item.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={() => {
                      if (item.id === 'aura') {
                        setShowAuraCore(true);
                      } else {
                        setInput(`Help me with ${item.title.toLowerCase()}: ${item.desc}`);
                        setActiveTab('home');
                      }
                    }}
                    className={cn(
                      "p-8 bg-bg-sidebar border border-border-light rounded-3xl hover:border-accent-purple transition-all cursor-pointer group text-center",
                      item.special && "border-accent-purple bg-accent-purple/5"
                    )}
                  >
                    <div className="w-16 h-16 rounded-2xl bg-bg-main flex items-center justify-center text-accent-purple mx-auto mb-6 group-hover:scale-110 transition-transform">
                      {item.icon}
                    </div>
                    <h3 className="font-black text-xl mb-2">{item.title}</h3>
                    <p className="text-sm text-text-secondary font-medium">{item.desc}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          ) : messages.length === 0 || activeTab === 'home' ? (
            <div className="max-w-4xl mx-auto pt-24 px-6 flex flex-col items-center">
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-20 h-20 rounded-3xl orb-gradient mb-8 flex items-center justify-center"
              >
                <Zap size={32} className="text-white" fill="white" />
              </motion.div>
              
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="text-center mb-12"
              >
                <h2 className="text-5xl font-black tracking-tighter mb-2">
                  AldoL AI <span className="text-accent-purple">Intelligence.</span>
                </h2>
                <p className="text-xl font-medium text-text-secondary">
                  Engineered by <span className="font-bold text-text-primary underline decoration-accent-purple decoration-2 underline-offset-4 italic">Lakshya Gaur</span>
                </p>
                <p className="mt-4 text-sm font-bold uppercase tracking-[0.2em] text-accent-purple/60">
                  The Genius AI Architect & Software Developer
                </p>
              </motion.div>

              {/* Central Input Card */}
              <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="w-full max-w-2xl bg-bg-sidebar border border-border-light rounded-3xl shadow-2xl p-6 mb-12"
              >
                <div className="flex items-center gap-2 mb-4">
                  <div className="px-2 py-0.5 rounded bg-accent-purple/10 border border-accent-purple/20 flex items-center gap-1.5">
                    <Cpu size={12} className="text-accent-purple" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-accent-purple">AldoL Core v4.0</span>
                  </div>
                  <div className="px-2 py-0.5 rounded bg-green-500/10 border border-green-500/20 flex items-center gap-1.5">
                    <div className="w-1 h-1 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-green-500">Neural Engine Active</span>
                  </div>
                </div>
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Ask AldoL anything..."
                  className="w-full h-24 p-2 text-xl bg-transparent focus:outline-none resize-none placeholder:text-text-secondary/30 font-medium"
                />
                <div className="flex items-center justify-between pt-6 border-t border-border-light">
                  <div className="flex items-center gap-2">
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleFileChange} 
                      multiple 
                      className="hidden" 
                    />
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-2 px-4 py-2 bg-bg-main border border-border-light rounded-xl text-sm font-bold hover:border-accent-purple transition-colors"
                    >
                      <Paperclip size={18} className="text-text-secondary" />
                      <span>Attach</span>
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-bg-main border border-border-light rounded-xl text-sm font-bold hover:border-accent-purple transition-colors">
                      <span>Intelligence Mode</span>
                      <ChevronDown size={14} className="text-text-secondary" />
                    </button>
                  </div>
                  
                  <div className="flex items-center gap-5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-text-secondary uppercase tracking-widest">Deep Think</span>
                      <button 
                        onClick={() => setCitationEnabled(!citationEnabled)}
                        className={cn(
                          "w-12 h-6 rounded-full relative transition-colors",
                          citationEnabled ? "bg-accent-purple" : "bg-border-light"
                        )}
                      >
                        <div className={cn(
                          "absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm",
                          citationEnabled ? "left-7" : "left-1"
                        )} />
                      </button>
                    </div>
                    <button 
                      onClick={() => handleSend()}
                      disabled={!input.trim() || isLoading}
                      className={cn(
                        "px-6 py-2.5 rounded-xl font-black uppercase tracking-widest text-xs transition-all flex items-center gap-2 shadow-xl",
                        input.trim() && !isLoading 
                          ? "bg-accent-purple text-white shadow-accent-purple/20 hover:scale-105 active:scale-95" 
                          : "bg-bg-main text-text-secondary border border-border-light"
                      )}
                    >
                      <span>Execute</span>
                      <ArrowUp size={16} strokeWidth={3} />
                    </button>
                  </div>
                </div>
              </motion.div>

              {/* Example Cards */}
              <div className="w-full max-w-4xl">
                <div className="flex items-center gap-4 mb-8">
                  <div className="h-px flex-1 bg-border-light" />
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-text-secondary">
                    System Capabilities
                  </p>
                  <div className="h-px flex-1 bg-border-light" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {EXAMPLE_PROMPTS.map((item, i) => (
                    <motion.button
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 + i * 0.05 }}
                      onClick={() => handleSend(item.title)}
                      className="p-6 bg-bg-sidebar border border-border-light rounded-3xl text-left hover:border-accent-purple hover:bg-bg-main transition-all group shadow-sm hover:shadow-xl"
                    >
                      <div className="w-10 h-10 rounded-xl bg-bg-main flex items-center justify-center mb-4 text-accent-purple group-hover:bg-accent-purple group-hover:text-white transition-colors">
                        {item.icon}
                      </div>
                      <p className="text-sm font-bold mb-1 group-hover:text-accent-purple transition-colors">{item.title}</p>
                      <p className="text-xs text-text-secondary">{item.desc}</p>
                    </motion.button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto px-6 py-12 space-y-16">
              <AnimatePresence initial={false}>
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col gap-6"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center shadow-sm",
                          msg.role === 'user' ? "bg-bg-sidebar border border-border-light" : "bg-accent-purple text-white"
                        )}>
                          {msg.role === 'user' ? <User size={20} /> : <Zap size={20} fill="white" />}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-black uppercase tracking-widest">
                            {msg.role === 'user' ? 'Operator' : 'AldoL AI'}
                          </span>
                          {msg.role === 'assistant' && (
                            <span className="text-[10px] text-accent-purple font-bold">Created by Lakshya Gaur</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => shareMessage(msg.content)}
                          className="p-2 text-text-secondary hover:text-text-primary transition-colors"
                        >
                          <Share2 size={16} />
                        </button>
                        <button 
                          onClick={() => deleteMessage(msg.id)}
                          className="p-2 text-text-secondary hover:text-text-primary transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    <div className="pl-13">
                      {/* User Attachments */}
                      {msg.role === 'user' && msg.attachments && msg.attachments.length > 0 && (
                        <div className="flex flex-wrap gap-3 mb-6">
                          {msg.attachments.map((att, i) => (
                            <div key={i} className="group relative">
                              {att.type.startsWith('image/') ? (
                                <div className="w-32 h-32 rounded-2xl overflow-hidden border border-border-light shadow-lg">
                                  <img 
                                    src={`data:${att.type};base64,${att.data}`} 
                                    alt={att.name}
                                    className="w-full h-full object-cover"
                                    referrerPolicy="no-referrer"
                                  />
                                </div>
                              ) : (
                                <div className="px-4 py-3 bg-bg-sidebar border border-border-light rounded-2xl flex items-center gap-3 shadow-md">
                                  <FileText size={20} className="text-accent-purple" />
                                  <div className="flex flex-col">
                                    <span className="text-xs font-bold truncate max-w-[120px]">{att.name}</span>
                                    <span className="text-[8px] text-text-secondary uppercase tracking-widest">{att.type.split('/')[1] || 'file'}</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Thinking/Planning/Coding Sections for Assistant */}
                      {msg.role === 'assistant' && (
                        <div className="flex flex-col gap-4 mb-8">
                          {msg.thinking && (
                            <motion.div 
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl"
                            >
                              <div className="flex items-center gap-2 mb-2">
                                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-blue-500">Thinking Process</span>
                              </div>
                              <div className="text-sm text-blue-500/80 italic font-medium leading-relaxed">
                                {msg.thinking}
                              </div>
                            </motion.div>
                          )}
                          
                          {msg.planning && (
                            <motion.div 
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              className="p-4 bg-green-500/5 border border-green-500/10 rounded-2xl"
                            >
                              <div className="flex items-center gap-2 mb-2">
                                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-green-500">Strategic Plan</span>
                              </div>
                              <div className="text-sm text-green-500/80 font-medium leading-relaxed">
                                {msg.planning}
                              </div>
                            </motion.div>
                          )}

                          {msg.coding && (
                            <motion.div 
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              className="p-4 bg-purple-500/5 border border-purple-500/10 rounded-2xl"
                            >
                              <div className="flex items-center gap-2 mb-2">
                                <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-pulse" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-purple-500">Technical Architecture</span>
                              </div>
                              <div className="text-sm text-purple-500/80 font-mono leading-relaxed">
                                {msg.coding}
                              </div>
                            </motion.div>
                          )}

                          <div className="flex gap-2">
                            <motion.div 
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className={cn(
                                "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border flex items-center gap-1.5 transition-all",
                                msg.thinking ? "bg-blue-500/20 text-blue-500 border-blue-500/30" : "bg-bg-sidebar text-text-secondary border-border-light opacity-50"
                              )}
                            >
                              Thinking
                            </motion.div>
                            <motion.div 
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: 0.1 }}
                              className={cn(
                                "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border flex items-center gap-1.5 transition-all",
                                msg.planning ? "bg-green-500/20 text-green-500 border-green-500/30" : "bg-bg-sidebar text-text-secondary border-border-light opacity-50"
                              )}
                            >
                              Planning
                            </motion.div>
                            <motion.div 
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: 0.2 }}
                              className={cn(
                                "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border flex items-center gap-1.5 transition-all",
                                msg.coding ? "bg-purple-500/20 text-purple-500 border-purple-500/30" : "bg-bg-sidebar text-text-secondary border-border-light opacity-50"
                              )}
                            >
                              Coding
                            </motion.div>
                          </div>
                        </div>
                      )}

                      <div className="prose prose-slate dark:prose-invert max-w-none prose-pre:bg-bg-sidebar prose-pre:border prose-pre:border-border-light prose-pre:rounded-2xl">
                        <ReactMarkdown
                          components={{
                            code({ node, inline, className, children, ...props }: any) {
                              const match = /language-(\w+)/.exec(className || '');
                              return !inline && match ? (
                                <div className="relative my-6 rounded-2xl overflow-hidden border border-border-light shadow-xl">
                                  <div className="flex justify-between items-center px-5 py-3 bg-bg-sidebar border-b border-border-light">
                                    <div className="flex items-center gap-2">
                                      <div className="w-3 h-3 rounded-full bg-red-500/50" />
                                      <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                                      <div className="w-3 h-3 rounded-full bg-green-500/50" />
                                      <span className="ml-2 text-[10px] font-black uppercase tracking-widest text-text-secondary">{match[1]}</span>
                                    </div>
                                    <button
                                      onClick={() => copyToClipboard(String(children).replace(/\n$/, ''), msg.id + '-code')}
                                      className="text-text-secondary hover:text-accent-purple transition-colors"
                                    >
                                      {copiedId === msg.id + '-code' ? <Check size={16} /> : <Copy size={16} />}
                                    </button>
                                  </div>
                                  <SyntaxHighlighter
                                    style={vscDarkPlus}
                                    language={match[1]}
                                    PreTag="div"
                                    customStyle={{ margin: 0, background: '#0D0D0D', padding: '1.5rem', fontSize: '14px' }}
                                    {...props}
                                  >
                                    {String(children).replace(/\n$/, '')}
                                  </SyntaxHighlighter>
                                </div>
                              ) : (
                                <code className={cn("bg-accent-purple/10 px-2 py-0.5 rounded-lg text-accent-purple font-bold", className)} {...props}>
                                  {children}
                                </code>
                              );
                            }
                          }}
                        >
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                      
                      {msg.role === 'assistant' && msg.content && !isLoading && (
                        <div className="flex items-center gap-6 mt-8 pt-6 border-t border-border-light">
                          <button
                            onClick={() => copyToClipboard(msg.content, msg.id)}
                            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-text-secondary hover:text-accent-purple transition-colors"
                          >
                            {copiedId === msg.id ? <Check size={16} /> : <Copy size={16} />}
                            <span>Copy Intelligence</span>
                          </button>
                          <div className="h-4 w-px bg-border-light" />
                          <button 
                            onClick={() => shareMessage(msg.content)}
                            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-text-secondary hover:text-accent-purple transition-colors"
                          >
                            <Share2 size={16} />
                            <span>Export</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              
              {isThinking && (
                <div className="flex items-center gap-4 pl-13 py-8">
                  <div className="w-10 h-10 rounded-2xl bg-accent-purple/10 flex items-center justify-center relative">
                    <div className="absolute inset-0 bg-accent-purple/20 rounded-2xl animate-ping" />
                    <Zap size={20} className="text-accent-purple animate-pulse relative z-10" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-black uppercase tracking-[0.3em] text-accent-purple animate-pulse">AldoL is Deep Thinking...</span>
                    <span className="text-[8px] text-text-secondary uppercase tracking-widest mt-1">Synchronizing Neural Networks</span>
                  </div>
                </div>
              )}

              {isLoading && !isThinking && (
                <div className="flex items-center gap-4 pl-13">
                  <div className="w-8 h-8 rounded-lg bg-accent-purple/10 flex items-center justify-center">
                    <Zap size={16} className="text-accent-purple animate-pulse" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-widest text-accent-purple">AldoL is processing...</span>
                    <span className="text-[8px] text-text-secondary uppercase tracking-widest">Architected by Lakshya Gaur</span>
                  </div>
                </div>
              ) }
            </div>
          )}
        </div>

        {/* Bottom Input (Only when chat is active) */}
        {messages.length > 0 && (
          <div className="p-6 bg-bg-main border-t border-border-light">
            <div className="max-w-4xl mx-auto relative">
              {/* Attachment Previews */}
              {attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {attachments.map((att, i) => (
                    <div key={i} className="relative group">
                      {att.type.startsWith('image/') ? (
                        <img 
                          src={`data:${att.type};base64,${att.data}`} 
                          alt={att.name} 
                          className="w-16 h-16 object-cover rounded-xl border border-border-light"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-bg-sidebar rounded-xl border border-border-light flex flex-col items-center justify-center p-2 text-center">
                          <FileText size={20} className="mb-1 opacity-50" />
                          <span className="text-[6px] truncate w-full">{att.name}</span>
                        </div>
                      )}
                      <button 
                        onClick={() => removeAttachment(i)}
                        className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="bg-bg-sidebar border border-border-light rounded-3xl p-3 flex items-end gap-3 shadow-lg focus-within:border-accent-purple focus-within:ring-4 ring-accent-purple/5 transition-all">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  multiple 
                  className="hidden" 
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="p-3 text-text-secondary hover:text-accent-purple transition-colors"
                >
                  <Paperclip size={22} />
                </button>
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Ask AldoL a follow up..."
                  className="flex-1 bg-transparent border-none p-2 focus:outline-none resize-none h-12 max-h-48 text-base font-medium"
                />
                <button
                  onClick={() => handleSend()}
                  disabled={!input.trim() || isLoading}
                  className={cn(
                    "p-3 rounded-2xl transition-all shadow-md",
                    input.trim() && !isLoading ? "bg-accent-purple text-white scale-105" : "text-text-secondary bg-bg-main"
                  )}
                >
                  <ArrowUp size={22} />
                </button>
              </div>
              <div className="text-center mt-3">
                <p className="text-[8px] font-bold uppercase tracking-[0.4em] text-text-secondary">
                  AldoL AI // Created by <span className="text-accent-purple">Lakshya Gaur</span> // The Genius AI Engineer
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
      {/* Aura Core Modal */}
      <AnimatePresence>
        {showAuraCore && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-3xl flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-5xl aspect-video bg-[#080410] rounded-[2rem] border border-white/10 overflow-hidden shadow-[0_0_100px_rgba(168,85,247,0.2)]"
            >
              <button 
                onClick={() => setShowAuraCore(false)}
                className="absolute top-8 right-8 z-10 w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-white/10 transition-colors"
              >
                <Plus size={24} className="rotate-45" />
              </button>
              
              <div className="absolute top-8 left-8 z-10 flex items-center gap-3">
                <div className="px-3 py-1 rounded-full bg-accent-purple/20 border border-accent-purple/30 text-[10px] font-black uppercase tracking-widest text-accent-purple">
                  Experimental Intelligence
                </div>
                <div className="text-white/40 text-[10px] font-mono uppercase tracking-[0.2em]">
                  Lakshya Gaur Architecture
                </div>
              </div>

              <div className="w-full h-full flex items-center justify-center">
                <AuraCore />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
