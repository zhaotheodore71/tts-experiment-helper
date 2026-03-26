const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');

// 配置FFmpeg路径
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

const app = express();
const port = 3001;

// 配置中间件
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// 确保public目录存在
if (!fs.existsSync('./public')) {
  fs.mkdirSync('./public');
}
if (!fs.existsSync('./public/audio')) {
  fs.mkdirSync('./public/audio');
}

// 配置multer存储
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './public/audio');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage });

// 模拟TTS服务
app.post('/api/tts', async (req, res) => {
  try {
    const { text, voiceName = 'zh-CN-Standard-A', speakingRate = 1, pitch = 0, volumeGainDb = 0, bass = 0, treble = 0, reverb = 0, emotion = 'neutral', tone = '明亮', pauseTime = 0.5, emphasis = '' } = req.body;
    
    // 模拟TTS生成音频文件
    // 实际项目中这里应该调用Google Cloud Text-to-Speech API
    // 为了演示，我们创建一个简单的文本文件作为音频文件
    const audioFileName = Date.now() + '-tts.wav';
    const audioFilePath = path.join(__dirname, 'public', 'audio', audioFileName);
    
    // 模拟音频文件生成
    fs.writeFileSync(audioFilePath, `TTS Audio: ${text}\nVoice: ${voiceName}\nRate: ${speakingRate}\nPitch: ${pitch}\nVolume: ${volumeGainDb}\nBass: ${bass}\nTreble: ${treble}\nReverb: ${reverb}\nEmotion: ${emotion}\nTone: ${tone}\nPause Time: ${pauseTime}\nEmphasis: ${emphasis}`);
    
    // 生成音频文件URL
    const audioUrl = `http://localhost:3001/audio/${audioFileName}`;
    
    res.json({ success: true, audioUrl, message: '语音生成成功' });
  } catch (error) {
    console.error('TTS error:', error);
    res.status(500).json({ success: false, message: '语音生成失败' });
  }
});

// 上传噪音文件
app.post('/api/upload-noise', upload.single('noise'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: '未上传文件' });
    }
    
    const noiseUrl = `http://localhost:3001/audio/${req.file.filename}`;
    res.json({ success: true, noiseUrl, message: '噪音文件上传成功' });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ success: false, message: '文件上传失败' });
  }
});

// 混合语音和噪音
app.post('/api/mix-audio', async (req, res) => {
  try {
    const { voiceUrl, noiseUrl, voiceVolume = 1, noiseVolume = 0.5 } = req.body;
    
    // 从URL获取文件路径
    const voiceFileName = voiceUrl.split('/').pop();
    const noiseFileName = noiseUrl.split('/').pop();
    
    const voicePath = path.join(__dirname, 'public', 'audio', voiceFileName);
    const noisePath = path.join(__dirname, 'public', 'audio', noiseFileName);
    const outputFileName = Date.now() + '-mixed.wav';
    const outputPath = path.join(__dirname, 'public', 'audio', outputFileName);
    
    // 检查文件是否存在
    if (!fs.existsSync(voicePath) || !fs.existsSync(noisePath)) {
      return res.status(404).json({ success: false, message: '音频文件未找到' });
    }
    
    // 使用FFmpeg混合音频
    await new Promise((resolve, reject) => {
      ffmpeg()
        .input(voicePath)
        .input(noisePath)
        .filter('amix', ['inputs=2', `weights=${voiceVolume} ${noiseVolume}`, 'duration=first'])
        .output(outputPath)
        .on('end', () => resolve())
        .on('error', (err) => reject(err))
        .run();
    });
    
    const mixedUrl = `http://localhost:3001/audio/${outputFileName}`;
    res.json({ success: true, mixedUrl, message: '音频混合成功' });
  } catch (error) {
    console.error('Mix audio error:', error);
    res.status(500).json({ success: false, message: '音频混合失败' });
  }
});

// 评估语音在噪音环境下的可听性
app.post('/api/evaluate-audio', async (req, res) => {
  try {
    const { voiceUrl, noiseUrl, voiceVolume = 1, noiseVolume = 0.5 } = req.body;
    
    // 计算SNR (Signal-to-Noise Ratio)
    const snr = 20 * Math.log10(voiceVolume / noiseVolume);
    
    // 基于SNR评估可听性
    let intelligibility = '优秀';
    let recommendation = '无需调整';
    
    if (snr < 0) {
      intelligibility = '较差';
      recommendation = '增加语音音量或减少噪音音量';
    } else if (snr < 10) {
      intelligibility = '一般';
      recommendation = '建议增加语音音量';
    } else if (snr < 20) {
      intelligibility = '良好';
      recommendation = '微调可能会提高清晰度';
    }
    
    // 生成评估报告
    const evaluation = {
      snr: snr.toFixed(2),
      intelligibility,
      recommendation,
      parameters: {
        voiceVolume,
        noiseVolume,
        snr: snr.toFixed(2)
      }
    };
    
    res.json({ success: true, evaluation, message: '音频评估完成' });
  } catch (error) {
    console.error('Evaluation error:', error);
    res.status(500).json({ success: false, message: '评估失败' });
  }
});

// 启动服务器
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
