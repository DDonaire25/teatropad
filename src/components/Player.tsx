import { Play, Pause, Square, X, SkipForward } from 'lucide-react';
import { useState, useEffect } from 'react';

interface PlayerProps {
  audio: HTMLAudioElement | null;
  fileName: string;
  onClose: () => void;
  // Play-all controls
  isPlayingAll?: boolean;
  playAllCount?: number;
  playOnlyCurrentPanel?: boolean;
  onTogglePlayAll?: () => void;
  onPlayAllNext?: () => void;
  onTogglePlayAllScope?: (onlyCurrent: boolean) => void;
}

export default function Player({ audio, fileName, onClose }: PlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    setIsPlaying(!audio.paused);
    setDuration(audio.duration);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
    };
  }, [audio]);

  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handlePlayPause = () => {
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
  };

  const handleStop = () => {
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
    onClose();
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audio) return;
    const newTime = parseFloat(e.target.value);
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  return (
    <div className="w-full bg-gradient-to-r from-gray-900 to-slate-800 rounded-xl p-4 shadow-xl border border-gray-700">
      <div className="flex items-center justify-between mb-3">
        <div className="flex-1">
          <p className="text-white font-semibold text-sm truncate">{fileName}</p>
          <p className="text-cyan-400 text-xs">En reproducción</p>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors ml-2"
        >
          <X size={20} />
        </button>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 w-10 text-right">{formatTime(currentTime)}</span>
          <input
            type="range"
            min="0"
            max={duration || 0}
            value={currentTime}
            onChange={handleSeek}
            className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyan-400 [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-cyan-400 [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer"
          />
          <span className="text-xs text-gray-400 w-10">{formatTime(duration)}</span>
        </div>

        <div className="flex items-center justify-center gap-3">
          <button
            onClick={handlePlayPause}
            className="bg-cyan-500 hover:bg-cyan-600 text-white rounded-full p-3 transition-colors"
          >
            {isPlaying ? <Pause size={20} fill="white" /> : <Play size={20} fill="white" />}
          </button>
          <button
            onClick={handleStop}
            className="bg-gray-700 hover:bg-gray-600 text-white rounded-full p-3 transition-colors"
          >
            <Square size={20} fill="white" />
          </button>
        </div>

        {/* Play All controls merged into the player */}
        <div className="border-t border-gray-700 pt-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => onTogglePlayAll && onTogglePlayAll()}
              aria-label="Play All"
              className="bg-cyan-500 hover:bg-cyan-600 text-white rounded-full p-2 transition-colors"
            >
              {isPlayingAll ? <Pause size={16} /> : <Play size={16} />}
            </button>

            <button
              onClick={() => onPlayAllNext && onPlayAllNext()}
              aria-label="Siguiente"
              className="bg-gray-700 hover:bg-gray-600 text-white rounded-full p-2 transition-colors"
            >
              <SkipForward size={16} />
            </button>

            <div className="text-xs text-gray-400 ml-2">{playAllCount ?? 0} audios</div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onTogglePlayAllScope && onTogglePlayAllScope(false)}
              className={`px-2 py-1 rounded-md text-xs transition ${!playOnlyCurrentPanel ? 'bg-slate-700 text-white' : 'bg-transparent text-gray-400 hover:bg-slate-700'}`}
            >
              Todos
            </button>
            <button
              onClick={() => onTogglePlayAllScope && onTogglePlayAllScope(true)}
              className={`px-2 py-1 rounded-md text-xs transition ${playOnlyCurrentPanel ? 'bg-slate-700 text-white' : 'bg-transparent text-gray-400 hover:bg-slate-700'}`}
            >
              Solo panel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
