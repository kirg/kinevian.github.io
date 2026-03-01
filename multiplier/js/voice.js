const Sound = {
  audioContext: null,

  init() {
    if ('AudioContext' in window || 'webkitAudioContext' in window) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
  },

  playCorrect() {
    if (!this.audioContext) this.init();
    if (!this.audioContext) return;

    const now = this.audioContext.currentTime;
    
    const osc1 = this.audioContext.createOscillator();
    const osc2 = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    
    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    osc1.type = 'sine';
    osc2.type = 'sine';
    
    osc1.frequency.setValueAtTime(523.25, now);
    osc1.frequency.setValueAtTime(659.25, now + 0.1);
    osc1.frequency.setValueAtTime(783.99, now + 0.2);
    
    osc2.frequency.setValueAtTime(523.25 * 2, now);
    osc2.frequency.setValueAtTime(659.25 * 2, now + 0.1);
    osc2.frequency.setValueAtTime(783.99 * 2, now + 0.2);
    
    gainNode.gain.setValueAtTime(0.3, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
    
    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.4);
    osc2.stop(now + 0.4);
  },

  playIncorrect() {
    if (!this.audioContext) this.init();
    if (!this.audioContext) return;

    const now = this.audioContext.currentTime;
    
    const osc = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    
    osc.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    osc.type = 'sine';
    
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.setValueAtTime(150, now + 0.15);
    osc.frequency.setValueAtTime(100, now + 0.3);
    
    gainNode.gain.setValueAtTime(0.3, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
    
    osc.start(now);
    osc.stop(now + 0.4);
  },

  playMastered() {
    if (!this.audioContext) this.init();
    if (!this.audioContext) return;

    const now = this.audioContext.currentTime;
    
    const notes = [523.25, 659.25, 783.99, 1046.5];
    
    notes.forEach((freq, i) => {
      const osc = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      
      osc.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.1);
      
      gainNode.gain.setValueAtTime(0.25, now + i * 0.1);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.3);
      
      osc.start(now + i * 0.1);
      osc.stop(now + i * 0.1 + 0.3);
    });
  },

  playMicOn() {
    if (!this.audioContext) this.init();
    if (!this.audioContext) return;

    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    const now = this.audioContext.currentTime;
    
    const osc = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    
    osc.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.setValueAtTime(800, now + 0.08);
    
    gainNode.gain.setValueAtTime(0.2, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
    
    osc.start(now);
    osc.stop(now + 0.15);
  },

  playMicOff() {
    if (!this.audioContext) this.init();
    if (!this.audioContext) return;

    const now = this.audioContext.currentTime;
    
    const osc = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    
    osc.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.setValueAtTime(600, now + 0.08);
    
    gainNode.gain.setValueAtTime(0.2, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
    
    osc.start(now);
    osc.stop(now + 0.15);
  }
};

const Voice = {
  synth: null,
  recognition: null,
  isListening: false,
  voices: [],
  lang: 'en-US',

  textToNumber: {
    en: {
      'zero': 0, 'one': 1, 'two': 2, 'three': 3, 'four': 4,
      'five': 5, 'six': 6, 'seven': 7, 'eight': 8, 'nine': 9,
      'ten': 10, 'eleven': 11, 'twelve': 12, 'thirteen': 13,
      'fourteen': 14, 'fifteen': 15, 'sixteen': 16, 'seventeen': 17,
      'eighteen': 18, 'nineteen': 19, 'twenty': 20, 'twenty-one': 21,
      'twenty-two': 22, 'twenty-three': 23, 'twenty-four': 24,
      'twenty-five': 25, 'twenty-six': 26, 'twenty-seven': 27,
      'twenty-eight': 28, 'twenty-nine': 29, 'thirty': 30,
      'thirty-one': 31, 'thirty-two': 32, 'thirty-three': 33,
      'thirty-four': 34, 'thirty-five': 35, 'thirty-six': 36,
      'thirty-seven': 37, 'thirty-eight': 38, 'thirty-nine': 39,
      'forty': 40, 'forty-one': 41, 'forty-two': 42, 'forty-three': 43,
      'forty-four': 44, 'forty-five': 45, 'forty-six': 46, 'forty-seven': 47,
      'forty-eight': 48, 'forty-nine': 49, 'fifty': 50, 'fifty-one': 51,
      'fifty-two': 52, 'fifty-three': 53, 'fifty-four': 54, 'fifty-five': 55,
      'fifty-six': 56, 'fifty-seven': 57, 'fifty-eight': 58, 'fifty-nine': 59,
      'sixty': 60, 'sixty-one': 61, 'sixty-two': 62, 'sixty-three': 63,
      'sixty-four': 64, 'sixty-five': 65, 'sixty-six': 66, 'sixty-seven': 67,
      'sixty-eight': 68, 'sixty-nine': 69, 'seventy': 70, 'seventy-one': 71,
      'seventy-two': 72, 'seventy-three': 73, 'seventy-four': 74,
      'seventy-five': 75, 'seventy-six': 76, 'seventy-seven': 77,
      'seventy-eight': 78, 'seventy-nine': 79, 'eighty': 80,
      'eighty-one': 81, 'eighty-two': 82, 'eighty-three': 83,
      'eighty-four': 84, 'eighty-five': 85, 'eighty-six': 86,
      'eighty-seven': 87, 'eighty-eight': 88, 'eighty-nine': 89,
      'ninety': 90, 'ninety-one': 91, 'ninety-two': 92, 'ninety-three': 93,
      'ninety-four': 94, 'ninety-five': 95, 'ninety-six': 96,
      'ninety-seven': 97, 'ninety-eight': 98, 'ninety-nine': 99,
      'one hundred': 100, 'one hundred forty-four': 144
    },
    de: {
      'null': 0, 'eins': 1, 'eine': 1, 'einer': 1, 'ein': 1,
      'zwei': 2, 'drei': 3, 'vier': 4, 'fünf': 5, 'sechs': 6,
      'sieben': 7, 'acht': 8, 'neun': 9, 'zehn': 10,
      'elf': 11, 'zwölf': 12, 'dreizehn': 13, 'vierzehn': 14,
      'fünfzehn': 15, 'sechzehn': 16, 'siebzehn': 17, 'achtzehn': 18,
      'neunzehn': 19, 'zwanzig': 20, 'einundzwanzig': 21,
      'zweiundzwanzig': 22, 'dreiundzwanzig': 23, 'vierundzwanzig': 24,
      'fünfundzwanzig': 25, 'sechsundzwanzig': 26, 'siebenundzwanzig': 27,
      'achtundzwanzig': 28, 'neunundzwanzig': 29, 'dreißig': 30,
      'einunddreißig': 31, 'zweiunddreißig': 32, 'dreiunddreißig': 33,
      'vierunddreißig': 34, 'fünfunddreißig': 35, 'sechsunddreißig': 36,
      'siebenunddreißig': 37, 'achtunddreißig': 38, 'neununddreißig': 39,
      'vierzig': 40, 'einundvierzig': 41, 'zweiundvierzig': 42,
      'dreiundvierzig': 43, 'vierundvierzig': 44, 'fünfundvierzig': 45,
      'sechsundvierzig': 46, 'siebenundvierzig': 47, 'achtundvierzig': 48,
      'neunundvierzig': 49, 'fünfzig': 50, 'einundfünfzig': 51,
      'zweiundfünfzig': 52, 'dreiundfünfzig': 53, 'vierundfünfzig': 54,
      'fünfundfünfzig': 55, 'sechsundfünfzig': 56, 'siebenundfünfzig': 57,
      'achtundfünfzig': 58, 'neunundfünfzig': 59, 'sechzig': 60,
      'einundsechzig': 61, 'zweiundsechzig': 62, 'dreiundsechzig': 63,
      'vierundsechzig': 64, 'fünfundsechzig': 65, 'sechsundsechzig': 66,
      'siebenundsechzig': 67, 'achtundsechzig': 68, 'neunundsechzig': 69,
      'siebzig': 70, 'einundsiebzig': 71, 'zweiundsiebzig': 72,
      'dreiundsiebzig': 73, 'vierundsiebzig': 74, 'fünfundsiebzig': 75,
      'sechsundsiebzig': 76, 'siebenundsiebzig': 77, 'achtundsiebzig': 78,
      'neunundsiebzig': 79, 'achtzig': 80, 'einundachtzig': 81,
      'zweiundachtzig': 82, 'dreiundachtzig': 83, 'vierundachtzig': 84,
      'fünfundachtzig': 85, 'sechsundachtzig': 86, 'siebenundachtzig': 87,
      'achtundachtzig': 88, 'neunundachtzig': 89, 'neunzig': 90,
      'einundneunzig': 91, 'zweiundneunzig': 92, 'dreiundneunzig': 93,
      'vierundneunzig': 94, 'fünfundneunzig': 95, 'sechsundneunzig': 96,
      'siebenundneunzig': 97, 'achtundneunzig': 98, 'neunundneunzig': 99,
      'einhundert': 100, 'einhundertvierundvierzig': 144
    }
  },

  messages: {
    en: {
      correct: [
        'Amazing!', 'Perfect!', 'You\'re a star!', 'Fantastic!',
        'Brilliant!', 'Wonderful!', 'Great job!', 'Super!'
      ],
      incorrect: [
        'Not quite, try again!', 'Almost! Give it another shot!',
        'You can do it!', 'Keep trying!'
      ],
      gameOver: [
        'Game over! No more hearts.',
        'Out of hearts! Better luck next time.',
        'All hearts used! Want to try again?'
      ],
      streak: [
        'On fire!', 'You\'re on fire!', 'Incredible streak!'
      ],
      mastered: [
        'Mastered!', 'You mastered this number!',
        'You\'re a multiplication star!'
      ],
      intro: 'Let\'s practice multiplication!',
      selectNumbers: 'Choose which numbers to practice.'
    },
    de: {
      correct: [
        'Fantastisch!', 'Perfekt!', 'Du bist ein Star!', 'Wunderbar!',
        'Großartig!', 'Toll!', 'Sehr gut!', 'Super!'
      ],
      incorrect: [
        'Nicht ganz, versuch es nochmal!', 'Fast! Noch ein Versuch!',
        'Du schaffst das!', 'Weiter so!'
      ],
      gameOver: [
        'Spiel vorbei! Keine Herzen mehr.',
        'Alle Herzen aufgebraucht! Viel Glück beim nächsten Mal.',
        'Keine Herzen mehr! Willst du nochmal versuchen?'
      ],
      streak: [
        'Du bist on fire!', 'Du bist nicht zu stoppen!', 'Unglaubliche Serie!'
      ],
      mastered: [
        'Gemeistert!', 'Du hast diese Zahl gemeistert!',
        'Du bist ein Multiplikationsstar!'
      ],
      intro: 'Lass uns Multiplikation üben!',
      selectNumbers: 'Wähle welche Zahlen du üben möchtest.'
    }
  },

  init() {
    if ('speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
      this.loadVoices();
      
      if (this.synth.onvoiceschanged !== undefined) {
        this.synth.onvoiceschanged = () => this.loadVoices();
      }
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
      this.recognition.maxAlternatives = 3;
    }

    this.setLanguage(Storage.getLanguage());
  },

  loadVoices() {
    this.voices = this.synth.getVoices();
  },

  setLanguage(lang) {
    this.lang = lang === 'de' ? 'de-DE' : 'en-US';
    if (this.recognition) {
      this.recognition.lang = this.lang;
    }
  },

  speak(text, callback) {
    if (!this.synth) {
      if (callback) callback();
      return;
    }

    this.synth.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = this.lang;
    utterance.rate = 0.85;
    utterance.pitch = 1.1;
    utterance.volume = 1;

    if (this.voices.length > 0) {
      const voice = this.voices.find(v => v.lang.startsWith(this.lang.split('-')[0]));
      if (voice) {
        utterance.voice = voice;
      }
    }

    utterance.onend = () => {
      if (callback) callback();
    };

    utterance.onerror = (e) => {
      console.log('Speech error:', e);
      if (callback) callback();
    };

    try {
      this.synth.speak(utterance);
    } catch (e) {
      console.log('Speech speak error:', e);
      if (callback) callback();
    }
  },

  speakQuestion(num1, num2, callback) {
    const lang = Storage.getLanguage();
    let question;
    
    if (lang === 'de') {
      question = `Was ist ${num1} mal ${num2}?`;
    } else {
      question = `What is ${num1} times ${num2}?`;
    }
    
    this.speak(question, callback);
  },

  speakCorrect() {
    const lang = Storage.getLanguage();
    const messages = this.messages[lang].correct;
    const message = messages[Math.floor(Math.random() * messages.length)];
    this.speak(message);
  },

  speakIncorrect() {
    const lang = Storage.getLanguage();
    const messages = this.messages[lang].incorrect;
    const message = messages[Math.floor(Math.random() * messages.length)];
    this.speak(message);
  },

  speakStreak() {
    const lang = Storage.getLanguage();
    const messages = this.messages[lang].streak;
    const message = messages[Math.floor(Math.random() * messages.length)];
    this.speak(message);
  },

  speakMastered() {
    const lang = Storage.getLanguage();
    const messages = this.messages[lang].mastered;
    const message = messages[Math.floor(Math.random() * messages.length)];
    this.speak(message);
  },

  speakAnswer(num) {
    const lang = Storage.getLanguage();
    let answer;
    
    if (lang === 'de') {
      answer = `${num} ist richtig!`;
    } else {
      answer = `${num} is correct!`;
    }
    
    this.speak(answer);
  },

  startListening(onResult, onEnd, onError) {
    if (!this.recognition) {
      if (onError) onError('Speech recognition not supported');
      return false;
    }

    this.isListening = true;

    this.recognition.onresult = (event) => {
      const results = event.results[0];
      const alternatives = [];

      for (let i = 0; i < results.length; i++) {
        alternatives.push(results[i].transcript);
      }

      const number = this.parseSpokenNumber(alternatives[0]);
      if (onResult) onResult(number, alternatives);
    };

    this.recognition.onend = () => {
      this.isListening = false;
      if (onEnd) onEnd();
    };

    this.recognition.onerror = (event) => {
      this.isListening = false;
      if (onError) onError(event.error);
    };

    try {
      this.recognition.start();
      return true;
    } catch (e) {
      this.isListening = false;
      if (onError) onError(e.message);
      return false;
    }
  },

  stopListening() {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
    }
  },

  parseSpokenNumber(spoken) {
    if (!spoken) return null;

    const lang = Storage.getLanguage();
    const numMap = this.textToNumber[lang];
    const spokenLower = spoken.toLowerCase().trim();

    if (numMap[spokenLower] !== undefined) {
      return numMap[spokenLower];
    }

    const numericMatch = spoken.match(/\d+/);
    if (numericMatch) {
      return parseInt(numericMatch[0], 10);
    }

    const compounds = [
      'one hundred forty-four', 'einhundertvierundvierzig',
      'one hundred', 'einhundert'
    ];
    for (const compound of compounds) {
      if (spokenLower.includes(compound)) {
        return numMap[compound] || null;
      }
    }

    return null;
  },

  isSupported() {
    return 'speechSynthesis' in window && 
           (window.SpeechRecognition || window.webkitSpeechRecognition);
  },

  isRecognitionSupported() {
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }
};
