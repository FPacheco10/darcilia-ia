import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { verificarAcessoEquipe } from "../../lib/acesso-equipe";
import PainelAtendimento from "./PainelAtendimento";

async function PainelProtegido() {
  const bloqueio = await verificarAcessoEquipe(await headers());

  if (bloqueio) {
    redirect("/login");
  }

  return <PainelAtendimento />;
}

export default function PainelPage() {
  return (
    <Suspense fallback={<p>Verificando acesso ao painel...</p>}>
      <PainelProtegido />
    </Suspense>
  );
}