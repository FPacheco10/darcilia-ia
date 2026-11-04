"use client";

import { useEffect, useState, type FormEvent } from "react";
import { horarioSecretaria } from "./informacoes-colegio";

type Mensagem = {
  autor: "Você" | "Darcilia AI" | "Atendente";
  texto: string;
};

type Solicitacao = {
  protocolo: string;
  assunto: string;
  status: "Aguardando atendente";
  mensagens: Mensagem[];
};

const chaveFila = "darcilia-ai:fila-secretaria";
const chaveAlteracoes = "darcilia-ai:alteracoes-painel";

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
  const [respostas, setRespostas] = useState<Mensagem[]>([]);
  const [mensagens, setMensagens] = useState<Mensagem[]>([
    {
      autor: "Darcilia AI",
      texto: "Olá! Você pode perguntar pelo horário da secretaria ou solicitar atendimento.",
    },
  ]);

  useEffect(() => {
    if (!protocolo) return;

    const protocoloAtual = protocolo;

    function carregarRespostas() {
      try {
        const alteracoes: Record<string, { mensagens: Mensagem[] }> =
          JSON.parse(localStorage.getItem(chaveAlteracoes) ?? "{}");

        const historico = alteracoes[protocoloAtual]?.mensagens ?? [];

        setRespostas(
          historico.filter((mensagem) => mensagem.autor === "Atendente"),
        );
        setErro("");
      } catch {
        setErro("Não foi possível carregar as respostas do atendente.");
      }
    }

    function aoSalvarNoPainel(evento: StorageEvent) {
      if (evento.key === chaveAlteracoes) carregarRespostas();
    }

    window.addEventListener("storage", aoSalvarNoPainel);
    carregarRespostas();

    return () => window.removeEventListener("storage", aoSalvarNoPainel);
  }, [protocolo]);

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

    try {
      const novoProtocolo = `SEC-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

      const aviso: Mensagem = {
        autor: "Darcilia AI",
        texto: `Solicitação registrada na fila da Secretaria. Protocolo: ${novoProtocolo}.`,
      };

      const historico = [...mensagens, aviso];
      const fila: Solicitacao[] = JSON.parse(
        localStorage.getItem(chaveFila) ?? "[]",
      );

      const solicitacao: Solicitacao = {
        protocolo: novoProtocolo,
        assunto: "Atendimento solicitado pelo chat",
        status: "Aguardando atendente",
        mensagens: historico,
      };

      localStorage.setItem(chaveFila, JSON.stringify([...fila, solicitacao]));
      setMensagens(historico);
      setProtocolo(novoProtocolo);
    } catch {
      setErro("Não consegui registrar o atendimento neste navegador. Tente novamente.");
    }
  }

  const conversa = [...mensagens, ...respostas];

  return (
    <main className="pagina">
      <section className="chat" aria-labelledby="titulo">
        <header className="cabecalho">
          <h1 id="titulo">Darcilia AI</h1>
          <p>Colégio Darcilia Coimbra · Demonstração</p>
        </header>

        <div className="conversa" role="log" aria-label="Conversa">
          {conversa.map((mensagem, indice) => (
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
          </div>
        )}

        {erro && (
          <div className="formulario">
            <p role="alert">{erro}</p>
          </div>
        )}
      </section>
    </main>
  );
}