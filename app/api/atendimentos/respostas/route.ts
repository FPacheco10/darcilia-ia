import { verificarAcessoEquipe } from "../../../../lib/acesso-equipe";
import { obterPrisma } from "../../../../lib/prisma";

const formatoProtocolo = /^SEC-[0-9A-F]{8}(?:-[0-9A-F]{4}){3}-[0-9A-F]{12}$/;

export async function GET(request: Request) {
  const protocolo = new URL(request.url).searchParams.get("protocolo") ?? "";

  if (!formatoProtocolo.test(protocolo)) {
    return Response.json(
      { erro: "Informe um protocolo válido." },
      { status: 400 },
    );
  }

  try {
    const atendimento = await obterPrisma().atendimento.findUnique({
      where: { protocolo, setor: "SECRETARIA" },
      select: {
        mensagens: {
          where: { autor: "ATENDENTE" },
          orderBy: { id: "asc" },
          select: { texto: true },
        },
      },
    });

    if (!atendimento) {
      return Response.json(
        { erro: "Atendimento não encontrado." },
        { status: 404 },
      );
    }

    return Response.json(atendimento.mensagens, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return Response.json(
      { erro: "Não foi possível consultar as respostas do atendente." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const bloqueio = await verificarAcessoEquipe(request.headers);
  if (bloqueio) return bloqueio;

  const corpo = await request.json().catch(() => null);
  const protocolo =
    typeof corpo?.protocolo === "string" ? corpo.protocolo.trim() : "";
  const texto = typeof corpo?.texto === "string" ? corpo.texto.trim() : "";

  if (!formatoProtocolo.test(protocolo) || !texto || texto.length > 4000) {
    return Response.json(
      { erro: "Informe um protocolo válido e uma resposta de até 4.000 caracteres." },
      { status: 400 },
    );
  }

  try {
    await obterPrisma().atendimento.update({
      where: {
        protocolo,
        setor: "SECRETARIA",
        status: "EM_ATENDIMENTO_HUMANO",
      },
      data: {
        mensagens: {
          create: { autor: "ATENDENTE", texto },
        },
      },
      select: { protocolo: true },
    });

    return Response.json({ autor: "ATENDENTE", texto }, { status: 201 });
  } catch (erro) {
    if (
      typeof erro === "object" &&
      erro !== null &&
      "code" in erro &&
      erro.code === "P2025"
    ) {
      return Response.json(
        { erro: "O protocolo precisa estar em atendimento humano." },
        { status: 409 },
      );
    }

    return Response.json(
      { erro: "Não foi possível salvar a resposta no Neon." },
      { status: 500 },
    );
  }
}