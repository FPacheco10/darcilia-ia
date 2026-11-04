import { randomUUID } from "node:crypto";
import { obterPrisma } from "../../../lib/prisma";

function mensagemValida(
  valor: unknown,
): valor is { autor: "USUARIO" | "ASSISTENTE"; texto: string } {
  if (typeof valor !== "object" || valor === null) return false;

  const mensagem = valor as Record<string, unknown>;

  return (
    (mensagem.autor === "USUARIO" || mensagem.autor === "ASSISTENTE") &&
    typeof mensagem.texto === "string" &&
    mensagem.texto.trim().length > 0 &&
    mensagem.texto.length <= 4000
  );
}

export async function POST(request: Request) {
  const corpo = await request.json().catch(() => null);
  const assunto = typeof corpo?.assunto === "string" ? corpo.assunto.trim() : "";
  const mensagens: unknown = corpo?.mensagens;

  if (
    !assunto ||
    assunto.length > 150 ||
    !Array.isArray(mensagens) ||
    mensagens.length < 1 ||
    mensagens.length > 50 ||
    !mensagens.every(mensagemValida)
  ) {
    return Response.json(
      { erro: "Informe um assunto e de 1 a 50 mensagens válidas." },
      { status: 400 },
    );
  }

  try {
    const atendimento = await obterPrisma().atendimento.create({
      data: {
        protocolo: `SEC-${randomUUID().toUpperCase()}`,
        setor: "SECRETARIA",
        assunto,
        mensagens: {
          create: mensagens.map(({ autor, texto }) => ({
            autor,
            texto: texto.trim(),
          })),
        },
      },
      select: {
        protocolo: true,
        setor: true,
        status: true,
        _count: { select: { mensagens: true } },
      },
    });

    return Response.json(atendimento, { status: 201 });
  } catch {
    return Response.json(
      { erro: "Não foi possível gravar o atendimento no banco." },
      { status: 500 },
    );
  }
}

export async function GET() {
  try {
    const atendimentos = await obterPrisma().atendimento.findMany({
      where: { setor: "SECRETARIA" },
      orderBy: [{ criadoEm: "desc" }, { id: "desc" }],
      take: 50,
      select: {
        protocolo: true,
        setor: true,
        assunto: true,
        status: true,
        criadoEm: true,
        mensagens: {
          orderBy: { id: "asc" },
          select: {
            autor: true,
            texto: true,
          },
        },
      },
    });

    return Response.json(atendimentos, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return Response.json(
      { erro: "Não foi possível consultar a fila da Secretaria." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  const corpo = await request.json().catch(() => null);
  const protocolo =
    typeof corpo?.protocolo === "string" ? corpo.protocolo.trim() : "";
  const acao = corpo?.acao;

  if (
    !/^SEC-[0-9A-F]{8}(?:-[0-9A-F]{4}){3}-[0-9A-F]{12}$/.test(protocolo) ||
    (acao !== "assumir" && acao !== "devolver")
  ) {
    return Response.json(
      { erro: "Informe um protocolo e uma ação válidos." },
      { status: 400 },
    );
  }

  const status = acao === "assumir" ? "EM_ATENDIMENTO_HUMANO" : "COM_ASSISTENTE";

  try {
    const resultado = await obterPrisma().atendimento.updateMany({
      where: {
        protocolo,
        setor: "SECRETARIA",
        status:
          acao === "assumir"
            ? { in: ["AGUARDANDO_ATENDENTE", "COM_ASSISTENTE"] }
            : "EM_ATENDIMENTO_HUMANO",
      },
      data: { status },
    });

    if (resultado.count === 0) {
      return Response.json(
        { erro: "O protocolo não existe ou o status atual não permite essa ação." },
        { status: 409 },
      );
    }

    return Response.json({ protocolo, status });
  } catch {
    return Response.json(
      { erro: "Não foi possível atualizar o atendimento no Neon." },
      { status: 500 },
    );
  }
}