const App = {
  currentScreen: 'home',
  currentAnswer: '',
  isMuted: false,
  isListening: false,
  voiceSupported: false,
  attemptsLeft: 0,

  elements: {},

  init() {
    this.cacheElements();
    this.loadSettings();
    this.initVoice();
    Sound.init();
    this.initGame();
    this.bindEvents();
    this.showScreen('home');
    this.updateStats();
    this.registerServiceWorker();
    this.checkVoiceSupport();
  },

  cacheElements() {
    this.elements = {
      screens: document.querySelectorAll('.screen'),
      homeScreen: document.getElementById('home-screen'),
      gameScreen: document.getElementById('game-screen'),
      profileScreen: document.getElementById('profile-screen'),
      numbersGrid: document.getElementById('numbers-grid'),
      selectAllBtn: document.getElementById('select-all-btn'),
      clearAllBtn: document.getElementById('clear-all-btn'),
      startBtn: document.getElementById('start-btn'),
      langToggle: document.getElementById('lang-toggle'),
      muteBtn: document.getElementById('mute-btn'),
      progressBar: document.getElementById('progress-bar'),
      progressFill: document.getElementById('progress-fill'),
      heartsCount: document.getElementById('hearts-count'),
      streakCount: document.getElementById('streak-count'),
      starsCount: document.getElementById('stars-count'),
      questionText: document.getElementById('question-text'),
      mascot: document.getElementById('mascot'),
      answerDisplay: document.getElementById('answer-display'),
      keypad: document.getElementById('keypad'),
      micBtn: document.getElementById('mic-btn'),
      feedbackText: document.getElementById('feedback-text'),
      continueBtn: document.getElementById('continue-btn'),
      gameOverScreen: document.getElementById('game-over-screen'),
      finalStars: document.getElementById('final-stars'),
      playAgainBtn: document.getElementById('play-again-btn'),
      homeBtn: document.getElementById('home-btn'),
      profileStars: document.getElementById('profile-stars'),
      profileStreak: document.getElementById('profile-streak'),
      profileMastered: document.getElementById('profile-mastered'),
      masteredNumbers: document.getElementById('mastered-numbers'),
      voiceWarning: document.getElementById('voice-warning'),
      headerHomeBtn: document.getElementById('home-btn'),
      viewProfileBtn: document.getElementById('view-profile-btn')
    };
  },

  loadSettings() {
    this.isMuted = Storage.getMuted();
    this.updateMuteButton();
    this.updateLanguageButtons();
  },

  initVoice() {
    Voice.init();
  },

  initGame() {
    Game.init();
    this.renderNumbersGrid();
  },

  bindEvents() {
    this.elements.selectAllBtn.addEventListener('click', () => {
      Game.selectAll();
      this.renderNumbersGrid();
    });

    this.elements.clearAllBtn.addEventListener('click', () => {
      Game.clearAll();
      this.renderNumbersGrid();
    });

    this.elements.startBtn.addEventListener('click', () => this.startGame());

    this.elements.viewProfileBtn.addEventListener('click', () => {
      this.showScreen('profile');
      this.updateProfile();
    });

    this.elements.headerHomeBtn.addEventListener('click', () => {
      this.showScreen('home');
      this.elements.headerHomeBtn.style.display = 'none';
    });

    document.querySelectorAll('.lang-btn').forEach(btn => {
      btn.addEventListener('click', (e) => this.changeLanguage(e.target.dataset.lang));
    });

    this.elements.muteBtn.addEventListener('click', () => this.toggleMute());

    document.querySelectorAll('.key-btn').forEach(btn => {
      btn.addEventListener('click', (e) => this.handleKeypad(e.target));
    });

    this.elements.micBtn.addEventListener('click', () => this.toggleMic());

    this.elements.continueBtn.addEventListener('click', () => this.nextQuestion());

    this.elements.playAgainBtn.addEventListener('click', () => {
      this.hideGameOver();
      this.startGame();
    });

    this.elements.homeBtn.addEventListener('click', () => {
      this.hideGameOver();
      this.showScreen('home');
    });

    this.elements.navHome.addEventListener('click', () => {
      this.showScreen('home');
      this.updateNav('home');
    });

    this.elements.navPlay.addEventListener('click', () => {
      if (Game.isPlaying) {
        this.showScreen('game');
      } else {
        this.showScreen('home');
      }
      this.updateNav('play');
    });

    this.elements.navProfile.addEventListener('click', () => {
      this.showScreen('profile');
      this.updateProfile();
      this.updateNav('profile');
    });
  },

  registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/multiplier/service-worker.js')
        .then(reg => console.log('Service Worker registered'))
        .catch(err => console.log('Service Worker error:', err));
    }
  },

  checkVoiceSupport() {
    this.voiceSupported = Voice.isSupported();
    if (!this.voiceSupported) {
      this.elements.voiceWarning.classList.remove('hidden');
    }
  },

  showScreen(screen) {
    this.elements.screens.forEach(s => s.classList.remove('active'));
    document.getElementById(`${screen}-screen`).classList.add('active');
    this.currentScreen = screen;
    
    if (screen === 'game' || screen === 'profile') {
      this.elements.headerHomeBtn.style.display = 'flex';
    } else {
      this.elements.headerHomeBtn.style.display = 'none';
    }
  },

  updateNav(screen) {
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`nav-${screen}`).classList.add('active');
  },

  renderNumbersGrid() {
    const grid = this.elements.numbersGrid;
    grid.innerHTML = '';
    const mastered = Game.getMasteredNumbers();

    for (let i = 1; i <= 12; i++) {
      const btn = document.createElement('button');
      btn.className = 'number-btn';
      btn.textContent = i;
      btn.dataset.num = i;

      if (Game.selectedNumbers.includes(i)) {
        btn.classList.add('selected');
      }

      if (mastered.includes(i)) {
        btn.classList.add('mastered');
      }

      btn.addEventListener('click', () => {
        const selected = Game.toggleNumber(i);
        btn.classList.toggle('selected', selected);
        this.updateStartButton();
      });

      grid.appendChild(btn);
    }

    this.updateStartButton();
  },

  updateStartButton() {
    const hasSelection = Game.selectedNumbers.length > 0;
    this.elements.startBtn.disabled = !hasSelection;
  },

  changeLanguage(lang) {
    Storage.setLanguage(lang);
    Voice.setLanguage(lang);
    this.updateLanguageButtons();
    this.renderNumbersGrid();
  },

  updateLanguageButtons() {
    const lang = Storage.getLanguage();
    document.querySelectorAll('.lang-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.lang === lang);
    });
  },

  toggleMute() {
    this.isMuted = !this.isMuted;
    Storage.setMuted(this.isMuted);
    this.updateMuteButton();
  },

  updateMuteButton() {
    this.elements.muteBtn.textContent = this.isMuted ? '🔇' : '🔊';
    this.elements.muteBtn.classList.toggle('active', this.isMuted);
    
    if (this.isMuted) {
      this.elements.keypad.classList.remove('hidden');
    } else {
      this.elements.keypad.classList.add('hidden');
    }
  },

  updateStats() {
    const stats = Game.getAllStats();
    this.elements.starsCount.textContent = stats.stars;
    this.elements.heartsCount.textContent = stats.hearts;
    this.elements.streakCount.textContent = stats.streak;
  },

  startGame() {
    if (Game.selectedNumbers.length === 0) {
      Game.selectAll();
      this.renderNumbersGrid();
    }

    Game.startGame();
    this.showScreen('game');
    this.updateNav('play');
    this.updateMuteButton();
    this.nextQuestion();
  },

  nextQuestion() {
    if (Game.isGameOver()) {
      this.showGameOver();
      return;
    }

    this.currentAnswer = '';
    this.attemptsLeft = 1;
    this.elements.answerDisplay.textContent = '';
    this.elements.answerDisplay.className = 'answer-display';
    this.elements.feedbackText.textContent = '';
    this.elements.continueBtn.classList.add('hidden');
    this.elements.mascot.className = 'mascot thinking';

    const question = Game.generateQuestion();
    if (!question) return;

    this.elements.questionText.textContent = `${question.num1} × ${question.num2} = ?`;

    const progress = Game.getProgress();
    const percent = ((progress.questionNumber - 1) / progress.maxQuestions) * 100;
    this.elements.progressFill.style.width = `${percent}%`;
    this.elements.heartsCount.textContent = progress.hearts;
    this.elements.streakCount.textContent = progress.streak;

    if (!this.isMuted) {
      Voice.speakQuestion(question.num1, question.num2, () => {
        this.startListening();
      });
    } else {
      this.elements.keypad.classList.remove('hidden');
      this.elements.micBtn.classList.remove('hidden');
    }
  },

  startListening() {
    if (this.isMuted) return;
    
    if (!this.voiceSupported) {
      console.log('Voice not supported');
      return;
    }

    this.isListening = true;
    this.elements.micBtn.classList.add('listening');
    this.elements.micBtn.innerHTML = '<span class="mic-icon">🎤</span> Listening...';
    Sound.playMicOn();

    Voice.startListening(
      (number, alternatives) => this.handleVoiceResult(number, alternatives),
      () => this.handleListeningEnd(),
      (error) => this.handleListeningError(error)
    );
  },

  handleVoiceResult(number, alternatives) {
    if (number !== null) {
      this.submitAnswer(number);
    } else {
      console.log('Could not understand:', alternatives);
      Sound.playIncorrect();
      this.isListening = false;
      this.elements.micBtn.classList.remove('listening');
      this.elements.micBtn.innerHTML = '<span class="mic-icon">🎤</span> Tap to speak';
      this.elements.feedbackText.textContent = 'Didn\'t catch that, try again!';
      this.elements.feedbackText.className = 'feedback-text incorrect';
    }
  },

  handleListeningEnd() {
    this.isListening = false;
    this.elements.micBtn.classList.remove('listening');
    this.elements.micBtn.innerHTML = '<span class="mic-icon">🎤</span> Tap to speak';
  },

  handleListeningError(error) {
    console.log('Listening error:', error);
    Sound.playMicOff();
    this.isListening = false;
    this.elements.micBtn.classList.remove('listening');
    this.elements.micBtn.innerHTML = '<span class="mic-icon">🎤</span> Tap to speak';
  },

  toggleMic() {
    if (this.isListening) {
      Voice.stopListening();
      Sound.playMicOff();
      this.handleListeningEnd();
    } else {
      this.startListening();
    }
  },

  handleKeypad(btn) {
    const action = btn.dataset.action;
    const value = btn.dataset.value;

    if (action === 'clear') {
      this.currentAnswer = '';
    } else if (action === 'backspace') {
      this.currentAnswer = this.currentAnswer.slice(0, -1);
    } else if (action === 'submit') {
      if (this.currentAnswer) {
        this.submitAnswer(parseInt(this.currentAnswer, 10));
      }
      return;
    } else if (value) {
      if (this.currentAnswer.length < 3) {
        this.currentAnswer += value;
      }
    }

    this.elements.answerDisplay.textContent = this.currentAnswer;

    if (navigator.vibrate) {
      navigator.vibrate(10);
    }
  },

  submitAnswer(answer) {
    if (!answer && answer !== 0) return;

    Voice.stopListening();
    this.isListening = false;
    this.elements.micBtn.classList.remove('listening');
    this.elements.micBtn.innerHTML = '<span class="mic-icon">🎤</span> Tap to speak';

    const result = Game.checkAnswer(answer);

    this.elements.answerDisplay.textContent = answer;
    this.elements.progressFill.style.width = `${(Game.questionNumber / Game.maxQuestions) * 100}%`;

    if (result.correct) {
      this.handleCorrectAnswer(result);
    } else {
      this.handleIncorrectAnswer(result);
    }

    this.updateStats();
  },

  handleCorrectAnswer(result) {
    this.elements.answerDisplay.className = 'answer-display correct';
    this.elements.mascot.className = 'mascot celebrating';
    
    const progress = Game.getProgress();
    this.elements.heartsCount.textContent = result.hearts;
    this.elements.streakCount.textContent = progress.streak;

    Sound.playCorrect();

    if (result.mastered) {
      this.elements.feedbackText.textContent = '🎉 Mastered!';
      this.elements.feedbackText.className = 'feedback-text correct';
      this.renderNumbersGrid();
      Sound.playMastered();
    } else if (result.streak >= 3) {
      this.elements.feedbackText.textContent = `🔥 On fire! ${result.streak} in a row!`;
      this.elements.feedbackText.className = 'feedback-text correct';
    } else {
      this.elements.feedbackText.textContent = '✓ Correct!';
      this.elements.feedbackText.className = 'feedback-text correct';
    }

    this.showConfetti();

    setTimeout(() => {
      this.nextQuestion();
    }, 1000);
  },

  handleIncorrectAnswer(result) {
    this.elements.answerDisplay.className = 'answer-display incorrect';
    this.elements.mascot.className = 'mascot';
    
    Sound.playIncorrect();

    if (this.attemptsLeft > 0) {
      this.attemptsLeft--;
      this.elements.feedbackText.textContent = 'Try again!';
      this.elements.feedbackText.className = 'feedback-text incorrect';
      this.currentAnswer = '';
      this.elements.answerDisplay.textContent = '';
      this.elements.continueBtn.classList.add('hidden');
      
      if (!this.isMuted && !this.isListening) {
        setTimeout(() => {
          this.startListening();
        }, 800);
      }
    } else {
      this.elements.feedbackText.textContent = `The answer was ${result.correctAnswer}`;
      this.elements.feedbackText.className = 'feedback-text incorrect';

      if (result.hearts <= 0) {
        setTimeout(() => this.showGameOver(), 1500);
      } else {
        setTimeout(() => {
          this.nextQuestion();
        }, 2000);
      }
    }
  },
      }
    }
  },

  showConfetti() {
    const container = document.createElement('div');
    container.className = 'confetti';
    document.body.appendChild(container);

    const colors = ['#FFD700', '#FF006E', '#00D9FF', '#6B46C1', '#48BB78', '#F6AD55'];

    for (let i = 0; i < 50; i++) {
      const piece = document.createElement('div');
      piece.className = 'confetti-piece';
      piece.style.left = Math.random() * 100 + '%';
      piece.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      piece.style.animationDelay = Math.random() * 0.5 + 's';
      piece.style.animationDuration = (2 + Math.random() * 2) + 's';
      container.appendChild(piece);
    }

    setTimeout(() => container.remove(), 4000);
  },

  showGameOver() {
    Game.endGame();
    const stats = Game.getAllStats();
    this.elements.finalStars.textContent = stats.stars;
    this.elements.gameOverScreen.classList.remove('hidden');
  },

  hideGameOver() {
    this.elements.gameOverScreen.classList.add('hidden');
  },

  updateProfile() {
    const stats = Game.getAllStats();
    this.elements.profileStars.textContent = stats.stars;
    this.elements.profileStreak.textContent = stats.streak;
    this.elements.profileMastered.textContent = stats.masteredNumbers.length;

    const masteredContainer = this.elements.masteredNumbers;
    masteredContainer.innerHTML = '';

    if (stats.masteredNumbers.length === 0) {
      masteredContainer.innerHTML = '<div class="empty-state">No numbers mastered yet. Keep practicing!</div>';
    } else {
      stats.masteredNumbers.forEach(num => {
        const numEl = document.createElement('div');
        numEl.className = 'mastered-num';
        numEl.textContent = num;
        masteredContainer.appendChild(numEl);
      });
    }
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
