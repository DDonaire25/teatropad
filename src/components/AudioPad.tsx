import { Music } from 'lucide-react';
import { useRef } from 'react';
import { AudioPadData } from '../types/audio';

interface AudioPadProps {
  pad: AudioPadData;
  isPlaying: boolean;
  onLoadAudio: (padId: number, file: File) => void;
  onPlayPause: (padId: number) => void;
}

export default function AudioPad({ pad, isPlaying, onLoadAudio, onPlayPause }: AudioPadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  const handleMouseDown = () => {
    longPressTimer.current = setTimeout(() => {
      fileInputRef.current?.click();
    }, 500);
  };

  const handleMouseUp = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleClick = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    } else if (pad.audioUrl) {
      onPlayPause(pad.id);
    }
  };

  const handleTouchStart = () => {
    longPressTimer.current = setTimeout(() => {
      fileInputRef.current?.click();
    }, 500);
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && (file.type === 'audio/mpeg' || file.type === 'audio/wav')) {
      onLoadAudio(pad.id, file);
    }
    e.target.value = '';
  };

  const truncateFileName = (name: string) => {
    if (name.length <= 15) return name;
    return name.substring(0, 12) + '...';
  };

  return (
    <>
      <button
        className={`relative aspect-square rounded-2xl shadow-lg transition-all duration-200 active:scale-95 overflow-hidden ${pad.color} ${
          isPlaying ? 'ring-4 ring-white animate-pulse' : ''
        }`}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleClick}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      >
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
          <Music
            size={48}
            className={`mb-2 ${isPlaying ? 'animate-bounce' : ''} ${!pad.fileName ? 'opacity-50' : ''}`}
          />
          {pad.fileName && (
            <span className="text-xs font-medium px-2 text-center">
              {truncateFileName(pad.fileName)}
            </span>
          )}
        </div>
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/mpeg,audio/wav"
        className="hidden"
        onChange={handleFileChange}
      />
    </>
  );
}
