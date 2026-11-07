"use client";

import { useEffect, useState, type FormEvent } from "react";
import { horarioSecretaria } from "./informacoes-colegio";

type Mensagem = {
  autor: "Você" | "Darcilia AI" | "Atendente";
  texto: string;
};

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
  const [solicitando, setSolicitando] = useState(false);
  const [respostas, setRespostas] = useState<Mensagem[]>([]);
  const [mensagens, setMensagens] = useState<Mensagem[]>([
    {
      autor: "Darcilia AI",
      texto: "Olá! Você pode perguntar pelo horário da secretaria ou solicitar atendimento.",
    },
  ]);

  useEffect(() => {
    if (!protocolo) return;

    const controlador = new AbortController();
    const parametros = new URLSearchParams({ protocolo });
    const url = `/api/atendimentos/respostas?${parametros}`;
    let proximaConsulta: number | undefined;

    async function carregarRespostas() {
      try {
        const resposta = await fetch(url, {
          cache: "no-store",
          signal: controlador.signal,
        });

        if (!resposta.ok) {
          throw new Error("Falha ao consultar respostas.");
        }

        const historico: { texto: string }[] = await resposta.json();
        if (controlador.signal.aborted) return;

        setRespostas(
          historico.map(({ texto }) => ({ autor: "Atendente", texto })),
        );
        setErro("");
      } catch {
        if (!controlador.signal.aborted) {
          setErro("Não foi possível carregar as respostas. Tentando novamente.");
        }
      } finally {
        if (!controlador.signal.aborted) {
          proximaConsulta = window.setTimeout(carregarRespostas, 3000);
        }
      }
    }

    void carregarRespostas();

    return () => {
      controlador.abort();
      window.clearTimeout(proximaConsulta);
    };
  }, [protocolo]);

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();

    const texto = pergunta.trim();
    if (!texto || protocolo || solicitando) return;

    setMensagens((atuais) => [
      ...atuais,
      { autor: "Você", texto },
      { autor: "Darcilia AI", texto: responder(texto) },
    ]);
    setPergunta("");
  }

  async function solicitarAtendimento() {
    if (protocolo || solicitando) return;

    setSolicitando(true);
    setErro("");

    try {
      const resposta = await fetch("/api/atendimentos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assunto: "Atendimento solicitado pelo chat",
          mensagens: mensagens.slice(-50).map(({ autor, texto }) => ({
            autor: autor === "Você" ? "USUARIO" : "ASSISTENTE",
            texto,
          })),
        }),
      });

      const dados: { protocolo?: string; erro?: string } = await resposta.json();

      if (!resposta.ok || !dados.protocolo) {
        setErro(dados.erro ?? "Não foi possível registrar o atendimento.");
        return;
      }

      const novoProtocolo = dados.protocolo;

      setMensagens((atuais) => [
        ...atuais,
        {
          autor: "Darcilia AI",
          texto: `Solicitação registrada na fila da Secretaria. Protocolo: ${novoProtocolo}.`,
        },
      ]);
      setProtocolo(novoProtocolo);
    } catch {
      setErro("Não foi possível registrar o atendimento. Tente novamente.");
    } finally {
      setSolicitando(false);
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
              className={
                mensagem.autor === "Você" ? "mensagem usuario" : "mensagem"
              }
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
                  maxLength={4000}
                  disabled={solicitando}
                />
                <button
                  type="submit"
                  disabled={solicitando || !pergunta.trim()}
                >
                  Enviar
                </button>
              </div>
            </form>

            <div className="campo" style={{ marginTop: 12 }}>
              <button
                type="button"
                onClick={solicitarAtendimento}
                disabled={solicitando}
              >
                {solicitando ? "Registrando..." : "Falar com atendente"}
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