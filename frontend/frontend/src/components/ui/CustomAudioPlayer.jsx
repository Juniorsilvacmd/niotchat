import React, { useRef, useState, useEffect } from 'react';
import { Play, Pause, Volume2, Download, FastForward } from 'lucide-react';

export default function CustomAudioPlayer({ src, isCustomer }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [error, setError] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [blobUrl, setBlobUrl] = useState(null);

  console.log(' CustomAudioPlayer renderizado:', { src, isCustomer });

  // Reset state when src changes
  useEffect(() => {
    setLoading(true);
    setIsLoaded(false);
    setError(null);
    setProgress(0);
    setDuration(0);
    setPlaying(false);
    
    // Limpar blob URL anterior
    if (blobUrl) {
      URL.revokeObjectURL(blobUrl);
      setBlobUrl(null);
    }

    // Se a URL é externa (não localhost) E não é uma URL relativa, tentar baixar via fetch
    if (src && 
        !src.startsWith('data:') && 
        !src.startsWith('/') && 
        !src.includes('localhost') && 
        !src.includes('192.168.') &&
        (src.startsWith('http://') || src.startsWith('https://'))) {
      console.log('🌐 URL externa detectada, tentando baixar via fetch:', src);
      downloadExternalAudio(src);
    } else {
      console.log(' URL local detectada, usando diretamente:', src);
      setLoading(false);
    }
  }, [src]);

  const downloadExternalAudio = async (url) => {
    try {
      console.log(' Baixando áudio externo:', url);
      const response = await fetch(url, {
        method: 'GET',
        mode: 'cors',
        headers: {
          'Accept': 'audio/*,video/*,*/*'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const blob = await response.blob();
      const newBlobUrl = URL.createObjectURL(blob);
      console.log(' Áudio externo baixado com sucesso, blob URL criada:', newBlobUrl);
      
      setBlobUrl(newBlobUrl);
      setError(null);
    } catch (error) {
      console.error(' Erro ao baixar áudio externo:', error);
      setError(`Erro ao baixar áudio: ${error.message}`);
      setLoading(false);
    }
  };

  const togglePlay = async () => {
    console.log(' Tentando reproduzir áudio:', { src, audioRef: !!audioRef.current, isLoaded, loading, blobUrl });
    
    if (!audioRef.current) {
      console.log(' Elemento de áudio não encontrado');
      setError('Elemento de áudio não encontrado');
      return;
    }

    if (loading) {
      console.log(' Áudio ainda carregando...');
      setError('Aguarde o áudio carregar...');
      return;
    }

    if (!isLoaded) {
      console.log(' Áudio não carregado, tentando carregar novamente...');
      // Tentar recarregar o áudio
      audioRef.current.load();
      setError('Tentando carregar áudio...');
      return;
    }
    
    try {
      if (playing) {
        console.log(' Pausando áudio');
        audioRef.current.pause();
      } else {
        console.log(' Reproduzindo áudio');
        await audioRef.current.play();
      }
    } catch (e) {
      console.error(' Erro ao reproduzir áudio:', e);
      setError(`Erro ao reproduzir: ${e.message}`);
    }
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    audioRef.current.muted = !audioRef.current.muted;
    setMuted(audioRef.current.muted);
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    setProgress(audioRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (!audioRef.current) return;
    const duration = audioRef.current.duration;
    console.log(' Metadados carregados:', { 
      duration, 
      isFinite: isFinite(duration), 
      readyState: audioRef.current.readyState,
      networkState: audioRef.current.networkState
    });
    
    if (isFinite(duration) && duration > 0) {
      setDuration(duration);
      setIsLoaded(true);
      setLoading(false);
      setError(null);
      console.log(' Áudio carregado com sucesso, duração:', duration);
    } else {
      console.log(' Duração inválida:', duration);
      setError('Duração do áudio inválida');
      setLoading(false);
    }
  };

  const handleProgressBarClick = (e) => {
    if (!audioRef.current) return;
    const rect = e.target.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const seekTime = percent * duration;
    audioRef.current.currentTime = seekTime;
    setProgress(seekTime);
  };

  const toggleSpeed = () => {
    let newSpeed = speed === 1 ? 1.5 : speed === 1.5 ? 2 : 1;
    setSpeed(newSpeed);
    if (audioRef.current) {
      audioRef.current.playbackRate = newSpeed;
    }
  };

  // Format time in mm:ss
  const formatTime = (time) => {
    if (isNaN(time) || !isFinite(time)) return '00:00';
    const min = Math.floor(time / 60);
    const sec = Math.floor(time % 60);
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  // Cleanup ao desmontar
  useEffect(() => {
    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [blobUrl]);

  // Determinar qual URL usar
  const audioSrc = blobUrl || src;

  // Função para tentar recarregar o áudio
  const retryLoad = () => {
    if (audioRef.current) {
      console.log(' Tentando recarregar áudio...');
      setLoading(true);
      setError(null);
      audioRef.current.load();
    }
  };

  // Função para tentar diferentes formatos de áudio
  const tryDifferentFormats = async () => {
    if (!src) return;
    
    console.log(' Tentando diferentes formatos de áudio...');
    
    // Lista de formatos para tentar
    const formats = [
      { ext: '.mp3', type: 'audio/mpeg' },
      { ext: '.ogg', type: 'audio/ogg' },
      { ext: '.wav', type: 'audio/wav' },
      { ext: '.m4a', type: 'audio/mp4' }
    ];
    
    for (const format of formats) {
      try {
        // Tentar com extensão diferente
        const testUrl = src.replace(/\.[^/.]+$/, format.ext);
        console.log(` Tentando formato: ${format.ext}`);
        
        // Não fazer verificação HEAD, apenas tentar carregar diretamente
        if (audioRef.current) {
          audioRef.current.src = testUrl;
          audioRef.current.load();
          return;
        }
      } catch (error) {
        console.log(` Formato ${format.ext} não disponível:`, error);
      }
    }
    
    console.log(' Nenhum formato alternativo disponível');
  };

  // Função para normalizar URL
  const normalizeUrl = (url) => {
    if (!url) return null;
    
    // Se já é uma URL completa, retornar como está
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    
    // Se é uma URL relativa, adicionar o host atual
    if (url.startsWith('/')) {
      return `${window.location.origin}${url}`;
    }
    
    // Se não tem protocolo, assumir que é relativa
    return `${window.location.origin}/${url}`;
  };

  // Usar blobUrl apenas se existir, senão usar src normalizado
  const finalSrc = blobUrl || normalizeUrl(src);

  return (
    <div className={`flex flex-col gap-1 rounded-lg px-2 py-1 ${isCustomer ? 'bg-[#23272f]' : 'bg-[#009ca6]'} shadow`}>
      {error && (
        <div className="text-red-300 text-xs mb-1">
          {error}
          <button 
            onClick={retryLoad}
            className="ml-2 text-blue-300 underline hover:text-blue-200"
          >
            Tentar novamente
          </button>
          {error.includes('Formato não suportado') && (
            <button 
              onClick={tryDifferentFormats}
              className="ml-2 text-green-300 underline hover:text-green-200"
            >
              Tentar outros formatos
            </button>
          )}
        </div>
      )}
      {loading && !error && (
        <div className="text-blue-300 text-xs mb-1">
          Carregando áudio...
        </div>
      )}
      <div className="flex items-center gap-2">
        <button 
          onClick={togglePlay} 
          className="p-1 text-white"
          disabled={loading}
        >
          {playing ? <Pause size={20} /> : <Play size={20} />}
        </button>
        <span className="text-xs text-white min-w-[48px]">
          {formatTime(progress)} / {formatTime(duration)}
        </span>
        <button onClick={toggleSpeed} className="p-1 text-white flex items-center">
          <FastForward size={18} />
          <span className="ml-1 text-xs">{speed}x</span>
        </button>
        <a href={src} download target="_blank" rel="noopener noreferrer" className="p-1 text-white">
          <Download size={18} />
        </a>
        <button onClick={toggleMute} className="p-1 text-white">
          <Volume2 size={18} />
        </button>
      </div>
      <div className="w-full h-2 bg-gray-300 rounded cursor-pointer" onClick={handleProgressBarClick} style={{ position: 'relative' }}>
        <div
          className="h-2 bg-blue-500 rounded"
          style={{ width: duration ? `${(progress / duration) * 100}%` : '0%' }}
        ></div>
      </div>
      <audio
        ref={audioRef}
        src={finalSrc}
        preload="metadata"
        onLoadStart={() => {
          console.log(' Iniciando carregamento do áudio:', finalSrc);
          setLoading(true);
          setError(null);
        }}
        onCanPlay={() => {
          console.log(' Áudio pode ser reproduzido');
        }}
        onCanPlayThrough={() => {
          console.log(' Áudio pode ser reproduzido completamente');
        }}
        onLoadedMetadata={() => {
          console.log(' Metadados do áudio carregados');
          handleLoadedMetadata();
        }}
        onLoadedData={() => {
          console.log(' Dados do áudio carregados');
        }}
        onPlay={() => {
          console.log(' Áudio começou a tocar');
          setPlaying(true);
          setError(null);
        }}
        onPause={() => {
          console.log(' Áudio pausado');
          setPlaying(false);
        }}
        onTimeUpdate={handleTimeUpdate}
        onEnded={() => {
          console.log(' Áudio terminou');
          setPlaying(false);
        }}
        onError={(e) => {
          console.error(' Erro no elemento de áudio:', e);
          console.error(' Código de erro:', audioRef.current?.error?.code);
          console.error(' Mensagem de erro:', audioRef.current?.error?.message);
          console.error(' Network state:', audioRef.current?.networkState);
          console.error(' Ready state:', audioRef.current?.readyState);
          console.error(' URL tentada:', finalSrc);
          
          let errorMessage = 'Erro desconhecido';
          if (audioRef.current?.error) {
            switch (audioRef.current.error.code) {
              case 1:
                errorMessage = 'Operação abortada';
                break;
              case 2:
                errorMessage = 'Erro de rede - verifique a conexão';
                break;
              case 3:
                errorMessage = 'Erro de decodificação - formato não suportado';
                break;
              case 4:
                errorMessage = 'Formato não suportado pelo navegador';
                break;
              default:
                errorMessage = audioRef.current.error.message || 'Erro de reprodução';
            }
          } else {
            // Se não há erro específico, verificar network state
            if (audioRef.current?.networkState === 3) {
              errorMessage = 'Erro de rede - arquivo não encontrado';
            } else if (audioRef.current?.readyState === 0) {
              errorMessage = 'Arquivo não carregado - verifique a URL';
            }
          }
          
          // Se for erro de formato não suportado, tentar outros formatos
          if (audioRef.current?.error?.code === 4) {
            console.log(' Formato não suportado, tentando outros formatos...');
            tryDifferentFormats();
            setError('Tentando formatos alternativos...');
            return;
          }
          
          setError(`Erro ao carregar áudio: ${errorMessage}`);
          setLoading(false);
          setIsLoaded(false);
        }}
        onAbort={() => {
          console.log(' Carregamento do áudio abortado');
          setLoading(false);
        }}
        onSuspend={() => {
          console.log(' Carregamento do áudio suspenso');
        }}
        style={{ display: 'none' }}
        crossOrigin="anonymous"
      />
    </div>
  );
} 