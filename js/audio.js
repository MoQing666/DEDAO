/* ============================================================
   DEDAO 得道 —— 音频管理模块
   ============================================================ */
var AudioManager = (function () {
  'use strict';

  var audioCtx = null;
  var bgmAudio = null;
  var currentBgm = null;
  var currentBgmSrc = null;
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

  // BGM文件映射
  var BGM_FILES = {
    title: 'assets/audio/bgm/bgm_main.mp3',
    game: 'assets/audio/bgm/bgm_main.mp3',
    battle: 'assets/audio/bgm/bgm_battle.mp3',
    peaceful: 'assets/audio/bgm/bgm_main.mp3',
    sect: 'assets/audio/bgm/bgm_main.mp3',
    adventure: 'assets/audio/bgm/bgm_main.mp3',
    ending: 'assets/audio/bgm/bgm_main.mp3'
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
    // 确保AudioContext恢复运行
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().then(function() {
        activated = true;
        // 播放等待中的BGM
        if (pendingBgm) {
          playBgm(pendingBgm);
          pendingBgm = null;
        }
      });
      return;
    }
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
      pendingBgm = name;
      return;
    }
    
    var targetSrc = BGM_FILES[name] || '';
    
    // 如果正在播放相同的音频文件，只更新名称，不重启
    if (targetSrc && currentBgmSrc === targetSrc && bgmAudio && !bgmAudio.paused) {
      currentBgm = name;
      return;
    }
    
    // 停止当前BGM
    stopBgm();
    
    if (targetSrc) {
      try {
        var audio = new Audio();
        audio.preload = 'auto';
        audio.loop = true;
        audio.volume = 0;
        
        var audioId = Date.now();
        audio._audioId = audioId;
        currentBgm = name;
        currentBgmSrc = targetSrc;
        
        audio.addEventListener('canplaythrough', function() {
          if (!bgmAudio || bgmAudio._audioId !== audioId) {
            audio.pause();
            audio.removeAttribute('src');
            audio.load();
            return;
          }
          
          audio.play().then(function() {
            var targetVol = bgmVolume * 0.6;
            var steps = 20;
            var stepTime = 1000 / steps;
            var volStep = targetVol / steps;
            var step = 0;
            
            fadeTimer = setInterval(function() {
              step++;
              if (step >= steps) {
                audio.volume = targetVol;
                clearInterval(fadeTimer);
                fadeTimer = null;
              } else {
                audio.volume = volStep * step;
              }
            }, stepTime);
          }).catch(function(e) {
            if (bgmAudio && bgmAudio._audioId === audioId) {
              playSynthBgm(name);
            }
          });
        }, { once: true });
        
        audio.addEventListener('error', function() {
          if (bgmAudio && bgmAudio._audioId === audioId) {
            playSynthBgm(name);
          }
        }, { once: true });
        
        bgmAudio = audio;
        audio.src = targetSrc;
      } catch (e) {
        playSynthBgm(name);
      }
    } else {
      playSynthBgm(name);
    }
  }
  
  // 合成BGM
  function playSynthBgm(name) {
    if (audioCtx) {
      try {
        var osc = audioCtx.createOscillator();
        var g = audioCtx.createGain();
        osc.connect(g);
        g.connect(audioCtx.destination);
        
        var freqs = {
          title: 262, game: 330, battle: 196,
          peaceful: 392, sect: 294, adventure: 349, ending: 523
        };
        
        osc.type = 'sine';
        osc.frequency.value = freqs[name] || 262;
        g.gain.setValueAtTime(0, audioCtx.currentTime);
        g.gain.linearRampToValueAtTime(bgmVolume * 0.3, audioCtx.currentTime + 1);
        osc.start();
        
        bgmAudio = { osc: osc, gain: g, paused: false };
        currentBgm = name;
        currentBgmSrc = null;
      } catch (e) {}
    }
  }

  // 停止BGM
  function stopBgm() {
    if (fadeTimer) {
      clearInterval(fadeTimer);
      fadeTimer = null;
    }
    if (bgmAudio) {
      try {
        if (bgmAudio.osc) {
          bgmAudio.osc.stop();
        } else if (bgmAudio.pause) {
          bgmAudio.pause();
          bgmAudio.removeAttribute('src');
          bgmAudio.load();
        }
      } catch (e) {}
      bgmAudio = null;
      currentBgm = null;
      currentBgmSrc = null;
    }
  }

  // 暂停BGM
  function pauseBgm() {
    if (bgmAudio) {
      try {
        if (bgmAudio.gain) {
          bgmAudio.gain.gain.setValueAtTime(0, audioCtx.currentTime);
          bgmAudio.paused = true;
        } else if (bgmAudio.pause) {
          bgmAudio.pause();
        }
      } catch (e) {}
    }
  }

  // 恢复BGM
  function resumeBgm() {
    if (bgmAudio && bgmEnabled) {
      try {
        if (bgmAudio.gain) {
          bgmAudio.gain.gain.linearRampToValueAtTime(bgmVolume * 0.1, audioCtx.currentTime + 0.5);
          bgmAudio.paused = false;
        } else if (bgmAudio.play) {
          bgmAudio.play();
        }
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
