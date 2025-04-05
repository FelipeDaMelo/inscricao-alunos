
import React, { useState } from "react";
import { db } from "./firebase";
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
} from "firebase/firestore";

function App() {
  const [nome, setNome] = useState("");
  const [turma, setTurma] = useState("");
  const [disciplina, setDisciplina] = useState("");
  const [email, setEmail] = useState("");
  const [mensagem, setMensagem] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!nome || !turma || !disciplina || !email) {
      setMensagem("Por favor, preencha todos os campos.");
      return;
    }

    if (!email.endsWith("@maristabrasil.g12.br")) {
      setMensagem("Use seu e-mail institucional @maristabrasil.g12.br.");
      return;
    }

    try {
      const q = query(
        collection(db, "inscricoes"),
        where("disciplina", "==", disciplina)
      );
      const snapshot = await getDocs(q);

      if (snapshot.size >= 35) {
        setMensagem("Número máximo de inscrições para essa disciplina foi atingido.");
        return;
      }

      await addDoc(collection(db, "inscricoes"), {
        nome,
        turma,
        disciplina,
        email,
        data: serverTimestamp(),
      });

      setMensagem("Inscrição realizada com sucesso!");
      setNome("");
      setTurma("");
      setDisciplina("");
      setEmail("");
    } catch (error) {
      console.error("Erro ao salvar:", error);
      setMensagem("Erro ao enviar inscrição. Tente novamente.");
    }
  };

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>Formulário de Inscrição</h1>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem", maxWidth: "400px" }}>
        <input
          type="text"
          placeholder="Nome Completo"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
        />
        <input
          type="text"
          placeholder="Turma (ex: 1A, 1B...)"
          value={turma}
          onChange={(e) => setTurma(e.target.value)}
        />
        <input
          type="text"
          placeholder="Disciplina (ex: Matemática Financeira)"
          value={disciplina}
          onChange={(e) => setDisciplina(e.target.value)}
        />
        <input
          type="email"
          placeholder="E-mail institucional"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button type="submit">Enviar</button>
      </form>
      {mensagem && <p>{mensagem}</p>}
    </div>
  );
}

export default App;
