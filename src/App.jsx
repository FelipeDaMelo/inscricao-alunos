import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, getDocs, serverTimestamp, query, where, doc, getDoc, runTransaction, setDoc } from 'firebase/firestore';
import { ALUNOS_2026 } from './alunos'; // Importação limpa dos dados
import logo from './logo-marista.png';
import { CheckCircle, AlertTriangle, LogIn, Send, Settings } from 'lucide-react';

const App = () => {
  const [screen, setScreen] = useState('login');
  const [matriculaLogin, setMatriculaLogin] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginProcessing, setLoginProcessing] = useState(false);
  const [welcomeName, setWelcomeName] = useState('');
  const [nomeCompleto, setNomeCompleto] = useState('');
  const [turma, setTurma] = useState('');
  const [matriculaValidada, setMatriculaValidada] = useState('');
  const [disciplina, setDisciplina] = useState('');
  const [disciplinaTerca, setDisciplinaTerca] = useState('');
  const [disciplinaQuinta, setDisciplinaQuinta] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [erro, setErro] = useState(false);
  const [processando, setProcessando] = useState(false);
  const [contagemVagas, setContagemVagas] = useState({});
  const [carregandoVagas, setCarregandoVagas] = useState(true);

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

  const getLimiteAtual = () => LIMITES_POR_SERIE[turma.charAt(0)] || 35;

  const handleLogin = async (e) => {
    e.preventDefault();
    if (matriculaLogin === '0000') return setScreen('setup'); // Código Admin
    
    setLoginProcessing(true);
    setLoginError('');
    try {
      const q = query(collection(db, 'inscricoes'), where('matricula', '==', matriculaLogin));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) throw new Error('Inscrição já realizada para esta matrícula.');

      const docSnap = await getDoc(doc(db, "matriculasValidas", matriculaLogin));
      if (docSnap.exists()) {
        setWelcomeName(docSnap.data().nome);
        setMatriculaValidada(matriculaLogin);
        setScreen('form');
      } else throw new Error('Matrícula não encontrada.');
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setProcessando(true);
    const is3 = turma.startsWith('3');
    const limite = getLimiteAtual();

    try {
      await runTransaction(db, async (transaction) => {
        const vRef = doc(db, 'estatisticas', 'vagas');
        const vDoc = await transaction.get(vRef);
        const vData = vDoc.data();

        let dados = { nome: nomeCompleto, turma, matricula: matriculaValidada, timestamp: serverTimestamp() };
        let updates = {};

        if (is3) {
          if (vData[disciplinaTerca] >= limite || vData[disciplinaQuinta] >= limite) throw new Error("Vagas esgotadas.");
          updates[disciplinaTerca] = (vData[disciplinaTerca] || 0) + 1;
          updates[disciplinaQuinta] = (vData[disciplinaQuinta] || 0) + 1;
          dados.terca = disciplinasPorTurma[turma].terca.find(d => d.id === disciplinaTerca).nome;
          dados.quinta = disciplinasPorTurma[turma].quinta.find(d => d.id === disciplinaQuinta).nome;
        } else {
          if (vData[disciplina] >= limite) throw new Error("Vagas esgotadas.");
          updates[disciplina] = (vData[disciplina] || 0) + 1;
          dados.disciplina = disciplinasPorTurma[turma].find(d => d.id === disciplina).nome;
        }

        transaction.update(vRef, updates);
        transaction.set(doc(collection(db, 'inscricoes')), dados);
      });
      setMensagem(`Sucesso! ${welcomeName} inscrito.`);
    } catch (e) { setErro(true); setMensagem(e.message); } 
    finally { setProcessando(false); }
  };

  function renderOption(disc) {
    const ocupadas = contagemVagas[disc.id] || 0;
    const lim = getLimiteAtual();
    const full = ocupadas >= lim;
    return <option key={disc.id} value={disc.id} disabled={full}>{disc.nome} {full ? '(Esgotado)' : `- ${lim - ocupadas} vagas`}</option>;
  }

  // --- RENDERS ---
  if (screen === 'setup') return <SetupPage db={db} alunos={ALUNOS_2026} setScreen={setScreen} />;

  return (
    <div className="min-h-screen bg-gray-100 p-4 flex flex-col items-center">
      {screen === 'login' ? (
        <div className="bg-white p-8 rounded shadow-lg max-w-md w-full">
           <img src={logo} className="w-40 mx-auto mb-6" alt="logo" />
           <form onSubmit={handleLogin}>
             <input type="tel" value={matriculaLogin} onChange={e => setMatriculaLogin(e.target.value)} placeholder="Matrícula" className="w-full p-3 border mb-4" />
             <button className="w-full bg-blue-600 text-white p-3 rounded">Entrar</button>
             {loginError && <p className="text-red-500 mt-2">{loginError}</p>}
           </form>
        </div>
      ) : (
        <div className="bg-white p-8 rounded shadow-lg max-w-2xl w-full">
          <h2 className="text-xl font-bold mb-4">Olá, {welcomeName}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input value={nomeCompleto} onChange={e => setNomeCompleto(e.target.value)} placeholder="Nome Completo" className="w-full p-3 border" required />
            <select value={turma} onChange={e => setTurma(e.target.value)} className="w-full p-3 border" required>
              <option value="">Selecione a Turma</option>
              {Object.keys(disciplinasPorTurma).map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            {turma && (turma.startsWith('3') ? (
              <div className="grid grid-cols-2 gap-4">
                <select value={disciplinaTerca} onChange={e => setDisciplinaTerca(e.target.value)} className="p-3 border" required>
                  <option value="">Terça</option>{disciplinasPorTurma[turma].terca.map(renderOption)}
                </select>
                <select value={disciplinaQuinta} onChange={e => setDisciplinaQuinta(e.target.value)} className="p-3 border" required>
                  <option value="">Quinta</option>{disciplinasPorTurma[turma].quinta.map(renderOption)}
                </select>
              </div>
            ) : (
              <select value={disciplina} onChange={e => setDisciplina(e.target.value)} className="w-full p-3 border" required>
                <option value="">Disciplina</option>{disciplinasPorTurma[turma].map(renderOption)}
              </select>
            ))}
            <button disabled={processando} className="w-full bg-green-600 text-white p-3 rounded">Confirmar Inscrição</button>
          </form>
          {mensagem && <div className={`mt-4 p-4 ${erro ? 'bg-red-100' : 'bg-green-100'}`}>{mensagem}</div>}
        </div>
      )}
    </div>
  );
};

// COMPONENTE DE SETUP
const SetupPage = ({ db, alunos, setScreen }) => {
  const [loading, setLoading] = useState(false);
  const run = async () => {
    if (!window.confirm("Isso resetará o banco. Continuar?")) return;
    setLoading(true);
    try {
      for (const a of alunos) {
        await setDoc(doc(db, "matriculasValidas", a.matricula.toString()), a);
      }
      await setDoc(doc(db, "estatisticas", "vagas"), {
        "Matemática Financeira_1EM": 0, "Ciências da Natureza_1EM": 0, "Ciências Humanas_1EM": 0, "Personal Development and Life Skills English Program_1EM": 0,
        "Aprendizagem interativa STEAM : Criação, desenvolvimento e automação": 0, "Ciências Humanas_2EM": 0, "Ciências da Natureza_2EM": 0, "Personal Development and Life Skills English Program_2EM": 0,
        "Ciências da Natureza_TER_3EM": 0, "Ciências Humanas_TER_3EM": 0, "Matemática_QUI_3EM": 0, "Linguagens_QUI_3EM": 0
      });
      alert("Sucesso!");
      setScreen('login');
    } catch (e) { alert(e.message); } 
    finally { setLoading(false); }
  };
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <button onClick={run} disabled={loading} className="bg-red-600 text-white p-10 rounded-xl font-bold text-2xl">
        {loading ? "PROCESSANDO..." : "🚀 EXECUTAR SETUP 2026"}
      </button>
    </div>
  );
};

export default App;