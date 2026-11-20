// Escola atendida pelo app e opções do cadastro de alunos.
//
// Cursos técnicos do SENAI Alagoinhas no processo seletivo do 2º semestre de 2026, segundo
// https://guiadoscursos.com/senai-bahia-interior-feira-santana-alagoinhas-serrinha-1785-vagas-cursos-2026/
// A oferta muda a cada edital: confirme com a secretaria da unidade e atualize esta lista.
// "Aprendizagem Industrial" e "Outro curso" cobrem quem não está num curso técnico.
export const school = Object.freeze({
  name: 'SENAI Alagoinhas',
  courses: Object.freeze([
    'Administração',
    'Automação Industrial',
    'Desenvolvimento de Sistemas',
    'Eletromecânica',
    'Eletrotécnica',
    'Logística',
    'Planejamento e Controle da Produção',
    'Química',
    'Segurança do Trabalho',
    'Aprendizagem Industrial',
    'Outro curso',
  ]),
  shifts: Object.freeze(['Manhã', 'Tarde', 'Noite']),
});
