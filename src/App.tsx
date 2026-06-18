import React, { useState, useEffect } from 'react';
import { 
  ClipboardCheck, 
  FileDown, 
  Database, 
  CheckCircle2, 
  RotateCcw, 
  User as UserIcon, 
  Calendar as CalendarIcon, 
  UserCheck, 
  ChevronRight, 
  ChevronLeft, 
  BookOpen, 
  TrendingUp, 
  LogOut,
  AlertCircle,
  HelpCircle,
  Check,
  Lock,
  Key,
  Search,
  Trash2,
  Eye,
  ArrowLeft,
  Activity,
  Filter,
  LayoutGrid,
  X
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  Legend
} from 'recharts';

import { initAuth, googleSignIn, logout, getAccessToken } from './firebase';
import { getOrCreateSpreadsheet, appendSurveyResult } from './sheetsService';
import { exportToPDF } from './pdfService';
import { DASS_QUESTIONS, PETUNJUK_PENGISIAN } from './questions';
import { SurveyResult, SeverityCategory } from './types';
import { 
  isSupabaseConfigured, 
  verifyAdminLoginOnSupabase, 
  saveSurveyToSupabase, 
  fetchRoomsFromSupabase, 
  addRoomToSupabase, 
  deleteRoomFromSupabase, 
  fetchResultsFromSupabase,
  SurveyPayload
} from './supabaseClient';

export default function App() {
  // Routing State
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (path: string) => {
    window.history.pushState(null, '', path);
    setCurrentPath(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Auth state
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [sheetsStatus, setSheetsStatus] = useState<'connected' | 'disconnected' | 'saving' | 'saved' | 'error'>('disconnected');
  const [spreadsheetLink, setSpreadsheetLink] = useState<string | null>(null);
  const [sheetsErrorMsg, setSheetsErrorMsg] = useState<string | null>(null);

  // Form profile state
  const [namaPetugas, setNamaPetugas] = useState('-');
  const [namaResponden, setNamaResponden] = useState('');
  const [asalRuangan, setAsalRuangan] = useState('');
  const [customAsalRuangan, setCustomAsalRuangan] = useState('');
  const [umur, setUmur] = useState('');
  const [gender, setGender] = useState('Laki-laki');
  const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0]);

  // Rooms list state for Admin Room Management
  const [rooms, setRooms] = useState<string[]>(() => {
    const saved = localStorage.getItem('dass42_available_rooms');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // use default
      }
    }
    return ['Unit UGD', 'Ruang Melati', 'Unit Poliklinik', 'Ruang Dahlia', 'ICU'];
  });
  const [newRoomInput, setNewRoomInput] = useState('');

  // Admin Dashboard State
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(() => sessionStorage.getItem('dass42_admin_logged_in') === 'true');
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminError, setAdminError] = useState('');

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [roomFilter, setRoomFilter] = useState('Semua');
  const [categoryFilter, setCategoryFilter] = useState('Semua');
  const [selectedDetailResult, setSelectedDetailResult] = useState<SurveyResult | null>(null);
  const [analyticsTab, setAnalyticsTab] = useState<'sebaran' | 'ruangan' | 'butir'>('sebaran');

  // History state with sample seeding
  const [history, setHistory] = useState<SurveyResult[]>(() => {
    const saved = localStorage.getItem('dass42_survey_history');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return [];
      }
    }
    const samples: SurveyResult[] = [
      {
        id: 'DASS-1718534789320',
        tanggal: '2026-06-12',
        namaPetugas: 'Ahmad Faisal, Md.',
        namaResponden: 'Budi Santoso',
        asalRuangan: 'Unit UGD',
        umur: '42',
        gender: 'Laki-laki',
        jawaban: { 1: 1, 2: 2, 3: 0, 4: 1, 5: 3, 6: 2, 7: 1, 8: 0, 9: 1, 10: 2, 11: 3, 12: 1, 13: 2, 14: 0, 15: 1, 16: 2, 17: 0, 18: 1, 19: 2, 20: 3, 21: 1, 22: 0, 23: 1, 24: 2, 25: 3, 26: 0, 27: 1, 28: 2, 29: 3, 30: 1, 31: 0, 32: 1, 33: 2, 34: 3, 35: 0, 36: 1, 37: 2, 38: 3, 39: 1, 40: 0, 41: 1, 42: 2 },
        scoreDepresi: 16,
        scoreKecemasan: 9,
        scoreStres: 24,
        kategoriDepresi: 'Sedang',
        kategoriKecemasan: 'Ringan',
        kategoriStres: 'Sedang'
      },
      {
        id: 'DASS-1718534882100',
        tanggal: '2026-06-14',
        namaPetugas: 'Siti Aminah, S.Psi',
        namaResponden: 'Dewi Lestari',
        asalRuangan: 'Ruang Melati',
        umur: '28',
        gender: 'Perempuan',
        jawaban: { 1: 0, 2: 1, 3: 0, 4: 0, 5: 1, 6: 0, 7: 0, 8: 1, 9: 0, 10: 0, 11: 1, 12: 0, 13: 1, 14: 0, 15: 0, 16: 1, 17: 0, 18: 0, 19: 1, 20: 0, 21: 0, 22: 1, 23: 0, 24: 0, 25: 1, 26: 0, 27: 0, 28: 1, 29: 0, 30: 0, 31: 1, 32: 0, 33: 0, 34: 1, 35: 0, 36: 0, 37: 1, 38: 0, 39: 0, 40: 1, 41: 0, 42: 0 },
        scoreDepresi: 4,
        scoreKecemasan: 3,
        scoreStres: 5,
        kategoriDepresi: 'Normal',
        kategoriKecemasan: 'Normal',
        kategoriStres: 'Normal'
      },
      {
        id: 'DASS-1718534991190',
        tanggal: '2026-06-15',
        namaPetugas: 'Ahmad Faisal, Md.',
        namaResponden: 'Roni Wijaya',
        asalRuangan: 'Unit Poliklinik',
        umur: '35',
        gender: 'Laki-laki',
        jawaban: { 1: 2, 2: 3, 3: 1, 4: 2, 5: 2, 6: 3, 7: 2, 8: 1, 9: 3, 10: 2, 11: 3, 12: 2, 13: 3, 14: 1, 15: 3, 16: 2, 17: 3, 18: 2, 19: 1, 20: 3, 21: 2, 22: 1, 23: 3, 24: 2, 25: 3, 26: 2, 27: 3, 28: 1, 29: 3, 30: 2, 31: 1, 32: 3, 33: 2, 34: 3, 35: 2, 36: 3, 37: 1, 38: 3, 39: 2, 40: 1, 41: 3, 42: 2 },
        scoreDepresi: 31,
        scoreKecemasan: 28,
        scoreStres: 34,
        kategoriDepresi: 'Berat',
        kategoriKecemasan: 'Sangat Berat',
        kategoriStres: 'Sangat Berat'
      }
    ];
    localStorage.setItem('dass42_survey_history', JSON.stringify(samples));
    return samples;
  });

  // Survey progress state
  const [jawaban, setJawaban] = useState<Record<number, number>>({});
  const [currentPage, setCurrentPage] = useState(0); // 0 to 5 (7 questions per page * 6 pages = 42)
  const [surveyView, setSurveyView] = useState<'form' | 'result'>('form');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Questions per page
  const itemsPerPage = 7;
  const totalPages = Math.ceil(DASS_QUESTIONS.length / itemsPerPage);

  // Initialize auth state
  useEffect(() => {
    // Attempt to initialize and link auth
    const unsubscribe = initAuth(
      (currentUser, accessToken) => {
        setUser(currentUser);
        setToken(accessToken);
        setSheetsStatus('connected');
        // Retrieve and establish sheet link if stored
        const savedSheetId = localStorage.getItem('dass42_spreadsheet_id');
        if (savedSheetId) {
          setSpreadsheetLink(`https://docs.google.com/spreadsheets/d/${savedSheetId}/edit`);
        }
      },
      () => {
        setUser(null);
        setToken(null);
        setSheetsStatus('disconnected');
      }
    );
    return () => unsubscribe();
  }, []);

  // Sync rooms list to localStorage
  useEffect(() => {
    localStorage.setItem('dass42_available_rooms', JSON.stringify(rooms));
  }, [rooms]);

  // Load rooms and historical results from Supabase on start if configured
  useEffect(() => {
    const loadFromSupabase = async () => {
      if (isSupabaseConfigured()) {
        try {
          const sbRooms = await fetchRoomsFromSupabase();
          if (sbRooms && sbRooms.length > 0) {
            setRooms(sbRooms);
          }
          
          const sbResults = await fetchResultsFromSupabase();
          if (sbResults && sbResults.length > 0) {
            setHistory(sbResults);
            localStorage.setItem('dass42_survey_history', JSON.stringify(sbResults));
          }
        } catch (err) {
          console.error("Gagal memuat data awal dari Supabase:", err);
        }
      }
    };
    loadFromSupabase();
  }, []);

  // Handle Google Sign in
  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    setSheetsErrorMsg(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setToken(result.accessToken);
        setSheetsStatus('connected');
        const savedSheetId = localStorage.getItem('dass42_spreadsheet_id');
        if (savedSheetId) {
          setSpreadsheetLink(`https://docs.google.com/spreadsheets/d/${savedSheetId}/edit`);
        }
      }
    } catch (err: any) {
      console.error('Sign-in failed', err);
      setSheetsErrorMsg(err?.message || 'Login gagal. Silakan coba kembali.');
      setSheetsStatus('error');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Handle Log Out
  const handleLogout = async () => {
    try {
      await logout();
      setUser(null);
      setToken(null);
      setSheetsStatus('disconnected');
      setSpreadsheetLink(null);
    } catch (err) {
      console.error('Sign-out failed', err);
    }
  };

  // Validation function
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!namaResponden.trim()) newErrors.namaResponden = 'Nama responden lengkap harus diisi';
    if (!asalRuangan.trim()) newErrors.asalRuangan = 'Asal ruangan harus diisi';
    if (!umur || isNaN(Number(umur)) || Number(umur) <= 0) newErrors.umur = 'Umur yang valid harus diisi';
    if (!tanggal) newErrors.tanggal = 'Tanggal pemeriksaan harus dipilih';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Admin login actions
  const handleAdminLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    try {
      const isValid = await verifyAdminLoginOnSupabase(adminUsername, adminPassword);
      if (isValid) {
        setIsAdminLoggedIn(true);
        sessionStorage.setItem('dass42_admin_logged_in', 'true');
        setAdminError('');
      } else {
        setAdminError('Username atau password admin salah!');
      }
    } catch (err) {
      setAdminError('Terjadi kesalahan otentikasi database.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleAdminLogout = () => {
    setIsAdminLoggedIn(false);
    sessionStorage.removeItem('dass42_admin_logged_in');
  };

  // Calculate scores
  const getSubscaleScore = (category: 'Depresi' | 'Kecemasan' | 'Stres'): number => {
    return DASS_QUESTIONS
      .filter(q => q.category === category)
      .reduce((sum, q) => sum + (jawaban[q.id] ?? 0), 0);
  };

  const getDepresiCategory = (score: number): SeverityCategory => {
    if (score <= 9) return 'Normal';
    if (score <= 13) return 'Ringan';
    if (score <= 20) return 'Sedang';
    if (score <= 27) return 'Berat';
    return 'Sangat Berat';
  };

  const getKecemasanCategory = (score: number): SeverityCategory => {
    if (score <= 7) return 'Normal';
    if (score <= 9) return 'Ringan';
    if (score <= 14) return 'Sedang';
    if (score <= 19) return 'Berat';
    return 'Sangat Berat';
  };

  const getStresCategory = (score: number): SeverityCategory => {
    if (score <= 14) return 'Normal';
    if (score <= 18) return 'Ringan';
    if (score <= 25) return 'Sedang';
    if (score <= 33) return 'Berat';
    return 'Sangat Berat';
  };

  // Results payload helper
  const getResultPayload = (): SurveyResult => {
    const dScore = getSubscaleScore('Depresi');
    const aScore = getSubscaleScore('Kecemasan');
    const sScore = getSubscaleScore('Stres');

    return {
      tanggal,
      namaPetugas,
      namaResponden,
      asalRuangan,
      umur,
      gender,
      jawaban,
      scoreDepresi: dScore,
      scoreKecemasan: aScore,
      scoreStres: sScore,
      kategoriDepresi: getDepresiCategory(dScore),
      kategoriKecemasan: getKecemasanCategory(aScore),
      kategoriStres: getStresCategory(sScore)
    };
  };

  // Handle direct item click
  const handleSelectAnswer = (qId: number, score: number) => {
    setJawaban(prev => ({
      ...prev,
      [qId]: score
    }));
  };

  // Analyze Action
  const handleAnalyze = () => {
    if (!validateForm()) {
      // Scroll to top where form fields are
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // Check if any questions are missed
    const unanswered = DASS_QUESTIONS.filter(q => jawaban[q.id] === undefined);
    if (unanswered.length > 0) {
      // Find the page of the first unanswered question
      const firstUnansweredId = unanswered[0].id;
      const questionIndex = DASS_QUESTIONS.findIndex(q => q.id === firstUnansweredId);
      const targetPage = Math.floor(questionIndex / itemsPerPage);
      setCurrentPage(targetPage);
      
      alert(`Mohon lengkapi semua jawaban kuesioner. Ada ${unanswered.length} pertanyaan belum terisi.`);
      return;
    }

    // Auto save to local history database so it can be seen in Admin
    const payload = getResultPayload();
    payload.id = `DASS-${Date.now()}`;
    const updatedHistory = [payload, ...history];
    setHistory(updatedHistory);
    localStorage.setItem('dass42_survey_history', JSON.stringify(updatedHistory));

    // Save to Supabase DB if Configured
    if (isSupabaseConfigured()) {
      const sbPayload = {
        tanggal: payload.tanggal,
        nama_petugas: payload.namaPetugas,
        nama_responden: payload.namaResponden,
        asal_ruangan: payload.asalRuangan,
        umur: Number(payload.umur) || 0,
        gender: payload.gender,
        score_depresi: payload.scoreDepresi,
        score_kecemasan: payload.scoreKecemasan,
        score_stres: payload.scoreStres,
        kategori_depresi: payload.kategoriDepresi as SeverityCategory,
        kategori_kecemasan: payload.kategoriKecemasan as SeverityCategory,
        kategori_stres: payload.kategoriStres as SeverityCategory,
        jawaban: payload.jawaban
      };
      saveSurveyToSupabase(sbPayload)
        .then(() => {
          console.log('Successfully saved to Supabase DB');
        })
        .catch((err) => {
          console.error('Error syncing to Supabase DB:', err);
        });
    }

    // Auto save to Google Sheets database if setup is active
    const activeToken = token || getAccessToken();
    if (activeToken) {
      setSheetsStatus('saving');
      getOrCreateSpreadsheet(activeToken).then(async (spreadsheetId) => {
        setSpreadsheetLink(`https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`);
        await appendSurveyResult(activeToken, spreadsheetId, payload);
        setSheetsStatus('saved');
      }).catch((err) => {
        console.error('Background sheets sync failed:', err);
        setSheetsStatus('error');
        setSheetsErrorMsg(err?.message || 'Gagal menyimpan data ke Google Sheets secara otomatis.');
      });
    } else {
      setSheetsStatus('disconnected');
    }

    setSurveyView('result');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Save to google sheets
  const handleSaveToSheets = async () => {
    const activeToken = token || getAccessToken();
    if (!activeToken) {
      alert('Silakan login dengan akun Google terlebih dahulu untuk melakukan sinkronisasi spreadsheet.');
      return;
    }

    setSheetsStatus('saving');
    setSheetsErrorMsg(null);
    try {
      const spreadsheetId = await getOrCreateSpreadsheet(activeToken);
      setSpreadsheetLink(`https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`);
      
      const payload = getResultPayload();
      await appendSurveyResult(activeToken, spreadsheetId, payload);
      
      setSheetsStatus('saved');
    } catch (err: any) {
      console.error('Error saving to sheets:', err);
      setSheetsErrorMsg(err?.message || 'Gagal menyimpan data ke Google Sheets.');
      setSheetsStatus('error');
    }
  };

  // Export to PDF
  const handleExportPDF = () => {
    const payload = getResultPayload();
    exportToPDF(payload);
  };

  // Reset survey form completely
  const handleReset = () => {
    if (window.confirm('Apakah Anda yakin ingin mengatur ulang survei? Seluruh isian dan jawaban saat ini akan dihapus.')) {
      setJawaban({});
      setCurrentPage(0);
      setSurveyView('form');
      setNamaResponden('');
      setAsalRuangan('');
      setUmur('');
      setGender('Laki-laki');
      setErrors({});
      if (sheetsStatus === 'saved') {
        setSheetsStatus('connected');
      }
    }
  };

  // Color mapping helper for visual cards
  const getSeverityStyle = (category: SeverityCategory) => {
    switch (category) {
      case 'Normal':
        return { bg: 'bg-green-50 text-green-700 border-green-200', badge: 'bg-green-500 text-white', fill: '#22c55e' };
      case 'Ringan':
        return { bg: 'bg-amber-50 text-amber-700 border-amber-200', badge: 'bg-amber-500 text-white', fill: '#eab308' };
      case 'Sedang':
        return { bg: 'bg-orange-50 text-orange-700 border-orange-200', badge: 'bg-orange-500 text-white', fill: '#f97316' };
      case 'Berat':
        return { bg: 'bg-red-50 text-red-700 border-red-200', badge: 'bg-red-500 text-white', fill: '#ef4444' };
      case 'Sangat Berat':
        return { bg: 'bg-purple-50 text-purple-700 border-purple-200', badge: 'bg-purple-500 text-white', fill: '#a855f7' };
    }
  };

  // Generate chart data
  const dScore = getSubscaleScore('Depresi');
  const aScore = getSubscaleScore('Kecemasan');
  const sScore = getSubscaleScore('Stres');

  const chartData = [
    { name: 'Depresi', Skor: dScore, Kategori: getDepresiCategory(dScore), fill: getSeverityStyle(getDepresiCategory(dScore)).fill },
    { name: 'Kecemasan', Skor: aScore, Kategori: getKecemasanCategory(aScore), fill: getSeverityStyle(getKecemasanCategory(aScore)).fill },
    { name: 'Stres', Skor: sScore, Kategori: getStresCategory(sScore), fill: getSeverityStyle(getStresCategory(sScore)).fill }
  ];

  const dimensions = [
    { name: 'Depresi', label: 'DEPRESI' },
    { name: 'Kecemasan', label: 'KECEMASAN' },
    { name: 'Stres', label: 'STRES' }
  ];

  // Paginated questions
  const startIndex = currentPage * itemsPerPage;
  const currentQuestions = DASS_QUESTIONS.slice(startIndex, startIndex + itemsPerPage);
  
  // Calculate total progress
  const answeredCount = DASS_QUESTIONS.filter(q => jawaban[q.id] !== undefined).length;
  const progressPercent = Math.round((answeredCount / DASS_QUESTIONS.length) * 100);

  // Render Admin content
  const renderAdminContent = () => {
    if (!isAdminLoggedIn) {
      return (
        <div className="mx-auto max-w-md my-12 rounded-2xl border border-slate-200 bg-white p-8 shadow-md">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 animate-pulse">
              <Lock className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-extrabold text-slate-800">Login Administrator</h2>
            <p className="text-xs text-slate-500 mt-1 font-medium">Silakan masuk menggunakan kredensial administrator yang aman.</p>
          </div>

          <form onSubmit={handleAdminLoginSubmit} className="space-y-4" autoComplete="off">
            {adminError && (
              <div className="rounded-xl bg-red-50 border border-red-200 p-3.5 text-xs text-red-650 font-bold flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-550" />
                <span>{adminError}</span>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Username</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <UserIcon className="h-4 w-4" />
                </span>
                <input 
                  type="text" 
                  value={adminUsername}
                  onChange={(e) => setAdminUsername(e.target.value)}
                  placeholder="Masukkan username" 
                  className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-2.5 text-sm bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium"
                  id="admin-username-input"
                  required
                  autoComplete="off"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <Key className="h-4 w-4" />
                </span>
                <input 
                  type="password" 
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="Masukkan password" 
                  className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-2.5 text-sm bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium"
                  id="admin-password-input"
                  required
                  autoComplete="new-password"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full rounded-xl bg-indigo-600 py-3 text-xs font-black text-white hover:bg-indigo-700 active:bg-indigo-800 transition shadow-sm cursor-pointer border border-indigo-700 uppercase tracking-wider text-center"
            >
              MASUK DASHBOARD
            </button>
          </form>
        </div>
      );
    }

    // Calculations for logged in dashboard
    const totalSubmissions = history.length;
    
    // Auto gather unique rooms
    const uniqueRooms = Array.from(new Set(history.map(item => item.asalRuangan).filter(Boolean)));

    // Filtering logic
    const filtered = history.filter(item => {
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = item.namaResponden.toLowerCase().includes(searchLower) || 
                            (item.namaPetugas && item.namaPetugas.toLowerCase().includes(searchLower)) ||
                            (item.asalRuangan && item.asalRuangan.toLowerCase().includes(searchLower));
      
      const matchesRoom = roomFilter === 'Semua' || item.asalRuangan === roomFilter;
      
      let matchesCategory = true;
      if (categoryFilter === 'Depresi') {
        matchesCategory = item.kategoriDepresi !== 'Normal';
      } else if (categoryFilter === 'Kecemasan') {
        matchesCategory = item.kategoriKecemasan !== 'Normal';
      } else if (categoryFilter === 'Stres') {
        matchesCategory = item.kategoriStres !== 'Normal';
      } else if (categoryFilter === 'Non-Normal') {
        matchesCategory = item.kategoriDepresi !== 'Normal' || item.kategoriKecemasan !== 'Normal' || item.kategoriStres !== 'Normal';
      }

      return matchesSearch && matchesRoom && matchesCategory;
    });

    // Count high severity cases (Berat / Sangat Berat)
    const severeCount = history.filter(item => 
      ['Berat', 'Sangat Berat'].includes(item.kategoriDepresi) ||
      ['Berat', 'Sangat Berat'].includes(item.kategoriKecemasan) ||
      ['Berat', 'Sangat Berat'].includes(item.kategoriStres)
    ).length;

    const rateSevere = totalSubmissions > 0 ? Math.round((severeCount / totalSubmissions) * 100) : 0;

    // Room counts
    const roomTally = history.reduce((acc, item) => {
      if (item.asalRuangan) {
        acc[item.asalRuangan] = (acc[item.asalRuangan] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    let topRoomStr = '-';
    let maxRoomCountNum = 0;
    Object.entries(roomTally).forEach(([room, count]) => {
      const c = count as number;
      if (c > maxRoomCountNum) {
        maxRoomCountNum = c;
        topRoomStr = room;
      }
    });

    const handleDeleteRecord = (idToDelete?: string) => {
      if (!idToDelete) return;
      if (window.confirm('Apakah Anda yakin ingin menghapus catatan hasil tes ini permanen?')) {
        const nextHistory = history.filter(item => item.id !== idToDelete);
        setHistory(nextHistory);
        localStorage.setItem('dass42_survey_history', JSON.stringify(nextHistory));
      }
    };

    return (
      <div className="space-y-6">
        {/* Header Summary Dashboard */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <h2 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
              <Activity className="h-5.5 w-5.5 text-indigo-650 animate-pulse" />
              <span>Dashboard Analitik Database Hasil Tes DASS-42</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1 font-medium">Halaman pemantauan sejarah, sebaran asal ruangan/unit medis, dan unduhan dokumen PDF secara ringkas.</p>
          </div>
          <button 
            onClick={handleAdminLogout}
            className="flex items-center gap-1.5 px-3.5 py-2 hover:bg-red-50 text-red-650 font-bold border border-red-200 hover:border-red-300 rounded-xl text-xs uppercase tracking-wider transition duration-150 cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Keluar Admin</span>
          </button>
        </div>

        {/* Bento Statistics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
            <p className="text-[10px] uppercase text-slate-400 font-bold tracking-widest">Total Partisipan</p>
            <p className="text-2xl font-black text-slate-850 mt-1">{totalSubmissions} Responden</p>
            <p className="text-[10px] text-slate-500 mt-1.5 font-medium">Total seluruh runs dari instrumen DASS-42</p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
            <p className="text-[10px] uppercase text-slate-400 font-bold tracking-widest">Indikasi Klinis Berat / Sangat Berat</p>
            <p className="text-2xl font-black text-rose-600 mt-1">{severeCount} Orang</p>
            <p className="text-[10px] text-slate-500 mt-1.5 font-medium">Rasio Keparahan: <strong className="text-rose-600">{rateSevere}%</strong> dari responden</p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
            <p className="text-[10px] uppercase text-slate-400 font-bold tracking-widest">Unit / Ruangan Teraktif</p>
            <p className="text-2xl font-black text-indigo-650 mt-1 truncate" title={topRoomStr}>{topRoomStr}</p>
            <p className="text-[10px] text-slate-500 mt-1.5 font-medium">Memiliki kontribusi {maxRoomCountNum} asesmen</p>
          </div>

          <div className="bg-indigo-50/10 rounded-2xl p-5 border border-indigo-150 shadow-xs flex flex-col justify-between">
            <div>
              <p className="text-[10px] uppercase text-indigo-650 font-black tracking-widest">Aksi Pemeriksaan</p>
              <p className="text-xs font-bold text-slate-700 mt-1">Ingin menjalankan pemeriksaan baru?</p>
            </div>
            <button
              onClick={() => { navigateTo('/'); setSurveyView('form'); }}
              className="mt-3 w-full rounded-lg bg-indigo-600 py-1.5 text-center text-[10px] font-black uppercase text-white hover:bg-indigo-700 transition cursor-pointer"
            >
              MULAI TES BARU
            </button>
          </div>
        </div>

        {/* Analytics & Academic Insights Section */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 mb-5 gap-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-indigo-600" />
              <div>
                <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-800">Analitik Statistik & Insight Akademis</h3>
                <p className="text-[10px] text-slate-400 font-medium">Tinjauan tren klinis kuesioner DASS-42 berdasarkan sebaran gejala, unit ruangan, dan butir indikator secara real-time.</p>
              </div>
            </div>
            
            {/* Tab buttons */}
            <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold shrink-0 self-start sm:self-auto">
              <button 
                onClick={() => setAnalyticsTab('sebaran')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${analyticsTab === 'sebaran' ? 'bg-white text-indigo-650 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
              >
                Sebaran Gejala
              </button>
              <button 
                onClick={() => setAnalyticsTab('ruangan')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${analyticsTab === 'ruangan' ? 'bg-white text-indigo-650 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
              >
                Profil Per Unit
              </button>
              <button 
                onClick={() => setAnalyticsTab('butir')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${analyticsTab === 'butir' ? 'bg-white text-indigo-650 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
              >
                Analisis Butir Soal
              </button>
            </div>
          </div>

          {/* Tab Content */}
          {analyticsTab === 'sebaran' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                <div className="lg:col-span-7 h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={(() => {
                        const categories: SeverityCategory[] = ['Normal', 'Ringan', 'Sedang', 'Berat', 'Sangat Berat'];
                        return categories.map(cat => ({
                          name: cat,
                          Depresi: history.filter(item => item.kategoriDepresi === cat).length,
                          Kecemasan: history.filter(item => item.kategoriKecemasan === cat).length,
                          Stres: history.filter(item => item.kategoriStres === cat).length,
                        }));
                      })()}
                      margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="name" style={{ fontSize: '11px', fontWeight: 'bold' }} tickLine={false} />
                      <YAxis style={{ fontSize: '11px' }} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ borderRadius: '12px', borderColor: '#e2e8f0', fontSize: '12px' }} />
                      <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
                      <Bar dataKey="Depresi" fill="#6366f1" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Kecemasan" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Stres" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="lg:col-span-5 space-y-3 text-left">
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-xs text-slate-600 leading-relaxed font-medium">
                    <p className="font-extrabold text-slate-800 text-sm mb-1.5 uppercase tracking-wide">Interpretasi Akademis (Prevalensi)</p>
                    <p className="mb-2">
                      Grafik ini menggambarkan perbandingan tingkat keparahan pada tiga dimensi kesehatan mental utama dari seluruh responden yang terdaftar. 
                    </p>
                    <p className="mb-2">
                      Secara akademis, jika bar <strong>Kecemasan (Hijau)</strong> atau <strong>Stres (Oranye)</strong> mendominasi area berat/sangat berat, hal ini menunjukkan adanya tekanan situasional atau ketegangan otonom fisik yang aktif pada populasi saat ini. 
                    </p>
                    <p>
                      Sebaliknya, peningkatan pada dimensi <strong>Depresi (Biru)</strong> mengindikasikan kelumpuhan motivasional jangka panjang atau penurunan afektif mendalam yang memerlukan intervensi klinis individual yang lebih mendesak.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {analyticsTab === 'ruangan' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                <div className="lg:col-span-7 h-64 w-full">
                  {uniqueRooms.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={uniqueRooms.map(room => {
                          const roomSubmissions = history.filter(item => item.asalRuangan === room);
                          const count = roomSubmissions.length;
                          return {
                            room,
                            Depresi: count > 0 ? Number((roomSubmissions.reduce((sum, item) => sum + item.scoreDepresi, 0) / count).toFixed(1)) : 0,
                            Kecemasan: count > 0 ? Number((roomSubmissions.reduce((sum, item) => sum + item.scoreKecemasan, 0) / count).toFixed(1)) : 0,
                            Stres: count > 0 ? Number((roomSubmissions.reduce((sum, item) => sum + item.scoreStres, 0) / count).toFixed(1)) : 0,
                          };
                        })}
                        margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="room" style={{ fontSize: '11px', fontWeight: 'bold' }} tickLine={false} />
                        <YAxis style={{ fontSize: '11px' }} tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={{ borderRadius: '12px', borderColor: '#e2e8f0', fontSize: '12px' }} />
                        <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
                        <Bar dataKey="Depresi" fill="#6366f1" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Kecemasan" fill="#10b981" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Stres" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-xs text-slate-400 font-semibold italic border border-dashed border-slate-200 rounded-xl">
                      Belum ada data unit/ruangan terisi.
                    </div>
                  )}
                </div>
                <div className="lg:col-span-5 space-y-3 text-left">
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-xs text-slate-600 leading-relaxed font-medium">
                    <p className="font-extrabold text-slate-800 text-sm mb-1.5 uppercase tracking-wide">Analisis Komparatif Antar Unit</p>
                    <p className="mb-2">
                      Membandingkan rerata skor DASS antar unit sangat penting untuk mendeteksi <strong>faktor stres spesifik lingkungan kerja (environmental/workplace stressors)</strong>.
                    </p>
                    <p>
                      Unit dengan rerata skor Stres atau Kecemasan yang melampaui ambang batas normal (Depresi &gt; 9, Kecemasan &gt; 7, Stres &gt; 14) secara akademis mengindikasikan adanya ketimpangan beban kerja, ergonomi lingkungan yang buruk, atau sistem operasional yang jenuh, sehingga memerlukan restrukturisasi preventif sebelum memicu fenomena burnout massal.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {analyticsTab === 'butir' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-7 space-y-2.5">
                  <p className="text-xs font-black uppercase text-slate-500 tracking-wider text-left">5 Indikator Keluhan Spesifik Teratas (Skor Rata-Rata Tertinggi)</p>
                  <div className="space-y-2">
                    {(() => {
                      const itemScores = DASS_QUESTIONS.map(q => {
                        const scores = history.map(item => item.jawaban[q.id] ?? 0);
                        const avgScore = scores.length > 0 ? (scores.reduce((sum, val) => sum + val, 0) / scores.length) : 0;
                        return {
                          id: q.id,
                          text: q.text,
                          category: q.category,
                          avgScore: Number(avgScore.toFixed(2))
                        };
                      });
                      const top5 = [...itemScores].sort((a, b) => b.avgScore - a.avgScore).slice(0, 5);
                      
                      return top5.map((item, idx) => {
                        let catBadge = "bg-indigo-50 text-indigo-700 border-indigo-150";
                        if (item.category === "Kecemasan") catBadge = "bg-emerald-50 text-emerald-700 border-emerald-150";
                        else if (item.category === "Stres") catBadge = "bg-amber-50 text-amber-700 border-amber-150";

                        return (
                          <div key={item.id} className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex items-center justify-between gap-4">
                            <div className="flex items-start gap-3">
                              <span className="flex h-5 w-5 rounded-full bg-slate-900 text-[10px] font-black text-white shrink-0 items-center justify-center font-mono mt-0.5">{idx + 1}</span>
                              <div className="text-left flex-1">
                                <p className="text-xs text-slate-700 font-bold leading-normal">{item.text}</p>
                                <span className={`inline-flex px-1.5 py-0.5 rounded border text-[8px] font-black uppercase tracking-wider mt-1.5 ${catBadge}`}>{item.category} (Butir Q{item.id})</span>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-base font-black font-mono text-slate-800">{item.avgScore}</p>
                              <p className="text-[9px] text-slate-400 font-semibold font-mono">Skor Rerata (0-3)</p>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
                <div className="lg:col-span-5 space-y-3 text-left">
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-xs text-slate-600 leading-relaxed font-medium">
                    <p className="font-extrabold text-slate-800 text-sm mb-1.5 uppercase tracking-wide">Analisis Butir (Item-Level Analytics)</p>
                    <p className="mb-2">
                      Dari kacamata klinis dan akademis, analisis pada level butir pernyataan mengidentifikasi <strong>jenis simptom atau ekspresi keluhan psikososial yang paling lazim dirasakan</strong> oleh responden secara kolektif.
                    </p>
                    <p>
                      Mengetahui keluhan butir spesifik (misalnya: sulit bernapas, kehilangan ketertarikan, atau kesulitan rileks) memberikan petunjuk program promotif-preventif yang jauh lebih terarah. Dengan demikian, tim medis atau manajerial dapat merancang program intervensi spesifik (seperti latihan pernapasan rutin berkelompok, bimbingan afirmasi terstruktur, atau penataan ulang beban waktu pengerjaan) demi menargetkan akar gejala klinis yang paling mendominasi.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Database & Room Master Settings Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Room Management Box */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5 mb-4">
              <div className="flex items-center gap-2">
                <LayoutGrid className="h-5 w-5 text-indigo-600" />
                <div>
                  <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-800">Master Ruangan / Unit Medis</h3>
                  <p className="text-[10px] text-slate-400 font-medium">Tambah atau hapus pilihan unit medis untuk pengisian kuesioner.</p>
                </div>
              </div>
              <button
                onClick={async () => {
                  if (window.confirm('Apakah Anda yakin ingin mengatur ulang daftar ruangan ke pengaturan awal?')) {
                    const defaults = ['Unit UGD', 'Ruang Melati', 'Unit Poliklinik', 'Ruang Dahlia', 'ICU'];
                    setRooms(defaults);
                    if (isSupabaseConfigured()) {
                      try {
                        for (const room of defaults) {
                          try { await addRoomToSupabase(room); } catch (e) {}
                        }
                        alert('Daftar ruangan default berhasil disinkronkan ke Supabase!');
                      } catch (err: any) {
                        console.error('Database sync failed:', err.message);
                      }
                    }
                  }
                }}
                className="text-[10px] font-black text-indigo-600 hover:text-indigo-800 uppercase tracking-wider cursor-pointer"
              >
                Reset Default
              </button>
            </div>

            {/* Quick add form */}
            <div className="flex gap-2 mb-4">
              <input 
                type="text"
                value={newRoomInput}
                onChange={(e) => setNewRoomInput(e.target.value)}
                placeholder="Contoh: Unit ICU, Ruang Wijaya Kusuma..."
                className="flex-1 rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
                onKeyDown={async (e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const trimmed = newRoomInput.trim();
                    if (trimmed) {
                      if (rooms.includes(trimmed)) {
                        alert('Ruangan ini sudah terdaftar.');
                        return;
                      }
                      if (isSupabaseConfigured()) {
                        try {
                          await addRoomToSupabase(trimmed);
                        } catch (err: any) {
                          alert('Gagal menyimpan ruangan ke Supabase: ' + err.message);
                          return;
                        }
                      }
                      setRooms(prev => [...prev, trimmed]);
                      setNewRoomInput('');
                    }
                  }
                }}
              />
              <button
                onClick={async () => {
                  const trimmed = newRoomInput.trim();
                  if (!trimmed) return;
                  if (rooms.includes(trimmed)) {
                    alert('Ruangan ini sudah terdaftar.');
                    return;
                  }
                  if (isSupabaseConfigured()) {
                    try {
                      await addRoomToSupabase(trimmed);
                    } catch (err: any) {
                      alert('Gagal menyimpan ruangan ke Supabase: ' + err.message);
                      return;
                    }
                  }
                  setRooms(prev => [...prev, trimmed]);
                  setNewRoomInput('');
                }}
                className="rounded-xl bg-indigo-600 px-4 text-xs font-black text-white hover:bg-indigo-700 active:bg-indigo-800 transition shadow-sm border border-indigo-700 cursor-pointer"
              >
                TAMBAH
              </button>
            </div>

            {/* Room choice items pills */}
            <div className="flex flex-wrap gap-2 max-h-[140px] overflow-y-auto p-2 bg-slate-50/50 rounded-xl border border-slate-100">
              {rooms.map((room) => (
                <span 
                  key={room} 
                  className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 shadow-xs"
                >
                  <span>{room}</span>
                  <button
                    onClick={async () => {
                      if (window.confirm(`Hapus "${room}" dari daftar unit aktif?`)) {
                        if (isSupabaseConfigured()) {
                          try {
                            await deleteRoomFromSupabase(room);
                          } catch (err: any) {
                            alert('Gagal menghapus ruangan dari Supabase: ' + err.message);
                            return;
                          }
                        }
                        setRooms(prev => prev.filter(r => r !== room));
                      }
                    }}
                    className="p-0.5 rounded-md hover:bg-red-50 text-slate-400 hover:text-red-605 transition cursor-pointer"
                    title="Hapus"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              {rooms.length === 0 && (
                <p className="text-[11px] text-slate-400 italic p-3 text-center w-full">Tidak ada ruangan terdaftar. Silakan tambah di atas agar petugas dapat memilih di halaman depan.</p>
              )}
            </div>
          </div>

          {/* Connected Spreadsheet Box */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-3.5 mb-3.5 font-bold">
                <div className="flex items-center gap-2">
                  <Database className="h-5 w-5 text-indigo-600" />
                  <div>
                    <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-800">Database Google Sheets</h3>
                    <p className="text-[10px] text-slate-400 font-medium">Atur sinkronisasi spreadsheet utama untuk menyimpan semua hasil tes secara real-time.</p>
                  </div>
                </div>
                {user ? (
                  <span className="flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-150 px-2 py-0.5 text-[9px] font-black text-emerald-700 uppercase tracking-widest font-mono">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Aktif
                  </span>
                ) : (
                  <span className="rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5 text-[9px] font-black text-slate-500 uppercase tracking-widest font-mono">
                    Offline
                  </span>
                )}
              </div>

              {/* Status or Connection Action block */}
              {user ? (
                <div className="space-y-4">
                  <div className="bg-slate-50 border border-slate-150 rounded-xl p-3.5 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5 truncate">
                      {user.photoURL ? (
                        <img src={user.photoURL} alt={user.displayName} referrerPolicy="no-referrer" className="h-9 w-9 rounded-full border border-slate-200" />
                      ) : (
                        <div className="h-9 w-9 rounded-full bg-indigo-55 text-indigo-805 font-black border border-indigo-150 flex items-center justify-center font-mono">
                          {user.displayName?.substring(0, 2).toUpperCase() || 'US'}
                        </div>
                      )}
                      <div className="truncate text-left">
                        <p className="font-bold text-slate-800 truncate">{user.displayName || 'Authorized Admin'}</p>
                        <p className="text-[10px] text-slate-400 font-semibold truncate">{user.email}</p>
                      </div>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="shrink-0 text-[10px] bg-red-50 hover:bg-red-100 text-red-650 border border-red-150 rounded-lg px-2.5 py-1.5 font-bold transition cursor-pointer"
                    >
                      Keluar Google
                    </button>
                  </div>

                  {spreadsheetLink && (
                    <div className="rounded-xl bg-emerald-50/50 border border-emerald-150/75 p-3 flex items-center justify-between gap-2.5 text-left">
                      <div className="truncate">
                        <p className="text-[10px] text-emerald-800 font-extrabold uppercase tracking-widest font-mono">Spreadsheet Aktif</p>
                        <p className="text-slate-500 font-mono text-[9px] truncate">{spreadsheetLink}</p>
                      </div>
                      <a
                        href={spreadsheetLink}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shrink-0 transition shadow-sm cursor-pointer"
                      >
                        <span>Buka Sheet ↗</span>
                      </a>
                    </div>
                  )}

                  {!spreadsheetLink && (
                    <div className="text-center rounded-xl border border-dashed border-slate-300 p-4">
                      <p className="text-xs text-slate-500 font-medium">Spreadsheet belum diinisialisasi atau dibuat pada drive ini.</p>
                      <button
                        onClick={async () => {
                          try {
                            const spreadsheetId = await getOrCreateSpreadsheet(token || getAccessToken()!);
                            setSpreadsheetLink(`https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`);
                            alert('Spreadsheet "DASS-42 Survey Database" berhasil divalidasi dan dibuat pada Google Drive admin!');
                          } catch (err: any) {
                            alert('Gagal inisialisasi: ' + err.message);
                          }
                        }}
                        className="mt-2 text-xs font-black text-indigo-650 hover:text-indigo-850 uppercase tracking-widest inline-flex items-center gap-1 cursor-pointer"
                      >
                        <span>Buat & Sinkronisasi Drive Sekarang</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3 text-left">
                  <p className="text-xs text-slate-500 leading-normal font-medium">
                    Hubungkan dengan akun Google administrator untuk menjamin seluruh data transaksi kuesioner DASS-42 otomatis disimpan dan diarsipkan dalam bentuk Spreadsheet Google Sheet yang rapi.
                  </p>
                  <button 
                    onClick={handleGoogleLogin}
                    disabled={isLoggingIn}
                    className="w-full flex items-center justify-center space-x-2.5 rounded-xl bg-indigo-600 text-white py-3 text-xs font-black uppercase tracking-wider hover:bg-indigo-700 border border-indigo-700 active:bg-indigo-800 transition shadow-sm disabled:opacity-50 cursor-pointer"
                    id="admin-google-login-btn"
                  >
                    <Database className="h-4 w-4" />
                    <span>{isLoggingIn ? 'MENGHUBUNGKAN...' : 'OTORISASI GOOGLE SHEETS'}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Error alerts if existing */}
            {sheetsErrorMsg && (
              <div className="mt-3 rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-705 flex items-start gap-2 text-left">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-600" />
                <span>{sheetsErrorMsg}</span>
              </div>
            )}
          </div>
        </div>

        {/* Filters and Search panel */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row items-center gap-4">
          <div className="relative w-full md:flex-1">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
              <Search className="h-4 w-4" />
            </span>
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari berdasarkan nama responden atau nama petugas pemeriksa..." 
              className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-2.5 text-sm bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Filter Room */}
            <div className="flex items-center space-x-2 shrink-0">
              <Filter className="h-3.5 w-3.5 text-slate-400" />
              <select 
                value={roomFilter}
                onChange={(e) => setRoomFilter(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium focus:outline-none cursor-pointer"
              >
                <option value="Semua">Unit: Semua</option>
                {uniqueRooms.map(room => (
                  <option key={room} value={room}>{room}</option>
                ))}
              </select>
            </div>

            {/* Filter Category */}
            <div className="flex items-center space-x-2 shrink-0">
              <select 
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium focus:outline-none cursor-pointer"
              >
                <option value="Semua">Gejala: Semua</option>
                <option value="Depresi">Depresi Terindikasi</option>
                <option value="Kecemasan">Kecemasan Terindikasi</option>
                <option value="Stres">Stres Terindikasi</option>
                <option value="Non-Normal">Di Luar Batas Normal (Semua)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Response Data Table List */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto overflow-y-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-150 text-[10px] uppercase font-black text-slate-500 tracking-wider">
                  <th className="px-5 py-3.5">Tanggal</th>
                  <th className="px-5 py-3.5">Responden</th>
                  <th className="px-5 py-3.5">Asal Ruangan</th>
                  <th className="px-5 py-3.5 text-center">Depresi</th>
                  <th className="px-5 py-3.5 text-center">Kecemasan</th>
                  <th className="px-5 py-3.5 text-center">Stres</th>
                  <th className="px-5 py-3.5 text-right pr-6">Eksport & Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm font-medium">
                {filtered.length > 0 ? (
                  filtered.map((item, idx) => {
                    const styleDepresi = getSeverityStyle(item.kategoriDepresi);
                    const styleKecemasan = getSeverityStyle(item.kategoriKecemasan);
                    const styleStres = getSeverityStyle(item.kategoriStres);

                    return (
                      <tr key={item.id || idx} className="hover:bg-slate-50/40 transition">
                        <td className="px-5 py-4 whitespace-nowrap text-xs text-slate-500 font-mono">{item.tanggal}</td>
                        <td className="px-5 py-4">
                          <p className="font-bold text-slate-800">{item.namaResponden}</p>
                          <p className="text-[10px] text-slate-400 font-semibold">{item.umur} Tahun - {item.gender}</p>
                        </td>
                        <td className="px-5 py-4">
                          <span className="inline-flex px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-650 text-xs font-semibold">{item.asalRuangan}</span>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <span className={`inline-flex px-2 apy-0.5 rounded-full border text-[9px] font-black uppercase tracking-wider ${styleDepresi?.bg}`}>
                            {item.scoreDepresi} ({item.kategoriDepresi})
                          </span>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <span className={`inline-flex px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-wider ${styleKecemasan?.bg}`}>
                            {item.scoreKecemasan} ({item.kategoriKecemasan})
                          </span>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <span className={`inline-flex px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-wider ${styleStres?.bg}`}>
                            {item.scoreStres} ({item.kategoriStres})
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right pr-6 whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2 text-slate-400">
                            <button 
                              onClick={() => setSelectedDetailResult(item)}
                              title="Tinjau Detail Log"
                              className="p-1 px-2 hover:bg-slate-100 hover:text-indigo-600 border border-slate-200 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              <span>Detail</span>
                            </button>
                            <button 
                              onClick={() => exportToPDF(item)}
                              title="Eksport Laporan PDF"
                              className="p-1 px-2 hover:bg-slate-100 hover:text-slate-850 border border-slate-200 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                            >
                              <FileDown className="h-3.5 w-3.5" />
                              <span>PDF</span>
                            </button>
                            <button 
                              onClick={() => handleDeleteRecord(item.id)}
                              title="Hapus Catatan"
                              className="p-1.5 hover:bg-red-50 hover:text-red-650 border border-slate-200 hover:border-red-150 rounded-lg transition shrink-0 cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center">
                      <div className="max-w-xs mx-auto">
                        <AlertCircle className="h-8 w-8 text-slate-300 mx-auto" />
                        <p className="text-slate-500 font-bold mt-2">Tidak Ada Data</p>
                        <p className="text-xs text-slate-400 leading-normal mt-1">Data responden kosong atau kueri filter pencarian Anda tidak mencocokkan rekaman apapun dalam sistem.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Selected detail result modal pop-up overlay */}
        {selectedDetailResult && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-slate-200 max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col">
              {/* Header */}
              <div className="bg-slate-950 text-white px-6 py-4 flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-base">Detail Catatan Responden</h3>
                  <p className="text-[10px] text-slate-300 uppercase font-mono tracking-widest mt-0.5">ID: {selectedDetailResult.id}</p>
                </div>
                <button 
                  onClick={() => setSelectedDetailResult(null)}
                  className="rounded-lg p-1 hover:bg-white/10 text-slate-300 hover:text-white transition cursor-pointer font-bold text-xs"
                >
                  TUTUP
                </button>
              </div>

              {/* Patient Metadata Grid */}
              <div className="p-6 bg-slate-50 border-b border-slate-200 grid grid-cols-2 gap-4 text-xs font-semibold">
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Responden</p>
                  <p className="text-sm font-extrabold text-slate-800 mt-0.5">{selectedDetailResult.namaResponden}</p>
                  <p className="text-slate-500 mt-1">{selectedDetailResult.umur} Th ({selectedDetailResult.gender}) [{selectedDetailResult.asalRuangan}]</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Log Pemeriksaan</p>
                  <p className="text-sm font-extrabold text-indigo-600 mt-0.5">{selectedDetailResult.tanggal}</p>
                  <p className="text-slate-500 mt-1">Pemeriksa: <span className="font-bold">{selectedDetailResult.namaPetugas}</span></p>
                </div>
              </div>

              {/* Answers Grid Detail */}
              <div className="p-6 max-h-[350px] overflow-y-auto">
                <h4 className="text-xs uppercase font-extrabold text-slate-800 tracking-wider border-b border-slate-150 pb-2 mb-3">Daftar Transkrip 42 Jawaban Responden</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
                  {DASS_QUESTIONS.map((q) => {
                    const ansScore = selectedDetailResult.jawaban[q.id] ?? 0;
                    
                    let categoryColor = "text-indigo-650 bg-indigo-50 border-indigo-100";
                    if (q.category === "Kecemasan") {
                      categoryColor = "text-emerald-650 bg-emerald-50 border-emerald-100";
                    } else if (q.category === "Stres") {
                      categoryColor = "text-amber-650 bg-amber-50 border-amber-100";
                    }

                    return (
                      <div key={q.id} className="flex justify-between items-center py-1.5 border-b border-slate-100 last:border-0 text-xs font-semibold">
                        <div className="truncate pr-4 flex items-center space-x-2">
                          <span className="font-mono font-bold text-slate-400">{q.id}.</span>
                          <span className="text-slate-700 truncate max-w-[190px]" title={q.text}>{q.text}</span>
                        </div>
                        <div className="flex items-center space-x-1.5 shrink-0">
                          <span className={`inline-flex text-[8px] font-black font-mono border rounded px-1.5 ${categoryColor}`}>{q.category[0]}</span>
                          <span className="font-mono font-black text-slate-800 bg-slate-100 border border-slate-200 h-5 w-5 rounded flex items-center justify-center">{ansScore}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Footer */}
              <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between">
                <button 
                  onClick={() => exportToPDF(selectedDetailResult)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 font-bold border border-indigo-700 rounded-xl text-xs uppercase tracking-wider text-white transition cursor-pointer"
                >
                  <FileDown className="h-4 w-4" />
                  <span>Dapatkan Dokumen PDF</span>
                </button>
                <button 
                  onClick={() => setSelectedDetailResult(null)}
                  className="px-4 py-2 hover:bg-slate-200 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 cursor-pointer"
                >
                  Tutup Rincian
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 transition-colors duration-200">
      
      {/* Top Banner with Bento Aesthetic */}
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between px-6 py-4 md:flex-row lg:px-8">
          <div className="flex flex-col sm:flex-row items-center space-y-3 sm:space-y-0 sm:space-x-8 text-slate-800">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-sm">
                D
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-800">
                  DASS-42 <span className="text-indigo-600 font-extrabold">Analyzer</span>
                </h1>
                <p className="text-xs text-slate-500 font-medium">Skrining Tingkat Depresi, Kecemasan, dan Stres Berbasis Lovibond (1995)</p>
              </div>
            </div>

            {/* Navigation links like domain/halaman */}
            <div className="flex items-center space-x-1 sm:space-x-2 border-l border-slate-200 pl-3 sm:pl-4 py-1">
              <button 
                onClick={() => navigateTo('/')}
                className={`px-2 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 sm:gap-1.5 cursor-pointer ${
                  currentPath !== '/admin' 
                    ? 'bg-indigo-50 text-indigo-700 font-black border border-indigo-200' 
                    : 'text-slate-600 hover:bg-slate-150 hover:text-slate-900 border border-transparent'
                }`}
                id="header-nav-kuesioner"
              >
                <ClipboardCheck className="h-3.5 sm:h-4 w-3.5 sm:w-4" />
                <span>Kuesioner</span>
              </button>

              <button 
                onClick={() => navigateTo('/admin')}
                className={`px-2 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 sm:gap-1.5 cursor-pointer ${
                  currentPath === '/admin' 
                    ? 'bg-indigo-50 text-indigo-700 font-black border border-indigo-200' 
                    : 'text-slate-600 hover:bg-slate-150 hover:text-slate-900 border border-transparent'
                }`}
                id="header-nav-admin"
              >
                <Lock className="h-3.5 sm:h-4 w-3.5 sm:w-4" />
                <span>Admin</span>
              </button>
            </div>
          </div>

          {/* Sync status active indicator (read-only on public view) */}
          <div className="mt-2 flex items-center space-x-3 md:mt-0 animate-fade-in">
            {user && (
              <div className="flex items-center space-x-2 rounded-xl border border-emerald-200 px-3 py-1.5 bg-emerald-50 text-emerald-800 shadow-xs">
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-[10px] font-black uppercase tracking-wider font-mono">DB Google Sheet Sinkron</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Container Area */}
      <main className="mx-auto max-w-7xl px-6 py-8 lg:px-8">
        
        {currentPath === '/admin' ? (
          renderAdminContent()
        ) : surveyView === 'form' ? (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            
            {/* Left Sidebar: Instructions & Profile Details */}
            <div className="lg:col-span-1 space-y-6">
              
              {/* Profile Details Card - Bento White Box */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-5 flex items-center space-x-2.5 text-slate-800 border-b border-slate-100 pb-3">
                  <UserCheck className="h-5 w-5 text-indigo-600" id="form-header-icon" />
                  <h2 className="font-bold text-base">Identitas Responden</h2>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1.5">Nama Lengkap Responden</label>
                    <input 
                      type="text" 
                      value={namaResponden}
                      onChange={(e) => setNamaResponden(e.target.value)}
                      placeholder="Nama lengkap responden" 
                      className={`w-full rounded-xl border px-4 py-2.5 text-sm bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-1 transition-all ${errors.namaResponden ? 'border-red-400 focus:ring-red-400 focus:border-red-400' : 'border-slate-200 focus:ring-indigo-500 focus:border-indigo-500'}`}
                      id="input-respondent-name"
                    />
                    {errors.namaResponden && <p className="mt-1 text-xs text-red-500 font-medium">{errors.namaResponden}</p>}
                  </div>

                  <div>
                    <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1.5">Asal Ruangan / Unit</label>
                    <select 
                      value={rooms.includes(asalRuangan) ? asalRuangan : asalRuangan ? 'Lainnya' : ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === 'Lainnya') {
                          setAsalRuangan(customAsalRuangan || '');
                        } else {
                          setAsalRuangan(val);
                        }
                      }}
                      className={`w-full rounded-xl border px-4 py-2.5 text-sm bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-1 transition-all ${errors.asalRuangan ? 'border-red-400 focus:ring-red-400 focus:border-red-400' : 'border-slate-200 focus:ring-indigo-500 focus:border-indigo-500'}`}
                      id="input-respondent-room-select"
                    >
                      <option value="">-- Pilih Ruangan / Unit --</option>
                      {rooms.map((room) => (
                        <option key={room} value={room}>{room}</option>
                      ))}
                      <option value="Lainnya">Lainnya (Tulis Manual...)</option>
                    </select>

                    {/* Show manual input if choice is custom */}
                    {(asalRuangan !== '' && !rooms.includes(asalRuangan)) || (asalRuangan === 'Lainnya') ? (
                      <div className="mt-2">
                        <input 
                          type="text" 
                          value={customAsalRuangan}
                          onChange={(e) => {
                            const val = e.target.value;
                            setCustomAsalRuangan(val);
                            setAsalRuangan(val);
                          }}
                          placeholder="Ketik asal ruangan/unit medis secara manual..." 
                          className="w-full rounded-xl border border-slate-200 px-4 py-2 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all font-medium"
                          id="input-respondent-room-custom"
                        />
                      </div>
                    ) : null}
                    {errors.asalRuangan && <p className="mt-1 text-xs text-red-500 font-medium">{errors.asalRuangan}</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1.5">Umur (Tahun)</label>
                      <input 
                        type="number" 
                        value={umur}
                        onChange={(e) => setUmur(e.target.value)}
                        placeholder="Contoh: 24" 
                        min="1"
                        className={`w-full rounded-xl border px-4 py-2.5 text-sm bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-1 transition-all ${errors.umur ? 'border-red-400 focus:ring-red-400 focus:border-red-400' : 'border-slate-200 focus:ring-indigo-500 focus:border-indigo-500'}`}
                        id="input-respondent-age"
                      />
                      {errors.umur && <p className="mt-1 text-xs text-red-500 font-medium">{errors.umur}</p>}
                    </div>

                    <div>
                      <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1.5">Jenis Kelamin</label>
                      <select 
                        value={gender}
                        onChange={(e) => setGender(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium"
                        id="select-respondent-gender"
                      >
                        <option value="Laki-laki">Laki-laki</option>
                        <option value="Perempuan">Perempuan</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1.5">Tanggal Asesmen</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                        <CalendarIcon className="h-4 w-4" />
                      </span>
                      <input 
                        type="date" 
                        value={tanggal}
                        onChange={(e) => setTanggal(e.target.value)}
                        className={`w-full rounded-xl border pl-10 pr-4 py-2.5 text-sm bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-1 transition-all ${errors.tanggal ? 'border-red-400 focus:ring-red-400 focus:border-red-400' : 'border-slate-200 focus:ring-indigo-500 focus:border-indigo-500'}`}
                        id="input-survey-date"
                      />
                    </div>
                    {errors.tanggal && <p className="mt-1 text-xs text-red-500 font-medium">{errors.tanggal}</p>}
                  </div>
                </div>
              </div>

              {/* Petunjuk Pengisian Card - Bento Solid Dark Box */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900 text-slate-100 p-6 shadow-xl relative overflow-hidden">
                <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-indigo-500 opacity-20 rounded-full blur-2xl"></div>
                <div className="mb-4 flex items-center space-x-2.5 text-white border-b border-slate-800 pb-3">
                  <BookOpen className="h-5 w-5 text-indigo-400" id="guide-header-icon" />
                  <h2 className="font-black text-sm uppercase tracking-wider">{PETUNJUK_PENGISIAN.title}</h2>
                </div>
                <p className="text-xs leading-relaxed text-slate-300 mb-5">{PETUNJUK_PENGISIAN.description}</p>
                
                {/* Options Table Legend */}
                <div className="space-y-3">
                  {PETUNJUK_PENGISIAN.options.map((option) => (
                    <div key={option.value} className="flex items-start space-x-3 rounded-xl bg-slate-800/80 p-3 border border-slate-700/60">
                      <span className="flex h-5.5 w-5.5 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-black text-white font-mono">
                        {option.value}
                      </span>
                      <span className="text-[11px] font-medium leading-normal text-slate-200">{option.text}</span>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] leading-relaxed text-slate-400 mt-5 italic border-t border-slate-800 pt-3">{PETUNJUK_PENGISIAN.closing}</p>
              </div>

            </div>

            {/* Right Panel: The Interactive Bento Questionnaire App */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Question Card Block */}
              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col">
                
                {/* Progress bar header */}
                <div className="bg-slate-50/50 px-6 py-5 border-b border-slate-200">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3">
                    <span className="text-base font-extrabold text-slate-800">Skrining Kuesioner DASS-42</span>
                    <span className="text-xs font-bold text-indigo-600 font-mono mt-1 sm:mt-0 uppercase tracking-widest bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-150">
                      Progres: {answeredCount}/42 Soal ({progressPercent}%)
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                    <div 
                      className="h-full bg-indigo-600 transition-all duration-300 ease-out"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                {/* Question List container */}
                <div className="divide-y divide-slate-100 px-6 py-2">
                  {currentQuestions.map((q) => {
                    const currentScore = jawaban[q.id];
                    
                    // Styled category color accents
                    let categoryBadge = "bg-teal-50 text-teal-700 border-teal-150";
                    if (q.category === "Depresi") {
                      categoryBadge = "bg-indigo-50 text-indigo-700 border-indigo-100";
                    } else if (q.category === "Kecemasan") {
                      categoryBadge = "bg-emerald-50 text-emerald-700 border-emerald-100";
                    } else if (q.category === "Stres") {
                      categoryBadge = "bg-amber-50 text-amber-700 border-amber-100";
                    }

                    return (
                      <div key={q.id} className="py-6 first:pt-4 last:pb-4">
                        <div className="mb-4">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <span className="inline-flex items-center rounded-lg bg-slate-900 border border-slate-800 text-white px-2.5 py-0.5 text-xs font-black font-mono">
                              Pernyataan {q.id}
                            </span>
                            <span className={`inline-flex items-center rounded-lg border px-2.5 py-0.5 text-xs font-bold font-mono ${categoryBadge}`}>
                              {q.category}
                            </span>
                          </div>
                          <p className="text-lg font-medium text-slate-700 leading-relaxed font-sans pr-2">
                            {q.text}
                          </p>
                        </div>

                        {/* Interactive Scale Options (Matching design theme style) */}
                        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                          {PETUNJUK_PENGISIAN.options.map((opt) => {
                            const isSelected = currentScore === opt.value;
                            return (
                              <button
                                key={opt.value}
                                onClick={() => handleSelectAnswer(q.id, opt.value)}
                                className={`w-full text-left p-4 rounded-xl border transition flex items-center gap-4 group cursor-pointer select-none ${
                                  isSelected 
                                    ? 'border-2 border-indigo-600 bg-indigo-50/70 text-indigo-900 font-semibold shadow-xs' 
                                    : 'border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/50 bg-white text-slate-700'
                                }`}
                                id={`q-${q.id}-opt-${opt.value}`}
                              >
                                <span className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold text-sm transition-all ${
                                  isSelected 
                                    ? 'bg-indigo-600 text-white shadow-xs' 
                                    : 'border border-slate-300 text-slate-500 group-hover:bg-indigo-600 group-hover:text-white'
                                }`}>
                                  {opt.value}
                                </span>
                                <span className="text-xs leading-normal font-medium">
                                  {opt.value === 0 
                                    ? 'Tidak pernah dialami' 
                                    : opt.value === 1 
                                      ? 'Kadang-kadang dialami' 
                                      : opt.value === 2 
                                        ? 'Sering dialami' 
                                        : 'Sangat sering dialami'}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Pagination Controls */}
                <div className="flex items-center justify-between border-t border-slate-150 bg-slate-50 px-6 py-5">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                    disabled={currentPage === 0}
                    className="flex items-center space-x-2 rounded-xl bg-white border border-slate-200 text-slate-700 px-4 py-2.5 text-xs font-bold hover:bg-slate-50 hover:border-slate-300 active:bg-slate-100 transition shadow-xs disabled:opacity-40 disabled:hover:bg-white cursor-pointer"
                    id="btn-prev-page"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span>KEMBALI</span>
                  </button>

                  <span className="text-xs font-extrabold text-slate-500 font-mono">
                    HALAMAN {currentPage + 1} DARI {totalPages}
                  </span>

                  {currentPage < totalPages - 1 ? (
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
                      className="flex items-center space-x-2 rounded-xl bg-indigo-600 text-white px-5 py-2.5 text-xs font-bold hover:bg-indigo-700 active:bg-indigo-800 transition shadow-sm cursor-pointer border border-indigo-700"
                      id="btn-next-page"
                    >
                      <span>LANJUTKAN</span>
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  ) : (
                    <button
                      onClick={handleAnalyze}
                      className="flex items-center space-x-2 rounded-xl bg-indigo-600 text-white px-6 py-2.5 text-xs font-black uppercase tracking-wider hover:bg-indigo-700 active:bg-indigo-800 border border-indigo-700 transition shadow-md cursor-pointer animate-pulse"
                      id="btn-finish-survey"
                    >
                      <CheckCircle2 className="h-4.5 w-4.5" />
                      <span>PROSES ANALISIS</span>
                    </button>
                  )}
                </div>

              </div>

            </div>
          </div>
        ) : (
          /* RESULT MODE VIEW PANEL - SENSATIONAL BENTO THEME INTERFACE */
          <div className="space-y-6 animate-fade-in">
            
            {/* Action Sync & Export Actions Card - Top Indigo Solid Container */}
            <section className="bg-indigo-600 text-white rounded-2xl p-6 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4 relative overflow-hidden">
              <div className="space-y-1 z-10">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <UserCheck className="h-5.5 w-5.5 animate-bounce" id="result-success-icon" />
                  Siap untuk diproses?
                </h2>
                <p className="text-indigo-100 text-xs">Data analis responden berhasil dihimpun. Sinkronisasikan ke Google Sheets & generate PDF.</p>
              </div>

              {/* Action Buttons Panel */}
              <div className="flex flex-wrap gap-2.5 z-10 w-full md:w-auto justify-end">
                
                {/* Google Sheet Sync Auto-Status Pill */}
                {user && (
                  sheetsStatus === 'saved' ? (
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-xl font-bold text-xs uppercase tracking-wider">
                      <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
                      <span>Tersimpan di Cloud</span>
                    </div>
                  ) : sheetsStatus === 'saving' ? (
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-500/10 border border-amber-500/35 text-amber-300 rounded-xl font-bold text-xs uppercase tracking-wider">
                      <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping"></span>
                      <span>Mengirim ke Cloud...</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-white/10 text-white/70 border border-white/10 rounded-xl font-bold text-xs uppercase tracking-wider">
                      <span>Antrian Sinkronisasi</span>
                    </div>
                  )
                )}

                {/* PDF Generation Download */}
                <button
                  onClick={handleExportPDF}
                  className="flex items-center gap-2 px-5 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer text-white"
                  id="btn-export-pdf"
                >
                  <FileDown className="h-4.5 w-4.5" />
                  <span>Cetak PDF</span>
                </button>

                {/* Reset Survey */}
                <button
                  onClick={handleReset}
                  className="flex items-center gap-2 px-5 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer text-white"
                  id="btn-reset-survey"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>Jalankan Tes Baru</span>
                </button>
              </div>
            </section>

            {/* Interactive Alert messages for Google Sheets */}
            {sheetsErrorMsg && (
              <div className="rounded-xl bg-red-55 border border-red-200 p-4 text-sm text-red-800 flex items-start space-x-2.5">
                <AlertCircle className="h-4.5 w-4.5 text-red-650 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Sinkronisasi Gagal</p>
                  <p className="text-xs text-red-700 leading-normal">{sheetsErrorMsg}</p>
                </div>
              </div>
            )}

            {sheetsStatus === 'saved' && (
              <div className="rounded-xl bg-emerald-50 border border-emerald-150 p-4 text-sm text-emerald-800 flex items-start space-x-2.5 animate-pulse">
                <Check className="h-4.5 w-4.5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Sukses Ditambahkan!</p>
                  <p className="text-xs text-emerald-700">Data survei responden <strong>{namaResponden}</strong> berhasil ditranskrip secara real-time ke dalam database Google Sheets.</p>
                </div>
              </div>
            )}

            {/* Live Analysis Gauges - 3 Column Bento Box Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {dimensions.map((dim) => {
                const currentScore = getSubscaleScore(dim.name as 'Depresi' | 'Kecemasan' | 'Stres');
                const currentCategory = dim.name === 'Depresi' 
                  ? getDepresiCategory(currentScore) 
                  : dim.name === 'Kecemasan' 
                    ? getKecemasanCategory(currentScore) 
                    : getStresCategory(currentScore);
                
                // Determine layout colors based on score severity level
                let ringColors = "border-emerald-400 text-emerald-600 bg-emerald-50/25";
                let badgeStyle = "bg-emerald-50 text-emerald-700 border-emerald-150";
                
                if (currentCategory === 'Normal') {
                  ringColors = "border-emerald-400 text-emerald-600 bg-emerald-50/15";
                  badgeStyle = "bg-emerald-50 text-emerald-600 border-emerald-100";
                } else if (currentCategory === 'Ringan') {
                  ringColors = "border-amber-400 text-amber-600 bg-amber-50/15";
                  badgeStyle = "bg-amber-50 text-amber-600 border-amber-100";
                } else if (currentCategory === 'Sedang') {
                  ringColors = "border-orange-400 text-orange-600 bg-orange-50/15";
                  badgeStyle = "bg-orange-50 text-orange-600 border-orange-100";
                } else if (currentCategory === 'Berat') {
                  ringColors = "border-rose-400 text-rose-600 bg-rose-50/15";
                  badgeStyle = "bg-rose-50 text-rose-600 border-rose-100";
                } else if (currentCategory === 'Sangat Berat') {
                  ringColors = "border-purple-400 text-purple-600 bg-purple-50/15";
                  badgeStyle = "bg-purple-50 text-purple-600 border-purple-100";
                }

                return (
                  <div key={dim.name} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex items-center gap-5">
                    <div className={`w-16 h-16 rounded-full border-[4.5px] ${ringColors} flex items-center justify-center font-black text-xl shrink-0 font-mono`}>
                      {currentScore < 10 ? `0${currentScore}` : currentScore}
                    </div>
                    <div className="space-y-1">
                      <p className="font-extrabold text-slate-800 text-base">{dim.name}</p>
                      <p className={`inline-flex px-2.5 py-0.5 rounded-full border text-[10px] font-black uppercase tracking-wider ${badgeStyle}`}>{currentCategory}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Visual Charts & Recommendation Grid Section */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Legend / Scale DASS-42 Reference - Bento Solid Dark Layout Cell */}
              <section className="lg:col-span-5 bg-slate-900 rounded-2xl shadow-xl p-6 text-white overflow-hidden relative border border-slate-800 flex flex-col justify-between">
                <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-indigo-500 opacity-20 rounded-full blur-2xl"></div>
                <div className="mb-4 z-10">
                  <h2 className="text-sm font-black text-indigo-300 uppercase tracking-widest mb-4 border-b border-slate-800 pb-3">Interpretasi DASS</h2>
                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between items-center py-1 border-b border-slate-800/80">
                      <span className="text-slate-300 font-medium">Normal</span>
                      <span className="font-mono text-emerald-400 font-bold bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-900/45">0 - 14</span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-slate-800/80">
                      <span className="text-slate-300 font-medium">Ringan</span>
                      <span className="font-mono text-amber-300 font-bold bg-amber-950/40 px-2 py-0.5 rounded border border-amber-900/45">15 - 18</span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-slate-800/80">
                      <span className="text-orange-400 font-bold">Sedang</span>
                      <span className="font-mono text-orange-400 font-bold bg-orange-950/40 px-2 py-0.5 rounded border border-orange-900/45">19 - 25</span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-slate-800/80">
                      <span className="text-slate-300 font-medium">Berat</span>
                      <span className="font-mono text-rose-400 font-bold bg-rose-950/40 px-2 py-0.5 rounded border border-rose-900/45">26 - 33</span>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span className="text-slate-300 font-medium">Sangat Berat</span>
                      <span className="font-mono text-purple-400 font-bold bg-purple-950/40 px-2 py-0.5 rounded border border-purple-900/45">≥ 34</span>
                    </div>
                  </div>
                </div>

                <div className="z-10 bg-slate-800/80 p-4 rounded-xl border border-slate-700/60 mt-4">
                  <p className="text-[10px] uppercase text-indigo-300 font-bold mb-1.5 tracking-wider">Metadata Evaluasi</p>
                  <div className="space-y-1 text-xs text-slate-300">
                    <p><span className="text-slate-500 font-medium">Partisipan:</span> <strong className="text-slate-100">{namaResponden} ({umur} th - {gender})</strong></p>
                    <p><span className="text-slate-500 font-medium">Metode:</span> <span className="text-slate-200">Mandiri (DASS-42)</span></p>
                    <p><span className="text-slate-500 font-medium">Tanggal Tes:</span> <span className="text-slate-200 font-mono">{tanggal}</span></p>
                  </div>
                </div>
              </section>

              {/* Visual Bar chart using Recharts */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-7">
                <div className="mb-4 flex items-center space-x-2 text-slate-900 border-b border-slate-100 pb-3">
                  <TrendingUp className="h-5 w-5 text-indigo-600" />
                  <h3 className="font-extrabold text-sm uppercase tracking-wider">Visualisasi Skor Dimensi</h3>
                </div>

                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartData}
                      layout="vertical"
                      margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} stroke="#f1f5f9" />
                      <XAxis type="number" domain={[0, 42]} tickLine={false} axisLine={false} style={{ fontSize: '11px', fontFamily: 'monospace' }} />
                      <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} style={{ fontSize: '11px', fontWeight: 'bold' }} />
                      <Tooltip 
                        formatter={(value, name, props: any) => [`${value} poin (${props?.payload?.Kategori})`, 'Skor']}
                        contentStyle={{ borderRadius: '12px', borderColor: '#e2e8f0', fontFamily: 'sans-serif', fontSize: '12px' }}
                      />
                      <Bar dataKey="Skor" radius={[0, 8, 8, 0]} barSize={25}>
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="mt-2 text-[10px] text-slate-400 font-semibold font-mono text-right italic uppercase">
                  *Ambang batas dihitung proporsional Lovibond scales
                </div>
              </div>

            </div>

            {/* Recommendations & Interpretation Card Panel */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center space-x-2 text-slate-900 border-b border-slate-100 pb-3">
                <HelpCircle className="h-5 w-5 text-indigo-600" />
                <h3 className="font-extrabold text-sm uppercase tracking-wider">Interpretasi Klinis & Tindakan Rekomendasi</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Depresi recommendation block */}
                <div className="p-4 bg-indigo-50/30 rounded-xl border border-indigo-100 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-indigo-100 text-indigo-800 text-[10px] font-black font-mono">D</span>
                      <h4 className="text-xs font-black text-indigo-900 uppercase tracking-wide">Dimensi Depresi</h4>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed font-medium">
                      {`Tingkat Depresi: ${getDepresiCategory(dScore)}.`}
                      {['Berat', 'Sangat Berat'].includes(getDepresiCategory(dScore)) && 
                        ' Disarankan untuk melakukan konsultasi dengan profesional psikolog atau psikiater.'}
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-indigo-100/60 text-[11px] font-bold text-indigo-700">
                    Skor: {dScore} ({getDepresiCategory(dScore)})
                  </div>
                </div>

                {/* Kecemasan recommendation block */}
                <div className="p-4 bg-emerald-50/30 rounded-xl border border-emerald-100 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-emerald-100 text-emerald-800 text-[10px] font-black font-mono">A</span>
                      <h4 className="text-xs font-black text-emerald-900 uppercase tracking-wide">Dimensi Kecemasan</h4>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed font-medium">
                      {`Tingkat Kecemasan: ${getKecemasanCategory(aScore)}.`}
                      {['Berat', 'Sangat Berat'].includes(getKecemasanCategory(aScore)) && 
                        ' Disarankan untuk melakukan konsultasi dengan profesional psikolog atau psikiater.'}
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-emerald-100/60 text-[11px] font-bold text-emerald-700">
                    Skor: {aScore} ({getKecemasanCategory(aScore)})
                  </div>
                </div>

                {/* Stres recommendation block */}
                <div className="p-4 bg-amber-50/30 rounded-xl border border-amber-100 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-amber-100 text-amber-800 text-[10px] font-black font-mono">S</span>
                      <h4 className="text-xs font-black text-amber-900 uppercase tracking-wide">Dimensi Stres</h4>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed font-medium">
                      {`Tingkat Stres: ${getStresCategory(sScore)}.`}
                      {['Berat', 'Sangat Berat'].includes(getStresCategory(sScore)) && 
                        ' Disarankan untuk melakukan konsultasi dengan profesional psikolog atau psikiater.'}
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-amber-100/60 text-[11px] font-bold text-amber-850">
                    Skor: {sScore} ({getStresCategory(sScore)})
                  </div>
                </div>

              </div>
            </div>

            {/* Comprehensive bottom list: Itemized 42 DASS responses log */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center space-x-2.5 text-slate-900 border-b border-slate-100 pb-3">
                <ClipboardCheck className="h-5 w-5 text-indigo-600" />
                <h3 className="font-extrabold text-sm uppercase tracking-wider">Log Transkrip Butir Pernyataan Jawaban</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3.5">
                {DASS_QUESTIONS.map((q) => {
                  const score = jawaban[q.id] ?? 0;
                  return (
                    <div key={q.id} className="flex items-center justify-between py-2.5 border-b border-slate-100 last:border-0 hover:bg-slate-50/50 px-2 rounded-lg transition-all">
                      <div className="flex items-start space-x-3.5 max-w-[85%]">
                        <span className="flex h-5.5 w-5.5 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[10px] font-black text-white font-mono shadow-xs">
                          {q.id}
                        </span>
                        <div className="space-y-0.5">
                          <p className="text-xs text-slate-700 pr-1 truncate md:max-w-md font-medium" title={q.text}>{q.text}</p>
                          <span className="inline-flex text-[9px] font-black text-slate-400 font-mono uppercase tracking-wider">{q.category}</span>
                        </div>
                      </div>
                      <span className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded bg-indigo-50 border border-indigo-100 text-[11px] font-black font-mono text-indigo-700 shadow-sm`}>
                        {score}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        )}
        
      </main>

      {/* Footer and Disclaimer complying with layout */}
      <footer className="mt-12 border-t border-slate-200 bg-white py-10 px-6 text-center">
        <p className="text-xs text-slate-500 leading-relaxed font-bold uppercase tracking-widest">
          Sistem Monitoring Kesehatan Mental Digital DASS-42 &copy; 2026
        </p>
        <p className="text-[10px] text-slate-400 leading-relaxed mt-2.5 max-w-3xl mx-auto italic">
          Disclaimer: Survei ini dikembangkan purely sebagai alat penunjang asistensi pendeteksi gejala awal kesehatan mental. Hasil yang keluar bukan pengganti diagnosa medis klinis profesional kesehatan jiwa raga.
        </p>
      </footer>

    </div>
  );
}
