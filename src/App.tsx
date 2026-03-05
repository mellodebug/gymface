/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, 
  Camera, 
  LayoutDashboard, 
  CreditCard, 
  LogOut, 
  CheckCircle, 
  XCircle, 
  ShieldCheck,
  Activity,
  UserPlus,
  History,
  TrendingUp,
  Lock,
  Menu,
  X,
  Trash2,
  Edit2,
  Save,
  Scan
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as faceapi from 'face-api.js';
import Webcam from 'react-webcam';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import axios from 'axios';

// --- Types ---
interface Stats {
  totalStudents: number;
  activeStudents: number;
  dailyAccess: { date: string; count: number }[];
}

interface Student {
  id: number;
  name: string;
  email: string;
  plan_id: number;
  plan_name?: string;
  status: 'active' | 'inactive';
  face_encoding_encrypted?: string;
}

interface Plan {
  id: number;
  name: string;
  price: number;
}

// --- Components ---

const Sidebar = ({ activeTab, setActiveTab, onLogout, isOpen, setIsOpen }: any) => {
  const menuItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'recognition', icon: Camera, label: 'Reconhecimento' },
    { id: 'students', icon: Users, label: 'Alunos' },
    { id: 'payments', icon: CreditCard, label: 'Pagamentos' },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] lg:hidden"
          />
        )}
      </AnimatePresence>

      <motion.div 
        initial={false}
        animate={{ 
          width: isOpen ? 260 : 80,
          x: isOpen ? 0 : (window.innerWidth < 1024 ? -260 : 0)
        }}
        className={`bg-zinc-950 border-r border-zinc-800 h-screen flex flex-col fixed lg:sticky top-0 z-[70] transition-all duration-300 ${
          !isOpen && window.innerWidth < 1024 ? '-translate-x-full' : 'translate-x-0'
        }`}
      >
        <div className="p-6 flex items-center justify-between overflow-hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shrink-0">
              <ShieldCheck className="text-white" />
            </div>
            {(isOpen || window.innerWidth >= 1024) && (
              <motion.span 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="font-bold text-xl text-white tracking-tight"
              >
                GymFace
              </motion.span>
            )}
          </div>
          <button onClick={() => setIsOpen(false)} className="lg:hidden text-zinc-400">
            <X size={24} />
          </button>
        </div>
        
        <nav className="flex-1 px-4 space-y-2 mt-4">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                if (window.innerWidth < 1024) setIsOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeTab === item.id 
                  ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                  : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'
              }`}
            >
              <item.icon size={20} className="shrink-0" />
              {(isOpen || window.innerWidth >= 1024) && <span className="font-medium whitespace-nowrap">{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-zinc-800">
          <button 
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-zinc-400 hover:text-red-400 hover:bg-red-400/5 rounded-xl transition-all"
          >
            <LogOut size={20} className="shrink-0" />
            {(isOpen || window.innerWidth >= 1024) && <span className="font-medium whitespace-nowrap">Sair</span>}
          </button>
        </div>
      </motion.div>
    </>
  );
};

const Dashboard = ({ stats }: { stats: Stats | null }) => {
  if (!stats) return <div className="p-4 md:p-8 text-zinc-400">Carregando estatísticas...</div>;

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8 overflow-y-auto h-full">
      <header>
        <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight italic serif">Visão Geral</h1>
        <p className="text-zinc-400 mt-1 text-sm md:text-base">Bem-vindo ao centro de comando da sua academia.</p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {[
          { label: 'Total de Alunos', value: stats.totalStudents, icon: Users, color: 'text-blue-400' },
          { label: 'Alunos Ativos', value: stats.activeStudents, icon: Activity, color: 'text-emerald-400' },
          { label: 'Entradas Hoje', value: stats.dailyAccess[stats.dailyAccess.length - 1]?.count || 0, icon: TrendingUp, color: 'text-purple-400' },
        ].map((card, i) => (
          <div key={i} className="bg-zinc-900 border border-zinc-800 p-5 md:p-6 rounded-2xl">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-zinc-500 text-xs md:text-sm font-medium uppercase tracking-wider">{card.label}</p>
                <h3 className="text-3xl md:text-4xl font-bold text-white mt-2 font-mono">{card.value}</h3>
              </div>
              <div className={`p-2.5 md:p-3 rounded-xl bg-zinc-800 ${card.color}`}>
                <card.icon size={20} className="md:w-6 md:h-6" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-zinc-900 border border-zinc-800 p-5 md:p-6 rounded-2xl">
        <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
          <History size={20} className="text-emerald-500" />
          Frequência Semanal
        </h3>
        <div className="h-[250px] md:h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={stats.dailyAccess}>
              <defs>
                <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis dataKey="date" stroke="#71717a" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="#71717a" fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '12px' }}
                itemStyle={{ color: '#10b981' }}
              />
              <Area type="monotone" dataKey="count" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

const Recognition = () => {
  const webcamRef = useRef<Webcam>(null);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [recognizedUser, setRecognizedUser] = useState<any>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [livenessStatus, setLivenessStatus] = useState<string>('Aguardando...');
  const [faceMatcher, setFaceMatcher] = useState<faceapi.FaceMatcher | null>(null);

  useEffect(() => {
    const loadModelsAndData = async () => {
      const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);
        
        const token = localStorage.getItem('token');
        const response = await axios.get('/api/recognition/data', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        const labeledDescriptors = response.data.map((s: any) => {
          const descriptor = new Float32Array(Object.values(s.encoding));
          return new faceapi.LabeledFaceDescriptors(s.name, [descriptor]);
        });

        if (labeledDescriptors.length > 0) {
          setFaceMatcher(new faceapi.FaceMatcher(labeledDescriptors, 0.6));
        }
        
        setIsModelLoaded(true);
      } catch (err) {
        console.error("Error loading models/data:", err);
        setLivenessStatus("Erro ao carregar sistema de reconhecimento.");
        setIsModelLoaded(true); 
      }
    };
    loadModelsAndData();
  }, []);

  const handleVerify = async () => {
    if (!webcamRef.current || !faceMatcher) {
      if (!faceMatcher) setLivenessStatus("Nenhum aluno cadastrado com biometria.");
      return;
    }
    setIsVerifying(true);
    setRecognizedUser(null);

    try {
      const imageSrc = webcamRef.current.getScreenshot();
      if (!imageSrc) throw new Error("Falha ao capturar imagem");

      const img = await faceapi.fetchImage(imageSrc);
      const detection = await faceapi.detectSingleFace(img, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        setLivenessStatus("Rosto não detectado");
        setIsVerifying(false);
        return;
      }

      setLivenessStatus("Verificando biometria...");
      const bestMatch = faceMatcher.findBestMatch(detection.descriptor);
      
      if (bestMatch.label !== 'unknown') {
        setRecognizedUser({ name: bestMatch.label, status: "Ativo", plan: "Verificado" });
        setLivenessStatus("Acesso Liberado");
        
        await axios.post('/api/access/verify', { student_id: 1, status: 'authorized' }, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
      } else {
        setLivenessStatus("Acesso negado: Aluno não reconhecido");
      }
    } catch (err) {
      console.error(err);
      setLivenessStatus("Erro no processamento");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="p-4 md:p-8 flex flex-col items-center justify-center h-full space-y-6 md:space-y-8">
      <div className="max-w-2xl w-full bg-zinc-900 border border-zinc-800 rounded-2xl md:rounded-3xl overflow-hidden shadow-2xl">
        <div className="relative aspect-video bg-black flex items-center justify-center">
          {!isModelLoaded ? (
            <div className="flex flex-col items-center gap-4">
              <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-zinc-500 font-mono text-xs uppercase tracking-widest">Carregando Modelos IA...</p>
            </div>
          ) : (
            <>
              <Webcam
                ref={webcamRef}
                audio={false}
                screenshotFormat="image/jpeg"
                className="w-full h-full object-cover"
                videoConstraints={{ facingMode: "user" }}
                mirrored={true}
                disablePictureInPicture={true}
                forceScreenshotSourceSize={false}
                imageSmoothing={true}
                onUserMedia={() => {}}
                onUserMediaError={() => {}}
                onStreamVideoLost={() => {}}
                screenshotQuality={0.92}
              />
              <div className="absolute inset-0 border-[20px] md:border-[40px] border-black/20 pointer-events-none">
                <div className="w-full h-full border-2 border-emerald-500/30 rounded-xl md:rounded-2xl relative">
                  <div className="absolute top-0 left-0 w-6 h-6 md:w-8 md:h-8 border-t-4 border-l-4 border-emerald-500 rounded-tl-lg" />
                  <div className="absolute top-0 right-0 w-6 h-6 md:w-8 md:h-8 border-t-4 border-r-4 border-emerald-500 rounded-tr-lg" />
                  <div className="absolute bottom-0 left-0 w-6 h-6 md:w-8 md:h-8 border-b-4 border-l-4 border-emerald-500 rounded-bl-lg" />
                  <div className="absolute bottom-0 right-0 w-6 h-6 md:w-8 md:h-8 border-b-4 border-r-4 border-emerald-500 rounded-br-lg" />
                </div>
              </div>
            </>
          )}
        </div>

        <div className="p-5 md:p-8 bg-zinc-900 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center sm:text-left">
            <p className="text-zinc-500 text-[10px] md:text-xs font-bold uppercase tracking-widest">Status do Sistema</p>
            <p className={`text-sm font-mono ${isVerifying ? 'text-amber-400' : 'text-emerald-400'}`}>
              {isVerifying ? 'PROCESSANDO...' : 'SISTEMA PRONTO'}
            </p>
            <p className="text-zinc-400 text-xs italic">{livenessStatus}</p>
          </div>
          
          <button
            disabled={!isModelLoaded || isVerifying}
            onClick={handleVerify}
            className="w-full sm:w-auto px-6 md:px-8 py-3 md:py-4 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white rounded-xl md:rounded-2xl font-bold transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-3"
          >
            {isVerifying ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Camera size={20} />}
            VERIFICAR ACESSO
          </button>
        </div>
      </div>

      <AnimatePresence>
        {recognizedUser && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="max-w-md w-full bg-emerald-500/10 border border-emerald-500/20 p-5 md:p-6 rounded-2xl flex items-center gap-4 md:gap-6"
          >
            <div className="w-12 h-12 md:w-16 md:h-16 bg-emerald-500 rounded-full flex items-center justify-center text-white shrink-0">
              <CheckCircle size={24} className="md:w-8 md:h-8" />
            </div>
            <div>
              <h4 className="text-lg md:text-xl font-bold text-white tracking-tight">{recognizedUser.name}</h4>
              <p className="text-emerald-400 font-medium text-xs md:text-sm">{recognizedUser.status} • {recognizedUser.plan}</p>
              <p className="text-zinc-500 text-[10px] mt-1 font-mono uppercase tracking-tighter">CATRACA LIBERADA COM SUCESSO</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const Login = ({ onLogin }: any) => {
  const [email, setEmail] = useState('admin@gymface.com');
  const [password, setPassword] = useState('password');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await axios.post('/api/auth/login', { email, password });
      onLogin(response.data);
    } catch (err) {
      alert("Credenciais inválidas");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-zinc-950 border border-zinc-800 p-10 rounded-[32px] shadow-2xl"
      >
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center mb-6 shadow-xl shadow-emerald-500/20">
            <Lock className="text-white" size={32} />
          </div>
          <h2 className="text-3xl font-bold text-white tracking-tight italic serif">GymFace SaaS</h2>
          <p className="text-zinc-500 mt-2 text-center">Entre para gerenciar sua unidade com inteligência facial.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1">E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-emerald-500 transition-all"
              placeholder="admin@academia.com"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1">Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-emerald-500 transition-all"
              placeholder="••••••••"
              required
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
          >
            {isLoading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Entrar no Sistema'}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

const StudentModal = ({ isOpen, onClose, student, plans, onSave }: any) => {
  const webcamRef = useRef<Webcam>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    plan_id: '',
    status: 'active',
    face_encoding: null as any
  });
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureStatus, setCaptureStatus] = useState<string | null>(null);

  useEffect(() => {
    if (student) {
      setFormData({
        name: student.name,
        email: student.email,
        plan_id: student.plan_id.toString(),
        status: student.status,
        face_encoding: null
      });
    } else {
      setFormData({
        name: '',
        email: '',
        plan_id: plans[0]?.id.toString() || '',
        status: 'active',
        face_encoding: null
      });
    }
    setCaptureStatus(null);
  }, [student, plans, isOpen]);

  const handleCapture = async () => {
    if (!webcamRef.current) return;
    setIsCapturing(true);
    setCaptureStatus("Processando biometria...");

    try {
      const imageSrc = webcamRef.current.getScreenshot();
      if (!imageSrc) throw new Error("Falha ao capturar");

      const img = await faceapi.fetchImage(imageSrc);
      const detection = await faceapi.detectSingleFace(img, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        setCaptureStatus("Rosto não detectado. Tente novamente.");
        return;
      }

      setFormData({ ...formData, face_encoding: detection.descriptor });
      setCaptureStatus("Biometria capturada com sucesso!");
    } catch (err) {
      setCaptureStatus("Erro na captura.");
    } finally {
      setIsCapturing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-4 bg-black/80 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-zinc-950 border border-zinc-800 w-full max-w-2xl h-full md:h-auto md:rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-screen md:max-h-[90vh]"
      >
        <div className="p-5 md:p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-950 sticky top-0 z-10">
          <h3 className="text-lg md:text-xl font-bold">{student ? 'Editar Aluno' : 'Novo Aluno'}</h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-white p-1"><X size={24} /></button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-5 md:p-8 space-y-6 md:space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            <div className="space-y-5 md:space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] md:text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1">Nome Completo</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl md:rounded-2xl px-4 md:px-5 py-3 md:py-4 text-white focus:outline-none focus:border-emerald-500 transition-all text-sm md:text-base"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] md:text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1">E-mail</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl md:rounded-2xl px-4 md:px-5 py-3 md:py-4 text-white focus:outline-none focus:border-emerald-500 transition-all text-sm md:text-base"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] md:text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1">Plano</label>
                <select
                  value={formData.plan_id}
                  onChange={(e) => setFormData({ ...formData, plan_id: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl md:rounded-2xl px-4 md:px-5 py-3 md:py-4 text-white focus:outline-none focus:border-emerald-500 transition-all text-sm md:text-base"
                >
                  {plans.map((plan: any) => (
                    <option key={plan.id} value={plan.id}>{plan.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] md:text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1">Biometria Facial</label>
              <div className="aspect-square bg-zinc-900 rounded-xl md:rounded-2xl overflow-hidden border border-zinc-800 relative">
                <Webcam
                  ref={webcamRef}
                  audio={false}
                  screenshotFormat="image/jpeg"
                  className="w-full h-full object-cover"
                  videoConstraints={{ facingMode: "user" }}
                  mirrored={true}
                  disablePictureInPicture={true}
                  forceScreenshotSourceSize={false}
                  imageSmoothing={true}
                  onUserMedia={() => {}}
                  onUserMediaError={() => {}}
                  onStreamVideoLost={() => {}}
                  screenshotQuality={0.92}
                />
                <div className="absolute inset-0 border-2 border-emerald-500/20 rounded-xl md:rounded-2xl pointer-events-none" />
              </div>
              <button
                type="button"
                onClick={handleCapture}
                disabled={isCapturing}
                className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 text-sm md:text-base"
              >
                {isCapturing ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Scan size={18} />}
                Capturar Rosto
              </button>
              {captureStatus && (
                <p className={`text-[10px] md:text-xs text-center font-medium ${captureStatus.includes('sucesso') ? 'text-emerald-500' : 'text-amber-500'}`}>
                  {captureStatus}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="p-5 md:p-6 border-t border-zinc-800 bg-zinc-950 sticky bottom-0">
          <button
            onClick={() => onSave(formData)}
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-bold py-3.5 md:py-4 rounded-xl md:rounded-2xl transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 text-sm md:text-base"
          >
            <Save size={20} />
            {student ? 'Salvar Alterações' : 'Cadastrar Aluno'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState<Stats | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    if (savedUser && token) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const fetchData = async () => {
    if (user) {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };
      try {
        const [statsRes, studentsRes, plansRes] = await Promise.all([
          axios.get('/api/dashboard/stats', config),
          axios.get('/api/students', config),
          axios.get('/api/plans', config)
        ]);
        setStats(statsRes.data);
        setStudents(studentsRes.data);
        setPlans(plansRes.data);
      } catch (err) {
        console.error("Erro ao buscar dados", err);
      }
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const handleLogin = (data: any) => {
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setUser(data.user);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const handleSaveStudent = async (formData: any) => {
    const token = localStorage.getItem('token');
    const config = { headers: { Authorization: `Bearer ${token}` } };
    try {
      if (editingStudent) {
        await axios.put(`/api/students/${editingStudent.id}`, formData, config);
      } else {
        await axios.post('/api/students', formData, config);
      }
      setIsModalOpen(false);
      setEditingStudent(null);
      fetchData();
    } catch (err) {
      alert("Erro ao salvar aluno");
    }
  };

  const handleDeleteStudent = async (id: number) => {
    if (!confirm("Tem certeza que deseja excluir este aluno?")) return;
    const token = localStorage.getItem('token');
    const config = { headers: { Authorization: `Bearer ${token}` } };
    try {
      await axios.delete(`/api/students/${id}`, config);
      fetchData();
    } catch (err) {
      alert("Erro ao excluir aluno");
    }
  };

  if (!user) return <Login onLogin={handleLogin} />;

  return (
    <div className="flex h-screen bg-black text-white font-sans selection:bg-emerald-500/30 overflow-hidden">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onLogout={handleLogout} 
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
      />
      
      <main className="flex-1 overflow-hidden relative flex flex-col w-full">
        <header className="h-16 md:h-20 border-b border-zinc-800 flex items-center justify-between px-4 md:px-8 bg-black/50 backdrop-blur-xl sticky top-0 z-40">
          <div className="flex items-center gap-3 md:gap-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 transition-colors"
            >
              {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <h2 className="text-[10px] md:text-sm font-bold uppercase tracking-widest text-zinc-500 truncate max-w-[100px] md:max-w-none">
              {activeTab}
            </h2>
          </div>
          
          <div className="flex items-center gap-3 md:gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-xs md:text-sm font-bold text-white truncate max-w-[150px]">{user.email}</p>
              <p className="text-[8px] md:text-[10px] font-bold text-emerald-500 uppercase tracking-tighter">Unidade Central</p>
            </div>
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 border border-white/10 shadow-lg shadow-emerald-500/20" />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto relative">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,#10b98108,transparent_50%)] pointer-events-none" />
          
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              {activeTab === 'dashboard' && <Dashboard stats={stats} />}
              {activeTab === 'recognition' && <Recognition />}
              {activeTab === 'students' && (
                <div className="p-4 md:p-8">
                  <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 md:mb-8">
                    <div>
                      <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight italic serif">Alunos</h1>
                      <p className="text-zinc-400 mt-1 text-sm md:text-base">Gerencie a base de membros da sua unidade.</p>
                    </div>
                    <button 
                      onClick={() => { setEditingStudent(null); setIsModalOpen(true); }}
                      className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-400 text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/20"
                    >
                      <UserPlus size={20} />
                      Novo Aluno
                    </button>
                  </header>
                  
                  <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left min-w-[600px]">
                        <thead className="bg-zinc-950 border-b border-zinc-800">
                          <tr>
                            <th className="px-6 py-4 text-[10px] md:text-xs font-bold text-zinc-500 uppercase tracking-widest">Nome</th>
                            <th className="px-6 py-4 text-[10px] md:text-xs font-bold text-zinc-500 uppercase tracking-widest">Plano</th>
                            <th className="px-6 py-4 text-[10px] md:text-xs font-bold text-zinc-500 uppercase tracking-widest">Status</th>
                            <th className="px-6 py-4 text-[10px] md:text-xs font-bold text-zinc-500 uppercase tracking-widest">Ações</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800">
                          {students.map((student) => (
                            <tr key={student.id} className="hover:bg-zinc-800/50 transition-colors">
                              <td className="px-6 py-4 font-medium text-sm md:text-base">{student.name}</td>
                              <td className="px-6 py-4 text-zinc-400 text-sm md:text-base">{student.plan_name || 'Nenhum'}</td>
                              <td className="px-6 py-4">
                                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-tighter ${
                                  student.status === 'active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
                                }`}>
                                  {student.status === 'active' ? 'Ativo' : 'Inativo'}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-4">
                                  <button 
                                    onClick={() => { setEditingStudent(student); setIsModalOpen(true); }}
                                    className="text-zinc-500 hover:text-emerald-500 transition-colors p-1"
                                  >
                                    <Edit2 size={18} />
                                  </button>
                                  <button 
                                    onClick={() => handleDeleteStudent(student.id)}
                                    className="text-zinc-500 hover:text-red-500 transition-colors p-1"
                                  >
                                    <Trash2 size={18} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                          {students.length === 0 && (
                            <tr>
                              <td colSpan={4} className="px-6 py-12 text-center text-zinc-500 italic">Nenhum aluno cadastrado.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
              {activeTab === 'payments' && (
                <div className="p-4 md:p-8 flex flex-col items-center justify-center h-full text-center space-y-4 md:space-y-6">
                  <div className="w-16 h-16 md:w-20 md:h-20 bg-zinc-900 border border-zinc-800 rounded-2xl md:rounded-3xl flex items-center justify-center text-zinc-500">
                    <CreditCard size={32} className="md:w-10 md:h-10" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-xl md:text-2xl font-bold">Módulo de Pagamentos</h2>
                    <p className="text-zinc-400 max-w-md text-sm md:text-base">Integração nativa com Stripe para cobranças recorrentes e gestão de assinaturas.</p>
                  </div>
                  <button className="w-full sm:w-auto bg-emerald-500 text-black px-8 py-3 rounded-xl font-bold hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20">
                    Configurar Stripe
                  </button>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      <StudentModal 
        isOpen={isModalOpen} 
        onClose={() => { setIsModalOpen(false); setEditingStudent(null); }}
        student={editingStudent}
        plans={plans}
        onSave={handleSaveStudent}
      />
    </div>
  );
}
