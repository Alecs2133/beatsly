// src/utils/audioAnalyzer.ts

let globalAudioContext: AudioContext | null = null;
// --- NOU: Memorie globală pentru waveform-uri ---
const peaksCache = new Map<string, number[]>();

export async function extractRealPeaks(url: string, numberOfBars: number = 32): Promise<number[]> {
  // 1. Dacă am mai calculat asta deja, returnează instant din memorie!
  if (peaksCache.has(url)) {
    return peaksCache.get(url)!;
  }

  try {
    const response = await fetch(url);
    if (!response.ok) return Array(numberOfBars).fill(0.1); 
    
    const arrayBuffer = await response.arrayBuffer();
    
    if (!globalAudioContext) {
      globalAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    const audioBuffer = await globalAudioContext.decodeAudioData(arrayBuffer);
    const channelData = audioBuffer.getChannelData(0);
    
    const blockSize = Math.floor(channelData.length / numberOfBars);
    const peaks: number[] = [];
    let globalMax = 0;

    for (let i = 0; i < numberOfBars; i++) {
      const start = i * blockSize;
      let maxInBlock = 0;
      for (let j = 0; j < blockSize; j++) {
        const amplitude = Math.abs(channelData[start + j]);
        if (amplitude > maxInBlock) maxInBlock = amplitude;
      }
      peaks.push(maxInBlock);
      if (maxInBlock > globalMax) globalMax = maxInBlock;
    }

    const finalPeaks = peaks.map(peak => {
      const normalized = globalMax === 0 ? 0 : peak / globalMax;
      return Math.max(0.1, normalized); 
    });

    // 2. Salvăm rezultatul în memorie pentru data viitoare
    peaksCache.set(url, finalPeaks);
    
    return finalPeaks;

  } catch (error) {
    return Array(numberOfBars).fill(0.1); 
  }
}