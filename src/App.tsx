import { useEffect, useRef, useState } from 'react';
import { Music as MusicIcon } from 'lucide-react';
import AudioPad from './components/AudioPad';
import Player from './components/Player';
import { AudioPadData, PlayingAudio } from './types/audio';
import { savePad, getAllPads } from './lib/persistence';

const GRADIENT_COLORS = [
  'bg-gradient-to-br from-pink-500 to-rose-600',
  'bg-gradient-to-br from-rose-500 to-pink-600',
  'bg-gradient-to-br from-purple-500 to-violet-600',
  'bg-gradient-to-br from-pink-500 to-rose-600',
  'bg-gradient-to-br from-rose-500 to-pink-600',
  'bg-gradient-to-br from-blue-500 to-cyan-600',
  'bg-gradient-to-br from-blue-400 to-blue-600',
  'bg-gradient-to-br from-fuchsia-500 to-pink-600',
  'bg-gradient-to-br from-emerald-400 to-green-500',
  'bg-gradient-to-br from-amber-400 to-orange-500',
  'bg-gradient-to-br from-rose-500 to-pink-600',
  'bg-gradient-to-br from-blue-400 to-blue-600',
];

const PANEL_2_COLORS = [
  'bg-gradient-to-br from-teal-500 to-cyan-600',
  'bg-gradient-to-br from-cyan-500 to-blue-600',
  'bg-gradient-to-br from-indigo-500 to-purple-600',
  'bg-gradient-to-br from-lime-500 to-green-600',
  'bg-gradient-to-br from-green-500 to-emerald-600',
  'bg-gradient-to-br from-orange-500 to-red-600',
  'bg-gradient-to-br from-red-500 to-pink-600',
  'bg-gradient-to-br from-yellow-500 to-orange-600',
  'bg-gradient-to-br from-teal-400 to-cyan-500',
  'bg-gradient-to-br from-violet-500 to-purple-600',
  'bg-gradient-to-br from-sky-500 to-blue-600',
  'bg-gradient-to-br from-lime-400 to-green-500',
];

function defaultPads(start = 0, colors = GRADIENT_COLORS): AudioPadData[] {
  return Array.from({ length: 12 }, (_, i) => ({
    id: start + i,
    file: null,
    fileName: null,
    audioUrl: null,
    color: colors[i],
  }));
}

export default function App() {
  const [currentPanel, setCurrentPanel] = useState<number>(1);
  const [pads1, setPads1] = useState<AudioPadData[]>(() => defaultPads(0, GRADIENT_COLORS));
  const [pads2, setPads2] = useState<AudioPadData[]>(() => defaultPads(12, PANEL_2_COLORS));
  const [playingAudio, setPlayingAudio] = useState<PlayingAudio | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const audioRefs = useRef<Map<number, HTMLAudioElement>>(new Map());

  const pads = currentPanel === 1 ? pads1 : pads2;

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const stored = await getAllPads();
        if (!mounted || !stored || stored.length === 0) return;

        setPads1((prev) => {
          const next = [...prev];
          for (const rec of stored) {
            if (rec.id >= 0 && rec.id < 12 && rec.blob) {
              const url = URL.createObjectURL(rec.blob);
              const file = rec.fileName ? new File([rec.blob], rec.fileName) : null;
              next[rec.id] = { ...next[rec.id], file: file as File | null, fileName: rec.fileName, audioUrl: url };
            }
          }
          return next;
        });

        setPads2((prev) => {
          const next = [...prev];
          for (const rec of stored) {
            if (rec.id >= 12 && rec.id < 24 && rec.blob) {
              const idx = rec.id - 12;
              const url = URL.createObjectURL(rec.blob);
              const file = rec.fileName ? new File([rec.blob], rec.fileName) : null;
              next[idx] = { ...next[idx], file: file as File | null, fileName: rec.fileName, audioUrl: url };
            }
          }
          return next;
        });
      } catch (err) {
        console.warn('Failed to load persisted pads', err);
      }
    })();

    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    return () => {
      mounted = false;
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const handleLoadAudio = (padId: number, file: File) => {
    const current = currentPanel === 1 ? pads1 : pads2;
    const pad = current.find((p) => p.id === padId);
    if (!pad) return;

    if (pad.audioUrl) URL.revokeObjectURL(pad.audioUrl);

    const existingAudio = audioRefs.current.get(padId);
    if (existingAudio) {
      existingAudio.pause();
      existingAudio.src = '';
    }

    const url = URL.createObjectURL(file);
    const updated = current.map((p) => (p.id === padId ? { ...p, file, fileName: file.name, audioUrl: url } : p));

    if (currentPanel === 1) setPads1(updated);
    else setPads2(updated);

    savePad(padId, file, file.name).catch((e) => console.error('persist error', e));
  };

  const handlePlayPause = (padId: number) => {
    const pad = pads.find((p) => p.id === padId);
    if (!pad || !pad.audioUrl) return;

    if (playingAudio && playingAudio.padId !== padId) {
      playingAudio.audio.pause();
      playingAudio.audio.currentTime = 0;
    }

    let audio = audioRefs.current.get(padId);
    if (!audio) {
      audio = new Audio(pad.audioUrl);
      audio.loop = true;
      audioRefs.current.set(padId, audio);
    }

    if (playingAudio?.padId === padId) {
      if (audio.paused) audio.play();
      else audio.pause();
    } else {
      audio.play();
      setPlayingAudio({ padId, audio });
    }
  };

  const handleClosePlayer = () => {
    if (!playingAudio) return;
    playingAudio.audio.pause();
    playingAudio.audio.currentTime = 0;
    setPlayingAudio(null);
  };

  const currentPad = playingAudio ? pads.find((p) => p.id === playingAudio.padId) : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-slate-900 to-slate-800 text-white px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-2">
            <MusicIcon size={40} className="text-cyan-400" />
            <h1 className="text-4xl font-bold">Donaire Play</h1>
          </div>
          <p className="text-gray-400 text-sm">Mantén presionado para cargar audio • Click para reproducir</p>

          <div className="mt-2 flex items-center justify-center">
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${isOnline ? 'bg-emerald-500 text-black' : 'bg-amber-600 text-white'}`}>
              {isOnline ? 'Conexión: Online' : 'Conexión: Offline'}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-center gap-4 mb-8">
          <button onClick={() => setCurrentPanel(1)} className={`flex items-center gap-2 px-6 py-2 rounded-lg font-semibold transition-all ${currentPanel === 1 ? 'bg-cyan-500 text-white shadow-lg' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>
            Panel 1
          </button>
          <button onClick={() => setCurrentPanel(2)} className={`flex items-center gap-2 px-6 py-2 rounded-lg font-semibold transition-all ${currentPanel === 2 ? 'bg-cyan-500 text-white shadow-lg' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>
            Panel 2
          </button>
        </div>

        {playingAudio && currentPad && (
          <div className="mb-6">
            <Player audio={playingAudio.audio} fileName={currentPad.fileName || ''} onClose={handleClosePlayer} />
          </div>
        )}

        <div className="grid grid-cols-3 gap-4 mb-8">
          {pads.map((pad) => (
            <AudioPad key={pad.id} pad={pad} isPlaying={playingAudio?.padId === pad.id && !playingAudio.audio.paused} onLoadAudio={handleLoadAudio} onPlayPause={handlePlayPause} />
          ))}
        </div>

        <div className="text-center text-gray-500 text-xs">
          <p>Mantén presionado cualquier pad para cargar audio</p>
        </div>
      </div>
    </div>
  );
}
