-- CreateEnum
CREATE TYPE "Setor" AS ENUM ('SECRETARIA', 'FINANCEIRO');

-- CreateEnum
CREATE TYPE "StatusAtendimento" AS ENUM ('COM_ASSISTENTE', 'AGUARDANDO_ATENDENTE', 'EM_ATENDIMENTO_HUMANO');

-- CreateEnum
CREATE TYPE "AutorMensagem" AS ENUM ('USUARIO', 'ASSISTENTE', 'ATENDENTE');

-- CreateTable
CREATE TABLE "Atendimento" (
    "id" TEXT NOT NULL,
    "protocolo" TEXT NOT NULL,
    "setor" "Setor" NOT NULL,
    "assunto" TEXT NOT NULL,
    "status" "StatusAtendimento" NOT NULL DEFAULT 'AGUARDANDO_ATENDENTE',
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Atendimento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mensagem" (
    "id" SERIAL NOT NULL,
    "atendimentoId" TEXT NOT NULL,
    "autor" "AutorMensagem" NOT NULL,
    "texto" TEXT NOT NULL,
    "criadaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Mensagem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Atendimento_protocolo_key" ON "Atendimento"("protocolo");

-- CreateIndex
CREATE INDEX "Mensagem_atendimentoId_id_idx" ON "Mensagem"("atendimentoId", "id");

-- AddForeignKey
ALTER TABLE "Mensagem" ADD CONSTRAINT "Mensagem_atendimentoId_fkey" FOREIGN KEY ("atendimentoId") REFERENCES "Atendimento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
