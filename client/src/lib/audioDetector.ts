/**
 * TalentMatrix Real-Time Audio Proctoring & Voice Activity Detection (VAD) Engine
 * 
 * Analyzes audio input using Web Audio API (AnalyserNode + FFT) to detect:
 * - Human Voice / Speech Frequency Bands (100Hz - 3400Hz)
 * - Ambient Noise Spikes & Room Commotion (>70dB)
 * - Whisper / Secondary Conversation
 * - Real-time volume level & spectrum for HUD visualization
 */

export interface AudioDetectionEvent {
  type: 'speech_detected' | 'noise_spike' | 'mic_muted' | 'mic_restored';
  volumeDb: number;
  message: string;
  duration?: number;
  transcript?: string;
}

export interface AudioDetectorController {
  start: () => void;
  stop: () => void;
  getLiveVolume: () => number; // 0 - 100 normalized
  getDecibels: () => number; // in dB (-100 to 0)
  getByteFrequencyData: (array: Uint8Array) => void;
  isVoiceActive: () => boolean;
  setSensitivity: (sensitivity: 'low' | 'medium' | 'high') => void;
}

export function createAudioDetector(
  mediaStream: MediaStream,
  onEvent: (event: AudioDetectionEvent) => void
): AudioDetectorController | null {
  try {
    const audioTracks = mediaStream.getAudioTracks();
    if (!audioTracks || audioTracks.length === 0) {
      console.warn('[AudioDetector] No audio tracks available in media stream.');
      return null;
    }

    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) {
      console.warn('[AudioDetector] Web Audio API not supported in this browser.');
      return null;
    }

    const audioCtx = new AudioContextClass();
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.8;

    const source = audioCtx.createMediaStreamSource(mediaStream);
    source.connect(analyser);

    const bufferLength = analyser.frequencyBinCount;
    const timeData = new Uint8Array(bufferLength);
    const freqData = new Uint8Array(bufferLength);

    let isRunning = true;
    let animationFrameId: number | null = null;
    let liveVolumeNormalized = 0;
    let liveDb = -100;
    let voiceActive = false;

    // Thresholds by sensitivity level
    let sensitivityMode: 'low' | 'medium' | 'high' = 'medium';
    let voiceEnergyThreshold = 35; // out of 255
    let voiceDurationFrames = 0;
    const framesRequiredForSpeech = 12; // ~200ms of vocal energy
    let lastEventTimestamp = 0;

    const updateSensitivityThresholds = () => {
      if (sensitivityMode === 'high') {
        voiceEnergyThreshold = 25;
      } else if (sensitivityMode === 'low') {
        voiceEnergyThreshold = 55;
      } else {
        voiceEnergyThreshold = 38;
      }
    };
    updateSensitivityThresholds();

    // Optional Web Speech API for transcription detection
    let recognition: any = null;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      try {
        recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (e: any) => {
          for (let i = e.resultIndex; i < e.results.length; i++) {
            const transcript = e.results[i][0].transcript.trim();
            if (transcript.length > 2) {
              const now = Date.now();
              if (now - lastEventTimestamp > 4000) {
                lastEventTimestamp = now;
                onEvent({
                  type: 'speech_detected',
                  volumeDb: Math.round(liveDb),
                  message: `🗣️ Voice Activity Detected: "${transcript.slice(0, 40)}${transcript.length > 40 ? '...' : ''}"`,
                  transcript,
                });
              }
            }
          }
        };

        recognition.onerror = () => {};
        recognition.onend = () => {
          if (isRunning) {
            try { recognition.start(); } catch (_) {}
          }
        };

        recognition.start();
      } catch (err) {
        console.warn('[AudioDetector] SpeechRecognition initialization ignored:', err);
      }
    }

    const processAudioLoop = () => {
      if (!isRunning) return;

      analyser.getByteTimeDomainData(timeData);
      analyser.getByteFrequencyData(freqData);

      // 1. Compute RMS Volume and Decibels
      let sumSquares = 0;
      for (let i = 0; i < bufferLength; i++) {
        const normalized = (timeData[i] - 128) / 128;
        sumSquares += normalized * normalized;
      }
      const rms = Math.sqrt(sumSquares / bufferLength);
      const db = rms > 0 ? 20 * Math.log10(rms) : -100;
      liveDb = db;

      // Normalize volume to 0 - 100 for visualizer
      liveVolumeNormalized = Math.min(100, Math.max(0, Math.round((db + 60) * 2.2)));

      // 2. Frequency Analysis: Human Speech Band (approx 100Hz to 3000Hz)
      // With sampleRate ~44100Hz or 48000Hz and fftSize 512, bin resolution is ~86Hz to 93Hz.
      const binSize = audioCtx.sampleRate / analyser.fftSize;
      const minSpeechBin = Math.max(1, Math.floor(100 / binSize));
      const maxSpeechBin = Math.min(bufferLength - 1, Math.ceil(3400 / binSize));

      let speechBandEnergy = 0;
      for (let i = minSpeechBin; i <= maxSpeechBin; i++) {
        speechBandEnergy += freqData[i];
      }
      const avgSpeechEnergy = speechBandEnergy / (maxSpeechBin - minSpeechBin + 1);

      // 3. Speech & Noise Classification
      if (avgSpeechEnergy > voiceEnergyThreshold && db > -38) {
        voiceDurationFrames++;
        voiceActive = true;

        if (voiceDurationFrames >= framesRequiredForSpeech) {
          const now = Date.now();
          if (now - lastEventTimestamp > 5000) {
            lastEventTimestamp = now;
            onEvent({
              type: 'speech_detected',
              volumeDb: Math.round(db),
              message: `🚨 Voice Activity Alert: Human vocal speech detected in room (${Math.round(db)} dB).`,
              duration: Math.round((voiceDurationFrames * 1000) / 60),
            });
          }
        }
      } else if (db > -18) {
        // Loud sudden noise spike (>75dB equivalent)
        const now = Date.now();
        if (now - lastEventTimestamp > 4000) {
          lastEventTimestamp = now;
          onEvent({
            type: 'noise_spike',
            volumeDb: Math.round(db),
            message: `⚠️ Loud Ambient Noise Spike: Room commotion or microphone disturbance (${Math.round(db)} dB).`,
          });
        }
        voiceDurationFrames = 0;
        voiceActive = false;
      } else {
        voiceDurationFrames = Math.max(0, voiceDurationFrames - 2);
        voiceActive = false;
      }

      animationFrameId = requestAnimationFrame(processAudioLoop);
    };

    animationFrameId = requestAnimationFrame(processAudioLoop);

    return {
      start: () => {
        if (!isRunning) {
          isRunning = true;
          if (audioCtx.state === 'suspended') {
            audioCtx.resume();
          }
          if (recognition) {
            try { recognition.start(); } catch (_) {}
          }
          animationFrameId = requestAnimationFrame(processAudioLoop);
        }
      },
      stop: () => {
        isRunning = false;
        if (animationFrameId) {
          cancelAnimationFrame(animationFrameId);
          animationFrameId = null;
        }
        if (recognition) {
          try { recognition.stop(); } catch (_) {}
        }
        if (audioCtx && audioCtx.state !== 'closed') {
          audioCtx.close().catch(() => {});
        }
      },
      getLiveVolume: () => liveVolumeNormalized,
      getDecibels: () => Math.round(liveDb),
      getByteFrequencyData: (array: Uint8Array) => {
        analyser.getByteFrequencyData(array as any);
      },
      isVoiceActive: () => voiceActive,
      setSensitivity: (sensitivity) => {
        sensitivityMode = sensitivity;
        updateSensitivityThresholds();
      },
    };
  } catch (err) {
    console.error('[AudioDetector] Failed to initialize audio proctoring:', err);
    return null;
  }
}
