#!/usr/bin/env node
/**
 * DEDAO 音频生成脚本
 * 生成占位符音效和BGM文件
 * 运行: node generate-audio.js
 */

const fs = require('fs');
const path = require('path');

// 确保目录存在
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log('Created:', dir);
  }
}

// 生成简单的WAV文件（无压缩PCM格式）
function generateWav(filename, options = {}) {
  const {
    duration = 0.5,      // 秒
    frequency = 440,     // Hz
    sampleRate = 44100,  // 采样率
    volume = 0.5,        // 音量 0-1
    type = 'sine',       // sine, square, sawtooth, noise
    fadeOut = true        // 是否淡出
  } = options;

  const numSamples = Math.floor(sampleRate * duration);
  const buffer = Buffer.alloc(44 + numSamples * 2); // WAV header + 16-bit samples

  // WAV header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + numSamples * 2, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // chunk size
  buffer.writeUInt16LE(1, 20);  // PCM format
  buffer.writeUInt16LE(1, 22);  // mono
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28); // byte rate
  buffer.writeUInt16LE(2, 32);  // block align
  buffer.writeUInt16LE(16, 34); // bits per sample
  buffer.write('data', 36);
  buffer.writeUInt32LE(numSamples * 2, 40);

  // Generate samples
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    let sample = 0;

    switch (type) {
      case 'sine':
        sample = Math.sin(2 * Math.PI * frequency * t);
        break;
      case 'square':
        sample = Math.sin(2 * Math.PI * frequency * t) > 0 ? 1 : -1;
        break;
      case 'sawtooth':
        sample = 2 * (t * frequency - Math.floor(t * frequency + 0.5));
        break;
      case 'noise':
        sample = Math.random() * 2 - 1;
        break;
      case 'chime':
        sample = Math.sin(2 * Math.PI * frequency * t) * Math.exp(-t * 5);
        break;
      case 'sweep':
        const freq = frequency * (1 + t * 2);
        sample = Math.sin(2 * Math.PI * freq * t);
        break;
    }

    // Apply envelope
    let envelope = volume;
    if (fadeOut) {
      envelope *= Math.max(0, 1 - (i / numSamples));
    }
    // Fade in
    const fadeInSamples = Math.min(numSamples * 0.1, 1000);
    if (i < fadeInSamples) {
      envelope *= i / fadeInSamples;
    }

    sample *= envelope * 32767;
    buffer.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(sample))), 44 + i * 2);
  }

  fs.writeFileSync(filename, buffer);
  console.log('Generated:', filename);
}

// 生成简单的MP3占位符（实际上是空文件，需要用户替换）
function generatePlaceholder(filename, type) {
  // 创建一个最小的WAV文件作为占位符
  const buffer = Buffer.alloc(44);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(44100, 24);
  buffer.writeUInt32LE(88200, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(0, 40);
  fs.writeFileSync(filename, buffer);
  console.log('Placeholder:', filename);
}

// 主函数
function main() {
  console.log('=== DEDAO 音频文件生成器 ===\n');

  const baseDir = path.join(__dirname, 'assets', 'audio');
  const sfxDir = path.join(baseDir, 'sfx');
  const bgmDir = path.join(baseDir, 'bgm');

  ensureDir(baseDir);
  ensureDir(sfxDir);
  ensureDir(bgmDir);

  console.log('\n--- 生成音效文件 ---');

  // 音效配置
  const sfxConfigs = {
    'click': { duration: 0.1, frequency: 800, type: 'sine', volume: 0.3 },
    'good': { duration: 0.3, frequency: 880, type: 'chime', volume: 0.4 },
    'win': { duration: 0.5, frequency: 1320, type: 'chime', volume: 0.5 },
    'bad': { duration: 0.3, frequency: 200, type: 'square', volume: 0.3 },
    'break': { duration: 0.8, frequency: 1760, type: 'sweep', volume: 0.5 },
    'attack': { duration: 0.2, frequency: 300, type: 'sawtooth', volume: 0.4 },
    'spell': { duration: 0.4, frequency: 600, type: 'sine', volume: 0.4 },
    'hit': { duration: 0.15, frequency: 150, type: 'noise', volume: 0.5 },
    'miss': { duration: 0.2, frequency: 400, type: 'sine', volume: 0.2 },
    'levelup': { duration: 0.6, frequency: 1000, type: 'chime', volume: 0.5 },
    'item': { duration: 0.25, frequency: 700, type: 'chime', volume: 0.4 },
    'money': { duration: 0.2, frequency: 900, type: 'sine', volume: 0.3 },
    'heal': { duration: 0.35, frequency: 500, type: 'sine', volume: 0.3 },
    'explore': { duration: 0.4, frequency: 450, type: 'sweep', volume: 0.3 },
    'battle_start': { duration: 0.5, frequency: 250, type: 'sawtooth', volume: 0.4 },
    'battle_end': { duration: 0.6, frequency: 800, type: 'chime', volume: 0.4 }
  };

  for (const [name, config] of Object.entries(sfxConfigs)) {
    const filename = path.join(sfxDir, `${name}.wav`);
    generateWav(filename, config);
  }

  console.log('\n--- 生成BGM文件 ---');

  // BGM配置（生成简单的音调循环）
  const bgmConfigs = {
    'title': { duration: 30, frequency: 262, type: 'sine', volume: 0.2 },
    'game': { duration: 60, frequency: 330, type: 'sine', volume: 0.15 },
    'battle': { duration: 45, frequency: 196, type: 'sawtooth', volume: 0.15 },
    'peaceful': { duration: 60, frequency: 392, type: 'sine', volume: 0.12 },
    'sect': { duration: 45, frequency: 294, type: 'sine', volume: 0.15 },
    'adventure': { duration: 50, frequency: 349, type: 'sine', volume: 0.15 },
    'ending': { duration: 40, frequency: 523, type: 'chime', volume: 0.2 }
  };

  for (const [name, config] of Object.entries(bgmConfigs)) {
    const filename = path.join(bgmDir, `${name}.wav`);
    generateWav(filename, { ...config, fadeOut: false });
  }

  console.log('\n=== 完成 ===');
  console.log('\n注意：');
  console.log('1. 生成的WAV文件是简单的占位符音效');
  console.log('2. 建议替换为更高质量的音效和BGM文件');
  console.log('3. 支持格式：WAV, MP3, OGG');
  console.log('4. 如需使用MP3格式，请手动转换或替换文件');
  console.log('\n免费资源网站：');
  console.log('- 音效: freesound.org, mixkit.co');
  console.log('- BGM: incompetech.com, freepd.com');
}

main();
