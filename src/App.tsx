/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Camera, 
  History, 
  Settings, 
  LogOut, 
  Upload, 
  AlertTriangle, 
  CheckCircle2, 
  ChevronLeft, 
  User as UserIcon, 
  Phone, 
  Lock,
  Loader2,
  Languages,
  Info,
  ShieldAlert
} from 'lucide-react';
import { useAuth, useLanguage } from './hooks';
import { translations } from './constants';
import { analyzePlant } from './services/geminiService';
import { ScanResult, ScanHistoryItem, Language } from './types';
import { cn } from './lib/utils';
import { supabase } from './lib/supabase';

export default function App() {
  const { user, logout, loading: authLoading } = useAuth();
  const { language, changeLanguage } = useLanguage();
  const t = translations[language];

  const [view, setView] = useState<'home' | 'detect' | 'history' | 'settings' | 'auth'>('home');
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [history, setHistory] = useState<ScanHistoryItem[]>([]);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  // Auth States
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user && !authLoading) {
      setView('auth');
    } else if (user && view === 'auth') {
      setView('home');
    }
  }, [user, authLoading]);

  useEffect(() => {
    if (user && view === 'history') {
      fetchHistory();
    }
  }, [user, view]);

  const fetchHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('scans')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setHistory(data || []);
    } catch (err) {
      console.error("Failed to fetch history", err);
    }
  };

  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsAuthenticating(true);

    try {
      if (authMode === 'register') {
        const { data, error } = await supabase.auth.signUp({
          email: email,
          password: password,
          options: {
            data: {
              full_name: name,
            }
          }
        });
        if (error) throw error;
        
        if (data.session) {
          // Auto-login if confirmation is disabled
          setAuthMode('login');
        } else {
          setAuthMode('login');
          setError('Registration successful! Please check your email inbox for a verification link. You must verify your email before you can login.');
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email,
          password: password,
        });
        if (error) {
          if (error.message.includes('Email not confirmed')) {
            throw new Error('Please verify your email address. Check your inbox for the verification link.');
          }
          throw error;
        }
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      setCapturedImage(base64);
      setIsAnalyzing(true);
      setScanResult(null);

      try {
        const result = await analyzePlant(base64, language);
        setScanResult(result);
        
        // Save to history
        if (user && !result.unclearImage) {
          const { error } = await supabase
            .from('scans')
            .insert([
              {
                user_id: user.id,
                crop_name: result.cropName,
                disease_name: result.diseaseName,
                result_json: result,
                image_url: base64
              }
            ]);
          if (error) console.error("Failed to save scan", error);
        }
      } catch (err) {
        console.error("Analysis failed", err);
      } finally {
        setIsAnalyzing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-emerald-50 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-emerald-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-emerald-50 font-sans text-slate-900 pb-20">
      {/* Header */}
      <header className="bg-emerald-600 text-white p-4 sticky top-0 z-50 shadow-md flex items-center justify-between">
        <div className="flex items-center gap-2">
          {view !== 'home' && view !== 'auth' && (
            <button onClick={() => { setView('home'); setScanResult(null); setCapturedImage(null); }} className="p-1">
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}
          <h1 className="text-xl font-bold tracking-tight">{t.appName}</h1>
        </div>
        {user && (
          <div className="flex items-center gap-3">
             <button onClick={() => setView('settings')} className="p-1">
              <Settings className="w-5 h-5" />
            </button>
          </div>
        )}
      </header>

      <main className="max-w-md mx-auto p-4">
        <AnimatePresence mode="wait">
          {view === 'auth' && (
            <motion.div
              key="auth"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white rounded-3xl p-6 shadow-xl border border-emerald-100"
            >
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <UserIcon className="w-8 h-8 text-emerald-600" />
                </div>
                <h2 className="text-2xl font-bold text-emerald-800">{authMode === 'login' ? t.login : t.register}</h2>
                <p className="text-emerald-600/70">{t.tagline}</p>
              </div>

              <form onSubmit={handleAuth} className="space-y-4">
                {authMode === 'register' && (
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      placeholder={t.name}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                      required
                    />
                  </div>
                )}
                <div className="relative">
                  <Phone className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                  <input
                    type="email"
                    placeholder={t.email}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                    required
                  />
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                  <input
                    type="password"
                    placeholder={t.password}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                    required
                  />
                </div>

                {error && <p className="text-red-500 text-sm font-medium">{error}</p>}

                <button
                  type="submit"
                  disabled={isAuthenticating}
                  className="w-full py-3 bg-emerald-600 text-white font-bold rounded-xl shadow-lg shadow-emerald-200 active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isAuthenticating && <Loader2 className="w-5 h-5 animate-spin" />}
                  {authMode === 'login' ? t.login : t.register}
                </button>
              </form>

              <div className="mt-6 text-center">
                <button
                  onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
                  className="text-emerald-600 font-medium"
                >
                  {authMode === 'login' ? t.noAccount : t.hasAccount}
                </button>
              </div>
            </motion.div>
          )}

          {view === 'home' && (
            <motion.div
              key="home"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6"
            >
              <div className="bg-white rounded-3xl p-6 shadow-md border border-emerald-100">
                <h2 className="text-lg font-bold mb-1">Welcome, {user?.name}!</h2>
                <p className="text-slate-500 text-sm">{t.tagline}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setView('detect')}
                  className="bg-white p-6 rounded-3xl shadow-md border border-emerald-100 flex flex-col items-center gap-3 active:scale-95 transition-transform"
                >
                  <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center">
                    <Camera className="w-6 h-6 text-emerald-600" />
                  </div>
                  <span className="font-bold text-sm">{t.detect}</span>
                </button>
                <button
                  onClick={() => setView('history')}
                  className="bg-white p-6 rounded-3xl shadow-md border border-emerald-100 flex flex-col items-center gap-3 active:scale-95 transition-transform"
                >
                  <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center">
                    <History className="w-6 h-6 text-blue-600" />
                  </div>
                  <span className="font-bold text-sm">{t.history}</span>
                </button>
              </div>

              <div className="bg-emerald-600 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden">
                <div className="relative z-10">
                  <h3 className="font-bold text-lg mb-2">Need Help?</h3>
                  <p className="text-emerald-100 text-sm mb-4">Take a photo of any plant leaf to check for diseases instantly.</p>
                  <button 
                    onClick={() => setView('detect')}
                    className="bg-white text-emerald-600 px-4 py-2 rounded-full font-bold text-sm"
                  >
                    Start Now
                  </button>
                </div>
                <div className="absolute -right-4 -bottom-4 opacity-20">
                  <CheckCircle2 className="w-32 h-32" />
                </div>
              </div>
            </motion.div>
          )}

          {view === 'detect' && (
            <motion.div
              key="detect"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-6"
            >
              {!capturedImage ? (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-square bg-white rounded-3xl border-4 border-dashed border-emerald-200 flex flex-col items-center justify-center gap-4 cursor-pointer active:bg-emerald-50 transition-colors"
                >
                  <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center">
                    <Upload className="w-10 h-10 text-emerald-600" />
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-lg">{t.uploadImage}</p>
                    <p className="text-slate-400 text-sm">Camera or Gallery</p>
                  </div>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleImageUpload} 
                    accept="image/*" 
                    className="hidden" 
                  />
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="relative rounded-3xl overflow-hidden shadow-xl aspect-square bg-black">
                    <img src={capturedImage} alt="Captured" className="w-full h-full object-cover" />
                    {isAnalyzing && (
                      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center text-white">
                        <Loader2 className="w-12 h-12 animate-spin mb-4" />
                        <p className="font-bold text-lg">{t.analyzing}</p>
                      </div>
                    )}
                  </div>

                  {scanResult && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white rounded-3xl p-6 shadow-md space-y-6"
                    >
                      {scanResult.unclearImage ? (
                        <div className="flex flex-col items-center text-center gap-4 py-4">
                          <AlertTriangle className="w-16 h-16 text-amber-500" />
                          <p className="font-bold text-lg text-amber-700">{t.unclear}</p>
                          <button 
                            onClick={() => { setCapturedImage(null); setScanResult(null); }}
                            className="bg-emerald-600 text-white px-6 py-2 rounded-full font-bold"
                          >
                            Try Again
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="text-2xl font-bold text-emerald-800">{scanResult.cropName}</h3>
                                <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full uppercase font-bold">
                                  {language}
                                </span>
                              </div>
                              <p className={cn(
                                "font-bold",
                                scanResult.isHealthy ? "text-emerald-600" : "text-red-500"
                              )}>
                                {scanResult.isHealthy ? t.healthy : `${t.diseased}: ${scanResult.diseaseName}`}
                              </p>
                            </div>
                            <div className="bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                              <span className="text-xs font-bold text-emerald-700">{t.confidence}: {Math.round(scanResult.confidence * 100)}%</span>
                            </div>
                          </div>

                          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                            <p className="text-sm text-slate-600 leading-relaxed">{scanResult.description}</p>
                          </div>

                          {!scanResult.isHealthy ? (
                            <div className="space-y-6">
                              <section>
                                <div className="flex items-center gap-2 mb-3">
                                  <Info className="w-5 h-5 text-emerald-600" />
                                  <h4 className="font-bold">{t.symptoms}</h4>
                                </div>
                                <ul className="grid grid-cols-1 gap-2">
                                  {scanResult.symptoms.map((s, i) => (
                                    <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                                      {s}
                                    </li>
                                  ))}
                                </ul>
                              </section>

                              <section>
                                <div className="flex items-center gap-2 mb-3">
                                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                                  <h4 className="font-bold">{t.organic}</h4>
                                </div>
                                <ul className="grid grid-cols-1 gap-2">
                                  {scanResult.organicTreatment.map((s, i) => (
                                    <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                                      {s}
                                    </li>
                                  ))}
                                </ul>
                              </section>

                              <section>
                                <div className="flex items-center gap-2 mb-3">
                                  <ShieldAlert className="w-5 h-5 text-blue-600" />
                                  <h4 className="font-bold">{t.chemical}</h4>
                                </div>
                                <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                                  <p className="font-bold text-blue-800 text-sm mb-1">{scanResult.chemicalTreatment.name}</p>
                                  <p className="text-blue-700 text-xs">{scanResult.chemicalTreatment.dosage}</p>
                                </div>
                              </section>

                              <section className="bg-red-50 p-4 rounded-2xl border border-red-100">
                                <div className="flex items-center gap-2 mb-2 text-red-700">
                                  <AlertTriangle className="w-5 h-5" />
                                  <h4 className="font-bold text-sm uppercase tracking-wider">{t.safetyWarning}</h4>
                                </div>
                                <ul className="space-y-1">
                                  {t.safetyTips.map((tip, i) => (
                                    <li key={i} className="text-xs text-red-600 flex items-center gap-2">
                                      <div className="w-1 h-1 rounded-full bg-red-400" />
                                      {tip}
                                    </li>
                                  ))}
                                </ul>
                              </section>

                              <section>
                                <div className="flex items-center gap-2 mb-3">
                                  <History className="w-5 h-5 text-emerald-600" />
                                  <h4 className="font-bold">{t.prevention}</h4>
                                </div>
                                <ul className="grid grid-cols-1 gap-2">
                                  {scanResult.preventionTips.map((s, i) => (
                                    <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                                      {s}
                                    </li>
                                  ))}
                                </ul>
                              </section>
                            </div>
                          ) : (
                            <section>
                              <div className="flex items-center gap-2 mb-3">
                                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                                <h4 className="font-bold">{t.care}</h4>
                              </div>
                              <ul className="grid grid-cols-1 gap-2">
                                {scanResult.careTips?.map((s, i) => (
                                  <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                                    {s}
                                  </li>
                                ))}
                              </ul>
                            </section>
                          )}

                          <button 
                            onClick={() => { setCapturedImage(null); setScanResult(null); }}
                            className="w-full py-4 bg-emerald-600 text-white font-bold rounded-2xl shadow-lg active:scale-95 transition-transform"
                          >
                            New Scan
                          </button>
                        </>
                      )}
                    </motion.div>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {view === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4"
            >
              <h2 className="text-xl font-bold mb-4">{t.history}</h2>
              {history.length === 0 ? (
                <div className="bg-white p-8 rounded-3xl text-center shadow-sm border border-emerald-100">
                  <History className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                  <p className="text-slate-500">{t.noHistory}</p>
                </div>
              ) : (
                history.map((item) => (
                  <div 
                    key={item.id} 
                    onClick={() => {
                      setCapturedImage(item.image_url);
                      setScanResult(item.result_json);
                      setView('detect');
                    }}
                    className="bg-white p-4 rounded-2xl shadow-sm border border-emerald-50 flex gap-4 active:bg-emerald-50 transition-colors cursor-pointer"
                  >
                    <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0 bg-slate-100">
                      <img src={item.image_url} alt="Scan" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex flex-col justify-center">
                      <h4 className="font-bold text-emerald-800">{item.crop_name}</h4>
                      <p className={cn(
                        "text-sm font-medium",
                        item.result_json.isHealthy ? "text-emerald-600" : "text-red-500"
                      )}>
                        {item.result_json.isHealthy ? t.healthy : item.disease_name}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        {new Date(item.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </motion.div>
          )}

          {view === 'settings' && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <div className="bg-white rounded-3xl p-6 shadow-md border border-emerald-100">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                    <UserIcon className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="font-bold">{user?.name}</h3>
                    <p className="text-slate-500 text-sm">{user?.email}</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <Languages className="w-5 h-5 text-emerald-600" />
                      <h4 className="font-bold text-sm uppercase tracking-wider text-slate-400">Language</h4>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: 'en', label: 'English' },
                        { id: 'hi', label: 'हिंदी' },
                        { id: 'te', label: 'తెలుగు' },
                        { id: 'ta', label: 'தமிழ்' }
                      ].map((lang) => (
                        <button
                          key={lang.id}
                          onClick={() => changeLanguage(lang.id as Language)}
                          className={cn(
                            "py-3 rounded-xl font-bold transition-all",
                            language === lang.id 
                              ? "bg-emerald-600 text-white shadow-lg shadow-emerald-200" 
                              : "bg-slate-50 text-slate-600 border border-slate-200"
                          )}
                        >
                          {lang.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={logout}
                    className="w-full py-4 flex items-center justify-center gap-2 text-red-500 font-bold border-2 border-red-50 rounded-2xl active:bg-red-50 transition-colors"
                  >
                    <LogOut className="w-5 h-5" />
                    {t.logout}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      {user && view !== 'auth' && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-6 py-3 flex justify-around items-center z-50">
          <button 
            onClick={() => setView('home')}
            className={cn("p-2 rounded-xl transition-colors", view === 'home' ? "text-emerald-600 bg-emerald-50" : "text-slate-400")}
          >
            <CheckCircle2 className="w-6 h-6" />
          </button>
          <button 
            onClick={() => setView('detect')}
            className={cn("p-4 -mt-10 rounded-full shadow-lg shadow-emerald-200 transition-all active:scale-90", view === 'detect' ? "bg-emerald-600 text-white" : "bg-white text-emerald-600 border-2 border-emerald-100")}
          >
            <Camera className="w-8 h-8" />
          </button>
          <button 
            onClick={() => setView('history')}
            className={cn("p-2 rounded-xl transition-colors", view === 'history' ? "text-emerald-600 bg-emerald-50" : "text-slate-400")}
          >
            <History className="w-6 h-6" />
          </button>
        </nav>
      )}
    </div>
  );
}
