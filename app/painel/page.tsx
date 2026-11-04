"use client";

import { useState, type FormEvent } from "react";
import { horarioSecretaria } from "../informacoes-colegio";

const setores = ["Secretaria", "Financeiro"] as const;
type Setor = (typeof setores)[number];

type Status =
  | "Com o assistente"
  | "Aguardando atendente"
  | "Em atendimento humano";

type Atendimento = {
  protocolo: string;
  assunto: string;
  status: Status;
  mensagens: { autor: string; texto: string }[];
};

const filasIniciais: Record<Setor, Atendimento[]> = {
  Secretaria: [
    {
      protocolo: "SEC-001",
      assunto: "Horário de atendimento",
      status: "Com o assistente",
      mensagens: [
        { autor: "Responsável", texto: "Qual é o horário da secretaria?" },
        { autor: "Darcilia AI", texto: horarioSecretaria },
      ],
    },
    {
      protocolo: "SEC-002",
      assunto: "Solicitação de declaração",
      status: "Aguardando atendente",
      mensagens: [
        { autor: "Responsável", texto: "Como solicito uma declaração escolar?" },
        { autor: "Darcilia AI", texto: "Vou encaminhar sua solicitação à secretaria." },
      ],
    },
  ],
  Financeiro: [
    {
      protocolo: "FIN-001",
      assunto: "Orientação sobre segunda via",
      status: "Aguardando atendente",
      mensagens: [
        { autor: "Responsável", texto: "Preciso de orientação sobre uma segunda via." },
        { autor: "Darcilia AI", texto: "Vou encaminhar seu pedido à equipe financeira." },
      ],
    },
  ],
};

export default function Painel() {
  const [setor, setSetor] = useState<Setor>("Secretaria");
  const [filas, setFilas] = useState(filasIniciais);
  const [protocoloSelecionado, setProtocoloSelecionado] = useState<string | null>(null);

  const atendimento = filas[setor].find(
    (item) => item.protocolo === protocoloSelecionado,
  );

  function trocarSetor(novoSetor: Setor) {
    setSetor(novoSetor);
    setProtocoloSelecionado(null);
  }

  function atualizarStatus(protocolo: string, status: Status) {
    setFilas((atuais) => ({
      ...atuais,
      [setor]: atuais[setor].map((item) =>
        item.protocolo === protocolo ? { ...item, status } : item,
      ),
    }));
  }

  function enviarResposta(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();

    const formulario = evento.currentTarget;
    const texto = String(new FormData(formulario).get("resposta") ?? "").trim();

    if (!texto || atendimento?.status !== "Em atendimento humano") return;

    const protocolo = atendimento.protocolo;

    setFilas((atuais) => ({
      ...atuais,
      [setor]: atuais[setor].map((item) =>
        item.protocolo === protocolo && item.status === "Em atendimento humano"
          ? {
              ...item,
              mensagens: [...item.mensagens, { autor: "Atendente", texto }],
            }
          : item,
      ),
    }));

    formulario.reset();
  }

  return (
    <main className="pagina">
      <section className="chat" aria-labelledby="titulo-painel">
        <header className="cabecalho" style={{ background: "#12444c" }}>
          <h1 id="titulo-painel">Darcilia AI | CDC</h1>
          <p>Painel de atendimento · Demonstração</p>
        </header>

        <div className="formulario">
          <div className="campo" role="group" aria-label="Setor de atendimento">
            {setores.map((opcao) => (
              <button
                key={opcao}
                type="button"
                aria-pressed={opcao === setor}
                onClick={() => trocarSetor(opcao)}
                style={{
                  background: opcao === setor ? "#0f766e" : "#edf2f8",
                  color: opcao === setor ? "#fff" : "#17243a",
                }}
              >
                {opcao}
              </button>
            ))}
          </div>

          <h2>Fila de atendimento</h2>

          <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: 12 }}>
            {filas[setor].map((item) => (
              <li key={item.protocolo} className="campo">
                <button
                  type="button"
                  aria-pressed={item.protocolo === protocoloSelecionado}
                  onClick={() => setProtocoloSelecionado(item.protocolo)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    background:
                      item.protocolo === protocoloSelecionado ? "#d1eeea" : "#edf2f8",
                    color: "#17243a",
                  }}
                >
                  <strong>{item.protocolo} · {item.assunto}</strong>
                  <br />
                  {item.status}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {atendimento && (
          <section className="formulario" aria-labelledby="titulo-conversa">
            <h2 id="titulo-conversa">Conversa {atendimento.protocolo}</h2>

            <p role="status">
              <strong>{atendimento.status}</strong>
              {atendimento.status === "Em atendimento humano" &&
                " · Assistente pausado nesta simulação"}
            </p>

            <div
              role="log"
              aria-label="Mensagens da conversa"
              style={{ display: "grid", gap: 8, marginBottom: 16 }}
            >
              {atendimento.mensagens.map((mensagem, indice) => (
                <div key={indice} className="mensagem">
                  <strong>{mensagem.autor}</strong>
                  <p>{mensagem.texto}</p>
                </div>
              ))}
            </div>

            {atendimento.status === "Em atendimento humano" && (
              <form
                key={atendimento.protocolo}
                onSubmit={enviarResposta}
                style={{ marginBottom: 16 }}
              >
                <label htmlFor="resposta">Resposta do atendente</label>
                <div className="campo">
                  <input
                    id="resposta"
                    name="resposta"
                    placeholder="Digite sua resposta"
                    required
                  />
                  <button type="submit">Enviar resposta</button>
                </div>
              </form>
            )}

            <div className="campo">
              {atendimento.status === "Em atendimento humano" ? (
                <button
                  type="button"
                  onClick={() => atualizarStatus(atendimento.protocolo, "Com o assistente")}
                >
                  Devolver ao assistente
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => atualizarStatus(atendimento.protocolo, "Em atendimento humano")}
                >
                  Assumir atendimento
                </button>
              )}
            </div>
          </section>
        )}
      </section>
    </main>
  );
}