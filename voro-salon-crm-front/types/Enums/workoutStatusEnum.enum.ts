export enum WorkoutStatusEnum {
  Unspecified = 0,
  Draft = 100,      // Em criação / rascunho
  Active = 200,     // Plano ativo para o aluno
  Paused = 300,     // Temporariamente pausado
  Finished = 400,   // Concluído / ciclo encerrado
  Archived = 500    // Histórico / não editável
}
