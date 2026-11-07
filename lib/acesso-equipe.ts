import { auth } from "./auth";

export async function verificarAcessoEquipe(
  cabecalhos: Headers,
): Promise<Response | null> {
  const sessao = await auth.api.getSession({ headers: cabecalhos });

  if (!sessao) {
    return Response.json({ erro: "Entre para continuar." }, { status: 401 });
  }

  if (sessao.user.role !== "admin") {
    return Response.json({ erro: "Acesso restrito à equipe." }, { status: 403 });
  }

  return null;
}