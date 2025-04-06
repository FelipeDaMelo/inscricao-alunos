import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, addDoc, getDocs, serverTimestamp, query, where } from 'firebase/firestore';
import { emailsValidos } from './emailsValidos';
import logo from './logo-marista.png';
import { XCircle, CheckCircle, AlertTriangle } from 'lucide-react';

const App = () => {
  const [nomeCompleto, setNomeCompleto] = useState('');
  const [turma, setTurma] = useState('');
  const [email, setEmail] = useState('');
  const [disciplina, setDisciplina] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [erro, setErro] = useState(false);
  const [vagasDisponiveis, setVagasDisponiveis] = useState({});

  const disciplinas = [
    'Matemática Financeira',
    'Ciências da Natureza',
    'Ciências Humanas',
    'Inglês'
  ];

  const turmas = ['1A', '1B', '1C', '1D'];

  useEffect(() => {
    const fetchVagas = async () => {
      const inscricoesRef = collection(db, 'inscricoes');
      const snapshot = await getDocs(inscricoesRef);
      const contagem = {};
      disciplinas.forEach((disc) => (contagem[disc] = 0));
      snapshot.docs.forEach((doc) => {
        const { disciplina } = doc.data();
        if (contagem[disciplina] !== undefined) {
          contagem[disciplina]++;
        }
      });
      setVagasDisponiveis(contagem);
    };
    fetchVagas();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro(false);
    setMensagem('');

    if (!nomeCompleto || !turma || !email || !disciplina || disciplina === '') {
      setErro(true);
      setMensagem('Por favor, preencha todos os campos.');
      return;
    }

    const emailRegex = /^([0-9]+)@maristabrasil\.g12\.br$/;
    const match = email.match(emailRegex);

    if (!match) {
      setErro(true);
      setMensagem('Seu e-mail deve ser do domínio @maristabrasil.g12.br.');
      return;
    }

    const numero = match[1];
    if (!emailsValidos.includes(numero)) {
      setErro(true);
      setMensagem('Este e-mail institucional não está autorizado para inscrição.');
      return;
    }

    try {
      const inscricoesRef = collection(db, 'inscricoes');

      const snapshot = await getDocs(query(inscricoesRef, where('email', '==', email)));
      if (!snapshot.empty) {
        setErro(true);
        setMensagem('Este e-mail já foi utilizado para uma inscrição. É permitida apenas uma inscrição por aluno.');
        return;
      }

      const snapshotDisc = await getDocs(inscricoesRef);
      const inscricoesDaDisciplina = snapshotDisc.docs.filter(
        (doc) => doc.data().disciplina === disciplina
      );

      if (inscricoesDaDisciplina.length >= 35) {
        setErro(true);
        setMensagem(`As vagas para a disciplina "${disciplina}" já estão esgotadas.`);
        return;
      }

      await addDoc(inscricoesRef, {
        nome: nomeCompleto,
        turma,
        email,
        disciplina,
        timestamp: serverTimestamp()
      });

      setMensagem('Inscrição realizada com sucesso!');
      setNomeCompleto('');
      setTurma('');
      setEmail('');
      setDisciplina('');
      setErro(false);

      setVagasDisponiveis((prev) => ({
        ...prev,
        [disciplina]: prev[disciplina] + 1
      }));
    } catch (error) {
      setErro(true);
      setMensagem('Erro ao enviar inscrição. Tente novamente.');
    }
  };

  const handleExport = async () => {
    const inscricoesRef = collection(db, 'inscricoes');
    const snapshot = await getDocs(inscricoesRef);

    const dados = snapshot.docs.map((doc) => {
      const d = doc.data();
      const dataFormatada = d.timestamp?.toDate()?.toLocaleString('pt-BR') || '';
      return {
        'Hora da inscrição': dataFormatada,
        'Email institucional': d.email,
        'Nome': d.nome,
        'Turma': d.turma,
        'Disciplina': d.disciplina,
      };
    });

    const cabecalho = Object.keys(dados[0]);
    const linhas = dados.map((linha) => cabecalho.map((coluna) => `"${linha[coluna]}"`).join(';'));
    const csv = ['\uFEFF' + cabecalho.join(';'), ...linhas].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'inscricoes.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <header className="relative text-center mb-6">
        <img src={logo} alt="Colégio Marista Glória" className="absolute top-0 right-0 w-20 m-4" />
        <h1 className="text-3xl font-bold mb-2 mt-6">Formulário de Inscrição - Disciplina de Formação Interdisciplinar Optativa (1EM - 2º Semestre de 2025)</h1>
        <p className="text-gray-700 max-w-4xl mx-auto text-sm">
          <strong>Caro estudante da 1ª Série do Ensino Médio,</strong><br /><br />
          Seja bem-vindo ao formulário de inscrição para a Disciplina de Formação Interdisciplinar Optativa do segundo semestre de 2025. Este é um passo importante para personalizar sua experiência acadêmica e explorar áreas de interesse específicas. Por favor, leia atentamente as instruções abaixo antes de preencher o formulário.<br /><br />
          <strong>Instruções:</strong><br />
          - Nome Completo: Preencha seu nome completo para identificação.<br />
          - Turma: Indique a turma à qual pertence.<br />
          - Email institucional - Entre com seu email @maristabrasil.g12.br<br />
          - Escolha da Disciplina: Selecione a disciplina que deseja cursar neste 2º semestre de 2025. <br />
          Observe que, caso a disciplina escolhida atinja o número máximo de alunos, ela aparecerá na lista como ‘(Esgotado)’ e não poderá ser selecionada.<br /><br />
          <strong>Observações Importantes:</strong><br />
          Cada estudante pode escolher apenas uma disciplina.<br />
          A disciplina deve ser diferente da opção escolhida no primeiro semestre.<br />
          A escolha é definitiva e não poderá ser modificada após o envio do formulário.<br />
          Certifique-se de que sua opção está de acordo com seus interesses e objetivos acadêmicos.<br /><br />
          Agradecemos sua participação e desejamos um semestre acadêmico produtivo e enriquecedor!<br /><br />
          <em>Ensino Médio/Colégio Marista Glória</em>
        </p>
      </header>

      <main className="bg-white shadow-md rounded-2xl p-6 w-full max-w-3xl mx-auto">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="flex flex-col">
            Nome Completo:
            <input type="text" value={nomeCompleto} onChange={(e) => setNomeCompleto(e.target.value)} className="mt-1 p-2 border rounded" />
          </label>
          <label className="flex flex-col">
            Turma:
            <select value={turma} onChange={(e) => setTurma(e.target.value)} className="mt-1 p-2 border rounded">
              <option value="">--- Selecione sua turma ---</option>
              {turmas.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col">
            Email institucional:
            <input type="email" placeholder="nºdeMatricula@maristabrasil.g12.br" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 p-2 border rounded" />
          </label>
          <label className="flex flex-col">
            Escolha a disciplina:
            <select value={disciplina} onChange={(e) => setDisciplina(e.target.value)} className="mt-1 p-2 border rounded">
              <option value="">--- Selecione sua disciplina ---</option>
              {disciplinas.map((disc) => {
                const esgotado = vagasDisponiveis[disc] >= 35;
                return (
                  <option key={disc} value={disc} disabled={esgotado}>
                    {disc} {esgotado ? '(Esgotado)' : ''}
                  </option>
                );
              })}
            </select>
          </label>
          <div className="md:col-span-2 flex justify-center">
            <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-xl mt-4 shadow">
              Inscrever
            </button>
          </div>
        </form>

        {mensagem && (
          <div className={`mt-6 flex items-center justify-center gap-2 font-semibold text-center text-sm md:text-base
            ${erro && mensagem.includes('esgotadas') ? 'text-orange-500' : ''}
            ${erro && mensagem.includes('utilizado') ? 'text-orange-500' : ''}
            ${erro && !mensagem.includes('esgotadas') && !mensagem.includes('utilizado') ? 'text-red-600' : ''}
            ${!erro ? 'text-green-600' : ''}
          `}>
            {erro && mensagem.includes('esgotadas') && <AlertTriangle className="w-5 h-5" />}
            {erro && mensagem.includes('utilizado') && <AlertTriangle className="w-5 h-5" />}
            {erro && !mensagem.includes('esgotadas') && !mensagem.includes('utilizado') && <XCircle className="w-5 h-5" />}
            {!erro && <CheckCircle className="w-5 h-5" />}
            <span>{mensagem}</span>
          </div>
        )}

        {email === 'felipe.damas@maristabrasil.org' && (
          <div className="mt-6 text-center">
            <button
              onClick={handleExport}
              className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-xl shadow"
            >
              Exportar para Excel (CSV)
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
