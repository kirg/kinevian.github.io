const Game = {
  selectedNumbers: [],
  currentQuestion: null,
  questionNumber: 0,
  maxQuestions: 10,
  correctInRow: 0,
  isPlaying: false,
  difficulty: {},

  init() {
    this.loadSelectedNumbers();
    this.initDifficulty();
  },

  loadSelectedNumbers() {
    const saved = localStorage.getItem('selectedNumbers');
    if (saved) {
      this.selectedNumbers = JSON.parse(saved);
    } else {
      this.selectedNumbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    }
  },

  saveSelectedNumbers() {
    localStorage.setItem('selectedNumbers', JSON.stringify(this.selectedNumbers));
  },

  initDifficulty() {
    for (let i = 1; i <= 12; i++) {
      const progress = Storage.getNumberProgress(i);
      const successRate = progress.correct / (progress.correct + progress.incorrect + 1);
      this.difficulty[i] = successRate < 0.7 ? 1 : successRate < 0.9 ? 0.5 : 0.2;
    }
  },

  toggleNumber(num) {
    const index = this.selectedNumbers.indexOf(num);
    if (index > -1) {
      if (this.selectedNumbers.length > 1) {
        this.selectedNumbers.splice(index, 1);
      }
    } else {
      this.selectedNumbers.push(num);
    }
    this.saveSelectedNumbers();
    return this.selectedNumbers.includes(num);
  },

  selectAll() {
    this.selectedNumbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    this.saveSelectedNumbers();
  },

  clearAll() {
    this.selectedNumbers = [];
    this.saveSelectedNumbers();
  },

  getWeightedQuestion() {
    if (this.selectedNumbers.length === 0) {
      this.selectedNumbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
      this.saveSelectedNumbers();
    }

    const weights = [];
    let totalWeight = 0;

    for (const num of this.selectedNumbers) {
      const weight = this.difficulty[num] || 1;
      weights.push({ num, weight });
      totalWeight += weight;
    }

    let random = Math.random() * totalWeight;
    
    for (const item of weights) {
      random -= item.weight;
      if (random <= 0) {
        return item.num;
      }
    }

    return this.selectedNumbers[0];
  },

  generateQuestion() {
    if (this.selectedNumbers.length === 0) {
      return null;
    }

    const num1 = this.getWeightedQuestion();
    const num2 = Math.floor(Math.random() * 12) + 1;

    this.currentQuestion = {
      num1,
      num2,
      answer: num1 * num2,
      asked: []
    };

    this.questionNumber++;
    return this.currentQuestion;
  },

  checkAnswer(answer) {
    if (!this.currentQuestion) {
      return { correct: false, answer: null };
    }

    const correct = answer === this.currentQuestion.answer;
    const result = Storage.recordAnswer(this.currentQuestion.num1, correct);

    if (correct) {
      this.correctInRow++;
      this.difficulty[this.currentQuestion.num1] = Math.max(0.1, this.difficulty[this.currentQuestion.num1] - 0.15);
    } else {
      this.correctInRow = 0;
      this.difficulty[this.currentQuestion.num1] = Math.min(2, this.difficulty[this.currentQuestion.num1] + 0.3);
    }

    Storage.updateStreak();

    return {
      correct,
      correctAnswer: this.currentQuestion.answer,
      num1: this.currentQuestion.num1,
      num2: this.currentQuestion.num2,
      mastered: result.mastered,
      hearts: result.hearts,
      stars: result.stars,
      streak: this.correctInRow
    };
  },

  startGame() {
    this.questionNumber = 0;
    this.correctInRow = 0;
    this.isPlaying = true;
    Storage.resetHearts();
  },

  endGame() {
    this.isPlaying = false;
  },

  isGameOver() {
    const progress = Storage.getProgress();
    return progress.hearts <= 0;
  },

  getProgress() {
    return {
      questionNumber: this.questionNumber,
      maxQuestions: this.maxQuestions,
      correctInRow: this.correctInRow,
      hearts: Storage.getProgress().hearts,
      stars: Storage.getProgress().stars,
      streak: Storage.getProgress().streak
    };
  },

  getMasteredNumbers() {
    return Storage.getMasteredNumbers();
  },

  getNumberStats(num) {
    return Storage.getNumberProgress(num);
  },

  getAllStats() {
    return Storage.getAllStats();
  }
};
