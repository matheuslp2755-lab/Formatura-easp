import React, { useEffect, useRef, useState, useCallback } from 'react';
import { geminiService } from '../services/geminiService';
import { floatTo16BitPCM, arrayBufferToBase64, decodeAudioData } from '../services/audioUtils';
import { BroadcastMessage } from '../types';

export const AdminPanel: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLive, setIsLive] = useState(false);
  const [isAiEnabled, setIsAiEnabled] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Pronto para iniciar");
  
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);

  // Initialize Broadcast Channel
  useEffect(() => {
    broadcastChannelRef.current = new BroadcastChannel('easp_2025_stream');
    return () => {
      broadcastChannelRef.current?.close();
    };
  }, []);

  // Initialize Camera
  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { width: 1280, height: 720 }, 
          audio: true 
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Error accessing camera:", err);
        setStatusMessage("Erro ao acessar câmera. Verifique permissões.");
      }
    };
    startCamera();
  }, []);

  // Broadcasting Loop (Frames)
  useEffect(() => {
    let intervalId: number;

    if (isLive) {
      intervalId = window.setInterval(() => {
        if (videoRef.current && canvasRef.current && broadcastChannelRef.current) {
          const ctx = canvasRef.current.getContext('2d');
          if (ctx) {
            // Draw video to canvas
            ctx.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
            
            // Get data URL (JPEG low quality for speed in broadcast channel)
            const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.6);
            
            // Broadcast to viewers
            const message: BroadcastMessage = {
              type: 'VIDEO_FRAME',
              payload: dataUrl,
              timestamp: Date.now()
            };
            broadcastChannelRef.current.postMessage(message);

            // Send to Gemini if AI is enabled (lower frequency to save tokens/bandwidth)
            if (isAiEnabled && Date.now() % 1000 < 100) { // Approx once per second
               const base64Image = dataUrl.split(',')[1];
               geminiService.sendVideoFrame(base64Image);
            }
          }
        }
      }, 100); // 10 FPS for BroadcastChannel stability
    }

    return () => clearInterval(intervalId);
  }, [isLive, isAiEnabled]);

  // Handle AI Audio Input (Mic -> Gemini)
  useEffect(() => {
    let scriptProcessor: ScriptProcessorNode | null = null;
    let source: MediaStreamAudioSourceNode | null = null;
    let audioCtx: AudioContext | null = null;

    if (isAiEnabled) {
      const setupAudio = async () => {
        try {
           const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
           audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
           source = audioCtx.createMediaStreamSource(stream);
           
           // Use ScriptProcessor for raw PCM access (deprecated but reliable for this specific raw buffer need)
           // In production, AudioWorklet is preferred but requires separate file loading which is complex here.
           scriptProcessor = audioCtx.createScriptProcessor(4096, 1, 1);
           
           scriptProcessor.onaudioprocess = (e) => {
             const inputData = e.inputBuffer.getChannelData(0);
             const pcmData = floatTo16BitPCM(inputData);
             const base64Audio = arrayBufferToBase64(pcmData.buffer);
             geminiService.sendAudioChunk(base64Audio);
           };

           source.connect(scriptProcessor);
           scriptProcessor.connect(audioCtx.destination);
           
           // Connect to Gemini
           await geminiService.connect({
             onOpen: () => setStatusMessage("AI Conectada e Analisando..."),
             onClose: () => setStatusMessage("AI Desconectada"),
             onError: () => setStatusMessage("Erro na AI"),
             onAudioData: async (base64Audio) => {
                // Playback AI Commentary locally for Admin to hear
                // In a real app, we would mix this into the broadcast stream
                if (!audioContextRef.current) {
                   audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
                }
                const ctx = audioContextRef.current;
                const audioBuffer = await decodeAudioData(base64Audio, ctx);
                
                const source = ctx.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(ctx.destination);
                
                const now = ctx.currentTime;
                // Simple scheduling to prevent overlap/gaps
                const startTime = Math.max(now, nextStartTimeRef.current);
                source.start(startTime);
                nextStartTimeRef.current = startTime + audioBuffer.duration;
             }
           });

        } catch (e) {
          console.error("Audio setup error", e);
        }
      };
      setupAudio();
    } else {
      geminiService.disconnect();
    }

    return () => {
      source?.disconnect();
      scriptProcessor?.disconnect();
      audioCtx?.close();
    };
  }, [isAiEnabled]);


  const toggleLive = () => {
    setIsLive(!isLive);
    if (!isLive) {
      broadcastChannelRef.current?.postMessage({ type: 'STATUS_UPDATE', payload: true, timestamp: Date.now() });
      setStatusMessage("AO VIVO - Transmitindo");
    } else {
      broadcastChannelRef.current?.postMessage({ type: 'STATUS_UPDATE', payload: false, timestamp: Date.now() });
      setStatusMessage("Transmissão Parada");
      setIsAiEnabled(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-4">
      <div className="w-full max-w-4xl bg-gray-800 rounded-xl overflow-hidden shadow-2xl border border-gray-700">
        <div className="bg-gradient-to-r from-red-900 to-red-700 p-4 flex justify-between items-center">
          <h2 className="text-xl font-bold serif tracking-wider">Painel Administrativo - MPLAY</h2>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${isLive ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
            <span className="text-sm font-semibold">{isLive ? 'NO AR' : 'OFFLINE'}</span>
          </div>
        </div>

        <div className="relative aspect-video bg-black">
          <video 
            ref={videoRef} 
            autoPlay 
            muted 
            playsInline 
            className="w-full h-full object-cover"
          />
          {/* Hidden Canvas for processing */}
          <canvas ref={canvasRef} width={1280} height={720} className="hidden" />
          
          <div className="absolute bottom-4 left-4 bg-black/60 px-3 py-1 rounded text-sm text-gray-300 backdrop-blur-sm">
            Status: {statusMessage}
          </div>
        </div>

        <div className="p-6 flex flex-col md:flex-row gap-4 justify-between items-center bg-gray-800">
          <div className="flex gap-4">
             <button
              onClick={toggleLive}
              className={`px-6 py-3 rounded-lg font-bold shadow-lg transition-all transform hover:scale-105 ${
                isLive 
                  ? 'bg-red-600 hover:bg-red-700 text-white' 
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              {isLive ? 'Encerrar Transmissão' : 'Iniciar Transmissão'}
            </button>

            <button
              onClick={() => setIsAiEnabled(!isAiEnabled)}
              disabled={!isLive}
              className={`px-6 py-3 rounded-lg font-bold shadow-lg transition-all ${
                !isLive ? 'opacity-50 cursor-not-allowed bg-gray-600' :
                isAiEnabled 
                  ? 'bg-purple-600 hover:bg-purple-700 text-white ring-2 ring-purple-400' 
                  : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
              }`}
            >
              {isAiEnabled ? '🤖 Narrador AI Ativo' : '🎙️ Ativar Narrador AI'}
            </button>
          </div>
          
          <div className="text-xs text-gray-500 max-w-xs text-right">
            <p>Nota: Mantenha esta aba aberta para transmitir.</p>
            <p>Os espectadores devem estar no mesmo navegador para a Demo.</p>
          </div>
        </div>
      </div>
    </div>
  );
};