import React, { useState, useEffect, useRef } from 'react';
import { db } from './firebase';
import { collection, getDocs, serverTimestamp, query, where, doc, getDoc, runTransaction, setDoc, writeBatch } from 'firebase/firestore';
import { ALUNOS_2026 } from './alunos';
import logo from './logo-marista.png';
import { CheckCircle, AlertTriangle, LogIn, Send, Info, XCircle, Clock, Timer } from 'lucide-react';

const App = () => {
  // --- ESTADOS ---
  const [screen, setScreen] = useState('login');
  const [matriculaLogin, setMatriculaLogin] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginProcessing, setLoginProcessing] = useState(false);
  const [welcomeName, setWelcomeName] = useState('');
  const [nomeCompleto, setNomeCompleto] = useState('');
  const [turma, setTurma] = useState('');
  const [userSerie, setUserSerie] = useState(null);
  const [matriculaValidada, setMatriculaValidada] = useState('');
  const [disciplina, setDisciplina] = useState('');
  const [disciplinaTerca, setDisciplinaTerca] = useState('');
  const [disciplinaQuinta, setDisciplinaQuinta] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [erro, setErro] = useState(false);
  const [processando, setProcessando] = useState(false);
  const [contagemVagas, setContagemVagas] = useState({});
  const [carregandoVagas, setCarregandoVagas] = useState(true);
  
  // Estados para armazenar os nomes amigáveis para a tela de sucesso
  const [chosenDiscName, setChosenDiscName] = useState('');
  const [chosenTercaName, setChosenTercaName] = useState('');
  const [chosenQuintaName, setChosenQuintaName] = useState('');
  const [detectedSerie, setDetectedSerie] = useState(null);
  const [timeLeft, setTimeLeft] = useState({ d: 0, h: 0, m: 0, s: 0, isOpen: false });
  const botaoRef = useRef(null);
  const isTerceiraSerie = turma.startsWith('3');

  useEffect(() => {
  if (matriculaLogin.length >= 6) {
    const aluno = ALUNOS_2026.find(a => a.matricula.toString() === matriculaLogin);
    if (aluno) setDetectedSerie(aluno.serie.toString());
    else setDetectedSerie(null);
  } else {
    setDetectedSerie(null);
  }
}, [matriculaLogin]);

  // --- CONFIGURAÇÕES ---
  const LIMITES_POR_SERIE = { '1': 35, '2': 25, '3': 41 };

  const disciplinasPorTurma = {
    '1AM': [ { id: 'Matemática Financeira_1EM', nome: 'Matemática Financeira' }, { id: 'Ciências da Natureza_1EM', nome: 'Ciências da Natureza' }, { id: 'Ciências Humanas_1EM', nome: 'Ciências Humanas' }, { id: 'Personal Development and Life Skills English Program_1EM', nome: 'Inglês: Personal Development' } ],
    '1BM': [ { id: 'Matemática Financeira_1EM', nome: 'Matemática Financeira' }, { id: 'Ciências da Natureza_1EM', nome: 'Ciências da Natureza' }, { id: 'Ciências Humanas_1EM', nome: 'Ciências Humanas' }, { id: 'Personal Development and Life Skills English Program_1EM', nome: 'Inglês: Personal Development' } ],
    '1CM': [ { id: 'Matemática Financeira_1EM', nome: 'Matemática Financeira' }, { id: 'Ciências da Natureza_1EM', nome: 'Ciências da Natureza' }, { id: 'Ciências Humanas_1EM', nome: 'Ciências Humanas' }, { id: 'Personal Development and Life Skills English Program_1EM', nome: 'Inglês: Personal Development' } ],
    '1DM': [ { id: 'Matemática Financeira_1EM', nome: 'Matemática Financeira' }, { id: 'Ciências da Natureza_1EM', nome: 'Ciências da Natureza' }, { id: 'Ciências Humanas_1EM', nome: 'Ciências Humanas' }, { id: 'Personal Development and Life Skills English Program_1EM', nome: 'Inglês: Personal Development' } ],
    '2AM': [ { id: 'Aprendizagem interativa STEAM : Criação, desenvolvimento e automação', nome: 'STEAM: Aprendizagem Interativa' }, { id: 'Ciências Humanas_2EM', nome: 'Ciências Humanas' }, { id: 'Ciências da Natureza_2EM', nome: 'Ciências da Natureza' }, { id: 'Personal Development and Life Skills English Program_2EM', nome: 'Inglês: Personal Development' } ],
    '2BM': [ { id: 'Aprendizagem interativa STEAM : Criação, desenvolvimento e automação', nome: 'STEAM: Aprendizagem Interativa' }, { id: 'Ciências Humanas_2EM', nome: 'Ciências Humanas' }, { id: 'Ciências da Natureza_2EM', nome: 'Ciências da Natureza' }, { id: 'Personal Development and Life Skills English Program_2EM', nome: 'Inglês: Personal Development' } ],
    '2CM': [ { id: 'Aprendizagem interativa STEAM : Criação, desenvolvimento e automação', nome: 'STEAM: Aprendizagem Interativa' }, { id: 'Ciências Humanas_2EM', nome: 'Ciências Humanas' }, { id: 'Ciências da Natureza_2EM', nome: 'Ciências da Natureza' }, { id: 'Personal Development and Life Skills English Program_2EM', nome: 'Inglês: Personal Development' } ],
    '3AM': { terca: [{ id: 'Ciências da Natureza_TER_3EM', nome: 'Ciências da Natureza' }, { id: 'Ciências Humanas_TER_3EM', nome: 'Ciências Humanas' }], quinta: [{ id: 'Matemática_QUI_3EM', nome: 'Matemática' }, { id: 'Linguagens_QUI_3EM', nome: 'Linguagens' }] },
    '3BM': { terca: [{ id: 'Ciências da Natureza_TER_3EM', nome: 'Ciências da Natureza' }, { id: 'Ciências Humanas_TER_3EM', nome: 'Ciências Humanas' }], quinta: [{ id: 'Matemática_QUI_3EM', nome: 'Matemática' }, { id: 'Linguagens_QUI_3EM', nome: 'Linguagens' }] },
  };
/*
  const OPENING_CONFIG = {
  '3': "2026-01-29T20:00:00-03:00",
  '1': "2026-02-03T20:00:00-03:00",
  '2': "2026-02-03T20:00:00-03:00"
};
*/

  const OPENING_CONFIG = {
  '3': "2026-01-27T15:20:00-03:00",
  '1': "2026-02-27T15:20:00-03:00",
  '2': "2026-02-27T15:20:00-03:00"
};
  const getLimiteAtual = () => LIMITES_POR_SERIE[userSerie] || 35;

  // --- LÓGICA ---
const handleLogin = async (e) => {
    e.preventDefault();
    if (matriculaLogin === '0000') return setScreen('setup');
    
    // ✅ TRAVA DE SEGURANÇA: Impede o login se o cronômetro ainda não zerou
    if (!timeLeft.isOpen) {
      setLoginError('O portal ainda não está aberto para a sua série.');
      return;
    }
    
    setLoginProcessing(true);
    setLoginError('');
    try {
      const q = query(collection(db, 'inscricoes'), where('matricula', '==', matriculaLogin));
      const snap = await getDocs(q);
      if (!snap.empty) throw new Error('Inscrição já realizada para esta matrícula.');

      const docSnap = await getDoc(doc(db, "matriculasValidas", matriculaLogin));
      if (docSnap.exists()) {
        const studentData = docSnap.data();
        setWelcomeName(studentData.nome);
        setMatriculaValidada(matriculaLogin);
        setUserSerie(studentData.serie.toString());
        setScreen('form');
      } else throw new Error('Matrícula não encontrada no sistema.');
    } catch (err) { setLoginError(err.message); } 
    finally { setLoginProcessing(false); }
  };



  useEffect(() => {
    if (screen === 'form') {
      getDoc(doc(db, 'estatisticas', 'vagas')).then(s => {
        if (s.exists()) setContagemVagas(s.data());
        setCarregandoVagas(false);
      });
    }
  }, [screen]);

  useEffect(() => {
    const selecionou = (!isTerceiraSerie && disciplina) || (isTerceiraSerie && (disciplinaTerca || disciplinaQuinta));
    if (selecionou) {
      setTimeout(() => botaoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
    }
  }, [disciplina, disciplinaTerca, disciplinaQuinta, isTerceiraSerie]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // ✅ CHECAGEM DE SEGURANÇA FINAL: Verifica se o horário de abertura já passou
    const agora = new Date().getTime();
    const abertura = new Date(OPENING_CONFIG[userSerie]).getTime();
    if (agora < abertura) {
      setErro(true);
      setMensagem('O formulário ainda não está aceitando envios.');
      return;
    }

    if (processando) return;
    setProcessando(true);
    setErro(false);
    const limite = getLimiteAtual();

    const normalizar = (str) => str.normalize("NFD").replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
    if (normalizar(nomeCompleto) !== normalizar(welcomeName)) {
      setErro(true);
      setMensagem('O nome não coincide com o cadastro. Verifique a grafia.');
      setProcessando(false);
      return;
    }

    try {
      await runTransaction(db, async (transaction) => {
        const vRef = doc(db, 'estatisticas', 'vagas');
        const vDoc = await transaction.get(vRef);
        const vData = vDoc.data();

        let dados = { nome: nomeCompleto, turma, matricula: matriculaValidada, timestamp: serverTimestamp() };
        let updates = {};

        if (isTerceiraSerie) {
          if (vData[disciplinaTerca] >= limite || vData[disciplinaQuinta] >= limite) throw new Error("Vagas esgotadas.");
          
          const nomeT = disciplinasPorTurma[turma].terca.find(d => d.id === disciplinaTerca).nome;
          const nomeQ = disciplinasPorTurma[turma].quinta.find(d => d.id === disciplinaQuinta).nome;
          
          updates[disciplinaTerca] = (vData[disciplinaTerca] || 0) + 1;
          updates[disciplinaQuinta] = (vData[disciplinaQuinta] || 0) + 1;
          dados.terca = nomeT;
          dados.quinta = nomeQ;
          
          setChosenTercaName(nomeT);
          setChosenQuintaName(nomeQ);
        } else {
          if (vData[disciplina] >= limite) throw new Error("Vagas esgotadas.");
          
          const nomeD = disciplinasPorTurma[turma].find(d => d.id === disciplina).nome;
          
          updates[disciplina] = (vData[disciplina] || 0) + 1;
          dados.disciplina = nomeD;
          setChosenDiscName(nomeD);
        }

        transaction.update(vRef, updates);
        transaction.set(doc(collection(db, 'inscricoes')), dados);
      });
      
      setScreen('success'); // ✅ Muda para a página de sucesso
    } catch (e) { 
      setErro(true); 
      setMensagem(e.message); 
    } finally { 
      setProcessando(false); 
    }
  };

  function renderOption(disc) {
    const ocupadas = contagemVagas[disc.id] || 0;
    const lim = getLimiteAtual();
    const full = ocupadas >= lim;
    return <option key={disc.id} value={disc.id} disabled={full}>{disc.nome} {full ? '(Esgotado)' : `- ${lim - ocupadas} vagas restantes`}</option>;
  }

  const getTurmasFiltradas = () => {
    return Object.keys(disciplinasPorTurma).filter(t => t.startsWith(userSerie));
  };


useEffect(() => {
  // Define qual data de abertura usar (baseado na série detectada ou padrão da 3ª)
  const targetSerie = detectedSerie || '3';
  const targetDate = new Date(OPENING_CONFIG[targetSerie]).getTime();

  const timer = setInterval(() => {
    const now = new Date().getTime();
    const distance = targetDate - now;

    if (distance <= 0) {
      setTimeLeft(prev => ({ ...prev, isOpen: true }));
    } else {
      setTimeLeft({
        d: Math.floor(distance / (1000 * 60 * 60 * 24)),
        h: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        m: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
        s: Math.floor((distance % (1000 * 60)) / 1000),
        isOpen: false
      });
    }
  }, 1000);
  return () => clearInterval(timer);
}, [detectedSerie]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-center">
      <div className="flex-grow flex flex-col items-center justify-center p-4 md:p-8">
        
        {screen === 'login' ? (
          <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-5 gap-8 items-center text-center">
            {/* Coluna de Instruções */}
            <div className="md:col-span-3 bg-white shadow-2xl rounded-3xl p-8 md:p-12 border border-slate-100 flex flex-col items-center">
              <img src={logo} alt="Logo" className="mb-8 w-48 mx-auto" />
              <h1 className="text-3xl font-extrabold text-slate-800 mb-2">Inscrição Formação Optativa</h1>
              <p className="text-blue-600 font-semibold mb-8">Ensino Médio • Ciclo 2026 / 1</p>
              
              <div className="bg-blue-50 border-l-4 border-blue-500 p-6 mb-8 rounded-r-xl w-full flex flex-col items-center">
                <div className="flex items-center justify-center gap-2 text-blue-800 font-bold mb-4">
                  <Info size={20} />
                  <span>Leia com atenção</span>
                </div>
                <div className="text-sm text-blue-900 space-y-3 leading-relaxed text-center">
                  <p>Seja bem-vindo ao portal de escolha das Disciplinas Optativas para 2026.</p>
                  <p><strong>Regras Gerais:</strong></p>
                  <ul className="list-none space-y-2">
                    <li>• Indique sua matrícula para validar o acesso.</li>
                    <li>• As vagas são limitadas por série.</li>
                    <li>• A escolha é <strong>definitiva</strong> após o envio.</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Coluna de Login */}
            <div className="md:col-span-2 flex flex-col justify-center">
              <div className="bg-white shadow-2xl rounded-3xl p-8 border border-slate-100">
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Acesso</h2>
                <p className="text-slate-500 mb-8">Digite sua matrícula para iniciar.</p>
                <form onSubmit={handleLogin} className="space-y-6 w-full flex flex-col items-center">
                  <div className="w-full">
                    <label className="block text-sm font-bold text-slate-700 mb-2">Número de Matrícula</label>
                    <input 
                      type="tel" 
                      value={matriculaLogin} 
                      onChange={e => setMatriculaLogin(e.target.value)}
                      placeholder="Apenas números"
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-lg text-center focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      required 
                    />
                  </div>
                  {!timeLeft.isOpen ? (
  <div className="w-full bg-slate-900 text-white p-6 rounded-2xl flex flex-col items-center gap-2 border border-slate-700 shadow-inner">
    <div className="flex items-center justify-center gap-2 font-bold text-xs text-blue-400 uppercase tracking-widest">
      <Clock size={16} className="animate-pulse" />
      Acesso liberado em:
    </div>
    <div className="text-2xl font-black font-mono">
      {timeLeft.d}d {timeLeft.h}h {timeLeft.m}m {timeLeft.s}s
    </div>
    {detectedSerie && (
      <p className="text-[10px] text-slate-400 mt-1 font-bold uppercase tracking-widest border-t border-slate-700 pt-2 w-full">
        Cronograma para {detectedSerie}ª Série
      </p>
    )}
  </div>
) : (
  <button 
    disabled={loginProcessing} 
    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl shadow-lg flex items-center justify-center gap-2 transition-all disabled:bg-slate-300"
  >
    <LogIn size={20} />
    {loginProcessing ? 'Validando...' : 'Entrar no Formulário'}
  </button>
)}
                  {loginError && (
                    <div className="flex items-center justify-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-xl w-full">
                      <AlertTriangle size={16} />
                      <span>{loginError}</span>
                    </div>
                  )}
                </form>
              </div>
            </div>
          </div>
        ) : screen === 'setup' ? (
            <SetupPage db={db} alunos={ALUNOS_2026} setScreen={setScreen} />
        ) : screen === 'success' ? (
          /* ✅ NOVA PÁGINA DE SUCESSO */
          <div className="w-full max-w-2xl animate-in fade-in zoom-in duration-500">
            <header className="flex flex-col items-center mb-8">
              <img src={logo} alt="Logo" className="w-40 mb-4 mx-auto" />
            </header>
            <main className="bg-white shadow-2xl rounded-3xl p-8 md:p-12 border border-slate-100 flex flex-col items-center">
              <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
                <CheckCircle size={48} />
              </div>
              <h2 className="text-3xl font-black text-slate-800 mb-2">Inscrição Confirmada!</h2>
              <p className="text-slate-500 mb-8 text-lg">Parabéns, seu lugar está garantido.</p>
              
              <div className="w-full bg-slate-50 rounded-2xl p-6 border border-slate-100 text-center mb-8">
                <p className="text-slate-400 text-xs uppercase font-bold tracking-widest mb-1">Estudante</p>
                <p className="text-xl font-bold text-slate-800 mb-4">{welcomeName}</p>
                
                <div className="h-px bg-slate-200 w-16 mx-auto mb-4"></div>
                
                <p className="text-slate-400 text-xs uppercase font-bold tracking-widest mb-1">Disciplina(s) Escolhida(s)</p>
                {isTerceiraSerie ? (
                  <div className="space-y-2">
                    <p className="text-slate-700"><span className="font-bold text-blue-600">Terça:</span> {chosenTercaName}</p>
                    <p className="text-slate-700"><span className="font-bold text-blue-600">Quinta:</span> {chosenQuintaName}</p>
                  </div>
                ) : (
                  <p className="text-lg font-semibold text-slate-700">{chosenDiscName}</p>
                )}
                <p className="mt-4 text-sm text-slate-500 font-medium">Turma: {turma}</p>
              </div>

              <div className="flex items-center gap-2 text-green-700 bg-green-50 px-4 py-2 rounded-full text-sm font-bold">
                <Info size={16} />
                <span>Você já pode fechar esta página com segurança.</span>
              </div>
              
              <button 
                onClick={() => window.location.reload()} 
                className="mt-8 text-slate-400 hover:text-slate-600 text-sm font-medium transition-colors"
              >
                Voltar ao Início
              </button>
            </main>
          </div>
        ) : (
          /* Tela do Formulário */
          <div className="w-full max-w-3xl">
            <header className="flex flex-col items-center mb-8">
              <img src={logo} alt="Logo" className="w-40 mb-4 mx-auto" />
              <div className="bg-white px-6 py-2 rounded-full shadow-sm border border-slate-100 flex items-center justify-center gap-3">
                <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
                <span className="text-slate-700 font-medium">Logado como: <strong className="text-blue-700">{welcomeName}</strong></span>
              </div>
            </header>

            <main className="bg-white shadow-2xl rounded-3xl p-8 md:p-12 border border-slate-100">
              <form onSubmit={handleSubmit} className="space-y-8 flex flex-col items-center">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                  <div className="flex flex-col items-center">
                    <label className="block text-sm font-bold text-slate-700 mb-2">Matrícula</label>
                    <input type="text" value={matriculaValidada} disabled className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-400 font-mono text-center" />
                  </div>
                  <div className="flex flex-col items-center">
                    <label className="block text-sm font-bold text-slate-700 mb-2">Confirme seu Nome Completo</label>
                    <input 
                      type="text" 
                      value={nomeCompleto} 
                      onChange={e => setNomeCompleto(e.target.value)}
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-center focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="Nome completo"
                      required 
                    />
                  </div>
                </div>

                <div className="w-full flex flex-col items-center">
                  <label className="block text-sm font-bold text-slate-700 mb-2">Sua Turma</label>
                  <select 
                    value={turma} 
                    onChange={e => { setTurma(e.target.value); setDisciplina(''); setDisciplinaTerca(''); setDisciplinaQuinta(''); }}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-center focus:ring-2 focus:ring-blue-500 outline-none appearance-none cursor-pointer"
                    required
                  >
                    <option value="">Selecione sua turma</option>
                    {getTurmasFiltradas().map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                {turma && (
                  <div className="p-6 bg-slate-50 rounded-3xl border border-dashed border-slate-300 w-full flex flex-col items-center">
                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center justify-center gap-2">
                      <Info size={18} className="text-blue-600" />
                      Escolha sua(s) Disciplina(s)
                    </h3>
                    
                    {isTerceiraSerie ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                        <div className="flex flex-col items-center">
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Terça-feira</label>
                          <select value={disciplinaTerca} onChange={e => setDisciplinaTerca(e.target.value)} className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-center focus:ring-2 focus:ring-blue-500 outline-none" required>
                            <option value="">Selecione...</option>
                            {disciplinasPorTurma[turma]?.terca?.map(renderOption)}
                          </select>
                        </div>
                        <div className="flex flex-col items-center">
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-2 text-center">Quinta-feira</label>
                          <select value={disciplinaQuinta} onChange={e => setDisciplinaQuinta(e.target.value)} className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-center focus:ring-2 focus:ring-blue-500 outline-none" required>
                            <option value="">Selecione...</option>
                            {disciplinasPorTurma[turma]?.quinta?.map(renderOption)}
                          </select>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full flex flex-col items-center">
                        <select value={disciplina} onChange={e => setDisciplina(e.target.value)} className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-center focus:ring-2 focus:ring-blue-500 outline-none" required>
                          <option value="">Selecione a disciplina</option>
                          {Array.isArray(disciplinasPorTurma[turma]) && disciplinasPorTurma[turma].map(renderOption)}
                        </select>
                      </div>
                    )}
                  </div>
                )}

<div ref={botaoRef} className="pt-4 w-full flex justify-center">
  <button 
    disabled={processando || !turma}
    className="w-full max-w-sm bg-green-600 hover:bg-green-700 text-white font-black py-5 rounded-2xl shadow-xl flex items-center justify-center gap-3 transition-all active:scale-95 disabled:bg-slate-300"
  >
    <Send size={22} />
    {processando ? 'ENVIANDO...' : 'FINALIZAR MINHA INSCRIÇÃO'}
  </button>
</div>
                
                {mensagem && erro && (
                    <div className="flex items-center justify-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-xl w-full">
                      <AlertTriangle size={16} />
                      <span>{mensagem}</span>
                    </div>
                )}
              </form>
            </main>
          </div>
        )}
      </div>

      <footer>
        Desenvolvido por Prof. Dr. Felipe Damas Melo
      </footer>
    </div>
  );
};

const SetupPage = ({ db, alunos, setScreen }) => {
  const [loading, setLoading] = useState(false);
  const run = async () => {
    if (!window.confirm("ATENÇÃO: Isso resetará TODAS as matrículas e vagas. Continuar?")) return;
    setLoading(false);
    setLoading(true);
    try {
      const batch = writeBatch(db);
      alunos.forEach((a) => {
        const ref = doc(db, "matriculasValidas", a.matricula.toString());
        batch.set(ref, a);
      });
      const vagasRef = doc(db, "estatisticas", "vagas");
      batch.set(vagasRef, {
        "Matemática Financeira_1EM": 0, "Ciências da Natureza_1EM": 0, "Ciências Humanas_1EM": 0, "Personal Development and Life Skills English Program_1EM": 0,
        "Aprendizagem interativa STEAM : Criação, desenvolvimento e automação": 0, "Ciências Humanas_2EM": 0, "Ciências da Natureza_2EM": 0, "Personal Development and Life Skills English Program_2EM": 0,
        "Ciências da Natureza_TER_3EM": 0, "Ciências Humanas_TER_3EM": 0, "Matemática_QUI_3EM": 0, "Linguagens_QUI_3EM": 0
      });
      await batch.commit();
      alert("Sucesso!");
      setScreen('login');
    } catch (e) { alert(e.message); } 
    finally { setLoading(false); }
  };
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white p-6 text-center">
      <div className="max-w-md flex flex-col items-center">
        <h1 className="text-4xl font-black mb-4">Painel de Setup</h1>
        <button onClick={run} disabled={loading} className="w-full bg-red-600 hover:bg-red-700 p-10 rounded-3xl font-black text-2xl shadow-2xl transition-all disabled:opacity-50">
          {loading ? "PROCESSANDO..." : "🚀 EXECUTAR SETUP 2026"}
        </button>
      </div>
    </div>
  );
};

export default App;