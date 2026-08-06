import React, { useState, useEffect, useRef } from 'react';
import { db } from './firebase';
import { collection, getDocs, serverTimestamp, query, where, doc, getDoc, runTransaction, setDoc, writeBatch, deleteField, onSnapshot, increment } from 'firebase/firestore';
import { ALUNOS_2026 } from './alunos';
import logo from './logo-marista.png';
import { CheckCircle, AlertTriangle, LogIn, Send, Info, XCircle, Clock, Timer } from 'lucide-react';
import * as XLSX from 'xlsx';

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
  
  const [queueTicket, setQueueTicket] = useState(null);
  const [queueTimeAllowed, setQueueTimeAllowed] = useState(null);
  const [queueSecondsLeft, setQueueSecondsLeft] = useState(0);
  const [queueRemaining, setQueueRemaining] = useState(0);

  useEffect(() => {
    let unsubCounter = () => {};
    let timer = null;
    let handleVisibility = null;

    if (screen === 'queue' && queueTimeAllowed) {
      const updateTime = () => {
        const remaining = Math.max(0, Math.ceil((queueTimeAllowed - Date.now()) / 1000));
        setQueueSecondsLeft(remaining);
        if (remaining === 0) setScreen('form');
      };
      updateTime();
      timer = setInterval(updateTime, 1000);

      // Fix #12: Re-check timer when tab returns from background (mobile)
      handleVisibility = () => {
        if (document.visibilityState === 'visible') updateTime();
      };
      document.addEventListener('visibilitychange', handleVisibility);

      const serieStr = userSerie?.toString();
      if (serieStr) {
        unsubCounter = onSnapshot(doc(db, 'estatisticas', `fila_counter_${serieStr}`), (s) => {
          if (s.exists()) {
            const serving = s.data().currentServingTicket || 30; // Default 30 inicial
            if (queueTicket <= serving) {
              setScreen('form');
            }
          }
        });
      }
    }

    return () => {
      if (timer) clearInterval(timer);
      if (handleVisibility) document.removeEventListener('visibilitychange', handleVisibility);
      unsubCounter();
    };
  }, [screen, queueTimeAllowed, queueTicket, userSerie]);

  // Estados para armazenar os nomes amigáveis para a tela de sucesso
  const [chosenDiscName, setChosenDiscName] = useState('');
  const [chosenTercaName, setChosenTercaName] = useState('');
  const [chosenQuintaName, setChosenQuintaName] = useState('');
  const [detectedSerie, setDetectedSerie] = useState(null);
  const [historicoChoice, setHistoricoChoice] = useState(null);
  const botaoRef = useRef(null);
  const submittingRef = useRef(false);
  const isTerceiraSerie = turma.startsWith('3');

  useEffect(() => {
    if (matriculaLogin.length >= 6) {
      const aluno = ALUNOS_2026.find(a => a.matricula.toString() === matriculaLogin);
      if (aluno) {
        setDetectedSerie(aluno.serie.toString());
      } else {
        setDetectedSerie(null);
      }
    } else {
      setDetectedSerie(null);
    }
  }, [matriculaLogin]);

  const [configGlobal, setConfigGlobal] = useState(null);
  
  const [times, setTimes] = useState({
    serie3: { d: 0, h: 0, m: 0, s: 0, open: false },
    serie12: { d: 0, h: 0, m: 0, s: 0, open: false }
  });

  useEffect(() => {
    let unsub = () => {};
    if (screen === 'form') {
      unsub = onSnapshot(doc(db, 'estatisticas', 'vagas'), (s) => {
        if (s.exists()) setContagemVagas(s.data());
        setCarregandoVagas(false);
      });
    }
    return () => unsub();
  }, [screen]);

  useEffect(() => {
    const selecionou = (!isTerceiraSerie && disciplina) || (isTerceiraSerie && (disciplinaTerca || disciplinaQuinta));
    if (selecionou) {
      setTimeout(() => botaoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
    }
  }, [disciplina, disciplinaTerca, disciplinaQuinta, isTerceiraSerie]);

  useEffect(() => {
    if (!configGlobal || !configGlobal.OPENING_CONFIG) return;

    const check = () => {
      const agora = new Date().getTime();
      const t3 = new Date(configGlobal.OPENING_CONFIG['3']).getTime();
      const t12 = new Date(configGlobal.OPENING_CONFIG['1']).getTime();

      const calc = (target) => {
        const diff = target - agora;
        if (diff <= 0) return { d: 0, h: 0, m: 0, s: 0, open: true };
        return {
          d: Math.floor(diff / (1000 * 60 * 60 * 24)),
          h: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          m: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
          s: Math.floor((diff % (1000 * 60)) / 1000),
          open: false
        };
      };

      setTimes({ serie3: calc(t3), serie12: calc(t12) });
    };

    check();
    const timer = setInterval(check, 1000);
    return () => clearInterval(timer);
  }, [configGlobal]);

  useEffect(() => {
    const DEFAULT_CONFIG = {
      USERS_PER_MINUTE: 30,
      LIMITES_POR_SERIE: { '1': 35, '2': 25, '3': 41 },
      disciplinasPorTurma: {
        '1AM': [ { id: 'Matemática Financeira_1EM', nome: 'Matemática Financeira' }, { id: 'Ciências da Natureza_1EM', nome: 'Ciências da Natureza' }, { id: 'Ciências Humanas_1EM', nome: 'Ciências Humanas' }, { id: 'Personal Development and Life Skills English Program_1EM', nome: 'Inglês: Personal Development' } ],
        '1BM': [ { id: 'Matemática Financeira_1EM', nome: 'Matemática Financeira' }, { id: 'Ciências da Natureza_1EM', nome: 'Ciências da Natureza' }, { id: 'Ciências Humanas_1EM', nome: 'Ciências Humanas' }, { id: 'Personal Development and Life Skills English Program_1EM', nome: 'Inglês: Personal Development' } ],
        '1CM': [ { id: 'Matemática Financeira_1EM', nome: 'Matemática Financeira' }, { id: 'Ciências da Natureza_1EM', nome: 'Ciências da Natureza' }, { id: 'Ciências Humanas_1EM', nome: 'Ciências Humanas' }, { id: 'Personal Development and Life Skills English Program_1EM', nome: 'Inglês: Personal Development' } ],
        '1DM': [ { id: 'Matemática Financeira_1EM', nome: 'Matemática Financeira' }, { id: 'Ciências da Natureza_1EM', nome: 'Ciências da Natureza' }, { id: 'Ciências Humanas_1EM', nome: 'Ciências Humanas' }, { id: 'Personal Development and Life Skills English Program_1EM', nome: 'Inglês: Personal Development' } ],
        '2AM': [ { id: 'Aprendizagem interativa STEAM : Criação, desenvolvimento e automação', nome: 'STEAM: Aprendizagem Interativa' }, { id: 'Ciências Humanas_2EM', nome: 'Ciências Humanas' }, { id: 'Ciências da Natureza_2EM', nome: 'Ciências da Natureza' }, { id: 'Personal Development and Life Skills English Program_2EM', nome: 'Inglês: Personal Development' } ],
        '2BM': [ { id: 'Aprendizagem interativa STEAM : Criação, desenvolvimento e automação', nome: 'STEAM: Aprendizagem Interativa' }, { id: 'Ciências Humanas_2EM', nome: 'Ciências Humanas' }, { id: 'Ciências da Natureza_2EM', nome: 'Ciências da Natureza' }, { id: 'Personal Development and Life Skills English Program_2EM', nome: 'Inglês: Personal Development' } ],
        '2CM': [ { id: 'Aprendizagem interativa STEAM : Criação, desenvolvimento e automação', nome: 'STEAM: Aprendizagem Interativa' }, { id: 'Ciências Humanas_2EM', nome: 'Ciências Humanas' }, { id: 'Ciências da Natureza_2EM', nome: 'Ciências da Natureza' }, { id: 'Personal Development and Life Skills English Program_2EM', nome: 'Inglês: Personal Development' } ],
        '3AM': { terca: [{ id: 'Ciências da Natureza_TER_3EM', nome: 'Ciências da Natureza' }, { id: 'Ciências Humanas_TER_3EM', nome: 'Ciências Humanas' }], quinta: [{ id: 'Matemática_QUI_3EM', nome: 'Matemática' }, { id: 'Linguagens_QUI_3EM', nome: 'Linguagens' }] },
        '3BM': { terca: [{ id: 'Ciências da Natureza_TER_3EM', nome: 'Ciências da Natureza' }, { id: 'Ciências Humanas_TER_3EM', nome: 'Ciências Humanas' }], quinta: [{ id: 'Matemática_QUI_3EM', nome: 'Matemática' }, { id: 'Linguagens_QUI_3EM', nome: 'Linguagens' }] },
      },
      OPENING_CONFIG: {
        '3': "2026-01-29T20:00:00-03:00",
        '1': "2026-02-03T20:00:00-03:00",
        '2': "2026-08-06T20:00:00-03:00"
      }
    };

    getDoc(doc(db, 'configuracoes', 'geral')).then((docSnap) => {
      if (docSnap.exists()) {
        setConfigGlobal({ ...DEFAULT_CONFIG, ...docSnap.data() });
      } else {
        setConfigGlobal(DEFAULT_CONFIG);
      }
    });
  }, []);

  if (!configGlobal) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center font-sans">
        <div className="animate-spin text-blue-600 mb-4"><Timer size={48} /></div>
        <p className="text-slate-500 font-bold uppercase tracking-widest text-sm">Carregando portal...</p>
      </div>
    );
  }

  // --- CONFIGURAÇÕES ---
  const USERS_PER_MINUTE = configGlobal.USERS_PER_MINUTE || 30; 
  const SECONDS_PER_USER = 60 / USERS_PER_MINUTE; 

  const LIMITES_POR_SERIE = configGlobal.LIMITES_POR_SERIE;
  const disciplinasPorTurma = configGlobal.disciplinasPorTurma;
  const OPENING_CONFIG = configGlobal.OPENING_CONFIG;



  const getLimiteAtual = () => LIMITES_POR_SERIE[userSerie] || 35;


const exportarParaExcel = async () => {
    setLoginProcessing(true);
    setLoginError('Preparando abas e formatando dados...');
    
    try {
      const querySnapshot = await getDocs(collection(db, 'inscricoes'));
      const dadosBrutos = querySnapshot.docs.map(doc => doc.data());

      if (dadosBrutos.length === 0) throw new Error('Nenhuma inscrição encontrada.');

      const workbook = XLSX.utils.book_new();
      const listasPorDisciplina = {};

      // 1. Mapeamento e Transformação (Nomes em MAIÚSCULO)
      dadosBrutos.forEach(item => {
        const criarLinha = (discNome) => ({
          'NOME COMPLETO': item.nome.toUpperCase(), // Força maiúsculas
          'SÉRIE/TURMA': item.turma,
          'MATRÍCULA': item.matricula,
          'DISCIPLINA': discNome.toUpperCase(), // Opcional: disciplina em maiúsculas
          'DATA DA INSCRIÇÃO': item.timestamp?.toDate().toLocaleString('pt-BR') || ''
        });

        if (item.disciplina) {
          if (!listasPorDisciplina[item.disciplina]) listasPorDisciplina[item.disciplina] = [];
          listasPorDisciplina[item.disciplina].push(criarLinha(item.disciplina));
        }
        
        if (item.terca) {
          const nomeTabTerca = `3EM - ${item.terca}`;
          if (!listasPorDisciplina[nomeTabTerca]) listasPorDisciplina[nomeTabTerca] = [];
          listasPorDisciplina[nomeTabTerca].push(criarLinha(item.terca));
        }
        if (item.quinta) {
          const nomeTabQuinta = `3EM - ${item.quinta}`;
          if (!listasPorDisciplina[nomeTabQuinta]) listasPorDisciplina[nomeTabQuinta] = [];
          listasPorDisciplina[nomeTabQuinta].push(criarLinha(item.quinta));
        }
      });

      // 2. Ordenação das Abas (Ordem Alfabética)
      const nomesDasAbas = Object.keys(listasPorDisciplina).sort();

      nomesDasAbas.forEach(nomeAba => {
        // Ordenação dos Alunos dentro da aba (A-Z)
        const listaOrdenada = listasPorDisciplina[nomeAba].sort((a, b) => 
          a['NOME COMPLETO'].localeCompare(b['NOME COMPLETO'])
        );

        const worksheet = XLSX.utils.json_to_sheet(listaOrdenada);
        
        // 3. Formatação de Negrito nos Títulos
        // Percorre as células da primeira linha (A1, B1, C1...)
        const range = XLSX.utils.decode_range(worksheet['!ref']);
        for (let C = range.s.c; C <= range.e.c; ++C) {
          const address = XLSX.utils.encode_col(C) + "1"; 
          if (!worksheet[address]) continue;
          worksheet[address].s = {
            font: { bold: true }
          };
        }

        // Ajuste de largura das colunas
        worksheet['!cols'] = [
          { wch: 45 }, { wch: 15 }, { wch: 15 }, { wch: 35 }, { wch: 20 }
        ];

        const nomeLimpo = nomeAba.substring(0, 31).replace(/[:\\\/\?\*\[\]]/g, "").trim();
        XLSX.utils.book_append_sheet(workbook, worksheet, nomeLimpo);
      });

      XLSX.writeFile(workbook, `Relatorio_Inscricoes_FIO_2026.xlsx`);
      setLoginError('Planilha exportada com sucesso!');
      
    } catch (err) {
      setLoginError('Falha na exportação: ' + err.message);
    } finally {
      setLoginProcessing(false);
      setMatriculaLogin('');
    }
  };

  // --- LÓGICA ---
const handleLogin = async (e) => {
    e.preventDefault();
    // Fix #10: Admin credentials via environment variables
    const adminCode = import.meta.env.VITE_ADMIN_CODE;
    const exportCode = import.meta.env.VITE_EXPORT_CODE;
    if (adminCode && matriculaLogin === adminCode) return setScreen('setup');
    if (detectedSerie === '1') {
      setLoginError('A 1ª Série não participa deste processo...');
      return;
    }
    if (exportCode && matriculaLogin === exportCode) {
      await exportarParaExcel();
      return;
    }

    const infoTimer = detectedSerie === '3' ? times.serie3 : times.serie12;
    if (!infoTimer.open) {
      setLoginError(`O portal para a ${detectedSerie}ª série ainda não está aberto.`);
      return;
    }
    
    setLoginProcessing(true);
    setLoginError('');
    try {
      const q = query(collection(db, 'inscricoes'), where('matricula', '==', matriculaLogin));
      const snap = await getDocs(q);
      
      if (!snap.empty) {
        const inscricao = snap.docs[0].data();
        setWelcomeName(inscricao.nome);
        setTurma(inscricao.turma);
        const serieLocal = inscricao.turma.charAt(0);
        setUserSerie(serieLocal);
        
        if (serieLocal === '3') {
           setChosenTercaName(inscricao.terca);
           setChosenQuintaName(inscricao.quinta);
        } else {
           setChosenDiscName(inscricao.disciplina);
        }
        setScreen('success');
        return;
      }

      const docRef = doc(db, "matriculasValidas", matriculaLogin);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const studentData = docSnap.data();
        setWelcomeName(studentData.nome);
        setNomeCompleto(studentData.nome); // Auto-preenche para submissão
        setMatriculaValidada(matriculaLogin);
        const serieStr = studentData.serie.toString();
        setUserSerie(serieStr);
        setHistoricoChoice(studentData.jaCursou || null);

        // --- LÓGICA DA FILA ---
        const counterRef = doc(db, 'estatisticas', `fila_counter_${serieStr}`);
        
        const horaAberturaMs = new Date(OPENING_CONFIG[serieStr]).getTime();

        const myTicketInfo = await runTransaction(db, async (transaction) => {
          const matDoc = await transaction.get(docRef);
          if (matDoc.data().ticket !== undefined) {
            return { ticket: matDoc.data().ticket, isNew: false, allowedTimeMs: matDoc.data().allowedTimeMs };
          }
          const cDoc = await transaction.get(counterRef);
          const data = cDoc.exists() ? cDoc.data() : {};
          const currentTicket = data.lastTicket || 0;
          const newTicket = currentTicket + 1;
          
          const now = Date.now();
          const lastScheduledTime = data.lastScheduledTime || horaAberturaMs;
          
          const baseTime = Math.max(now, lastScheduledTime, horaAberturaMs);
          
          const myAllowedTime = baseTime;
          const nextAvailableSlot = baseTime + (SECONDS_PER_USER * 1000);

          transaction.set(counterRef, { 
            lastTicket: newTicket,
            lastScheduledTime: nextAvailableSlot
          }, { merge: true });
          
          transaction.update(docRef, { 
            ticket: newTicket,
            allowedTimeMs: myAllowedTime
          });
          
          return { ticket: newTicket, isNew: true, allowedTimeMs: myAllowedTime };
        });

        setQueueTicket(myTicketInfo.ticket);
        
        const timeAllowedMs = myTicketInfo.allowedTimeMs || (horaAberturaMs + (myTicketInfo.ticket * SECONDS_PER_USER * 1000));
        setQueueTimeAllowed(timeAllowedMs);

        if (Date.now() >= timeAllowedMs) {
           setScreen('form');
        } else {
           setScreen('queue');
        }
      } else throw new Error('Matrícula não encontrada no sistema.');
    } catch (err) { setLoginError(err.message); } 
    finally { setLoginProcessing(false); }
};



  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Fix #4: Synchronous double-click prevention via ref
    if (submittingRef.current) return;
    submittingRef.current = true;
    
    const serieStr = userSerie.toString();
    const agora = new Date().getTime();
    const abertura = new Date(OPENING_CONFIG[serieStr]).getTime();

    if (agora < abertura) {
      setErro(true);
      setMensagem('O formulário ainda não está aberto para sua série.');
      submittingRef.current = false;
      return;
    }

    if (processando) { submittingRef.current = false; return; }
    setProcessando(true);
    setErro(false);
    const limite = getLimiteAtual();

    const normalizar = (str) => str.normalize("NFD").replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
    if (normalizar(nomeCompleto) !== normalizar(welcomeName)) {
      setErro(true);
      setMensagem('O nome não coincide com o cadastro. Verifique a grafia.');
      setProcessando(false);
      submittingRef.current = false;
      return;
    }

    try {
      await runTransaction(db, async (transaction) => {
        // Fix #5: Atomic check for existing enrollment using matricula as doc ID
        const inscRef = doc(db, 'inscricoes', matriculaValidada);
        const inscDoc = await transaction.get(inscRef);
        if (inscDoc.exists()) throw new Error("Você já realizou sua inscrição anteriormente!");

        const vRef = doc(db, 'estatisticas', 'vagas');
        const vDoc = await transaction.get(vRef);
        const vData = vDoc.data();

        let dados = { nome: nomeCompleto, turma, matricula: matriculaValidada, timestamp: serverTimestamp() };
        let updates = {};

        if (isTerceiraSerie) {
          if (vData[disciplinaTerca] >= limite || vData[disciplinaQuinta] >= limite) throw new Error("Vagas esgotadas.");
          
          // Fix #1: Safe lookup with null-check to prevent TypeError crash
          const discTerca = disciplinasPorTurma[turma]?.terca?.find(d => d.id === disciplinaTerca);
          const discQuinta = disciplinasPorTurma[turma]?.quinta?.find(d => d.id === disciplinaQuinta);
          if (!discTerca || !discQuinta) throw new Error("Disciplina não encontrada. Recarregue a página e tente novamente.");
          const nomeT = discTerca.nome;
          const nomeQ = discQuinta.nome;
          
          updates[disciplinaTerca] = (vData[disciplinaTerca] || 0) + 1;
          updates[disciplinaQuinta] = (vData[disciplinaQuinta] || 0) + 1;
          dados.terca = nomeT;
          dados.quinta = nomeQ;
          
          setChosenTercaName(nomeT);
          setChosenQuintaName(nomeQ);
        } else {
          if (vData[disciplina] >= limite) throw new Error("Vagas esgotadas.");
          
          // Fix #1: Safe lookup with null-check to prevent TypeError crash
          const discArr = disciplinasPorTurma[turma];
          const discObj = Array.isArray(discArr) ? discArr.find(d => d.id === disciplina) : null;
          if (!discObj) throw new Error("Disciplina não encontrada. Recarregue a página e tente novamente.");
          const nomeD = discObj.nome;
          
          updates[disciplina] = (vData[disciplina] || 0) + 1;
          dados.disciplina = nomeD;
          setChosenDiscName(nomeD);
        }

        transaction.update(vRef, updates);
        // Fix #5: Use matricula as doc ID for idempotent writes
        transaction.set(inscRef, dados);
        const alunoRef = doc(db, "matriculasValidas", matriculaValidada);
        if (isTerceiraSerie) {
          transaction.update(alunoRef, { jaCursou: [disciplinaTerca, disciplinaQuinta] });
        } else {
          transaction.update(alunoRef, { jaCursou: disciplina });
        }
        
        // Fila Híbrida: Sai 1, Entra 1
        const counterRef = doc(db, 'estatisticas', `fila_counter_${serieStr}`);
        transaction.set(counterRef, { currentServingTicket: increment(1) }, { merge: true });
      });
      
      setScreen('success');
    } catch (e) { 
      setErro(true); 
      setMensagem(e.message); 
    } finally { 
      setProcessando(false);
      submittingRef.current = false;
    }
  };

  function renderOption(disc) {
  const ocupadas = contagemVagas[disc.id] || 0;
  const lim = getLimiteAtual();
  const full = ocupadas >= lim;

  const jaFoiCursada = userSerie === '2' && (
  Array.isArray(historicoChoice) 
    ? historicoChoice.includes(disc.id) 
    : historicoChoice === disc.id
);

  return (
    <option key={disc.id} value={disc.id} disabled={full || jaFoiCursada}>
      {disc.nome} {jaFoiCursada ? ' (Indisponível: já cursada)' : full ? ' (Esgotado)' : `- ${lim - ocupadas} vagas`}
    </option>
  );
}



const getTurmasFiltradas = () => {
  if (!userSerie) return []; 
  return Object.keys(disciplinasPorTurma).filter(t => t.startsWith(userSerie));
};

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-center">
      <div className="flex-grow flex flex-col items-center justify-center p-4 md:p-8">
        
        {screen === 'login' ? (
          <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-5 gap-8 items-center text-center">
            <div className="md:col-span-3 bg-white shadow-2xl rounded-3xl p-8 md:p-12 border border-slate-100 flex flex-col items-center">
              <img src={logo} alt="Logo" className="mb-8 w-48 mx-auto" />
              <h1 className="text-3xl font-extrabold text-slate-800 mb-2">Inscrição Formação Interdisciplinar Optativa</h1>
              <p className="text-blue-600 font-semibold mb-8">Ensino Médio • 2026 / 1</p>
              
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

            <div className="md:col-span-2 flex flex-col justify-center">
              <div className="bg-white shadow-2xl rounded-3xl p-8 border border-slate-100">
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Acesso</h2>
                <p className="text-slate-500 mb-8">Digite sua matrícula para iniciar.</p>
               <form onSubmit={handleLogin} className="space-y-6 w-full flex flex-col items-center">
  <div className="w-full">
    <label className="block text-sm font-bold text-slate-700 mb-2">Número de Matrícula</label>
    <input 
      type="tel" value={matriculaLogin} onChange={e => setMatriculaLogin(e.target.value)}
      placeholder="Digite sua matrícula"
      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-lg text-center focus:ring-2 focus:ring-blue-500 outline-none transition-all"
      required 
    />
  </div>

  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
    <div className={`p-4 rounded-2xl border ${times.serie3.open ? 'bg-green-50 border-green-200' : 'bg-slate-900 border-slate-700'} text-center transition-colors`}>
      <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${times.serie3.open ? 'text-green-600' : 'text-blue-400'}`}>3ª Série</p>
      {times.serie3.open ? (
        <div className="text-green-700 font-bold text-sm flex items-center justify-center gap-1"><CheckCircle size={14}/> LIBERADO</div>
      ) : (
        <div className="text-white font-mono text-lg font-black">{times.serie3.d}d {times.serie3.h}h {times.serie3.m}m {times.serie3.s}s</div>
      )}
    </div>

    <div className={`p-4 rounded-2xl border ${times.serie12.open ? 'bg-green-50 border-green-200' : 'bg-slate-900 border-slate-700'} text-center transition-colors`}>
      <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${times.serie12.open ? 'text-green-600' : 'text-blue-400'}`}>2ª Série</p>
      {times.serie12.open ? (
        <div className="text-green-700 font-bold text-sm flex items-center justify-center gap-1"><CheckCircle size={14}/> LIBERADO</div>
      ) : (
        <div className="text-white font-mono text-lg font-black">{times.serie12.d}d {times.serie12.h}h {times.serie12.m}m {times.serie12.s}s</div>
      )}
    </div>
  </div>

{detectedSerie === '1' ? (
  <div className="w-full bg-amber-50 border border-amber-200 p-6 rounded-2xl flex flex-col items-center gap-3 shadow-inner">
    <Info size={24} className="text-amber-600" />
    <p className="text-sm font-bold text-amber-900 leading-relaxed text-center">
      A 1ª Série não participa desse processo de escolha. <br />
      Converse com o prof. Felipe para informações.
    </p>
  </div>
) : ((detectedSerie === '3' && times.serie3.open) || (detectedSerie === '2' && times.serie12.open)) ? (
    <button 
      type="submit" disabled={loginProcessing}
      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-5 rounded-2xl shadow-xl flex items-center justify-center gap-2 transition-all active:scale-95"
    >
      <LogIn size={20} /> {loginProcessing ? 'VALIDANDO...' : 'ENTRAR NA FILA'}
    </button>
  ) : (
    <div className="text-slate-400 text-xs font-bold uppercase tracking-tighter animate-pulse italic">
       {detectedSerie ? `Aguardando abertura para a ${detectedSerie}ª série...` : "Digite sua matrícula para validar o acesso"}
    </div>
  )}

  {loginError && <div className="flex items-center justify-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-xl w-full"><span>{loginError}</span></div>}
</form>
              </div>
            </div>
          </div>
        ) : screen === 'setup' ? (
            <SetupPage db={db} alunos={ALUNOS_2026} setScreen={setScreen} />
        ) : screen === 'queue' ? (
          <div className="w-full max-w-2xl animate-in fade-in zoom-in duration-500">
            <header className="flex flex-col items-center mb-8">
              <img src={logo} alt="Logo" className="w-40 mb-4 mx-auto" />
            </header>
            <main className="bg-white shadow-2xl rounded-3xl p-8 md:p-12 border border-slate-100 flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-6 animate-pulse">
                <Timer size={48} />
              </div>
              <h2 className="text-3xl font-black text-slate-800 mb-2">Você está na fila virtual</h2>
              <p className="text-slate-500 mb-6 text-lg">Para evitar sobrecarga no sistema, liberamos o acesso gradativamente.</p>
              
              <div className="w-full bg-slate-50 rounded-2xl p-6 border border-slate-100 text-center mb-6">
                <p className="text-slate-400 text-xs uppercase font-bold tracking-widest mb-1">Seu lugar na fila</p>
                <p className="text-4xl font-black text-blue-600 mb-2">#{queueTicket}</p>
                <p className="text-sm font-medium text-slate-600 mt-4">Tempo estimado de espera:</p>
                <p className="text-3xl font-mono font-bold text-slate-800">
                  {Math.floor(queueSecondsLeft / 60).toString().padStart(2, '0')}:{(queueSecondsLeft % 60).toString().padStart(2, '0')}
                </p>
              </div>

              <div className="flex items-center gap-2 text-amber-700 bg-amber-50 px-4 py-3 rounded-xl text-sm font-bold w-full justify-center">
                <AlertTriangle size={18} />
                <span>NÃO ATUALIZE E NEM FECHE ESTA PÁGINA!</span>
              </div>
            </main>
          </div>
        ) : screen === 'success' ? (
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
                    <label className="block text-sm font-bold text-slate-700 mb-2">Aluno(a)</label>
                    <input 
                      type="text" 
                      value={nomeCompleto} 
                      disabled
                      className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-500 font-bold text-center"
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
      // Fix #7: Chunked batches to respect Firestore 500-op limit
      const BATCH_LIMIT = 499;
      const pendingBatches = [];
      let batch = writeBatch(db);
      let batchCount = 0;

      alunos.forEach((a) => {
        const ref = doc(db, "matriculasValidas", a.matricula.toString());
        batch.set(ref, a);
        batchCount++;
        if (batchCount >= BATCH_LIMIT) {
          pendingBatches.push(batch.commit());
          batch = writeBatch(db);
          batchCount = 0;
        }
      });
      const vagasRef = doc(db, "estatisticas", "vagas");
      batch.set(vagasRef, {
        "Matemática Financeira_1EM": 0, "Ciências da Natureza_1EM": 0, "Ciências Humanas_1EM": 0, "Personal Development and Life Skills English Program_1EM": 0,
        "Aprendizagem interativa STEAM : Criação, desenvolvimento e automação": 0, "Ciências Humanas_2EM": 0, "Ciências da Natureza_2EM": 0, "Personal Development and Life Skills English Program_2EM": 0,
        "Ciências da Natureza_TER_3EM": 0, "Ciências Humanas_TER_3EM": 0, "Matemática_QUI_3EM": 0, "Linguagens_QUI_3EM": 0
      });

      // Reseta contadores da fila
      const filaCounter2Ref = doc(db, "estatisticas", "fila_counter_2");
      batch.set(filaCounter2Ref, { lastTicket: 0 });
      const filaCounter3Ref = doc(db, "estatisticas", "fila_counter_3");
      batch.set(filaCounter3Ref, { lastTicket: 0 });

      // Salvar configuracoes padrao
      const configRef = doc(db, "configuracoes", "geral");
      batch.set(configRef, {
        USERS_PER_MINUTE: 30,
        LIMITES_POR_SERIE: { '1': 35, '2': 25, '3': 41 },
        disciplinasPorTurma: {
            '1AM': [ { id: 'Matemática Financeira_1EM', nome: 'Matemática Financeira' }, { id: 'Ciências da Natureza_1EM', nome: 'Ciências da Natureza' }, { id: 'Ciências Humanas_1EM', nome: 'Ciências Humanas' }, { id: 'Personal Development and Life Skills English Program_1EM', nome: 'Inglês: Personal Development' } ],
            '1BM': [ { id: 'Matemática Financeira_1EM', nome: 'Matemática Financeira' }, { id: 'Ciências da Natureza_1EM', nome: 'Ciências da Natureza' }, { id: 'Ciências Humanas_1EM', nome: 'Ciências Humanas' }, { id: 'Personal Development and Life Skills English Program_1EM', nome: 'Inglês: Personal Development' } ],
            '1CM': [ { id: 'Matemática Financeira_1EM', nome: 'Matemática Financeira' }, { id: 'Ciências da Natureza_1EM', nome: 'Ciências da Natureza' }, { id: 'Ciências Humanas_1EM', nome: 'Ciências Humanas' }, { id: 'Personal Development and Life Skills English Program_1EM', nome: 'Inglês: Personal Development' } ],
            '1DM': [ { id: 'Matemática Financeira_1EM', nome: 'Matemática Financeira' }, { id: 'Ciências da Natureza_1EM', nome: 'Ciências da Natureza' }, { id: 'Ciências Humanas_1EM', nome: 'Ciências Humanas' }, { id: 'Personal Development and Life Skills English Program_1EM', nome: 'Inglês: Personal Development' } ],
            '2AM': [ { id: 'Aprendizagem interativa STEAM : Criação, desenvolvimento e automação', nome: 'STEAM: Aprendizagem Interativa' }, { id: 'Ciências Humanas_2EM', nome: 'Ciências Humanas' }, { id: 'Ciências da Natureza_2EM', nome: 'Ciências da Natureza' }, { id: 'Personal Development and Life Skills English Program_2EM', nome: 'Inglês: Personal Development' } ],
            '2BM': [ { id: 'Aprendizagem interativa STEAM : Criação, desenvolvimento e automação', nome: 'STEAM: Aprendizagem Interativa' }, { id: 'Ciências Humanas_2EM', nome: 'Ciências Humanas' }, { id: 'Ciências da Natureza_2EM', nome: 'Ciências da Natureza' }, { id: 'Personal Development and Life Skills English Program_2EM', nome: 'Inglês: Personal Development' } ],
            '2CM': [ { id: 'Aprendizagem interativa STEAM : Criação, desenvolvimento e automação', nome: 'STEAM: Aprendizagem Interativa' }, { id: 'Ciências Humanas_2EM', nome: 'Ciências Humanas' }, { id: 'Ciências da Natureza_2EM', nome: 'Ciências da Natureza' }, { id: 'Personal Development and Life Skills English Program_2EM', nome: 'Inglês: Personal Development' } ],
            '3AM': { terca: [{ id: 'Ciências da Natureza_TER_3EM', nome: 'Ciências da Natureza' }, { id: 'Ciências Humanas_TER_3EM', nome: 'Ciências Humanas' }], quinta: [{ id: 'Matemática_QUI_3EM', nome: 'Matemática' }, { id: 'Linguagens_QUI_3EM', nome: 'Linguagens' }] },
            '3BM': { terca: [{ id: 'Ciências da Natureza_TER_3EM', nome: 'Ciências da Natureza' }, { id: 'Ciências Humanas_TER_3EM', nome: 'Ciências Humanas' }], quinta: [{ id: 'Matemática_QUI_3EM', nome: 'Matemática' }, { id: 'Linguagens_QUI_3EM', nome: 'Linguagens' }] },
        },
        OPENING_CONFIG: {
            '3': "2026-01-29T20:00:00-03:00",
            '1': "2026-02-03T20:00:00-03:00",
            '2': "2026-08-06T20:00:00-03:00"
        }
      });

      pendingBatches.push(batch.commit());
      await Promise.all(pendingBatches);
      alert("Sucesso!");
      setScreen('login');
    } catch (e) { alert(e.message); } 
    finally { setLoading(false); }
  };

  const zerarVagasMantendoHistorico = async () => {
    if (!window.confirm("ATENÇÃO: Isso apagará todas as INSCRIÇÕES ATUAIS e ZERARÁ as vagas para zero, mas MANTERÁ INTACTO o histórico (jaCursou) de todos os alunos. Continuar?")) return;

    setLoading(true);
    try {
      const batch = writeBatch(db);

      // 1. Apagar todas as inscrições atuais (Libera o acesso para logar de novo)
      const inscricoesSnapshot = await getDocs(collection(db, 'inscricoes'));
      inscricoesSnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });

      // 2. Zerar a contagem de vagas (Para começar do zero)
      const vagasRef = doc(db, "estatisticas", "vagas");
      batch.set(vagasRef, {
        "Matemática Financeira_1EM": 0, "Ciências da Natureza_1EM": 0, "Ciências Humanas_1EM": 0, "Personal Development and Life Skills English Program_1EM": 0,
        "Aprendizagem interativa STEAM : Criação, desenvolvimento e automação": 0, "Ciências Humanas_2EM": 0, "Ciências da Natureza_2EM": 0, "Personal Development and Life Skills English Program_2EM": 0,
        "Ciências da Natureza_TER_3EM": 0, "Ciências Humanas_TER_3EM": 0, "Matemática_QUI_3EM": 0, "Linguagens_QUI_3EM": 0
      });

      // Reseta contadores da fila
      const filaCounter1Ref = doc(db, "estatisticas", "fila_counter_1");
      const filaCounter2Ref = doc(db, "estatisticas", "fila_counter_2");
      const filaCounter3Ref = doc(db, "estatisticas", "fila_counter_3");
      batch.set(filaCounter1Ref, { lastTicket: 0, currentServingTicket: 30 }, { merge: true });
      batch.set(filaCounter2Ref, { lastTicket: 0, currentServingTicket: 30 }, { merge: true });
      batch.set(filaCounter3Ref, { lastTicket: 0, currentServingTicket: 30 }, { merge: true });

      await batch.commit();
      alert("Vagas abertas com sucesso! Histórico dos alunos (jaCursou) foi 100% preservado.");
    } catch (e) {
      alert("Erro: " + e.message);
    } finally {
      setLoading(false);
    }
  };

   const limparHistorico2Serie = async () => {
    if (!window.confirm("Isso vai apagar o campo 'jaCursou' de TODOS os alunos da 2ª SÉRIE. Confirma?")) return;
    
    setLoading(true);
    try {
      // 1. Busca apenas alunos da série 2
      // OBS: No seu print a série é número (serie: 3). Se não achar ninguém, troque 2 por "2".
      const q = query(collection(db, "matriculasValidas"), where("serie", "==", 2));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        alert("Nenhum aluno da série 2 encontrado. Verifique se no banco a série está salva como número ou string.");
        setLoading(false);
        return;
      }

      // 2. Processa em Lotes (Batches) de 500 (limite do Firestore)
      const batches = [];
      let currentBatch = writeBatch(db);
      let count = 0;
      let totalUpdated = 0;

      querySnapshot.forEach((document) => {
        const docRef = doc(db, "matriculasValidas", document.id);
        
        // Remove o campo jaCursou
        currentBatch.update(docRef, { jaCursou: deleteField() });
        
        count++;
        totalUpdated++;

        // Se atingir 499 operações, fecha o pacote e abre um novo
        if (count >= 499) {
          batches.push(currentBatch.commit());
          currentBatch = writeBatch(db);
          count = 0;
        }
      });

      // Adiciona o último pacote se tiver sobrado algo
      if (count > 0) {
        batches.push(currentBatch.commit());
      }

      // Executa todas as promessas
      await Promise.all(batches);

      alert(`Sucesso! Histórico removido de ${totalUpdated} alunos da 2ª série.`);

    } catch (e) {
      console.error(e);
      alert("Erro ao limpar: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const atualizarConfiguracoes = async () => {
    if (!window.confirm("Isso vai APENAS enviar as regras de Horário, Vagas e Disciplinas para o banco, sem apagar nenhum dado de aluno ou de vaga existente. Continuar?")) return;
    
    setLoading(true);
    try {
      const configRef = doc(db, "configuracoes", "geral");
      await setDoc(configRef, {
        USERS_PER_MINUTE: 30,
        LIMITES_POR_SERIE: { '1': 35, '2': 25, '3': 41 },
        disciplinasPorTurma: {
            '1AM': [ { id: 'Matemática Financeira_1EM', nome: 'Matemática Financeira' }, { id: 'Ciências da Natureza_1EM', nome: 'Ciências da Natureza' }, { id: 'Ciências Humanas_1EM', nome: 'Ciências Humanas' }, { id: 'Personal Development and Life Skills English Program_1EM', nome: 'Inglês: Personal Development' } ],
            '1BM': [ { id: 'Matemática Financeira_1EM', nome: 'Matemática Financeira' }, { id: 'Ciências da Natureza_1EM', nome: 'Ciências da Natureza' }, { id: 'Ciências Humanas_1EM', nome: 'Ciências Humanas' }, { id: 'Personal Development and Life Skills English Program_1EM', nome: 'Inglês: Personal Development' } ],
            '1CM': [ { id: 'Matemática Financeira_1EM', nome: 'Matemática Financeira' }, { id: 'Ciências da Natureza_1EM', nome: 'Ciências da Natureza' }, { id: 'Ciências Humanas_1EM', nome: 'Ciências Humanas' }, { id: 'Personal Development and Life Skills English Program_1EM', nome: 'Inglês: Personal Development' } ],
            '1DM': [ { id: 'Matemática Financeira_1EM', nome: 'Matemática Financeira' }, { id: 'Ciências da Natureza_1EM', nome: 'Ciências da Natureza' }, { id: 'Ciências Humanas_1EM', nome: 'Ciências Humanas' }, { id: 'Personal Development and Life Skills English Program_1EM', nome: 'Inglês: Personal Development' } ],
            '2AM': [ { id: 'Aprendizagem interativa STEAM : Criação, desenvolvimento e automação', nome: 'STEAM: Aprendizagem Interativa' }, { id: 'Ciências Humanas_2EM', nome: 'Ciências Humanas' }, { id: 'Ciências da Natureza_2EM', nome: 'Ciências da Natureza' }, { id: 'Personal Development and Life Skills English Program_2EM', nome: 'Inglês: Personal Development' } ],
            '2BM': [ { id: 'Aprendizagem interativa STEAM : Criação, desenvolvimento e automação', nome: 'STEAM: Aprendizagem Interativa' }, { id: 'Ciências Humanas_2EM', nome: 'Ciências Humanas' }, { id: 'Ciências da Natureza_2EM', nome: 'Ciências da Natureza' }, { id: 'Personal Development and Life Skills English Program_2EM', nome: 'Inglês: Personal Development' } ],
            '2CM': [ { id: 'Aprendizagem interativa STEAM : Criação, desenvolvimento e automação', nome: 'STEAM: Aprendizagem Interativa' }, { id: 'Ciências Humanas_2EM', nome: 'Ciências Humanas' }, { id: 'Ciências da Natureza_2EM', nome: 'Ciências da Natureza' }, { id: 'Personal Development and Life Skills English Program_2EM', nome: 'Inglês: Personal Development' } ],
            '3AM': { terca: [{ id: 'Ciências da Natureza_TER_3EM', nome: 'Ciências da Natureza' }, { id: 'Ciências Humanas_TER_3EM', nome: 'Ciências Humanas' }], quinta: [{ id: 'Matemática_QUI_3EM', nome: 'Matemática' }, { id: 'Linguagens_QUI_3EM', nome: 'Linguagens' }] },
            '3BM': { terca: [{ id: 'Ciências da Natureza_TER_3EM', nome: 'Ciências da Natureza' }, { id: 'Ciências Humanas_TER_3EM', nome: 'Ciências Humanas' }], quinta: [{ id: 'Matemática_QUI_3EM', nome: 'Matemática' }, { id: 'Linguagens_QUI_3EM', nome: 'Linguagens' }] },
        },
        OPENING_CONFIG: {
            '3': "2026-01-29T20:00:00-03:00",
            '1': "2026-02-03T20:00:00-03:00",
            '2': "2026-08-06T20:00:00-03:00"
        }
      });
      alert("Configurações atualizadas com sucesso! Nenhum histórico ou vaga foi resetado.");
      window.location.reload();
    } catch (e) {
      console.error(e);
      alert("Erro ao atualizar: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const criarCenarioTeste = async () => {
    if (!window.confirm("Isso vai criar o Aluno Fake (999999) com histórico preenchido, avançar o relógio da 2ª série para AGORA e colocar 30 pessoas na frente dele na fila. Pronto para testar?")) return;
    setLoading(true);
    try {
      const batch = writeBatch(db);
      
      // 1. Criar Aluno Fake
      const fakeRef = doc(db, "matriculasValidas", "999999");
      batch.set(fakeRef, {
        nome: "ALUNO FAKE DE TESTE",
        matricula: "999999",
        serie: 2,
        turma: "2AM",
        jaCursou: "Ciências da Natureza_2EM", // Para testar bloqueio
        ticket: deleteField() // Para pegar fila nova
      }, { merge: true });

      // 2. Apagar a possível inscrição anterior do fake se ele já testou antes
      // Fazemos isso fora do batch porque precisamos buscar a inscrição primeiro
      const q = query(collection(db, 'inscricoes'), where('matricula', '==', '999999'));
      const snap = await getDocs(q);
      snap.forEach(documento => batch.delete(documento.ref));

      // 3. Empurrar o contador da fila da 2ª série para 30 (simulando 30 pessoas que já pegaram senha)
      const filaRef = doc(db, "estatisticas", "fila_counter_2");
      batch.set(filaRef, { lastTicket: 30, currentServingTicket: 30 }, { merge: true });

      // 4. Abrir o portal daqui a exatamente 1 minuto no futuro para a 2ª Série
      // Assim você pode ver o relógio zerar, fazer o login, pegar a fila e depois escolher.
      const tempoFuturo = new Date(Date.now() + 60000).toISOString();
      const configRef = doc(db, "configuracoes", "geral");
      batch.set(configRef, {
        OPENING_CONFIG: {
          '2': tempoFuturo
        }
      }, { merge: true });

      await batch.commit();
      alert("Cenário Completo Criado! Aguarde o relógio zerar, digite a matrícula 999999 e faça o fluxo completo!");
      window.location.reload();
    } catch (e) {
      console.error(e);
      alert("Erro no teste: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white p-6 text-center gap-6">
      <div className="max-w-md flex flex-col items-center gap-4">
        <h1 className="text-4xl font-black mb-4">Painel de Setup</h1>
        
        {/* Botão de Reset Total (Original) */}
        <button onClick={run} disabled={loading} className="w-full bg-red-900 text-red-100 hover:bg-red-950 p-4 rounded-2xl font-black text-sm shadow-xl transition-all disabled:opacity-50 border-4 border-red-500">
          {loading ? "PROCESSANDO..." : "⚠️ PERIGO: RESET TOTAL (APAGA ALUNOS E HISTÓRICO) ⚠️"}
        </button>

        {/* Botão de Atualizar Configs Sem Destruir Dados */}
        <button onClick={atualizarConfiguracoes} disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-700 p-6 rounded-2xl font-black text-xl shadow-xl transition-all disabled:opacity-50">
          {loading ? "PROCESSANDO..." : "🔧 ENVIAR SÓ CONFIGURAÇÕES (SEGURO)"}
        </button>

        {/* Botão para Abrir Vagas mantendo histórico */}
        <button onClick={zerarVagasMantendoHistorico} disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 p-6 rounded-2xl font-bold text-lg shadow-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2">
          <Clock size={24} />
          {loading ? "PROCESSANDO..." : "ABRIR VAGAS (Zerar inscrições mantendo Histórico)"}
        </button>

        {/* Botão para Limpar Histórico 2a Série */}
        <button onClick={limparHistorico2Serie} disabled={loading} className="w-full bg-orange-500 hover:bg-orange-600 p-6 rounded-2xl font-bold text-lg shadow-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2">
           <Timer size={24} />
           {loading ? "LIMPANDO..." : "LIMPAR HISTÓRICO APENAS 2ª SÉRIE"}
        </button>

        {/* Botão de Teste Fake */}
        <button onClick={criarCenarioTeste} disabled={loading} className="w-full bg-purple-600 hover:bg-purple-700 p-6 rounded-2xl font-bold text-lg shadow-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 border border-purple-400">
           🧪 {loading ? "CRIANDO LABORATÓRIO..." : "CRIAR CENÁRIO DE TESTE (FAKE)"}
        </button>

        <button onClick={() => setScreen('login')} className="text-slate-400 underline mt-4">
          Voltar ao Login
        </button>
      </div>
    </div>
  );
};

export default App;