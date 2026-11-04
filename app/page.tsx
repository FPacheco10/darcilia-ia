"use client";

import { useState, type FormEvent } from "react";
import { horarioSecretaria } from "./informacoes-colegio";

type Mensagem = {
  autor: "Você" | "Darcilia AI";
  texto: string;
};

function responder(pergunta: string) {
  const texto = pergunta
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (/\b(horario|horarios|abre|fecha)\b/.test(texto)) {
    return  horarioSecretaria;
  }

  return "Ainda não tenho essa informação. Consulte a secretaria do colégio.";
}

export default function Home() {
  const [pergunta, setPergunta] = useState("");
  const [mensagens, setMensagens] = useState<Mensagem[]>([
    {
      autor: "Darcilia AI",
      texto: "Olá! Para testar, pergunte qual é o horário da secretaria.",
    },
  ]);

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();

    const texto = pergunta.trim();
    if (!texto) return;

    setMensagens((atuais) => [
      ...atuais,
      { autor: "Você", texto },
      { autor: "Darcilia AI", texto: responder(texto) },
    ]);
    setPergunta("");
  }

  return (
    <main className="pagina">
      <section className="chat" aria-labelledby="titulo">
        <header className="cabecalho">
          <h1 id="titulo">Darcilia AI</h1>
          <p>Colégio Darcilia Coimbra</p>
        </header>

        <div className="conversa" role="log" aria-label="Conversa">
          {mensagens.map((mensagem, indice) => (
            <div
              key={indice}
              className={mensagem.autor === "Você" ? "mensagem usuario" : "mensagem"}
            >
              <strong>{mensagem.autor}</strong>
              <p>{mensagem.texto}</p>
            </div>
          ))}
        </div>

        <form className="formulario" onSubmit={enviar}>
          <label htmlFor="pergunta">Sua pergunta</label>
          <div className="campo">
            <input
              id="pergunta"
              value={pergunta}
              onChange={(evento) => setPergunta(evento.target.value)}
              placeholder="Digite sua pergunta"
            />
            <button type="submit" disabled={!pergunta.trim()}>
              Enviar
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}