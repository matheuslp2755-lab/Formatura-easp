import React, { useEffect, useState, useRef } from 'react';
import { BroadcastMessage, ChatMessage } from '../types';

interface ViewerPageProps {
  onAdminClick: () => void;
}

export const ViewerPage: React.FC<ViewerPageProps> = ({ onAdminClick }) => {
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [waitingMessage, setWaitingMessage] = useState("Aguardando início da transmissão...");
  
  // Chat State
  const [comments, setComments] = useState<ChatMessage[]>([]);
  const [newComment, setNewComment] = useState("");
  const [userName, setUserName] = useState("Espectador");
  
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    broadcastChannelRef.current = new BroadcastChannel('easp_2025_stream');
    
    broadcastChannelRef.current.onmessage = (event) => {
      const message = event.data as BroadcastMessage;
      
      if (message.type === 'VIDEO_FRAME') {
        setVideoSrc(message.payload as string);
        if (!isLive) setIsLive(true);
      } else if (message.type === 'STATUS_UPDATE') {
        const live = message.payload as boolean;
        setIsLive(live);
        if (!live) {
          setVideoSrc(null);
          setWaitingMessage("A transmissão foi encerrada.");
        }
      } else if (message.type === 'COMMENT') {
        setComments(prev => [...prev, message.payload as ChatMessage]);
      }
    };

    return () => {
      broadcastChannelRef.current?.close();
    };
  }, [isLive]);

  // Auto-scroll chat
  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments]);

  const handleSendComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    const commentData: ChatMessage = {
      id: Date.now().toString(),
      user: userName,
      text: newComment,
      timestamp: Date.now()
    };

    // Update local state
    setComments(prev => [...prev, commentData]);
    
    // Broadcast to other viewers/admin
    broadcastChannelRef.current?.postMessage({
      type: 'COMMENT',
      payload: commentData,
      timestamp: Date.now()
    });

    setNewComment("");
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-900 text-slate-100">
      {/* Header */}
      <header className="py-8 text-center bg-gradient-to-b from-slate-950 to-slate-900 border-b border-slate-800">
        <h1 className="text-4xl md:text-6xl font-bold serif text-amber-500 mb-2 drop-shadow-md">
          Formatura EASP 2025
        </h1>
        <p className="text-slate-400 uppercase tracking-[0.2em] text-sm md:text-base">
          Cerimônia Oficial de Colação de Grau
        </p>
      </header>

      {/* Main Content */}
      <main className="flex-grow flex flex-col items-center p-4 md:p-8 gap-8">
        
        {/* Video Player Section */}
        <div className="w-full max-w-6xl aspect-video bg-black rounded-lg shadow-2xl overflow-hidden border border-slate-700 relative group">
          {isLive && videoSrc ? (
            <>
              <img 
                src={videoSrc} 
                alt="Transmissão ao vivo" 
                className="w-full h-full object-cover"
              />
              <div className="absolute top-4 right-4 flex items-center gap-2 bg-red-600/90 px-3 py-1 rounded-full backdrop-blur-sm">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                <span className="text-xs font-bold text-white">AO VIVO</span>
              </div>
            </>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 bg-slate-950">
              <svg className="w-20 h-20 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <p className="text-xl font-medium animate-pulse">{waitingMessage}</p>
            </div>
          )}
        </div>

        {/* Info & Chat Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full max-w-6xl">
          
          {/* Left Column: Info */}
          <div className="lg:col-span-1 space-y-4">
             <div className="bg-slate-800/50 p-6 rounded-lg border border-slate-700 h-full">
                <h3 className="text-amber-500 font-bold text-xl mb-4 serif border-b border-slate-700 pb-2">Informações</h3>
                <div className="mb-4">
                  <h4 className="text-slate-300 font-semibold">Horário</h4>
                  <p className="text-slate-400 text-sm">Início previsto: 19:00h (Brasília)</p>
                </div>
                <div className="mt-8 p-4 bg-slate-900/50 rounded-lg">
                  <p className="text-slate-400 text-xs italic">
                    "O sucesso é a soma de pequenos esforços repetidos dia após dia."
                  </p>
                </div>
             </div>
          </div>

          {/* Right Column: Comments (Chat) */}
          <div className="lg:col-span-2 bg-slate-800/50 rounded-lg border border-slate-700 flex flex-col h-[400px]">
            <div className="p-4 border-b border-slate-700 bg-slate-800 rounded-t-lg">
              <h3 className="text-amber-500 font-bold serif">Comentários ao Vivo</h3>
            </div>
            
            {/* Messages List */}
            <div className="flex-grow overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {comments.length === 0 ? (
                <p className="text-center text-slate-500 text-sm mt-10">Seja o primeiro a comentar!</p>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="animate-fade-in">
                    <span className="font-bold text-slate-300 text-sm">{comment.user}: </span>
                    <span className="text-slate-200 text-sm break-words">{comment.text}</span>
                  </div>
                ))
              )}
              <div ref={commentsEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-slate-900/50 border-t border-slate-700 rounded-b-lg">
              <form onSubmit={handleSendComment} className="flex gap-2">
                 <input 
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-1/4 bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                  placeholder="Seu Nome"
                  required
                />
                <input 
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="flex-grow bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                  placeholder="Digite uma mensagem..."
                />
                <button 
                  type="submit" 
                  className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded text-sm font-bold transition-colors"
                >
                  Enviar
                </button>
              </form>
            </div>
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="py-6 bg-slate-950 border-t border-slate-800 text-center">
        <div className="flex flex-col items-center justify-center">
          <p className="text-slate-500 text-sm mb-1">Transmissão realizada por</p>
          <button 
            onClick={onAdminClick}
            className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-purple-600 tracking-tighter hover:opacity-80 transition-opacity cursor-pointer border-none bg-transparent"
            title="Acesso Administrativo"
          >
            MPLAY
          </button>
          <p className="text-slate-600 text-xs mt-4">© 2025 MPLAY Streaming Solutions.</p>
        </div>
      </footer>
    </div>
  );
};