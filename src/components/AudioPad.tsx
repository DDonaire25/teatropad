import { Music } from 'lucide-react';
import { useRef, useState } from 'react';
import { AudioPadData } from '../types/audio';

interface AudioPadProps {
  pad: AudioPadData;
  isPlaying: boolean;
  onLoadAudio: (padId: number, file: File) => void;
  onPlayPause: (padId: number) => void;
  onDelete: (padId: number) => void;
}

export default function AudioPad({ pad, isPlaying, onLoadAudio, onPlayPause, onDelete }: AudioPadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const longPressTriggered = useRef<boolean>(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const handleMouseDown = () => {
    longPressTimer.current = setTimeout(() => {
      longPressTriggered.current = true;
      setMenuOpen(true);
      longPressTimer.current = null;
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
      // normal click (no long press yet)
      if (pad.audioUrl) onPlayPause(pad.id);
    } else if (longPressTriggered.current) {
      // long press already triggered and opened menu: consume click
      longPressTriggered.current = false;
      return;
    } else {
      if (pad.audioUrl) onPlayPause(pad.id);
    }
  };

  const handleTouchStart = () => {
    longPressTimer.current = setTimeout(() => {
      longPressTriggered.current = true;
      setMenuOpen(true);
      longPressTimer.current = null;
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

  const handleDelete = () => {
    setMenuOpen(false);
    onDelete(pad.id);
  };

  const handleChooseFile = () => {
    setMenuOpen(false);
    fileInputRef.current?.click();
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
          {menuOpen && (
            <div className="absolute top-2 right-2 z-20">
              <div className="bg-slate-800 text-white rounded-md shadow-lg py-1 w-36">
                <button onClick={handleChooseFile} className="w-full text-left px-3 py-2 hover:bg-slate-700">Cargar audio</button>
                <button onClick={handleDelete} className="w-full text-left px-3 py-2 hover:bg-slate-700">Borrar</button>
              </div>
            </div>
          )}
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
