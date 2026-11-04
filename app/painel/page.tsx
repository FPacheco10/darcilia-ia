
"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { horarioSecretaria } from "../informacoes-colegio";

const evolucaoExemplo = [
  { dia: "Seg", total: 3 },
  { dia: "Ter", total: 6 },
  { dia: "Qua", total: 5 },
  { dia: "Qui", total: 9 },
  { dia: "Sex", total: 7 },
  { dia: "Sáb", total: 9 },
  { dia: "Dom", total: 8 },
];
const pontosEvolucao = evolucaoExemplo
  .map(({ total }, indice) => `${20 + indice * 60},${116 - total * 10}`)
  .join(" ");

const setores = ["Secretaria", "Financeiro"] as const;
type Setor = (typeof setores)[number];
type Atendimento = {
  protocolo: string;
  assunto: string;
  status: "Com o assistente" | "Aguardando atendente" | "Em atendimento humano";
  mensagens: { autor: string; texto: string }[];
};

const statusNeon = {
  COM_ASSISTENTE: "Com o assistente",
  AGUARDANDO_ATENDENTE: "Aguardando atendente",
  EM_ATENDIMENTO_HUMANO: "Em atendimento humano",
} as const;

const autoresNeon = {
  USUARIO: "Responsável",
  ASSISTENTE: "Darcilia AI",
  ATENDENTE: "Atendente",
} as const;

type AtendimentoNeon = {
  protocolo: string;
  assunto: string;
  status: keyof typeof statusNeon;
  mensagens: { autor: keyof typeof autoresNeon; texto: string }[];
};

const chaveFila = "darcilia-ai:fila-secretaria";
const chaveAlteracoes = "darcilia-ai:alteracoes-painel";
const iniciais: Record<Setor, Atendimento[]> = {
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

function lerAlteracoes(): Record<string, Atendimento> {
  return JSON.parse(localStorage.getItem(chaveAlteracoes) ?? "{}");
}

export default function Painel() {
  const [setor, setSetor] = useState<Setor>("Secretaria");
  const [filas, setFilas] = useState(iniciais);
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [erro, setErro] = useState("");
  const [filaNeon, setFilaNeon] = useState<Atendimento[]>([]);
  const [erroNeon, setErroNeon] = useState("");
  const [salvandoNeon, setSalvandoNeon] = useState(false);

  useEffect(() => {
    const controle = new AbortController();

    async function carregarFilaNeon() {
      try {
        const resposta = await fetch("/api/atendimentos", {
          cache: "no-store",
          signal: controle.signal,
        });
        if (!resposta.ok) throw new Error("Falha ao consultar a API.");

        const registros: AtendimentoNeon[] = await resposta.json();
        if (controle.signal.aborted) return;

        setFilaNeon(
          registros.map(({ protocolo, assunto, status, mensagens }) => ({
            protocolo,
            assunto,
            status: statusNeon[status],
            mensagens: mensagens.map(({ autor, texto }) => ({
              autor: autoresNeon[autor],
              texto,
            })),
          })),
        );
      } catch {
        if (!controle.signal.aborted) {
          setErroNeon("Não foi possível carregar os atendimentos do Neon.");
        }
      }
    }

    void carregarFilaNeon();
    return () => controle.abort();
  }, []);

  useEffect(() => {
    function carregar() {
      try {
        const pedidos: Atendimento[] = JSON.parse(localStorage.getItem(chaveFila) ?? "[]");
        const alteracoes = lerAlteracoes();
        const aplicar = (item: Atendimento) => alteracoes[item.protocolo] ?? item;

        setFilas({
          Secretaria: [...pedidos.reverse(), ...iniciais.Secretaria].map(aplicar),
          Financeiro: iniciais.Financeiro.map(aplicar),
        });
        setErro("");
      } catch {
        setErro("Não foi possível carregar os atendimentos salvos.");
      }
    }

    function sincronizar(evento: StorageEvent) {
      if (evento.key === chaveFila || evento.key === chaveAlteracoes || evento.key === null) {
        carregar();
      }
    }

    window.addEventListener("storage", sincronizar);
    carregar();
    return () => window.removeEventListener("storage", sincronizar);
  }, []);

  const protocolosNeon = new Set(filaNeon.map(({ protocolo }) => protocolo));
  const secretaria = [
    ...filaNeon,
    ...filas.Secretaria.filter(({ protocolo }) => !protocolosNeon.has(protocolo)),
  ];
  const filasVisiveis = { Secretaria: secretaria, Financeiro: filas.Financeiro };
  const atendimento = filasVisiveis[setor].find((item) => item.protocolo === selecionado);
  const veioDoNeon = setor === "Secretaria" && selecionado !== null && protocolosNeon.has(selecionado);
  const humano = atendimento?.status === "Em atendimento humano";
  const todos = [...secretaria, ...filas.Financeiro];
  const indicadores = [
    { titulo: "Total de atendimentos", valor: todos.length },
    ...(["Aguardando atendente", "Em atendimento humano", "Com o assistente"] as const).map(
      (status) => ({ titulo: status, valor: todos.filter((item) => item.status === status).length }),
    ),
  ];
  const percentual = todos.length ? (secretaria.length / todos.length) * 100 : 0;

  function atualizar(item: Atendimento, alterar: (atual: Atendimento) => Atendimento) {
    try {
      const alteracoes = lerAlteracoes();
      const atualizado = alterar(alteracoes[item.protocolo] ?? item);
      localStorage.setItem(
        chaveAlteracoes,
        JSON.stringify({ ...alteracoes, [item.protocolo]: atualizado }),
      );
      setFilas((atuais) => ({
        ...atuais,
        [setor]: atuais[setor].map((registro) =>
          registro.protocolo === item.protocolo ? atualizado : registro,
        ),
      }));
      setErro("");
      return true;
    } catch (falha) {
      setErro(
        falha instanceof Error && falha.message === "O status do atendimento mudou em outra aba."
          ? falha.message
          : "Não foi possível salvar a alteração neste navegador.",
      );
      return false;
    }
  }

  async function mudarStatusNeon(item: Atendimento) {
    if (salvandoNeon) return;

    setSalvandoNeon(true);
    setErroNeon("");

    try {
      const resposta = await fetch("/api/atendimentos", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          protocolo: item.protocolo,
          acao: item.status === "Em atendimento humano" ? "devolver" : "assumir",
        }),
      });

      if (resposta.status === 409) {
        setErroNeon("O status pode ter mudado em outra sessão. Recarregue o painel e tente novamente.");
        return;
      }

      if (!resposta.ok) throw new Error("Falha ao atualizar.");

      const resultado: { status: AtendimentoNeon["status"] } = await resposta.json();
      const status = statusNeon[resultado.status];
      if (!status) throw new Error("Status inválido.");

      setFilaNeon((atuais) =>
        atuais.map((registro) =>
          registro.protocolo === item.protocolo ? { ...registro, status } : registro,
        ),
      );
    } catch {
      setErroNeon("Não foi possível confirmar a alteração no Neon. Recarregue o painel antes de tentar novamente.");
    } finally {
      setSalvandoNeon(false);
    }
  }

  async function responder(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const formulario = evento.currentTarget;
    const texto = String(new FormData(formulario).get("resposta") ?? "").trim();
    if (!texto || !atendimento || !humano) return;

    if (veioDoNeon) {
      if (salvandoNeon) return;
      setSalvandoNeon(true);
      setErroNeon("");

      try {
        const resposta = await fetch("/api/atendimentos/respostas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ protocolo: atendimento.protocolo, texto }),
        });

        if (resposta.status === 409) {
          setErroNeon("O status mudou. Recarregue o painel antes de enviar.");
          return;
        }
        if (!resposta.ok) throw new Error("Falha ao salvar resposta.");

        const mensagem: { autor: "ATENDENTE"; texto: string } = await resposta.json();
        setFilaNeon((atuais) =>
          atuais.map((item) =>
            item.protocolo === atendimento.protocolo
              ? {
                  ...item,
                  mensagens: [...item.mensagens, {
                    autor: autoresNeon[mensagem.autor],
                    texto: mensagem.texto,
                  }],
                }
              : item,
          ),
        );
        formulario.reset();
      } catch {
        setErroNeon("Não foi possível confirmar o envio. Confira o histórico antes de tentar novamente.");
      } finally {
        setSalvandoNeon(false);
      }
      return;
    }

    const salvou = atualizar(atendimento, (atual) => {
      if (atual.status !== "Em atendimento humano") {
        throw new Error("O status do atendimento mudou em outra aba.");
      }
      return {
        ...atual,
        mensagens: [...atual.mensagens, { autor: "Atendente", texto }],
      };
    });
    if (salvou) formulario.reset();
  }

  return (
    <div className="cdc-painel">
      <aside className="cdc-lateral">
        <div className="cdc-marca">
          <span aria-hidden="true">CDC</span>
          <div><strong>Darcilia AI | CDC</strong><small>Colégio Darcilia Coimbra</small></div>
        </div>
        <nav aria-label="Menu do painel">
          <a href="#visao-geral">Visão geral</a>
          <a href="#fila-atendimento">Atendimentos</a>
          <a href="#atendimentos-por-setor">Setores</a>
        </nav>
        <div className="cdc-canais">
          <strong>Canais</strong>
          <small>Secretaria · Demonstração</small>
          <small>Financeiro · Demonstração</small>
        </div>
      </aside>

      <main className="cdc-conteudo" id="visao-geral">
        <header className="cdc-topo">
          <div>
            <h1>Olá, Felipe!</h1>
            <p>Painel de atendimento do Darcilia AI</p>
          </div>
          <span className="cdc-selo">Demonstração</span>
        </header>

        <section className="cdc-indicadores" aria-label="Indicadores">
          {indicadores.map(({ titulo, valor }) => (
            <div className="cdc-cartao cdc-indicador" key={titulo}>
              <strong>{valor}</strong>
              <span>{titulo}</span>
            </div>
          ))}
        </section>

        {erro && <p className="cdc-erro" role="alert">{erro}</p>}
        {erroNeon && <p className="cdc-erro" role="alert">{erroNeon}</p>}

        <div className="cdc-grade">
          <section className="cdc-cartao" aria-labelledby="atendimentos-por-setor">
            <h2 id="atendimentos-por-setor">Atendimentos por setor</h2>
            <div className="cdc-distribuicao">
              <div
                className="cdc-anel"
                aria-hidden="true"
                style={{ background: `conic-gradient(#087e87 ${percentual}%, #abe9e4 0)` }}
              >
                <strong>{todos.length}</strong>
              </div>
              <dl>
                {setores.map((opcao) => (
                  <div key={opcao}><dt>{opcao}</dt><dd>{filasVisiveis[opcao].length}</dd></div>
                ))}
              </dl>
            </div>
          </section>

          <section className="cdc-cartao" aria-labelledby="titulo-evolucao">
            <h2 id="titulo-evolucao">Evolução de atendimentos</h2>
            <p className="cdc-legenda">Semana ilustrativa · dados de demonstração</p>
            <svg
              className="cdc-grafico"
              viewBox="0 0 400 145"
              role="img"
              aria-label={evolucaoExemplo.map(({ dia, total }) => `${dia}: ${total}`).join(", ")}
            >
              {[16, 66, 116].map((y) => (
                <line key={y} x1="20" y1={y} x2="380" y2={y} stroke="#dce7ec" />
              ))}
              <polygon points={`20,116 ${pontosEvolucao} 380,116`} fill="#d5f2ef" />
              <polyline points={pontosEvolucao} fill="none" stroke="#087e87" strokeWidth="3" />
              {evolucaoExemplo.map(({ dia, total }, indice) => {
                const x = 20 + indice * 60;
                return (
                  <g key={dia}>
                    <circle cx={x} cy={116 - total * 10} r="4" fill="#087e87" />
                    <text x={x} y="137" textAnchor="middle" fill="#496074" fontSize="12">{dia}</text>
                  </g>
                );
              })}
            </svg>
          </section>

          <section className="cdc-cartao" aria-labelledby="fila-atendimento">
            <h2 id="fila-atendimento">Fila de atendimento</h2>
            <div className="cdc-botoes" role="group" aria-label="Setor de atendimento">
              {setores.map((opcao) => (
                <button
                  key={opcao}
                  type="button"
                  aria-pressed={setor === opcao}
                  onClick={() => {
                    setSetor(opcao);
                    setSelecionado(null);
                  }}
                >
                  {opcao}
                </button>
              ))}
            </div>
            <ul className="cdc-fila">
              {filasVisiveis[setor].map((item) => (
                <li key={item.protocolo}>
                  <button
                    type="button"
                    aria-pressed={selecionado === item.protocolo}
                    onClick={() => setSelecionado(item.protocolo)}
                  >
                    <strong>{item.protocolo} · {item.assunto}</strong>
                    <small>{item.status}</small>
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <section className="cdc-cartao" aria-labelledby="titulo-acoes">
            <h2 id="titulo-acoes">Ações rápidas</h2>
            <div className="cdc-acoes">
              {setores.map((opcao) => (
                <a
                  key={opcao}
                  href="#fila-atendimento"
                  onClick={() => {
                    setSetor(opcao);
                    setSelecionado(null);
                  }}
                >
                  Abrir fila de {opcao}
                </a>
              ))}
              <Link href="/">Abrir chat de demonstração</Link>
              <a href="#visao-geral">Ver indicadores</a>
            </div>
          </section>
        </div>

        {atendimento && (
          <section className="cdc-cartao cdc-conversa" aria-labelledby="titulo-conversa">
            <h2 id="titulo-conversa">Conversa {atendimento.protocolo}</h2>
            <p role="status">
              {atendimento.status}{humano && !veioDoNeon && " · Assistente pausado nesta simulação"}
            </p>
            <div className="cdc-historico" role="log" aria-label="Mensagens da conversa">
              {atendimento.mensagens.map((mensagem, indice) => (
                <div className="cdc-mensagem" key={indice}>
                  <strong>{mensagem.autor}</strong>
                  <p>{mensagem.texto}</p>
                </div>
              ))}
            </div>
            {humano && (
              <form className="cdc-formulario" key={atendimento.protocolo} onSubmit={responder}>
                <label htmlFor="resposta">Resposta do atendente</label>
                <div className="cdc-campo">
                  <input id="resposta" name="resposta" placeholder="Digite sua resposta" maxLength={4000} readOnly={veioDoNeon && salvandoNeon} required />
                  <button type="submit" disabled={veioDoNeon && salvandoNeon}>Enviar resposta</button>
                </div>
              </form>
            )}
            <button
              type="button"
              disabled={veioDoNeon && salvandoNeon}
              onClick={() => {
                if (veioDoNeon) {
                  void mudarStatusNeon(atendimento);
                  return;
                }

                atualizar(atendimento, (atual) => ({
                  ...atual,
                  status: humano ? "Com o assistente" : "Em atendimento humano",
                }));
              }}
            >
              {veioDoNeon && salvandoNeon
                ? "Salvando…"
                : humano
                  ? "Devolver ao assistente"
                  : "Assumir atendimento"}
            </button>
          </section>
        )}
      </main>

      <style>{`
        .cdc-painel { display:grid; grid-template-columns:235px minmax(0,1fr); min-height:100vh; background:#f4f7fa; color:#17243a; }
        .cdc-painel button { font:inherit; cursor:pointer; border:0; border-radius:8px; padding:10px 14px; background:#08727c; color:white; }
        .cdc-painel button:disabled { opacity:.55; cursor:default; }
        .cdc-painel :focus-visible { outline:3px solid #16aaa5; outline-offset:3px; }
        .cdc-lateral { display:flex; flex-direction:column; gap:28px; padding:26px 18px; background:linear-gradient(155deg,#062d3e,#075968); color:white; }
        .cdc-marca { display:flex; gap:10px; align-items:center; }
        .cdc-marca > span { display:grid; place-items:center; min-width:42px; min-height:42px; border:2px solid #91e1db; border-radius:50%; font-size:12px; font-weight:bold; }
        .cdc-lateral small { display:block; margin-top:5px; color:#c6e5e9; }
        .cdc-lateral nav { display:grid; gap:6px; }
        .cdc-lateral a { padding:11px 12px; border-radius:8px; color:inherit; text-decoration:none; }
        .cdc-lateral a:first-child,.cdc-lateral a:hover { background:#08727c; }
        .cdc-canais { margin-top:auto; padding:14px; border-radius:12px; background:#ffffff18; }
        .cdc-conteudo { min-width:0; padding:32px; }
        .cdc-topo { display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:12px; }
        .cdc-topo h1,.cdc-cartao h2 { margin:0; }
        .cdc-topo p { margin:6px 0 0; color:#496074; }
        .cdc-selo { padding:8px 12px; border-radius:20px; background:#d5f2ef; color:#075968; }
        .cdc-indicadores { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,155px),1fr)); gap:14px; margin:24px 0 16px; }
        .cdc-cartao { min-width:0; padding:18px; border:1px solid #dce7ec; border-radius:14px; background:white; box-shadow:0 2px 8px #17243a08; }
        .cdc-cartao h2 { font-size:1.1rem; }
        .cdc-indicador strong { display:block; margin-bottom:6px; color:#075968; font-size:1.75rem; }
        .cdc-grade { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1.4fr); gap:16px; align-items:start; }
        .cdc-distribuicao { display:flex; align-items:center; flex-wrap:wrap; gap:22px; margin-top:18px; }
        .cdc-anel { display:grid; place-items:center; width:112px; height:112px; border-radius:50%; }
        .cdc-anel strong { display:grid; place-items:center; width:80px; height:80px; border-radius:50%; background:white; font-size:1.5rem; }
        .cdc-distribuicao dl { flex:1; min-width:120px; }
        .cdc-distribuicao dl div { display:flex; justify-content:space-between; gap:10px; padding:6px 0; }
        .cdc-distribuicao dd { margin:0; font-weight:bold; }
        .cdc-botoes,.cdc-campo { display:flex; flex-wrap:wrap; gap:8px; margin-top:12px; }
        .cdc-botoes button[aria-pressed="false"] { background:#eaf3f5; color:#17243a; }
        .cdc-fila { display:grid; gap:8px; list-style:none; padding:0; margin:12px 0 0; }
        .cdc-fila button { display:block; width:100%; text-align:left; background:#eef5f7; color:#17243a; }
        .cdc-fila button[aria-pressed="true"] { background:#d1eeea; }
        .cdc-fila small { display:block; margin-top:4px; }
        .cdc-legenda { margin:6px 0 12px; color:#496074; font-size:.875rem; }
        .cdc-grafico { display:block; width:100%; max-height:190px; }
        .cdc-acoes { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,145px),1fr)); gap:10px; margin-top:12px; }
        .cdc-acoes a { display:grid; place-items:center; min-height:58px; padding:10px; border-radius:8px; background:#eef5f7; color:#075968; text-align:center; text-decoration:none; font-weight:600; }
        .cdc-acoes a:hover { background:#d1eeea; }
        .cdc-conversa { margin-top:16px; }
        .cdc-historico { display:grid; gap:8px; margin:16px 0; }
        .cdc-mensagem { width:fit-content; max-width:100%; padding:10px 14px; border-radius:10px; background:#eef5f7; overflow-wrap:anywhere; }
        .cdc-mensagem p { margin:5px 0 0; white-space:pre-wrap; }
        .cdc-formulario { margin-bottom:14px; }
        .cdc-campo input { flex:1 1 180px; min-width:0; padding:10px; border:1px solid #aebbd0; border-radius:8px; font:inherit; }
        .cdc-erro { color:#a22121; }
        @media(max-width:960px) { .cdc-grade { grid-template-columns:1fr; } }
        @media(max-width:720px) {
          .cdc-painel { grid-template-columns:1fr; }
          .cdc-lateral { gap:12px; }
          .cdc-lateral nav { display:flex; flex-wrap:wrap; }
          .cdc-conteudo { padding:20px 14px; }
        }
      `}</style>
    </div>
  );
}



