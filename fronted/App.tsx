import { useState, useRef } from 'react';
import './App.css';

interface AudioParams {
  speakingRate: number;
  pitch: number;
  volume: number;
  voiceName: string;
  eqSenior: boolean;
  bass: number;
  treble: number;
  reverb: number;
  emotion: string;
  tone: string;
  pauseTime: number;
  emphasis: string;
}

function App() {
  const [text, setText] = useState('');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [noiseUrl, setNoiseUrl] = useState<string | null>(null);
  const [mixedUrl, setMixedUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isMixing, setIsMixing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [params, setParams] = useState<AudioParams>({
    speakingRate: 1,
    pitch: 0,
    volume: 1,
    voiceName: 'zh-CN-Standard-A',
    eqSenior: false,
    bass: 0,
    treble: 0,
    reverb: 0,
    emotion: 'neutral',
    tone: '明亮',
    pauseTime: 0.5,
    emphasis: ''
  });
  const [noiseVolume, setNoiseVolume] = useState(0.5);
  const [voiceVolume, setVoiceVolume] = useState(1);
  const [evaluation, setEvaluation] = useState<any>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [experimentMode, setExperimentMode] = useState(false);
  const [experiments, setExperiments] = useState<Array<{
    id: number;
    params: AudioParams;
    voiceVolume: number;
    noiseVolume: number;
    audioUrl: string | null;
    mixedUrl: string | null;
    evaluation: any | null;
  }>>([]);
  const [isRunningExperiment, setIsRunningExperiment] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement>(null);

  // 生成TTS
  const generateTTS = async () => {
    if (!text.trim()) {
      setError('请输入文本');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      // 停止之前的语音播放
      window.speechSynthesis.cancel();
      
      // 使用Web Speech API在浏览器中生成语音
      const utterance = new SpeechSynthesisUtterance(text);
      
      // 设置语音参数
      utterance.rate = params.speakingRate;
      utterance.pitch = 1 + (params.pitch / 50); // 将-20到20的范围映射到0.5到1.5
      utterance.volume = params.volume;
      
      // 选择语音
      const voices = window.speechSynthesis.getVoices();
      // 尝试找到中文语音
      const chineseVoice = voices.find(voice => 
        voice.lang.includes('zh-CN') || voice.name.includes('Chinese')
      );
      if (chineseVoice) {
        utterance.voice = chineseVoice;
      }
      
      // 事件监听
      utterance.onstart = () => {
        setError('语音生成成功，正在播放...');
      };
      
      utterance.onend = () => {
        setError('语音播放完成');
      };
      
      utterance.onerror = (event) => {
        setError('语音播放失败');
        console.error('Speech synthesis error:', event);
      };
      
      // 播放语音
      window.speechSynthesis.speak(utterance);
      
      // 创建一个模拟的音频URL，以便在界面中显示
      const mockAudioUrl = `data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAD`;
      setAudioUrl(mockAudioUrl);
      setMixedUrl(null);
      
      // 在实验模式中显示音频
      if (experimentMode && experiments.length > 0) {
        // 更新第一个实验的音频URL
        setExperiments(prev => prev.map((exp, index) => 
          index === 0 ? { ...exp, audioUrl: mockAudioUrl } : exp
        ));
      }
    } catch (err) {
      setError('语音生成失败');
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  // 暂停语音
  const pauseSpeech = () => {
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.pause();
      setError('语音已暂停');
    }
  };

  // 恢复语音
  const resumeSpeech = () => {
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      setError('语音已恢复');
    }
  };

  // 停止语音
  const stopSpeech = () => {
    window.speechSynthesis.cancel();
    setError('语音已停止');
  };

  // 上传噪音文件
  const handleNoiseUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('noise', file);

    try {
      const response = await fetch('http://localhost:3001/api/upload-noise', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (data.success) {
        setNoiseUrl(data.noiseUrl);
      } else {
        setError(data.message || '噪音文件上传失败');
      }
    } catch (err) {
      setError('噪音文件上传失败');
      console.error(err);
    }
  };

  // 混合语音和噪音
  const mixAudio = async () => {
    if (!audioUrl || !noiseUrl) {
      setError('请先生成语音并上传噪音文件');
      return;
    }

    setIsMixing(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:3001/api/mix-audio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          voiceUrl: audioUrl,
          noiseUrl: noiseUrl,
          voiceVolume: voiceVolume,
          noiseVolume: noiseVolume,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setMixedUrl(data.mixedUrl);
      } else {
        setError(data.message || '音频混合失败');
      }
    } catch (err) {
      setError('音频混合失败');
      console.error(err);
    } finally {
      setIsMixing(false);
    }
  };

  // 评估语音在噪音环境下的可听性
  const evaluateAudio = async () => {
    if (!audioUrl || !noiseUrl) {
      setError('请先生成语音并上传噪音文件');
      return;
    }

    setIsEvaluating(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:3001/api/evaluate-audio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          voiceUrl: audioUrl,
          noiseUrl: noiseUrl,
          voiceVolume: voiceVolume,
          noiseVolume: noiseVolume,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setEvaluation(data.evaluation);
      } else {
        setError(data.message || '音频评估失败');
      }
    } catch (err) {
      setError('音频评估失败');
      console.error(err);
    } finally {
      setIsEvaluating(false);
    }
  };

  // 添加实验
  const addExperiment = () => {
    setExperiments(prev => [...prev, {
      id: Date.now(),
      params: { ...params },
      voiceVolume,
      noiseVolume,
      audioUrl: null,
      mixedUrl: null,
      evaluation: null
    }]);
  };

  // 运行实验
  const runExperiment = async (experiment: any) => {
    try {
      // 生成TTS
      const ttsResponse = await fetch('http://localhost:3001/api/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          voiceName: experiment.params.voiceName,
          speakingRate: experiment.params.speakingRate,
          pitch: experiment.params.pitch,
          volumeGainDb: experiment.params.volume - 1,
          bass: experiment.params.bass,
          treble: experiment.params.treble,
          reverb: experiment.params.reverb,
          emotion: experiment.params.emotion,
          tone: experiment.params.tone,
          pauseTime: experiment.params.pauseTime,
          emphasis: experiment.params.emphasis,
        }),
      });

      const ttsData = await ttsResponse.json();
      if (!ttsData.success) {
        throw new Error('语音生成失败');
      }

      const audioUrl = ttsData.audioUrl;

      // 混合音频
      const mixResponse = await fetch('http://localhost:3001/api/mix-audio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          voiceUrl: audioUrl,
          noiseUrl: noiseUrl!,
          voiceVolume: experiment.voiceVolume,
          noiseVolume: experiment.noiseVolume,
        }),
      });

      const mixData = await mixResponse.json();
      if (!mixData.success) {
        throw new Error('音频混合失败');
      }

      const mixedUrl = mixData.mixedUrl;

      // 评估音频
      const evalResponse = await fetch('http://localhost:3001/api/evaluate-audio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          voiceUrl: audioUrl,
          noiseUrl: noiseUrl!,
          voiceVolume: experiment.voiceVolume,
          noiseVolume: experiment.noiseVolume,
        }),
      });

      const evalData = await evalResponse.json();
      if (!evalData.success) {
        throw new Error('音频评估失败');
      }

      return {
        ...experiment,
        audioUrl,
        mixedUrl,
        evaluation: evalData.evaluation
      };
    } catch (error) {
      console.error('实验错误:', error);
      return experiment;
    }
  };

  // 运行所有实验
  const runAllExperiments = async () => {
    if (!text.trim() || !noiseUrl) {
      setError('请输入文本并上传噪音文件');
      return;
    }

    setIsRunningExperiment(true);
    setError(null);

    try {
      const updatedExperiments = await Promise.all(
        experiments.map(experiment => runExperiment(experiment))
      );
      setExperiments(updatedExperiments);
    } catch (error) {
      setError('运行实验失败');
      console.error(error);
    } finally {
      setIsRunningExperiment(false);
    }
  };

  // 删除实验
  const deleteExperiment = (id: number) => {
    setExperiments(prev => prev.filter(exp => exp.id !== id));
  };

  // 更新参数
  const updateParam = (key: keyof AudioParams, value: number | string | boolean) => {
    setParams(prev => ({
      ...prev,
      [key]: value
    }));
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>AI助手TTS平台</h1>
      </header>
      
      <main className="app-main">
        <section className="text-section">
          <h2>文本输入</h2>
          <div className="text-input-info">
            <p>提示：在文本中使用 <code>||</code> 标记添加停顿，例如："你好||世界" 将在"你好"和"世界"之间添加停顿。</p>
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="请输入要转换为语音的文本..."
            rows={5}
          />
          <button 
            onClick={generateTTS} 
            disabled={isGenerating}
            className="generate-btn"
          >
            {isGenerating ? '生成中...' : '生成语音'}
          </button>
        </section>

        <section className="audio-section">
          <h2>音频播放</h2>
          {error && <div className="error">{error}</div>}
          {audioUrl && (
            <div className="audio-player">
              <h3>原始语音</h3>
              <div className="speech-controls">
                <button onClick={pauseSpeech} className="control-btn pause-btn">
                  暂停
                </button>
                <button onClick={resumeSpeech} className="control-btn resume-btn">
                  恢复
                </button>
                <button onClick={stopSpeech} className="control-btn stop-btn">
                  停止
                </button>
              </div>
              <audio ref={audioRef} controls src={audioUrl} />
            </div>
          )}
          {mixedUrl && (
            <div className="audio-player">
              <h3>混合噪音</h3>
              <audio controls src={mixedUrl} />
            </div>
          )}
          {evaluation && (
            <div className="evaluation-result">
              <h3>音频评估</h3>
              <div className="evaluation-details">
                <p><strong>信噪比:</strong> {evaluation.snr} dB</p>
                <p><strong>可听性:</strong> {evaluation.intelligibility}</p>
                <p><strong>建议:</strong> {evaluation.recommendation}</p>
              </div>
            </div>
          )}
        </section>

        <section className="params-section">
          <h2>音频参数</h2>
          
          <div className="param-group">
            <label>语速: {params.speakingRate.toFixed(2)}</label>
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={params.speakingRate}
              onChange={(e) => updateParam('speakingRate', parseFloat(e.target.value))}
            />
          </div>

          <div className="param-group">
            <label>音调: {params.pitch.toFixed(2)}</label>
            <input
              type="range"
              min="-20"
              max="20"
              step="1"
              value={params.pitch}
              onChange={(e) => updateParam('pitch', parseFloat(e.target.value))}
            />
          </div>

          <div className="param-group">
            <label>音量: {params.volume.toFixed(2)}</label>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={params.volume}
              onChange={(e) => updateParam('volume', parseFloat(e.target.value))}
            />
          </div>

          <div className="param-group">
            <label>语音</label>
            <select
              value={params.voiceName}
              onChange={(e) => updateParam('voiceName', e.target.value)}
            >
              <option value="zh-CN-Standard-A">中文(标准) - 年轻女声</option>
              <option value="zh-CN-Standard-B">中文(标准) - 中年女声</option>
              <option value="zh-CN-Standard-C">中文(标准) - 老年女声</option>
              <option value="zh-CN-Standard-D">中文(标准) - 年轻男声</option>
              <option value="zh-CN-Standard-E">中文(标准) - 中年男声</option>
              <option value="zh-CN-Standard-F">中文(标准) - 老年男声</option>
              <option value="zh-CN-Standard-G">中文(标准) - 儿童</option>
            </select>
          </div>

          <div className="param-group">
            <label>低音: {params.bass.toFixed(2)}</label>
            <input
              type="range"
              min="-10"
              max="10"
              step="0.5"
              value={params.bass}
              onChange={(e) => updateParam('bass', parseFloat(e.target.value))}
            />
          </div>

          <div className="param-group">
            <label>高音: {params.treble.toFixed(2)}</label>
            <input
              type="range"
              min="-10"
              max="10"
              step="0.5"
              value={params.treble}
              onChange={(e) => updateParam('treble', parseFloat(e.target.value))}
            />
          </div>

          <div className="param-group">
            <label>混响: {params.reverb.toFixed(2)}</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={params.reverb}
              onChange={(e) => updateParam('reverb', parseFloat(e.target.value))}
            />
          </div>

          <div className="param-group">
            <label>音色</label>
            <select
              value={params.tone}
              onChange={(e) => updateParam('tone', e.target.value)}
            >
              <option value="明亮">明亮</option>
              <option value="低沉">低沉</option>
              <option value="沙哑">沙哑</option>
              <option value="温柔">温柔</option>
              <option value="干练">干练</option>
            </select>
          </div>

          <div className="param-group">
            <label>情感</label>
            <select
              value={params.emotion}
              onChange={(e) => updateParam('emotion', e.target.value)}
            >
              <option value="neutral">中性</option>
              <option value="happy">愉快</option>
              <option value="sad">悲伤</option>
              <option value="angry">愤怒</option>
              <option value="excited">兴奋</option>
            </select>
          </div>

          <div className="param-group">
            <label>停顿时间: {params.pauseTime.toFixed(2)}秒</label>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={params.pauseTime}
              onChange={(e) => updateParam('pauseTime', parseFloat(e.target.value))}
            />
          </div>

          <div className="param-group">
            <label>重音</label>
            <input
              type="text"
              value={params.emphasis}
              onChange={(e) => updateParam('emphasis', e.target.value)}
              placeholder="输入需要加重音的词语，用逗号分隔"
            />
          </div>

          <div className="param-group checkbox eq-senior-group">
            <div className="eq-senior-checkbox">
              <input
                type="checkbox"
                id="eqSenior"
                checked={params.eqSenior}
                onChange={(e) => updateParam('eqSenior', e.target.checked)}
              />
              <label htmlFor="eqSenior">适老化EQ</label>
            </div>
            <div className="param-info">
              <p>适老化EQ标准：增强中高频（1-4kHz），这是老年人听力最敏感的频段，同时适度提升低频，改善语音清晰度和可听性。</p>
            </div>
          </div>
        </section>

        <section className="noise-section">
          <h2>噪音控制</h2>
          <input
            type="file"
            accept="audio/*"
            onChange={handleNoiseUpload}
            placeholder="上传噪音文件"
          />
          {noiseUrl && (
            <div className="noise-controls">
              <div className="param-group">
                <label>语音音量: {voiceVolume.toFixed(2)}</label>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={voiceVolume}
                  onChange={(e) => setVoiceVolume(parseFloat(e.target.value))}
                />
              </div>
              <div className="param-group">
                <label>噪音音量: {noiseVolume.toFixed(2)}</label>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={noiseVolume}
                  onChange={(e) => setNoiseVolume(parseFloat(e.target.value))}
                />
              </div>
              <button 
                onClick={mixAudio} 
                disabled={isMixing || !audioUrl}
                className="mix-btn"
              >
                {isMixing ? '混合中...' : '混合音频'}
              </button>
              <button 
                onClick={evaluateAudio} 
                disabled={isEvaluating || !audioUrl}
                className="evaluate-btn"
              >
                {isEvaluating ? '评估中...' : '评估音频'}
              </button>
            </div>
          )}
        </section>

        <section className="experiment-section">
          <h2>实验模式</h2>
          <div className="experiment-info">
            <p>实验模式允许您创建多个不同参数的实验，批量运行并对比结果，帮助您找到最佳的语音效果。</p>
          </div>
          <div className="experiment-controls">
            <label className="experiment-toggle">
              <input
                type="checkbox"
                checked={experimentMode}
                onChange={(e) => setExperimentMode(e.target.checked)}
              />
              启用实验模式
            </label>
            {experimentMode && (
              <>
                <button 
                  onClick={addExperiment} 
                  className="add-experiment-btn"
                  title="添加一个新的实验，使用当前的参数设置"
                >
                  添加实验
                </button>
                <button 
                  onClick={runAllExperiments} 
                  disabled={isRunningExperiment || experiments.length === 0 || !noiseUrl}
                  className="run-experiments-btn"
                  title="运行所有已添加的实验，生成音频并评估效果"
                >
                  {isRunningExperiment ? '运行中...' : '运行所有实验'}
                </button>
              </>
            )}
          </div>
          
          {experimentMode && experiments.length === 0 && (
            <div className="experiment-empty">
              <p>还没有添加实验，请点击"添加实验"按钮创建实验。</p>
            </div>
          )}
          
          {experimentMode && experiments.length > 0 && (
            <div className="experiments-list">
              <div className="experiment-header-row">
                <h4>实验列表</h4>
                <p>共 {experiments.length} 个实验</p>
              </div>
              {experiments.map(experiment => (
                <div key={experiment.id} className="experiment-item">
                  <div className="experiment-header">
                    <h4>实验 {experiment.id}</h4>
                    <button 
                      onClick={() => deleteExperiment(experiment.id)}
                      className="delete-btn"
                      title="删除此实验"
                    >
                      删除
                    </button>
                  </div>
                  <div className="experiment-params">
                    <div className="params-grid">
                      <div className="param-item">
                        <strong>语速:</strong> {experiment.params.speakingRate.toFixed(2)}
                      </div>
                      <div className="param-item">
                        <strong>音调:</strong> {experiment.params.pitch.toFixed(2)}
                      </div>
                      <div className="param-item">
                        <strong>音量:</strong> {experiment.params.volume.toFixed(2)}
                      </div>
                      <div className="param-item">
                        <strong>语音:</strong> {experiment.params.voiceName}
                      </div>
                      <div className="param-item">
                        <strong>适老化EQ:</strong> {experiment.params.eqSenior ? '是' : '否'}
                      </div>
                      <div className="param-item">
                        <strong>低音:</strong> {experiment.params.bass.toFixed(2)}
                      </div>
                      <div className="param-item">
                        <strong>高音:</strong> {experiment.params.treble.toFixed(2)}
                      </div>
                      <div className="param-item">
                        <strong>混响:</strong> {experiment.params.reverb.toFixed(2)}
                      </div>
                      <div className="param-item">
                        <strong>音色:</strong> {experiment.params.tone}
                      </div>
                      <div className="param-item">
                        <strong>情感:</strong> {experiment.params.emotion}
                      </div>
                      <div className="param-item">
                        <strong>停顿时间:</strong> {experiment.params.pauseTime.toFixed(2)}秒
                      </div>
                      <div className="param-item">
                        <strong>重音:</strong> {experiment.params.emphasis || '无'}
                      </div>
                      <div className="param-item">
                        <strong>语音音量:</strong> {experiment.voiceVolume.toFixed(2)}
                      </div>
                      <div className="param-item">
                        <strong>噪音音量:</strong> {experiment.noiseVolume.toFixed(2)}
                      </div>
                    </div>
                  </div>
                  {experiment.evaluation && (
                    <div className="experiment-evaluation">
                      <h5>评估结果</h5>
                      <div className="evaluation-grid">
                        <div className="eval-item">
                          <strong>信噪比:</strong> {experiment.evaluation.snr} dB
                        </div>
                        <div className="eval-item">
                          <strong>可听性:</strong> {experiment.evaluation.intelligibility}
                        </div>
                        <div className="eval-item full-width">
                          <strong>建议:</strong> {experiment.evaluation.recommendation}
                        </div>
                      </div>
                    </div>
                  )}
                  {experiment.mixedUrl && (
                    <div className="experiment-audio">
                      <h5>音频</h5>
                      <audio controls src={experiment.mixedUrl} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

      </main>
    </div>
  );
}

export default App;
