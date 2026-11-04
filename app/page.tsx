"use client";

import { useState, type FormEvent } from "react";
import { horarioSecretaria } from "./informacoes-colegio";

type Mensagem = {
  autor: "Você" | "Darcilia AI";
  texto: string;
};

const chaveFila = "darcilia-ai:fila-secretaria";

function responder(pergunta: string) {
  const texto = pergunta
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (/\b(horario|horarios|abre|fecha)\b/.test(texto)) {
    return horarioSecretaria;
  }

  return "Ainda não tenho essa informação. Você pode pedir atendimento à secretaria.";
}

export default function Home() {
  const [pergunta, setPergunta] = useState("");
  const [protocolo, setProtocolo] = useState<string | null>(null);
  const [erro, setErro] = useState("");
  const [mensagens, setMensagens] = useState<Mensagem[]>([
    {
      autor: "Darcilia AI",
      texto: "Olá! Você pode perguntar pelo horário da secretaria ou solicitar atendimento.",
    },
  ]);

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();

    const texto = pergunta.trim();
    if (!texto || protocolo) return;

    setMensagens((atuais) => [
      ...atuais,
      { autor: "Você", texto },
      { autor: "Darcilia AI", texto: responder(texto) },
    ]);
    setPergunta("");
  }

  function solicitarAtendimento() {
    if (protocolo) return;

    setErro("");

    const novoProtocolo = `SEC-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    const aviso: Mensagem = {
      autor: "Darcilia AI",
      texto: `Solicitação registrada na fila da Secretaria. Protocolo: ${novoProtocolo}.`,
    };
    const historico = [...mensagens, aviso];

    try {
      const fila = JSON.parse(localStorage.getItem(chaveFila) ?? "[]");

      localStorage.setItem(
        chaveFila,
        JSON.stringify([
          ...fila,
          {
            protocolo: novoProtocolo,
            assunto: "Atendimento solicitado pelo chat",
            status: "Aguardando atendente",
            mensagens: historico,
          },
        ]),
      );

      setMensagens(historico);
      setProtocolo(novoProtocolo);
    } catch {
      setErro("Não consegui registrar o atendimento neste navegador. Tente novamente.");
    }
  }

  return (
    <main className="pagina">
      <section className="chat" aria-labelledby="titulo">
        <header className="cabecalho">
          <h1 id="titulo">Darcilia AI</h1>
          <p>Colégio Darcilia Coimbra · Demonstração</p>
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

        {!protocolo && (
          <div className="formulario">
            <form onSubmit={enviar}>
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

            <div className="campo" style={{ marginTop: 12 }}>
              <button type="button" onClick={solicitarAtendimento}>
                Falar com atendente
              </button>
            </div>

            {erro && <p role="alert">{erro}</p>}
          </div>
        )}
      </section>
    </main>
  );
}