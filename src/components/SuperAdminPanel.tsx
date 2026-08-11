import React, { useState, useEffect } from 'react';
import { CoupleProfile } from '../types';
import { 
  firebaseConfig, testFirebaseConnection, auth, getAllCouplesFromFirestore, deleteCoupleFromFirestore, loginOrRegisterWithEmail, subscribeToAuthChanges, signOut 
} from '../lib/firebase';
import { 
  ShieldCheck, Database, RefreshCw, Terminal, CheckCircle2, 
  XCircle, Trash2, ExternalLink, Heart, Users, Gift, Eye, EyeOff, Server, Sparkles, Loader2, Lock, Mail 
} from 'lucide-react';

interface SuperAdminPanelProps {
  onSelectCoupleForAdmin?: (coupleId: string) => void;
  onNavigate: (route: any) => void;
}

export const SuperAdminPanel: React.FC<SuperAdminPanelProps> = ({
  onSelectCoupleForAdmin,
  onNavigate
}) => {
  // Super Admin Authentication Guard
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    try {
      if (sessionStorage.getItem('cha_superadmin_authenticated') === 'true') return true;
      if (auth.currentUser && !auth.currentUser.isAnonymous && auth.currentUser.email?.toLowerCase() === 'euques@gmail.com') return true;
    } catch {
      return false;
    }
    return false;
  });

  const [superAdminEmail, setSuperAdminEmail] = useState('euques@gmail.com');
  const [superAdminPassword, setSuperAdminPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  const [loadingAuth, setLoadingAuth] = useState(false);

  // Auto-listen to auth changes for Super Admin
  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges((user) => {
      if (user && !user.isAnonymous && user.email?.toLowerCase() === 'euques@gmail.com') {
        setIsAuthenticated(true);
        sessionStorage.setItem('cha_superadmin_authenticated', 'true');
      }
    });
    return () => unsubscribe();
  }, []);

  const handleSuperAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!superAdminPassword.trim() || superAdminPassword.length < 6) {
      setAuthError('Informe sua senha administrativa (mínimo 6 caracteres).');
      return;
    }
    setAuthError('');
    setLoadingAuth(true);

    try {
      await loginOrRegisterWithEmail('Super Admin', 'euques@gmail.com', superAdminPassword.trim());
      sessionStorage.setItem('cha_superadmin_authenticated', 'true');
      setIsAuthenticated(true);
    } catch (err: any) {
      console.error('Super Admin Auth error:', err);
      setAuthError(err.message || 'Senha incorreta para o Super Admin.');
    } finally {
      setLoadingAuth(false);
    }
  };

  const handleSuperAdminLogout = async () => {
    try {
      sessionStorage.removeItem('cha_superadmin_authenticated');
      setIsAuthenticated(false);
      await signOut(auth);
    } catch (e) {
      console.error(e);
      setIsAuthenticated(false);
    }
  };

  const [couples, setCouples] = useState<CoupleProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connStatus, setConnStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [connMessage, setConnMessage] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Fetch all registered couples from Firestore
  const fetchCouples = async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const list = await getAllCouplesFromFirestore();
      setCouples(list);
    } catch (e: any) {
      console.error('Erro ao buscar casais no Super Admin:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchCouples();
    }
  }, [isAuthenticated]);

  // Run Technical Connection Test
  const handleTestConnection = async () => {
    setTestingConnection(true);
    setConnStatus('idle');
    setConnMessage('');
    try {
      const isOk = await testFirebaseConnection();
      if (isOk) {
        setConnStatus('success');
        setConnMessage('Conexão ao Firestore verificada com sucesso! Leitura e gravação operacionais.');
      } else {
        setConnStatus('error');
        setConnMessage('Não foi possível conectar ao Firestore.');
      }
    } catch (err: any) {
      setConnStatus('error');
      setConnMessage(err.message || 'Erro ao testar Firebase.');
    } finally {
      setTestingConnection(false);
    }
  };

  // Delete Couple from Database
  const handleDeleteCouple = async (coupleId: string, brideName: string, groomName: string) => {
    if (!window.confirm(`Tem certeza que deseja excluir permanentemente o cadastro de ${brideName} & ${groomName} do banco de dados?`)) {
      return;
    }
    setDeletingId(coupleId);
    try {
      await deleteCoupleFromFirestore(coupleId);
      await fetchCouples();
    } catch (e: any) {
      alert('Erro ao excluir casal: ' + (e.message || e));
    } finally {
      setDeletingId(null);
    }
  };

  // Global calculations
  const totalGifts = couples.reduce((acc, c) => acc + (c.gifts?.length || 0), 0);
  const totalClaimedGifts = couples.reduce((acc, c) => acc + (c.gifts?.filter(g => g.isClaimed).length || 0), 0);
  const totalGuests = couples.reduce((acc, c) => acc + (c.guests?.length || 0), 0);

  useEffect(() => {
    if (!isAuthenticated) {
      onNavigate('home');
    }
  }, [isAuthenticated, onNavigate]);

  // Lock Screen if not authenticated as Super Admin
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 py-4 px-2 sm:px-4 animate-fade-in">
      
      {/* SUPER ADMIN HEADER */}
      <div className="bg-[#2D2D2D] text-white p-6 sm:p-8 rounded-[2.5rem] shadow-xl border border-[#C5A059]/40 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-[#C5A059] text-white flex items-center justify-center shadow-md">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-widest font-extrabold text-[#C5A059] bg-white/10 px-3 py-0.5 rounded-full border border-white/10">
                Acesso Técnico Restrito
              </span>
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white mt-1">
                Super Admin Dashboard
              </h1>
              <p className="text-xs text-white/70 font-sans">
                Conta de infraestrutura: <span className="text-amber-400 font-bold">euques@gmail.com</span>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={fetchCouples}
              disabled={loading}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl transition flex items-center space-x-2 cursor-pointer border border-white/10 min-h-[44px]"
            >
              <RefreshCw className={`w-4 h-4 text-[#C5A059] ${loading ? 'animate-spin' : ''}`} />
              <span>Atualizar</span>
            </button>

            <button
              onClick={handleSuperAdminLogout}
              className="px-4 py-2.5 bg-rose-950/80 hover:bg-rose-900 text-rose-200 text-xs font-bold uppercase tracking-wider rounded-xl transition flex items-center space-x-1.5 cursor-pointer border border-rose-800/50 min-h-[44px]"
            >
              <Lock className="w-4 h-4" />
              <span>Sair</span>
            </button>
          </div>
        </div>

        {/* Diagnostic Banner */}
        <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2 text-xs text-white/80">
            <Server className="w-4 h-4 text-emerald-400" />
            <span>Banco de Dados: Firestore <strong className="text-white">(default)</strong></span>
          </div>

          <button
            onClick={handleTestConnection}
            disabled={testingConnection}
            className="px-4 py-2 bg-[#C5A059] hover:bg-[#B38F48] text-white text-xs font-bold rounded-xl transition flex items-center space-x-2 cursor-pointer shadow-md min-h-[40px]"
          >
            {testingConnection ? (
              <Loader2 className="w-4 h-4 animate-spin text-white" />
            ) : (
              <Terminal className="w-4 h-4 text-white" />
            )}
            <span>Testar Conexão e Gravação</span>
          </button>
        </div>

        {connStatus !== 'idle' && (
          <div className={`p-3.5 rounded-2xl text-xs font-semibold flex items-center space-x-2 ${
            connStatus === 'success' ? 'bg-emerald-950/90 text-emerald-200 border border-emerald-800' : 'bg-rose-950/90 text-rose-200 border border-rose-800'
          }`}>
            {connStatus === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" /> : <XCircle className="w-4 h-4 shrink-0 text-rose-400" />}
            <span>{connMessage}</span>
          </div>
        )}
      </div>

      {/* METRICS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-[#E5DFD5] shadow-xs flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-[#F2ECE4] text-[#C5A059] flex items-center justify-center font-black text-xl border border-[#E5DFD5]">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#2D2D2D]/60">Total de Casais</p>
            <h3 className="text-2xl font-black text-[#2D2D2D]">{couples.length}</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-[#E5DFD5] shadow-xs flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-[#F2ECE4] text-[#C5A059] flex items-center justify-center font-black text-xl border border-[#E5DFD5]">
            <Gift className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#2D2D2D]/60">Presentes / Escolhidos</p>
            <h3 className="text-2xl font-black text-[#2D2D2D]">{totalClaimedGifts} <span className="text-xs font-medium text-[#2D2D2D]/50">/ {totalGifts}</span></h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-[#E5DFD5] shadow-xs flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-[#F2ECE4] text-[#C5A059] flex items-center justify-center font-black text-xl border border-[#E5DFD5]">
            <Heart className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#2D2D2D]/60">Convidados Cadastrados</p>
            <h3 className="text-2xl font-black text-[#2D2D2D]">{totalGuests}</h3>
          </div>
        </div>
      </div>

      {/* REGISTERED COUPLES TABLE / CARDS */}
      <div className="bg-white p-6 rounded-[2rem] border border-[#E5DFD5] shadow-xs space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-[#E5DFD5]">
          <div>
            <h2 className="text-lg font-bold text-[#2D2D2D]">Casais Cadastrados no Banco de Dados</h2>
            <p className="text-xs text-[#2D2D2D]/60">Gerenciamento global dos Chás de Panela gravados no Firestore</p>
          </div>
          <span className="text-xs font-black bg-[#F2ECE4] text-[#C5A059] px-3 py-1 rounded-full border border-[#E5DFD5]">
            {couples.length} Casais
          </span>
        </div>

        {loading ? (
          <div className="py-12 text-center space-y-3">
            <Loader2 className="w-8 h-8 text-[#C5A059] animate-spin mx-auto" />
            <p className="text-xs text-[#2D2D2D]/60 font-medium">Carregando casais do Firestore...</p>
          </div>
        ) : couples.length === 0 ? (
          <div className="py-12 text-center bg-[#FAF9F6] rounded-2xl border border-dashed border-[#E5DFD5] space-y-2">
            <Heart className="w-8 h-8 text-[#2D2D2D]/30 mx-auto" />
            <p className="text-sm font-bold text-[#2D2D2D]">Nenhum casal cadastrado ainda.</p>
            <p className="text-xs text-[#2D2D2D]/60">Novos casais aparecerão aqui assim que se registrarem.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {couples.map((c) => {
              const coupleName = `${c.eventInfo?.brideName || 'Noiva'} & ${c.eventInfo?.groomName || 'Noivo'}`;
              const coupleGifts = c.gifts || [];
              const coupleGuests = c.guests || [];
              const claimedCount = coupleGifts.filter(g => g.isClaimed).length;

              return (
                <div key={c.id} className="p-5 bg-[#FAF9F6] hover:bg-[#F2ECE4]/60 rounded-2xl border border-[#E5DFD5] transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-extrabold text-base text-[#2D2D2D]">{coupleName}</span>
                      <span className="text-[10px] bg-white px-2.5 py-0.5 rounded-md font-mono text-[#2D2D2D]/60 border border-[#E5DFD5]">
                        UID: {c.id.substring(0, 10)}...
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-[#2D2D2D]/70 font-medium">
                      <span>📅 {c.eventInfo?.date || 'Sem data'}</span>
                      <span>📍 {c.eventInfo?.location || 'Sem local'}</span>
                      <span>🎁 {claimedCount}/{coupleGifts.length} Presentes</span>
                      <span>👥 {coupleGuests.length} Convidados</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 w-full sm:w-auto shrink-0 pt-2 sm:pt-0">
                    {onSelectCoupleForAdmin && (
                      <button
                        onClick={() => {
                          onSelectCoupleForAdmin(c.id);
                          onNavigate('noiva');
                        }}
                        className="flex-1 sm:flex-initial px-3.5 py-2 bg-white hover:bg-[#FAF9F6] text-[#2D2D2D] text-xs font-bold rounded-xl border border-[#E5DFD5] shadow-2xs transition flex items-center justify-center space-x-1.5 cursor-pointer min-h-[40px]"
                      >
                        <Eye className="w-3.5 h-3.5 text-[#C5A059]" />
                        <span>Abrir Painel</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleDeleteCouple(c.id, c.eventInfo?.brideName || 'Noiva', c.eventInfo?.groomName || 'Noivo')}
                      disabled={deletingId === c.id}
                      className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl border border-rose-200 transition flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50 min-h-[40px]"
                    >
                      {deletingId === c.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                      <span>Excluir</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};
