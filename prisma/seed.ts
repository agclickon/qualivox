import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

function daysAgo(days: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d
}

function hoursAgo(hours: number): Date {
  const d = new Date()
  d.setHours(d.getHours() - hours)
  return d
}

async function main() {
  console.log("🚀 Iniciando seed com dados mock para apresentação...\n")

  // Limpar dados existentes (ordem importa por causa das foreign keys)
  await prisma.message.deleteMany()
  await prisma.conversation.deleteMany()
  await prisma.aiAnalysis.deleteMany()
  await prisma.interaction.deleteMany()
  await prisma.automationLog.deleteMany()
  await prisma.automation.deleteMany()
  await prisma.notification.deleteMany()
  await prisma.chatMessage.deleteMany()
  await prisma.lgpdConsent.deleteMany()
  await prisma.auditLog.deleteMany()
  await prisma.messageTemplate.deleteMany()
  await prisma.lead.deleteMany()
  await prisma.pipelineStage.deleteMany()
  await prisma.refreshToken.deleteMany()
  await prisma.user.deleteMany()
  await (prisma.whatsappConnection as any).deleteMany()
  await prisma.setting.deleteMany()

  console.log("  Banco limpo.")

  // ══════════════════════════════════════════
  // 1. USUÁRIOS
  // ══════════════════════════════════════════
  const passwordHash = await bcrypt.hash("admin123", 10)

  const admin = await prisma.user.create({
    data: {
      id: "user-admin",
      email: "admin@leadflow.com",
      passwordHash,
      name: "Rafael Costa",
      role: "super_admin",
      phone: "(11) 99999-0000",
      emailVerified: true,
    },
  })

  const vendedor1 = await prisma.user.create({
    data: {
      id: "user-vendedor1",
      email: "lucas@leadflow.com",
      passwordHash,
      name: "Lucas Mendes",
      role: "admin",
      phone: "(11) 98765-4321",
      emailVerified: true,
    },
  })

  const vendedor2 = await prisma.user.create({
    data: {
      id: "user-vendedor2",
      email: "ana@leadflow.com",
      passwordHash,
      name: "Ana Beatriz Silva",
      role: "user",
      phone: "(21) 97654-3210",
      emailVerified: true,
    },
  })

  const vendedor3 = await prisma.user.create({
    data: {
      id: "user-vendedor3",
      email: "carlos@leadflow.com",
      passwordHash,
      name: "Carlos Eduardo",
      role: "user",
      phone: "(31) 96543-2109",
      emailVerified: true,
    },
  })

  console.log("  ✅ 4 usuários criados (admin + 3 vendedores)")

  // ══════════════════════════════════════════
  // 2. PIPELINE STAGES
  // ══════════════════════════════════════════
  const stages = [
    { id: "stage-1", name: "Novo Lead", order: 1, color: "#3B82F6", isDefault: true },
    { id: "stage-2", name: "Contatado", order: 2, color: "#8B5CF6", isDefault: false },
    { id: "stage-3", name: "Qualificado", order: 3, color: "#10B981", isDefault: false },
    { id: "stage-4", name: "Em Negociação", order: 4, color: "#F59E0B", isDefault: false },
    { id: "stage-5", name: "Proposta Enviada", order: 5, color: "#EC4899", isDefault: false },
    { id: "stage-6", name: "Fechado (Ganho)", order: 6, color: "#22C55E", isDefault: false },
    { id: "stage-7", name: "Fechado (Perdido)", order: 7, color: "#EF4444", isDefault: false },
  ]

  for (const stage of stages) {
    await prisma.pipelineStage.create({ data: stage })
  }

  console.log("  ✅ 7 estágios do pipeline criados")

  // ══════════════════════════════════════════
  // 3. LEADS (15 leads variados)
  // ══════════════════════════════════════════
  const leads = [
    {
      id: "lead-01",
      name: "Maria Fernanda Oliveira",
      email: "maria.fernanda@techcorp.com.br",
      phone: "(11) 98888-1111",
      whatsappNumber: "5511988881111",
      status: "qualificado",
      score: 85,
      qualificationLevel: "quente",
      source: "website",
      companyName: "TechCorp Brasil",
      position: "Diretora de Marketing",
      budgetCents: 1500000,
      urgency: "alta",
      tags: JSON.stringify(["enterprise", "marketing", "urgente"]),
      notes: "Interessada em automação de marketing. Budget aprovado para Q1. Decisora.",
      assignedToId: vendedor1.id,
      pipelineStageId: "stage-4",
      createdAt: daysAgo(12),
      lastInteraction: hoursAgo(3),
    },
    {
      id: "lead-02",
      name: "João Pedro Santos",
      email: "joao.pedro@inovasaude.com",
      phone: "(21) 97777-2222",
      whatsappNumber: "5521977772222",
      status: "em_negociacao",
      score: 92,
      qualificationLevel: "quente",
      source: "indicacao",
      companyName: "InovaSaúde",
      position: "CEO",
      budgetCents: 3500000,
      urgency: "critica",
      tags: JSON.stringify(["saude", "CEO", "grande-porte"]),
      notes: "Indicado pelo Dr. Roberto. Quer implementar CRM completo para 200 médicos. Reunião agendada sexta.",
      assignedToId: admin.id,
      pipelineStageId: "stage-5",
      createdAt: daysAgo(8),
      lastInteraction: hoursAgo(1),
    },
    {
      id: "lead-03",
      name: "Carla Rodrigues",
      email: "carla@startuphub.io",
      phone: "(11) 96666-3333",
      whatsappNumber: "5511966663333",
      status: "contatado",
      score: 65,
      qualificationLevel: "morno",
      source: "rede_social",
      companyName: "StartupHub",
      position: "Head of Growth",
      budgetCents: 500000,
      urgency: "media",
      tags: JSON.stringify(["startup", "growth", "SaaS"]),
      notes: "Viu nosso post no LinkedIn. Interessada mas quer comparar com concorrentes.",
      assignedToId: vendedor2.id,
      pipelineStageId: "stage-2",
      createdAt: daysAgo(5),
      lastInteraction: hoursAgo(8),
    },
    {
      id: "lead-04",
      name: "Roberto Almeida",
      email: "roberto@construtora-abc.com.br",
      phone: "(31) 95555-4444",
      whatsappNumber: "5531955554444",
      status: "novo",
      score: 40,
      qualificationLevel: "frio",
      source: "whatsapp",
      companyName: "Construtora ABC",
      position: "Gerente Comercial",
      budgetCents: null,
      urgency: "baixa",
      tags: JSON.stringify(["construcao", "primeiro-contato"]),
      notes: "Mandou mensagem pelo WhatsApp perguntando sobre preços.",
      assignedToId: null,
      pipelineStageId: "stage-1",
      createdAt: daysAgo(1),
      lastInteraction: hoursAgo(5),
    },
    {
      id: "lead-05",
      name: "Fernanda Lima",
      email: "fernanda@educaplus.com.br",
      phone: "(41) 94444-5555",
      whatsappNumber: "5541944445555",
      status: "fechado_ganho",
      score: 98,
      qualificationLevel: "quente",
      source: "evento",
      companyName: "EducaPlus",
      position: "COO",
      budgetCents: 2000000,
      urgency: "alta",
      tags: JSON.stringify(["educacao", "fechado", "case-sucesso"]),
      notes: "Contrato assinado! Implementação começa segunda. 50 licenças.",
      assignedToId: vendedor1.id,
      pipelineStageId: "stage-6",
      createdAt: daysAgo(30),
      lastInteraction: daysAgo(2),
    },
    {
      id: "lead-06",
      name: "André Souza",
      email: "andre@logistica360.com",
      phone: "(51) 93333-6666",
      whatsappNumber: "5551933336666",
      status: "fechado_perdido",
      score: 55,
      qualificationLevel: "morno",
      source: "telefone",
      companyName: "Logística 360",
      position: "Diretor de TI",
      budgetCents: 800000,
      urgency: "baixa",
      tags: JSON.stringify(["logistica", "perdido"]),
      notes: "Escolheu concorrente por preço. Manter contato para futuro.",
      assignedToId: vendedor3.id,
      pipelineStageId: "stage-7",
      createdAt: daysAgo(45),
      lastInteraction: daysAgo(15),
    },
    {
      id: "lead-07",
      name: "Patricia Mendes",
      email: "patricia@modaexpress.com.br",
      phone: "(11) 92222-7777",
      whatsappNumber: "5511922227777",
      status: "proposta_enviada",
      score: 78,
      qualificationLevel: "quente",
      source: "website",
      companyName: "Moda Express",
      position: "Gerente de E-commerce",
      budgetCents: 1200000,
      urgency: "alta",
      tags: JSON.stringify(["ecommerce", "moda", "proposta"]),
      notes: "Proposta enviada dia 15. Aguardando aprovação do financeiro.",
      assignedToId: vendedor2.id,
      pipelineStageId: "stage-5",
      createdAt: daysAgo(18),
      lastInteraction: daysAgo(3),
    },
    {
      id: "lead-08",
      name: "Thiago Barros",
      email: "thiago@fintech-pay.com",
      phone: "(11) 91111-8888",
      whatsappNumber: "5511911118888",
      status: "qualificado",
      score: 72,
      qualificationLevel: "morno",
      source: "indicacao",
      companyName: "FintechPay",
      position: "CTO",
      budgetCents: 2500000,
      urgency: "media",
      tags: JSON.stringify(["fintech", "tecnologia", "API"]),
      notes: "Precisa de integração via API. Quer demo técnica.",
      assignedToId: admin.id,
      pipelineStageId: "stage-3",
      createdAt: daysAgo(7),
      lastInteraction: hoursAgo(12),
    },
    {
      id: "lead-09",
      name: "Juliana Costa",
      email: "juliana@petshop-amigo.com.br",
      phone: "(19) 90000-9999",
      whatsappNumber: "5519900009999",
      status: "novo",
      score: 30,
      qualificationLevel: "frio",
      source: "whatsapp",
      companyName: "PetShop Amigo",
      position: "Proprietária",
      budgetCents: null,
      urgency: "baixa",
      tags: JSON.stringify(["petshop", "pequena-empresa"]),
      notes: "Perguntou sobre plano básico. Empresa pequena, 3 funcionários.",
      assignedToId: null,
      pipelineStageId: "stage-1",
      createdAt: daysAgo(0),
      lastInteraction: hoursAgo(2),
    },
    {
      id: "lead-10",
      name: "Marcos Vinícius",
      email: "marcos@agencia-digital.com",
      phone: "(11) 98000-1010",
      whatsappNumber: "5511980001010",
      status: "contatado",
      score: 58,
      qualificationLevel: "morno",
      source: "rede_social",
      companyName: "Agência Digital Pro",
      position: "Sócio-fundador",
      budgetCents: 700000,
      urgency: "media",
      tags: JSON.stringify(["agencia", "digital", "revenda"]),
      notes: "Quer revender para clientes dele. Modelo white-label.",
      assignedToId: vendedor3.id,
      pipelineStageId: "stage-2",
      createdAt: daysAgo(4),
      lastInteraction: hoursAgo(6),
    },
    {
      id: "lead-11",
      name: "Beatriz Nakamura",
      email: "beatriz@clinica-sorriso.com",
      phone: "(11) 97000-1111",
      whatsappNumber: "5511970001111",
      status: "em_negociacao",
      score: 80,
      qualificationLevel: "quente",
      source: "indicacao",
      companyName: "Clínica Sorriso",
      position: "Diretora Administrativa",
      budgetCents: 900000,
      urgency: "alta",
      tags: JSON.stringify(["saude", "clinica", "indicacao"]),
      notes: "Indicada pela Fernanda da EducaPlus. Quer para 3 unidades.",
      assignedToId: vendedor1.id,
      pipelineStageId: "stage-4",
      createdAt: daysAgo(6),
      lastInteraction: hoursAgo(4),
    },
    {
      id: "lead-12",
      name: "Diego Ferreira",
      email: "diego@autoparts.com.br",
      phone: "(47) 96000-1212",
      whatsappNumber: "5547960001212",
      status: "novo",
      score: 25,
      qualificationLevel: "nao_qualificado",
      source: "email",
      companyName: "AutoParts SC",
      position: "Vendedor",
      budgetCents: null,
      urgency: "baixa",
      tags: JSON.stringify(["automotivo", "novo"]),
      notes: "Respondeu um email marketing. Ainda não qualificado.",
      assignedToId: null,
      pipelineStageId: "stage-1",
      createdAt: daysAgo(0),
      lastInteraction: null,
    },
    {
      id: "lead-13",
      name: "Camila Duarte",
      email: "camila@restaurante-sabor.com",
      phone: "(11) 95000-1313",
      whatsappNumber: "5511950001313",
      status: "fechado_ganho",
      score: 95,
      qualificationLevel: "quente",
      source: "website",
      companyName: "Restaurante Sabor & Arte",
      position: "Proprietária",
      budgetCents: 450000,
      urgency: "media",
      tags: JSON.stringify(["gastronomia", "fechado", "PME"]),
      notes: "Plano básico contratado. Muito satisfeita com o onboarding.",
      assignedToId: vendedor2.id,
      pipelineStageId: "stage-6",
      createdAt: daysAgo(25),
      lastInteraction: daysAgo(5),
    },
    {
      id: "lead-14",
      name: "Ricardo Gomes",
      email: "ricardo@imobiliaria-prime.com",
      phone: "(21) 94000-1414",
      whatsappNumber: "5521940001414",
      status: "qualificado",
      score: 70,
      qualificationLevel: "morno",
      source: "telefone",
      companyName: "Imobiliária Prime",
      position: "Diretor Comercial",
      budgetCents: 1800000,
      urgency: "media",
      tags: JSON.stringify(["imobiliario", "grande-porte"]),
      notes: "Tem 15 corretores. Quer gerenciar leads de imóveis.",
      assignedToId: vendedor3.id,
      pipelineStageId: "stage-3",
      createdAt: daysAgo(10),
      lastInteraction: daysAgo(1),
    },
    {
      id: "lead-15",
      name: "Amanda Torres",
      email: "amanda@escola-futuro.edu.br",
      phone: "(11) 93000-1515",
      whatsappNumber: "5511930001515",
      status: "contatado",
      score: 50,
      qualificationLevel: "morno",
      source: "evento",
      companyName: "Escola do Futuro",
      position: "Coordenadora Pedagógica",
      budgetCents: 350000,
      urgency: "baixa",
      tags: JSON.stringify(["educacao", "escola"]),
      notes: "Conheceu no evento EduTech. Quer para gestão de matrículas.",
      assignedToId: vendedor2.id,
      pipelineStageId: "stage-2",
      createdAt: daysAgo(3),
      lastInteraction: hoursAgo(10),
    },
  ]

  for (const lead of leads) {
    await prisma.lead.create({ data: lead })
  }

  console.log("  ✅ 15 leads criados")

  // ══════════════════════════════════════════
  // 4. INTERAÇÕES
  // ══════════════════════════════════════════
  const interactions = [
    { leadId: "lead-01", userId: vendedor1.id, type: "chamada", content: "Ligação de 15min. Maria confirmou interesse e budget aprovado.", channel: "telefone", createdAt: daysAgo(10) },
    { leadId: "lead-01", userId: vendedor1.id, type: "reuniao", content: "Demo online realizada. Muito impressionada com o Kanban e IA.", channel: "video", createdAt: daysAgo(6) },
    { leadId: "lead-01", userId: vendedor1.id, type: "mensagem", content: "Enviou proposta comercial por email.", channel: "email", createdAt: daysAgo(3) },
    { leadId: "lead-02", userId: admin.id, type: "reuniao", content: "Reunião presencial na sede da InovaSaúde. Apresentação completa.", channel: "presencial", createdAt: daysAgo(5) },
    { leadId: "lead-02", userId: admin.id, type: "mensagem", content: "Proposta de R$35k enviada. Aguardando aprovação do conselho.", channel: "email", createdAt: daysAgo(3) },
    { leadId: "lead-03", userId: vendedor2.id, type: "mensagem", content: "Primeiro contato via DM do Instagram. Agendou call.", channel: "rede_social", createdAt: daysAgo(4) },
    { leadId: "lead-05", userId: vendedor1.id, type: "reuniao", content: "Reunião de kickoff! Contrato assinado, 50 licenças.", channel: "video", createdAt: daysAgo(2) },
    { leadId: "lead-07", userId: vendedor2.id, type: "mensagem", content: "Follow-up da proposta. Patricia disse que financeiro analisa semana que vem.", channel: "whatsapp", createdAt: daysAgo(3) },
    { leadId: "lead-08", userId: admin.id, type: "chamada", content: "Call técnica com CTO. Discutiram APIs e integrações.", channel: "video", createdAt: daysAgo(2) },
    { leadId: "lead-11", userId: vendedor1.id, type: "mensagem", content: "Beatriz pediu proposta para 3 unidades com desconto.", channel: "whatsapp", createdAt: hoursAgo(4) },
    { leadId: "lead-09", userId: null, type: "mensagem", content: "Mensagem recebida: 'Olá, quanto custa o plano básico?'", channel: "whatsapp", createdAt: hoursAgo(2) },
    { leadId: "lead-04", userId: null, type: "mensagem", content: "Mensagem recebida: 'Boa tarde, gostaria de saber mais sobre o sistema'", channel: "whatsapp", createdAt: hoursAgo(5) },
  ]

  for (const inter of interactions) {
    await prisma.interaction.create({ data: { ...inter, metadata: null } })
  }

  console.log("  ✅ 12 interações criadas")

  // ══════════════════════════════════════════
  // 6. ANÁLISES IA
  // ══════════════════════════════════════════
  await prisma.aiAnalysis.createMany({
    data: [
      {
        leadId: "lead-01",
        sentimentScore: 88,
        leadScore: 85,
        classification: "quente",
        reasons: JSON.stringify(["Budget aprovado", "Decisora com autoridade", "Timeline definido Q1", "Demonstrou entusiasmo na demo"]),
        recommendations: JSON.stringify(["Enviar proposta personalizada", "Agendar follow-up em 3 dias", "Oferecer desconto para fechamento rápido"]),
        createdAt: daysAgo(6),
      },
      {
        leadId: "lead-02",
        sentimentScore: 95,
        leadScore: 92,
        classification: "quente",
        reasons: JSON.stringify(["CEO com poder de decisão", "Orçamento alto (R$35k)", "Indicação qualificada", "Necessidade urgente"]),
        recommendations: JSON.stringify(["Manter contato próximo", "Preparar caso de uso saúde", "Oferecer POC gratuita"]),
        createdAt: daysAgo(4),
      },
      {
        leadId: "lead-08",
        sentimentScore: 70,
        leadScore: 72,
        classification: "morno",
        reasons: JSON.stringify(["Interesse técnico alto", "CTO avalia integrações", "Budget disponível mas não urgente"]),
        recommendations: JSON.stringify(["Enviar documentação da API", "Agendar demo técnica", "Conectar com time de engenharia"]),
        createdAt: daysAgo(2),
      },
    ],
  })

  console.log("  ✅ 3 análises de IA criadas")

  // ══════════════════════════════════════════
  // 7. NOTIFICAÇÕES
  // ══════════════════════════════════════════
  await prisma.notification.createMany({
    data: [
      { userId: admin.id, type: "novo_lead", title: "Novo lead recebido", message: "Juliana Costa enviou mensagem pelo WhatsApp", data: JSON.stringify({ leadId: "lead-09" }), isRead: false, createdAt: hoursAgo(2) },
      { userId: admin.id, type: "novo_lead", title: "Novo lead recebido", message: "Diego Ferreira respondeu email marketing", data: JSON.stringify({ leadId: "lead-12" }), isRead: false, createdAt: hoursAgo(1) },
      { userId: admin.id, type: "mensagem_recebida", title: "Nova mensagem", message: "Roberto Almeida enviou mensagem no WhatsApp", data: JSON.stringify({ leadId: "lead-04" }), isRead: false, createdAt: hoursAgo(5) },
      { userId: admin.id, type: "meta_atingida", title: "Meta atingida!", message: "Parabéns! 2 fechamentos este mês, atingindo 80% da meta.", data: null, isRead: false, createdAt: hoursAgo(12) },
      { userId: admin.id, type: "follow_up", title: "Follow-up pendente", message: "Patricia Mendes aguarda retorno há 3 dias sobre proposta.", data: JSON.stringify({ leadId: "lead-07" }), isRead: true, createdAt: daysAgo(1) },
      { userId: admin.id, type: "lead_atribuido", title: "Lead atribuído", message: "Beatriz Nakamura foi atribuída a Lucas Mendes", data: JSON.stringify({ leadId: "lead-11" }), isRead: true, createdAt: daysAgo(6) },
      { userId: vendedor1.id, type: "mensagem_recebida", title: "Nova mensagem", message: "Beatriz Nakamura pediu proposta para 3 unidades", data: JSON.stringify({ leadId: "lead-11" }), isRead: false, createdAt: hoursAgo(4) },
      { userId: vendedor1.id, type: "follow_up", title: "Lembrete de follow-up", message: "Maria Fernanda deve dar retorno sobre proposta hoje.", data: JSON.stringify({ leadId: "lead-01" }), isRead: false, createdAt: hoursAgo(6) },
      { userId: vendedor2.id, type: "follow_up", title: "Follow-up pendente", message: "Proposta de Patricia Mendes está há 3 dias sem resposta.", data: JSON.stringify({ leadId: "lead-07" }), isRead: false, createdAt: daysAgo(1) },
      { userId: vendedor2.id, type: "sistema", title: "Relatório semanal", message: "Seu relatório semanal está disponível. 3 leads atendidos, 1 proposta enviada.", data: null, isRead: true, createdAt: daysAgo(2) },
    ],
  })

  console.log("  ✅ 10 notificações criadas")

  // ══════════════════════════════════════════
  // 8. TEMPLATES DE MENSAGEM
  // ══════════════════════════════════════════
  await prisma.messageTemplate.createMany({
    data: [
      { name: "Boas-vindas", content: "Olá {{name}}! Obrigado pelo interesse na LeadFlow. Como posso ajudá-lo(a)?", variables: JSON.stringify(["name"]), category: "boas-vindas" },
      { name: "Follow-up 3 dias", content: "Olá {{name}}, tudo bem? Estou retornando sobre nossa conversa. Posso ajudar em algo mais?", variables: JSON.stringify(["name"]), category: "follow-up" },
      { name: "Proposta enviada", content: "{{name}}, acabamos de enviar a proposta para {{email}}. Ficamos à disposição para dúvidas!", variables: JSON.stringify(["name", "email"]), category: "proposta" },
      { name: "Agendamento", content: "Olá {{name}}! Gostaria de agendar uma demonstração do LeadFlow. Qual o melhor horário para você?", variables: JSON.stringify(["name"]), category: "agendamento" },
      { name: "Reativação", content: "Olá {{name}}! Faz um tempo que não conversamos. Temos novidades que podem interessar a {{company}}.", variables: JSON.stringify(["name", "company"]), category: "reativacao" },
    ],
  })

  console.log("  ✅ 5 templates de mensagem criados")

  // ══════════════════════════════════════════
  // 9. AUTOMAÇÕES
  // ══════════════════════════════════════════
  const auto1 = await prisma.automation.create({
    data: {
      name: "Boas-vindas automático",
      description: "Envia mensagem de boas-vindas quando um novo lead é criado via WhatsApp",
      trigger: JSON.stringify({ event: "lead.created", conditions: { source: "whatsapp" } }),
      actions: JSON.stringify([{ type: "send_template", templateName: "Boas-vindas" }, { type: "notify_team", message: "Novo lead WhatsApp recebido" }]),
      isActive: true,
    },
  })

  const auto2 = await prisma.automation.create({
    data: {
      name: "Follow-up automático (3 dias)",
      description: "Envia follow-up se o lead não responder em 3 dias",
      trigger: JSON.stringify({ event: "lead.no_response", conditions: { days: 3 } }),
      actions: JSON.stringify([{ type: "send_template", templateName: "Follow-up 3 dias" }, { type: "create_task", title: "Ligar para o lead" }]),
      isActive: true,
    },
  })

  await prisma.automation.create({
    data: {
      name: "Alerta lead quente",
      description: "Notifica gerente quando IA classifica lead como quente",
      trigger: JSON.stringify({ event: "lead.qualified", conditions: { classification: "quente" } }),
      actions: JSON.stringify([{ type: "notify_user", userId: "user-admin", message: "Lead quente detectado!" }, { type: "assign_lead", rule: "round_robin" }]),
      isActive: true,
    },
  })

  await prisma.automation.create({
    data: {
      name: "Reativação de leads frios",
      description: "Envia mensagem de reativação para leads frios após 30 dias sem interação",
      trigger: JSON.stringify({ event: "lead.inactive", conditions: { days: 30, classification: "frio" } }),
      actions: JSON.stringify([{ type: "send_template", templateName: "Reativação" }]),
      isActive: false,
    },
  })

  // Logs de automação
  await prisma.automationLog.createMany({
    data: [
      { automationId: auto1.id, status: "success", input: JSON.stringify({ leadId: "lead-09" }), output: JSON.stringify({ messageSent: true }), executedAt: hoursAgo(2) },
      { automationId: auto1.id, status: "success", input: JSON.stringify({ leadId: "lead-04" }), output: JSON.stringify({ messageSent: true }), executedAt: hoursAgo(5) },
      { automationId: auto1.id, status: "success", input: JSON.stringify({ leadId: "lead-12" }), output: JSON.stringify({ messageSent: false, reason: "no_whatsapp" }), executedAt: hoursAgo(1) },
      { automationId: auto2.id, status: "success", input: JSON.stringify({ leadId: "lead-03" }), output: JSON.stringify({ messageSent: true }), executedAt: daysAgo(1) },
      { automationId: auto2.id, status: "error", input: JSON.stringify({ leadId: "lead-06" }), output: null, error: "WhatsApp API timeout", executedAt: daysAgo(2) },
    ],
  })

  console.log("  ✅ 4 automações + 5 logs de execução criados")

  // ══════════════════════════════════════════
  // 10. AUDIT LOGS
  // ══════════════════════════════════════════
  await prisma.auditLog.createMany({
    data: [
      { userId: admin.id, action: "login", entity: "user", entityId: admin.id, createdAt: hoursAgo(1) },
      { userId: admin.id, action: "create", entity: "lead", entityId: "lead-12", newData: JSON.stringify({ name: "Diego Ferreira" }), createdAt: hoursAgo(1) },
      { userId: vendedor1.id, action: "update", entity: "lead", entityId: "lead-01", oldData: JSON.stringify({ status: "qualificado" }), newData: JSON.stringify({ status: "em_negociacao" }), createdAt: daysAgo(3) },
      { userId: vendedor1.id, action: "update", entity: "lead", entityId: "lead-05", oldData: JSON.stringify({ status: "proposta_enviada" }), newData: JSON.stringify({ status: "fechado_ganho" }), createdAt: daysAgo(2) },
      { userId: vendedor2.id, action: "update", entity: "lead", entityId: "lead-07", oldData: JSON.stringify({ pipelineStage: "Em Negociação" }), newData: JSON.stringify({ pipelineStage: "Proposta Enviada" }), createdAt: daysAgo(3) },
      { userId: admin.id, action: "export", entity: "leads", createdAt: daysAgo(1) },
    ],
  })

  console.log("  ✅ 6 logs de auditoria criados")

  // ══════════════════════════════════════════
  // 11. LGPD CONSENTS
  // ══════════════════════════════════════════
  await prisma.lgpdConsent.createMany({
    data: [
      { leadId: "lead-01", consentType: "marketing", granted: true, grantedAt: daysAgo(12), ipAddress: "187.45.123.1" },
      { leadId: "lead-01", consentType: "dados_pessoais", granted: true, grantedAt: daysAgo(12), ipAddress: "187.45.123.1" },
      { leadId: "lead-02", consentType: "marketing", granted: true, grantedAt: daysAgo(8), ipAddress: "200.10.55.3" },
      { leadId: "lead-02", consentType: "dados_pessoais", granted: true, grantedAt: daysAgo(8), ipAddress: "200.10.55.3" },
      { leadId: "lead-05", consentType: "marketing", granted: true, grantedAt: daysAgo(30), ipAddress: "189.22.77.9" },
      { leadId: "lead-05", consentType: "dados_pessoais", granted: true, grantedAt: daysAgo(30), ipAddress: "189.22.77.9" },
      { leadId: "lead-09", consentType: "dados_pessoais", granted: true, grantedAt: daysAgo(0), ipAddress: "177.88.44.2" },
      { leadId: "lead-13", consentType: "marketing", granted: true, grantedAt: daysAgo(25), ipAddress: "201.15.33.7" },
      { leadId: "lead-13", consentType: "dados_pessoais", granted: true, grantedAt: daysAgo(25), ipAddress: "201.15.33.7" },
    ],
  })

  console.log("  ✅ 9 consentimentos LGPD criados")

  // ══════════════════════════════════════════
  // 12. SETTINGS PADRÃO
  // ══════════════════════════════════════════
  const defaultSettings = [
    { key: "aiDefaultProvider", value: "openai" },
    { key: "openaiModel", value: "gpt-4o-mini" },
    { key: "anthropicModel", value: "claude-sonnet-4-6" },
    { key: "geminiModel", value: "gemini-2.0-flash" },
    { key: "grokModel", value: "grok-3-mini" },
    { key: "deepseekModel", value: "deepseek-chat" },
    // Chaves de API — preencha com valores reais após rodar o seed
    { key: "openaiKey", value: "" },
    { key: "anthropicKey", value: "" },
    { key: "geminiKey", value: "" },
    { key: "grokKey", value: "" },
    { key: "deepseekKey", value: "" },
    { key: "elevenLabsKey", value: "" },
  ]

  for (const s of defaultSettings) {
    await prisma.setting.upsert({
      where: { key: s.key },
      update: {},        // não sobrescreve se já existir
      create: s,
    })
  }

  console.log("  ✅ Settings padrão configuradas (API keys em branco)")

  console.log("\n🎉 Seed concluído! Dados mock para apresentação prontos.")
  console.log("   📊 15 leads | 4 usuários | 12 interações | 18 mensagens")
  console.log("   🤖 3 análises IA | 4 automações | 10 notificações")
  console.log("   🔐 Login: admin@leadflow.com / admin123")
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error("Erro no seed:", e)
    await prisma.$disconnect()
    process.exit(1)
  })
