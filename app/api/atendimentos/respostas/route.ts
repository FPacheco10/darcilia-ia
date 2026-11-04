import { obterPrisma } from "../../../../lib/prisma";

export async function POST(request: Request) {
  const corpo = await request.json().catch(() => null);
  const protocolo =
    typeof corpo?.protocolo === "string" ? corpo.protocolo.trim() : "";
  const texto = typeof corpo?.texto === "string" ? corpo.texto.trim() : "";

  if (
    !/^SEC-[0-9A-F]{8}(?:-[0-9A-F]{4}){3}-[0-9A-F]{12}$/.test(protocolo) ||
    !texto ||
    texto.length > 4000
  ) {
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