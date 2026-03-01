const Storage = {
  STORAGE_KEY: 'multiplier-hero',

  getData() {
    const data = localStorage.getItem(this.STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
    return this.getDefaultData();
  },

  getDefaultData() {
    return {
      settings: {
        language: 'en',
        muted: false,
        soundEnabled: true
      },
      progress: {
        numbers: {},
        stars: 0,
        streak: 0,
        hearts: 3,
        lastPlayed: null,
        totalCorrect: 0,
        totalIncorrect: 0
      }
    };
  },

  saveData(data) {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
  },

  getSettings() {
    return this.getData().settings;
  },

  saveSettings(settings) {
    const data = this.getData();
    data.settings = settings;
    this.saveData(data);
  },

  getLanguage() {
    return this.getSettings().language;
  },

  setLanguage(lang) {
    const settings = this.getSettings();
    settings.language = lang;
    this.saveSettings(settings);
  },

  getMuted() {
    return this.getSettings().muted;
  },

  setMuted(muted) {
    const settings = this.getSettings();
    settings.muted = muted;
    this.saveSettings(settings);
  },

  getSoundEnabled() {
    return this.getSettings().soundEnabled;
  },

  setSoundEnabled(enabled) {
    const settings = this.getSettings();
    settings.soundEnabled = enabled;
    this.saveSettings(settings);
  },

  getProgress() {
    return this.getData().progress;
  },

  getNumberProgress(num) {
    const progress = this.getProgress();
    if (!progress.numbers[num]) {
      progress.numbers[num] = {
        correct: 0,
        incorrect: 0,
        mastered: false,
        streak: 0
      };
    }
    return progress.numbers[num];
  },

  recordAnswer(num, correct) {
    const data = this.getData();
    const numProgress = this.getNumberProgress(num);

    if (correct) {
      numProgress.correct++;
      numProgress.streak++;
      data.progress.totalCorrect++;
      data.progress.stars += 1;

      if (numProgress.streak >= 8 && !numProgress.mastered) {
        numProgress.mastered = true;
      }
    } else {
      numProgress.incorrect++;
      numProgress.streak = 0;
      data.progress.totalIncorrect++;
      data.progress.hearts = Math.max(0, data.progress.hearts - 1);
    }

    data.progress.numbers[num] = numProgress;
    this.saveData(data);

    return {
      mastered: numProgress.mastered,
      hearts: data.progress.hearts,
      stars: data.progress.stars
    };
  },

  updateStreak() {
    const data = this.getData();
    const today = new Date().toDateString();
    const lastPlayed = data.progress.lastPlayed;

    if (!lastPlayed) {
      data.progress.streak = 1;
    } else if (lastPlayed !== today) {
      const lastDate = new Date(lastPlayed);
      const todayDate = new Date(today);
      const diffDays = Math.floor((todayDate - lastDate) / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        data.progress.streak++;
      } else if (diffDays > 1) {
        data.progress.streak = 1;
      }
    }

    data.progress.lastPlayed = today;
    this.saveData(data);

    return data.progress.streak;
  },

  resetHearts() {
    const data = this.getData();
    data.progress.hearts = 3;
    this.saveData(data);
    return 3;
  },

  getMasteredNumbers() {
    const progress = this.getProgress();
    const mastered = [];
    for (let i = 1; i <= 12; i++) {
      if (progress.numbers[i]?.mastered) {
        mastered.push(i);
      }
    }
    return mastered;
  },

  getAllStats() {
    const progress = this.getProgress();
    return {
      stars: progress.stars,
      streak: progress.streak,
      hearts: progress.hearts,
      totalCorrect: progress.totalCorrect,
      totalIncorrect: progress.totalIncorrect,
      masteredNumbers: this.getMasteredNumbers()
    };
  }
};
