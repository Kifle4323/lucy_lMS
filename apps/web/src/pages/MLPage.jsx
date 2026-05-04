import { useState, useEffect } from 'react';
import { api } from '../api';

const ML_URL = 'http://localhost:8000';

// ─── Visual Components ────────────────────────────────────────────────────────

function PercentRing({ value, size = 120, strokeWidth = 10, label, colorClass }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  const colors = {
    green: { ring: '#22c55e', bg: '#bbf7d0', text: 'text-green-700' },
    blue: { ring: '#3b82f6', bg: '#bfdbfe', text: 'text-blue-700' },
    red: { ring: '#ef4444', bg: '#fecaca', text: 'text-red-700' },
    yellow: { ring: '#eab308', bg: '#fef08a', text: 'text-yellow-700' },
    purple: { ring: '#a855f7', bg: '#e9d5ff', text: 'text-purple-700' },
    orange: { ring: '#f97316', bg: '#fed7aa', text: 'text-orange-700' },
  };
  const c = colors[colorClass] || colors.blue;
  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={c.bg} strokeWidth={strokeWidth} />
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={c.ring}
          strokeWidth={strokeWidth} strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round" className="transition-all duration-700"
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center" style={{ width: size, height: size }}>
        <span className={`text-2xl font-bold ${c.text}`}>{value.toFixed(1)}%</span>
      </div>
      {label && <span className="mt-1 text-xs font-medium text-gray-500">{label}</span>}
    </div>
  );
}

function PercentBar({ value, max = 100, label, colorClass = 'blue' }) {
  const pct = Math.min((value / max) * 100, 100);
  const barColors = {
    green: 'bg-green-500', blue: 'bg-blue-500', red: 'bg-red-500',
    yellow: 'bg-yellow-500', purple: 'bg-purple-500', orange: 'bg-orange-500',
    indigo: 'bg-indigo-500', teal: 'bg-teal-500', cyan: 'bg-cyan-500',
  };
  const bgBar = barColors[colorClass] || barColors.blue;
  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className="text-sm font-bold text-gray-900">{value.toFixed(1)}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
        <div className={`h-3 rounded-full transition-all duration-700 ${bgBar}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function SliderInput({ label, value, onChange, icon }) {
  const pct = Math.round(value);
  const color = pct >= 75 ? 'text-green-600' : pct >= 50 ? 'text-yellow-600' : pct >= 25 ? 'text-orange-600' : 'text-red-600';
  const trackColor = pct >= 75 ? 'accent-green-500' : pct >= 50 ? 'accent-yellow-500' : pct >= 25 ? 'accent-orange-500' : 'accent-red-500';
  return (
    <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
          {icon && <span>{icon}</span>} {label}
        </span>
        <span className={`text-lg font-bold ${color}`}>{pct}%</span>
      </div>
      <input
        type="range" min={0} max={100} step={1} value={pct}
        onChange={(e) => onChange(Number(e.target.value))}
        className={`w-full h-2 rounded-lg cursor-pointer ${trackColor}`}
      />
      <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
        <span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span>
      </div>
    </div>
  );
}

function ToggleSwitch({ label, value, onChange, icon }) {
  return (
    <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 flex items-center justify-between">
      <span className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
        {icon && <span>{icon}</span>} {label}
      </span>
      <button
        onClick={() => onChange(value ? 0 : 1)}
        className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${value ? 'bg-green-500' : 'bg-gray-300'}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-300 ${value ? 'translate-x-6' : ''}`} />
      </button>
    </div>
  );
}

function RiskBadge({ level }) {
  const styles = {
    LOW: 'bg-green-100 text-green-800 border-green-300',
    MODERATE: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    HIGH: 'bg-orange-100 text-orange-800 border-orange-300',
    CRITICAL: 'bg-red-100 text-red-800 border-red-300',
  };
  const icons = { LOW: '🟢', MODERATE: '🟡', HIGH: '🟠', CRITICAL: '🔴' };
  return (
    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-bold border ${styles[level] || styles.MODERATE}`}>
      {icons[level] || '⚪'} {level}
    </span>
  );
}

function DestinationBadge({ destination }) {
  const styles = {
    DISTINCTION: 'bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-800 border-amber-300',
    HIGH_PERFORMANCE: 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border-green-300',
    SATISFACTORY: 'bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-800 border-blue-300',
    AT_RISK: 'bg-gradient-to-r from-orange-100 to-amber-100 text-orange-800 border-orange-300',
    DROPOUT_LIKELY: 'bg-gradient-to-r from-red-100 to-rose-100 text-red-800 border-red-300',
  };
  const labels = {
    DISTINCTION: '🏆 Distinction',
    HIGH_PERFORMANCE: '⭐ High Performance',
    SATISFACTORY: '👍 Satisfactory',
    AT_RISK: '⚠️ At Risk',
    DROPOUT_LIKELY: '🚨 Dropout Likely',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-4 py-1.5 rounded-full text-sm font-bold border ${styles[destination] || ''}`}>
      {labels[destination] || destination}
    </span>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MLPage() {
  const [health, setHealth] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [featureImportance, setFeatureImportance] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [studentPrediction, setStudentPrediction] = useState(null);
  const [trainingResult, setTrainingResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('predict');
  const [studentId, setStudentId] = useState('');
  const [features, setFeatures] = useState({
    attendance: 75, quiz_score: 80, participation: 80,
    video_watch: 60, ppt_progress: 70, has_video: 1,
    has_ppt: 1, assignment_score: 85, course_type: 'online'
  });

  useEffect(() => { checkHealth(); loadAnalytics(); loadFeatureImportance(); }, []);

  const checkHealth = async () => {
    try { const r = await fetch(`${ML_URL}/health`); setHealth(await r.json()); }
    catch (e) { console.error('Health check failed:', e); }
  };

  const loadAnalytics = async () => {
    try { const r = await fetch(`${ML_URL}/ml/analytics`); setAnalytics(await r.json()); }
    catch (e) { console.error('Analytics load failed:', e); }
  };

  const loadFeatureImportance = async () => {
    try { const r = await fetch(`${ML_URL}/ml/feature-importance`); setFeatureImportance(await r.json()); }
    catch (e) { console.error('Feature importance load failed:', e); }
  };

  const trainModel = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${ML_URL}/ml/train`, { method: 'POST', headers: { 'Content-Type': 'application/json' } });
      setTrainingResult(await r.json());
      loadFeatureImportance();
    } catch (e) { console.error('Training failed:', e); }
    setLoading(false);
  };

  const predict = async () => {
    setLoading(true);
    try {
      // Convert 0-100 values to 0-1 for participation, video_watch, ppt_progress
      const payload = {
        ...features,
        participation: features.participation / 100,
        video_watch: features.video_watch / 100,
        ppt_progress: features.ppt_progress / 100,
      };
      const r = await fetch(`${ML_URL}/ml/predict`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      setPrediction(await r.json());
    } catch (e) { console.error('Prediction failed:', e); }
    setLoading(false);
  };

  const predictStudent = async () => {
    if (!studentId) return;
    setLoading(true);
    try {
      const r = await fetch(`${ML_URL}/ml/predict-student/${studentId}`);
      setStudentPrediction(await r.json());
    } catch (e) { console.error('Student prediction failed:', e); }
    setLoading(false);
  };

  const handleFeatureChange = (key, value) => {
    setFeatures(prev => ({ ...prev, [key]: value }));
  };

  const tabs = [
    { id: 'predict', label: 'Predict', icon: '🎯' },
    { id: 'student', label: 'Student Lookup', icon: '👤' },
    { id: 'analytics', label: 'Analytics', icon: '📊' },
    { id: 'train', label: 'Train Model', icon: '🧠' },
  ];

  const importanceColors = ['blue', 'indigo', 'purple', 'teal', 'cyan', 'green', 'yellow', 'orange', 'red'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-700 to-blue-600 bg-clip-text text-transparent">
              ML Performance Predictor
            </h1>
            <p className="text-gray-500 mt-1">Predict student outcomes & analyze risk factors</p>
          </div>
          {/* Health Pills */}
          <div className="flex gap-2 mt-3 md:mt-0">
            {health ? (
              <>
                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border ${health.status === 'ok' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                  {health.status === 'ok' ? '🟢' : '🔴'} Service {health.status}
                </span>
                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border ${health.csv_data ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-gray-50 text-gray-700 border-gray-200'}`}>
                  📄 CSV {health.csv_data ? 'Loaded' : 'Missing'}
                </span>
                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border ${health.model_trained ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-gray-50 text-gray-700 border-gray-200'}`}>
                  🧠 Model {health.model_trained ? 'Trained' : 'Not Trained'}
                </span>
              </>
            ) : (
              <span className="text-xs text-gray-400 animate-pulse">Connecting to ML service...</span>
            )}
          </div>
        </div>

        {/* Tab Bar */}
        <div className="flex gap-1 bg-white/70 backdrop-blur rounded-xl p-1 mb-6 shadow-sm border border-white/80">
          {tabs.map(tab => (
            <button
              key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                activeTab === tab.id
                  ? 'bg-white text-indigo-700 shadow-md'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
              }`}
            >
              <span>{tab.icon}</span> {tab.label}
            </button>
          ))}
        </div>

        {/* ─── Predict Tab ─────────────────────────────────────────────────── */}
        {activeTab === 'predict' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Input Card */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-1 flex items-center gap-2">
                🎛️ Student Feature Input
              </h2>
              <p className="text-xs text-gray-400 mb-5">Adjust each factor from 0% to 100%</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <SliderInput label="Attendance" icon="📅" value={features.attendance}
                  onChange={v => handleFeatureChange('attendance', v)} />
                <SliderInput label="Quiz Score" icon="📝" value={features.quiz_score}
                  onChange={v => handleFeatureChange('quiz_score', v)} />
                <SliderInput label="Participation" icon="🙋" value={features.participation}
                  onChange={v => handleFeatureChange('participation', v)} />
                <SliderInput label="Video Watch" icon="🎬" value={features.video_watch}
                  onChange={v => handleFeatureChange('video_watch', v)} />
                <SliderInput label="PPT Progress" icon="📊" value={features.ppt_progress}
                  onChange={v => handleFeatureChange('ppt_progress', v)} />
                <SliderInput label="Assignment Score" icon="📋" value={features.assignment_score}
                  onChange={v => handleFeatureChange('assignment_score', v)} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                <ToggleSwitch label="Has Video Content" icon="🎥" value={features.has_video}
                  onChange={v => handleFeatureChange('has_video', v)} />
                <ToggleSwitch label="Has PPT Content" icon="📑" value={features.has_ppt}
                  onChange={v => handleFeatureChange('has_ppt', v)} />
              </div>

              <div className="mt-4">
                <label className="text-sm font-semibold text-gray-700">Course Type</label>
                <div className="flex gap-2 mt-1.5">
                  {['f2f', 'online', 'blended'].map(ct => (
                    <button key={ct} onClick={() => handleFeatureChange('course_type', ct)}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                        features.course_type === ct
                          ? 'bg-indigo-600 text-white shadow-md'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {ct === 'f2f' ? '🏫 Face-to-Face' : ct === 'online' ? '💻 Online' : '🔀 Blended'}
                    </button>
                  ))}
                </div>
              </div>

              <button onClick={predict} disabled={loading}
                className="mt-6 w-full py-3 rounded-xl font-bold text-white bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 shadow-lg disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <><span className="animate-spin">⏳</span> Predicting...</>
                ) : (
                  <><span>🚀</span> Predict Outcome</>
                )}
              </button>
            </div>

            {/* Result Card */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-1 flex items-center gap-2">
                📈 Prediction Result
              </h2>
              <p className="text-xs text-gray-400 mb-5">Model output displayed as percentages</p>

              {prediction ? (
                <div className="space-y-6">
                  {/* Main Verdict */}
                  <div className={`rounded-2xl p-6 text-center ${
                    prediction.prediction === 'PASS'
                      ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200'
                      : 'bg-gradient-to-br from-red-50 to-rose-50 border-2 border-red-200'
                  }`}>
                    <div className="text-5xl mb-2">{prediction.prediction === 'PASS' ? '✅' : '❌'}</div>
                    <div className={`text-3xl font-black ${prediction.prediction === 'PASS' ? 'text-green-700' : 'text-red-700'}`}>
                      {prediction.prediction}
                    </div>
                    <div className="text-sm text-gray-500 mt-1">Predicted Outcome</div>
                  </div>

                  {/* Probability Rings */}
                  <div className="flex justify-center gap-8">
                    <div className="relative">
                      <PercentRing value={prediction.pass_probability * 100} size={130} strokeWidth={12}
                        label="Pass Chance" colorClass={prediction.pass_probability >= 0.6 ? 'green' : prediction.pass_probability >= 0.4 ? 'yellow' : 'red'} />
                    </div>
                    <div className="relative">
                      <PercentRing value={prediction.fail_probability * 100} size={130} strokeWidth={12}
                        label="Fail Chance" colorClass={prediction.fail_probability >= 0.5 ? 'red' : prediction.fail_probability >= 0.3 ? 'orange' : 'green'} />
                    </div>
                  </div>

                  {/* Confidence Bar */}
                  <PercentBar value={prediction.confidence * 100} label="Model Confidence" colorClass="purple" />

                  {/* Input Summary */}
                  <div className="bg-gray-50 rounded-xl p-4">
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Input Summary</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <PercentBar value={features.attendance} label="Attendance" colorClass="blue" />
                      <PercentBar value={features.quiz_score} label="Quiz Score" colorClass="indigo" />
                      <PercentBar value={features.participation} label="Participation" colorClass="teal" />
                      <PercentBar value={features.video_watch} label="Video Watch" colorClass="cyan" />
                      <PercentBar value={features.ppt_progress} label="PPT Progress" colorClass="purple" />
                      <PercentBar value={features.assignment_score} label="Assignment" colorClass="green" />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-gray-300">
                  <span className="text-6xl mb-3">🎯</span>
                  <p className="text-sm">Adjust the sliders and click Predict</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── Student Lookup Tab ───────────────────────────────────────────── */}
        {activeTab === 'student' && (
          <div className="space-y-6">
            {/* Search Bar */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">👤 Student Performance Lookup</h2>
              <div className="flex gap-3">
                <input type="text" placeholder="Enter Student ID..." value={studentId}
                  onChange={e => setStudentId(e.target.value)}
                  className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 outline-none"
                />
                <button onClick={predictStudent} disabled={loading || !studentId}
                  className="px-6 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-lg disabled:opacity-50 transition-all flex items-center gap-2"
                >
                  {loading ? <><span className="animate-spin">⏳</span> Analyzing...</> : <><span>🔍</span> Analyze</>}
                </button>
              </div>
            </div>

            {studentPrediction && (
              <>
                {/* CGPA & Risk Overview */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Expected CGPA */}
                  <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 flex flex-col items-center">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Expected CGPA</h3>
                    <div className="relative">
                      <PercentRing value={(studentPrediction.expected_cgpa / 4.0) * 100} size={140} strokeWidth={14}
                        colorClass={studentPrediction.expected_cgpa >= 3.0 ? 'green' : studentPrediction.expected_cgpa >= 2.0 ? 'yellow' : 'red'} />
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className={`text-3xl font-black ${
                          studentPrediction.expected_cgpa >= 3.0 ? 'text-green-700' : studentPrediction.expected_cgpa >= 2.0 ? 'text-yellow-700' : 'text-red-700'
                        }`}>
                          {studentPrediction.expected_cgpa.toFixed(2)}
                        </span>
                        <span className="text-[10px] text-gray-400">out of 4.0</span>
                      </div>
                    </div>
                    <div className="mt-3 text-center">
                      <span className="text-xs text-gray-400">Current: {studentPrediction.current_cgpa.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Dropout Risk */}
                  <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 flex flex-col items-center justify-center">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Dropout Risk</h3>
                    <RiskBadge level={studentPrediction.dropout_risk} />
                    <DestinationBadge destination={studentPrediction.destination} />
                  </div>

                  {/* Course Summary */}
                  <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Course Predictions</h3>
                    <div className="space-y-3">
                      {studentPrediction.predictions.map((pred, idx) => (
                        <div key={idx} className="flex items-center gap-3">
                          <span className={`text-lg ${pred.prediction === 'PASS' ? '' : ''}`}>
                            {pred.prediction === 'PASS' ? '✅' : '❌'}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-gray-700 truncate">{pred.course_code} - {pred.course_title}</div>
                            <PercentBar value={pred.pass_probability * 100} label="" colorClass={pred.pass_probability >= 0.6 ? 'green' : pred.pass_probability >= 0.4 ? 'yellow' : 'red'} />
                          </div>
                          <span className={`text-sm font-bold ${
                            pred.pass_probability >= 0.6 ? 'text-green-600' : pred.pass_probability >= 0.4 ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            {(pred.pass_probability * 100).toFixed(0)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Detailed Course Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {studentPrediction.predictions.map((pred, idx) => (
                    <div key={idx} className={`rounded-2xl p-5 border-2 transition-all ${
                      pred.prediction === 'PASS'
                        ? 'bg-white border-green-200 shadow-md'
                        : 'bg-white border-red-200 shadow-md'
                    }`}>
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="font-bold text-gray-800">{pred.course_code}</h4>
                          <p className="text-xs text-gray-500">{pred.course_title}</p>
                        </div>
                        <span className={`text-2xl`}>{pred.prediction === 'PASS' ? '✅' : '❌'}</span>
                      </div>
                      <div className="space-y-2">
                        <PercentBar value={pred.features.attendance} label="Attendance" colorClass="blue" />
                        <PercentBar value={pred.features.quiz_score} label="Quiz Score" colorClass="indigo" />
                        <PercentBar value={pred.features.assignment_score} label="Assignment" colorClass="green" />
                        <PercentBar value={pred.features.normalized_score} label="Overall Score" colorClass="purple" />
                        <PercentBar value={pred.features.graded_pct} label="Graded Portion" colorClass="teal" />
                      </div>
                      <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between items-center">
                        <span className="text-xs text-gray-400">Pass Probability</span>
                        <span className={`text-lg font-black ${
                          pred.pass_probability >= 0.6 ? 'text-green-600' : pred.pass_probability >= 0.4 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {(pred.pass_probability * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {!studentPrediction && (
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-16 flex flex-col items-center text-gray-300">
                <span className="text-7xl mb-4">👤</span>
                <p className="text-lg font-medium">Enter a Student ID to analyze performance</p>
                <p className="text-sm mt-1">The ML model will predict pass/fail for each enrolled course</p>
              </div>
            )}
          </div>
        )}

        {/* ─── Analytics Tab ────────────────────────────────────────────────── */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            {analytics ? (
              <>
                {/* Overview Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-5 text-center">
                    <div className="text-3xl font-black text-indigo-600">{analytics.total_students}</div>
                    <div className="text-xs text-gray-400 font-semibold mt-1">Total Records</div>
                  </div>
                  <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-5 text-center">
                    <div className="text-3xl font-black text-green-600">{analytics.pass_rate}%</div>
                    <div className="text-xs text-gray-400 font-semibold mt-1">Pass Rate</div>
                  </div>
                  <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-5 text-center">
                    <div className="text-3xl font-black text-orange-600">{analytics.at_risk_students?.length || 0}</div>
                    <div className="text-xs text-gray-400 font-semibold mt-1">At-Risk Students</div>
                  </div>
                  <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-5 text-center">
                    <div className="text-3xl font-black text-purple-600">{Object.keys(analytics.course_type_comparison || {}).length}</div>
                    <div className="text-xs text-gray-400 font-semibold mt-1">Course Types</div>
                  </div>
                </div>

                {/* Feature Importance */}
                {featureImportance && (
                  <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">🔬 Feature Importance</h3>
                    <div className="space-y-3">
                      {Object.entries(featureImportance.feature_importance).map(([feature, importance], idx) => (
                        <PercentBar key={feature} value={importance * 100} max={100}
                          label={feature.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          colorClass={importanceColors[idx % importanceColors.length]} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Correlations */}
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">🔗 Feature Correlations with Pass/Fail</h3>
                  <div className="space-y-3">
                    {Object.entries(analytics.correlations).map(([feature, corr], idx) => (
                      <div key={feature} className="flex items-center gap-3">
                        <span className="w-36 text-sm font-medium text-gray-600 truncate">
                          {feature.replace(/_/g, ' ')}
                        </span>
                        <div className="flex-1">
                          <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden">
                            <div
                              className={`h-4 rounded-full transition-all duration-700 ${
                                corr >= 0.3 ? 'bg-green-400' : corr >= 0.1 ? 'bg-yellow-400' : corr >= 0 ? 'bg-orange-400' : 'bg-red-400'
                              }`}
                              style={{ width: `${Math.abs(corr) * 100}%` }}
                            />
                          </div>
                        </div>
                        <span className={`w-16 text-right text-sm font-bold ${
                          corr >= 0.3 ? 'text-green-600' : corr >= 0.1 ? 'text-yellow-600' : corr >= 0 ? 'text-orange-600' : 'text-red-600'
                        }`}>
                          {(corr * 100).toFixed(1)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Course Type Comparison */}
                {analytics.course_type_comparison && (
                  <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">📚 Course Type Comparison</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {Object.entries(analytics.course_type_comparison).map(([type, data]) => (
                        <div key={type} className="bg-gray-50 rounded-xl p-5 border border-gray-100">
                          <h4 className="font-bold text-gray-700 mb-3 capitalize">{type}</h4>
                          <div className="space-y-2">
                            <PercentBar value={data.pass_rate} label="Pass Rate" colorClass="green" />
                            <PercentBar value={data.avg_attendance} label="Avg Attendance" colorClass="blue" />
                            <PercentBar value={data.avg_quiz_score} label="Avg Quiz" colorClass="indigo" />
                            <PercentBar value={data.avg_final_score} label="Avg Final" colorClass="purple" />
                          </div>
                          <div className="mt-2 text-xs text-gray-400">{data.count} records</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Score Distributions */}
                {analytics.score_distributions && (
                  <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">📈 Score Distributions</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-left py-2 px-3 font-semibold text-gray-500">Metric</th>
                            <th className="text-right py-2 px-3 font-semibold text-gray-500">Mean</th>
                            <th className="text-right py-2 px-3 font-semibold text-gray-500">Median</th>
                            <th className="text-right py-2 px-3 font-semibold text-gray-500">Std Dev</th>
                            <th className="text-right py-2 px-3 font-semibold text-gray-500">Min</th>
                            <th className="text-right py-2 px-3 font-semibold text-gray-500">Max</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(analytics.score_distributions).map(([col, stats]) => (
                            <tr key={col} className="border-b border-gray-50 hover:bg-gray-50">
                              <td className="py-2 px-3 font-medium text-gray-700 capitalize">
                                {col.replace(/_/g, ' ')}
                              </td>
                              <td className="py-2 px-3 text-right text-gray-600">{stats.mean}%</td>
                              <td className="py-2 px-3 text-right text-gray-600">{stats.median}%</td>
                              <td className="py-2 px-3 text-right text-gray-600">{stats.std}%</td>
                              <td className="py-2 px-3 text-right text-gray-600">{stats.min}%</td>
                              <td className="py-2 px-3 text-right text-gray-600">{stats.max}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-16 flex flex-col items-center text-gray-300">
                <span className="text-7xl mb-4">📊</span>
                <p className="text-lg font-medium">Loading analytics...</p>
              </div>
            )}
          </div>
        )}

        {/* ─── Train Tab ────────────────────────────────────────────────────── */}
        {activeTab === 'train' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-2 flex items-center gap-2">🧠 Model Training</h2>
              <p className="text-sm text-gray-400 mb-5">Train the Random Forest classifier on the dataset</p>
              <button onClick={trainModel} disabled={loading}
                className="px-8 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg disabled:opacity-50 transition-all flex items-center gap-2"
              >
                {loading ? <><span className="animate-spin">⏳</span> Training in progress...</> : <><span>🚀</span> Train Model</>}
              </button>

              {trainingResult && (
                <div className="mt-6 space-y-4">
                  {/* Accuracy Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 text-center border border-green-200">
                      <div className="text-2xl font-black text-green-700">{(trainingResult.accuracy * 100).toFixed(1)}%</div>
                      <div className="text-xs text-green-600 font-semibold">Accuracy</div>
                    </div>
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 text-center border border-blue-200">
                      <div className="text-2xl font-black text-blue-700">{(trainingResult.cv_mean * 100).toFixed(1)}%</div>
                      <div className="text-xs text-blue-600 font-semibold">CV Mean</div>
                    </div>
                    <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl p-4 text-center border border-purple-200">
                      <div className="text-2xl font-black text-purple-700">{trainingResult.training_samples}</div>
                      <div className="text-xs text-purple-600 font-semibold">Train Samples</div>
                    </div>
                    <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-4 text-center border border-orange-200">
                      <div className="text-2xl font-black text-orange-700">{trainingResult.test_samples}</div>
                      <div className="text-xs text-orange-600 font-semibold">Test Samples</div>
                    </div>
                  </div>

                  {/* Dataset Stats */}
                  {trainingResult.dataset_stats && (
                    <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
                      <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Dataset Statistics</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="text-center">
                          <div className="text-lg font-bold text-gray-700">{trainingResult.dataset_stats.total_records}</div>
                          <div className="text-xs text-gray-400">Records</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-green-600">{trainingResult.dataset_stats.pass_count}</div>
                          <div className="text-xs text-gray-400">Pass</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-red-600">{trainingResult.dataset_stats.fail_count}</div>
                          <div className="text-xs text-gray-400">Fail</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-indigo-600">{trainingResult.dataset_stats.pass_rate}%</div>
                          <div className="text-xs text-gray-400">Pass Rate</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Feature Importance after training */}
                  {trainingResult.feature_importance && (
                    <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
                      <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Feature Importance</h4>
                      <div className="space-y-2">
                        {Object.entries(trainingResult.feature_importance).map(([feature, importance], idx) => (
                          <PercentBar key={feature} value={importance * 100} max={100}
                            label={feature.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            colorClass={importanceColors[idx % importanceColors.length]} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}