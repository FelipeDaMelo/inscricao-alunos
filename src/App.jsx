import React, { useState, useEffect, useRef } from 'react';
import { db } from './firebase';
import { collection, getDocs, serverTimestamp, query, where, doc, getDoc, runTransaction } from 'firebase/firestore';
import logo from './logo-marista.png';
import { CheckCircle, AlertTriangle, LogIn, Send } from 'lucide-react';

const App = () => {
  // --- TODA A SUA LÓGICA DE ESTADOS E FUNÇÕES PERMANECE AQUI ---
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
  const botaoRef = useRef(null);

    const isTerceiraSerie = turma.startsWith('3');

  const disciplinasPorTurma = {
    '1A': [ { id: 'Matemática Financeira_1EM', nome: 'Matemática Financeira' }, { id: 'Ciências da Natureza_1EM', nome: 'Ciências da Natureza' }, { id: 'Ciências Humanas_1EM', nome: 'Ciências Humanas' }, { id: 'Personal Development and Life Skills English Program', nome: 'Inglês: Personal Development' } ],
    '1B': [ { id: 'Matemática Financeira_1EM', nome: 'Matemática Financeira' }, { id: 'Ciências da Natureza_1EM', nome: 'Ciências da Natureza' }, { id: 'Ciências Humanas_1EM', nome: 'Ciências Humanas' }, { id: 'Personal Development and Life Skills English Program', nome: 'Inglês: Personal Development' } ],
    '1C': [ { id: 'Matemática Financeira_1EM', nome: 'Matemática Financeira' }, { id: 'Ciências da Natureza_1EM', nome: 'Ciências da Natureza' }, { id: 'Ciências Humanas_1EM', nome: 'Ciências Humanas' }, { id: 'Personal Development and Life Skills English Program', nome: 'Inglês: Personal Development' } ],
    '1D': [ { id: 'Matemática Financeira_1EM', nome: 'Matemática Financeira' }, { id: 'Ciências da Natureza_1EM', nome: 'Ciências da Natureza' }, { id: 'Ciências Humanas_1EM', nome: 'Ciências Humanas' }, { id: 'Personal Development and Life Skills English Program', nome: 'Inglês: Personal Development' } ],
    '2A': [ { id: 'Aprendizagem interativa STEAM : Criação, desenvolvimento e automação', nome: 'STEAM: Aprendizagem Interativa' }, { id: 'Ciências Humanas_2EM', nome: 'Ciências Humanas' }, { id: 'Ciências da Natureza_2EM', nome: 'Ciências da Natureza' } ],
    '2B': [ { id: 'Aprendizagem interativa STEAM : Criação, desenvolvimento e automação', nome: 'STEAM: Aprendizagem Interativa' }, { id: 'Ciências Humanas_2EM', nome: 'Ciências Humanas' }, { id: 'Ciências da Natureza_2EM', nome: 'Ciências da Natureza' } ],
    '2C': [ { id: 'Aprendizagem interativa STEAM : Criação, desenvolvimento e automação', nome: 'STEAM: Aprendizagem Interativa' }, { id: 'Ciências Humanas_2EM', nome: 'Ciências Humanas' }, { id: 'Ciências da Natureza_2EM', nome: 'Ciências da Natureza' } ],
    '3A': { terca: [{ id: 'Ciências da Natureza_TER_3EM', nome: 'Ciências da Natureza' }, { id: 'Ciências Humanas_TER_3EM', nome: 'Ciências Humanas' }], quinta: [{ id: 'Matemática_QUI_3EM', nome: 'Matemática' }, { id: 'Linguagens_QUI_3EM', nome: 'Linguagens' }] },
    '3B': { terca: [{ id: 'Ciências da Natureza_TER_3EM', nome: 'Ciências da Natureza' }, { id: 'Ciências Humanas_TER_3EM', nome: 'Ciências Humanas' }], quinta: [{ id: 'Matemática_QUI_3EM', nome: 'Matemática' }, { id: 'Linguagens_QUI_3EM', nome: 'Linguagens' }] },
  };
  const turmas = Object.keys(disciplinasPorTurma);
  const VAGAS_LIMITE = 35;

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginProcessing(true);
    setLoginError('');
    const isNumeric = /^[0-9]+$/.test(matriculaLogin);
    if (!isNumeric) {
      setLoginError('Matrícula deve conter apenas números.');
      setLoginProcessing(false);
      return;
    }
    try {
      const q = query(collection(db, 'inscricoes'), where('matricula', '==', matriculaLogin));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        throw new Error('Este número de matrícula já foi utilizado para uma inscrição.');
      }
      const docRef = doc(db, "matriculasValidas", matriculaLogin);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const studentData = docSnap.data();
        setWelcomeName(studentData.nome);
        setMatriculaValidada(matriculaLogin);
        setScreen('form');
      } else {
        throw new Error('Número de matrícula não encontrado ou não autorizado.');
      }
    } catch (err) {
      setLoginError(err.message || 'Ocorreu um erro. Tente novamente.');
    } finally {
      setLoginProcessing(false);
    }
  };
  
  useEffect(() => {
    const fetchVagas = async () => {
      setCarregandoVagas(true);
      try {
        const contadorRef = doc(db, 'estatisticas', 'vagas');
        const docSnap = await getDoc(contadorRef);
        if (docSnap.exists()) {
          setContagemVagas(docSnap.data());
        } else {
          console.error("ERRO CRÍTICO: Documento 'estatisticas/vagas' não encontrado!");
        }
      } catch (error) {
        console.error("Erro ao buscar contagem de vagas:", error);
      } finally {
        setCarregandoVagas(false);
      }
    };
    if (screen === 'form') {
      fetchVagas();
    }
  }, [screen]);

useEffect(() => {
  // Rola a tela para o botão de envio sempre que uma disciplina é selecionada
  const algumaDisciplinaSelecionada = 
    (!isTerceiraSerie && disciplina) || 
    (isTerceiraSerie && (disciplinaTerca || disciplinaQuinta));

  if (algumaDisciplinaSelecionada) {
    setTimeout(() => {
      botaoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  }
}, [disciplina, disciplinaTerca, disciplinaQuinta, isTerceiraSerie]); // Depende de todas as variáveis de disciplina

const handleSubmit = async (e) => {
  e.preventDefault();
  if (processando) return;
  setProcessando(true);
  setErro(false);
  setMensagem('');

  if (!nomeCompleto || !turma || (isTerceiraSerie ? (!disciplinaTerca || !disciplinaQuinta) : !disciplina)) {
    setErro(true);
    setMensagem('Por favor, preencha todos os campos.');
    setProcessando(false);
    return;
  }

  // ✅ NOVA VALIDAÇÃO DO NOME
  const normalizar = (str) => str.normalize("NFD").replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
  if (normalizar(nomeCompleto) !== normalizar(welcomeName)) {
    setErro(true);
    setMensagem('O nome confirmado não coincide com o nome cadastrado. Verifique a grafia.');
    setProcessando(false);
    return;
  }

  try {
    await runTransaction(db, async (transaction) => {
      const contadorRef = doc(db, 'estatisticas', 'vagas');
      const contadorDoc = await transaction.get(contadorRef);
      if (!contadorDoc.exists()) throw new Error("Erro no servidor: o contador de vagas não foi encontrado.");

      const dadosContador = contadorDoc.data();
      let novosDadosInscricao = {
        nome: nomeCompleto,
        turma,
        matricula: matriculaValidada,
        timestamp: serverTimestamp()
      };
      let atualizacoesContador = {};

      if (isTerceiraSerie) {
        const vagasTerca = dadosContador[disciplinaTerca] || 0;
        const vagasQuinta = dadosContador[disciplinaQuinta] || 0;

        if (vagasTerca >= VAGAS_LIMITE) throw new Error(`Vagas esgotadas para a opção de Terça-feira.`);
        if (vagasQuinta >= VAGAS_LIMITE) throw new Error(`Vagas esgotadas para a opção de Quinta-feira.`);

        atualizacoesContador[disciplinaTerca] = vagasTerca + 1;
        atualizacoesContador[disciplinaQuinta] = vagasQuinta + 1;

        novosDadosInscricao.disciplina_terca = (disciplinasPorTurma[turma].terca.find(d => d.id === disciplinaTerca))?.nome;
        novosDadosInscricao.disciplina_quinta = (disciplinasPorTurma[turma].quinta.find(d => d.id === disciplinaQuinta))?.nome;
        novosDadosInscricao.disciplina_terca_id = disciplinaTerca;
        novosDadosInscricao.disciplina_quinta_id = disciplinaQuinta;
      } else {
        const vagasUnica = dadosContador[disciplina] || 0;
        const nomeBonito = (disciplinasPorTurma[turma].find(d => d.id === disciplina))?.nome || disciplina;

        if (vagasUnica >= VAGAS_LIMITE) throw new Error(`As vagas para a disciplina "${nomeBonito}" já estão esgotadas.`);

        atualizacoesContador[disciplina] = vagasUnica + 1;
        novosDadosInscricao.disciplina = nomeBonito;
        novosDadosInscricao.disciplina_id = disciplina;
      }

      transaction.update(contadorRef, atualizacoesContador);
      const novaInscricaoRef = doc(collection(db, 'inscricoes'));
      transaction.set(novaInscricaoRef, novosDadosInscricao);
    });

    setMensagem('Inscrição realizada com sucesso! Você já pode fechar esta página.');
    setErro(false);
  } catch (error) {
    setErro(true);
    setMensagem(error.message || 'Ocorreu um erro inesperado. Tente novamente.');
  } finally {
    setProcessando(false);
  }
};


  function renderOption(disc) {
    const vagasOcupadas = contagemVagas[disc.id] || 0;
    const esgotado = vagasOcupadas >= VAGAS_LIMITE;
    return (
      <option key={disc.id} value={disc.id} disabled={esgotado}>
        {disc.nome} {esgotado ? `(Esgotado)` : `- ${VAGAS_LIMITE - vagasOcupadas} vagas restantes`}
      </option>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col pb-28">
      <div className="flex-grow flex flex-col items-center p-4 py-8">
        {screen === 'login' ? (
          <>
            <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-5 gap-8">
              <div className="md:col-span-3 bg-white shadow-xl rounded-2xl p-6 md:p-8">
              <img src={logo} alt="Colégio Marista Glória" className="mx-auto mb-4 w-40 md:w-48" />
              <h1 className="text-xl md:text-3xl font-bold text-gray-800 text-center ">Inscrição - Formação Interdisciplinar Optativa</h1>
              <h2 className="text-md md:text-lg text-gray-600 text-center ">Ensino Médio - 2º Semestre</h2>
              <h3 className="text-md md:text-lg text-gray-600 text-center ">2025</h3>
              
                <h2 className="text-2xl font-bold text-gray-800 mb-4 mt-6 border-b pb-2">Instruções Importantes</h2>
                <div 
                  className="text-gray-700 text-sm text-left leading-relaxed space-y-3"
                  dangerouslySetInnerHTML={{ __html: `
                    Seja bem-vindo ao formulário de inscrição para a Disciplina de Formação Interdisciplinar Optativa do segundo semestre de 2025. Este é um passo importante para personalizar sua experiência acadêmica e explorar áreas de interesse específicas. Por favor, leia atentamente as instruções abaixo antes de preencher o formulário.<br /><br />
                    <strong>Instruções:</strong><br />
                    Indique seu número de matrícula para ativação do formulário. Na próxima tela, verifique se seu nome está correto.
                    Você precisa preencher:<br />
                    - Nome Completo: Preencha seu nome completo para verificação.<br />
                    - Turma: Indique a turma à qual pertence.<br />
                    - Escolha da Disciplina: Selecione a disciplina que deseja cursar neste 2º semestre de 2025. <br />
                    Observe que, caso a disciplina escolhida atinja o número máximo de alunos, ela aparecerá na lista como ‘(Esgotado)’ e não poderá ser selecionada.<br /><br />
                    <strong>Observações Importantes:</strong><br />
                    Cada estudante pode escolher apenas uma disciplina (ou uma por dia, no caso da 3ª Série).<br />
                    A disciplina deve ser diferente da opção escolhida no primeiro semestre.<br />
                    A escolha é definitiva e não poderá ser modificada após o envio do formulário.<br />
                    Certifique-se de que sua opção está de acordo com seus interesses e objetivos acadêmicos.<br /><br />
                    Agradecemos sua participação e desejamos um semestre acadêmico produtivo e enriquecedor!<br /><br />
                    <em>Ensino Médio/Colégio Marista Glória</em>
                  `}}
                />
              </div>
              
              {/* --- MUDANÇA 1: CENTRALIZAR A COLUNA DA DIREITA --- */}
              {/* Adicionamos `flex flex-col justify-center` para centralizar o conteúdo verticalmente */}
              <div className="md:col-span-2 flex flex-col justify-center">
                <main className="bg-white shadow-xl rounded-2xl p-6 md:p-8 w-full">
                  <h1 className="text-2xl font-bold text-center text-gray-800 mb-2">Acesso ao Formulário</h1>
                  <p className="text-center text-gray-500 mb-6">Valide sua matrícula para começar.</p>
                  <form onSubmit={handleLogin}>
                    <div className="space-y-4">
                      <label className="flex flex-col">
                        <span className="font-semibold text-gray-700 mb-2">Digite seu Número de Matrícula:</span>
                        <input type="tel" inputMode="numeric" pattern="[0-9]*" value={matriculaLogin} onChange={(e) => setMatriculaLogin(e.target.value)} className="p-3 border border-gray-300 rounded-lg text-center text-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" placeholder="Apenas números" required />
                      </label>
                    </div>
                    <button type="submit" disabled={loginProcessing} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg mt-6 flex items-center justify-center gap-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors">
                      <LogIn size={20} />
                      {loginProcessing ? 'Verificando...' : 'Avançar'}
                    </button>
                    {loginError && <p className="text-red-600 text-center mt-4 text-sm font-medium">{loginError}</p>}
                  </form>
                </main>
              </div>
            </div>
          </>
        ) : (
          <>
            <header className="text-center mb-6 w-full max-w-4xl">
              <img src={logo} alt="Colégio Marista Glória" className="mx-auto mb-4 w-40 md:w-48" />
            </header>
            <main className="bg-white shadow-xl rounded-2xl p-6 md:p-8 w-full max-w-4xl">
              <div className="bg-green-100 border-l-4 border-green-500 text-green-800 p-4 rounded-r-lg mb-8 text-center">
                <h2 className="text-xl font-bold">Boas-vindas, <span className="font-extrabold">{welcomeName}!</span></h2>
                <p className="mt-1">Sua matrícula foi validada. Por favor, confirme seu nome e preencha os campos abaixo para concluir sua inscrição.</p>
              </div>
              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                <label className="flex flex-col md:col-span-1">
                  <span className="font-semibold text-gray-700 mb-2">Número de Matrícula:</span>
                  <input type="text" value={matriculaValidada} className="p-3 border border-gray-200 rounded-lg bg-gray-100 cursor-not-allowed" disabled />
                </label>
                <label className="flex flex-col md:col-span-1">
                  <span className="font-semibold text-gray-700 mb-2">Nome Completo (confirme):</span>
                  <input type="text" value={nomeCompleto} onChange={(e) => setNomeCompleto(e.target.value)} className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" required />
                </label>
                <label className="flex flex-col md:col-span-2">
                  <span className="font-semibold text-gray-700 mb-2">Turma:</span>
                  <select value={turma} onChange={(e) => { setTurma(e.target.value); setDisciplina(''); setDisciplinaTerca(''); setDisciplinaQuinta(''); }} className="p-3 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" required>
                    <option value="">Selecione sua turma</option>
                    {turmas.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </label>
                {turma && (isTerceiraSerie ? (
                  <>
                    <label className="flex flex-col"><span className="font-semibold text-gray-700 mb-2">Opção de Terça-feira:</span><select value={disciplinaTerca} onChange={(e) => setDisciplinaTerca(e.target.value)} className="p-3 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" disabled={carregandoVagas || processando} required><option value="">{carregandoVagas ? 'Carregando...' : 'Selecione uma opção'}</option>{(disciplinasPorTurma[turma]?.terca || []).map(renderOption)}</select></label>
                    <label className="flex flex-col"><span className="font-semibold text-gray-700 mb-2">Opção de Quinta-feira:</span><select value={disciplinaQuinta} onChange={(e) => setDisciplinaQuinta(e.target.value)} className="p-3 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" disabled={carregandoVagas || processando} required><option value="">{carregandoVagas ? 'Carregando...' : 'Selecione uma opção'}</option>{(disciplinasPorTurma[turma]?.quinta || []).map(renderOption)}</select></label>
                  </>
                ) : (
                  <label className="flex flex-col md:col-span-2"><span className="font-semibold text-gray-700 mb-2">Escolha a disciplina:</span><select value={disciplina} onChange={(e) => setDisciplina(e.target.value)} className="p-3 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" disabled={carregandoVagas || processando} required><option value="">{carregandoVagas ? 'Carregando...' : 'Selecione uma disciplina'}</option>{(disciplinasPorTurma[turma] || []).map(renderOption)}</select></label>
                ))}
                <div className="md:col-span-2 flex justify-center mt-4">
                  <button type="submit" disabled={processando || !turma || mensagem.includes('sucesso')} className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-10 rounded-lg shadow-md flex items-center justify-center gap-2 transition-all disabled:bg-gray-400 disabled:cursor-not-allowed">
                    <Send size={20} />
                    {processando ? 'Enviando...' : 'Confirmar Inscrição'}
                  </button>
                </div>
              </form>
              {mensagem && (
                <div className={`mt-8 p-4 rounded-lg flex items-center justify-center gap-3 font-semibold text-center text-base ${erro ? 'bg-red-100 border border-red-300 text-red-800' : 'bg-green-100 border border-green-300 text-green-800'}`}>
                  {erro ? <AlertTriangle className="w-6 h-6" /> : <CheckCircle className="w-6 h-6" />}
                  <span>{mensagem}</span>
                </div>
              )}
            </main>
          </>
        )}
      </div>
      
      <footer>
          Desenvolvido por Prof. Dr. Felipe Damas Melo
      </footer>
    </div>
  );
};

export default App;