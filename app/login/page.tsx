"use client";

import { createAuthClient } from "better-auth/react";
import { useState, type FormEvent } from "react";

const clienteAuth = createAuthClient();

export default function LoginPage() {
  const [erro, setErro] = useState("");
  const [entrando, setEntrando] = useState(false);

  async function entrar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (entrando) return;

    const campos = new FormData(evento.currentTarget);
    const email = String(campos.get("email") ?? "").trim();
    const password = String(campos.get("senha") ?? "");

    setErro("");
    setEntrando(true);

    try {
      const { error } = await clienteAuth.signIn.email({
        email,
        password,
        rememberMe: false,
      });

      if (error) {
        setErro(
          error.status === 401
            ? "E-mail ou senha inválidos."
            : "Não foi possível entrar. Tente novamente.",
        );
        return;
      }

      window.location.assign("/painel");
    } catch {
      setErro("Não foi possível conectar ao servidor. Tente novamente.");
    } finally {
      setEntrando(false);
    }
  }

  return (
    <main className="pagina">
      <section className="chat" aria-labelledby="titulo-login">
        <header className="cabecalho">
          <h1 id="titulo-login">Acesso da equipe</h1>
          <p>Darcilia AI · Colégio Darcilia Coimbra</p>
        </header>

        <div className="formulario">
          <form onSubmit={entrar}>
            <label htmlFor="email">E-mail</label>
            <div className="campo">
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="username"
                required
              />
            </div>

            <label htmlFor="senha">Senha</label>
            <div className="campo">
              <input
                id="senha"
                name="senha"
                type="password"
                autoComplete="current-password"
                required
              />
            </div>

            <div className="campo" style={{ marginTop: 12 }}>
              <button type="submit" disabled={entrando}>
                {entrando ? "Entrando..." : "Entrar"}
              </button>
            </div>

            {erro && <p role="alert">{erro}</p>}
          </form>
        </div>
      </section>
    </main>
  );
}