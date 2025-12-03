import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';

interface GeminiCallbacks {
  onOpen: () => void;
  onAudioData: (base64Audio: string) => void;
  onClose: () => void;
  onError: (error: Error) => void;
}

export class GeminiLiveService {
  private client: GoogleGenAI;
  private session: any = null; // Session type is internal to library, using any for flexibility here
  
  constructor() {
    this.client = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  async connect(callbacks: GeminiCallbacks) {
    try {
      this.session = await this.client.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            console.log('Gemini Live Connected');
            callbacks.onOpen();
          },
          onmessage: (message: LiveServerMessage) => {
            // Handle audio output from the model (Commentary)
            const audioData = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audioData) {
              callbacks.onAudioData(audioData);
            }
          },
          onclose: () => {
            console.log('Gemini Live Closed');
            callbacks.onClose();
          },
          onerror: (e: any) => {
            console.error('Gemini Live Error', e);
            callbacks.onError(new Error('Connection error'));
          },
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
          },
          systemInstruction: `
            Você é um narrador profissional e entusiasmado de uma formatura (Formatura EASP 2025). 
            Seu trabalho é descrever o que você vê na câmera e parabenizar os formandos.
            Mantenha comentários curtos, solenes e festivos. Fale em Português do Brasil.
            Se não houver muita ação, faça comentários genéricos sobre a importância da educação e o futuro brilhante dos alunos.
          `,
        },
      });
      return true;
    } catch (error) {
      console.error('Failed to connect to Gemini:', error);
      return false;
    }
  }

  async sendVideoFrame(base64Image: string) {
    if (this.session) {
      try {
        await this.session.sendRealtimeInput({
          media: {
            mimeType: 'image/jpeg',
            data: base64Image
          }
        });
      } catch (e) {
        console.error("Error sending frame to Gemini", e);
      }
    }
  }

  async sendAudioChunk(base64Audio: string) {
    if (this.session) {
       try {
        await this.session.sendRealtimeInput({
          media: {
            mimeType: 'audio/pcm;rate=16000',
            data: base64Audio
          }
        });
      } catch (e) {
        console.error("Error sending audio to Gemini", e);
      }
    }
  }

  disconnect() {
    // There isn't an explicit disconnect method exposed easily on the session object 
    // in the current snippet patterns, but we can stop sending data.
    // In a real scenario, we might close the WebSocket if accessible.
    this.session = null;
  }
}

export const geminiService = new GeminiLiveService();