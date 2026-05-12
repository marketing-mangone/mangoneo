import type { TeamMember, KPI, Document, Task, CalendarEvent, Notification } from '@/types';

export const MOCK_TEAM: TeamMember[] = [
  {
    id: 1, name: 'Sebastian Quijada', email: 'Sebastian.q@mangonelawfirmllc.com',
    role: 'admin', position: 'Director de Marketing', department: 'Marketing',
    area: 'Dirección', phone: '(862) 701-2097', start_date: '2023-01-15', status: 'active',
    bio: 'Director de Marketing responsable de la estrategia de marca y comunicaciones de la firma.',
    skills: ['Estrategia', 'Branding', 'Analytics', 'Liderazgo'],
    avatar: 'SQ',
  },
  {
    id: 2, name: 'Alejandra Andrade', email: 'alejandra@mangonelawfirmllc.com',
    role: 'team', position: 'Creadora de Contenido', department: 'Marketing',
    area: 'Contenido', start_date: '2023-06-01', status: 'active',
    bio: 'Responsable de guiones, copys y estrategia de contenido para todos los canales.',
    skills: ['Copywriting', 'Guiones', 'SEO Content', 'Storytelling'],
    avatar: 'AA',
  },
  {
    id: 3, name: 'Andrés Coronel', email: 'andres@mangonelawfirmllc.com',
    role: 'team', position: 'Web & SEO', department: 'Marketing',
    area: 'Digital', start_date: '2023-03-15', status: 'active',
    bio: 'Gestiona el sitio web, estrategia SEO y analítica digital de la firma.',
    skills: ['Next.js', 'SEO', 'Google Analytics', 'WordPress'],
    avatar: 'AC',
  },
  {
    id: 4, name: 'Gloriana López', email: 'gloriana@mangonelawfirmllc.com',
    role: 'team', position: 'Editora de Video', department: 'Marketing',
    area: 'Producción', start_date: '2023-08-01', status: 'active',
    bio: 'Produce y edita todo el contenido audiovisual para redes sociales y YouTube.',
    skills: ['Premiere Pro', 'After Effects', 'TikTok', 'YouTube'],
    avatar: 'GL',
  },
  {
    id: 5, name: 'Sara Castaño', email: 'sara@mangonelawfirmllc.com',
    role: 'team', position: 'Diseñadora Gráfica', department: 'Marketing',
    area: 'Diseño', start_date: '2024-01-10', status: 'active',
    bio: 'Diseñadora responsable de la identidad visual, templates y assets gráficos.',
    skills: ['Figma', 'Illustrator', 'Photoshop', 'Canva Pro'],
    avatar: 'SC',
  },
  {
    id: 6, name: 'Jesús Méndez', email: 'jesus@mangonelawfirmllc.com',
    role: 'team', position: 'HubSpot & Ads Manager', department: 'Marketing',
    area: 'Paid Media', start_date: '2024-02-20', status: 'active',
    bio: 'Gestiona campañas de paid media, CRM en HubSpot y automatizaciones de marketing.',
    skills: ['HubSpot', 'Meta Ads', 'Google Ads', 'CRM'],
    avatar: 'JM',
  },
];

export const MOCK_KPIS: KPI[] = [
  {
    id: 'leads-mes', name: 'Leads del Mes', value: 284, previousValue: 241,
    target: 300, unit: 'count', category: 'acquisition',
    source: 'hubspot', trend: 'up', lastUpdated: '2026-05-10T10:00:00Z',
  },
  {
    id: 'costo-lead', name: 'Costo por Lead', value: 38.50, previousValue: 44.20,
    target: 35, unit: 'currency', category: 'acquisition',
    source: 'hubspot', trend: 'down', lastUpdated: '2026-05-10T10:00:00Z',
  },
  {
    id: 'sesiones-web', name: 'Sesiones Web', value: 18420, previousValue: 15310,
    target: 20000, unit: 'count', category: 'engagement',
    source: 'google_analytics', trend: 'up', lastUpdated: '2026-05-10T06:00:00Z',
  },
  {
    id: 'tasa-conversion', name: 'Tasa de Conversión', value: 3.8, previousValue: 3.1,
    target: 4.0, unit: 'percentage', category: 'conversion',
    source: 'google_analytics', trend: 'up', lastUpdated: '2026-05-10T06:00:00Z',
  },
  {
    id: 'ad-spend', name: 'Inversión en Ads', value: 10934, previousValue: 11200,
    target: 12000, unit: 'currency', category: 'acquisition',
    source: 'meta', trend: 'stable', lastUpdated: '2026-05-10T08:00:00Z',
  },
  {
    id: 'reach-social', name: 'Alcance Social', value: 142800, previousValue: 118000,
    target: 150000, unit: 'count', category: 'brand',
    source: 'meta', trend: 'up', lastUpdated: '2026-05-10T08:00:00Z',
  },
  {
    id: 'engagement-rate', name: 'Engagement Rate', value: 5.2, previousValue: 4.7,
    target: 5.0, unit: 'percentage', category: 'engagement',
    source: 'meta', trend: 'up', lastUpdated: '2026-05-10T08:00:00Z',
  },
  {
    id: 'seo-clicks', name: 'Clicks Orgánicos', value: 8340, previousValue: 7120,
    target: 10000, unit: 'count', category: 'acquisition',
    source: 'google_analytics', trend: 'up', lastUpdated: '2026-05-10T06:00:00Z',
  },
];

export const MOCK_LEADS_SERIES = [
  { date: 'Ene', value: 198 },
  { date: 'Feb', value: 215 },
  { date: 'Mar', value: 248 },
  { date: 'Abr', value: 241 },
  { date: 'May', value: 284 },
];

export const MOCK_SESIONES_SERIES = [
  { date: 'Ene', value: 12100 },
  { date: 'Feb', value: 13400 },
  { date: 'Mar', value: 14900 },
  { date: 'Abr', value: 15310 },
  { date: 'May', value: 18420 },
];

export const MOCK_AD_SPEND_SERIES = [
  { date: 'Ene', value: 9800 },
  { date: 'Feb', value: 10200 },
  { date: 'Mar', value: 11500 },
  { date: 'Abr', value: 11200 },
  { date: 'May', value: 10934 },
];

export const MOCK_CHANNEL_DATA = [
  { channel: 'Meta Ads', leads: 128, spend: 6200, cpl: 48.4 },
  { channel: 'Google Ads', leads: 87, spend: 3400, cpl: 39.1 },
  { channel: 'Orgánico', leads: 45, spend: 0, cpl: 0 },
  { channel: 'Referral', leads: 24, spend: 0, cpl: 0 },
];

export const MOCK_DOCUMENTS: Document[] = [
  {
    id: 1, title: 'Manual de Marca v2.0', category: 'brand',
    description: 'Guía completa de identidad visual, tono de voz y lineamientos de comunicación.',
    fileType: 'html', fileSize: '2.1 MB', version: '2.0', status: 'active',
    uploadedBy: 'Sebastian Quijada', createdAt: '2026-04-01', updatedAt: '2026-04-15',
    tags: ['marca', 'diseño', 'identidad'], visibility: 'all',
  },
  {
    id: 2, title: 'JD — Alejandra Andrade (Content Creator)', category: 'jd',
    description: 'Job description oficial de la posición de Creadora de Contenido.',
    fileType: 'docx', fileSize: '12 KB', version: '1.0', status: 'active',
    uploadedBy: 'Sebastian Quijada', createdAt: '2026-04-10', updatedAt: '2026-04-10',
    tags: ['RRHH', 'JD', 'contenido'], visibility: 'leadership',
  },
  {
    id: 3, title: 'JD — Andrés Coronel (Web & SEO)', category: 'jd',
    description: 'Job description oficial de la posición de Web & SEO.',
    fileType: 'docx', fileSize: '11 KB', version: '1.0', status: 'active',
    uploadedBy: 'Sebastian Quijada', createdAt: '2026-04-10', updatedAt: '2026-04-10',
    tags: ['RRHH', 'JD', 'web'], visibility: 'leadership',
  },
  {
    id: 4, title: 'JD — Gloriana López (Video Editor)', category: 'jd',
    description: 'Job description oficial de la posición de Editora de Video.',
    fileType: 'docx', fileSize: '11.5 KB', version: '1.0', status: 'active',
    uploadedBy: 'Sebastian Quijada', createdAt: '2026-04-10', updatedAt: '2026-04-10',
    tags: ['RRHH', 'JD', 'video'], visibility: 'leadership',
  },
  {
    id: 5, title: 'JD — Sara Castaño (Graphic Designer)', category: 'jd',
    description: 'Job description oficial de la posición de Diseñadora Gráfica.',
    fileType: 'docx', fileSize: '11.3 KB', version: '1.0', status: 'active',
    uploadedBy: 'Sebastian Quijada', createdAt: '2026-04-10', updatedAt: '2026-04-10',
    tags: ['RRHH', 'JD', 'diseño'], visibility: 'leadership',
  },
  {
    id: 6, title: 'Core Values 2026', category: 'policy',
    description: 'Valores corporativos de Mangone Law Firm para el año 2026.',
    fileType: 'pdf', fileSize: '245 KB', version: '1.0', status: 'active',
    uploadedBy: 'Sebastian Quijada', createdAt: '2026-01-01', updatedAt: '2026-01-01',
    tags: ['valores', 'cultura', 'empresa'], visibility: 'all',
  },
  {
    id: 7, title: 'Memorando Interno 2026', category: 'policy',
    description: 'Memorando oficial con directivas y comunicaciones internas del año.',
    fileType: 'pdf', fileSize: '201 KB', version: '1.0', status: 'active',
    uploadedBy: 'Sebastian Quijada', createdAt: '2026-02-01', updatedAt: '2026-02-01',
    tags: ['memorando', 'interno', 'dirección'], visibility: 'team',
  },
  {
    id: 8, title: 'SOP — Proceso de Publicación de Contenido', category: 'sop',
    description: 'Procedimiento estándar para la creación, revisión y publicación de contenido en redes.',
    fileType: 'pdf', fileSize: '890 KB', version: '1.1', status: 'active',
    uploadedBy: 'Alejandra Andrade', createdAt: '2026-03-01', updatedAt: '2026-04-20',
    tags: ['SOP', 'contenido', 'redes sociales'], visibility: 'team',
  },
];

export const MOCK_TASKS: Task[] = [
  {
    id: 1, title: 'Crear carruseles para Consultation Day — Mayo',
    description: 'Diseñar 4 carruseles informativos para promover el Consultation Day del 25 de mayo.',
    status: 'in_progress', priority: 'high', assignee: 'Sara Castaño',
    dueDate: '2026-05-22', createdAt: '2026-05-05',
    tags: ['diseño', 'consultation day', 'redes'], project: 'Consultation Day Mayo',
    progress: 60,
  },
  {
    id: 2, title: 'Grabar video explicativo — Visa U',
    description: 'Producir video educativo de 2-3 minutos explicando los requisitos de la Visa U.',
    status: 'pending', priority: 'medium', assignee: 'Gloriana López',
    dueDate: '2026-05-28', createdAt: '2026-05-08',
    tags: ['video', 'educativo', 'visa u'], project: 'Contenido Educativo',
    progress: 0,
  },
  {
    id: 3, title: 'Actualizar campañas Meta Ads — VAWA',
    description: 'Optimizar las creatividades y audiencias de las campañas activas sobre VAWA.',
    status: 'in_progress', priority: 'urgent', assignee: 'Jesús Méndez',
    dueDate: '2026-05-12', createdAt: '2026-05-01',
    tags: ['ads', 'meta', 'vawa'], project: 'Paid Media Q2',
    progress: 80,
  },
  {
    id: 4, title: 'Escribir 3 artículos SEO — SIJS',
    description: 'Redactar artículos optimizados para posicionamiento de la keyword SIJS en Google.',
    status: 'review', priority: 'medium', assignee: 'Alejandra Andrade',
    dueDate: '2026-05-15', createdAt: '2026-04-28',
    tags: ['SEO', 'contenido', 'SIJS'], project: 'Blog Q2',
    progress: 90,
  },
  {
    id: 5, title: 'Setup Marketing Hub — Fase 1',
    description: 'Configurar la infraestructura base del Marketing Hub interno.',
    status: 'in_progress', priority: 'urgent', assignee: 'Andrés Coronel',
    dueDate: '2026-05-31', createdAt: '2026-05-01',
    tags: ['tech', 'hub', 'dev'], project: 'Marketing Hub',
    progress: 35,
  },
  {
    id: 6, title: 'Podcast — Episodio: Reunificación Familiar',
    description: 'Grabar episodio del podcast con Natalia Martínez sobre reunificación familiar.',
    status: 'pending', priority: 'medium', assignee: 'Gloriana López',
    dueDate: '2026-05-30', createdAt: '2026-05-10',
    tags: ['podcast', 'audio', 'contenido'], project: 'Podcast Mensual',
    progress: 0,
  },
  {
    id: 7, title: 'Reportes mensuales de KPIs — Abril',
    description: 'Consolidar y presentar informe de métricas del mes de abril al liderazgo.',
    status: 'done', priority: 'high', assignee: 'Sebastian Quijada',
    dueDate: '2026-05-05', createdAt: '2026-04-28',
    tags: ['reportes', 'KPIs', 'liderazgo'], project: 'Reporting Mensual',
    progress: 100,
  },
  {
    id: 8, title: 'Rediseñar plantillas de email — Newsletter',
    description: 'Actualizar el diseño del newsletter mensual aplicando el nuevo manual de marca.',
    status: 'blocked', priority: 'low', assignee: 'Sara Castaño',
    dueDate: '2026-05-25', createdAt: '2026-05-03',
    tags: ['email', 'diseño', 'newsletter'], project: 'Email Marketing',
    progress: 20,
  },
];

export const MOCK_EVENTS: CalendarEvent[] = [
  {
    id: 1, title: 'Consultation Day — Live Stream',
    type: 'event', date: '2026-05-25', time: '10:00',
    description: 'Evento mensual en vivo. Preparar todos los materiales con 3 días de anticipación.',
    channel: 'all', status: 'scheduled', assignee: 'Sebastian Quijada',
  },
  {
    id: 2, title: 'Post Instagram — Visa U explicada',
    type: 'content', date: '2026-05-12', time: '10:00',
    channel: 'instagram', status: 'scheduled', assignee: 'Alejandra Andrade',
  },
  {
    id: 3, title: 'Reel TikTok — Golden Tickets',
    type: 'content', date: '2026-05-13', time: '12:00',
    channel: 'tiktok', status: 'scheduled', assignee: 'Gloriana López',
  },
  {
    id: 4, title: 'Entrega reportes KPI a liderazgo',
    type: 'deadline', date: '2026-05-05',
    status: 'published', assignee: 'Sebastian Quijada',
  },
  {
    id: 5, title: 'Reunión semanal del equipo',
    type: 'meeting', date: '2026-05-12', time: '09:00',
    description: 'Reunión semanal de alineación del equipo de marketing.',
    status: 'scheduled', assignee: 'Sebastian Quijada',
  },
  {
    id: 6, title: 'Video YouTube — VAWA paso a paso',
    type: 'content', date: '2026-05-19', time: '14:00',
    channel: 'youtube', status: 'draft', assignee: 'Gloriana López',
  },
  {
    id: 7, title: 'Podcast — Ep. Reunificación Familiar',
    type: 'content', date: '2026-05-30',
    channel: 'podcast', status: 'scheduled', assignee: 'Gloriana López',
  },
  {
    id: 8, title: 'Deadline: Artículos SEO SIJS',
    type: 'deadline', date: '2026-05-15',
    status: 'scheduled', assignee: 'Alejandra Andrade',
  },
  {
    id: 9, title: 'Lanzamiento Campaña Meta — Deportación',
    type: 'campaign', date: '2026-05-18', time: '09:00',
    channel: 'facebook', status: 'scheduled', assignee: 'Jesús Méndez',
  },
  {
    id: 10, title: 'Reunión semanal del equipo',
    type: 'meeting', date: '2026-05-19', time: '09:00',
    status: 'scheduled', assignee: 'Sebastian Quijada',
  },
  {
    id: 11, title: 'Carrusel Instagram — Valores de la firma',
    type: 'content', date: '2026-05-21', time: '11:00',
    channel: 'instagram', status: 'draft', assignee: 'Sara Castaño',
  },
  {
    id: 12, title: 'Reunión semanal del equipo',
    type: 'meeting', date: '2026-05-26', time: '09:00',
    status: 'scheduled', assignee: 'Sebastian Quijada',
  },
];

export const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: 1, type: 'kpi_alert', title: 'KPI bajo objetivo',
    message: 'Costo por Lead ($38.50) sigue por encima del target ($35.00).',
    read: false, createdAt: '2026-05-10T10:15:00Z', link: '/metricas',
  },
  {
    id: 2, type: 'document_update', title: 'Documento actualizado',
    message: 'SOP de Publicación de Contenido fue actualizado a v1.1.',
    read: false, createdAt: '2026-05-09T16:30:00Z', link: '/recursos',
  },
  {
    id: 3, type: 'task_assigned', title: 'Tarea asignada',
    message: 'Se te asignó: "Actualizar campañas Meta Ads — VAWA"',
    read: true, createdAt: '2026-05-08T09:00:00Z', link: '/tareas',
  },
  {
    id: 4, type: 'kpi_alert', title: '¡Meta superada!',
    message: 'Engagement Rate (5.2%) superó el objetivo (5.0%). ¡Excelente trabajo!',
    read: true, createdAt: '2026-05-07T14:00:00Z', link: '/metricas',
  },
];
