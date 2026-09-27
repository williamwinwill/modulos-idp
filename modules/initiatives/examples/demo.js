(() => {
  const C = globalThis.InitiativesCore;
  const month = (offset = 0) => {
    const date = new Date();
    date.setDate(1);
    date.setMonth(date.getMonth() + offset);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  };
  const record = (hours, saving, cost, tokens, quality, evidence) => ({
    hours: {value: hours, quality},
    saving: {value: saving, quality},
    cost: {value: cost, quality: 'Medido'},
    tokens: {value: tokens, quality: 'Estimado'},
    evidence
  });
  const current = month();
  const previous = month(-1);
  const updated = new Date().toLocaleDateString('pt-BR');

  globalThis.InitiativesDemo = {
    create() {
      const base = C.initial();
      base.items = [
        {
          id: 'demo-network-copilot',
          name: 'Copiloto de mudanças de rede',
          description: 'Prepara uma análise de impacto e uma lista de validações antes de mudanças planejadas na rede.',
          areas: ['Redes', 'DevOps'], kind: 'Agente', status: 'Em uso', owner: 'Plataforma de Redes',
          architecture: 'Fluxo demonstrativo: solicitação → análise de topologia → revisão humana.',
          model: 'Modelo genérico · demonstração', links: [], custom: {}, updated,
          metrics: {
            [current]: record(42, 1800, 260, 310000, 'Medido', 'Valores fictícios preparados para a demonstração.'),
            [previous]: record(35, 1450, 225, 274000, 'Estimado', 'Estimativas fictícias do mês anterior.')
          }
        },
        {
          id: 'demo-alert-triage',
          name: 'Classificador de alertas de infraestrutura',
          description: 'Agrupa alertas semelhantes e sugere a equipe responsável para reduzir triagem manual.',
          areas: ['Cloud', 'DevOps'], kind: 'Workflow com IA', status: 'Em desenvolvimento', owner: 'SRE',
          architecture: 'Eventos de observabilidade → agrupamento → sugestão para revisão da equipe.',
          model: 'Modelo genérico · demonstração', links: [], custom: {}, updated,
          metrics: {
            [current]: record(28, 900, 340, 185000, 'Estimado', 'Cenário hipotético para ilustrar o registro mensal.'),
            [previous]: record(19, 620, 290, 142000, 'Estimado', 'Estimativas fictícias do mês anterior.')
          }
        },
        {
          id: 'demo-ops-assistant',
          name: 'Assistente de documentação operacional',
          description: 'Ajuda a localizar procedimentos internos e a preparar rascunhos de documentação.',
          areas: ['Atlas'], kind: 'Assistente', status: 'Em avaliação', owner: 'Enablement',
          architecture: 'Busca simulada em documentos de exemplo com resposta revisada por uma pessoa.',
          model: 'Modelo genérico · demonstração', links: [], custom: {}, updated,
          metrics: {
            [current]: record(16, 480, 120, 96000, 'Estimado', 'Cenário hipotético, sem integração com documentação real.'),
            [previous]: record(12, 360, 105, 81000, 'Estimado', 'Estimativas fictícias do mês anterior.')
          }
        },
        {
          id: 'demo-portfolio-summary',
          name: 'Resumo executivo do portfólio',
          description: 'Organiza informações de iniciativas em um resumo de acompanhamento para reuniões.',
          areas: ['Atlas', 'DevOps'], kind: 'Skill', status: 'Ideia', owner: 'Engenharia',
          architecture: 'Entrada manual fictícia → organização de tópicos → revisão antes da apresentação.',
          model: 'Não definido', links: [], custom: {}, updated,
          metrics: {
            [current]: record(null, null, null, null, 'Estimado', 'Sem resultados medidos; esta linha ilustra dados ausentes.')
          }
        }
      ];
      return C.validate(base);
    }
  };
})();
