"""
Base de conocimiento del asistente del Hub (🥭).
Combina: (1) datos de la firma + FAQ, (2) navegación del Hub interno.
Se inyecta en el system prompt. Editar aquí para actualizar lo que el bot sabe.
"""

# ── Conocimiento de la firma (fuente: base de conocimiento de Mangone Law) ──────
FIRM_KNOWLEDGE = """
# MANGONE LAW FIRM LLC — INFORMACIÓN DE LA FIRMA

## Información general
- Nombre legal: Mangone Law Firm LLC
- Fundadora: La Abogada Auguy Mangone
- Tipo: Bufete de inmigración enfocado en visas humanitarias y reunificación familiar
- Comunidad: latina hispanohablante (foco en Nueva Jersey y áreas cercanas)
- Dirección: 440 Speedwell Ave, Morris Plains, NJ 07950
- Teléfono: (862) 701-2097
- Redes: @Mangonelawfirm (Instagram, Facebook, TikTok, YouTube)
- Elevator pitch: Bufete de inmigración en NJ, fundado por la Abogada Auguy Mangone, dedicado a
  ayudar a la comunidad latina con visas humanitarias y la reunificación de sus familias.

## La Abogada Auguy Mangone
Fundadora de la firma. Lidera la práctica de visas humanitarias y reunificación familiar.
Referirse a ella SIEMPRE como "La Abogada Auguy" o "La Abogada Auguy Mangone".

## Áreas de práctica
A) Visas humanitarias: Visa U (víctimas de ciertos delitos que cooperan con autoridades),
   Visa T (víctimas de trata/explotación laboral), VAWA (víctimas de violencia doméstica),
   Asilo, SIJS (Estatus Especial de Inmigrante Juvenil), y otras formas de alivio humanitario.
B) Reunificación familiar: peticiones familiares, ajuste de estatus, procesos consulares,
   perdones/waivers cuando aplican.

## Proceso de atención (funnel)
1. Primer contacto (teléfono, redes o web)
2. Agenda de consulta
3. Consulta / evaluación personalizada
4. Propuesta y representación
5. Seguimiento durante el proceso

## Consultation Day
Evento recurrente (a veces en vivo) donde la comunidad puede acercarse con sus preguntas
migratorias. Para fechas: redes @Mangonelawfirm o (862) 701-2097.

## FAQ de la firma
- Ubicación: 440 Speedwell Ave, Morris Plains, NJ 07950.
- Teléfono: (862) 701-2097.
- Idioma: atención en español a la comunidad latina.
- Especialización: visas humanitarias y reunificación familiar.
- Contacto: teléfono o redes @Mangonelawfirm.
- Costos / planes de pago / documentos: se conversan directamente con la firma en la consulta.
- Elegibilidad: cada caso es distinto; se evalúa en una consulta personalizada (el bot NO
  determina elegibilidad ni promete resultados).

## Glosario
- Visa U: protección para ciertas víctimas de delitos que cooperan con autoridades.
- Visa T: protección para víctimas de trata de personas / explotación laboral.
- VAWA: protección para víctimas de violencia doméstica.
- Asilo: protección para quienes temen persecución en su país.
- SIJS: Estatus Especial de Inmigrante Juvenil (ciertos menores).
- Ajuste de estatus: obtener la residencia desde dentro de EE. UU.
- Proceso consular: trámite a través de un consulado en el exterior.
- Petición familiar: solicitud para traer o regularizar a un familiar.
- Perdón / Waiver: solicitud para perdonar ciertas inadmisibilidades.
"""

# ── Navegación del Hub interno (lo que el equipo de marketing usa día a día) ─────
HUB_NAVIGATION = """
# NAVEGACIÓN DEL MARKETING HUB (herramienta interna del equipo)

El Hub es la plataforma interna del Departamento de Marketing. Secciones (en la barra lateral):

- **Dashboard** (/dashboard): vista general del estado de la firma. Embudo (Reach → Leads →
  Qlfy Leads → Ventas → Conversiones) con desglose al pasar el ratón, tarjetas de Inversión /
  Ingresos / Objetivo, insights (ROAS, costo por cliente, etc.), YouTube y próximos eventos.
- **Métricas** (/metricas): KPIs del departamento con pestañas de Google Analytics, YouTube y
  Meta (Facebook + Instagram + Ads). Navegación por semana. "Métricas individuales" para detalle.
- **Recursos** (/recursos): biblioteca de documentos — aquí está el **manual de marca**, los
  **SOPs**, job descriptions y políticas. Es donde se consiguen los archivos y guías.
- **Ventas** (/ventas): CRM de leads. Pipeline kanban (arrastrar tarjetas entre etapas),
  botón **Nuevo lead**, **Importar** (CSV) y panel de tareas pendientes. En "Ver todos los
  leads" (/ventas/leads) hay tabla con filtros, **selección múltiple** (cambiar etapa,
  reasignar, eliminar) y **Exportar** a CSV. Cada lead tiene su detalle con actividades y tareas.
- **Tareas** (/tareas): tablero del equipo con vistas **Kanban** (arrastrar y soltar entre
  estados), **Lista** y **Roadmap**. Botón "Nueva tarea".
- **Calendario** (/calendario): agenda de contenido y eventos del equipo.
- **Equipo** (/equipo): perfiles del equipo y organigrama.
- **Competencia** (/competencia): análisis de competidores.
- **Herramientas** (/herramientas): utilidades de contenido (grillas/parrillas de publicaciones,
  generación de posts, blog).
- **Notificaciones** (/notificaciones): avisos de tareas vencidas, seguimientos y leads asignados.
- **Perfil** (/perfil): datos de la cuenta, cambiar contraseña, tema claro/oscuro.

## Cómo hacer cosas comunes en el Hub
- Subir/encontrar un documento o el manual de marca → sección **Recursos**.
- Ver KPIs y métricas de redes → **Métricas** (pestaña según la fuente).
- Agregar un lead → **Ventas → Nuevo lead**. Carga masiva → **Ventas → Importar** (CSV).
- Exportar leads → **Ventas → Ver todos los leads → Exportar**.
- Mover un lead de etapa → arrastra su tarjeta en el pipeline de **Ventas**.
- Crear/asignar una tarea del equipo → **Tareas → Nueva tarea**. Tareas de un lead → en el
  detalle del lead.
- Ver el estado general / embudo de la firma → **Dashboard**.
"""
