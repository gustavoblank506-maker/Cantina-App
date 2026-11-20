import { existsSync, readFileSync } from 'node:fs';
import { config } from './env.js';

/**
 * Matrículas que a escola autorizou a criar conta: um arquivo de texto com uma matrícula por linha.
 * Linhas vazias e as que começam com # são ignoradas. O arquivo fica em data/, fora do Git.
 * É lido a cada cadastro, então a secretaria pode atualizar a lista sem reiniciar o servidor.
 * Sem o arquivo, devolve null e o cadastro fica aberto (uso em demonstração).
 */
export function readStudentList() {
  if (!config.studentListFile || !existsSync(config.studentListFile)) return null;
  const lines = readFileSync(config.studentListFile, 'utf8').split(/\r?\n/);
  return new Set(lines.map((line) => line.trim().toLowerCase()).filter((line) => line && !line.startsWith('#')));
}
