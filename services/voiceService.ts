
// Browser Speech API types are not always fully typed, using 'any' for safety shim
const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

export const isSpeechSupported = () => !!SpeechRecognition;

export const startListening = (
  onResult: (text: string) => void, 
  onError: (err: string) => void
): any => {
  if (!isSpeechSupported()) {
    onError("Speech recognition not supported in this browser.");
    return null;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = 'en-US';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.onresult = (event: any) => {
    const text = event.results[0][0].transcript;
    onResult(text);
  };

  recognition.onerror = (event: any) => {
    console.error("Speech Error", event.error);
    onError(event.error);
  };

  recognition.start();
  return recognition;
};

export const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
    }
};

export const speakText = (text: string) => {
  if (!('speechSynthesis' in window)) return;
  
  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  // Try to find a good futuristic voice
  const voices = window.speechSynthesis.getVoices();
  const preferredVoice = voices.find(v => v.name.includes('Google US English') || v.name.includes('Samantha') || v.name.includes('Microsoft Zira'));
  if (preferredVoice) utterance.voice = preferredVoice;
  
  utterance.pitch = 0.9; // Slightly deeper
  utterance.rate = 1.0;
  
  window.speechSynthesis.speak(utterance);
};
