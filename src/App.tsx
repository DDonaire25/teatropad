import { useEffect, useRef, useState } from 'react';
import { Music as MusicIcon, Play as PlayIcon, Pause as PauseIcon } from 'lucide-react';
import AudioPad from './components/AudioPad';
import Player from './components/Player';
import { AudioPadData, PlayingAudio } from './types/audio';
import { savePad, getAllPads, deletePad } from './lib/persistence';

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
  const [playingAudio1, setPlayingAudio1] = useState<PlayingAudio | null>(null);
  const [playingAudio2, setPlayingAudio2] = useState<PlayingAudio | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const audioRefs = useRef<Map<number, HTMLAudioElement>>(new Map());
  const [isPlayingAll, setIsPlayingAll] = useState(false);
  const [playOnlyCurrentPanel, setPlayOnlyCurrentPanel] = useState(false);
  const playAllIndex = useRef(0);
  const playAllQueue = useRef<AudioPadData[]>([]);
  const playAllAudio = useRef<HTMLAudioElement | null>(null);
  const [currentPlayAllIndex, setCurrentPlayAllIndex] = useState<number | null>(null);

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

  const handleDeletePad = async (padId: number) => {
    // stop audio if playing or referenced
    const existingAudio = audioRefs.current.get(padId);
    if (existingAudio) {
      existingAudio.pause();
      existingAudio.src = '';
      audioRefs.current.delete(padId);
    }

    setPads1((prev) => {
      if (padId < 12) {
        const next = [...prev];
        const idx = padId;
        if (next[idx]?.audioUrl) {
          try { URL.revokeObjectURL(next[idx].audioUrl!); } catch {}
        }
        next[idx] = { ...next[idx], file: null, fileName: null, audioUrl: null };
        return next;
      }
      return prev;
    });

    setPads2((prev) => {
      if (padId >= 12) {
        const next = [...prev];
        const idx = padId - 12;
        if (next[idx]?.audioUrl) {
          try { URL.revokeObjectURL(next[idx].audioUrl!); } catch {}
        }
        next[idx] = { ...next[idx], file: null, fileName: null, audioUrl: null };
        return next;
      }
      return prev;
    });

    if (playingAudio1?.padId === padId) {
      playingAudio1.audio.pause();
      setPlayingAudio1(null);
    }
    if (playingAudio2?.padId === padId) {
      playingAudio2.audio.pause();
      setPlayingAudio2(null);
    }

    try {
      await deletePad(padId);
    } catch (e) {
      console.warn('error deleting pad', e);
    }
  };

  const handlePlayPause = (padId: number) => {
    const pad = pads1.concat(pads2).find((p) => p.id === padId);
    if (!pad || !pad.audioUrl) return;
    const isPanel1 = padId < 12;
    const playingAudio = isPanel1 ? playingAudio1 : playingAudio2;
    const setPlaying = isPanel1 ? setPlayingAudio1 : setPlayingAudio2;

    if (playingAudio && playingAudio.padId !== padId) {
      playingAudio.audio.pause();
      playingAudio.audio.currentTime = 0;
    }

    let audio = audioRefs.current.get(padId);
    if (!audio) {
      audio = new Audio(pad.audioUrl);
      // Play each pad only once (no looping)
      audio.loop = false;
      audioRefs.current.set(padId, audio);
    } else {
      // ensure no loop in case a previous run set it
      audio.loop = false;
    }

    if (playingAudio?.padId === padId) {
      if (audio.paused) audio.play();
      else audio.pause();
    } else {
      // if Play All is running, stop it when user starts a single pad
      if (isPlayingAll) stopPlayAll();

      // attach ended handler to clear playing state when done
      const clearOnEnd = () => {
        // ensure we only clear if the same pad is the tracked playing audio
        setTimeout(() => {
          const currentPlaying = isPanel1 ? playingAudio1 : playingAudio2;
          if (currentPlaying?.padId === padId) {
            // stop and clear
            if (isPanel1) setPlayingAudio1(null);
            else setPlayingAudio2(null);
          }
        }, 0);
      };

      audio.addEventListener('ended', clearOnEnd, { once: true });

      audio.play();
      setPlaying({ padId, audio });
    }
  };

  const stopPlayAll = () => {
    setIsPlayingAll(false);
    playAllQueue.current = [];
    playAllIndex.current = 0;
    if (playAllAudio.current) {
      try { playAllAudio.current.pause(); playAllAudio.current.currentTime = 0; } catch {}
      playAllAudio.current = null;
    }
    // clear playingAudio UI state
    if (playingAudio1) { try { playingAudio1.audio.pause(); } catch {} }
    if (playingAudio2) { try { playingAudio2.audio.pause(); } catch {} }
    setPlayingAudio1(null);
    setPlayingAudio2(null);
    setCurrentPlayAllIndex(null);
  };

  const playAll = (onlyCurrentPanel = false) => {
    // build queue from pads with audioUrl
    const allPads = onlyCurrentPanel ? pads : pads1.concat(pads2);
    const queue = allPads.filter(p => p.audioUrl);
    if (!queue.length) return;

    // stop any existing play all
    stopPlayAll();

    // stop any individually playing audio so Play All can take over the UI
    if (playingAudio1) {
      try { playingAudio1.audio.pause(); playingAudio1.audio.currentTime = 0; } catch {}
      setPlayingAudio1(null);
    }
    if (playingAudio2) {
      try { playingAudio2.audio.pause(); playingAudio2.audio.currentTime = 0; } catch {}
      setPlayingAudio2(null);
    }

    playAllQueue.current = queue;
    playAllIndex.current = 0;
    setIsPlayingAll(true);
    setCurrentPlayAllIndex(0);

    const playNext = (index: number) => {
      if (index >= playAllQueue.current.length) {
        // finished
        stopPlayAll();
        return;
      }

      const pad = playAllQueue.current[index];
      // update UI playing state for the pad being played
      playAllIndex.current = index;
      setCurrentPlayAllIndex(index);
      if (pad.id < 12) {
        // panel 1
        if (playingAudio1 && playingAudio1.padId !== pad.id) {
          try { playingAudio1.audio.pause(); playingAudio1.audio.currentTime = 0; } catch {}
        }
        const a = audioRefs.current.get(pad.id);
        if (a) setPlayingAudio1({ padId: pad.id, audio: a });
        setPlayingAudio2((prev) => {
          if (prev) { try { prev.audio.pause(); prev.audio.currentTime = 0; } catch {} }
          return null;
        });
      } else {
        // panel 2
        if (playingAudio2 && playingAudio2.padId !== pad.id) {
          try { playingAudio2.audio.pause(); playingAudio2.audio.currentTime = 0; } catch {}
        }
        const a2 = audioRefs.current.get(pad.id);
        if (a2) setPlayingAudio2({ padId: pad.id, audio: a2 });
        setPlayingAudio1((prev) => {
          if (prev) { try { prev.audio.pause(); prev.audio.currentTime = 0; } catch {} }
          return null;
        });
      }
      let audio = audioRefs.current.get(pad.id);
      if (!audio) {
        audio = new Audio(pad.audioUrl!);
        audio.loop = false;
        audioRefs.current.set(pad.id, audio);
      } else {
        audio.loop = false;
        audio.currentTime = 0;
      }

      playAllAudio.current = audio;
      // ensure previous ended handlers don't pile up
      const onEnded = () => {
        audio?.removeEventListener('ended', onEnded);
        playNext(index + 1);
      };

      audio.addEventListener('ended', onEnded, { once: true });
      audio.play().catch((err) => {
        console.warn('playAll: failed to play', err);
        // try next file
        playNext(index + 1);
      });
    };

    playNext(0);
  };

  const playAllNext = () => {
    const nextIndex = playAllIndex.current + 1;
    if (nextIndex >= playAllQueue.current.length) {
      stopPlayAll();
      return;
    }
    // stop current audio
    if (playAllAudio.current) {
      try { playAllAudio.current.pause(); playAllAudio.current.currentTime = 0; } catch {}
    }
    // play the next pad
    const pad = playAllQueue.current[nextIndex];
    if (!pad) { stopPlayAll(); return; }
    playAllIndex.current = nextIndex;
    setCurrentPlayAllIndex(nextIndex);

    let audio = audioRefs.current.get(pad.id);
    if (!audio) {
      audio = new Audio(pad.audioUrl!);
      audio.loop = false;
      audioRefs.current.set(pad.id, audio);
    } else {
      audio.loop = false;
      audio.currentTime = 0;
    }

    // update UI playing state
    if (pad.id < 12) {
      setPlayingAudio1({ padId: pad.id, audio });
      setPlayingAudio2(null);
    } else {
      setPlayingAudio2({ padId: pad.id, audio });
      setPlayingAudio1(null);
    }

    playAllAudio.current = audio;

    const onEnded = () => {
      audio?.removeEventListener('ended', onEnded);
      playAllNext();
    };
    audio.addEventListener('ended', onEnded, { once: true });
    audio.play().catch((e) => { console.warn('playAllNext failed', e); playAllNext(); });
  };

  const playAllPrev = () => {
    const prevIndex = playAllIndex.current - 1;
    if (prevIndex < 0) return;
    if (playAllAudio.current) {
      try { playAllAudio.current.pause(); playAllAudio.current.currentTime = 0; } catch {}
    }
    const pad = playAllQueue.current[prevIndex];
    if (!pad) return;
    playAllIndex.current = prevIndex;
    setCurrentPlayAllIndex(prevIndex);

    let audio = audioRefs.current.get(pad.id);
    if (!audio) {
      audio = new Audio(pad.audioUrl!);
      audio.loop = false;
      audioRefs.current.set(pad.id, audio);
    } else {
      audio.loop = false;
      audio.currentTime = 0;
    }

    if (pad.id < 12) {
      setPlayingAudio1({ padId: pad.id, audio });
      setPlayingAudio2(null);
    } else {
      setPlayingAudio2({ padId: pad.id, audio });
      setPlayingAudio1(null);
    }

    playAllAudio.current = audio;

    const onEnded = () => {
      audio?.removeEventListener('ended', onEnded);
      playAllNext();
    };
    audio.addEventListener('ended', onEnded, { once: true });
    audio.play().catch((e) => { console.warn('playAllPrev failed', e); playAllNext(); });
  };

  const handleClosePlayer = (panel: number) => {
    if (panel === 1) {
      if (!playingAudio1) return;
      playingAudio1.audio.pause();
      playingAudio1.audio.currentTime = 0;
      setPlayingAudio1(null);
    } else {
      if (!playingAudio2) return;
      playingAudio2.audio.pause();
      playingAudio2.audio.currentTime = 0;
      setPlayingAudio2(null);
    }
  };

  const currentPad1 = playingAudio1 ? pads1.find((p) => p.id === playingAudio1.padId) : null;
  const currentPad2 = playingAudio2 ? pads2.find((p) => p.id === playingAudio2.padId) : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-slate-900 to-slate-800 text-white px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="flex items-center gap-3">
              <MusicIcon size={40} className="text-cyan-400" />
              <h1 className="text-4xl font-bold">TeatroPad</h1>
            </div>
            <div className="flex items-center">
              <div
                role="status"
                aria-live="polite"
                aria-label={isOnline ? 'Online' : 'Offline'}
                className="flex items-center"
              >
                <span className={`inline-block rounded-full w-3 h-3 ${isOnline ? 'bg-emerald-400' : 'bg-amber-400'} mr-2`} />
                <span className="sr-only">{isOnline ? 'Online' : 'Offline'}</span>
              </div>
            </div>
          </div>
          <p className="text-gray-400 text-sm">Mantén presionado para cargar audio • Click para reproducir</p>

          {/* moved status dot next to title */}
        </div>

        <div className="flex items-center justify-center gap-4 mb-8">
          <button onClick={() => setCurrentPanel(1)} className={`flex items-center gap-2 px-6 py-2 rounded-lg font-semibold transition-all ${currentPanel === 1 ? 'bg-cyan-500 text-white shadow-lg' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>
            Panel 1
          </button>
          <button onClick={() => setCurrentPanel(2)} className={`flex items-center gap-2 px-6 py-2 rounded-lg font-semibold transition-all ${currentPanel === 2 ? 'bg-cyan-500 text-white shadow-lg' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>
            Panel 2
          </button>
        </div>

        <div className="mb-6">
          {currentPanel === 1 && playingAudio1 && currentPad1 && (
            <Player
              audio={playingAudio1.audio}
              fileName={currentPad1.fileName || ''}
              onClose={() => handleClosePlayer(1)}
              isPlayingAll={isPlayingAll}
              onTogglePlayAll={() => { if (isPlayingAll) stopPlayAll(); else playAll(playOnlyCurrentPanel); }}
              onPlayAllNext={playAllNext}
              onPlayAllPrev={playAllPrev}
              playOnlyCurrentPanel={playOnlyCurrentPanel}
              setPlayOnlyCurrentPanel={setPlayOnlyCurrentPanel}
              playAllQueueCount={(playOnlyCurrentPanel ? pads.filter(p => p.audioUrl).length : pads1.concat(pads2).filter(p => p.audioUrl).length)}
              currentPlayAllIndex={currentPlayAllIndex}
            />
          )}
          {currentPanel === 2 && playingAudio2 && currentPad2 && (
            <Player
              audio={playingAudio2.audio}
              fileName={currentPad2.fileName || ''}
              onClose={() => handleClosePlayer(2)}
              isPlayingAll={isPlayingAll}
              onTogglePlayAll={() => { if (isPlayingAll) stopPlayAll(); else playAll(playOnlyCurrentPanel); }}
              onPlayAllNext={playAllNext}
              onPlayAllPrev={playAllPrev}
              playOnlyCurrentPanel={playOnlyCurrentPanel}
              setPlayOnlyCurrentPanel={setPlayOnlyCurrentPanel}
              playAllQueueCount={(playOnlyCurrentPanel ? pads.filter(p => p.audioUrl).length : pads1.concat(pads2).filter(p => p.audioUrl).length)}
              currentPlayAllIndex={currentPlayAllIndex}
            />
          )}
        </div>

        <div className="grid grid-cols-3 gap-4 mb-8">
          {pads.map((pad) => (
            <AudioPad
              key={pad.id}
              pad={pad}
              isPlaying={
                (playingAudio1?.padId === pad.id && !playingAudio1.audio.paused) ||
                (playingAudio2?.padId === pad.id && !playingAudio2.audio.paused)
              }
              onLoadAudio={handleLoadAudio}
              onPlayPause={handlePlayPause}
              onDelete={handleDeletePad}
            />
          ))}
        </div>

        <div className="text-center text-gray-500 text-xs">
          <p>Mantén presionado cualquier pad para cargar audio</p>
        </div>

        {/* Play all controls moved into Player component */}
      </div>
    </div>
  );
}
