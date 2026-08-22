/* ============================================================
   DEDAO 得道 —— 音频管理模块
   ============================================================ */
var AudioManager = (function () {
  'use strict';

  var audioCtx = null;
  var bgmAudio = null;
  var currentBgm = null;
  var pendingBgm = null;
  var bgmVolume = 0.5;
  var sfxVolume = 0.5;
  var bgmEnabled = true;
  var sfxEnabled = true;
  var activated = false;
  var fadeTimer = null;

  // 音效频率映射（合成音效）
  var SFX_FREQ = {
    click: 520,
    good: 880,
    win: 1320,
    bad: 180,
    break: 1760,
    attack: 300,
    spell: 600,
    hit: 150,
    miss: 400,
    levelup: 1000,
    item: 700,
    money: 900,
    heal: 500,
    explore: 450,
    battle_start: 250,
    battle_end: 800
  };

  // 初始化音频上下文
  function initCtx() {
    if (audioCtx) return true;
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
      return true;
    } catch (e) {
      return false;
    }
  }

  // 激活音频（用户交互后调用）
  function activate() {
    if (activated) return;
    initCtx();
    activated = true;
    // 播放等待中的BGM
    if (pendingBgm) {
      playBgm(pendingBgm);
      pendingBgm = null;
    }
  }

  // 播放合成音效
  function playSynthSfx(name) {
    if (!audioCtx || !SFX_FREQ[name]) return;
    try {
      var osc = audioCtx.createOscillator();
      var g = audioCtx.createGain();
      osc.connect(g);
      g.connect(audioCtx.destination);
      osc.type = 'sine';
      osc.frequency.value = SFX_FREQ[name];
      var vol = sfxVolume * 0.18;
      g.gain.setValueAtTime(vol, audioCtx.currentTime);
      var duration = name === 'break' ? 0.6 : 0.15;
      g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (e) {}
  }

  // 播放音效
  function playSfx(name) {
    if (!sfxEnabled || !SFX_FREQ[name]) return;
    if (!activated) return; // 未激活时不播放
    playSynthSfx(name);
  }

  // 播放BGM
  function playBgm(name) {
    if (!bgmEnabled) return;
    if (!activated) {
      // 保存BGM名称，等待激活后播放
      pendingBgm = name;
      return;
    }
    
    // 如果正在播放相同的BGM，忽略
    if (currentBgm === name && bgmAudio && !bgmAudio.paused) return;
    
    // 停止当前BGM
    stopBgm();
    
    // 使用合成音作为BGM
    if (audioCtx) {
      try {
        var osc = audioCtx.createOscillator();
        var g = audioCtx.createGain();
        osc.connect(g);
        g.connect(audioCtx.destination);
        
        // 根据BGM类型设置频率
        var freqs = {
          title: 262,
          game: 330,
          battle: 196,
          peaceful: 392,
          sect: 294,
          adventure: 349,
          ending: 523
        };
        
        osc.type = 'sine';
        osc.frequency.value = freqs[name] || 262;
        g.gain.setValueAtTime(0, audioCtx.currentTime);
        g.gain.linearRampToValueAtTime(bgmVolume * 0.3, audioCtx.currentTime + 1);
        
        osc.start();
        
        bgmAudio = { osc: osc, gain: g, paused: false };
        currentBgm = name;
      } catch (e) {}
    }
  }

  // 停止BGM
  function stopBgm() {
    if (bgmAudio) {
      try {
        if (bgmAudio.osc) {
          bgmAudio.osc.stop();
        }
      } catch (e) {}
      bgmAudio = null;
      currentBgm = null;
    }
  }

  // 暂停BGM
  function pauseBgm() {
    if (bgmAudio && bgmAudio.gain) {
      try {
        bgmAudio.gain.gain.setValueAtTime(0, audioCtx.currentTime);
        bgmAudio.paused = true;
      } catch (e) {}
    }
  }

  // 恢复BGM
  function resumeBgm() {
    if (bgmAudio && bgmAudio.gain && bgmEnabled) {
      try {
        bgmAudio.gain.gain.linearRampToValueAtTime(bgmVolume * 0.1, audioCtx.currentTime + 0.5);
        bgmAudio.paused = false;
      } catch (e) {}
    }
  }

  // 设置BGM音量
  function setBgmVolume(vol) {
    bgmVolume = Math.max(0, Math.min(1, vol));
    if (bgmAudio && bgmAudio.gain && !bgmAudio.paused) {
      try {
        bgmAudio.gain.gain.setValueAtTime(bgmVolume * 0.1, audioCtx.currentTime);
      } catch (e) {}
    }
  }

  // 设置音效音量
  function setSfxVolume(vol) {
    sfxVolume = Math.max(0, Math.min(1, vol));
  }

  // 启用/禁用BGM
  function enableBgm(enabled) {
    bgmEnabled = enabled;
    if (!enabled) {
      stopBgm();
    }
  }

  // 启用/禁用音效
  function enableSfx(enabled) {
    sfxEnabled = enabled;
  }

  // 检查是否已激活
  function isInitialized() {
    return activated;
  }

  // 获取当前BGM名称
  function getCurrentBgm() {
    return currentBgm;
  }

  // 检查BGM是否正在播放
  function isBgmPlaying() {
    return bgmAudio && !bgmAudio.paused;
  }

  // 初始化配置
  function init(config) {
    if (config) {
      if (config.bgmVolume !== undefined) bgmVolume = config.bgmVolume;
      if (config.sfxVolume !== undefined) sfxVolume = config.sfxVolume;
      if (config.bgmEnabled !== undefined) bgmEnabled = config.bgmEnabled;
      if (config.sfxEnabled !== undefined) sfxEnabled = config.sfxEnabled;
    }
  }

  // 清理资源
  function destroy() {
    stopBgm();
    if (audioCtx) {
      audioCtx.close();
      audioCtx = null;
    }
    activated = false;
  }

  // 公开API
  return {
    init: init,
    activate: activate,
    playSfx: playSfx,
    playBgm: playBgm,
    stopBgm: stopBgm,
    pauseBgm: pauseBgm,
    resumeBgm: resumeBgm,
    setBgmVolume: setBgmVolume,
    setSfxVolume: setSfxVolume,
    enableBgm: enableBgm,
    enableSfx: enableSfx,
    isInitialized: isInitialized,
    getCurrentBgm: getCurrentBgm,
    isBgmPlaying: isBgmPlaying,
    destroy: destroy
  };
})();
