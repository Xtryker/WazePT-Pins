// ==UserScript==
// @name         WazePT Pins
// @namespace    https://greasyfork.org/en/users/1559074-xtryker
// @version      6.31.1
// @description  Menu circular de clique direito para o Waze Map Editor: Marcar local, Copiar hiperligação permanente, Atualizar aqui, Lomba (Z), Semáforo (Shift+T), Estrada (I)
// @author       Xtryker
// @icon         https://i.imgur.com/UksVMzF.png
// @match        https://www.waze.com/*/editor*
// @match        https://www.waze.com/editor*
// @match        https://beta.waze.com/*/editor*
// @match        https://beta.waze.com/editor*
// @grant        GM_setClipboard
// @grant        unsafeWindow
// @grant        GM_xmlhttpRequest
// @connect      wazept-pins-default-rtdb.europe-west1.firebasedatabase.app
// @connect      identitytoolkit.googleapis.com
// @connect      securetoken.googleapis.com
// @connect      docs.google.com
// @connect      googleusercontent.com
// @connect      waze.com
// @connect      routing-livemap-row.waze.com
// @connect      routing-livemap-na.waze.com
// @connect      routing-livemap-il.waze.com
// @connect      routing-livemap-am.waze.com
// @run-at       document-start
// @license      MIT
// ==/UserScript==

(() => {
  "use strict";

  const UW = typeof unsafeWindow !== "undefined" ? unsafeWindow : window;

  const SCRIPT_ID = "wme-rightclick-radial"; // internal id only — kept stable so existing users' saved pins/settings aren't orphaned by a rename
  const SCRIPT_NAME = "WazePT Pins";
  const SCRIPT_VERSION = "6.31.0";

  // ------------------------------------------------------------------
  // Portuguese (PT-PT) UI strings. Every user-facing label, toast, hint
  // and tooltip routes through T() so the whole interface can be kept in
  // one language without hunting through template literals scattered
  // across modal/menu builders. Internal-only strings (console.log,
  // storage keys, CSS class names, attribute values) are NOT translated.
  const STRINGS_PT = {
    // Radial menu
    "Pin this place": "Marcar este local",
    "Copy permalink": "Copiar Permalink",
    "Refresh here": "Atualizar aqui",
    "Drag to resize": "Arrastar para redimensionar",
    "Open in new tab": "Abrir em novo separador",
    "Open in Google Maps": "Abrir no Google Maps",
    "Speed bump": "Lomba",
    "Stop light": "Semáforo",
    "Draw road": "Desenhar estrada",
    " (on segment)": " (no segmento)",
    "Actions": "Ações",
    "On segment": "No segmento",
    "Road tool": "Ferramenta de estrada",

    // ── Closures (ported from WazePT Fechos) ──
    "Closures": "Cortes",
    "Description": "Descrição",
    "Use quick description": "Usar descrição rápida",
    "Use previous": "Usar anterior",
    "No previous description to reuse yet": "Ainda não há uma descrição anterior para reutilizar",
    "Set duration to": "Definir duração para",
    "Reason for the closure": "Motivo do corte",
    "Direction": "Sentido",
    "Both directions": "Ambos os sentidos",
    "Directions limited by the segment(s) one-way setting.": "Sentidos limitados pelo sentido de circulação do(s) segmento(s).",
    "Date range": "Intervalo de datas",
    "Single": "Único",
    "Weekly": "Semanal",
    "Repeat": "Repetir",
    "Start": "Início",
    "End": "Fim",
    "Start time": "Hora de início",
    "End time": "Hora de fim",
    "From (date)": "De",
    "To": "Até",
    "Days": "Dias",
    "Hours": "Horas",
    "Minutes": "Minutos",
    "Every": "A cada",
    "Duration of each closure": "Duração de cada corte",
    "use duration": "usar duração",
    "use end time": "usar hora de fim",
    "The closure repeats on each ticked day, between the two dates.": "O corte repete-se em cada dia assinalado, entre as duas datas.",
    "Event": "Evento",
    "Reload events from WME's Events tab": "Recarregar eventos a partir da aba Eventos do WME",
    "If applying with an event fails, open WME's own Events tab once, then press ↻ here and try again.":
      "Se aplicar com um evento falhar, abra a aba Eventos do próprio WME uma vez, depois prima ↻ aqui e tente de novo.",
    "WME hasn't finished loading the selected event yet. Wait a few seconds and try again — if it keeps happening, open WME's own Events tab once first.":
      "O WME ainda não terminou de carregar o evento seleccionado. Aguarde alguns segundos e tente novamente — se persistir, abra primeiro a aba Eventos do próprio WME uma vez.",
    "Please refresh this browser tab to apply a closure with a newly created event — a current limitation of this script and WME.":
      "Por favor actualize esta aba do navegador para aplicar um corte com um evento recém-criado — uma limitação actual deste script e do WME.",
    "Source": "Fonte",
    "None": "Nenhum",
    "No event in this view": "Nenhum evento nesta vista",
    "Unavailable — no partner permissions, or none in this area.": "Indisponível — sem permissões de parceiro, ou nenhum nesta zona.",
    "Ignore traffic": "Ignorar trânsito",
    "Ignores traffic history when computing travel time — for a full closure.": "Ignora o histórico de trânsito ao calcular o tempo de viagem — usar quando o corte é total.",

    // Node closures — same three options, wording and □/■ diagrams as
    // WME Closures Toolkit, so an editor who knows that script reads
    // this control without having to learn anything new.
    "Node closures": "Cortes nos nós",
    "None (□—□—□—□)": "Nenhum (□—□—□—□)",
    "Inner nodes (□—■—■—□)": "Nós interiores (□—■—■—□)",
    "All (■—■—■—■)": "Todos (■—■—■—■)",
    "Also close nodes: none, only those INSIDE the selection (avoids blocking adjacent streets), or all of them.":
      "Cortar também os nós: nenhum, apenas os INTERIORES à selecção (evita bloquear as ruas adjacentes), ou todos.",
    "Apply closure": "Aplicar",
    "Apply without saving": "Aplicar sem gravar",
    "Applying…": "A aplicar…",
    "No segment selected": "Nenhum segmento seleccionado",
    "segments selected": "segmentos seleccionados",
    "Unnamed": "Sem nome",
    "Save automatically when applying": "Guardar automaticamente ao aplicar",
    "Saves the edit right after creating a closure, instead of leaving it for Ctrl+S.": "Grava a edição logo após criar um corte, em vez de a deixar para o Ctrl+S.",

    // Closure validation messages
    "Fill in the start date.": "Preencha a data de início.",
    "Fill in the end date.": "Preencha a data de fim.",
    "Fill in the date range.": "Preencha o intervalo de datas.",
    "The end date must be after the start date.": "A data de fim tem de ser posterior à de início.",
    "The end day must be the same as or after the start day.": "O dia de fim tem de ser igual ou posterior ao de início.",
    "The duration must be greater than zero.": "A duração tem de ser maior que zero.",
    "Select at least one weekday.": "Seleccione pelo menos um dia da semana.",
    "The start and end times can't be the same.": "A hora de início e a de fim não podem ser iguais.",
    "The number of repeats must be at least 1.": "O número de repetições tem de ser pelo menos 1.",
    "The interval between repeats must be greater than zero.": "O intervalo entre repetições tem de ser maior que zero.",
    "Too many occurrences (limit": "Demasiadas ocorrências (limite",
    "Too many repeats (limit": "Demasiadas repetições (limite",
    "shorten the range.": "reduza o intervalo.",
    "No occurrences: no selected weekday falls within the range.": "Nenhuma ocorrência: nenhum dia seleccionado cai no intervalo.",
    "No occurrences to apply.": "Nenhuma ocorrência para aplicar.",
    "The interval": "O intervalo",
    "is shorter than the duration": "é menor que a duração",
    "the occurrences will overlap.": "as ocorrências vão sobrepor-se.",

    // Closure apply results
    "No closure created": "Nenhum corte criado",
    "segment(s) outside the model": "segmento(s) fora do modelo",
    "outside the model": "fora do modelo",
    "closure(s)": "corte(s)",
    "occurrence(s)": "ocorrência(s)",
    "segment(s)": "segmento(s)",
    "of": "de",
    "Source applied to only": "Fonte aplicada apenas a",
    "closure(s). Nothing was saved — undo with Ctrl+Z and try again.": "corte(s). Nada foi gravado — anule com Ctrl+Z e tente de novo.",
    "The selected source no longer exists in this view. Reload the list.": "A fonte seleccionada já não existe nesta vista. Recarregue a lista.",
    "Not saved — use Ctrl+S or WME's Save button.": "Por gravar — use Ctrl+S ou o botão Guardar do WME.",
    "saved.": "gravado.",
    "The server refused:": "O servidor recusou:",
    "server error": "erro do servidor",
    "Failed to save:": "Falha ao gravar:",
    "segment": "segmento",
    "segments": "segmentos",

    // Toasts / status messages
    "Move the mouse over the map first.": "Primeiro mova o rato sobre o mapa.",
    "Copied permalink": "Hiperligação copiada",
    "Copied permalink (with segment)": "Hiperligação copiada (com segmento)",
    "Pin removed": "Pin removido",
    "Pin saved": "Pin guardado",
    "Enter minutes": "Indique os minutos",
    "Reminder cleared": "Lembrete removido",
    "Pick a valid date and time": "Escolha uma data e hora válidas",
    "Pick a time in the future": "Escolha uma hora no futuro",
    "Reminder set": "Lembrete definido",
    "Notifications blocked by the browser": "Notificações bloqueadas pelo navegador",
    "Click target not found": "Alvo do clique não encontrado",
    "click sent to map": "clique enviado para o mapa",
    "armed (click target not found)": "ativado (alvo do clique não encontrado)",

    // Pin creation modal
    "Set a reminder after pinning": "Definir lembrete depois de marcar",
    "Cancel": "Cancelar",
    "Pin": "Marcar",

    // Reminder modal
    "Reminder": "Lembrete",
    "In": "Dentro de",
    "At": "Às",
    "minutes": "minutos",
    "hours": "horas",
    "Note (optional)": "Nota (opcional)",
    "Repeat (optional)": "Repetir (opcional)",
    "days": "dias",
    "weeks": "semanas",
    "e.g. every 7 days — the reminder reschedules itself after firing instead of stopping.":
      "por ex., a cada 7 dias — o lembrete volta a agendar-se sozinho em vez de parar.",
    "Sound": "Som",
    "Clear": "Limpar",
    "Set reminder": "Definir lembrete",
    "(no sound)": "(sem som)",
    "Gentle chime": "Sino suave",
    "Bright ping": "Sinal agudo",
    "Double chime": "Sino duplo",

    // Reminder notice card
    "Missed reminder": "Lembrete perdido",
    "Snooze": "Adiar",
    "Dismiss": "Dispensar",
    "Go there": "Ir até lá",
    "Go": "Ir",
    "Snoozed": "Adiado",
    "min": "min",
    "1 hour": "1 hora",
    "1 day": "1 dia",
    "Expires (optional)": "Expira (opcional)",
    "Never": "Nunca",
    "3 days": "3 dias",
    "1 week": "1 semana",
    "1 month": "1 mês",
    "The pin is removed for everyone automatically once it expires.": "O pin é removido automaticamente para todos assim que expirar.",
    "Lock editing/removal to (optional)": "Bloquear edição/remoção para (opcional)",
    "No lock": "Sem bloqueio",
    "Level": "Nível",
    "Only editors at this level or above will be able to edit or remove this pin — you can always remove your own, regardless of level. Enforced by this script only: someone bypassing it entirely is still possible.":
      "Só editores a este nível ou superior vão poder editar ou remover este pin — o teu próprio pode ser sempre removido por ti, independentemente do nível.",
    "ON": "LIGADO",
    "OFF": "DESLIGADO",

    // Sidebar
    "Radial menu": "Menu circular",
    "Radial menu items": "Itens do menu circular",
    "Radial menu animation": "Animação do menu circular",
    "Animate opening": "Animar abertura",
    "Turn off for an instant, no-motion menu": "Desative para um menu instantâneo, sem movimento",
    "Style": "Estilo",
    "Pop": "Surgir",
    "Fade": "Esbater",
    "Spin": "Rodar",
    "Slide": "Deslizar",
    "Speed": "Velocidade",
    "Slow": "Lenta",
    "Normal": "Normal",
    "Fast": "Rápida",
    "Choose which actions appear, and drag to reorder them.": "Escolha que ações aparecem e arraste para as reordenar.",
    "Drag to reorder": "Arraste para reordenar",
    "Use WazePT": "Usar WazePT",
    "Keeps WazePT selected as the Source automatically, whenever it's available in this view.": "Mantém automaticamente o WazePT seleccionado como Fonte, sempre que estiver disponível nesta vista.",
    "Appearance": "Aparência",
    "Controls the menu, pins panel, and dialogs — independent of WME's own theme.":
      "Controla o menu, o painel de pins e as janelas — independentemente do tema do próprio WME.",
    "Auto": "Automático",
    "Dark": "Escuro",
    "Light": "Claro",
    "Shift + right click = default menu": "Shift + clique direito = menu padrão",
    "Pins panel": "Painel de pins",
    "Show the list of saved pins": "Mostra a lista de pins guardados",
    "Pin names on map": "Nomes dos pins no mapa",
    "Draw the pin label next to the marker": "Mostra o nome junto ao pin",
    "Marker in permalink": "Pin na hiperligação",
    "Add &marker=true when copying": "Adiciona &marker=true ao copiar",
    "Marker on refresh": "Pin ao atualizar",
    "Marker on new tab": "Pin ao abrir em novo separador",
    "Add &marker=true when refreshing": "Adiciona &marker=true ao atualizar",
    "Add &marker=true when opening in a new tab": "Adiciona &marker=true ao abrir num novo separador",
    "Keep layer settings": "Manter definições de camadas",
    "Carry layers=… into permalinks": "Inclui layers=… nas hiperligações permanentes",
    "Reminder sound": "Som do lembrete",
    "Played when a pin reminder fires": "Tocado quando um lembrete dispara",
    "Desktop notifications": "Notificações do sistema",
    "Show a native OS notification when a reminder fires": "Mostra uma notificação nativa do sistema quando um lembrete dispara",
    "Quiet hours": "Modo silencioso",
    "Mute sound/notifications during this window": "Silencia som/notificações neste intervalo",
    "From": "Das",
    "to": "às",
    "Webhook notify": "Notificar por webhook",
    "POST a JSON payload to a URL when a reminder fires": "Envia um pedido JSON (POST) para um URL quando um lembrete dispara",
    "Editor shortcuts used": "Atalhos do editor utilizados",
    "These are WME's own shortcuts. If they don't fire, check Settings → Keyboard shortcuts and adjust the script.":
      "Estes são atalhos do próprio WME. Se não funcionarem, verifique Definições → Atalhos de teclado e ajuste o script.",
    "If the cursor is over a segment when you pick one of these, the tool is armed and then auto-clicked at that exact spot, so it places directly on the road. Off a segment, only the tool is armed — click the map yourself to place it.":
      "Se o cursor estiver sobre um segmento ao escolher uma destas opções, a ferramenta é ativada e depois clicada automaticamente nesse ponto exato, colocando diretamente na via. Fora de um segmento, só a ferramenta é ativada — clique no mapa para a colocar.",

    // Snooze picker
    "Custom minutes": "Minutos personalizados",
    "0 = never": "0 = nunca",

    // Shared pins (Firebase)
    "For me": "Para mim",
    "For everyone": "Para todos",
    "Pinned by": "Marcado por",
    "Expires": "Expira",
    "expiring soon": "expira em breve",
    "in": "em",
    "day": "dia",
    "New": "Novo",
    "new pin": "pin novo",
    "new pins": "pins novos",
    "New community pin, not seen yet": "Pin novo da comunidade, ainda não visto",
    "Shared pins updated": "Pins partilhados atualizados",
    "Could not reach the shared pins database": "Não foi possível aceder à base de dados de pins partilhados",
    "Could not save to the shared pins database": "Não foi possível guardar na base de dados de pins partilhados",
    "Could not sign in to the shared pins database": "Não foi possível iniciar sessão na base de dados de pins partilhados",
    "Could not remove the shared pin (permission denied)": "Não foi possível remover o pin partilhado (permissão negada)",
    "Shared pins identity": "Identidade de pins partilhados",
    "Requires Level": "Requer Nível",
    "or above": "ou superior",
    // ── Test route (A → B) ──
    "Test route (A → B)": "Testar rota (A → B)",
    "Route: place start (A)": "Rota: colocar início (A)",
    "Route: place end (B)": "Rota: colocar fim (B)",
    "Route: clear": "Rota: limpar",
    "Route cleared": "Rota limpa",
    "Start (A) placed — now place the end (B).": "Início (A) colocado — coloque agora o fim (B).",
    "Calculating route…": "A calcular rota…",
    "Route calculated": "Rota calculada",
    "No route found between those two points.": "Não foi encontrada rota entre esses dois pontos.",
    "Could not calculate the route": "Não foi possível calcular a rota",
    "Please wait a moment before testing another route.": "Aguarde um momento antes de testar outra rota.",
    "Map not ready yet.": "O mapa ainda não está pronto.",
    // ── Map comment (area) — imported from WazePT Nota Rápida ──
    "Map note (area)": "Comentário (área)",
    "Map note drawing isn't available in this WME version.": "O desenho de comentários não está disponível nesta versão do WME.",
    "Click the map to draw the area. Double-click to finish, Esc to cancel.": "Clique no mapa para desenhar a área. Duplo clique para terminar, Esc para cancelar.",
    "Something went wrong while drawing. Check the console for details.": "Ocorreu um erro ao desenhar. Veja a consola para mais detalhes.",
    "Invalid area — draw at least 3 points without crossing lines, then try again.": "Área inválida — desenhe pelo menos 3 pontos sem cruzar linhas e tente novamente.",
    "Map note created": "Comentário criado",
    "Comment created, but it couldn't be opened automatically. Find it on the map to edit it.":
      "Comentário criado, mas não foi possível abri-lo automaticamente. Encontre-o no mapa para o editar.",
    "Could not create the map note. Check the console for details.": "Não foi possível criar o comentário. Veja a consola para mais detalhes.",
    // ── Split segment — imported from WazePT Segments ──
    "Split segment": "Dividir segmento",
    "Split nearest segment": "Dividir segmento mais próximo",
    "Splitting isn't available in this WME version.": "A divisão de segmentos não está disponível nesta versão do WME.",
    "Click the nearest segment to split it there. Esc to cancel.": "Clique no segmento mais próximo para o dividir aí. Esc para cancelar.",
    "Split cancelled": "Divisão cancelada",
    "No segment was close enough to split.": "Nenhum segmento estava suficientemente próximo para dividir.",
    "Segment split": "Segmento dividido",
    "Could not split the segment.": "Não foi possível dividir o segmento.",
    // ── Route details panel (opt-in) ──
    "Details": "Detalhes",
    "Opens a movable window with the distance, time, turn-by-turn list and alternatives every time a route is calculated.":
      "Abre uma janela móvel com a distância, o tempo, a lista de indicações e as alternativas sempre que uma rota é calculada.",
    "Route details": "Detalhes da rota",
    "m": "m",
    "km": "km",
    "h": "h",
    "Route": "Rota",
    "Alternatives": "Alternativas",
    "Primary route": "Rota principal",
    "Alternative": "Alternativa",
    "Directions": "Indicações",
    "No turn-by-turn instructions available for this route.": "Sem indicações passo-a-passo disponíveis para esta rota.",
    // ── Turn instructions (imported from WME Route Checker) ──
    "start driving": "iniciar percurso",
    "continue": "continuar",
    "turn left": "virar à esquerda",
    "turn right": "virar à direita",
    "keep left": "manter-se à esquerda",
    "keep right": "manter-se à direita",
    "exit left": "sair à esquerda",
    "exit right": "sair à direita",
    "make a U-turn": "inverter o sentido",
    "arrive": "chegada",
    "none": "nenhuma",
    "at the roundabout, take the": "na rotunda, tomar a",
    "exit": "saída",
    "at the roundabout, turn left": "na rotunda, virar à esquerda",
    "at the roundabout, turn right": "na rotunda, virar à direita",
    "at the roundabout, continue straight": "na rotunda, seguir em frente",
    "at the roundabout, make a U-turn": "na rotunda, inverter o sentido",
    "onto": "para",
    "at": "em",
    "destination": "destino",
    "alternatives": "alternativas",
    // ── Route options ──
    "Route options": "Opções de rota",
    "Vehicle type": "Tipo de veículo",
    "Private": "Privado",
    "Taxi": "Táxis",
    "Motorcycle": "Motociclos",
    "Avoid": "Evitar",
    "Toll roads": "Estrada com portagem",
    "Freeways": "Autoestrada",
    "Unpaved": "Não pavimentada",
    "Allow": "Permitir",
    "U-turns": "Inversões de marcha",
    "Show alternative routes": "Mostrar rotas alternativas",
    "Requests up to 3 routes and draws the alternatives in lighter colours.":
      "Pede até 3 rotas e desenha as alternativas em cores mais claras.",
    "Show segment speeds": "Mostrar velocidades por segmento",
    "Colours each segment of the active route by speed and shows the km/h, imported from WME Route Speeds.":
      "Colore cada segmento da rota ativa consoante a velocidade e mostra os km/h, importado do WME Route Speeds.",
    // ── Route recalculation by time of day / day of week (imported from WME Route Speeds) ──
    "Now": "Agora",
    "Today": "Hoje",
    "Monday": "Segunda-feira",
    "Tuesday": "Terça-feira",
    "Wednesday": "Quarta-feira",
    "Thursday": "Quinta-feira",
    "Friday": "Sexta-feira",
    "Saturday": "Sábado",
    "Sunday": "Domingo",
    "Recalculate": "Recalcular",
    "Recalculating route…": "A recalcular rota…",
    "No route to recalculate — test a route first.": "Sem rota para recalcular — teste primeiro uma rota.",
    "For:": "Para:",
    "Click to center the map here": "Clique para centrar o mapa aqui",
    "This feature is restricted to editors on the approved list.": "Esta funcionalidade está restringida a editores na lista aprovada.",
    "(locked by creator)": "(bloqueado pelo criador)",
    "Detected editor level": "Nível de editor detetado",
    "Editor level not detected yet": "Nível de editor ainda não detetado",
    "Shared pin permissions": "Permissões de pins partilhados",
    "This check runs in your browser, using the level WME reports for your account — it is not enforced by the shared database itself.":
      "Esta verificação é feita no seu navegador, usando o nível que o WME reporta para a sua conta — não é imposta pela base de dados partilhada.",
    "Signed in anonymously": "Sessão anónima iniciada",
    "Not signed in yet": "Ainda sem sessão iniciada",
    "Could not remove the shared pin (check your connection)": "Não foi possível remover o pin partilhado (verifique a ligação)",
    "Shared with all script users": "Partilhado com todos os utilizadores do script",
    "Refresh shared pins": "Atualizar pins partilhados",
    "Remove shared pin": "Remover pin partilhado",
    "This pin is visible to everyone using this script. Anyone can remove it.":
      "Este pin é visível a todos os utilizadores deste script. Qualquer pessoa o pode remover.",
    "Shared pin saved": "Pin partilhado guardado",
    "No connection — the pin will be sent automatically once you're back online.":
      "Sem ligação — o pin será enviado automaticamente assim que voltar a estar online.",
    "No connection yet — will be sent automatically once you're back online.":
      "Ainda sem ligação — será enviado automaticamente assim que voltar a estar online.",
    "Waiting to sync…": "A aguardar sincronização…",
    "Could not save a queued pin": "Não foi possível guardar um pin em espera",
    "Saving to the shared database…": "A guardar na base de dados partilhada…",
    "Pinned place": "Local marcado",
    "WME Pin Reminder": "Lembrete de pin WME",
    "Pin reminder": "Lembrete de pin",
    "Reminder for your pinned place": "Lembrete para o seu local marcado",

    // Pins panel
    "Pins": "Pins",
    "Collapse": "Colapsar",
    "No pins yet": "Ainda sem pins",
    "Edit reminder": "Editar lembrete",
    "Remove pin": "Remover pin",
    "pin": "pin",
    "pins": "pins",
    "click to expand": "clique para expandir",
    "reminder pending": "lembrete pendente",
    "reminders pending": "lembretes pendentes",
    "every": "a cada",

    // Pin folders
    "Pins for everyone": "Pins da Comunidade",
    "My pins": "Os meus pins",
    "My pins with reminder": "Os meus pins com lembrete",
    "No shared pins yet": "Ainda sem pins partilhados",
    "You have no pins yet": "Ainda não tem pins",
    "No pins with a reminder": "Sem pins com lembrete",

    // Shared-pin disclaimer (shown before saving a pin "for everyone")
    "Before sharing this pin": "Antes de partilhar este pin",
    "Shared pins are not a substitute for map comments or the Waze Map Update Request tools — don't rely on them to keep track of anything important, since any user of this script can see and remove them at any time.":
      "Os pins partilhados não substituem os comentários no mapa nem as ferramentas de pedidos de atualização do Waze — não confie neles para acompanhar algo importante, pois qualquer utilizador deste script pode vê-los e removê-los a qualquer momento.",
    "Please be a responsible editor: don't remove another editor's pin unless the task it refers to has actually been completed.":
      "Seja um editor responsável: não remova o pin de outro editor a não ser que a tarefa a que se refere já esteja concluída.",
    "I understand, share it": "Entendi, partilhar",
    "Go back": "Voltar",

    // Shared-pin delete warning
    "Delete this shared pin?": "Eliminar este pin partilhado?",
    "This pin was shared with every editor using this script, not just you. Make sure you're sure before removing it — if it belongs to someone else, only delete it once its task is actually done.":
      "Este pin foi partilhado com todos os editores que usam este script, não só consigo. Certifique-se de que tem a certeza antes de o remover — se pertencer a outra pessoa, só o elimine quando a tarefa a que se refere estiver mesmo concluída.",
    "Yes, delete it": "Sim, eliminar",

    // ── Feriados (v6.2) ──
    "Public holidays": "Feriados",
    "Ignore holidays": "Ignorar feriados",
    "Except holidays": "Excepto feriados",
    "Holidays only": "Apenas feriados",
    "Plus holidays": "Mais feriados",
    "Skips any ticked day that is a national public holiday.":
      "Salta qualquer dia assinalado que seja feriado nacional.",
    "Only national public holidays in the range — the weekdays above are ignored.":
      "Apenas os feriados nacionais dentro do intervalo — os dias da semana acima são ignorados.",
    "Ticked weekdays plus every national public holiday in the range.":
      "Os dias da semana assinalados mais todos os feriados nacionais do intervalo.",
    "Only fixed-date national holidays are considered (Easter-based ones are not).":
      "Apenas são considerados os feriados nacionais de data fixa (os que dependem da Páscoa não).",
    "No occurrences: no public holiday falls within the range.":
      "Sem ocorrências: nenhum feriado cai dentro do intervalo.",
    "No occurrences: every matching day in the range is a public holiday.":
      "Sem ocorrências: todos os dias correspondentes no intervalo são feriados.",

    // ── Pins: ordenação e edição (v6.2) ──
    "Sort pins": "Ordenar pins",
    "Newest first": "Mais recentes primeiro",
    "Oldest first": "Mais antigos primeiro",
    "Name (A–Z)": "Nome (A–Z)",
    "Editor (A–Z)": "Editor (A–Z)",
    "Created": "Criado",
    "Edit pin text": "Editar texto do pin",
    "Pin name": "Nome do pin",
    "Pin updated": "Pin atualizado",
    "Give the pin a name first.": "Dê primeiro um nome ao pin.",
    "This pin is shared — the new text will be visible to every editor using the script.":
      "Este pin é partilhado — o novo texto ficará visível para todos os editores que usam o script.",
    "This pin hasn't been sent yet — try again once it has synced.":
      "Este pin ainda não foi enviado — tente de novo assim que estiver sincronizado.",
    "Could not rename the shared pin (permission denied)":
      "Não foi possível renomear o pin partilhado (permissão negada)",
    "Could not rename the shared pin (check your connection)":
      "Não foi possível renomear o pin partilhado (verifique a ligação)",

    // ── Definições de cortes (v6.2) ──
    "Text filled in by the \"quick description\" toggle in the closures window.":
      "Texto preenchido pelo botão \"descrição rápida\" na janela de cortes.",
    "Reset to default text": "Repor texto predefinido",
    "Quick description saved": "Descrição rápida guardada",
    "The closures window can be dragged by its title bar. If it ends up off-screen, put it back in the middle here.":
      "A janela de cortes pode ser arrastada pela barra de título. Se ficar fora do ecrã, volte a centrá-la aqui.",
    "Restore window placement": "Repor posição da janela",
    "Window placement restored": "Posição da janela reposta",

    // ── Cópia de segurança (v6.5) ──
    "Backup": "Cópia de segurança",
    "Save your settings and pins to a file, or restore them from one saved earlier.":
      "Guarde as suas definições e pins num ficheiro, ou restaure a partir de um guardado anteriormente.",
    "Export": "Exportar",
    "Import": "Importar",
    "Backup exported": "Cópia de segurança exportada",
    "Could not create the backup file": "Não foi possível criar o ficheiro de cópia de segurança",
    "Could not read the file": "Não foi possível ler o ficheiro",
    "That file isn't valid JSON": "Esse ficheiro não é JSON válido",
    "Not a valid backup file.": "Não é um ficheiro de cópia de segurança válido.",
    "This file isn't a WazePT Pins backup.": "Este ficheiro não é uma cópia de segurança do WazePT Pins.",
    "This backup was made by a newer version of the script.":
      "Esta cópia de segurança foi criada por uma versão mais recente do script.",
    "This backup file has nothing to restore.": "Este ficheiro de cópia de segurança não tem nada para restaurar.",
    "Restore backup?": "Restaurar cópia de segurança?",
    "This replaces your current settings and pins with the ones in this file. This cannot be undone.":
      "Isto substitui as suas definições e pins atuais pelos deste ficheiro. Esta ação não pode ser desfeita.",
    "Backup date": "Data da cópia",
    "Restore": "Restaurar",
    "Backup restored — reloading…": "Cópia de segurança restaurada — a recarregar…",

    // ── Diagnóstico da lista de eventos (v6.5.1) ──
    "Could not load events": "Não foi possível carregar os eventos",
    "WME's internal events list could not be read. Try reloading the page — if this keeps happening, please report it.":
      "Não foi possível ler a lista de eventos interna do WME. Tente recarregar a página — se isto continuar a acontecer, por favor reporte o problema.",

    // ── Diagnósticos (v6.6) ──
    "Diagnostics": "Diagnóstico",
    "System notifications": "Notificações do sistema",
    "Found a bug? Export this file and send it to the developer. It includes your settings, pins, and — if debugging mode is on — a recent activity log. Never your login credentials.":
      "Encontrou um erro? Exporte este ficheiro e envie-o ao developer. Inclui as suas definições, pins e — se o modo de depuração estiver ativo — um registo de atividade recente. Nunca as suas credenciais de acesso.",
    "Debugging mode": "Modo de depuração",
    "Records detailed activity (last hour) to include when you export diagnostics below.":
      "Regista atividade detalhada (última hora) para incluir quando exportar o diagnóstico abaixo.",
    "Export diagnostics": "Exportar diagnóstico",
    "Diagnostics exported": "Diagnóstico exportado",
    "Could not create the diagnostics file": "Não foi possível criar o ficheiro de diagnóstico",

    // Modal generic
    "Close": "Fechar",
    "Save": "Guardar",
    "Saving…": "A guardar…",
  };

  function T(s) {
    return Object.prototype.hasOwnProperty.call(STRINGS_PT, s) ? STRINGS_PT[s] : s;
  }

  if (UW.__WME_RC_RADIAL__) return;
  UW.__WME_RC_RADIAL__ = true;

  const EDITOR_BASE = `${location.origin}${location.pathname}`;

  const PIN_KEY = `${SCRIPT_ID}:pins:v1`;
  const SHARED_PIN_CACHE_KEY = `${SCRIPT_ID}:sharedPinsCache:v1`;
  const SEEN_SHARED_PIN_IDS_KEY = `${SCRIPT_ID}:seenSharedPinIds:v1`;
  const SEEN_PINS_BOOTSTRAPPED_KEY = `${SCRIPT_ID}:seenPinsBootstrapped:v1`;
  const PANEL_POS_KEY = `${SCRIPT_ID}:panelPos:v1`;
  // Separate from PANEL_POS_KEY (which tracks the EXPANDED panel's
  // position): collapsing used to leave left/top untouched, so a bubble
  // dragged to the right edge, then expanded (which pulls the panel
  // inward to stay on-screen — see expandPinsPanel), would collapse
  // back down at the EXPANDED panel's top-left corner instead of
  // wherever the bubble actually was. Tracking the two independently
  // means each state remembers its own spot.
  const PANEL_COLLAPSED_POS_KEY = `${SCRIPT_ID}:panelCollapsedPos:v1`;
  const PANEL_COLLAPSED_KEY = `${SCRIPT_ID}:panelCollapsed:v1`;
  // Horizontal-only: the list's content (pin names, the meta lines under
  // them) is what benefits from more room, and there's no similar case
  // for arbitrary height — max-height already handles that by capping
  // to the viewport and letting the list scroll.
  const PANEL_WIDTH_KEY = `${SCRIPT_ID}:panelWidth:v1`;
  const MIN_PANEL_WIDTH = 200;
  const MAX_PANEL_WIDTH = 520;

  // Clamps a candidate panel width to the fixed min/max bounds AND to
  // whatever room is actually left between the panel's current left
  // edge and the map's right edge — the same "never let it end up
  // off-screen" principle already applied to position (see
  // clampPanelPosToMapBounds), just for the one dimension that's
  // user-resizable. Pure geometry, no DOM reads, so it's unit testable
  // on its own.
  function clampPanelWidth(width, curLeft, mapWidth, margin = 6) {
    const maxAvailable = Math.max(MIN_PANEL_WIDTH, mapWidth - curLeft - margin);
    return Math.round(Math.max(MIN_PANEL_WIDTH, Math.min(width, MAX_PANEL_WIDTH, maxAvailable)));
  }

  // Resizing from the LEFT edge keeps the panel's RIGHT edge fixed —
  // dragging outward (left) grows the panel toward the left and moves
  // its left/top position along with it, rather than just widening in
  // place the way the right-edge handle does. This exists specifically
  // for a panel parked near the screen's right edge: there's no room to
  // drag a right-edge handle further right in that case, so growing
  // from the left is the only direction that actually has space.
  //
  // Unlike clampPanelWidth, this doesn't need mapWidth: the right edge
  // is invariant here (it was already on-screen before the drag started,
  // so it stays on-screen), only the LEFT boundary (the margin) can be
  // hit. Pure geometry, no DOM reads, so it's unit testable on its own.
  function computeLeftEdgeResize(startLeft, startWidth, dx, margin = 6) {
    const rightEdge = startLeft + startWidth;
    let width = Math.max(MIN_PANEL_WIDTH, Math.min(MAX_PANEL_WIDTH, startWidth - dx));
    let left = rightEdge - width;
    if (left < margin) {
      // Hit the left boundary: hold left at the margin and let width
      // shrink to match, rather than letting the panel creep past the
      // edge. Re-deriving left from the (possibly MIN-floored) width
      // keeps the two values consistent with each other in the
      // degenerate case where even the minimum width doesn't fit.
      left = margin;
      width = Math.max(MIN_PANEL_WIDTH, rightEdge - left);
      left = rightEdge - width;
    }
    return { left: Math.round(left), width: Math.round(width) };
  }

  const SETTINGS_KEY = `${SCRIPT_ID}:settings:v1`;

  // ------------------------------------------------------------------
  // Shared pins ("Para todos") — stored in a Firebase Realtime Database
  // via its plain REST API (no SDK bundling needed inside a userscript;
  // any path under the database URL is readable/writable by appending
  // ".json"). This project has no auth configured, so — important
  // limitation — every user of the script can read, add, and delete
  // every shared pin. There is no per-user ownership or permission
  // model here; treat "Para todos" as a fully public, shared scratchpad.
  const FIREBASE_DB_URL = "https://wazept-pins-default-rtdb.europe-west1.firebasedatabase.app";
  const SHARED_PINS_PATH = "sharedPins";

  function firebaseUrl(path) {
    return `${FIREBASE_DB_URL}/${path}.json`;
  }

  // Waze's own page sets a Content Security Policy whose connect-src does
  // not (and, being Waze's policy, never will) list our Firebase project's
  // domain — so a page-context fetch()/XHR to Firebase is blocked by the
  // browser before it ever leaves the tab, regardless of CORS on the
  // Firebase side. GM_xmlhttpRequest runs the request from the userscript
  // manager's own privileged context instead of the page's, which is
  // exactly what it exists for and is unaffected by the page's CSP.
  // This wraps it in a fetch()-shaped Promise API so the rest of the
  // shared-pins code doesn't need to know which transport is in use.
  function gmFetch(url, { method = "GET", headers = {}, body = null } = {}) {
    const GM_XHR = (typeof GM_xmlhttpRequest !== "undefined" && GM_xmlhttpRequest)
      || (typeof GM !== "undefined" && GM?.xmlHttpRequest)
      || null;

    if (!GM_XHR) {
      // Fallback for environments without the grant (shouldn't happen given
      // @grant GM_xmlhttpRequest above, but fail toward a clear error
      // instead of a silent hang if a userscript manager ever ignores it).
      return Promise.reject(new Error("GM_xmlhttpRequest is not available — check the userscript's @grant list"));
    }

    return new Promise((resolve, reject) => {
      GM_XHR({
        method,
        url,
        headers,
        data: body,
        onload: (res) => {
          const status = res.status;
          resolve({
            ok: status >= 200 && status < 300,
            status,
            url,
            text: async () => res.responseText,
            json: async () => {
              try { return JSON.parse(res.responseText); } catch { return null; }
            },
          });
        },
        onerror: (err) => reject(new Error(`Network error contacting ${url}: ${err?.error || err?.statusText || "unknown"}`)),
        ontimeout: () => reject(new Error(`Timed out contacting ${url}`)),
      });
    });
  }

  const RADIUS = 108;
  const BTN = 56;
  const EDGE_PAD = 16;

  // Radial menu animation — style and speed, each stored as a plain
  // string enum (like closureHolidayMode elsewhere) rather than a
  // number, so a corrupted/hand-edited settings value degrades to a
  // safe, obviously-valid default instead of silently producing some
  // in-between numeric value nothing was designed to handle.
  const RADIAL_ANIM_STYLES = ["pop", "fade", "spin", "slide"];
  function normalizeRadialAnimStyle(v) {
    return RADIAL_ANIM_STYLES.includes(String(v)) ? String(v) : "pop";
  }

  // A unitless multiplier applied to every hardcoded transition duration
  // in the radial menu's CSS via calc(var(--wmeRcDur) * <base-duration>)
  // — one JS-set value scales opacity/transform/etc. together without
  // needing to track separate absolute durations per animation style.
  // Per-style opening stagger, in milliseconds between one item and the
  // next (before the speed multiplier). "spin" is deliberately 0: its
  // items ride a single rotating ring and are counter-rotated by exactly
  // the ring's angle to stay upright, so staggering them would break
  // that cancellation and make the icons visibly tilt out of true.
  const RADIAL_ANIM_STAGGER = { pop: 26, fade: 10, spin: 0, slide: 24 };
  // Longest single-element duration of each style's keyframes, in ms and
  // before the speed multiplier. Kept in sync with the CSS by hand —
  // used only as the fallback deadline for marking the menu settled on
  // engines without Element.getAnimations(), where being a little late
  // is harmless and being early would snap the animation short.
  const RADIAL_ANIM_BASE_MS = { pop: 420, fade: 500, spin: 550, slide: 460 };

  const RADIAL_ANIM_SPEEDS = { slow: 1.6, normal: 1, fast: 0.55 };
  function normalizeRadialAnimSpeed(v) {
    return Object.prototype.hasOwnProperty.call(RADIAL_ANIM_SPEEDS, v) ? v : "normal";
  }
  function radialAnimSpeedMultiplier(v) {
    return RADIAL_ANIM_SPEEDS[normalizeRadialAnimSpeed(v)];
  }

  /* ------------------------------------------------------------------ *
   *  Firebase Auth (anonymous)
   * ------------------------------------------------------------------ *
   * Gives every browser a stable, silent identity — no login screen, no
   * credentials — so shared-pin database rules can key writes/deletes to
   * "whoever created this pin" via auth.uid, instead of leaving every
   * shared pin editable by literally anyone. This is the client half of
   * that; the matching Realtime Database rules (checking auth.uid against
   * a createdByUid field) are the other half and live in the separate
   * rules file, since rules are configured in the Firebase console, not
   * shipped in the userscript.
   *
   * Endpoints and request/response shapes below are taken directly from
   * Firebase's own REST API reference (firebase.google.com/docs/reference/
   * rest/auth), not guessed:
   *   - accounts:signUp with no email/password = anonymous sign-up,
   *     returns { idToken, refreshToken, localId, expiresIn } (camelCase).
   *   - securetoken.googleapis.com/v1/token exchanges a refresh token for
   *     a new idToken, but replies in snake_case ({ id_token,
   *     refresh_token, ... }) — a real inconsistency between the two
   *     endpoints, not a typo, so both shapes are handled explicitly
   *     below rather than assumed to match.
   */
  const FIREBASE_API_KEY = "AIzaSyDlH83Ax_FxAL06dAkVStda1qrDN8bGOls";
  const AUTH_SIGNUP_URL = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_API_KEY}`;
  const AUTH_REFRESH_URL = `https://securetoken.googleapis.com/v1/token?key=${FIREBASE_API_KEY}`;
  const AUTH_SESSION_KEY = `${SCRIPT_ID}:authSession:v1`;

  let authSession = null; // { idToken, refreshToken, localId, expiresAt }
  let authInFlight = null; // in-flight sign-up/refresh promise, to avoid parallel requests racing each other

  function loadAuthSession() {
    try {
      const s = JSON.parse(localStorage.getItem(AUTH_SESSION_KEY) || "null");
      if (s && typeof s.idToken === "string" && typeof s.refreshToken === "string" && typeof s.localId === "string") {
        return s;
      }
    } catch {}
    return null;
  }

  function saveAuthSession(s) {
    authSession = s;
    try { localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(s)); } catch {}
  }

  // Wipes both the in-memory and persisted session, forcing the next
  // ensureAuthSession() call to sign up completely from scratch rather
  // than trying (and likely re-failing) a refresh against a token the
  // server has just told us it doesn't accept. Used when a write comes
  // back 401/403 — see authedFirebaseUrl's own comment for why this
  // matters more than it might look like it should.
  function invalidateAuthSession() {
    authSession = null;
    try { localStorage.removeItem(AUTH_SESSION_KEY); } catch {}
  }

  async function signUpAnonymously() {
    const res = await gmFetch(AUTH_SIGNUP_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ returnSecureToken: true }),
    });
    if (!res.ok) {
      let bodyText = "";
      try { bodyText = await res.text(); } catch {}
      throw new Error(`Anonymous sign-up failed: HTTP ${res.status}${bodyText ? `: ${bodyText}` : ""}`);
    }
    const data = await res.json();
    if (!data || !data.idToken || !data.refreshToken || !data.localId) {
      throw new Error("Anonymous sign-up response missing expected fields: " + JSON.stringify(data));
    }
    const expiresInSec = Number(data.expiresIn) || 3600;
    return {
      idToken: data.idToken,
      refreshToken: data.refreshToken,
      localId: data.localId,
      // Refresh a little early (5 min buffer) rather than cutting it exactly
      // at expiry, so a request started right before expiry doesn't race it.
      expiresAt: Date.now() + Math.max(60, expiresInSec - 300) * 1000,
    };
  }

  async function refreshAuthSession(refreshToken) {
    const res = await gmFetch(AUTH_REFRESH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(refreshToken)}`,
    });
    if (!res.ok) {
      let bodyText = "";
      try { bodyText = await res.text(); } catch {}
      throw new Error(`Token refresh failed: HTTP ${res.status}${bodyText ? `: ${bodyText}` : ""}`);
    }
    const data = await res.json();
    // Deliberately snake_case here — this endpoint's response shape does
    // not match accounts:signUp's camelCase, per Firebase's own docs.
    const idToken = data?.id_token;
    const newRefreshToken = data?.refresh_token;
    const localId = data?.user_id;
    if (!idToken || !newRefreshToken || !localId) {
      throw new Error("Token refresh response missing expected fields: " + JSON.stringify(data));
    }
    const expiresInSec = Number(data.expires_in) || 3600;
    return {
      idToken,
      refreshToken: newRefreshToken,
      localId,
      expiresAt: Date.now() + Math.max(60, expiresInSec - 300) * 1000,
    };
  }

  // Returns whichever of {the in-memory session, what's currently in
  // localStorage} is fresher. Reading localStorage on every call — not
  // just as a fallback when the in-memory copy is null — matters because
  // localStorage is shared across every tab of this script on this
  // origin: a SECOND WME tab can refresh/rotate the same anonymous
  // identity's tokens on its own schedule, and this tab's in-memory copy
  // has no way to notice that happened unless it re-checks. Left
  // unnoticed, this tab could later try to refresh using a refreshToken
  // the other tab has ALREADY single-use-consumed, get rejected by
  // Google's refresh endpoint, and fall through to minting a brand new
  // anonymous identity — permanently losing access to pins the (still
  // perfectly valid, still-in-use) shared identity owns.
  //
  // Confirmed in the field: a tab left idle a long time started getting
  // "permission denied" deleting a pin it had always owned, fixed only
  // by a full page reload — which was really just forcing exactly this
  // same fresh-read-from-storage, the blunt way.
  function newestAuthSession() {
    const stored = loadAuthSession();
    if (!stored) return authSession;
    if (!authSession) return stored;
    return stored.expiresAt > authSession.expiresAt ? stored : authSession;
  }

  // Returns a valid { idToken, localId, ... } session, signing up or
  // refreshing as needed. Safe to call before every Firebase Database
  // request — it's a no-op (just returns the cached session) once a
  // non-expired token is already in hand, and concurrent callers share
  // a single in-flight request instead of each starting their own.
  async function ensureAuthSession() {
    // Adopt a fresher session another tab may have produced BEFORE
    // deciding whether the current one is still good enough — see
    // newestAuthSession() above.
    const newest = newestAuthSession();
    if (newest && newest !== authSession) authSession = newest;

    if (authSession && authSession.expiresAt > Date.now()) return authSession;
    if (authInFlight) return authInFlight;

    authInFlight = (async () => {
      try {
        const cached = authSession || loadAuthSession();
        if (cached && cached.expiresAt > Date.now()) {
          saveAuthSession(cached);
          return cached;
        }
        if (cached && cached.refreshToken) {
          try {
            const refreshed = await refreshAuthSession(cached.refreshToken);
            saveAuthSession(refreshed);
            return refreshed;
          } catch (err) {
            dlog("refreshAuthSession failed, falling back to a new anonymous sign-up", err);
            // Refresh tokens can be revoked/invalidated server-side; if so,
            // fall through to a brand new anonymous identity rather than
            // getting stuck. This does mean past shared pins created under
            // the old identity become "not mine" to this browser going
            // forward — an inherent tradeoff of anonymous auth with no
            // recovery mechanism, not a bug.
          }
        }
        const fresh = await signUpAnonymously();
        saveAuthSession(fresh);
        return fresh;
      } finally {
        authInFlight = null;
      }
    })();

    return authInFlight;
  }

  // Appends the current auth token to a Realtime Database REST URL. Every
  // shared-pins call should route through this rather than firebaseUrl()
  // directly, since the database rules require auth for writes/deletes.
  //
  // Returns null (rather than an unauthenticated URL) if a session
  // genuinely can't be obtained. The previous version fell back to
  // firebaseUrl(path) with no ?auth= param at all when ensureAuthSession()
  // threw — which the database rules then rejected as a hard permission
  // error, indistinguishable from a real bug, and with nothing in the
  // running page ever retrying afterward (only a full browser refresh,
  // which forces a fresh sign-up from scratch, happened to clear it).
  // Callers now check for null and can retry with a forced-fresh session
  // instead of quietly shipping a request that was always going to fail.
  async function authedFirebaseUrl(path) {
    const session = await ensureAuthSession().catch((err) => {
      dlog("ensureAuthSession failed", err);
      return null;
    });
    if (!session) return null;
    return `${firebaseUrl(path)}?auth=${encodeURIComponent(session.idToken)}`;
  }

  // "storage" only fires in OTHER tabs/windows of this same origin, never
  // the one that made the write — exactly the notification this needs:
  // the moment another tab of this script rotates the shared anonymous
  // session, this tab adopts it immediately, on top of the same check
  // ensureAuthSession() already does on every call regardless. Keeps the
  // gap between "another tab refreshed" and "this tab notices" as small
  // as possible, without waiting for this tab to make its own Firebase
  // call first.
  window.addEventListener("storage", (e) => {
    if (e.key !== AUTH_SESSION_KEY) return;
    const newest = newestAuthSession();
    if (newest && newest !== authSession) authSession = newest;
  }, { passive: true });

  let sdk = null;
  let enabled = true;
  let lastLonLat = null;

  let menuEl = null;
  let escHandler = null;
  let outsideHandler = null;

  let pinsLayer = null;
  const pinMarkers = new Map();

  let panelEl = null;
  // Created once by ensurePinsPanel(), then re-appended (not recreated)
  // after every renderPinsPanel() — that function wipes panelEl's
  // innerHTML and rebuilds it from scratch on every call, which would
  // otherwise destroy this element and its listeners along with
  // everything else.
  let panelResizeHandleEl = null;
  let panelResizeHandleLeftEl = null;
  let panelDidDrag = false; // true right after a drag ends, to swallow the trailing click on the collapsed bubble
  let sidebarMounted = false;

  /* ------------------------------------------------------------------ *
   *  Settings
   * ------------------------------------------------------------------ */

  // Fallback text for the closure "quick description" shortcut. Kept as a
  // constant (rather than only living inside DEFAULT_SETTINGS) so the
  // settings UI can offer a one-click "back to default" without having to
  // reach into the defaults object.
  const DEFAULT_QUICK_DESCRIPTION = "WazePT: Via Interdita";

  // The last description text a closure was actually APPLIED with — not
  // just typed and abandoned. Deliberately a plain string in its own
  // key rather than a settings field: it changes on every closure, so
  // it doesn't belong alongside genuinely stable preferences, and a
  // string is all "reuse the last one" ever needs.
  const CLOSURE_LAST_DESCRIPTION_KEY = `${SCRIPT_ID}:closureLastDescription:v1`;

  function loadLastClosureDescription() {
    try { return localStorage.getItem(CLOSURE_LAST_DESCRIPTION_KEY) || ""; } catch { return ""; }
  }

  function saveLastClosureDescription(text) {
    const clean = String(text || "").trim();
    if (!clean) return; // never overwrite a real remembered value with blank
    try { localStorage.setItem(CLOSURE_LAST_DESCRIPTION_KEY, clean); } catch {}
  }

  const DEFAULT_SETTINGS = {
    markerOnCopy: true,
    markerOnRefresh: true,
    markerOnNewTab: true,
    // Radial menu animation. Kept separate from every other "on/off"
    // toggle in this settings object because it has two more knobs
    // (style, speed) rather than just a boolean — mirrors the existing
    // closureHolidayMode-style "enum stored as a string" pattern used
    // elsewhere rather than inventing a new shape for this one setting.
    radialAnimEnabled: true,
    radialAnimStyle: "pop",
    radialAnimSpeed: "normal",
    includeLayers: false,
    // Route test options, as the same bit flags WME Route Checker uses
    // (see ROUTE_OPT). 16 = ALLOW_UTURNS alone, which is that script's
    // own default: a private vehicle, avoiding nothing, U-turns allowed.
    // Stored as a number rather than separate booleans so the value can
    // be compared with Route Checker's directly.
    routeOptions: 16,
    routeAlternatives: true,
    // Opt-in: a movable/resizable details panel (distance, time,
    // turn-by-turn, alternatives) shown every time a route is
    // calculated. Off by default — most uses of the A/B test route are
    // a quick visual check, not a full Route-Checker-style comparison.
    routeShowDetails: true,
    // Segment-by-segment speed gradient (colour + km/h label) on the
    // active route, ported from WME Route Speeds. On by default since
    // it's the main payoff of testing a route in the first place.
    routeShowSpeeds: true,
    showPanel: true,
    showPinNames: true,
    segmentSnapRadiusPx: 14,
    quietHoursEnabled: false,
    quietHoursStart: "22:00",
    quietHoursEnd: "07:00",
    desktopNotifications: false,
    webhookEnabled: false,
    webhookUrl: "",
    // "auto" follows whatever theme WME itself is using; "dark"/"light"
    // force the script's own UI regardless of WME's theme.
    themeMode: "dark",
    closureIgnoreTraffic: false,
    // 2 = CLOSURE_NODES.inner. Written as a literal because this table
    // is declared above the closure section that owns the constant;
    // normalizeClosureNodeMode() is what every reader goes through, so a
    // drift here would be caught there rather than silently applied.
    closureNodeMode: 2,
    closureMode: "simples",
    closureEndModeSimple: "fim",
    closureEndModeWeekly: "fim",
    closureWeekdays: [false, true, true, true, true, true, false],
    closureUseWazept: false,
    // Text the "Usar descrição rápida" toggle drops into the closure
    // Description field. Editable in the sidebar so each editor can keep
    // their own house phrasing instead of the hard-coded default.
    closureQuickDescription: DEFAULT_QUICK_DESCRIPTION,
    // How Portuguese public holidays interact with a weekly closure:
    // "normal" ignores them entirely, the other three follow the same
    // semantics as WME Closures Toolkit.
    closureHolidayMode: "normal",
    // Sort order for the pins panel list. See PIN_SORT_OPTIONS.
    pinSortMode: "created-desc",
  };

  // loadSettings() is called from hot paths (every render, every
  // isLightTheme() check, the per-second countdown tick), and each call
  // used to re-parse the whole settings JSON. Cache the *parsed* result
  // keyed on the raw stored string, then hand out a shallow copy: still
  // correct if another tab writes to localStorage (the cheap getItem()
  // runs every call, only a genuine change re-parses), and safe against
  // the many call sites that do `const s = loadSettings(); s.x = v;
  // saveSettings(s)` — without the copy those would mutate the cache in
  // place. Copying is far cheaper than re-parsing.
  let settingsCacheRaw = null;
  let settingsCacheVal = null;

  function loadSettings() {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (raw !== settingsCacheRaw || !settingsCacheVal) {
        settingsCacheRaw = raw;
        settingsCacheVal = { ...DEFAULT_SETTINGS, ...(raw ? JSON.parse(raw) : {}) };
      }
      return { ...settingsCacheVal };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }

  function saveSettings(s) {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(s || {}));
      // Drop the cache so the next read reflects the write immediately,
      // rather than relying on the raw-string comparison alone.
      settingsCacheRaw = null;
      settingsCacheVal = null;
    } catch {}
  }

  /* ------------------------------------------------------------------ *
   *  Small helpers
   * ------------------------------------------------------------------ */

  function fmt(n) { return Number(n).toFixed(6); }

  function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

  function svg(path) {
    return `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
  }

  const ICONS = {
    pin: svg(`<path d="M12 21s6-5.2 6-11a6 6 0 0 0-12 0c0 5.8 6 11 6 11z"/><circle cx="12" cy="10" r="2"/>`),
    link: svg(`<path d="M10 13a4 4 0 0 0 5.7 0l2-2a4 4 0 0 0-5.7-5.7l-1.1 1.1"/><path d="M14 11a4 4 0 0 0-5.7 0l-2 2A4 4 0 0 0 12 18.7l1.1-1.1"/>`),
    refresh: svg(`<path d="M20 12a8 8 0 1 1-2.3-5.7"/><path d="M18 3v4h-4"/>`),
    bump: svg(`<path d="M3 17h18"/><path d="M6 17a6 6 0 0 1 12 0"/><path d="M8.5 21H10"/><path d="M14 21h1.5"/>`),
    light: svg(`<rect x="8" y="3" width="8" height="16" rx="3"/><circle cx="12" cy="7.5" r="1.1"/><circle cx="12" cy="11" r="1.1"/><circle cx="12" cy="14.5" r="1.1"/><path d="M8 8H5"/><path d="M16 8h3"/><path d="M10 21h4"/>`),
    road: svg(`<path d="M7 3 4 21"/><path d="m17 3 3 18"/><path d="M12 4v3"/><path d="M12 10.5v3"/><path d="M12 17v3"/>`),
    trash: svg(`<path d="M4 7h16"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M6 7l1 13h10l1-13"/><path d="M9 7V4h6v3"/>`),
    bell: svg(`<path d="M18 9a6 6 0 1 0-12 0c0 7-2 7-2 9h16c0-2-2-2-2-9"/><path d="M10 21h4"/>`),
    people: svg(`<path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>`),
    chevron: svg(`<path d="M7 10l5 5 5-5"/>`),
    close: svg(`<path d="M7 7l10 10M17 7L7 17"/>`),
    closure: svg(`<rect x="3" y="10" width="18" height="4" rx="1"/><path d="M6 10 9 14"/><path d="M11 10 14 14"/><path d="M16 10 19 14"/>`),
    grip: svg(`<circle cx="9" cy="6" r="1.3" fill="currentColor" stroke="none"/><circle cx="9" cy="12" r="1.3" fill="currentColor" stroke="none"/><circle cx="9" cy="18" r="1.3" fill="currentColor" stroke="none"/><circle cx="15" cy="6" r="1.3" fill="currentColor" stroke="none"/><circle cx="15" cy="12" r="1.3" fill="currentColor" stroke="none"/><circle cx="15" cy="18" r="1.3" fill="currentColor" stroke="none"/>`),
    sync: svg(`<path d="M20 12a8 8 0 1 1-2.3-5.7"/><path d="M18 3v4h-4"/>`),
    pencil: svg(`<path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3z"/><path d="M13.5 6.5l4 4"/>`),
    // A curvy, dotted path between two small GPS-point circles — the
    // general "Routes" icon, shown before either point has been placed.
    // The dashes are a short dash + wide gap (stroke-dasharray) rather
    // than the plain dashed pattern round line-caps already give a solid
    // stroke, so this alone is what actually reads as "dotted".
    routeA: svg(`<circle cx="5" cy="19" r="2.2"/><circle cx="19" cy="5" r="2.2"/><path d="M6.7 17.4C3 12 11 14.2 10 10C9 5.8 16 8.3 17.3 6.6" stroke-dasharray="0.1 3.1"/>`),
    // A dashed polygon (the drawn area) with a small note icon inside —
    // for the "map note (area)" radial entry.
    mapNoteArea: svg(`<path d="M4 8l5-3 6 2 5-3v13l-5 3-6-2-5 3z" stroke-dasharray="2.4 2"/><path d="M9 6v13"/><path d="M15 7.5v13"/>`),
    scissors: svg(`<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M8.5 8.5L20 20"/><path d="M20 4L8.5 15.5"/>`),
    routeB: svg(`<path d="M5 20c4 0 4-8 8-8s6 0 6 0"/><circle cx="19" cy="12" r="2"/><text x="12" y="9" font-size="9" font-weight="700" text-anchor="middle" fill="currentColor" stroke="none">B</text>`),
    lock: svg(`<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>`),
    sort: svg(`<path d="M4 7h10"/><path d="M4 12h7"/><path d="M4 17h4"/><path d="M17 5v14"/><path d="m14 16 3 3 3-3"/>`),
    check: svg(`<path d="m5 12.5 4.5 4.5L19 7.5"/>`),
    download: svg(`<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M4 19h16"/>`),
    upload: svg(`<path d="M12 21V9"/><path d="m7 14 5-5 5 5"/><path d="M4 19h16"/>`),
    externalMap: svg(`<path d="M9 3 3 5.5v15.5l6-2.5 6 2.5 6-2.5V3l-6 2.5-6-2.5z"/><path d="M9 3v15.5"/><path d="M15 5.5V21"/><path d="M14 9h5"/><path d="M16.5 6.5v5"/>`),
    externalLink: svg(`<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><path d="M15 3h6v6"/><path d="M10 14 21 3"/>`),
    bug: svg(`<path d="M8 6 6 4"/><path d="m16 6 2-2"/><rect x="7" y="8" width="10" height="11" rx="5"/><path d="M12 8V6"/><path d="M4 13h3"/><path d="M17 13h3"/><path d="M5 19l2.5-2"/><path d="M19 19l-2.5-2"/>`),
  };

  async function setClipboard(text) {
    try { if (typeof GM_setClipboard === "function") { GM_setClipboard(text); return true; } } catch {}
    try { await navigator.clipboard.writeText(text); return true; } catch {}
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      return ok;
    } catch {}
    return false;
  }

  function toast(msg) {
    ensureCss();
    const el = document.createElement("div");
    el.className = "wmeRcToast";
    el.textContent = msg;
    (document.body || document.documentElement).appendChild(el);
    requestAnimationFrame(() => el.classList.add("show"));
    setTimeout(() => {
      el.classList.remove("show");
      setTimeout(() => el.remove(), 220);
    }, 1500);
  }

  // Auto-detects WME's own theme — used as-is when themeMode is "auto",
  // and bypassed entirely when the user has forced dark/light below.
  function detectWmeIsLightTheme() {
    try {
      const roots = [document.documentElement, document.body, document.querySelector("[wz-theme]")].filter(Boolean);
      for (const r of roots) {
        const t = String(r.getAttribute && r.getAttribute("wz-theme") || "").toLowerCase();
        if (t === "light") return true;
        if (t === "dark") return false;
      }
      const bg = getComputedStyle(document.documentElement).getPropertyValue("--background_default").trim();
      const m = bg.match(/rgba?\(([^)]+)\)/i);
      if (m) {
        const p = m[1].split(",").map(Number);
        return (0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2]) / 255 > 0.58;
      }
      if (/^#([0-9a-f]{6})$/i.test(bg)) {
        const h = bg.slice(1);
        const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
        return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 > 0.58;
      }
    } catch {}
    return false;
  }

  // The one function every UI piece should call. Respects the user's
  // manual dark/light override; falls back to following WME's own theme
  // when set to "auto" (the default, matching the script's original
  // always-follow-WME behavior).
  function isLightTheme() {
    let mode = "auto";
    try { mode = loadSettings().themeMode || "auto"; } catch {}
    if (mode === "dark") return false;
    if (mode === "light") return true;
    return detectWmeIsLightTheme();
  }

  /* ------------------------------------------------------------------ *
   *  Styles
   * ------------------------------------------------------------------ */

  function ensureCss() {
    if (document.getElementById("wmeRcRadialCss")) return;
    const s = document.createElement("style");
    s.id = "wmeRcRadialCss";
    s.textContent = `
      .wmeRcToast{position:fixed;right:16px;bottom:16px;z-index:2147483647;background:rgba(20,20,22,.92);
        color:#fff;border:1px solid rgba(255,255,255,.16);border-radius:12px;padding:10px 13px;
        box-shadow:0 12px 30px rgba(0,0,0,.38);backdrop-filter:blur(10px);
        font:13px/1.25 system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;
        opacity:0;transform:translateY(10px);transition:.18s ease;pointer-events:none;max-width:min(420px,90vw);}
      .wmeRcToast.show{opacity:1;transform:translateY(0);}

      .wmeRcRadial{position:fixed;z-index:2147483647;width:0;height:0;pointer-events:none;
        font:700 12px/1.2 system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;}
      .wmeRcRadialItem{position:absolute;width:${BTN}px;height:${BTN}px;
        margin:-${BTN / 2}px 0 0 -${BTN / 2}px;border-radius:999px;
        display:flex;align-items:center;justify-content:center;pointer-events:auto;cursor:pointer;
        background:rgba(20,20,22,.84);border:1px solid rgba(255,255,255,.16);color:#fff;
        box-shadow:0 12px 28px rgba(0,0,0,.44);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);
        opacity:0;
        transition:background .16s ease,border-color .16s ease,
          transform .12s cubic-bezier(.2,.9,.2,1);}

      /* ── Opening animations ───────────────────────────────────────────
         These are @keyframes, not transitions, and that change is the
         whole point: with a two-state transition, "pop", "fade" and
         "spin" could only ever differ by a slightly different scale or a
         rotation squeezed into the same ~200ms, so in practice all three
         read as "the menu appeared" and were indistinguishable from each
         other. Keyframes allow a shape per style — an overshoot, a
         blur dissolve, a whole ring turning — which is what actually
         makes them tell apart at a glance.

         Every duration is multiplied by --wmeRcDur (the Slow/Normal/Fast
         setting) and every per-item stagger is set in JS as
         --wmeRcDelay, already scaled by the same multiplier.
         animation-fill-mode:both holds the 0% frame during that delay,
         so a staggered item stays invisible instead of flashing in at
         full opacity while it waits its turn. */

      /* SURGIR (pop): a spring. Overshoots past full size, settles back
         with a small counter-bounce. Nothing travels — it's growth. */
      @keyframes wmeRcAnimPop{
        0%{opacity:0;transform:scale(.15);}
        45%{opacity:1;transform:scale(1.28);}
        70%{transform:scale(.9);}
        86%{transform:scale(1.06);}
        100%{opacity:1;transform:scale(1);}
      }
      .wmeRcRadial.anim-pop.show .wmeRcRadialItem{
        animation:wmeRcAnimPop calc(var(--wmeRcDur,1) * .42s) cubic-bezier(.34,1.2,.5,1) both;
        animation-delay:var(--wmeRcDelay,0ms);}

      /* ESBATER (fade): the opposite of pop — zero movement and zero
         scaling, a slow out-of-focus dissolve into place. The blur is
         what stops "no transform at all" from looking like the menu
         simply blinked on. */
      @keyframes wmeRcAnimFade{
        0%{opacity:0;filter:blur(7px);}
        100%{opacity:1;filter:blur(0);}
      }
      .wmeRcRadial.anim-fade.show .wmeRcRadialItem,
      .wmeRcRadial.anim-fade.show .wmeRcRadialHub{
        animation:wmeRcAnimFade calc(var(--wmeRcDur,1) * .5s) ease-out both;
        animation-delay:var(--wmeRcDelay,0ms);}

      /* RODAR (spin): the RING turns, not the individual icons. The whole
         wrapper is rotated ~150° around the hub while it scales up, so
         the buttons sweep around the centre like a dial being wound open
         — a completely different motion from anything the other three
         styles do. Each item is then counter-rotated by exactly the same
         amount, which keeps the icons upright the entire way instead of
         having them cartwheel. */
      @keyframes wmeRcAnimRingSpin{
        0%{opacity:0;transform:rotate(-150deg) scale(.2);}
        70%{opacity:1;}
        100%{opacity:1;transform:rotate(0deg) scale(1);}
      }
      @keyframes wmeRcAnimSpinItem{
        0%{opacity:0;transform:rotate(150deg);}
        45%{opacity:1;}
        100%{opacity:1;transform:rotate(0deg);}
      }
      .wmeRcRadial.anim-spin.show{
        animation:wmeRcAnimRingSpin calc(var(--wmeRcDur,1) * .55s) cubic-bezier(.22,.85,.25,1) both;}
      /* No stagger here on purpose: the items are riding a single
         rotating ring, so they have to share its timing exactly or the
         counter-rotation stops cancelling out and the icons visibly
         tilt. */
      .wmeRcRadial.anim-spin.show .wmeRcRadialItem{
        animation:wmeRcAnimSpinItem calc(var(--wmeRcDur,1) * .55s) cubic-bezier(.22,.85,.25,1) both;}

      /* DESLIZAR (slide): items fly out from the hub along their own
         radial angle, via the per-item --wmeRcDx/--wmeRcDy custom
         properties set in JS. Kept exactly as it originally was — a
         straight travel from the hub to the final position, no overshoot
         — just moved onto keyframes like the rest so it shares the same
         fill-mode/stagger machinery as the other three styles. */
      @keyframes wmeRcAnimSlide{
        0%{opacity:0;
           transform:translate(calc(-1 * var(--wmeRcDx,0px)),calc(-1 * var(--wmeRcDy,0px))) scale(.5);}
        100%{opacity:1;transform:translate(0,0) scale(1);}
      }
      .wmeRcRadial.anim-slide.show .wmeRcRadialItem{
        animation:wmeRcAnimSlide calc(var(--wmeRcDur,1) * .2s) cubic-bezier(.2,.9,.2,1) both;
        animation-delay:var(--wmeRcDelay,0ms);}

      /* Hub: grows in for pop/spin/slide (anim-fade overrides it above
         with the dissolve, so the hub matches its own style). */
      @keyframes wmeRcAnimHub{
        0%{opacity:0;transform:scale(.45);}
        100%{opacity:1;transform:scale(1);}
      }
      .wmeRcRadial.show .wmeRcRadialHub{
        animation:wmeRcAnimHub calc(var(--wmeRcDur,1) * .3s) cubic-bezier(.2,.9,.2,1) both;}
      /* The hub sits at the ring's centre of rotation, so anim-spin's
         wrapper rotation moves it not at all — it only needs the fade,
         and giving it its own scale on top of the ring's would double
         up. */
      .wmeRcRadial.anim-spin.show .wmeRcRadialHub{
        animation:wmeRcAnimFade calc(var(--wmeRcDur,1) * .55s) ease-out both;}

      /* ── Settled ─────────────────────────────────────────────────────
         Added by JS once the opening animation has finished. A filled
         (fill-mode:both) animation keeps overriding transform for as
         long as it's attached, which would permanently block the hover
         and :active transforms below — so the animation is dropped and
         the final state is restated as plain declarations. Identical to
         the 100% frame of every keyframe above, so there is no visual
         step when it takes over. */
      .wmeRcRadial.anim-settled,
      .wmeRcRadial.anim-settled .wmeRcRadialItem,
      .wmeRcRadial.anim-settled .wmeRcRadialHub{
        animation:none !important;opacity:1;transform:none;filter:none;}

      /* Animation disabled entirely: hard-overrides to none (not just a
         zero duration — some engines still run a same-duration reflow
         tick with a 0s value that can flash) so the menu appears in its
         final state with no visible step at all. */
      .wmeRcRadial.no-anim,
      .wmeRcRadial.no-anim .wmeRcRadialItem,
      .wmeRcRadial.no-anim .wmeRcRadialHub{
        animation:none !important;transition:none !important;}
      .wmeRcRadial.no-anim .wmeRcRadialItem,
      .wmeRcRadial.no-anim .wmeRcRadialHub{opacity:1;transform:none;}

      /* Hover/active are written at .wmeRcRadial-level specificity on
         purpose. As plain ".wmeRcRadialItem:hover" they lost to every
         ".wmeRcRadial.show .wmeRcRadialItem" rule above (three classes
         beats two), which meant the hover lift silently never rendered
         once the menu had opened. */
      .wmeRcRadial .wmeRcRadialItem:hover{background:rgba(60,140,255,.32);
        border-color:rgba(130,185,255,.55);transform:scale(1.08);}
      .wmeRcRadial .wmeRcRadialItem:active{transform:scale(.95);}
      .wmeRcRadialItem.is-disabled{opacity:.32 !important;cursor:default;pointer-events:none;}
      /* Accent colours for radial items whose meaning changes with state.
         Used by the route entry: blue while it's waiting for point B,
         red once it's offering to clear the finished route. Written at
         .wmeRcRadial-level specificity for the same reason the hover
         rule below is — the plain ".wmeRcRadialItem" form loses to the
         ".wmeRcRadial.show .wmeRcRadialItem" animation rules. */
      .wmeRcRadial .wmeRcRadialItem.is-accent-blue{background:rgba(47,111,237,.85);
        border-color:rgba(150,190,255,.7);}
      .wmeRcRadial .wmeRcRadialItem.is-accent-blue:hover{background:rgba(47,111,237,1);}
      .wmeRcRadial .wmeRcRadialItem.is-accent-red{background:rgba(229,72,77,.85);
        border-color:rgba(255,150,150,.7);}
      .wmeRcRadial .wmeRcRadialItem.is-accent-red:hover{background:rgba(229,72,77,1);}
      .wmeRcRadialItem svg{width:23px;height:23px;display:block;}
      .wmeRcRadialHub{position:absolute;left:0;top:0;width:82px;height:82px;margin:-41px 0 0 -41px;
        border-radius:999px;pointer-events:auto;cursor:pointer;display:flex;align-items:center;
        justify-content:center;text-align:center;padding:8px;
        background:rgba(16,16,18,.78);border:1px solid rgba(255,255,255,.12);color:#fff;
        box-shadow:0 12px 30px rgba(0,0,0,.42);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);
        opacity:0;}
      .wmeRcRadialHubTxt{font-size:11px;font-weight:800;line-height:1.2;opacity:.94;max-width:68px;
        overflow:hidden;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;}

      /* Respects the OS-level "reduce motion" preference: the menu still
         appears, it just doesn't move to get there. */
      @media (prefers-reduced-motion: reduce){
        .wmeRcRadial,
        .wmeRcRadial .wmeRcRadialItem,
        .wmeRcRadial .wmeRcRadialHub{animation:none !important;}
        .wmeRcRadial.show .wmeRcRadialItem,
        .wmeRcRadial.show .wmeRcRadialHub{opacity:1;transform:none;filter:none;}
      }

      .wmeRcRadial.theme-light .wmeRcRadialItem{background:rgba(255,255,255,.97);color:#111827;
        border-color:rgba(15,23,42,.14);box-shadow:0 12px 28px rgba(15,23,42,.18);}
      .wmeRcRadial.theme-light .wmeRcRadialItem:hover{background:rgba(219,234,254,.98);border-color:rgba(37,99,235,.32);}
      .wmeRcRadial.theme-light .wmeRcRadialHub{background:rgba(255,255,255,.95);color:#111827;border-color:rgba(15,23,42,.12);}

      .wmeRcModalBackdrop{position:fixed;inset:0;z-index:2147483646;background:rgba(5,8,14,.55);
        opacity:0;transition:opacity .13s ease;}
      .wmeRcModalBackdrop.show{opacity:1;}
      .wmeRcModal{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:2147483647;
        width:min(420px,calc(100vw - 24px));max-height:calc(100vh - 24px);
        display:flex;flex-direction:column;
        border-radius:16px;overflow:hidden;opacity:0;
        background:#0f1726;color:#fff;border:1px solid rgba(255,255,255,.12);
        box-shadow:0 24px 70px rgba(0,0,0,.5);transition:opacity .13s ease;
        font:13px/1.35 system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;}
      .wmeRcModal.show{opacity:1;}
      /* Once the user has dragged the dialog (or a saved position is
         restored), left/top become absolute pixels — the centring
         translate has to go, or the window sits half a size off from
         where it was dropped. */
      .wmeRcModal.positioned{transform:none;}
      .wmeRcModal.theme-light{background:#f7f8fa;color:#111827;border-color:rgba(15,23,42,.14);
        box-shadow:0 24px 60px rgba(15,23,42,.20);}
      .wmeRcModalHdr{display:flex;align-items:center;justify-content:space-between;gap:10px;
        padding:12px 14px;border-bottom:1px solid rgba(255,255,255,.09);font-weight:800;
        flex:0 0 auto;user-select:none;}
      .wmeRcModal.draggable .wmeRcModalHdr{cursor:move;}
      .wmeRcModalHdr .wmeRcModalX{cursor:pointer;}
      .wmeRcModal.theme-light .wmeRcModalHdr{border-bottom-color:rgba(15,23,42,.10);}
      .wmeRcModalHdrIco{display:flex;align-items:center;gap:9px;}
      .wmeRcModalHdrIco svg{width:18px;height:18px;}
      .wmeRcModalX{width:28px;height:28px;border-radius:9px;display:flex;align-items:center;justify-content:center;
        cursor:pointer;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.06);}
      .wmeRcModal.theme-light .wmeRcModalX{border-color:rgba(15,23,42,.12);background:rgba(15,23,42,.04);}
      .wmeRcModalX svg{width:14px;height:14px;}
      .wmeRcModalBody{padding:14px;display:flex;flex-direction:column;gap:12px;
        flex:1 1 auto;min-height:0;overflow-y:auto;overflow-x:hidden;}
      /* The closure panel grew enough rows that it can outgrow a laptop
         viewport; scrolling the body (rather than letting the dialog run
         off-screen) keeps the action buttons reachable. */
      .wmeRcModal .wmeRcToggle{width:34px;min-width:34px;height:20px;}
      .wmeRcModal .wmeRcToggle::before{top:2.5px;left:2.5px;width:15px;height:15px;}
      .wmeRcModal .wmeRcToggle.on::before{left:16.5px;}
      .wmeRcInput{width:100%;box-sizing:border-box;padding:10px 12px;border-radius:12px;
        border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.06);color:inherit;outline:none;font:inherit;
        color-scheme:dark;-webkit-text-fill-color:#fff;}
      .wmeRcModal.theme-light .wmeRcInput{border-color:rgba(15,23,42,.16);background:#fff;color-scheme:light;-webkit-text-fill-color:#111827;}
      .wmeRcInput:focus{border-color:rgba(96,165,250,.55);}
      /* Native <select> controls size themselves from line-height, and
         inheriting the modal's 1.35 line-height (meant for paragraph text)
         miscalculates how tall the box needs to be, clipping the option
         text against the edge. Padding tweaks alone don't fix this if the
         box is genuinely too short for the text — only a fixed height with
         a matching line-height guarantees the glyph fits without being cut
         off top or bottom, regardless of font/OS rendering differences. */
      select.wmeRcInput{line-height:38px;height:38px;padding-top:0;padding-bottom:0;}
      /* The dropdown POPUP list for a <select> is often rendered outside
         normal CSS inheritance (some browsers hand it to the OS), so the
         option elements need their own explicit color + background rather
         than relying on what the closed <select> box looks like. Without
         this, dark mode's color:inherit (white text) combines with the
         browser's default white popup background — readable only while
         hovering, when the background happens to flip to the highlight
         color. Both dark and light cases are spelled out here instead of
         assumed. */
      select.wmeRcInput option{color:#fff;background-color:#1b2333;}
      .wmeRcModal.theme-light select.wmeRcInput option{color:#111827;background-color:#fff;}
      /* The sidebar sound picker lives inside WME's own sidebar tab, not
         one of this script's .wmeRcModal dialogs, so it follows WME's own
         theme (via --content_default) rather than this script's dark/light
         setting. The rules above can't reach it, hence a second explicit
         class applied at creation time based on WME's detected theme. */
      select.wmeRcInput.wme-light-select option{color:#111827;background-color:#fff;}
      /* The fixes above only cover the dropdown's open POPUP list. The
         closed select box itself — what's visible showing the current
         selection before you click it — was still using the base dark
         styling (near-black background hint, forced white text), which
         reads as white-on-white once it sits on WME's own light sidebar
         background instead of one of this script's dark modal backdrops. */
      select.wmeRcInput.wme-light-select{background:#fff;border-color:rgba(15,23,42,.16);
        color:#111827;color-scheme:light;-webkit-text-fill-color:#111827;}
      .wmeRcHint{font-size:12px;opacity:.7;}
      .wmeRcColors{display:flex;gap:9px;flex-wrap:wrap;}
      .wmeRcSwatch{width:24px;height:24px;border-radius:8px;cursor:pointer;border:1px solid rgba(255,255,255,.2);}
      .wmeRcSwatch.sel{outline:2px solid rgba(120,180,255,.9);outline-offset:2px;}
      .wmeRcActions{display:flex;justify-content:flex-end;gap:9px;}
      .wmeRcBtn{cursor:pointer;user-select:none;padding:8px 14px;border-radius:11px;font-weight:800;
        border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.06);}
      .wmeRcModal.theme-light .wmeRcBtn:not(.primary):not(.danger){border-color:rgba(15,23,42,.16);background:#fff;color:#111827;}
      .wmeRcBtn.primary{border-color:rgba(96,165,250,.5);background:linear-gradient(180deg,#3b82f6,#2563eb);color:#fff;}
      .wmeRcBtn.danger{border-color:rgba(239,68,68,.45);background:rgba(239,68,68,.18);color:#fff;}

      .wmeRcPins{position:absolute;left:12px;top:12px;z-index:2147483645;width:250px;
        max-height:calc(100vh - 40px);display:flex;flex-direction:column;overflow:hidden;
        background:rgba(20,20,22,.78);color:#fff;border:1px solid rgba(255,255,255,.12);border-radius:14px;
        box-shadow:0 16px 44px rgba(0,0,0,.36);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);
        font:12px/1.25 system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;user-select:none;
        transition:width .16s ease,height .16s ease,border-radius .16s ease;}
      .wmeRcPins.theme-light{background:rgba(248,250,252,.97);color:#111827;border-color:rgba(15,23,42,.12);
        box-shadow:0 14px 34px rgba(15,23,42,.12);}
      .wmeRcPins.hidden{display:none;}
      .wmeRcPins.collapsed{width:48px;height:48px;border-radius:999px;box-shadow:0 10px 26px rgba(0,0,0,.4);
        overflow:visible;}
      .wmeRcPins.collapsed.theme-light{box-shadow:0 8px 20px rgba(15,23,42,.18);}
      .wmeRcPinsHdr{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:9px 10px;
        border-bottom:1px solid rgba(255,255,255,.10);cursor:move;font-weight:900;}
      .wmeRcPins.theme-light .wmeRcPinsHdr{border-bottom-color:rgba(15,23,42,.10);}
      .wmeRcPinsHdrRight{display:flex;align-items:center;gap:7px;}
      .wmeRcPinsCount{opacity:.65;font-weight:700;}
      .wmeRcPinsBtn{width:26px;height:26px;border-radius:9px;display:flex;align-items:center;justify-content:center;
        cursor:pointer;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.06);}
      .wmeRcPins.theme-light .wmeRcPinsBtn{border-color:rgba(15,23,42,.12);background:rgba(15,23,42,.04);}
      .wmeRcPinsBtn svg{width:14px;height:14px;}
      .wmeRcPinsBtn.spinning svg{animation:wmeRcSpin .7s linear infinite;}

      /* Route details panel — same visual language as .wmeRcPins (dark,
         blurred, rounded card) but its own class: no collapse-to-bubble
         behaviour is needed here, and native CSS resize (rather than a
         custom resize-drag handler) is what makes it resizable. It is
         NOT a modal: appended to the map once and shown/hidden, with no
         backdrop and no outside-click handler — the whole point of the
         request was that clicking elsewhere must not close it. */
      .wmeRcRD{position:absolute;left:12px;top:64px;z-index:2147483644;width:420px;height:600px;
        min-width:300px;min-height:340px;max-width:min(92vw,640px);max-height:85vh;
        display:flex;flex-direction:column;overflow:hidden;resize:both;
        background:rgba(20,20,22,.9);color:#fff;border:1px solid rgba(255,255,255,.12);border-radius:14px;
        box-shadow:0 16px 44px rgba(0,0,0,.36);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);
        font:12px/1.35 system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;}
      .wmeRcRD.theme-light{background:rgba(248,250,252,.97);color:#111827;border-color:rgba(15,23,42,.12);
        box-shadow:0 14px 34px rgba(15,23,42,.12);}
      .wmeRcRD.hidden{display:none;}
      .wmeRcRDHdr{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:9px 10px;
        border-bottom:1px solid rgba(255,255,255,.10);cursor:move;font-weight:900;flex:none;user-select:none;}
      .wmeRcRD.theme-light .wmeRcRDHdr{border-bottom-color:rgba(15,23,42,.10);}
      .wmeRcRDClose{width:24px;height:24px;border-radius:8px;display:flex;align-items:center;justify-content:center;
        cursor:pointer;flex:none;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.06);}
      .wmeRcRD.theme-light .wmeRcRDClose{border-color:rgba(15,23,42,.12);background:rgba(15,23,42,.04);}
      .wmeRcRDClose svg{width:13px;height:13px;}
      .wmeRcRDBody{flex:1 1 auto;overflow:auto;padding:10px;}
      .wmeRcRDSummary{font-size:14px;font-weight:800;margin-bottom:2px;}
      .wmeRcRDSummarySub{font-size:11px;opacity:.65;margin-bottom:10px;}
      .wmeRcRDSectionLbl{font-size:11px;font-weight:800;opacity:.72;margin:10px 0 4px;
        text-transform:uppercase;letter-spacing:.02em;}
      .wmeRcRDAlt{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:7px 9px;
        border-radius:9px;margin-bottom:4px;background:rgba(255,255,255,.05);cursor:pointer;}
      .wmeRcRD.theme-light .wmeRcRDAlt{background:rgba(15,23,42,.04);}
      .wmeRcRDAlt:hover{background:rgba(255,255,255,.09);}
      .wmeRcRD.theme-light .wmeRcRDAlt:hover{background:rgba(15,23,42,.07);}
      .wmeRcRDAlt.active{background:rgba(59,130,246,.28);}
      .wmeRcRDAltColor{width:10px;height:10px;border-radius:999px;flex:none;}
      .wmeRcRDAltMain{flex:1 1 auto;font-weight:700;}
      .wmeRcRDAltMeta{opacity:.7;font-size:11px;}
      .wmeRcRDStep{display:flex;gap:8px;align-items:flex-start;padding:6px 2px;
        border-bottom:1px solid rgba(255,255,255,.06);}
      .wmeRcRD.theme-light .wmeRcRDStep{border-bottom-color:rgba(15,23,42,.06);}
      .wmeRcRDStep:last-child{border-bottom:none;}
      .wmeRcRDStepClickable{cursor:pointer;border-radius:6px;margin:0 -4px;padding-left:6px;padding-right:6px;}
      .wmeRcRDStepClickable:hover{background:rgba(255,255,255,.07);}
      .wmeRcRD.theme-light .wmeRcRDStepClickable:hover{background:rgba(15,23,42,.05);}
      .wmeRcRDStepIcon{flex:none;width:18px;text-align:center;opacity:.9;}
      .wmeRcRDStepMain{flex:1 1 auto;}
      .wmeRcRDStepStreet{opacity:.65;font-size:11px;}
      .wmeRcRDStepDist{opacity:.55;font-size:11px;white-space:nowrap;flex:none;}
      /* Time-of-day / day-of-week recalculation row — fixed between the
         header and the scrollable body, imported from WME Route Speeds'
         own hour/day selects + "Calculate Route" button. */
      .wmeRcRDControls{display:flex;align-items:center;gap:6px;padding:8px 10px;flex:none;
        border-bottom:1px solid rgba(255,255,255,.10);}
      .wmeRcRD.theme-light .wmeRcRDControls{border-bottom-color:rgba(15,23,42,.10);}
      .wmeRcRDSelect{flex:1 1 auto;min-width:0;font:inherit;font-size:11px;color:#fff;
        background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.16);
        border-radius:7px;padding:4px 5px;color-scheme:dark;}
      .wmeRcRD.theme-light .wmeRcRDSelect{background:rgba(15,23,42,.05);border-color:rgba(15,23,42,.14);
        color:#111827;color-scheme:light;}
      /* The dropdown's OWN popup list is rendered by the browser/OS
         outside this panel's dark card, with its own default (usually
         white) background — "color:inherit"/"color-scheme:dark" on the
         closed select box above does NOT reach it. Without this, white
         option text landed on that native white popup and was
         unreadable. Options get an explicit, always-readable colour
         pair regardless of the panel's own light/dark theme. */
      .wmeRcRDSelect option{color:#111827;background:#fff;}
      .wmeRcRDRecalcBtn{flex:none;font:inherit;font-size:11px;font-weight:800;color:#fff;
        background:#2563eb;border:none;border-radius:7px;padding:5px 10px;cursor:pointer;}
      .wmeRcRDRecalcBtn:hover{background:#1d4ed8;}
      .wmeRcRDAtLabel{margin-bottom:10px;}
      @keyframes wmeRcSpin{from{transform:rotate(0deg);}to{transform:rotate(360deg);}}
      .wmeRcPinsList{overflow:auto;padding:6px;display:flex;flex-direction:column;gap:5px;}

      /* Horizontal resize handle — a thin strip overlapping the inner
         right edge (position:absolute so it doesn't take up layout space
         and shrink the content column), widening on hover for a bit more
         forgiving a target without looking bulky at rest. Kept fully
         INSIDE the box (right:0, not a negative offset): .wmeRcPins is
         overflow:hidden for its rounded corners, and anything hanging
         outside that box would be both invisible and unclickable in the
         clipped region. Never shown collapsed: a 48x48 bubble isn't
         something there's any reason to resize. */
      .wmeRcPinsResize{position:absolute;top:0;right:0;width:7px;height:100%;
        cursor:ew-resize;z-index:1;touch-action:none;}
      .wmeRcPinsResize::after{content:"";position:absolute;top:0;bottom:0;right:2px;width:1px;
        background:transparent;transition:background .12s ease;}
      .wmeRcPinsResize:hover::after,.wmeRcPinsResize:active::after{background:rgba(255,255,255,.28);}
      .wmeRcPins.theme-light .wmeRcPinsResize:hover::after,
      .wmeRcPins.theme-light .wmeRcPinsResize:active::after{background:rgba(15,23,42,.22);}
      .wmeRcPins.collapsed .wmeRcPinsResize{display:none;}
      /* Mirrors .wmeRcPinsResize onto the left edge instead — same base
         class for the shared sizing/cursor/hover rules above, this just
         overrides which side it's pinned to. Needed for a panel parked
         near the screen's right edge, which has no room to drag the
         RIGHT handle any further right. */
      .wmeRcPinsResizeLeft{left:0;right:auto;}
      .wmeRcPinsResizeLeft::after{left:2px;right:auto;}
      .wmeRcPins.collapsed .wmeRcPinsList{display:none;}

      /* Scrollbars — the default UA chrome (a grey Win95-looking bar on
         Windows) clashed badly with the translucent dark panel. Firefox
         gets the standard properties, Chromium/WebKit the ::-webkit-*
         pseudo-elements; both are set so neither browser falls back. */
      .wmeRcScroll{scrollbar-width:thin;scrollbar-color:rgba(255,255,255,.26) transparent;}
      .wmeRcScroll::-webkit-scrollbar{width:9px;height:9px;}
      .wmeRcScroll::-webkit-scrollbar-track{background:transparent;}
      .wmeRcScroll::-webkit-scrollbar-thumb{background:rgba(255,255,255,.22);border-radius:999px;
        border:2px solid transparent;background-clip:padding-box;}
      .wmeRcScroll::-webkit-scrollbar-thumb:hover{background:rgba(255,255,255,.38);background-clip:padding-box;}
      .wmeRcScroll::-webkit-scrollbar-corner{background:transparent;}
      .wmeRcPins.theme-light .wmeRcScroll,
      .wmeRcModal.theme-light .wmeRcScroll,
      .wmeRcRD.theme-light .wmeRcScroll{scrollbar-color:rgba(15,23,42,.28) transparent;}
      .wmeRcPins.theme-light .wmeRcScroll::-webkit-scrollbar-thumb,
      .wmeRcModal.theme-light .wmeRcScroll::-webkit-scrollbar-thumb,
      .wmeRcRD.theme-light .wmeRcScroll::-webkit-scrollbar-thumb{background:rgba(15,23,42,.24);background-clip:padding-box;}
      .wmeRcPins.theme-light .wmeRcScroll::-webkit-scrollbar-thumb:hover,
      .wmeRcModal.theme-light .wmeRcScroll::-webkit-scrollbar-thumb:hover,
      .wmeRcRD.theme-light .wmeRcScroll::-webkit-scrollbar-thumb:hover{background:rgba(15,23,42,.4);background-clip:padding-box;}

      /* Sort menu, opened from the ⇅ button in the pins panel header.
         position:FIXED, not absolute: .wmeRcPins is overflow:hidden (it
         has to be, for the rounded corners and the collapsed bubble), so
         an absolutely-positioned popup gets clipped the moment the panel
         is shorter than the menu — which is exactly the case when the
         user has only a pin or two. Anchoring to the viewport instead
         sidesteps the clip entirely; the coordinates are computed from
         the button's rect when it opens. */
      .wmeRcSortPop{position:fixed;z-index:2147483646;min-width:172px;
        padding:5px;border-radius:11px;background:rgba(22,24,30,.98);color:#fff;
        border:1px solid rgba(255,255,255,.14);box-shadow:0 14px 32px rgba(0,0,0,.45);
        display:flex;flex-direction:column;gap:2px;
        font:12px/1.25 system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;}
      .wmeRcSortPop.theme-light{background:#fff;color:#111827;border-color:rgba(15,23,42,.14);
        box-shadow:0 12px 28px rgba(15,23,42,.16);}
      .wmeRcSortPop.theme-light .wmeRcSortOpt:hover{background:rgba(37,99,235,.10);}
      .wmeRcSortOpt{display:flex;align-items:center;gap:7px;padding:6px 8px;border-radius:8px;
        cursor:pointer;font-size:11.5px;font-weight:700;white-space:nowrap;}
      .wmeRcSortOpt:hover{background:rgba(255,255,255,.10);}
      .wmeRcSortOptTick{width:13px;height:13px;flex:0 0 13px;display:flex;align-items:center;
        justify-content:center;opacity:0;}
      .wmeRcSortOpt.on .wmeRcSortOptTick{opacity:1;color:#5b9bff;}
      .wmeRcSortOptTick svg{width:13px;height:13px;}
      .wmeRcPinFolder{display:flex;flex-direction:column;}
      .wmeRcPinFolderHdr{display:flex;align-items:center;gap:7px;padding:7px 8px;border-radius:9px;
        cursor:pointer;user-select:none;transition:background .14s ease;}
      .wmeRcPinFolderHdr:hover{background:rgba(255,255,255,.06);}
      .wmeRcPins.theme-light .wmeRcPinFolderHdr:hover{background:rgba(15,23,42,.05);}
      .wmeRcPinFolderChevron{width:14px;height:14px;flex:0 0 14px;display:flex;align-items:center;
        justify-content:center;transform:rotate(0deg);transition:transform .15s ease;opacity:.75;}
      .wmeRcPinFolderChevron svg{width:12px;height:12px;}
      .wmeRcPinFolder.collapsed .wmeRcPinFolderChevron{transform:rotate(-90deg);}
      .wmeRcPinFolderLabel{flex:1 1 auto;min-width:0;font-weight:800;font-size:11.5px;
        text-transform:uppercase;letter-spacing:.03em;opacity:.85;white-space:nowrap;
        overflow:hidden;text-overflow:ellipsis;}
      .wmeRcPinFolderCount{flex:0 0 auto;font-size:11px;font-weight:800;opacity:.55;
        min-width:16px;text-align:center;}
      .wmeRcPinFolderBody{display:flex;flex-direction:column;gap:5px;padding:2px 0 4px 4px;}
      .wmeRcPinFolder.collapsed .wmeRcPinFolderBody{display:none;}
      .wmeRcPinFolder .wmeRcPinsEmpty{padding:6px 8px;font-size:11.5px;text-align:left;opacity:.5;}
      .wmeRcPinsBubble{width:48px;height:48px;border-radius:999px;cursor:pointer;position:relative;
        display:flex;align-items:center;justify-content:center;}
      .wmeRcPinsBubbleImg{width:30px;height:30px;border-radius:50%;pointer-events:none;user-select:none;
        display:block;object-fit:cover;}
      .wmeRcPinsBubbleCount{position:absolute;right:0px;top:0px;min-width:16px;height:16px;padding:0 3px;
        border-radius:999px;background:#ff3b30;color:#fff;font-size:10px;font-weight:900;line-height:16px;
        text-align:center;box-shadow:0 0 0 2px rgba(20,20,22,.85);}
      .wmeRcPins.theme-light .wmeRcPinsBubbleCount{box-shadow:0 0 0 2px rgba(248,250,252,.95);}
      .wmeRcPinsBubbleReminder{position:absolute;left:1px;bottom:1px;width:12px;height:12px;border-radius:999px;
        background:#ffb347;box-shadow:0 0 0 2px rgba(20,20,22,.85);}
      .wmeRcPins.theme-light .wmeRcPinsBubbleReminder{box-shadow:0 0 0 2px rgba(248,250,252,.95);}
      .wmeRcPinRow{display:flex;align-items:center;gap:8px;padding:7px 8px;border-radius:10px;cursor:pointer;
        background:rgba(255,255,255,.05);transition:background .14s ease;}
      .wmeRcPins.theme-light .wmeRcPinRow{background:rgba(15,23,42,.05);}
      .wmeRcPinRow:hover{background:rgba(255,255,255,.11);}
      .wmeRcPins.theme-light .wmeRcPinRow:hover{background:rgba(37,99,235,.10);}
      .wmeRcPinDot{width:10px;height:10px;border-radius:999px;flex:0 0 10px;}
      .wmeRcPinMid{flex:1 1 auto;min-width:0;display:flex;flex-direction:column;gap:2px;}
      .wmeRcPinNameRow{display:flex;align-items:center;gap:6px;min-width:0;}
      .wmeRcPinName{font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0;}
      .wmeRcPinSharedTag{flex:0 0 auto;width:18px;height:18px;border-radius:999px;
        display:flex;align-items:center;justify-content:center;
        background:rgba(47,111,237,.20);color:#5b9bff;border:1px solid rgba(47,111,237,.35);}
      .wmeRcPinSharedTag svg{width:11px;height:11px;}
      .wmeRcPins.theme-light .wmeRcPinSharedTag{background:rgba(47,111,237,.12);color:#1d4ed8;
        border-color:rgba(47,111,237,.30);}
      .wmeRcPinSyncTag{flex:0 0 auto;width:18px;height:18px;border-radius:999px;
        display:flex;align-items:center;justify-content:center;
        background:rgba(255,179,71,.20);color:#ffb347;border:1px solid rgba(255,179,71,.35);}
      .wmeRcPinSyncTag svg{width:11px;height:11px;animation:wmeRcSpin 1.4s linear infinite;}
      .wmeRcPins.theme-light .wmeRcPinSyncTag{background:rgba(217,119,6,.14);color:#b45309;
        border-color:rgba(217,119,6,.30);}
      .wmeRcPinSyncLine{color:#ffb347;}
      .wmeRcPinNewTag{flex:0 0 auto;font-size:9px;font-weight:900;letter-spacing:.02em;
        padding:1px 6px;border-radius:999px;background:rgba(52,199,89,.22);color:#34c759;
        border:1px solid rgba(52,199,89,.4);text-transform:uppercase;}
      .wmeRcPins.theme-light .wmeRcPinNewTag{background:rgba(22,163,74,.14);color:#15803d;
        border-color:rgba(22,163,74,.32);}
      .wmeRcPinBy{font-size:10.5px;opacity:.6;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
      .wmeRcPinLock{display:flex;align-items:center;gap:3px;opacity:.75;color:#ffb347;}
      .wmeRcPinLock svg{width:10px;height:10px;flex:none;}
      .wmeRcPinExpiry{color:#ffb347;opacity:.85;}
      .wmeRcPinCountdown{font-size:11px;font-weight:800;font-variant-numeric:tabular-nums;
        color:#ffb347;opacity:.95;}
      .wmeRcPinRow.has-reminder{box-shadow:inset 2px 0 0 rgba(255,179,71,.7);}
      .wmeRcPinBell{opacity:.55;width:22px;height:22px;border-radius:8px;display:flex;align-items:center;
        justify-content:center;flex:0 0 22px;transition:opacity .14s ease,background .14s ease;}
      .wmeRcPinBell:hover{opacity:1;background:rgba(255,179,71,.20);}
      .wmeRcPinBell.active{opacity:1;color:#ffb347;}
      .wmeRcPinBell svg{width:14px;height:14px;}
      .wmeRcPinDel{opacity:0;width:20px;height:20px;border-radius:7px;display:flex;align-items:center;
        justify-content:center;flex:0 0 20px;transition:opacity .14s ease;}
      .wmeRcPinRow:hover .wmeRcPinDel{opacity:.85;}
      .wmeRcPinDel:hover{opacity:1;background:rgba(239,68,68,.22);}
      .wmeRcPinDel.is-disabled{cursor:default;}
      .wmeRcPinRow:hover .wmeRcPinDel.is-disabled{opacity:.3;}
      .wmeRcPinDel.is-disabled:hover{background:transparent;}
      .wmeRcPinDel svg{width:12px;height:12px;}
      /* Mirrors .wmeRcPinDel (hidden until the row is hovered) so the two
         action buttons appear and behave as a pair; only the hover tint
         differs — blue for edit, red for delete. */
      .wmeRcPinEdit{opacity:0;width:20px;height:20px;border-radius:7px;display:flex;align-items:center;
        justify-content:center;flex:0 0 20px;transition:opacity .14s ease;}
      .wmeRcPinRow:hover .wmeRcPinEdit{opacity:.85;}
      .wmeRcPinEdit:hover{opacity:1;background:rgba(59,130,246,.24);}
      .wmeRcPinEdit.is-disabled{cursor:default;}
      .wmeRcPinRow:hover .wmeRcPinEdit.is-disabled{opacity:.3;}
      .wmeRcPinEdit.is-disabled:hover{background:transparent;}
      .wmeRcPinEdit svg{width:12px;height:12px;}
      /* Edit stacked above Delete rather than side by side — the point is
         to cut the HORIZONTAL room the pair takes in a row that's already
         fighting the name, badges, and meta line for width. Both buttons
         were trimmed from 22px to 20px so the stacked pair's total height
         (20+20+3 gap = 43px) comfortably fits within a row's vertical
         space without forcing rows taller — .wmeRcPinRow is
         align-items:center, so this column just centers against whatever
         height .wmeRcPinMid ends up being for that pin. */
      .wmeRcPinActions{display:flex;flex-direction:column;gap:3px;flex:0 0 auto;}
      .wmeRcPinsEmpty{padding:12px 10px;opacity:.65;text-align:center;}

      .wmeRcRow{display:flex;gap:9px;}
      .wmeRcRow > *{flex:1 1 0;min-width:0;}
      .wmeRcTabs{display:flex;gap:6px;}
      .wmeRcTab{flex:1 1 0;text-align:center;padding:7px 10px;border-radius:10px;cursor:pointer;
        font-weight:800;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.05);color:inherit;}
      .wmeRcModal.theme-light .wmeRcTab:not(.on){border-color:rgba(15,23,42,.14);background:#fff;color:#111827;}
      .wmeRcTab.on{border-color:rgba(96,165,250,.55);background:linear-gradient(180deg,#3b82f6,#2563eb);color:#fff;}
      .wmeRcTab.is-disabled{opacity:.4;cursor:not-allowed;}

      /* Closures panel — reuses the modal shell and the existing tab /
         input / button styles above; only the controls that don't already
         exist elsewhere get their own rules here. */
      .wmeRcClSel{display:flex;align-items:center;gap:7px;padding:7px 9px;border-radius:10px;
        background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.12);font-size:12px;}
      .wmeRcModal.theme-light .wmeRcClSel{background:rgba(15,23,42,.04);border-color:rgba(15,23,42,.12);}
      .wmeRcClSel .wmeRcClDot{width:8px;height:8px;flex:0 0 8px;border-radius:999px;background:#8b95a5;}
      .wmeRcClSel.has-sel .wmeRcClDot{background:#34c759;}
      .wmeRcClRow{display:flex;gap:8px;}
      .wmeRcClRow > *{flex:1 1 0;min-width:0;}
      .wmeRcClLbl{font-size:11px;opacity:.72;margin-bottom:3px;display:block;}
      .wmeRcClHint{font-size:11px;opacity:.7;margin-top:4px;}
      .wmeRcClHint.warn{color:#ffb347;opacity:.95;}
      .wmeRcClHint.err{color:#ff6b6b;opacity:.95;}
      .wmeRcClDays{display:flex;gap:4px;margin-top:6px;}
      .wmeRcClDay{flex:1;padding:6px 0;border-radius:8px;cursor:pointer;font-size:11px;font-weight:800;
        text-align:center;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.05);
        color:inherit;font-family:inherit;}
      .wmeRcModal.theme-light .wmeRcClDay{border-color:rgba(15,23,42,.14);background:#fff;color:#111827;}
      .wmeRcClDay.on{border-color:rgba(96,165,250,.55);background:linear-gradient(180deg,#3b82f6,#2563eb);color:#fff;}
      .wmeRcClToggleEnd{cursor:pointer;font-size:11px;font-weight:800;padding:2px 8px;border-radius:999px;
        border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.06);color:inherit;}
      .wmeRcModal.theme-light .wmeRcClToggleEnd{border-color:rgba(15,23,42,.16);background:#fff;color:#111827;}
      .wmeRcClLblRow{display:flex;align-items:center;justify-content:space-between;margin-bottom:3px;}
      .wmeRcClStatus{margin-top:2px;padding:7px 9px;border-radius:9px;font-size:12px;line-height:1.35;display:none;}
      .wmeRcClStatus.ok{background:rgba(52,199,89,.16);color:#34c759;display:block;}
      .wmeRcClStatus.error{background:rgba(239,68,68,.16);color:#ff6b6b;display:block;}
      .wmeRcClStatus.info{background:rgba(255,255,255,.07);opacity:.85;display:block;}
      .wmeRcModal.theme-light .wmeRcClStatus.info{background:rgba(15,23,42,.05);}

      .wmeRcNoticeStack{position:fixed;right:16px;bottom:16px;z-index:2147483647;display:flex;
        flex-direction:column;gap:10px;align-items:flex-end;}
      .wmeRcNotice{position:relative;width:min(340px,90vw);border-radius:14px;overflow:visible;padding:12px 12px 11px;
        background:linear-gradient(180deg,rgba(27,38,56,.96),rgba(10,16,27,.97));color:#eef6ff;
        border:1px solid rgba(148,163,184,.18);box-shadow:0 16px 40px rgba(0,0,0,.4);
        opacity:0;transform:translateY(10px);transition:opacity .18s ease,transform .18s ease;
        font:13px/1.35 system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;}
      .wmeRcNotice.show{opacity:1;transform:translateY(0);}
      .wmeRcNotice.theme-light{background:linear-gradient(180deg,#fff,#f3f6fb);color:#111827;
        border-color:rgba(15,23,42,.14);}
      .wmeRcNoticeHead{display:flex;align-items:flex-start;gap:9px;}
      .wmeRcNoticeIco{width:30px;height:30px;flex:0 0 30px;border-radius:9px;display:flex;align-items:center;
        justify-content:center;background:rgba(255,179,71,.16);color:#ffb347;}
      .wmeRcNoticeIco svg{width:16px;height:16px;}
      .wmeRcNoticeText{flex:1 1 auto;min-width:0;}
      .wmeRcNoticeTitle{font-size:10.5px;font-weight:900;letter-spacing:.06em;text-transform:uppercase;
        opacity:.72;}
      .wmeRcNoticeMsg{font-size:15px;font-weight:800;margin-top:2px;}
      .wmeRcNoticeX{width:24px;height:24px;flex:0 0 24px;border-radius:8px;display:flex;align-items:center;
        justify-content:center;cursor:pointer;opacity:.7;}
      .wmeRcNoticeX:hover{opacity:1;background:rgba(255,255,255,.08);}
      .wmeRcNoticeX svg{width:12px;height:12px;}
      .wmeRcNoticeNote{margin:8px 0 0 39px;font-size:12px;opacity:.82;background:rgba(255,255,255,.045);
        border:1px solid rgba(148,163,184,.14);border-radius:9px;padding:7px 9px;}
      .wmeRcNoticeActions{display:flex;gap:7px;margin-top:10px;}
      .wmeRcNoticeActions .wmeRcBtn{flex:1 1 0;padding:7px 8px;text-align:center;font-size:12px;}

      .wmeRcSnoozePop{position:absolute;left:0;right:0;bottom:calc(100% + 8px);z-index:2;
        padding:10px;border-radius:12px;background:rgba(15,20,32,.97);color:#eef6ff;
        border:1px solid rgba(148,163,184,.20);box-shadow:0 14px 34px rgba(0,0,0,.42);}
      .wmeRcSnoozePop.theme-light{background:#fff;color:#111827;border-color:rgba(15,23,42,.14);
        box-shadow:0 14px 30px rgba(15,23,42,.16);}
      .wmeRcSnoozeGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;}
      .wmeRcSnoozeChip{padding:7px 4px;border-radius:9px;text-align:center;font-size:12px;font-weight:800;
        cursor:pointer;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.05);}
      .wmeRcSnoozePop.theme-light .wmeRcSnoozeChip{border-color:rgba(15,23,42,.14);background:#f4f6f8;}
      .wmeRcSnoozeChip:hover{background:rgba(96,165,250,.20);}
      .wmeRcSnoozeCustomRow{display:flex;gap:7px;margin-top:8px;}
      .wmeRcSnoozeCustom{flex:1 1 auto;min-width:0;}
      .wmeRcSnoozeGo{flex:0 0 auto;padding:7px 12px;font-size:12px;}
      .wmeRcPinsEmpty{padding:12px 10px;opacity:.65;text-align:center;}

      .wmeRcSide{padding:10px 12px;color:var(--content_default);
        font:13px/1.35 system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;}
      .wmeRcSideCard{border:1px solid rgba(127,127,127,.2);border-radius:12px;padding:10px;margin-bottom:10px;}
      .wmeRcSideRow{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:7px 0;}
      .wmeRcSideTitle{font-weight:800;}
      .wmeRcSideSub{font-size:12px;opacity:.65;margin-top:2px;}

      /* Collapsible settings sections. The card itself provides the
         border/spacing; only the title row becomes clickable and the
         body collapses — a section that's collapsed keeps its border
         and padding so the list doesn't visually jump around as
         sections are opened and closed. */
      .wmeRcSideSection > .wmeRcSideCard{margin-bottom:0;}
      .wmeRcSideSectionHeader{display:flex;align-items:center;gap:8px;cursor:pointer;
        user-select:none;padding:2px 0;margin:-2px 0;}
      .wmeRcSideSectionHeader:hover{opacity:.85;}
      .wmeRcSideSectionArrow{display:inline-block;width:10px;flex:none;
        transition:transform .15s ease;transform:rotate(90deg);opacity:.7;font-size:11px;}
      .wmeRcSideSection.collapsed .wmeRcSideSectionArrow{transform:rotate(0deg);}
      .wmeRcSideSectionBody{overflow:hidden;margin-top:8px;}
      .wmeRcSideSection.collapsed .wmeRcSideSectionBody{display:none;}
      .wmeRcSideSection{margin-bottom:10px;}
      .wmeRcSideCredit{font-size:10px;opacity:.7;text-align:center;margin-top:10px;
        display:flex;align-items:center;justify-content:center;gap:6px;}
      .wmeRcSideCredit img{width:16px;height:16px;border-radius:4px;flex:none;}
      .wmeRcSideCredit a{color:inherit;text-decoration:underline;}
      .wmeRcMenuOrderList{display:flex;flex-direction:column;gap:4px;}
      .wmeRcMenuOrderRow{display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:9px;
        background:rgba(127,127,127,.08);border:1px solid transparent;transition:background .12s ease,opacity .12s ease;}
      .wmeRcMenuOrderRow.dragging{opacity:.4;}
      .wmeRcMenuOrderRow.drag-over{border-color:rgba(96,165,250,.6);background:rgba(96,165,250,.12);}
      .wmeRcMenuOrderHandle{flex:0 0 auto;width:20px;height:20px;display:flex;align-items:center;
        justify-content:center;opacity:.5;cursor:grab;color:inherit;}
      .wmeRcMenuOrderHandle:active{cursor:grabbing;}
      .wmeRcMenuOrderHandle svg{width:18px;height:18px;}
      .wmeRcToggle{position:relative;appearance:none;border:none;outline:none;cursor:pointer;width:44px;
        min-width:44px;height:26px;border-radius:999px;padding:0;background:rgba(120,120,128,.34);
        transition:background .18s ease;}
      .wmeRcToggle::before{content:"";position:absolute;top:3px;left:3px;width:20px;height:20px;border-radius:50%;
        background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.3);transition:left .18s ease;}
      .wmeRcToggle.on{background:#0a84ff;}
      .wmeRcToggle.on::before{left:21px;}
      .wmeRcToggle.is-disabled{opacity:.4;cursor:default;}
      /* .wmeRcInput is styled for this script's dark modals: forced white
         text on a translucent white background. Dropped into WME's own
         sidebar while WME is in light mode, that's white-on-white. The
         existing .wme-light-select rule fixed only <select>; scoping the
         same correction to the sidebar wrapper covers text/time inputs
         too, and any control added here later, without each one having to
         remember to opt in. */
      .wmeRcSide.wme-light .wmeRcInput{background:#fff;border-color:rgba(15,23,42,.16);
        color:#111827;color-scheme:light;-webkit-text-fill-color:#111827;}
      .wmeRcSide.wme-light .wmeRcInput::placeholder{color:rgba(15,23,42,.42);-webkit-text-fill-color:rgba(15,23,42,.42);}

      /* .wmeRcBtn's default border/background are white-on-translucent,
         tuned for the dark modal shell. Inside WME's own sidebar — which
         may be light — that renders as an almost invisible button, so
         these override with neutral greys that read in either theme. */
      .wmeRcSide .wmeRcBtn{border-color:rgba(127,127,127,.32);background:rgba(127,127,127,.12);
        color:var(--content_default);font-size:12px;padding:7px 12px;}
      .wmeRcSide .wmeRcBtn:hover{background:rgba(127,127,127,.22);}
      .wmeRcSide .wmeRcSideRow{align-items:stretch;}
      .wmeRcSideKeys{display:flex;flex-direction:column;gap:6px;font-size:12px;opacity:.85;}
      .wmeRcSideKeys code{font:800 11px/1.6 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
        padding:1px 6px;border-radius:6px;border:1px solid rgba(127,127,127,.28);}
    `;
    (document.head || document.documentElement).appendChild(s);
  }

  /* ------------------------------------------------------------------ *
   *  Map helpers
   * ------------------------------------------------------------------ */

  function getMapContainerEl() {
    return document.querySelector("#map")
      || document.querySelector("#WazeMap")
      || document.querySelector(".olMap")
      || document.querySelector(".wme-map")
      || null;
  }

  function getOlMap() {
    try {
      const m = UW?.W?.map;
      if (!m) return null;
      if (typeof m.getOLMap === "function") return m.getOLMap();
      if (m.olMap && typeof m.olMap.getViewPortPxFromLonLat === "function") return m.olMap;
      if (typeof m.getViewPortPxFromLonLat === "function") return m;
    } catch {}
    return null;
  }

  function toMapProjection(lon, lat) {
    const ol = UW?.OpenLayers;
    const map = getOlMap();
    if (!ol || !map) return null;
    const ll = new ol.LonLat(Number(lon), Number(lat));
    try {
      const dst = map.getProjectionObject?.() || map.projection || null;
      const code = String(dst?.projCode || dst?.getCode?.() || dst || "");
      if (/900913|3857|102113|102100/i.test(code) && !/4326/i.test(code) && typeof ll.transform === "function") {
        ll.transform(new ol.Projection("EPSG:4326"), dst);
      }
    } catch {}
    return ll;
  }

  function getZoomBestEffort() {
    try {
      const z = sdk?.Map?.getZoom?.();
      if (Number.isFinite(z)) return Number(z);
    } catch {}
    try {
      const z = UW?.W?.map?.getZoom?.();
      if (Number.isFinite(z)) return Number(z);
    } catch {}
    return null;
  }

  // sdk.State.getUserInfo() returns { userName, rank, ... } or null if the
  // editor isn't logged in (confirmed against the official SDK docs —
  // WmeState.getUserInfo(): UserSession | null). Falls back to the legacy
  // W.loginManager.user object for older WME builds that might still be
  // running without the SDK reporting a session yet.
  function getEditorUsername() {
    try {
      const info = sdk?.State?.getUserInfo?.();
      if (info && typeof info.userName === "string" && info.userName.trim()) {
        return info.userName.trim();
      }
    } catch {}
    try {
      const legacy = UW?.W?.loginManager?.user;
      const name = legacy?.userName || legacy?.username || legacy?.name;
      if (typeof name === "string" && name.trim()) return name.trim();
    } catch {}
    return null;
  }

  /* ------------------------------------------------------------------ *
   *  Access control — editor allowlist (Google Sheet, published as CSV)
   *
   *  The ENTIRE script is restricted to editors whose WME username
   *  appears on a community-maintained Google Sheet — not just the Pins
   *  feature this started out gating. An editor not on the list:
   *    - never sees the Pins panel, any pin marker, or the sidebar tab
   *      (mountSidebar()/ensurePinsPanel() refuse to build anything);
   *    - never gets the radial menu at all — right-click falls through
   *      to WME's own native context menu instead (onContextMenu()/
   *      onMouseDown() refuse before building or showing it), which in
   *      turn is how every OTHER feature in this file is launched:
   *      route test, closures, split segment, the map note area tool,
   *      and the Z/Shift+T/I shortcut relays all only exist as radial
   *      menu items, so gating the menu itself gates all of them;
   *    - and, as defense in depth on top of that single choke point,
   *      the state-mutating actions among those (actionRoutePoint,
   *      actionDrawMapNoteArea, actionSplitSegment, actionOpenClosures)
   *      each refuse independently too — the same belt-and-braces this
   *      section already applied to actionPinThisPlace, in case a
   *      future code path ever reaches one of them some other way.
   *  Every entry point that could create/read/write data refuses before
   *  doing anything.
   * ------------------------------------------------------------------ */

  const ALLOWLIST_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSqNoI5mlY6wqOvIusO-Oj5BIpahfrHNt54U7G0jIHGIyQHoJwD7jSFQLQSfW561-R1jFRL9lOpBAaz/pub?gid=0&single=true&output=csv";
  const ALLOWLIST_CACHE_KEY = `${SCRIPT_ID}:allowlist:v1`;
  // How long a cached yes/no answer is trusted before re-checking the
  // sheet — long enough that ordinary use never waits on a network
  // round trip, short enough that being added or removed from the sheet
  // takes effect within a working session rather than only after
  // clearing localStorage.
  const ALLOWLIST_TTL_MS = 6 * 3600 * 1000;
  // If the sheet can't be reached at all (network hiccup, Sheets down),
  // a previously-confirmed "yes" is still honoured for this long before
  // falling back to fail-closed — an editor who was legitimately allowed
  // yesterday shouldn't lose access mid-session just because one fetch
  // attempt failed. A cached "no" is never extended this way: failing to
  // reach the sheet is never itself a reason to grant access.
  const ALLOWLIST_GRACE_MS = 7 * 24 * 3600 * 1000;

  function loadAllowlistCache() {
    try {
      const v = JSON.parse(localStorage.getItem(ALLOWLIST_CACHE_KEY) || "null");
      if (v && typeof v.username === "string" && typeof v.allowed === "boolean" && Number.isFinite(v.checkedAt)) {
        return v;
      }
    } catch {}
    return null;
  }

  function saveAllowlistCache(entry) {
    try { localStorage.setItem(ALLOWLIST_CACHE_KEY, JSON.stringify(entry)); } catch {}
  }

  // Parses the sheet's CSV export. Deliberately tolerant of shape: every
  // non-empty cell on every line is treated as a candidate username
  // rather than assuming one specific column/header layout — the sheet
  // is maintained by hand outside this script, and its exact structure
  // isn't this script's to dictate. Matching elsewhere is
  // case-insensitive and trimmed, so stray whitespace or inconsistent
  // capitalization in the sheet doesn't silently lock someone out.
  function parseAllowlistCsv(text) {
    const names = new Set();
    for (const line of String(text || "").split(/\r?\n/)) {
      for (const cellRaw of line.split(",")) {
        const cell = cellRaw.trim().replace(/^"|"$/g, "").trim();
        if (cell) names.add(cell.toLowerCase());
      }
    }
    return names;
  }

  async function fetchAllowlistCsv() {
    const res = await gmFetch(ALLOWLIST_CSV_URL, { method: "GET" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    return parseAllowlistCsv(text);
  }

  // Synchronously-readable authorization state. Starts fail-closed (not
  // allowed) and stays that way until refreshAllowlistState() has
  // resolved at least once for the current editor — an unverified
  // editor is never treated as authorized by default, matching every
  // other permission check in this file.
  let allowlistState = { checked: false, allowed: false };

  function isEditorAllowed() {
    return allowlistState.checked && allowlistState.allowed === true;
  }

  let allowlistRefreshInFlight = null;

  // Re-checks (or reuses a fresh-enough cached) allowlist membership for
  // the CURRENT editor. Safe to call repeatedly — concurrent calls share
  // one in-flight check, and a call while the cache is still fresh for
  // this exact username resolves immediately with no network activity.
  async function refreshAllowlistState({ force = false } = {}) {
    const username = getEditorUsername();
    if (!username) {
      // Not logged in / SDK not ready yet — nothing to check against.
      // Deliberately does NOT set checked = true: an unresolved username
      // should leave the panel in its normal "not ready yet" state
      // rather than being recorded as a real, sticky "no" for a blank
      // identity.
      return;
    }

    const cache = loadAllowlistCache();
    const cacheMatchesUser = !!cache && cache.username.toLowerCase() === username.toLowerCase();
    if (!force && cacheMatchesUser && (Date.now() - cache.checkedAt) < ALLOWLIST_TTL_MS) {
      allowlistState = { checked: true, allowed: cache.allowed };
      return;
    }

    if (allowlistRefreshInFlight) return allowlistRefreshInFlight;

    allowlistRefreshInFlight = (async () => {
      try {
        const names = await fetchAllowlistCsv();
        const allowed = names.has(username.toLowerCase());
        saveAllowlistCache({ username, allowed, checkedAt: Date.now() });
        allowlistState = { checked: true, allowed };
        dlog(`allowlist: ${username} -> ${allowed ? "allowed" : "not allowed"}`);
      } catch (err) {
        dlog("allowlist fetch failed", err);
        if (cacheMatchesUser && cache.allowed && (Date.now() - cache.checkedAt) < ALLOWLIST_GRACE_MS) {
          // Grace period — see ALLOWLIST_GRACE_MS above.
          allowlistState = { checked: true, allowed: true };
        } else {
          // No usable prior "yes" to fall back on: fail closed rather
          // than guessing.
          allowlistState = { checked: true, allowed: false };
        }
      } finally {
        allowlistRefreshInFlight = null;
      }
    })();
    return allowlistRefreshInFlight;
  }

  // The minimum editor level (1-6, the number Waze shows to editors) that
  // may edit or delete a pin.
  const MIN_EDIT_RANK_LEVEL = 2;

  // The SDK's UserSession.rank field is Waze's long-standing internal
  // "rank" numbering, which is 0-indexed relative to the level shown in
  // the UI: rank 0 = Level 1, rank 1 = Level 2, etc. This is the same
  // convention used everywhere else in WME that takes a rank number (e.g.
  // segment lockRank — a segment with lockRank 4 requires a Level 5+
  // editor to unlock, as seen in long-standing community scripts and
  // Wazeopedia lock-level documentation). It is not separately spelled
  // out on the SDK's own UserRank type page, so this reads it via that
  // established convention rather than an explicit "0-indexed" note from
  // Waze themselves — if a future WME release changes this, the fix is
  // this one function.
  // canEditOrDeletePins() calls this once per SHARED pin row, so a panel
  // with 60 community pins meant 60 sdk.State.getUserInfo() calls on every
  // single render — measured, not assumed. Editor rank effectively never
  // changes mid-session (and the 3s poller below exists precisely to
  // notice if it does), so a short TTL collapses that to one call per
  // render burst while keeping the poller's worst-case detection lag at
  // 3s + 1.5s rather than 3s.
  const EDITOR_LEVEL_TTL_MS = 1500;
  let editorLevelCacheAt = 0;
  let editorLevelCacheVal = null;
  let editorLevelCached = false;

  function getEditorLevel() {
    const now = Date.now();
    if (editorLevelCached && (now - editorLevelCacheAt) < EDITOR_LEVEL_TTL_MS) {
      return editorLevelCacheVal;
    }
    const level = readEditorLevelUncached();
    editorLevelCacheAt = now;
    editorLevelCacheVal = level;
    editorLevelCached = true;
    return level;
  }

  function readEditorLevelUncached() {
    try {
      const info = sdk?.State?.getUserInfo?.();
      const rank = info?.rank;
      if (Number.isFinite(rank)) return Number(rank) + 1;
    } catch {}
    try {
      const legacy = UW?.W?.loginManager?.user?.rank;
      if (Number.isFinite(legacy)) return Number(legacy) + 1;
    } catch {}
    return null;
  }

  // True once we can positively confirm the editor's level meets the
  // minimum — if the rank can't be determined at all (not logged in yet,
  // SDK not ready, unexpected shape), this deliberately returns false
  // rather than assuming access, since permission checks should fail
  // closed, not open.
  function canEditOrDeletePins() {
    const level = getEditorLevel();
    return Number.isFinite(level) && level >= MIN_EDIT_RANK_LEVEL;
  }

  // Same as canEditOrDeletePins(), plus a per-pin lock level a shared
  // pin's creator can optionally set when sharing it (0 = no lock, the
  // default). The pin's OWN creator can always edit/delete it regardless
  // of the lock — a lock is meant to keep OTHER editors from touching a
  // pin too early, not to let the creator accidentally lock themselves
  // out of their own pin. `authSession` is read directly rather than
  // awaited: this runs on every panel render (synchronous), and a
  // not-yet-authenticated session (authSession still null) simply falls
  // through to the ordinary, non-owner check — never treated as "is the
  // owner" by default, since that would be a fail-OPEN mistake.
  function canEditOrDeleteSharedPin(pin) {
    if (!canEditOrDeletePins()) return false;
    const lockLevel = Number(pin?.lockLevel) || 0;
    if (lockLevel <= 0) return true;
    if (pin?.createdByUid && authSession?.localId && pin.createdByUid === authSession.localId) return true;
    const level = getEditorLevel();
    return Number.isFinite(level) && level >= lockLevel;
  }

  // The pins panel's very first render can happen before WME has actually
  // populated getUserInfo() yet (it's built once, on the first tick of the
  // startup polling loop, and never rebuilt on its own afterward). If rank
  // is unknown at that moment, every shared-pin delete button gets frozen
  // as "Requires Level N" — correct in the moment, but nothing ever
  // re-evaluates it once the level actually becomes known, since
  // ensurePinsPanel() only renders once. The fix is to keep checking
  // whether the detected level has changed and force one re-render the
  // first time it does, rather than requiring the user to stumble into a
  // refresh/collapse/expand that happens to re-render for an unrelated
  // reason.
  let lastKnownEditorLevel = null;
  // Whether the allowlist portion of access was granted the last time
  // this checked — tracked separately from lastKnownEditorLevel so a
  // change in either one (rank changing, or the allowlist membership
  // itself changing) triggers the right re-sync without one masking
  // the other.
  let lastKnownAllowlistAllowed = false;
  // setInterval fires on a fixed schedule regardless of whether the
  // PREVIOUS invocation has finished, and this function awaits a check
  // that can involve a network fetch. Without this guard, a fetch slower
  // than the 3s tick lets two runs interleave: both await, both then see
  // the same stale lastKnownAllowlistAllowed, and both compute
  // becameAllowed === true, so the whole subsystem stand-up below runs
  // twice. Every function it calls is idempotent so nothing breaks, but
  // it's wasted work (including a duplicate fetchSharedPins) — and the
  // same interleave on becameDisallowed would double-render for nothing.
  let pinsAccessRefreshInFlight = false;

  // Re-checks both editor rank and allowlist membership on every tick,
  // and reacts to whichever one actually changed:
  //  - rank changing: re-renders the panel so per-pin lock-level buttons
  //    reflect it (unchanged from before this feature existed).
  //  - allowlist membership changing: the bigger swing. Becoming allowed
  //    stands up the whole pins subsystem (panel, markers, map sync,
  //    sidebar tab, an immediate shared-pins fetch) for the first time
  //    — needed because the ORIGINAL 600ms setup loop in initSdk() gives
  //    up after 40 tries (~24s), so a slow/late allowlist resolution can
  //    easily outlast it; this indefinite poller is the catch-all that
  //    doesn't give up. Losing access tears the VISIBLE parts back down
  //    (panel hidden/blanked, markers cleared) via the same render
  //    functions used everywhere else, rather than a separate teardown
  //    path. Every ensure/start function called here is independently
  //    idempotent, so calling them again on an already-settled tick is
  //    always a harmless no-op.
  //
  //    Named for pins specifically because that's the only PERSISTENT
  //    UI this reactive mount/unmount treatment applies to. The radial
  //    menu (which gates every other feature — see the access-control
  //    section comment above) needs no equivalent here: it isn't
  //    mounted ahead of time, isEditorAllowed() is simply checked again
  //    at the moment of each right-click, so it can never go stale
  //    between ticks the way an already-built panel could.
  async function refreshPinsAccessState() {
    if (pinsAccessRefreshInFlight) return;
    pinsAccessRefreshInFlight = true;
    try {
      await refreshAllowlistState();
      const nowAllowed = isEditorAllowed();
      const becameAllowed = nowAllowed && !lastKnownAllowlistAllowed;
      const becameDisallowed = !nowAllowed && lastKnownAllowlistAllowed;
      lastKnownAllowlistAllowed = nowAllowed;

      if (becameAllowed) {
        ensurePinsPanel();
        if (ensurePinsLayer()) renderPinMarkers();
        startMapSync();
        mountSidebar();
        fetchSharedPins({ silent: true });
      } else if (becameDisallowed) {
        renderPinsPanel();
        renderPinMarkers();
      }

      const level = getEditorLevel();
      if (level !== lastKnownEditorLevel) {
        lastKnownEditorLevel = level;
        if (panelEl && document.contains(panelEl)) renderPinsPanel();
      }
    } finally {
      pinsAccessRefreshInFlight = false;
    }
  }

  // Minimum editor level required to use each radial-menu map tool. These
  // mirror WME's own long-standing rank gates on these actions (segment
  // locking aside, placing speed bumps/red lights has historically been
  // rank-limited in the editor itself); the script enforces the same
  // floor in its own menu so a lower-level editor isn't shown an action
  // WME would reject anyway.
  const MIN_SPEED_BUMP_LEVEL = 3;
  const MIN_STOP_LIGHT_LEVEL = 3;

  // Same fail-closed pattern as canEditOrDeletePins(): an undetermined
  // level (not logged in yet, SDK not ready) is treated as "does not
  // meet the requirement" rather than silently allowing the action.
  function editorMeetsLevel(minLevel) {
    const level = getEditorLevel();
    return Number.isFinite(level) && level >= minLevel;
  }

  /* ------------------------------------------------------------------ *
   *  Road closures — ported from WazePT Fechos (Lourenço/Xtryker, MIT),
   *  itself derived from WME Closures Toolkit (DrSlump34, MIT).
   *
   *  The logic below is carried over deliberately close to the original:
   *  the timestamp conversion, the DST-safe date construction and the
   *  direction/reversed-segment handling are all things that fail
   *  SILENTLY and only in part of the year if you "tidy" them. The
   *  presentation layer is rewritten to this script's design system, but
   *  the arithmetic is not re-derived.
   * ------------------------------------------------------------------ */

  const CLOSURE_DIR = { AtoB: 1, BtoA: 2, TWO: 3 };
  // Node ("knot") closure mode. The numeric values are deliberately the
  // same 1/2/3 WME Closures Toolkit uses, so a value copied between the
  // two scripts (or read out of a settings dump) means the same thing in
  // both. Semantics:
  //   none  — every junction stays open; only the roadway is cut.
  //   inner — only the knots strictly BETWEEN two closed segments are
  //           cut. The two outer ends stay open so a router can still
  //           reach the closure and turn around, and the adjacent
  //           streets that merely touch those ends aren't blocked.
  //   all   — both ends of every closed segment are cut, outer ones
  //           included. Blunt, and it can block traffic that only meant
  //           to cross the end of the closed stretch, which is exactly
  //           why it isn't the default.
  const CLOSURE_NODES = { none: 1, inner: 2, all: 3 };
  function normalizeClosureNodeMode(v) {
    const n = Number(v);
    return (n === CLOSURE_NODES.none || n === CLOSURE_NODES.inner || n === CLOSURE_NODES.all)
      ? n
      : CLOSURE_NODES.inner;
  }
  const CLOSURE_WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  // Safety ceiling: stops a mis-typed range from firing hundreds of
  // addClosure calls before anyone notices.
  const MAX_CLOSURE_OCCURRENCES = 200;
  // Partner/source fields, reproduced exactly as WME's own native form
  // writes them onto the model object. Nothing invented here.
  const PARTNER_CHANNEL = "WME_PARTNER_EDITOR";
  const PARTNER_USER_CHANNEL = "PARTNER";

  const pad2n = (n) => String(n).padStart(2, "0");

  // <input type="datetime-local"> yields "YYYY-MM-DDTHH:mm". Parsed by
  // component and rebuilt with the local constructor: that's what crosses
  // a daylight-saving change without a rules table. new Date(string) would
  // be read as UTC by some engines.
  function readLocalDateTime(v) {
    const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(v || "");
    if (!m) return null;
    return new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], 0, 0);
  }

  // <input type="date"> yields "YYYY-MM-DD". Same caution.
  function readLocalDay(v) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v || "");
    if (!m) return null;
    return new Date(+m[1], +m[2] - 1, +m[3], 0, 0, 0, 0);
  }

  function toDateTimeField(d) {
    return `${d.getFullYear()}-${pad2n(d.getMonth() + 1)}-${pad2n(d.getDate())}`
      + `T${pad2n(d.getHours())}:${pad2n(d.getMinutes())}`;
  }

  function toDayField(d) {
    return `${d.getFullYear()}-${pad2n(d.getMonth() + 1)}-${pad2n(d.getDate())}`;
  }

  // Given the closures "simples" pane's start/end datetime-local field
  // values, returns the field VALUE the end should be clamped to if the
  // start moved past it, or null if the current end is already fine.
  // Pure and string-in/string-out so it can be unit tested without any
  // DOM, and so the change listener that calls it stays a one-liner.
  function computeClampedSimpleEnd(startVal, endVal) {
    const start = readLocalDateTime(startVal);
    if (!start) return null;
    const end = readLocalDateTime(endVal);
    if (end && end > start) return null; // already valid, leave it alone

    // Mirror the start's date AND time exactly. An earlier version of
    // this tried to be clever — keep the end's own time-of-day and only
    // bump its calendar day, rolling forward an extra day if that still
    // collided with the new start on the same day — but that's exactly
    // what produced the surprise: setting the start to 2 November could
    // silently push the end to 3 November. Mirroring outright means "set
    // start to 2 November, 11:00" always leaves the end at "2 November,
    // 11:00" too — never a day the person didn't choose. The pair reads
    // as a zero-duration range until the person explicitly moves the end
    // later, and simples mode's own validation (end must be strictly
    // after start) catches that at Apply time — which is the honest
    // place for that error, not a silent same-session auto-correction.
    return startVal;
  }

  // Same idea for the weekly range, but simpler: these are plain
  // calendar days (type="date"), and a single-day range (from === to)
  // is valid there, unlike simples mode's strict end > start.
  function computeClampedWeeklyTo(fromVal, toVal) {
    const from = readLocalDay(fromVal);
    if (!from) return null;
    const to = readLocalDay(toVal);
    if (to && to >= from) return null;
    return fromVal;
  }

  // Builds a LOCAL date from a calendar day (already in local components,
  // never re-parsed from a string) + a day offset + a time. This is what
  // crosses a DST change without a rules table: JS's local constructor
  // resolves the 25-hour day that raw minute arithmetic would shift.
  function localDateAt(baseDay, dayOffset, hourMin, minMin) {
    return new Date(
      baseDay.getFullYear(), baseDay.getMonth(), baseDay.getDate() + dayOffset,
      hourMin, minMin, 0, 0
    );
  }

  // ⚠️ VERIFIED IN PRODUCTION (inherited from Closures Toolkit and WME
  // Advanced Closures): addClosure expects the LOCAL wall-clock time
  // expressed as a UTC epoch. Hence `valueOf() - offset`. Changing this
  // shifts every closure by an hour — silently, and only for part of the
  // year.
  function toClosureTimestamp(d) {
    return d.valueOf() - d.getTimezoneOffset() * 60000;
  }

  function formatClosureDateTime(d) {
    return `${pad2n(d.getDate())}/${pad2n(d.getMonth() + 1)}/${d.getFullYear()}`
      + ` ${pad2n(d.getHours())}:${pad2n(d.getMinutes())}`;
  }

  // ─── Feriados nacionais (fixed-date only) ────────────────────────────
  // Only the fixed national holidays are listed: the movable ones
  // (Carnaval, Sexta-feira Santa, Páscoa, Corpo de Deus) shift every year
  // and would need an Easter computation, so they're deliberately out of
  // scope rather than half-implemented and silently wrong. Stored as
  // [month, day] with month 1-based, matching how a human reads the list.
  const PT_HOLIDAYS = [
    [1, 1],   // Ano Novo
    [4, 25],  // Dia da Liberdade
    [5, 1],   // Dia do Trabalhador
    [6, 10],  // Dia de Portugal
    [8, 15],  // Assunção de Nossa Senhora
    [10, 5],  // Implantação da República
    [11, 1],  // Todos os Santos
    [12, 1],  // Restauração da Independência
    [12, 8],  // Imaculada Conceição
    [12, 25], // Natal
  ];

  // Set lookup on "MM-DD" so isPtHoliday() is a hash hit rather than a
  // 10-entry scan per day of the range (a year-long weekly closure walks
  // 365 days before the occurrence cap even applies).
  const PT_HOLIDAY_KEYS = new Set(PT_HOLIDAYS.map(([m, d]) => `${pad2n(m)}-${pad2n(d)}`));

  function isPtHoliday(date) {
    if (!date) return false;
    return PT_HOLIDAY_KEYS.has(`${pad2n(date.getMonth() + 1)}-${pad2n(date.getDate())}`);
  }

  // Same four options as WME Closures Toolkit offers:
  //   normal — holidays are irrelevant, only the ticked weekdays count
  //   excepto — a ticked weekday that IS a holiday is skipped
  //   apenas — only holidays, whatever weekday they land on
  //   mais   — ticked weekdays OR holidays
  const CLOSURE_HOLIDAY_MODES = ["normal", "excepto", "apenas", "mais"];

  function normalizeHolidayMode(v) {
    return CLOSURE_HOLIDAY_MODES.includes(String(v)) ? String(v) : "normal";
  }

  // Decides whether one calendar day produces an occurrence, given the
  // ticked weekdays and the holiday mode. Pure — unit-testable without
  // any of the closure UI.
  function dayPassesHolidayFilter(date, weekdaysOn, holidayMode) {
    const onWeekday = !!weekdaysOn[date.getDay()];
    const holiday = isPtHoliday(date);
    switch (normalizeHolidayMode(holidayMode)) {
      case "excepto": return onWeekday && !holiday;
      case "apenas": return holiday;
      case "mais": return onWeekday || holiday;
      default: return onWeekday;
    }
  }

  // An occurrence crossing midnight (21:00 → 05:00) is intentional: the
  // duration wraps a full day when the end time is "smaller" than the start.
  function durationBetweenTimes(startMin, endMin) {
    return endMin > startMin ? endMin - startMin : (1440 - startMin) + endMin;
  }

  function resolveDurationMin({ endMode, durationMin, startMin, endMin }) {
    if (!endMode) return durationMin;
    if (endMin === startMin) return null; // ambiguous: 0h or 24h?
    return durationBetweenTimes(startMin, endMin);
  }

  // Three modes:
  //   "simples"  — one occurrence: start + (duration OR end).
  //   "semanal"  — repeats on the ticked weekdays between two dates, same
  //                time window each day.
  //   "repetir"  — N occurrences from one start, spaced by a fixed
  //                interval, each with the given duration.
  function buildClosureOccurrences(cfg) {
    if (cfg.mode === "simples") {
      if (!cfg.start) return { occurrences: [], error: T("Fill in the start date.") };
      let end;
      if (cfg.endMode) {
        end = cfg.end;
        if (!end) return { occurrences: [], error: T("Fill in the end date.") };
        if (end <= cfg.start) return { occurrences: [], error: T("The end date must be after the start date.") };
      } else {
        if (!(cfg.durationMin > 0)) return { occurrences: [], error: T("The duration must be greater than zero.") };
        end = new Date(cfg.start.getTime() + cfg.durationMin * 60000);
      }
      return { occurrences: [{ start: cfg.start, end }], error: "" };
    }

    if (cfg.mode === "semanal") {
      const { startDay, endDay, startMin, days } = cfg;
      if (!startDay || !endDay) return { occurrences: [], error: T("Fill in the date range.") };
      if (endDay < startDay) return { occurrences: [], error: T("The end day must be the same as or after the start day.") };
      const holidayMode = normalizeHolidayMode(cfg.holidayMode);
      // "Apenas feriados" doesn't consult the weekday buttons at all, so
      // requiring one to be ticked there would be a nonsense gate.
      if (holidayMode !== "apenas" && !days.some(Boolean)) {
        return { occurrences: [], error: T("Select at least one weekday.") };
      }

      const durationMin = resolveDurationMin(cfg);
      if (durationMin === null) return { occurrences: [], error: T("The start and end times can't be the same.") };
      if (!(durationMin > 0)) return { occurrences: [], error: T("The duration must be greater than zero.") };

      const totalDays = Math.round((endDay - startDay) / 86400000) + 1;
      const occurrences = [];
      for (let d = 0; d < totalDays; d++) {
        if (occurrences.length >= MAX_CLOSURE_OCCURRENCES) {
          return { occurrences: [], error: `${T("Too many occurrences (limit")} ${MAX_CLOSURE_OCCURRENCES}) — ${T("shorten the range.")}` };
        }
        const start = localDateAt(startDay, d, Math.floor(startMin / 60), startMin % 60);
        if (!dayPassesHolidayFilter(start, days, holidayMode)) continue;
        const end = new Date(start.getTime() + durationMin * 60000);
        occurrences.push({ start, end });
      }
      return {
        occurrences,
        error: occurrences.length
          ? ""
          : (holidayMode === "apenas"
            ? T("No occurrences: no public holiday falls within the range.")
            : holidayMode === "excepto"
              ? T("No occurrences: every matching day in the range is a public holiday.")
              : T("No occurrences: no selected weekday falls within the range.")),
      };
    }

    // "repetir"
    const { start, times, intervalValue, intervalUnit, durationMin } = cfg;
    if (!start) return { occurrences: [], error: T("Fill in the start date.") };
    if (!(Number.isInteger(times) && times >= 1)) return { occurrences: [], error: T("The number of repeats must be at least 1.") };
    if (!(intervalValue > 0)) return { occurrences: [], error: T("The interval between repeats must be greater than zero.") };
    if (!(durationMin > 0)) return { occurrences: [], error: T("The duration must be greater than zero.") };
    if (times > MAX_CLOSURE_OCCURRENCES) return { occurrences: [], error: `${T("Too many repeats (limit")} ${MAX_CLOSURE_OCCURRENCES}).` };

    const intervalMin = intervalUnit === "dias" ? intervalValue * 1440
      : intervalUnit === "horas" ? intervalValue * 60
        : intervalValue;

    const occurrences = [];
    for (let i = 0; i < times; i++) {
      const oStart = new Date(start.getTime() + intervalMin * 60000 * i);
      const oEnd = new Date(oStart.getTime() + durationMin * 60000);
      occurrences.push({ start: oStart, end: oEnd });
    }
    // Overlap isn't blocked — it can be deliberate — but it is flagged,
    // because the same segment would otherwise carry two live closures.
    const overlaps = intervalMin < durationMin;
    return {
      occurrences,
      error: "",
      warning: overlaps
        ? `${T("The interval")} (${intervalMin} min) ${T("is shorter than the duration")} (${durationMin} min) — ${T("the occurrences will overlap.")}`
        : "",
    };
  }

  // ─── Selection ───────────────────────────────────────────────────────
  // Reading via selectionManager is what proved reliable in the original;
  // the SDK read stays as a fallback in case the internal shape changes.
  // When set, getClosureSelection() below returns this instead of reading
  // WME's live selection. Exists specifically so right-clicking a hovered-
  // but-unselected segment and picking Closures can target that segment
  // WITHOUT calling sdk.Editing.setSelection() — that call IS WME's real
  // selection state, so using it would also open WME's own native segment
  // editor panel as a side effect, which is exactly what this override
  // avoids. Cleared when the panel closes so a later open (e.g. from an
  // actual left-click selection) goes back to reading live selection.
  let closureExplicitTargetIds = null;

  function getClosureSelection() {
    if (closureExplicitTargetIds && closureExplicitTargetIds.length) {
      return { ids: closureExplicitTargetIds.slice(), objectType: "segment" };
    }
    try {
      const ids = UW?.W?.selectionManager?.selectedFeatureIds;
      if (ids && ids.length) {
        const segIds = ids
          .filter((f) => typeof f === "string" && f.startsWith("segment:"))
          .map((f) => parseInt(f.replace("segment:", ""), 10));
        if (segIds.length) return { ids: segIds, objectType: "segment" };
      }
    } catch {}
    try {
      const sel = sdk?.Editing?.getSelection?.();
      if (sel?.ids?.length && sel.objectType === "segment") {
        return { ids: sel.ids.map(Number), objectType: "segment" };
      }
    } catch {}
    return { ids: [], objectType: "none" };
  }

  function getClosureSegment(id) {
    try { return sdk?.DataModel?.Segments?.getById?.({ segmentId: Number(id) }); } catch { return null; }
  }

  // Counts how many of the segments in a closure touch each node id
  // (as either endpoint). A node touched by 2+ of those segments is an
  // internal junction — a "knot" sitting between two segments that are
  // BOTH being closed — as opposed to a node touched by only one, which
  // is an outer end of the closed stretch. Same algorithm as WME
  // Closures Toolkit's "close internal junctions" mode: only the knots
  // strictly between closed segments get closed, not the two boundary
  // nodes where the closure meets still-open road (closing those too
  // would block a router from even routing UP TO the closure).
  //
  // Pure and side-effect free (aside from the getClosureSegment reads,
  // which are themselves read-only SDK lookups) so this can be unit
  // tested with a stubbed getClosureSegment.
  function computeClosureNodeShareCounts(segIds) {
    const counts = {};
    for (const sid of segIds || []) {
      const seg = getClosureSegment(sid);
      if (!seg) continue;
      for (const nid of [seg.fromNodeId, seg.toNodeId]) {
        if (!nid) continue;
        counts[nid] = (counts[nid] || 0) + 1;
      }
    }
    return counts;
  }

  // Decides, for ONE segment, whether each of its two physical ends gets
  // its knot cut. Split out of applyRoadClosure's inner loop and kept
  // free of any SDK call so the three modes can be unit tested against a
  // plain object.
  //
  // Returns { from, to } keyed on the segment's own fixed A→B endpoints
  // — NOT on the direction of travel. Mapping those onto addClosure's
  // `fromNodeClosed` is the caller's job, because which physical end is
  // "the from node" swaps between the A→B and B→A calls.
  function resolveClosureNodeEnds(nodeMode, seg, nodeShareCounts) {
    const mode = normalizeClosureNodeMode(nodeMode);
    if (mode === CLOSURE_NODES.all) return { from: true, to: true };
    if (mode === CLOSURE_NODES.none) return { from: false, to: false };
    // inner: an end qualifies only when another segment in the same
    // closure also touches that node — i.e. it's a knot strictly between
    // two closed segments, not an outer boundary where the closure meets
    // still-open road.
    const counts = nodeShareCounts || {};
    return {
      from: (counts[seg?.fromNodeId] || 0) > 1,
      to: (counts[seg?.toNodeId] || 0) > 1,
    };
  }

  function closureSegmentName(id) {
    try {
      const addr = sdk?.DataModel?.Segments?.getAddress?.({ segmentId: Number(id) });
      if (addr?.street && !addr.street.isEmpty) return addr.street.name;
    } catch {}
    return T("Unnamed");
  }

  // Reversed segments: a direction expressed in A→B terms has to be
  // swapped for these, or the closure lands on the wrong carriageway.
  function getReversedClosureSegments(ids) {
    try {
      return sdk?.DataModel?.Segments?.getReversedSegments?.({ segmentIds: ids.map(Number) })
        ?.map((s) => Number(s.id)) || [];
    } catch (err) {
      dlog("getReversedSegments failed", err);
      return [];
    }
  }

  const swapDir = (dir) => (
    dir === CLOSURE_DIR.AtoB ? CLOSURE_DIR.BtoA
      : dir === CLOSURE_DIR.BtoA ? CLOSURE_DIR.AtoB
        : CLOSURE_DIR.TWO
  );

  // Does the requested direction produce at least one closure here?
  function dirAppliesToSegment(seg, requestedDir, reversed) {
    if (!seg) return false;
    const dir = reversed ? swapDir(requestedDir) : requestedDir;
    const canAB = seg.isTwoWay || seg.isAtoB;
    const canBA = seg.isTwoWay || seg.isBtoA;
    if (dir === CLOSURE_DIR.TWO) return canAB || canBA;
    return dir === CLOSURE_DIR.AtoB ? canAB : canBA;
  }

  // Directions that work for EVERY selected segment. Offering one that
  // silently produces zero closures on a one-way is worse than not
  // offering it — the user only finds out after clicking Apply.
  function validClosureDirections(ids) {
    if (!ids.length) return [CLOSURE_DIR.TWO, CLOSURE_DIR.AtoB, CLOSURE_DIR.BtoA];
    const rev = new Set(getReversedClosureSegments(ids));
    const segs = ids.map((id) => ({ seg: getClosureSegment(id), reversed: rev.has(Number(id)) }));
    return [CLOSURE_DIR.TWO, CLOSURE_DIR.AtoB, CLOSURE_DIR.BtoA].filter(
      (d) => segs.every(({ seg, reversed }) => dirAppliesToSegment(seg, d, reversed))
    );
  }

  // ─── Major Traffic Events ────────────────────────────────────────────
  // ⚠️ Outside the SDK: traffic events aren't exposed for LISTING (only
  // MajorTrafficEvents.getById() exists, for a known id). Reads WME's
  // internal model instead, which can change without notice — same path
  // WME Closures Toolkit itself falls back to for the same reason.
  //
  // Returns { events, error } rather than a bare array: a tester once
  // reported the events dropdown never populating no matter how many
  // times they reloaded WME's own Events tab and clicked refresh here.
  // The old code returned [] for BOTH "there are genuinely no events in
  // this view" and "the read into WME's internals threw" — the UI showed
  // the exact same "No event in this view" text either way, so a real
  // failure was indistinguishable from normal empty state, and refresh
  // looked like it was doing nothing. Reporting which step actually
  // failed turns that into something a bug report can act on, instead
  // of a silent dead end.
  function listTrafficEvents() {
    if (!UW?.W) { dlog("listTrafficEvents: UW.W is unavailable"); return { events: [], error: true }; }
    if (!UW.W.model) { dlog("listTrafficEvents: UW.W.model is unavailable"); return { events: [], error: true }; }
    if (!UW.W.model.majorTrafficEvents) {
      dlog("listTrafficEvents: UW.W.model.majorTrafficEvents is unavailable — WME's internal model may have changed");
      return { events: [], error: true };
    }
    if (typeof UW.W.model.majorTrafficEvents.getObjectArray !== "function") {
      dlog("listTrafficEvents: majorTrafficEvents.getObjectArray is not a function");
      return { events: [], error: true };
    }
    try {
      const arr = UW.W.model.majorTrafficEvents.getObjectArray();
      if (!Array.isArray(arr)) {
        dlog("listTrafficEvents: getObjectArray() did not return an array", arr);
        return { events: [], error: true };
      }
      const events = arr
        .map((ev) => ({
          id: ev?.attributes?.id,
          name: ev?.attributes?.names?.[0]?.value || ev?.attributes?.uniqueName || String(ev?.attributes?.id ?? ""),
        }))
        // A malformed entry (no id) can't be selected against later —
        // drop it rather than offer an option that would silently fail
        // to apply when picked.
        .filter((e) => e.id != null && e.id !== "");
      return { events, error: false };
    } catch (err) {
      dlog("listTrafficEvents: reading the events model threw", err);
      return { events: [], error: true };
    }
  }

  // Whether the SDK's OWN registry recognises a given Major Traffic
  // Event yet. This is a genuinely different question from "is it in
  // this panel's event list" (listTrafficEvents above reads WME's
  // internal `majorTrafficEvents` collection, which updates immediately
  // when an event is created) — sdk.DataModel.RoadClosures.addClosure
  // validates trafficEventId against a SEPARATE, SDK-internal registry
  // that can lag behind it, even for an event that's been visible in
  // this panel's own dropdown, and even after WME's own Events tab has
  // been opened. sdk.DataModel.MajorTrafficEvents.getById() is the SDK's
  // own accessor for a single event (the same one WME Closures Toolkit
  // uses to resolve an event's name) — a false/thrown result here means
  // the SDK itself doesn't see the event yet, not that the id is wrong.
  function isEventRecognisedBySdk(eventId) {
    try {
      return !!sdk.DataModel.MajorTrafficEvents.getById({ majorTrafficEventId: eventId });
    } catch {
      return false;
    }
  }

  // Polls isEventRecognisedBySdk until it's true or `attempts` is spent.
  // Needed ONLY for an event created/loaded very recently in THIS
  // session — for every other event this resolves on the very first
  // check (no delay) and costs nothing.
  //
  // ⚠️ A previous version of this fix let addClosure fail, created the
  // closure anyway with trafficEventId:null, and patched the real id
  // directly onto the resulting model object afterwards — the same
  // before-any-save mutation Source/provider already relies on for
  // fields the SDK doesn't expose reliably at creation time. That patch
  // DOES stick in memory (confirmed by reading it straight back), but it
  // does NOT reliably survive an actual save: the closure can come back
  // from the server without the event regardless. Whatever addClosure's
  // own validation was protecting evidently isn't satisfied by a raw
  // attribute write after the fact, so this waits for the SDK to
  // genuinely recognise the event and lets addClosure do the real work
  // itself — the only approach that doesn't depend on undocumented
  // internals this script can't verify from here.
  async function waitForEventRecognisedBySdk(eventId, attempts, delayMs) {
    for (let i = 0; i < attempts; i++) {
      if (isEventRecognisedBySdk(eventId)) return true;
      if (i < attempts - 1) await new Promise((resolve) => { setTimeout(resolve, delayMs); });
    }
    return false;
  }
  // ~2.7s worst case (first check is immediate, then 9 waits of 300ms) —
  // long enough to cover the lag actually observed in the field, short
  // enough that "Applying…" (already shown the moment the button is
  // clicked) doesn't feel stuck.
  const EVENT_READY_POLL_ATTEMPTS = 10;
  const EVENT_READY_POLL_DELAY_MS = 300;

  // Parses the "YYYY-MM-DD HH:MM" strings the SDK's event objects use for
  // startDate/endDate into a LOCAL Date. Never new Date(string) — the
  // same DST-unsafe trap toClosureTimestamp exists to avoid elsewhere in
  // this file; this is the identical kind of local-wall-clock value.
  function parseEventDateString(s) {
    const m = typeof s === "string" && s.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/);
    if (!m) return null;
    const y = Number(m[1]), mo = Number(m[2]), d = Number(m[3]), h = Number(m[4]), mi = Number(m[5]);
    return new Date(y, mo - 1, d, h, mi, 0, 0);
  }

  // ─── Source (partner) ────────────────────────────────────────────────
  // ⚠️ The only part that leaves the SDK for a WRITE. The SDK exposes
  // Source neither for reading nor writing, so the closure is created via
  // the SDK and provider/attributions are then applied to the model
  // object, BEFORE saving. The partner list is served per map area (bbox):
  // Lisbon's partners aren't Porto's.
  let closurePartners = [];
  let closurePartnersBboxKey = null;
  let closureSourceAvailable = false;

  // Detects the WME environment segment (row / usa / il / etc.) from the
  // current URL, needed to build the same-origin Partners endpoint below.
  // Falls back to 'row' (rest-of-world) if neither pattern matches, same
  // as the original — a wrong environment guess just returns an empty
  // partner list rather than breaking anything else.
  function wmeEnvSegment() {
    try {
      return (location.pathname.match(/^\/(\w+)-editor/) || [])[1]
        || (UW?.W?.Config?.server?.baseUrl?.match(/\/(\w+)-Descartes/) || [])[1]
        || "row";
    } catch { return "row"; }
  }

  // Does the loaded model still carry the Source fields at all? If WME
  // ever renames/removes provider/attributions, this catches it here
  // instead of silently mis-attributing a closure at write time.
  function closureSourceSchemaOk() {
    try {
      const objs = Object.values(UW?.W?.model?.roadClosures?.objects || {});
      if (!objs.length) return true; // nothing loaded to inspect — don't conclude either way
      return objs.some((o) => o.attributes && "provider" in o.attributes && "attributions" in o.attributes);
    } catch { return false; }
  }

  // Concurrent callers share one in-flight request instead of each
  // starting their own. Two callers CAN legitimately overlap — the
  // modal's own "refresh source" button and applyRoadClosure's
  // pre-write check both call this — and without dedupe their two
  // fetches race to assign closurePartners/closurePartnersBboxKey, so a
  // slower earlier response can land last and overwrite a newer, correct
  // list. Same pattern already used by ensureAuthSession() and
  // refreshAllowlistState().
  let closurePartnersInFlight = null;

  async function refreshClosurePartners() {
    if (closurePartnersInFlight) return closurePartnersInFlight;
    closurePartnersInFlight = (async () => {
      try {
        return await refreshClosurePartnersUncached();
      } finally {
        closurePartnersInFlight = null;
      }
    })();
    return closurePartnersInFlight;
  }

  async function refreshClosurePartnersUncached() {
    if (!closureSourceSchemaOk()) {
      closurePartners = [];
      closureSourceAvailable = false;
      return;
    }

    try {
      const extent = sdk?.Map?.getMapExtent?.();
      const bbox = Array.isArray(extent) ? extent
        : extent ? [extent.left, extent.bottom, extent.right, extent.top]
          : null;
      if (!bbox) return;

      const newKey = bbox.map((n) => Number(n).toFixed(3)).join(",");
      if (newKey === closurePartnersBboxKey && closurePartners.length) return;

      // ⚠️ Not exposed by the SDK, and not anywhere inside W either — this
      // is the only place the partner list actually comes from. Same-origin
      // (accepted by WME's own CSP without needing GM_xmlhttpRequest, unlike
      // the Firebase calls elsewhere in this script), server-scoped by
      // bounding box: Lisbon's partners aren't Porto's.
      const res = await fetch(`/${wmeEnvSegment()}-Descartes/app/Partners?bbox=${bbox.join(",")}`, {
        credentials: "include",
      });
      if (!res.ok) { closurePartners = []; closureSourceAvailable = false; return; }
      const json = await res.json();
      const list = json?.partnersList?.objects;
      if (!Array.isArray(list)) { closurePartners = []; closureSourceAvailable = false; return; }

      closurePartners = list
        .filter((p) => p && p.id && p.name)
        .map((p) => ({ id: String(p.id), name: String(p.name) }))
        .sort((a, b) => a.name.localeCompare(b.name));
      closurePartnersBboxKey = newKey;
      closureSourceAvailable = closurePartners.length > 0;
    } catch (err) {
      dlog("refreshClosurePartners failed", err);
      closurePartners = [];
      closureSourceAvailable = false;
    }
  }

  // Applies the Source to the closures JUST created (before/after diff).
  function applyClosureSource(newKeys, partnerId) {
    const p = closurePartners.find((x) => x.id === String(partnerId));
    if (!p) return 0;
    let n = 0;
    for (const k of newKeys) {
      const o = UW?.W?.model?.roadClosures?.objects?.[k];
      if (!o?.attributes) continue;
      o.attributes.provider = p.name;
      o.attributes.attributions = [{
        partnerId: p.id,
        idInProvider: null,
        feedId: null,
        credit: p.name,
        contributionTime: Date.now(),
        channel: PARTNER_CHANNEL,
        userChannel: PARTNER_USER_CHANNEL,
      }];
      n++;
    }
    return n;
  }

  // ─── Apply ───────────────────────────────────────────────────────────
  // Creates the closures, applies the Source if one was chosen, and
  // optionally saves. Returns { ok, message, tone } so the caller decides
  // how to present it — this function itself touches no DOM.
  async function applyRoadClosure(cfg) {
    const sel = getClosureSelection();
    if (!sel.ids.length) {
      return { ok: false, message: T("No segment selected"), tone: "error" };
    }

    const { occurrences, error } = buildClosureOccurrences(cfg.dates);
    if (error) return { ok: false, message: error, tone: "error" };
    if (!occurrences.length) {
      return { ok: false, message: T("No occurrences to apply."), tone: "error" };
    }

    // If a Source was requested, the partner has to exist BEFORE anything
    // is written: a closure with the wrong attribution isn't a detail.
    if (cfg.sourceId && !closurePartners.some((p) => p.id === cfg.sourceId)) {
      await refreshClosurePartners();
      if (!closurePartners.some((p) => p.id === cfg.sourceId)) {
        return {
          ok: false,
          message: T("The selected source no longer exists in this view. Reload the list."),
          tone: "error",
        };
      }
    }

    // If an Event was requested, wait (briefly) for the SDK's OWN
    // registry to recognise it — see isEventRecognisedBySdk /
    // waitForEventRecognisedBySdk above for why this check exists.
    //
    // ⚠️ CONFIRMED IN THE FIELD (v6.13.0): this check passing does NOT
    // reliably predict that addClosure() will then accept the same id —
    // a case was observed where isEventRecognisedBySdk returned true and
    // addClosure STILL threw its "eventForClosure ... not found" error
    // for every direction, for every event tried, no matter how long the
    // wait. That last point matters: a genuine propagation lag would
    // eventually clear; this never did, across more than an hour and
    // several different events. This wait is kept because it's harmless,
    // but it is NOT the fix — see eventWindow below for the theory
    // actually being tested now.
    //
    // ⚠️ CORRECTION: earlier versions of this comment (and this file,
    // inherited from before this bug was ever investigated) claimed this
    // "eventForClosure ... not found" behaviour was "documented by WME
    // Closures Toolkit's own field notes". That is WRONG — the string
    // "eventForClosure" does not appear anywhere in WME Closures
    // Toolkit's source. That attribution was already present, unverified,
    // in the code inherited before this investigation started, and it
    // got repeated instead of checked. Where this idea actually
    // originated is unknown; it should not have been cited as an
    // outside-confirmed fact.
    let eventWindow = null;
    if (cfg.eventId) {
      const ready = await waitForEventRecognisedBySdk(cfg.eventId, EVENT_READY_POLL_ATTEMPTS, EVENT_READY_POLL_DELAY_MS);
      let evInfo = "getById threw or returned nothing";
      try {
        const ev = sdk.DataModel.MajorTrafficEvents.getById({ majorTrafficEventId: cfg.eventId });
        if (ev) {
          evInfo = JSON.stringify({ id: ev.id, startDate: ev.startDate, endDate: ev.endDate });
          const evStart = parseEventDateString(ev.startDate);
          const evEnd = parseEventDateString(ev.endDate);
          if (evStart && evEnd) eventWindow = { start: evStart, end: evEnd };
        }
      } catch (e) { evInfo = `getById threw: ${e?.message || e}`; }
      dlog(`event readiness: eventId=${cfg.eventId} (${typeof cfg.eventId}) ready=${ready} getById=${evInfo}`);
      if (!ready) {
        return {
          ok: false,
          message: T("WME hasn't finished loading the selected event yet. Wait a few seconds and try again — if it keeps happening, open WME's own Events tab once first."),
          tone: "error",
        };
      }
    }

    // ⚠️ Snapshot of the keys BEFORE: the SDK doesn't return the objects it
    // creates, so a before/after diff is the only way to find ours again.
    const keysBefore = new Set(Object.keys(UW?.W?.model?.roadClosures?.objects || {}));

    const reversed = new Set(getReversedClosureSegments(sel.ids));
    // Which knots to cut. Anything that isn't one of the three known
    // values falls back to "inner", which is what this panel did
    // unconditionally before the selector existed — so an old settings
    // blob with no closureNodeMode key keeps behaving exactly as it did.
    const nodeMode = normalizeClosureNodeMode(cfg.nodeMode);
    // One pass over the segment set, done once — not per occurrence — to
    // find every internal junction shared by 2+ of the segments being
    // closed. Direction and dates change per iteration below; which
    // nodes are internal to this particular set of segments does not.
    // Only "inner" needs the map at all: "none" and "all" are constant
    // answers, so the per-segment SDK reads are skipped entirely.
    const nodeShareCounts = nodeMode === CLOSURE_NODES.inner
      ? computeClosureNodeShareCounts(sel.ids)
      : null;

    // sdk.DataModel.RoadClosures.addClosure validates trafficEventId
    // against the SAME SDK-internal registry isEventRecognisedBySdk
    // checks above — this call should now always land with a
    // recognised event, since applyRoadClosure already waited for that
    // above before creating anything. isEventNotLoadedError /
    // describeAddClosureError stay on as a defensive translation layer
    // for the residual case where the SDK's registry regresses between
    // the wait and this exact call — reported honestly as a failure
    // rather than silently created without the event, which is the
    // whole reason the previous create-then-patch approach was dropped.
    //
    // ⚠️ A prior version of this message tried to distinguish "probably
    // just a propagation lag" from "a confirmed WME platform issue"
    // based on the shape of the event's own id (a plain number vs.
    // "1.1.<uuid>"). That distinction was wrong: the "unusual" shape
    // turned out to be what EVERY current event id looks like, not a
    // marker of anything broken, so the warning fired on every event
    // regardless. The only thing actually confirmed is that a full
    // browser tab reload has reliably unstuck this — so that's what's
    // said, plainly, instead of a theory about the cause.
    const isEventNotLoadedError = (msg) => /eventForClosure/i.test(msg) && /not found/i.test(msg);
    const describeAddClosureError = (e) => {
      const msg = String(e?.message || e || "");
      if (isEventNotLoadedError(msg)) {
        return T("Please refresh this browser tab to apply a closure with a newly created event — a current limitation of this script and WME.");
      }
      return msg;
    };

    const args = {
      description: cfg.description,
      endDate: 0,
      fromNodeClosed: false,
      isForward: false,
      isPermanent: cfg.ignoreTraffic,
      segmentId: 0,
      startDate: 0,
      trafficEventId: cfg.eventId || null,
    };

    // Live view of the closure objects collection, re-read each time
    // rather than cached — the collection reference itself doesn't
    // change, but re-deriving it defensively costs nothing.
    const closureObjects = () => UW?.W?.model?.roadClosures?.objects || {};
    // Deletes any key that appeared after `before` was taken. Defensive
    // cleanup for a THROWING addClosure() call: confirmed in the field
    // that a throw can still leave a half-created object behind. Without
    // this, that stray object would pollute the newKeys diff below for
    // every later segment/occurrence in the same apply.
    function removeKeysAfter(before) {
      const objs = closureObjects();
      for (const k of Object.keys(objs)) {
        if (!before.has(k)) delete objs[k];
      }
    }

    // A single addClosure(args) attempt. Returns null on success or the
    // error to report — no retry, no fallback: the event, if any, was
    // already confirmed recognised by the SDK before this ever runs.
    function tryAddClosure() {
      const before = new Set(Object.keys(closureObjects()));
      try {
        sdk.DataModel.RoadClosures.addClosure(args);
        return null;
      } catch (e) {
        removeKeysAfter(before);
        return e;
      }
    }

    const segmentsDone = new Set();
    let missing = 0;
    let occurrencesPlaced = 0;
    const errors = [];

    for (const oc of occurrences) {
      args.startDate = toClosureTimestamp(oc.start);
      args.endDate = toClosureTimestamp(oc.end);
      let anyThisOccurrence = false;

      // Diagnostic only — does NOT change whether addClosure is called.
      // Working theory being tested: addClosure's "eventForClosure ...
      // not found" may not be about propagation at all (waiting never
      // helped, across different events and over an hour) but about the
      // closure's own start/end falling OUTSIDE the event's own
      // start/end window. Logged for every occurrence so the next
      // failure shows the actual numbers instead of another guess.
      if (cfg.eventId && eventWindow) {
        const within = oc.start >= eventWindow.start && oc.end <= eventWindow.end;
        dlog(`event window check: occurrence ${formatClosureDateTime(oc.start)}–${formatClosureDateTime(oc.end)}`
          + ` vs event ${formatClosureDateTime(eventWindow.start)}–${formatClosureDateTime(eventWindow.end)}`
          + ` within=${within}`);
      }

      for (const sid of sel.ids) {
        const seg = getClosureSegment(sid);
        if (!seg) { if (oc === occurrences[0]) missing++; continue; }
        args.segmentId = Number(sid);

        let dir = cfg.direction;
        if (reversed.has(Number(sid))) dir = swapDir(dir);

        const canAB = seg.isTwoWay || seg.isAtoB;
        const canBA = seg.isTwoWay || seg.isBtoA;

        // Whether each end of THIS segment gets its knot cut. "From" and
        // "to" here are the segment's own fixed A→B endpoints; which one
        // is the "from" node IN THE DIRECTION OF TRAVEL flips between
        // the A→B and B→A closure calls below, which is exactly why this
        // is read once per segment but applied differently to each.
        const nodeEnds = resolveClosureNodeEnds(nodeMode, seg, nodeShareCounts);

        if ((dir === CLOSURE_DIR.AtoB || dir === CLOSURE_DIR.TWO) && canAB) {
          args.isForward = true;
          // Travelling A→B, the node you'd enter FROM is the segment's
          // own fromNodeId.
          args.fromNodeClosed = nodeEnds.from;
          const err = tryAddClosure();
          if (err) {
            // The RAW message, untranslated — everything diagnosed so
            // far about this bug came from pattern-matching this text
            // ("eventForClosure ... not found"), never from actually
            // seeing it. Logged separately from the friendly text pushed
            // below so the next diagnostics capture shows the real
            // wording instead of our own guess about what it means.
            dlog("raw addClosure error (A→B)", err?.message || err);
            errors.push(`${formatClosureDateTime(oc.start)} seg ${sid} A→B: ${describeAddClosureError(err)}`);
          } else {
            segmentsDone.add(Number(sid));
            anyThisOccurrence = true;
          }
        }
        if ((dir === CLOSURE_DIR.BtoA || dir === CLOSURE_DIR.TWO) && canBA) {
          args.isForward = false;
          // Travelling B→A, the node you'd enter FROM is the
          // segment's toNodeId — the two directions swap which
          // physical end is "the from node" for this call.
          args.fromNodeClosed = nodeEnds.to;
          const err = tryAddClosure();
          if (err) {
            dlog("raw addClosure error (B→A)", err?.message || err);
            errors.push(`${formatClosureDateTime(oc.start)} seg ${sid} B→A: ${describeAddClosureError(err)}`);
          } else {
            segmentsDone.add(Number(sid));
            anyThisOccurrence = true;
          }
        }
      }
      if (anyThisOccurrence) occurrencesPlaced++;
    }

    if (errors.length) dlog("errors creating closures:", errors.join(" | "));

    // ⚠️ The diff has to be taken BEFORE saving: afterwards the temporary
    // objects receive their server ids and the keys no longer match.
    const newKeys = Object.keys(UW?.W?.model?.roadClosures?.objects || {}).filter((k) => !keysBefore.has(k));

    if (!newKeys.length) {
      return {
        ok: false,
        message: `${T("No closure created")}${missing ? ` (${missing} ${T("segment(s) outside the model")})` : ""}`
          + `${errors.length ? ` — ${errors[0]}` : ""}.`,
        tone: "error",
      };
    }

    // ─── Source, before any save ──────────────────────────────────────
    if (cfg.sourceId) {
      const placed = applyClosureSource(newKeys, cfg.sourceId);
      if (placed !== newKeys.length) {
        // Nothing is saved and nothing is auto-undone: an undoAll would
        // take pending edits that aren't ours with it. Since nothing was
        // sent to the server, the editor's Ctrl+Z resolves it, and it's
        // the user who decides.
        return {
          ok: false,
          message: `${T("Source applied to only")} ${placed} ${T("of")} ${newKeys.length} ${T("closure(s). Nothing was saved — undo with Ctrl+Z and try again.")}`,
          tone: "error",
        };
      }
    }

    const summary = `${newKeys.length} ${T("closure(s)")}`
      + `${occurrences.length > 1 ? ` ${T("in")} ${occurrencesPlaced} ${T("of")} ${occurrences.length} ${T("occurrence(s)")}` : ""}`
      + ` — ${segmentsDone.size} ${T("segment(s)")}`
      + `${missing ? `, ${missing} ${T("outside the model")}` : ""}`;

    if (!cfg.autoSave) {
      return { ok: true, message: `${summary}. ${T("Not saved — use Ctrl+S or WME's Save button.")}`, tone: "ok" };
    }

    try {
      await sdk.Editing.save();
      // Corroboration: WME's error list is DOM, not a contract. If the
      // class changes this stops detecting — but it still beats announcing
      // success without looking.
      const er = document.querySelector(".error-list");
      if (er) {
        const msg = er.querySelector(".description")?.textContent || T("server error");
        er.querySelector(".close-button")?.click();
        return { ok: false, message: `${T("The server refused:")} ${msg}`, tone: "error" };
      }
      return { ok: true, message: `${summary} — ${T("saved.")}`, tone: "ok" };
    } catch (e) {
      dlog("closure save failed", e);
      return { ok: false, message: `${T("Failed to save:")} ${e?.message || e}.`, tone: "error" };
    }
  }

  function lonLatFromClick(x, y) {
    try {
      const fn = sdk?.Map?.getLonLatFromPixel;
      if (typeof fn === "function") {
        const ll = fn({ x, y });
        if (ll && isFinite(ll.lon) && isFinite(ll.lat)) return { lon: ll.lon, lat: ll.lat };
      }
    } catch {}
    return lastLonLat;
  }

  function centerMapOn(lon, lat, zoom) {
    const z = Number.isFinite(Number(zoom)) ? Number(zoom) : null;
    try {
      const map = getOlMap();
      const ll = toMapProjection(lon, lat);
      if (map && ll && typeof map.setCenter === "function") {
        map.setCenter(ll, z ?? undefined);
        return true;
      }
    } catch {}
    try {
      if (typeof sdk?.Map?.setCenter === "function") {
        sdk.Map.setCenter({ lon, lat });
        if (z != null && typeof sdk?.Map?.setZoom === "function") sdk.Map.setZoom({ zoomLevel: z });
        return true;
      }
    } catch {}
    return false;
  }

  function isMapClick(x, y) {
    try {
      const mapEl = getMapContainerEl();
      if (!mapEl) return false;
      const r = mapEl.getBoundingClientRect();
      if (x < r.left || x > r.right || y < r.top || y > r.bottom) return false;

      const stack = (document.elementsFromPoint ? document.elementsFromPoint(x, y) : [document.elementFromPoint(x, y)]).filter(Boolean);
      for (const el of stack.slice(0, 12)) {
        if (!el || !el.closest) continue;
        // Every one of this script's own overlays has to be listed here,
        // not just the ones that happen to sit inside the map element.
        // elementsFromPoint returns the FULL stack under the cursor, so
        // an overlay painted on top of the map still has the map's own
        // canvas below it in that list — and the canvas check further
        // down would then happily report "yes, this was a map click".
        //
        // That's how right-clicking the modal backdrop, a reminder
        // notice, or (since it moved out of the panel) the pins sort
        // menu could pop the radial menu open on top of them.
        if (el.closest(".wmeRcRadial,.wmeRcModal,.wmeRcModalBackdrop,.wmeRcPins,.wmeRcToast,.wmeRcSortPop,.wmeRcNoticeStack,.wmeRcNotice,.wmeRcSnoozePop")) return false;
        if (el.closest("wz-card,[role='dialog'],[role='menu'],.menu,.dropdown,.panel,.sidebar,.tooltip")) return false;
      }
      for (const el of stack) {
        if (!el) continue;
        if (el.tagName === "CANVAS") return true;
        if (el.closest && el.closest("canvas")) return true;
        if (el === mapEl || (el.closest && el.closest("#map,#WazeMap,.olMap,.wme-map"))) return true;
      }
    } catch {}
    return false;
  }

  function selectedSegmentIds() {
    try {
      const raw = sdk?.Editing?.getSelection?.();
      const arr = Array.isArray(raw) ? raw : (Array.isArray(raw?.selection) ? raw.selection : null);
      if (Array.isArray(arr)) {
        const ids = arr
          .filter((o) => /segment/i.test(String(o?.objectType ?? o?.localizedTypeName ?? "")))
          .map((o) => Number(o?.objectId ?? o?.id))
          .filter(Number.isFinite);
        if (ids.length) return Array.from(new Set(ids));
      }
      if (raw && Array.isArray(raw.ids) && /segment/i.test(String(raw.objectType ?? ""))) {
        return Array.from(new Set(raw.ids.map(Number).filter(Number.isFinite)));
      }
    } catch {}
    return [];
  }

  /* ------------------------------------------------------------------ *
   *  Segment hit-testing under the cursor
   * ------------------------------------------------------------------ */

  // Meters-per-pixel at the current zoom/latitude, used to convert a pixel
  // hit-radius into a lon/lat threshold without needing a documented
  // getPixelFromLonLat on the SDK (only the inverse is public).
  function degreesPerPixelNear(lat) {
    try {
      const map = getOlMap();
      if (map && typeof map.getResolution === "function") {
        const res = map.getResolution(); // usually meters/pixel in EPSG:3857
        if (Number.isFinite(res) && res > 0) {
          const metersPerDegLat = 111320;
          const metersPerDegLon = 111320 * Math.max(0.1, Math.cos((lat || 0) * Math.PI / 180));
          return { dLat: res / metersPerDegLat, dLon: res / metersPerDegLon };
        }
      }
    } catch {}
    // Fallback: sample two pixels a known distance apart.
    try {
      const a = lonLatFromClick(200, 200);
      const b = lonLatFromClick(210, 200);
      if (a && b) {
        const dLon = Math.abs(b.lon - a.lon) / 10;
        return { dLat: dLon, dLon };
      }
    } catch {}
    return { dLat: 0.00002, dLon: 0.00002 };
  }

  // Finds the segment closest to a lon/lat, within a pixel-radius tolerance.
  // Returns { segmentId, lon, lat } (the snapped point on the segment) or
  // null if nothing is close enough — the exact same tolerance concept WME's
  // own snapping uses when you click near (not exactly on) a road.
  function findSegmentUnderCursor(ll, hitRadiusPx = 14) {
    if (!ll || !Number.isFinite(ll.lon) || !Number.isFinite(ll.lat)) return null;
    let segs = [];
    try { segs = sdk?.DataModel?.Segments?.getAll?.() || []; } catch { segs = []; }
    if (!Array.isArray(segs) || !segs.length) return null;

    const { dLat, dLon } = degreesPerPixelNear(ll.lat);
    const rLon = dLon * hitRadiusPx;
    const rLat = dLat * hitRadiusPx;
    // Normalize both axes onto a common "pixel" scale so the threshold
    // check is a simple radius comparison instead of an ellipse.
    const sx = rLon > 0 ? 1 / rLon : 1;
    const sy = rLat > 0 ? 1 / rLat : 1;

    // Hot path: this runs on every right-click over a map that can hold a
    // few thousand loaded segments. The previous version built a filtered
    // + mapped copy of every segment's coordinate array and allocated a
    // result object per edge, which dominated the cost. This walks the raw
    // coordinate arrays in place, rejects whole segments with a cheap
    // bounding-box test before touching their edges, and keeps the best
    // match in plain locals. Benchmarked at roughly 7x faster on a
    // 2000-segment / 8-point-per-segment load with identical results.
    const px = ll.lon * sx;
    const py = ll.lat * sy;
    const padLon = 1 / sx;
    const padLat = 1 / sy;

    let bestD2 = Infinity;
    let bestId = null;
    let bestCx = 0;
    let bestCy = 0;

    for (let s = 0; s < segs.length; s++) {
      const seg = segs[s];
      const raw = seg?.geometry?.coordinates;
      if (!raw || raw.length < 2) continue;

      let minLon = Infinity, maxLon = -Infinity, minLat = Infinity, maxLat = -Infinity;
      for (let i = 0; i < raw.length; i++) {
        const p = raw[i];
        if (!p) continue;
        const lo = p[0], la = p[1];
        if (lo < minLon) minLon = lo;
        if (lo > maxLon) maxLon = lo;
        if (la < minLat) minLat = la;
        if (la > maxLat) maxLat = la;
      }
      if (ll.lon < minLon - padLon || ll.lon > maxLon + padLon ||
          ll.lat < minLat - padLat || ll.lat > maxLat + padLat) continue;

      for (let i = 1; i < raw.length; i++) {
        const a = raw[i - 1], b = raw[i];
        if (!a || !b) continue;
        const ax = a[0] * sx, ay = a[1] * sy;
        const bx = b[0] * sx, by = b[1] * sy;
        if (!Number.isFinite(ax) || !Number.isFinite(ay) ||
            !Number.isFinite(bx) || !Number.isFinite(by)) continue;
        const abx = bx - ax, aby = by - ay;
        const apx = px - ax, apy = py - ay;
        const ab2 = abx * abx + aby * aby;
        let t = ab2 > 0 ? ((apx * abx) + (apy * aby)) / ab2 : 0;
        if (t < 0) t = 0; else if (t > 1) t = 1;
        const cx = ax + abx * t, cy = ay + aby * t;
        const dx = px - cx, dy = py - cy;
        const d2 = dx * dx + dy * dy;
        if (d2 < bestD2) {
          bestD2 = d2;
          bestId = Number(seg.id ?? seg.attributes?.id);
          bestCx = cx;
          bestCy = cy;
        }
      }
    }

    // bestD2 is now in "pixel radius units" — 1.0 == exactly at the radius.
    if (bestId != null && bestD2 <= 1) {
      return { segmentId: bestId, lon: bestCx / sx, lat: bestCy / sy };
    }
    return null;
  }

  /* ------------------------------------------------------------------ *
   *  Permalink / refresh
   * ------------------------------------------------------------------ */

  function buildPermalink(ll, segIds) {
    const st = loadSettings();
    const cur = new URLSearchParams(location.search);
    const params = new URLSearchParams();

    for (const k of ["env", "tab", "language", "locale", "country"]) {
      if (cur.has(k)) params.set(k, cur.get(k));
    }
    if (st.includeLayers) {
      for (const k of ["layers", "layer", "layersVisibility"]) {
        if (cur.has(k)) params.set(k, cur.get(k));
      }
    }

    params.set("lat", fmt(ll.lat));
    params.set("lon", fmt(ll.lon));
    if (cur.has("s")) params.set("s", cur.get("s"));

    const z = getZoomBestEffort();
    if (Number.isFinite(z)) params.set("zoomLevel", String(Math.round(z)));

    const ids = Array.isArray(segIds) ? segIds.map(Number).filter(Number.isFinite) : [];
    if (ids.length) params.set("segments", Array.from(new Set(ids)).join(","));

    const qs = params.toString().replace(/%2C/gi, ",");
    return qs ? `${EDITOR_BASE}?${qs}` : EDITOR_BASE;
  }

  function withMarker(url) {
    try {
      const u = new URL(String(url), location.origin);
      u.searchParams.set("marker", "true");
      return u.toString();
    } catch {
      const s = String(url || "");
      if (/[?&]marker=true(?:&|$)/.test(s)) return s;
      return s + (s.includes("?") ? "&" : "?") + "marker=true";
    }
  }

  async function actionCopyPermalink(ll, segIds) {
    if (!ll) { toast(T("Move the mouse over the map first.")); return; }
    const st = loadSettings();
    const base = buildPermalink(ll, segIds);
    await setClipboard(st.markerOnCopy ? withMarker(base) : base);
    toast(segIds && segIds.length ? T("Copied permalink (with segment)") : T("Copied permalink"));
    closeMenu();
  }

  function actionRefreshHere(ll, segIds) {
    if (!ll) { toast(T("Move the mouse over the map first.")); return; }
    const st = loadSettings();
    const base = buildPermalink(ll, segIds);
    const url = st.markerOnRefresh ? withMarker(base) : base;
    closeMenu();
    location.replace(url);
  }

  // Same permalink "Refresh here" builds, but opened in a new tab
  // instead of replacing the current one — for when the point of
  // interest is worth keeping the current editor view open alongside,
  // rather than navigating away from it.
  function actionOpenNewTab(ll, segIds) {
    if (!ll) { toast(T("Move the mouse over the map first.")); return; }
    const st = loadSettings();
    const base = buildPermalink(ll, segIds);
    const url = st.markerOnNewTab ? withMarker(base) : base;
    closeMenu();
    try { window.open(url, "_blank", "noopener,noreferrer"); } catch (err) { dlog("actionOpenNewTab failed", err); }
  }

  // Ported from "WME Right-click functions" (an existing, widely-used
  // context-menu addition) into this script's own radial menu. Uses
  // Google's documented Maps URL API (developers.google.com/maps/
  // documentation/urls/get-started) rather than the older, undocumented
  // /maps/@lat,lon,zoom form: the query-based URL both centers the map
  // AND drops a pin exactly where the person right-clicked, which is
  // what "show me this spot" actually means — a bare center-only URL
  // would leave them unsure whether they landed on the exact point.
  //
  // Plain window.open(), not GM_openInTab: this only ever runs inside a
  // synchronous radial-menu click handler — a genuine user gesture — so
  // browsers won't block it as a popup, and it avoids adding a grant for
  // something the standard API already covers.
  function actionOpenGoogleMaps(ll) {
    if (!ll || !Number.isFinite(ll.lat) || !Number.isFinite(ll.lon)) {
      toast(T("Move the mouse over the map first."));
      return;
    }
    const url = `https://www.google.com/maps/search/?api=1&query=${ll.lat.toFixed(6)},${ll.lon.toFixed(6)}`;
    closeMenu();
    try { window.open(url, "_blank", "noopener,noreferrer"); } catch (err) { dlog("actionOpenGoogleMaps failed", err); }
  }

  /* ------------------------------------------------------------------ *
   *  WME keyboard shortcuts (Z / Shift+T / I)
   * ------------------------------------------------------------------ */

  // Mirrors WazePT Atalhos: dispatch on `document` (not document.body),
  // blur whatever's focused first (WME ignores shortcuts while a field
  // has focus — including the radial button that was just clicked), and
  // fire keydown/keyup back to back with no artificial delay.
  function dispatchWmeKey(letter, { shift = false, alt = false, ctrl = false } = {}) {
    const upper = String(letter || "").toUpperCase();
    const opts = {
      key: shift ? upper : letter.toLowerCase(),
      code: `Key${upper}`,
      keyCode: upper.charCodeAt(0),
      which: upper.charCodeAt(0),
      shiftKey: shift,
      altKey: alt,
      ctrlKey: ctrl,
      bubbles: true,
      cancelable: true,
      composed: true,
    };

    const active = document.activeElement;
    if (active && active !== document.body && typeof active.blur === "function") active.blur();

    document.dispatchEvent(new KeyboardEvent("keydown", opts));
    document.dispatchEvent(new KeyboardEvent("keyup", opts));
  }

  // Resolve the actual element OpenLayers listens on for map interaction.
  // elementFromPoint() can return a marker/overlay/canvas sub-node that
  // never bubbles into OL's own Events system, so prefer the viewport
  // OpenLayers itself exposes and fall back to elementFromPoint only if
  // that isn't available.
  function getOlViewportEl() {
    try {
      const map = getOlMap();
      if (map) {
        if (map.viewPortDiv) return map.viewPortDiv;
        if (map.div) return map.div;
      }
    } catch {}
    return null;
  }

  const DEBUG_KEY = `${SCRIPT_ID}:debug:v1`;
  function isDebugOn() {
    try { return localStorage.getItem(DEBUG_KEY) === "1"; } catch { return false; }
  }
  function setDebugOn(v) {
    try { localStorage.setItem(DEBUG_KEY, v ? "1" : "0"); } catch {}
  }

  // The debug log is persisted (not just kept in memory) and gated
  // entirely on the "Debugging mode" toggle: nothing is recorded here
  // unless isDebugOn() is true at the moment dlog() is called. That's a
  // deliberate opt-in — a WME session generates a LOT of internal
  // activity, most of it never worth writing to disk for the vast
  // majority of people who never touch this setting.
  //
  // Persisting to localStorage (rather than an in-memory array) matters
  // because a WME session spans many page loads — switching areas,
  // editing, reloading after a save conflict — and an in-memory buffer
  // would lose everything on each one. Someone chasing an intermittent
  // bug needs the log to survive that.
  //
  // Retention is TIME-based (last hour), not count-based: a count cap
  // bears no relation to how long debug mode has actually been left on,
  // which is the thing that needs bounding — someone forgetting they
  // left it on for a while should still end up with a small file, not
  // one that silently stopped growing at some arbitrary entry count
  // while still covering hours of history.
  const DEBUG_LOG_KEY = `${SCRIPT_ID}:debugLog:v1`;
  const DEBUG_LOG_RETENTION_MS = 60 * 60 * 1000;

  let debugLogCache = null;

  function loadDebugLogRaw() {
    if (debugLogCache) return debugLogCache;
    try {
      const arr = JSON.parse(localStorage.getItem(DEBUG_LOG_KEY) || "[]");
      debugLogCache = Array.isArray(arr) ? arr : [];
    } catch {
      debugLogCache = [];
    }
    return debugLogCache;
  }

  // Entries are always appended in chronological order, so the first
  // one still within the retention window marks where every later entry
  // also is — a single scan from the front, not a full-array filter.
  function pruneDebugLog(arr) {
    const cutoff = Date.now() - DEBUG_LOG_RETENTION_MS;
    let i = 0;
    while (i < arr.length && arr[i].t < cutoff) i++;
    if (i > 0) arr.splice(0, i);
    return arr;
  }

  let debugLogWritePending = false;
  function scheduleDebugLogWrite() {
    // dlog() can fire many times per second during active editing, and
    // localStorage.setItem is synchronous I/O — writing on every single
    // call would add up fast. Coalescing a burst into one write every
    // 500ms costs nothing a bug report would ever notice.
    if (debugLogWritePending) return;
    debugLogWritePending = true;
    setTimeout(() => {
      debugLogWritePending = false;
      try { localStorage.setItem(DEBUG_LOG_KEY, JSON.stringify(debugLogCache)); } catch {}
    }, 500);
  }

  function appendDebugLog(msg) {
    const arr = loadDebugLogRaw();
    arr.push({ t: Date.now(), msg });
    pruneDebugLog(arr);
    scheduleDebugLogWrite();
  }

  // Used at export time: re-prunes against the CURRENT moment rather
  // than trusting whatever the last dlog() call happened to leave
  // behind, so an export always honours the retention boundary exactly —
  // including the case where debug mode was switched off a while ago
  // and nothing has touched the log since.
  function getRecentDebugLog() {
    const arr = loadDebugLogRaw();
    pruneDebugLog(arr);
    return arr.slice();
  }

  // Turns an arbitrary dlog() argument into a short, safe string:
  // - Error objects keep their message and stack (the single most useful
  //   thing a bug report can contain), not just "[object Error]".
  // - DOM elements are summarised as a CSS-selector-ish tag instead of
  //   serialising the whole subtree (which JSON.stringify can't do
  //   anyway — DOM nodes have circular parent/child references).
  // - A WeakSet-based replacer guards against any OTHER circular
  //   reference so a single bad argument can never throw and silently
  //   drop the whole log entry.
  // - Long results are truncated — this is a rolling debug log, not a
  //   full data dump; buildDiagnosticsPayload() below carries full
  //   settings/pins/storage separately.
  function safeStringifyArg(v) {
    if (typeof v === "string") return v;
    if (v === undefined) return "undefined";
    if (v === null) return "null";
    if (v instanceof Error) return `${v.name}: ${v.message}${v.stack ? `\n${v.stack}` : ""}`;
    try {
      const seen = new WeakSet();
      const json = JSON.stringify(v, (key, val) => {
        if (typeof Element !== "undefined" && val instanceof Element) {
          const cls = val.className ? `.${String(val.className).trim().split(/\s+/).join(".")}` : "";
          return `<${val.tagName.toLowerCase()}${val.id ? `#${val.id}` : ""}${cls}>`;
        }
        if (val && typeof val === "object") {
          if (seen.has(val)) return "[Circular]";
          seen.add(val);
        }
        return val;
      });
      if (json === undefined) return String(v);
      return json.length > 2000 ? `${json.slice(0, 2000)}…(truncated)` : json;
    } catch {
      try { return String(v); } catch { return "[unstringifiable]"; }
    }
  }

  function dlog(...args) {
    // Gated entirely on the toggle: "record when active" means nothing
    // is written here at all while it's off, not just that the console
    // mirror is silent. A tester turns this on, reproduces the problem,
    // then exports — no need to have had it on beforehand for there to
    // be anything worth sending.
    if (!isDebugOn()) return;
    try { appendDebugLog(args.map(safeStringifyArg).join(" ")); } catch {}
    console.log(`[${SCRIPT_NAME}]`, ...args);
  }

  // Captured passively — never preventDefault/stopPropagation, so this
  // changes nothing about how the browser handles the error itself
  // (still logged to the real console exactly as it always was). This
  // just ALSO records it into the same ring buffer, so an uncaught
  // exception that happens moments before a tester notices something's
  // wrong shows up in the diagnostics export without them having had to
  // reproduce it a second time with debug logging switched on first.
  //
  // Scoped to this window, so it will pick up errors from other scripts
  // sharing the page too — an acceptable tradeoff given the buffer is
  // capped and FIFO: only the last ~250 entries survive, which are
  // whatever led up to the moment the export button was actually
  // pressed, regardless of source.
  window.addEventListener("error", (ev) => {
    dlog("uncaught error:", ev?.message || "", ev?.filename ? `(${ev.filename}:${ev.lineno}:${ev.colno})` : "", ev?.error);
  });
  window.addEventListener("unhandledrejection", (ev) => {
    dlog("unhandled promise rejection:", ev?.reason);
  });

  function dispatchSyntheticClick(x, y) {
    const viewport = getOlViewportEl();
    const under = document.elementFromPoint(x, y);
    const mapEl = getMapContainerEl();
    // Prefer whatever's actually rendered at that pixel (so hover states,
    // cursors, etc. update correctly), but only if it's inside the OL
    // viewport — otherwise fall back to the viewport itself so the event
    // definitely reaches OpenLayers' handlers.
    const target =
      (under && viewport && (under === viewport || viewport.contains(under))) ? under :
      (viewport || under || mapEl);

    dlog("dispatchSyntheticClick", {
      x, y,
      hasViewport: !!viewport,
      viewportTag: viewport ? `${viewport.tagName}${viewport.id ? "#" + viewport.id : ""}${viewport.className ? "." + String(viewport.className).replace(/\s+/g, ".") : ""}` : null,
      underTag: under ? `${under.tagName}${under.id ? "#" + under.id : ""}` : null,
      targetTag: target ? `${target.tagName}${target.id ? "#" + target.id : ""}` : null,
      targetIsViewport: target === viewport,
    });

    if (!target) { dlog("no target found, aborting"); return false; }

    // Grunt of the earlier crash: this script runs in a sandboxed userscript
    // context, so the bare `window` identifier here can be a wrapper/proxy
    // rather than the real page Window — passing that as `view` fails the
    // browser's internal UIEventInit type check and the constructor throws
    // before dispatch, silently killing every synthetic event. Resolve the
    // real page window explicitly (unsafeWindow when granted, else the
    // target element's own ownerDocument.defaultView), and omit `view`
    // entirely if neither is available — it's optional on all these events.
    const realWindow = (typeof unsafeWindow !== "undefined" && unsafeWindow)
      || target.ownerDocument?.defaultView
      || null;

    const commonInit = {
      clientX: x, clientY: y, screenX: x, screenY: y,
      bubbles: true, cancelable: true, composed: true,
      ...(realWindow ? { view: realWindow } : {}),
    };

    const fireMouse = (type, extra) => {
      try {
        target.dispatchEvent(new MouseEvent(type, { ...commonInit, ...extra }));
        dlog(`fired MouseEvent ${type}`);
      } catch (e) {
        dlog(`MouseEvent ${type} threw with view set, retrying without view`, e);
        try {
          const { view, ...withoutView } = commonInit;
          target.dispatchEvent(new MouseEvent(type, { ...withoutView, ...extra }));
          dlog(`fired MouseEvent ${type} (no view)`);
        } catch (e2) { dlog(`MouseEvent ${type} threw again`, e2); }
      }
    };
    // Some of WME's newer interaction layers listen for Pointer Events
    // instead of (or in addition to) Mouse Events. Firing both covers
    // either implementation without knowing which one is in play.
    const firePointer = (type, extra) => {
      try {
        target.dispatchEvent(new PointerEvent(type, {
          ...commonInit, ...extra,
          pointerId: 1, pointerType: "mouse", isPrimary: true,
        }));
        dlog(`fired PointerEvent ${type}`);
      } catch (e) {
        dlog(`PointerEvent ${type} threw with view set, retrying without view`, e);
        try {
          const { view, ...withoutView } = commonInit;
          target.dispatchEvent(new PointerEvent(type, {
            ...withoutView, ...extra,
            pointerId: 1, pointerType: "mouse", isPrimary: true,
          }));
          dlog(`fired PointerEvent ${type} (no view)`);
        } catch (e2) { dlog(`PointerEvent ${type} threw again`, e2); }
      }
    };

    // Mirror a real left-click's event order and button/buttons state.
    // OpenLayers' handler distinguishes click vs. drag by watching the
    // down/up delta, so keep them at the same coordinates and fire them
    // as separate turns (not synchronously back-to-back) to look like a
    // genuine click rather than a drag-through.
    firePointer("pointerover", { button: -1, buttons: 0 });
    fireMouse("mouseover", { button: 0, buttons: 0 });
    firePointer("pointermove", { button: -1, buttons: 0 });
    fireMouse("mousemove", { button: 0, buttons: 0 });
    firePointer("pointerdown", { button: 0, buttons: 1 });
    fireMouse("mousedown", { button: 0, buttons: 1 });

    // From the operator's point of view the map itself is now "holding a
    // button" for however long we wait before the matching up-event:
    // OpenLayers' drag-pan handler arms on mousedown and starts panning
    // on the NEXT mousemove, without re-checking that a button is
    // genuinely still held — it trusts the down/up pairing, not the
    // live hardware state. A synthetic mousedown with no real button
    // behind it looks, to that handler, exactly like the start of a
    // drag: if the operator's actual cursor drifts even one pixel
    // before our synthetic mouseup lands, the map pans to follow it.
    // That's the "long press, map moves if I nudge the mouse" symptom.
    //
    // Trusted (real, hardware-originated) move events are intercepted
    // at the capture phase for the brief gap and stopped before they
    // reach OL at all — isTrusted is false for every event this script
    // dispatches itself, so this can't ever block our own sequence.
    const blockRealMove = (ev) => {
      if (!ev.isTrusted) return;
      ev.stopImmediatePropagation();
      ev.preventDefault();
    };
    document.addEventListener("mousemove", blockRealMove, true);
    document.addEventListener("pointermove", blockRealMove, true);

    // Idempotent — removeEventListener on an already-removed listener is
    // a harmless no-op — so this can safely run in addition to the
    // normal cleanup below without any "already removed" bookkeeping.
    let moveBlockCleared = false;
    const clearMoveBlock = () => {
      if (moveBlockCleared) return;
      moveBlockCleared = true;
      document.removeEventListener("mousemove", blockRealMove, true);
      document.removeEventListener("pointermove", blockRealMove, true);
    };
    // Hard upper bound: if the primary timeout below never runs at all —
    // the tab is torn down mid-flight, WME replaces the map DOM, anything
    // that stops this callback from firing — these listeners must not
    // outlive the click they were installed for. A user permanently
    // unable to move the map because of a leaked listener from a right-
    // click menu action would be a far worse bug than the one this is
    // fixing.
    setTimeout(clearMoveBlock, 1000);

    // The gap only ever existed so the down and up land on separate
    // event-loop turns — some of WME's interaction handlers merge a
    // same-tick down+up into a no-op rather than recognizing a click.
    // setTimeout(fn, 0) already guarantees a separate turn; the previous
    // 30ms bought nothing beyond that and just widened the window above
    // for no benefit. The move-blocking is the real fix — this is
    // belt-and-braces on top of it, not a replacement for it.
    setTimeout(() => {
      // finally, not just sequential calls: if any dispatch below ever
      // threw (fireMouse/firePointer already swallow their own errors,
      // but this is one more layer of insurance), skipping the listener
      // removal would leave every real mouse movement in WME silently
      // discarded for the rest of the session — a much worse bug than
      // the one this change fixes.
      try {
        firePointer("pointerup", { button: 0, buttons: 0 });
        fireMouse("mouseup", { button: 0, buttons: 0 });
        fireMouse("click", { button: 0, buttons: 0 });
        dlog("click sequence complete — check whether the bump/light actually appeared on the segment");
      } finally {
        clearMoveBlock();
      }
    }, 0);

    return true;
  }

  function runMapShortcut(letter, mods, label, clickAt) {
    closeMenu();
    dlog("runMapShortcut", { letter, mods, label, clickAt });
    // Let the menu actually finish tearing down (and focus settle) before
    // firing the shortcut, same as clicking a toolbar button would.
    requestAnimationFrame(() => {
      dispatchWmeKey(letter, mods);
      dlog("dispatched key", letter, mods);
      if (clickAt) {
        // Give WME a tick to actually arm the draw/point tool before the
        // click lands, otherwise the click can be swallowed as the plain
        // selection click that preceded the keypress. Some tools take a
        // render cycle to swap the map's interaction handler, so this is
        // deliberately longer than a single rAF.
        setTimeout(() => {
          const ok = dispatchSyntheticClick(clickAt.x, clickAt.y);
          // Honest status: we know the events were dispatched, we do NOT
          // know whether WME actually placed anything — there is no
          // reliable way to confirm that from outside WME's own code.
          if (label) toast(ok ? `${label} — ${T("click sent to map")}` : `${label} — ${T("armed (click target not found)")}`);
        }, 140);
      } else if (label) {
        toast(label);
      }
    });
  }

  /* ------------------------------------------------------------------ *
   *  Modal
   * ------------------------------------------------------------------ */

  // Persisted positions for draggable dialogs, keyed by the `posKey` a
  // caller passes to openModal(). Only dialogs that opt in are movable —
  // a one-line confirm box has nothing to gain from being draggable, and
  // a remembered position for it would just be clutter.
  const MODAL_POS_KEY = `${SCRIPT_ID}:modalPos:v1`;

  function loadModalPositions() {
    try {
      const raw = JSON.parse(localStorage.getItem(MODAL_POS_KEY) || "{}");
      return (raw && typeof raw === "object") ? raw : {};
    } catch { return {}; }
  }

  function saveModalPosition(key, pos) {
    if (!key) return;
    try {
      const all = loadModalPositions();
      if (pos) all[key] = pos; else delete all[key];
      localStorage.setItem(MODAL_POS_KEY, JSON.stringify(all));
    } catch {}
  }

  // Used by the "restore window placement" button in settings: forgets
  // every saved dialog position so the next open re-centres.
  function resetModalPositions() {
    try { localStorage.removeItem(MODAL_POS_KEY); } catch {}
  }

  // Turns a modal into a window that can be dragged by its header and
  // remembers where it was dropped. Positions are always clamped back
  // into the current viewport on restore, so a dialog saved on a large
  // monitor can't come back off-screen on a laptop — that, plus the
  // explicit reset button in settings, is why "lost window" isn't a state
  // the user can get stuck in.
  function enableModalDrag(modal, hdr, posKey) {
    modal.classList.add("draggable");

    const clampToViewport = (left, top) => {
      const r = modal.getBoundingClientRect();
      const vw = window.innerWidth || document.documentElement.clientWidth;
      const vh = window.innerHeight || document.documentElement.clientHeight;
      return {
        left: Math.round(clamp(left, 8, Math.max(8, vw - r.width - 8))),
        // Bottom bound uses a fixed 44px rather than the dialog height:
        // a tall dialog should still be draggable down far enough to see
        // its lower half, as long as the header stays grabbable.
        top: Math.round(clamp(top, 8, Math.max(8, vh - 44))),
      };
    };

    const place = (left, top) => {
      const p = clampToViewport(left, top);
      modal.classList.add("positioned");
      modal.style.left = `${p.left}px`;
      modal.style.top = `${p.top}px`;
      return p;
    };

    const saved = loadModalPositions()[posKey];
    if (saved && Number.isFinite(saved.left) && Number.isFinite(saved.top)) {
      place(saved.left, saved.top);
    }

    let drag = null;
    hdr.addEventListener("pointerdown", (ev) => {
      if (ev.target?.closest?.(".wmeRcModalX")) return;
      if (ev.button != null && ev.button !== 0) return;
      const r = modal.getBoundingClientRect();
      drag = { id: ev.pointerId, x: ev.clientX, y: ev.clientY, left: r.left, top: r.top, active: false };

      const move = (e) => {
        if (!drag || (drag.id != null && e.pointerId !== drag.id)) return;
        if (!drag.active) {
          // Same 4px threshold the pins panel uses: below it this is a
          // click on the header, not a drag, and shouldn't preventDefault.
          if (Math.abs(e.clientX - drag.x) <= 4 && Math.abs(e.clientY - drag.y) <= 4) return;
          drag.active = true;
          try { hdr.setPointerCapture(drag.id); } catch {}
        }
        e.preventDefault();
        place(drag.left + (e.clientX - drag.x), drag.top + (e.clientY - drag.y));
      };
      // Detach unconditionally, before any pointerId guard — a stray
      // pointerup that doesn't match must not leave these three listeners
      // bound to the document for the rest of the session.
      const detach = () => {
        document.removeEventListener("pointermove", move, true);
        document.removeEventListener("pointerup", up, true);
        document.removeEventListener("pointercancel", up, true);
      };
      const up = (e) => {
        if (drag && drag.id != null && e.pointerId !== drag.id) return;
        if (drag && drag.active) {
          const r2 = modal.getBoundingClientRect();
          saveModalPosition(posKey, { left: Math.round(r2.left), top: Math.round(r2.top) });
          try { hdr.releasePointerCapture(drag.id); } catch {}
        }
        drag = null;
        detach();
      };
      document.addEventListener("pointermove", move, true);
      document.addEventListener("pointerup", up, true);
      document.addEventListener("pointercancel", up, true);
    });
  }

  function openModal({ title, icon, build, onClose, posKey = null }) {
    ensureCss();
    closeMenu();

    const backdrop = document.createElement("div");
    backdrop.className = "wmeRcModalBackdrop";

    const modal = document.createElement("div");
    modal.className = "wmeRcModal" + (isLightTheme() ? " theme-light" : "");

    const hdr = document.createElement("div");
    hdr.className = "wmeRcModalHdr";
    hdr.innerHTML = `<div class="wmeRcModalHdrIco">${icon || ICONS.pin}<span>${title || ""}</span></div>
                     <div class="wmeRcModalX">${ICONS.close}</div>`;

    const body = document.createElement("div");
    body.className = "wmeRcModalBody wmeRcScroll";

    modal.appendChild(hdr);
    modal.appendChild(body);

    let onKey = null;
    // Guards against onClose firing more than once — e.g. a caller's own
    // button handler calls close() directly, and then the backdrop's own
    // click listener (bubbling from the same click) would otherwise call
    // it a second time.
    let closed = false;
    const close = () => {
      if (closed) return;
      closed = true;
      try { document.removeEventListener("keydown", onKey, true); } catch {}
      backdrop.classList.remove("show");
      modal.classList.remove("show");
      setTimeout(() => { backdrop.remove(); modal.remove(); }, 150);
      try { onClose?.(); } catch {}
    };

    hdr.querySelector(".wmeRcModalX").addEventListener("click", close);
    backdrop.addEventListener("click", close);

    (document.body || document.documentElement).appendChild(backdrop);
    (document.body || document.documentElement).appendChild(modal);

    if (typeof build === "function") build({ body, close, modal });

    if (posKey) enableModalDrag(modal, hdr, posKey);

    requestAnimationFrame(() => {
      backdrop.classList.add("show");
      modal.classList.add("show");
    });

    onKey = (ev) => {
      if (!ev) return;
      if (ev.key === "Escape") { ev.preventDefault(); ev.stopPropagation(); close(); return; }
      if (ev.key === "Enter" && String(ev.target?.tagName || "").toLowerCase() !== "textarea") {
        const btn = modal.querySelector(".wmeRcBtn.primary");
        if (btn) { ev.preventDefault(); ev.stopPropagation(); btn.click(); }
      }
    };
    document.addEventListener("keydown", onKey, true);

    return { close };
  }

  // A reusable "are you sure" style dialog built on top of openModal.
  // Resolves true if the primary (confirm) button is clicked, false if the
  // dialog is dismissed any other way (X, backdrop click, Escape, or the
  // secondary button). Used for the shared-pin disclaimer on submit and
  // the shared-pin delete warning — both need a real decision from the
  // user rather than a toast that's easy to miss or click past by habit.
  function showConfirmModal({ title, icon, message, confirmLabel, cancelLabel, danger = false }) {
    return new Promise((resolve) => {
      let settled = false;
      const settle = (val) => {
        if (settled) return;
        settled = true;
        resolve(val);
      };

      openModal({
        title,
        icon,
        // Catches every dismissal path that isn't the confirm/cancel
        // buttons below (the header X, clicking the backdrop, Escape).
        // settle() is a no-op if a button already resolved the promise,
        // so this can't override a real "confirm" click that happens to
        // also trigger the modal's own close().
        onClose: () => settle(false),
        build: ({ body, close: closeModal }) => {
          const msg = document.createElement("div");
          msg.className = "wmeRcHint";
          msg.style.fontSize = "13px";
          msg.style.lineHeight = "1.5";
          msg.style.opacity = "0.92";
          msg.style.whiteSpace = "pre-line";
          msg.textContent = message;
          body.appendChild(msg);

          const actions = document.createElement("div");
          actions.className = "wmeRcActions";

          const cancelBtn = document.createElement("div");
          cancelBtn.className = "wmeRcBtn";
          cancelBtn.textContent = cancelLabel || T("Cancel");
          cancelBtn.addEventListener("click", () => { settle(false); closeModal(); });

          const confirmBtn = document.createElement("div");
          confirmBtn.className = "wmeRcBtn primary" + (danger ? " danger" : "");
          confirmBtn.textContent = confirmLabel || T("Set reminder");
          confirmBtn.addEventListener("click", () => { settle(true); closeModal(); });

          actions.appendChild(cancelBtn);
          actions.appendChild(confirmBtn);
          body.appendChild(actions);
        },
      });
    });
  }

  /* ------------------------------------------------------------------ *
   *  Pins: storage
   * ------------------------------------------------------------------ */

  const PIN_COLORS = ["#ff8a00", "#ff3b30", "#007aff", "#34c759", "#ffd60a", "#af52de"];

  function normalizeColor(c) {
    const s = String(c || "").trim();
    return /^#[0-9a-f]{6}$/i.test(s) ? s.toLowerCase() : "#ff8a00";
  }

  // loadPins() is called from hot paths — twice per renderPinsPanel (once
  // directly, once via loadAllPins), and once every 1.5s from the reminder
  // sweep for the whole session — and each call used to JSON.parse the
  // whole array and rebuild every pin object. Cached on the raw stored
  // string, exactly like loadSettings() above: the cheap getItem() still
  // runs every call, so a write from another tab is picked up, but only a
  // genuine change re-parses.
  //
  // The returned ARRAY is a copy, because callers do
  // `const pins = loadPins(); pins.push(x); savePins(pins)` and would
  // otherwise mutate the cache in place. The pin OBJECTS inside are
  // shared, which is safe only because nothing mutates a pin object in
  // place — updatePin() replaces it with a spread copy. Keep it that way.
  let pinsCacheRaw = null;
  let pinsCacheVal = null;

  function parsePins(raw) {
    try {
      const arr = JSON.parse(raw || "[]");
      if (!Array.isArray(arr)) return [];
      return arr
        .filter((p) => p && Number.isFinite(Number(p.lon)) && Number.isFinite(Number(p.lat)))
        .map((p) => {
          const reminderAt = Number.isFinite(Number(p.reminderAt)) ? Number(p.reminderAt) : null;
          const repeatEvery = Number.isFinite(Number(p.repeatEvery)) ? Number(p.repeatEvery) : 0;
          const repeatUnit = (p.repeatUnit === "hours" || p.repeatUnit === "days" || p.repeatUnit === "weeks")
            ? p.repeatUnit : "days";
          return {
            id: String(p.id || ""),
            name: String(p.name || "Pinned place"),
            lon: Number(p.lon),
            lat: Number(p.lat),
            zoom: Number.isFinite(Number(p.zoom)) ? Number(p.zoom) : null,
            color: normalizeColor(p.color),
            createdAt: Number(p.createdAt) || Date.now(),
            reminderAt,
            reminderDone: reminderAt ? !!p.reminderDone : false,
            reminderNote: typeof p.reminderNote === "string" ? p.reminderNote : "",
            repeatEvery,
            repeatUnit,
          };
        })
        .filter((p) => p.id);
    } catch {
      return [];
    }
  }

  function loadPins() {
    try {
      const raw = localStorage.getItem(PIN_KEY);
      if (raw !== pinsCacheRaw || !pinsCacheVal) {
        pinsCacheRaw = raw;
        pinsCacheVal = parsePins(raw);
      }
      return pinsCacheVal.slice();
    } catch {
      return [];
    }
  }

  function savePins(pins) {
    try { localStorage.setItem(PIN_KEY, JSON.stringify(pins || [])); } catch {}
    // Drop the cache so the renders below re-read the value just written,
    // rather than relying on the raw-string comparison alone (which would
    // also work, but only because the serialised text happens to differ —
    // an explicit invalidation is what makes that not a coincidence).
    pinsCacheRaw = null;
    pinsCacheVal = null;
    renderPinsPanel();
    renderPinMarkers();
  }

  function addPin(pin) {
    const pins = loadPins();
    pins.push(pin);
    savePins(pins);
  }

  function updatePin(id, patch) {
    const pins = loadPins();
    const i = pins.findIndex((p) => p.id === String(id));
    if (i < 0) return;
    pins[i] = { ...pins[i], ...patch };
    savePins(pins);
    const updated = pins[i];
    if (Object.prototype.hasOwnProperty.call(patch, "reminderAt") || patch.reminderDone === false) {
      firedReminderIds.delete(String(id));
    }
    if (updated.reminderAt && !updated.reminderDone) scheduleReminderTimer(updated);
    else clearReminderTimer(id);
  }

  function removePin(id) {
    clearReminderTimer(id);
    savePins(loadPins().filter((p) => p.id !== String(id)));
  }

  function nextPinNumber(pins) {
    let max = 0;
    for (const p of pins || []) {
      const m = /^Pin\s*#\s*(\d+)/i.exec(String(p.name || ""));
      if (m) max = Math.max(max, Number(m[1]) || 0);
    }
    return max + 1;
  }

  /* ------------------------------------------------------------------ *
   *  Shared pins (Firebase Realtime Database, REST API)
   * ------------------------------------------------------------------ */

  let sharedPinsCache = [];
  let sharedPinsLoading = false;
  let sharedPinsLastError = null;

  function normalizeSharedPin(id, p) {
    if (!p || !Number.isFinite(Number(p.lon)) || !Number.isFinite(Number(p.lat))) return null;
    return {
      id: String(id),
      name: String(p.name || "Pinned place").slice(0, 60),
      lon: Number(p.lon),
      lat: Number(p.lat),
      zoom: Number.isFinite(Number(p.zoom)) ? Number(p.zoom) : null,
      color: normalizeColor(p.color),
      createdAt: Number(p.createdAt) || Date.now(),
      createdBy: typeof p.createdBy === "string" ? p.createdBy.slice(0, 60) : "",
      createdByUid: typeof p.createdByUid === "string" ? p.createdByUid : "",
      expiresAt: Number.isFinite(Number(p.expiresAt)) ? Number(p.expiresAt) : null,
      // 0 (or missing/invalid) means "no lock" — anyone who meets the
      // ordinary MIN_EDIT_RANK_LEVEL can edit/delete, same as before this
      // feature existed. A positive value is the minimum editor level
      // (Waze's 1-6 UI numbering, same convention as MIN_EDIT_RANK_LEVEL
      // and segment lockRank) the creator chose when sharing the pin.
      //
      // ⚠️ This is enforced CLIENT-SIDE only, in this script. Someone who
      // edits their own copy of the script, or calls the Firebase REST
      // API directly, can bypass it — this stops accidental/casual
      // deletes by editors who shouldn't touch a locked pin, not a
      // determined bad actor. Real enforcement needs a matching Firebase
      // Realtime Database security rule on this field, which is
      // configured in the Firebase console, outside this script.
      lockLevel: Number.isFinite(Number(p.lockLevel)) && Number(p.lockLevel) > 0
        ? Math.round(Number(p.lockLevel))
        : 0,
      // True only for a pin still sitting in the offline queue, waiting
      // for a retry to reach Firebase. A pin normalized from data that
      // actually came back from a fetch is real and synced by definition
      // — this flag is never trusted from the server's own JSON, only
      // set explicitly by the queue code that creates the local stand-in.
      syncing: p.__isQueuedStandIn === true,
      shared: true,
    };
  }

  function isSharedPinExpired(pin) {
    return !!(pin && pin.expiresAt && pin.expiresAt <= Date.now());
  }

  function loadSharedPinsCache() {
    try {
      const arr = JSON.parse(localStorage.getItem(SHARED_PIN_CACHE_KEY) || "[]");
      return Array.isArray(arr) ? arr : [];
    } catch { return []; }
  }

  function saveSharedPinsCache(pins) {
    try { localStorage.setItem(SHARED_PIN_CACHE_KEY, JSON.stringify(pins || [])); } catch {}
  }

  /* ------------------------------------------------------------------ *
   *  Offline queue for "Para todos" pins
   * ------------------------------------------------------------------ *
   * If saving a shared pin fails because the connection to Firebase
   * itself is down (as opposed to Firebase reachably saying no), the pin
   * is kept locally with a temporary id, shown immediately with a
   * "syncing" indicator, and retried automatically every 60s until it
   * actually reaches the server — at which point the temporary local
   * entry is replaced by the real one Firebase assigns.
   *
   * Deliberately NOT queued: an auth/permission failure that survives
   * addSharedPin's own 401/403 retry. That's Firebase reachably saying
   * "no", not "can't reach you" — queuing and silently retrying a request
   * that will keep failing for the same reason forever would just hide a
   * real problem behind a permanently-spinning icon.
   */
  const SHARED_PIN_QUEUE_KEY = `${SCRIPT_ID}:sharedPinsQueue:v1`;

  function loadSharedPinQueue() {
    try {
      const arr = JSON.parse(localStorage.getItem(SHARED_PIN_QUEUE_KEY) || "[]");
      return Array.isArray(arr) ? arr : [];
    } catch { return []; }
  }

  function saveSharedPinQueue(queue) {
    try { localStorage.setItem(SHARED_PIN_QUEUE_KEY, JSON.stringify(queue || [])); } catch {}
  }

  // A queue entry keeps its OWN payload (independent from sharedPinsCache)
  // because the cache is meant to mirror Firebase and gets overwritten
  // wholesale on every fetch — a queued-but-unsent pin has no server
  // record yet, so it would vanish the moment fetchSharedPins() next runs
  // if it only lived in the cache. It's kept in both places at once: the
  // queue is the durable source of truth for "still needs to be sent",
  // and a matching stand-in in sharedPinsCache is what actually makes it
  // visible in the panel and on the map right now.
  function queueSharedPin(payload) {
    const localId = `pending-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const queue = loadSharedPinQueue();
    queue.push({ localId, payload, queuedAt: Date.now(), attempts: 0 });
    saveSharedPinQueue(queue);

    const standIn = normalizeSharedPin(localId, { ...payload, __isQueuedStandIn: true });
    if (standIn) {
      sharedPinsCache = [...sharedPinsCache, standIn];
      saveSharedPinsCache(sharedPinsCache);
      renderPinsPanel();
      renderPinMarkers();
    }
    startSharedPinQueueLoop();
    return standIn;
  }

  // Removes a queue entry and its local stand-in — used both when a
  // retry finally succeeds (replaced by the real Firebase pin) and if a
  // queued pin ever needs to be discarded outright.
  function removeSharedPinFromQueue(localId) {
    saveSharedPinQueue(loadSharedPinQueue().filter((q) => q.localId !== localId));
    sharedPinsCache = sharedPinsCache.filter((p) => p.id !== localId);
    saveSharedPinsCache(sharedPinsCache);
  }

  // Attempts to actually send one queued pin. Reuses sendSharedPinPayload
  // (the same POST logic addSharedPin itself calls) rather than a second,
  // divergent implementation of "how to save a shared pin".
  async function trySendQueuedPin(entry) {
    const result = await sendSharedPinPayload(entry.payload);
    if (result.ok) {
      // result.payload is set when the 401-retry path inside
      // sendSharedPinPayload succeeded with a rotated session (fresh
      // createdByUid) — using entry.payload here would silently save the
      // pin under the OLD, now-invalid uid instead of the one that
      // actually got accepted.
      const saved = normalizeSharedPin(result.id, result.payload || entry.payload);
      removeSharedPinFromQueue(entry.localId);
      if (saved) {
        sharedPinsCache = [...sharedPinsCache, saved];
        saveSharedPinsCache(sharedPinsCache);
        renderPinsPanel();
        renderPinMarkers();
      }
      return true;
    }
    if (result.fatal) {
      // Same reasoning as addSharedPin's own non-retry cases: a real
      // permission/auth failure isn't something waiting another minute
      // will fix, so stop pretending it's still "syncing" and surface it
      // instead of queuing forever.
      removeSharedPinFromQueue(entry.localId);
      toast(`${T("Could not save a queued pin")}: ${entry.payload.name}`);
      return false;
    }
    // Still just offline — leave it queued for the next tick.
    entry.attempts = (entry.attempts || 0) + 1;
    const queue = loadSharedPinQueue();
    const idx = queue.findIndex((q) => q.localId === entry.localId);
    if (idx >= 0) { queue[idx] = entry; saveSharedPinQueue(queue); }
    return false;
  }

  let sharedPinQueueTimer = null;
  // Guards against two flushes overlapping. The callback is async and a
  // slow/hanging request can outlive the 60s interval, at which point the
  // next tick would load the SAME queue entries and POST them a second
  // time — creating duplicate shared pins for everyone, with no way to
  // tell them apart afterwards.
  let sharedPinQueueFlushing = false;

  function startSharedPinQueueLoop() {
    if (sharedPinQueueTimer) return;
    sharedPinQueueTimer = setInterval(async () => {
      if (sharedPinQueueFlushing) return;
      const queue = loadSharedPinQueue();
      if (!queue.length) {
        clearInterval(sharedPinQueueTimer);
        sharedPinQueueTimer = null;
        return;
      }
      sharedPinQueueFlushing = true;
      try {
        for (const entry of queue) {
          await trySendQueuedPin(entry);
        }
      } finally {
        sharedPinQueueFlushing = false;
      }
    }, 60000);
  }

  /* ------------------------------------------------------------------ *
   *  "Novo" tag — tracks which shared pins this browser has already
   *  shown to the user, so newly-created community pins can be flagged
   *  until they've actually been seen.
   * ------------------------------------------------------------------ */

  function loadSeenSharedPinIds() {
    try {
      const arr = JSON.parse(localStorage.getItem(SEEN_SHARED_PIN_IDS_KEY) || "[]");
      return new Set(Array.isArray(arr) ? arr.map(String) : []);
    } catch {
      return new Set();
    }
  }

  function saveSeenSharedPinIds(set) {
    try { localStorage.setItem(SEEN_SHARED_PIN_IDS_KEY, JSON.stringify(Array.from(set))); } catch {}
  }

  // Marks the given pin ids as seen, merging with whatever was already
  // recorded (never removes an id, since a pin can only go from "new" to
  // "seen", never back).
  function markSharedPinsSeen(ids) {
    if (!ids || !ids.length) return;
    const seen = loadSeenSharedPinIds();
    let changed = false;
    for (const id of ids) {
      const key = String(id);
      if (!seen.has(key)) { seen.add(key); changed = true; }
    }
    if (changed) saveSeenSharedPinIds(seen);
  }

  // Without this, everyone updating to a version of the script that has
  // the "Novo" tag would suddenly see every pre-existing community pin
  // flagged as new — noise, not signal, since none of them are actually
  // new arrivals. The first time this feature ever runs on a browser, it
  // silently seeds the seen-set from whatever shared pins already exist
  // (no tags shown for this one pass), and only pins that show up in a
  // fetch *after* that baseline are ever treated as new.
  function ensureSeenPinsBootstrapped(currentSharedPins) {
    let done = false;
    try { done = localStorage.getItem(SEEN_PINS_BOOTSTRAPPED_KEY) === "1"; } catch {}
    if (done) return;
    // An empty snapshot (e.g. this browser's very first load, before any
    // fetch has ever completed) is not a real baseline — bootstrapping
    // against zero pins and then setting the "done" flag would mean the
    // actual first successful fetch, whenever it happens, treats every
    // pin it finds as newly arrived. Wait for a fetch that actually
    // returned something before locking in the baseline.
    if (!currentSharedPins || !currentSharedPins.length) return;
    markSharedPinsSeen(currentSharedPins.map((p) => p.id));
    try { localStorage.setItem(SEEN_PINS_BOOTSTRAPPED_KEY, "1"); } catch {}
  }

  // Populate from whatever we last saw (instant, works offline) while a
  // fresh fetch happens in the background.
  sharedPinsCache = loadSharedPinsCache();
  ensureSeenPinsBootstrapped(sharedPinsCache);

  async function fetchSharedPins({ silent = false } = {}) {
    // An editor not on the allowlist never reads the shared database at
    // all — not just "doesn't see it in the UI". Silent no-op rather
    // than a toast: this runs on background timers/focus events, not
    // just explicit user clicks, and a disallowed editor already got
    // the explanation from wherever they tried to trigger this.
    if (!isEditorAllowed()) return;
    sharedPinsLoading = true;
    sharedPinsLastError = null;
    try {
      // Reads don't require auth at all (.read is unconditionally true),
      // so unlike the write paths below, falling back to the plain
      // unauthenticated URL here is genuinely fine — not the same silent
      // failure mode as sending an unauthenticated write and having it
      // rejected.
      const url = (await authedFirebaseUrl(SHARED_PINS_PATH)) || firebaseUrl(SHARED_PINS_PATH);
      const res = await gmFetch(url, { method: "GET" });
      dlog("fetchSharedPins response", { status: res.status, ok: res.ok, url: res.url });
      if (!res.ok) {
        let bodyText = "";
        try { bodyText = await res.text(); } catch {}
        dlog("fetchSharedPins error body", bodyText);
        throw new Error(`HTTP ${res.status}${bodyText ? `: ${bodyText}` : ""}`);
      }
      const data = await res.json();
      const out = [];
      if (data && typeof data === "object") {
        for (const [id, p] of Object.entries(data)) {
          const norm = normalizeSharedPin(id, p);
          if (norm) out.push(norm);
        }
      }
      // No-op after the very first time this ever runs on a browser (see
      // ensureSeenPinsBootstrapped's own comment) — safe to call on every
      // fetch rather than trying to track "is this truly the first fetch"
      // separately.
      ensureSeenPinsBootstrapped(out);
      // Anything past its own expiresAt is dropped from what we display
      // and cache immediately, with a best-effort (fire-and-forget)
      // delete request sent for each.
      const active = reapExpiredSharedPins(out);
      // Queued-but-unsent pins don't exist on the server yet, so they
      // never come back in `out` — without re-adding their local stand-
      // ins here, this fetch would silently erase them from the cache
      // the moment it runs, even though they're still waiting to sync.
      const queuedIds = new Set(loadSharedPinQueue().map((q) => q.localId));
      const stillQueuedStandIns = sharedPinsCache.filter((p) => queuedIds.has(p.id));
      sharedPinsCache = [...active, ...stillQueuedStandIns];
      saveSharedPinsCache(sharedPinsCache);
      renderPinsPanel();
      renderPinMarkers();
      if (!silent) toast(T("Shared pins updated"));
      return sharedPinsCache;
    } catch (err) {
      console.error(`[${SCRIPT_NAME}] fetchSharedPins failed:`, err);
      sharedPinsLastError = err;
      if (!silent) toast(T("Could not reach the shared pins database"));
      return sharedPinsCache;
    } finally {
      sharedPinsLoading = false;
    }
  }

  // Low-level "actually try to POST this pin" step, shared by addSharedPin
  // (the interactive path) and trySendQueuedPin (the background retry
  // path) so there's exactly one implementation of "how a shared pin gets
  // sent", not two that could quietly drift apart.
  //
  // Returns one of:
  //   { ok: true, id }                — saved, id is Firebase's assigned key
  //   { ok: false, offline: true }    — couldn't reach the server at all;
  //                                     safe to queue and retry later
  //   { ok: false, fatal: true, ... } — server reachable and said no for a
  //                                     reason retrying won't fix
  async function sendSharedPinPayload(payload) {
    let url;
    try {
      url = await authedFirebaseUrl(SHARED_PINS_PATH);
    } catch (err) {
      dlog("sendSharedPinPayload: authedFirebaseUrl threw", err);
      return { ok: false, offline: true };
    }
    if (!url) return { ok: false, fatal: true, message: T("Could not sign in to the shared pins database") };

    let res;
    try {
      res = await gmFetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      // gmFetch's onerror/ontimeout reject the promise — this is the
      // actual "couldn't reach Firebase" case (network down, DNS failure,
      // request timed out), as opposed to a response that came back but
      // said no. That distinction is exactly what decides queue-and-retry
      // vs. surface-the-error.
      dlog("sendSharedPinPayload: gmFetch rejected (offline)", err);
      return { ok: false, offline: true };
    }

    dlog("sendSharedPinPayload response", { status: res.status, ok: res.ok, url: res.url });
    if (!res.ok) {
      let bodyText = "";
      try { bodyText = await res.text(); } catch {}
      dlog("sendSharedPinPayload error body", bodyText);

      if (res.status === 401 || res.status === 403) {
        // The session looked fine going in but Firebase rejected it
        // anyway — wipe it and retry exactly once with a fresh sign-up
        // before concluding this is a real, non-retryable failure.
        dlog("sendSharedPinPayload got 401/403, invalidating session and retrying once");
        invalidateAuthSession();
        const retrySession = await ensureAuthSession().catch(() => null);
        if (retrySession) {
          const retryPayload = { ...payload, createdByUid: retrySession.localId };
          let retryRes;
          try {
            const retryUrl = `${firebaseUrl(SHARED_PINS_PATH)}?auth=${encodeURIComponent(retrySession.idToken)}`;
            retryRes = await gmFetch(retryUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(retryPayload),
            });
          } catch (err) {
            dlog("sendSharedPinPayload: retry gmFetch rejected (offline)", err);
            return { ok: false, offline: true };
          }
          dlog("sendSharedPinPayload retry response", { status: retryRes.status, ok: retryRes.ok });
          if (retryRes.ok) {
            const retryData = await retryRes.json();
            const retryId = retryData && retryData.name;
            if (retryId) return { ok: true, id: retryId, payload: retryPayload };
          }
        }
        // A real permission failure, not a connectivity one — nothing
        // about waiting a minute and trying again would change this.
        return { ok: false, fatal: true, message: `HTTP ${res.status}${bodyText ? `: ${bodyText}` : ""}` };
      }

      // Any other HTTP error (400 malformed payload, 5xx server-side
      // trouble, etc.) is treated as fatal too — only a genuine failure
      // to reach the server at all goes in the retry queue.
      return { ok: false, fatal: true, message: `HTTP ${res.status}${bodyText ? `: ${bodyText}` : ""}` };
    }

    const data = await res.json();
    dlog("sendSharedPinPayload response body", data);
    const id = data && data.name;
    if (!id) return { ok: false, fatal: true, message: "No id returned in response: " + JSON.stringify(data) };
    return { ok: true, id };
  }

  async function addSharedPin(pin) {
    if (!isEditorAllowed()) {
      toast(T("This feature is restricted to editors on the approved list."));
      return null;
    }
    if (!canEditOrDeletePins()) {
      toast(`${T("Requires Level")} ${MIN_EDIT_RANK_LEVEL} ${T("or above")}`);
      return null;
    }

    const session = await ensureAuthSession().catch((err) => {
      dlog("ensureAuthSession failed in addSharedPin", err);
      return null;
    });
    if (!session) {
      toast(T("Could not sign in to the shared pins database"));
      return null;
    }

    const payload = {
      name: pin.name,
      lon: pin.lon,
      lat: pin.lat,
      zoom: pin.zoom,
      color: pin.color,
      createdAt: pin.createdAt,
      createdBy: getEditorUsername() || "",
      createdByUid: session.localId,
      expiresAt: Number.isFinite(pin.expiresAt) ? pin.expiresAt : null,
      // 0 = no lock. See normalizeSharedPin's comment for the full
      // explanation and its client-side-only caveat.
      lockLevel: Number.isFinite(Number(pin.lockLevel)) && Number(pin.lockLevel) > 0
        ? Math.round(Number(pin.lockLevel))
        : 0,
    };

    const result = await sendSharedPinPayload(payload);

    if (result.ok) {
      const saved = normalizeSharedPin(result.id, result.payload || payload);
      if (saved) {
        sharedPinsCache = [...sharedPinsCache, saved];
        saveSharedPinsCache(sharedPinsCache);
        renderPinsPanel();
        renderPinMarkers();
      }
      return saved;
    }

    if (result.offline) {
      // Can't reach Firebase right now — save it anyway, locally, and let
      // the queue keep trying in the background rather than losing the
      // pin the user just spent time filling in.
      toast(T("No connection — the pin will be sent automatically once you're back online."));
      return queueSharedPin(payload);
    }

    console.error(`[${SCRIPT_NAME}] addSharedPin failed:`, result.message);
    toast(T("Could not save to the shared pins database"));
    return null;
  }

  async function removeSharedPin(id) {
    if (!isEditorAllowed()) {
      toast(T("This feature is restricted to editors on the approved list."));
      return false;
    }
    if (!canEditOrDeletePins()) {
      toast(`${T("Requires Level")} ${MIN_EDIT_RANK_LEVEL} ${T("or above")}`);
      return false;
    }
    // Baseline rank already cleared above, so a false result here can
    // only be the pin's OWN lock level — look up the specific number to
    // show, rather than repeating the generic baseline message.
    const lockedPin = sharedPinsCache.find((p) => p.id === String(id));
    if (lockedPin && !canEditOrDeleteSharedPin(lockedPin)) {
      toast(`${T("Requires Level")} ${lockedPin.lockLevel} ${T("or above")} ${T("(locked by creator)")}`);
      return false;
    }
    try {
      const url = await authedFirebaseUrl(`${SHARED_PINS_PATH}/${id}`);
      if (!url) {
        toast(T("Could not sign in to the shared pins database"));
        return false;
      }
      const res = await gmFetch(url, { method: "DELETE" });
      if (!res.ok) {
        let bodyText = "";
        try { bodyText = await res.text(); } catch {}
        dlog("removeSharedPin error body", bodyText);
        if (res.status === 401 || res.status === 403) {
          // Same recovery as addSharedPin: don't make the user reload the
          // whole page just to get a working session — clear whatever's
          // cached and retry once with a completely fresh sign-up before
          // giving up and calling it a real permission error.
          dlog("removeSharedPin got 401/403, invalidating session and retrying once");
          invalidateAuthSession();
          const retrySession = await ensureAuthSession().catch(() => null);
          if (retrySession) {
            const retryUrl = `${firebaseUrl(`${SHARED_PINS_PATH}/${id}`)}?auth=${encodeURIComponent(retrySession.idToken)}`;
            const retryRes = await gmFetch(retryUrl, { method: "DELETE" });
            if (retryRes.ok) {
              sharedPinsCache = sharedPinsCache.filter((p) => p.id !== String(id));
              saveSharedPinsCache(sharedPinsCache);
              renderPinsPanel();
              renderPinMarkers();
              return true;
            }
            // Previously silent — if the retry ALSO failed, nothing said
            // why, leaving diagnostics with no way to tell "still the
            // same stale token" apart from "a fresh identity that simply
            // doesn't own this pin" (see invalidateAuthSession's own
            // comment on that tradeoff).
            dlog("removeSharedPin retry also failed", { status: retryRes.status, localId: retrySession.localId });
          } else {
            dlog("removeSharedPin retry: ensureAuthSession() itself failed");
          }
          toast(T("Could not remove the shared pin (permission denied)"));
          return false;
        }
        throw new Error(`HTTP ${res.status}${bodyText ? `: ${bodyText}` : ""}`);
      }
      sharedPinsCache = sharedPinsCache.filter((p) => p.id !== String(id));
      saveSharedPinsCache(sharedPinsCache);
      renderPinsPanel();
      renderPinMarkers();
      return true;
    } catch (err) {
      console.error(`[${SCRIPT_NAME}] removeSharedPin failed:`, err);
      toast(T("Could not remove the shared pin (check your connection)"));
      return false;
    }
  }

  // Renames a shared pin in place. Uses PATCH rather than PUT so only the
  // name field is touched — a PUT would replace the whole record and drop
  // createdBy/createdByUid/expiresAt along with it. Gated on the same
  // editor rank as deletion: editing someone else's shared pin is the
  // same kind of act as removing it. A pin's own lock level (see
  // canEditOrDeleteSharedPin) applies here too — otherwise a lock on
  // deletion would be trivially pointless, since anyone could still
  // rename a locked pin to whatever they liked.
  async function renameSharedPin(id, name) {
    if (!isEditorAllowed()) {
      toast(T("This feature is restricted to editors on the approved list."));
      return false;
    }
    if (!canEditOrDeletePins()) {
      toast(`${T("Requires Level")} ${MIN_EDIT_RANK_LEVEL} ${T("or above")}`);
      return false;
    }
    const lockedPin = sharedPinsCache.find((p) => p.id === String(id));
    if (lockedPin && !canEditOrDeleteSharedPin(lockedPin)) {
      toast(`${T("Requires Level")} ${lockedPin.lockLevel} ${T("or above")} ${T("(locked by creator)")}`);
      return false;
    }
    const clean = String(name || "").trim().slice(0, 60);
    if (!clean) return false;

    const patch = async (url) => gmFetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: clean }),
    });

    const applyLocally = () => {
      sharedPinsCache = sharedPinsCache.map((p) => (p.id === String(id) ? { ...p, name: clean } : p));
      saveSharedPinsCache(sharedPinsCache);
      renderPinsPanel();
      renderPinMarkers();
    };

    try {
      const url = await authedFirebaseUrl(`${SHARED_PINS_PATH}/${id}`);
      if (!url) {
        toast(T("Could not sign in to the shared pins database"));
        return false;
      }
      const res = await patch(url);
      if (!res.ok) {
        let bodyText = "";
        try { bodyText = await res.text(); } catch {}
        dlog("renameSharedPin error body", bodyText);
        if (res.status === 401 || res.status === 403) {
          // Same one-shot recovery as addSharedPin/removeSharedPin: a
          // stale token shouldn't cost the user a page reload.
          dlog("renameSharedPin got 401/403, invalidating session and retrying once");
          invalidateAuthSession();
          const retrySession = await ensureAuthSession().catch(() => null);
          if (retrySession) {
            const retryUrl = `${firebaseUrl(`${SHARED_PINS_PATH}/${id}`)}?auth=${encodeURIComponent(retrySession.idToken)}`;
            const retryRes = await patch(retryUrl);
            if (retryRes.ok) { applyLocally(); return true; }
            dlog("renameSharedPin retry also failed", { status: retryRes.status, localId: retrySession.localId });
          } else {
            dlog("renameSharedPin retry: ensureAuthSession() itself failed");
          }
          toast(T("Could not rename the shared pin (permission denied)"));
          return false;
        }
        throw new Error(`HTTP ${res.status}${bodyText ? `: ${bodyText}` : ""}`);
      }
      applyLocally();
      return true;
    } catch (err) {
      console.error(`[${SCRIPT_NAME}] renameSharedPin failed:`, err);
      toast(T("Could not rename the shared pin (check your connection)"));
      return false;
    }
  }

  // Best-effort cleanup for a pin that's already past its own expiresAt.
  // Deliberately separate from removeSharedPin(): this is automatic
  // housekeeping any client happens to perform, not the viewer choosing
  // to delete someone's pin — no editor-rank gate, no confirmation, no
  // error toast on failure (another client will eventually clean it up,
  // and it's already hidden from this viewer's own display regardless).
  async function deleteExpiredSharedPin(id) {
    try {
      const url = await authedFirebaseUrl(`${SHARED_PINS_PATH}/${id}`);
      if (!url) { dlog("deleteExpiredSharedPin: no session, will retry on a future sweep"); return; }
      const res = await gmFetch(url, { method: "DELETE" });
      dlog("deleteExpiredSharedPin", { id, status: res.status, ok: res.ok });
    } catch (err) {
      dlog("deleteExpiredSharedPin failed (will retry on a future sweep)", err);
    }
  }

  // Splits pins into [stillActive, expired], firing off (but not
  // awaiting) a best-effort delete for each expired one. Callers should
  // use the active list for display/caching immediately — expiry is
  // reflected in the UI right away regardless of whether the underlying
  // database delete has actually completed yet.
  function reapExpiredSharedPins(pins) {
    const active = [];
    for (const pin of pins) {
      if (isSharedPinExpired(pin)) {
        deleteExpiredSharedPin(pin.id);
      } else {
        active.push(pin);
      }
    }
    return active;
  }

  let expirySweepTimer = null;

  // Runs entirely against the already-cached shared pins — no network
  // call — so an expiry date is honored even between fetches. Checking
  // every couple of minutes is plenty of precision for a date-granularity
  // feature — this isn't the reminder subsystem's 1.5s loop, which needs
  // to catch to-the-minute user-set times instead.
  function checkSharedPinExpiryNow() {
    if (!sharedPinsCache.length) return;
    const stillActive = reapExpiredSharedPins(sharedPinsCache);
    if (stillActive.length !== sharedPinsCache.length) {
      sharedPinsCache = stillActive;
      saveSharedPinsCache(stillActive);
      renderPinsPanel();
      renderPinMarkers();
    }
  }

  function startExpirySweepLoop() {
    if (expirySweepTimer) return;
    expirySweepTimer = setInterval(checkSharedPinExpiryNow, 120000);
    checkSharedPinExpiryNow();
  }

  let sharedPinsAutoRefreshTimer = null;

  // Unlike checkSharedPinExpiryNow above, this actually talks to Firebase
  // — it's how pins another editor added or removed show up here without
  // needing a manual refresh click or a tab focus/visibility change to
  // trigger one. Always silent (no "Shared pins updated" toast) since a
  // once-a-minute background refresh popping up a toast would get
  // annoying fast; the panel simply updates itself when there's a change,
  // same as any other background sync.
  function startSharedPinsAutoRefreshLoop() {
    if (sharedPinsAutoRefreshTimer) return;
    sharedPinsAutoRefreshTimer = setInterval(() => {
      if (sharedPinsLoading) return; // a manual refresh or another trigger is already in flight
      fetchSharedPins({ silent: true });
    }, 60000);
  }

  // Local + shared pins together, for anything that needs to render or
  // hit-test "all pins currently on the map" (the marker layer, map
  // click-to-jump, etc). Reminders only ever apply to local pins.
  function loadAllPins() {
    return [...loadPins(), ...sharedPinsCache];
  }

  /* ------------------------------------------------------------------ *
   *  Pins: map markers
   * ------------------------------------------------------------------ */

  // Rough average glyph width for the pin-label font at 13px, used to size
  // the marker icon so the SVG <text> isn't clipped by the image bounds.
  // This is an estimate (real text metrics would need a live canvas
  // context), but it's generous enough that ordinary pin names — capped at
  // 40 characters at creation — fit comfortably without wrapping or
  // truncation.
  const PIN_LABEL_CHAR_WIDTH = 7.6;
  const PIN_LABEL_X = 46;
  const PIN_LABEL_RIGHT_PAD = 10;

  function pinLabelIconWidth(label) {
    const len = String(label || "").length;
    const textWidth = Math.ceil(len * PIN_LABEL_CHAR_WIDTH);
    return Math.max(80, PIN_LABEL_X + textWidth + PIN_LABEL_RIGHT_PAD);
  }

  const pinSvgCache = new Map();
  const PIN_SVG_CACHE_MAX = 400;

  function pinSvgDataUri(color, label, withLabel, hasReminder, isShared, isSyncing) {
    const c = normalizeColor(color);
    const safeLabel = String(label || "").replace(/[<>&]/g, "");
    const cacheKey = `${c}|${withLabel ? 1 : 0}|${hasReminder ? 1 : 0}|${isShared ? 1 : 0}|${isSyncing ? 1 : 0}|${safeLabel}`;
    const cached = pinSvgCache.get(cacheKey);
    if (cached !== undefined) return cached;
    const text = withLabel && label
      ? `<text x="${PIN_LABEL_X}" y="20" font-family="system-ui,Segoe UI,Roboto,Arial" font-size="13"
              font-weight="700" fill="#fff" stroke="rgba(0,0,0,.7)" stroke-width="3"
              paint-order="stroke">${safeLabel}</text>`
      : "";
    const width = withLabel && label ? pinLabelIconWidth(safeLabel) : 34;
    const ring = hasReminder
      ? `<circle cx="17" cy="15" r="12.5" fill="none" stroke="#ffb347" stroke-width="2"/>`
      : "";
    // Small blue "shared" badge in the corner of the pin head, distinct
    // from the orange reminder ring so both can be visible at once. A
    // syncing pin gets an amber badge with a small clock-like mark
    // instead — SVG can't easily reuse the CSS spin animation used
    // elsewhere, so this is a static but still visually distinct
    // indicator rather than an animated one, to avoid relying on SMIL
    // animateTransform support across browsers for something this minor.
    const sharedBadge = isSyncing
      ? `<circle cx="24" cy="8" r="5.5" fill="#ffb347" stroke="#fff" stroke-width="1.4"/>
         <path d="M24 5.2v3l2 1.2" stroke="#fff" stroke-width="1.3" fill="none" stroke-linecap="round"/>`
      : isShared
        ? `<circle cx="24" cy="8" r="5.5" fill="#2f6fed" stroke="#fff" stroke-width="1.4"/>
           <circle cx="24" cy="8" r="1.6" fill="#fff"/>`
        : "";
    const s = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="34" viewBox="0 0 ${width} 34">
      <g>
        ${ring}
        <path d="M17 32s10-7.7 10-17a10 10 0 0 0-20 0c0 9.3 10 17 10 17z" fill="${c}"
              stroke="rgba(0,0,0,.35)" stroke-width="1"/>
        <circle cx="17" cy="15" r="4.4" fill="rgba(255,255,255,.94)"/>
        ${sharedBadge}
      </g>${text}</svg>`;
    const uri = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(s.trim());
    // Memoised on the exact appearance inputs. renderPinMarkers rebuilds
    // EVERY marker whenever the state signature changes, so adding or
    // moving a single pin previously re-ran this template build plus an
    // encodeURIComponent over the whole SVG for every other pin too,
    // none of which had changed. Position isn't part of the key: two
    // pins that look identical share one data URI regardless of where
    // they sit.
    //
    // Bounded so a long session that cycles through many pin
    // names/colours can't grow this without limit. Plain clear-on-full
    // rather than a real LRU: the working set is normally far below the
    // cap, so an occasional full rebuild costs less than tracking
    // recency on every hit.
    if (pinSvgCache.size >= PIN_SVG_CACHE_MAX) pinSvgCache.clear();
    pinSvgCache.set(cacheKey, uri);
    return uri;
  }

  let lastMarkerSignature = null;

  function ensurePinsLayer() {
    try {
      const ol = UW?.OpenLayers;
      const map = getOlMap();
      if (!ol || !map || typeof map.addLayer !== "function") return null;
      if (pinsLayer && Array.isArray(map.layers) && map.layers.includes(pinsLayer)) return pinsLayer;

      pinsLayer = new ol.Layer.Markers("WazePT Pins");
      try { pinsLayer.displayInLayerSwitcher = false; } catch {}
      try { pinsLayer.uniqueName = `${SCRIPT_ID}:pins`; } catch {}
      try { pinsLayer.setZIndex(9999); } catch {}
      map.addLayer(pinsLayer);
      // A brand new layer starts empty, so any markers we think we drew
      // belong to the discarded one. Clear both the cached marker refs and
      // the render signature, otherwise renderPinMarkers' no-op guard would
      // see an unchanged signature and skip repopulating the new layer.
      pinMarkers.clear();
      lastMarkerSignature = null;
      return pinsLayer;
    } catch {
      return null;
    }
  }

  // Signature of the last rendered marker state. Rebuilding markers means
  // destroying every OpenLayers marker and regenerating an SVG data-URI
  // per pin (encodeURIComponent over a template string), which is wasted
  // work on the common case: a zoom/layer event that doesn't actually
  // change how any marker looks. Comparing a cheap signature first makes
  // those events free. (Declared above ensurePinsLayer, which resets it.)

  function markerStateSignature(pins, showNames) {
    let sig = showNames ? "1|" : "0|";
    for (let i = 0; i < pins.length; i++) {
      const p = pins[i];
      sig += p.id + "," + p.lon + "," + p.lat + "," + p.color + "," +
             (p.shared ? "1" : "0") + "," +
             (p.syncing ? "1" : "0") + "," +
             (p.reminderAt && !p.reminderDone ? "1" : "0") + "," +
             p.name + ";";
    }
    return sig;
  }

  function renderPinMarkers({ force = false } = {}) {
    const layer = ensurePinsLayer();
    if (!layer) return;

    const ol = UW?.OpenLayers;
    if (!ol) return;

    const st = loadSettings();
    const z = getZoomBestEffort();
    const showNames = !!st.showPinNames && (!Number.isFinite(z) || z >= 12);

    const pins = isEditorAllowed() ? loadAllPins() : [];
    const sig = markerStateSignature(pins, showNames);
    if (!force && sig === lastMarkerSignature && pinMarkers.size) return;
    lastMarkerSignature = sig;

    for (const mk of pinMarkers.values()) {
      try { layer.removeMarker(mk); } catch {}
    }
    pinMarkers.clear();

    for (const pin of pins) {
      const ll = toMapProjection(pin.lon, pin.lat);
      if (!ll) continue;
      const url = pinSvgDataUri(pin.color, pin.name, showNames, !!(pin.reminderAt && !pin.reminderDone), !!pin.shared, !!pin.syncing);
      const w = showNames ? pinLabelIconWidth(pin.name) : 34;
      const icon = new ol.Icon(url, new ol.Size(w, 34), new ol.Pixel(-17, -34));
      const mk = new ol.Marker(ll, icon);
      try {
        mk.events?.register?.("mousedown", mk, (evt) => {
          try { ol.Event.stop(evt); } catch {}
          centerMapOn(pin.lon, pin.lat, pin.zoom || 17);
          toast(formatPinMarkerToast(pin));
        });
      } catch {}
      layer.addMarker(mk);
      pinMarkers.set(pin.id, mk);
    }
  }

  /* ------------------------------------------------------------------ *
   *  Pins: panel
   * ------------------------------------------------------------------ */

  function ensurePinsPanel() {
    // Never even built for a disallowed editor — not hidden, not present
    // in the DOM at all. renderPinsPanel() below separately handles the
    // "was allowed, got revoked mid-session, panel already exists" case.
    if (!isEditorAllowed()) return false;
    ensureCss();
    const mapEl = getMapContainerEl();
    if (!mapEl) return false;

    // Early-out BEFORE the getComputedStyle below. This function is
    // called on every tick of the 600ms setup loop (and again from
    // actionPinThisPlace), and getComputedStyle forces a style recalc —
    // one that only ever mattered the first time, since once the panel
    // exists the map element has already been given position:relative.
    if (panelEl && document.contains(panelEl)) return true;

    try {
      if (getComputedStyle(mapEl).position === "static") mapEl.style.position = "relative";
    } catch {}

    const el = document.createElement("div");
    el.className = "wmeRcPins hidden";

    let startCollapsed = false;
    try { startCollapsed = localStorage.getItem(PANEL_COLLAPSED_KEY) === "1"; } catch {}

    try {
      const posKey = startCollapsed ? PANEL_COLLAPSED_POS_KEY : PANEL_POS_KEY;
      const pos = JSON.parse(localStorage.getItem(posKey) || "null");
      if (pos && Number.isFinite(pos.left) && Number.isFinite(pos.top)) {
        el.style.left = `${Math.max(0, pos.left)}px`;
        el.style.top = `${Math.max(0, pos.top)}px`;
      }
    } catch {}

    if (startCollapsed) el.classList.add("collapsed");

    // Only applied when starting expanded: the collapsed CSS class
    // forces a fixed 48x48 (an inline width would win over it and break
    // the bubble's appearance), so there's nothing to restore into until
    // the panel is actually expanded — see expandPinsPanel(), which
    // applies the same saved value at that point instead.
    if (!startCollapsed) {
      try {
        const savedWidth = JSON.parse(localStorage.getItem(PANEL_WIDTH_KEY) || "null");
        if (savedWidth && Number.isFinite(savedWidth.width)) {
          const mapRect = mapEl.getBoundingClientRect();
          const curLeft = parseFloat(el.style.left) || 0;
          el.style.width = `${clampPanelWidth(savedWidth.width, curLeft, mapRect.width)}px`;
        }
      } catch {}
    }

    for (const evt of ["mousedown", "click", "dblclick", "contextmenu", "touchstart", "wheel"]) {
      el.addEventListener(evt, (e) => e.stopPropagation(), evt === "wheel" ? { passive: true } : false);
    }

    let drag = null;
    el.addEventListener("pointerdown", (ev) => {
      const hdr = ev.target?.closest?.(".wmeRcPinsHdr");
      if (!hdr || ev.target.closest(".wmeRcPinsBtn")) return;
      if (ev.button != null && ev.button !== 0) return;

      // Deliberately do NOT preventDefault() or capture the pointer here.
      // Doing so unconditionally on every pointerdown was suppressing the
      // trailing click event on the collapsed logo bubble in some browsers,
      // since setPointerCapture retargets subsequent events to `el` rather
      // than the bubble that the click listener is attached to. Instead,
      // just record the starting point; dragging only "activates" (and
      // only then claims the pointer/prevents default) once the pointer
      // has actually moved past a small threshold, so a plain tap is left
      // completely alone and its click event fires normally.
      panelDidDrag = false;
      const r = el.getBoundingClientRect();
      const mr = mapEl.getBoundingClientRect();
      drag = {
        id: ev.pointerId, x: ev.clientX, y: ev.clientY,
        left: r.left - mr.left, top: r.top - mr.top,
        active: false,
        // Cached for the whole gesture. The move handler below read both
        // rects on every pointermove, and each getBoundingClientRect()
        // forces a synchronous layout — two forced reflows per frame for
        // the length of the drag. Neither can change while dragging:
        // the panel isn't resizing and isn't collapsing/expanding
        // mid-gesture, and the map element isn't moving.
        mapW: mr.width, mapH: mr.height, elW: r.width,
      };

      const move = (e) => {
        if (!drag || (drag.id != null && e.pointerId !== drag.id)) return;

        if (!drag.active) {
          if (Math.abs(e.clientX - drag.x) <= 4 && Math.abs(e.clientY - drag.y) <= 4) return;
          // Movement threshold crossed: this is now a real drag. Claim the
          // pointer from here on so the browser doesn't also try to select
          // text or scroll while dragging.
          drag.active = true;
          panelDidDrag = true;
          try { el.setPointerCapture(drag.id); } catch {}
        }

        e.preventDefault();
        const left = clamp(drag.left + (e.clientX - drag.x), 6, Math.max(6, drag.mapW - drag.elW - 6));
        const top = clamp(drag.top + (e.clientY - drag.y), 6, Math.max(6, drag.mapH - 44));
        el.style.left = `${Math.round(left)}px`;
        el.style.top = `${Math.round(top)}px`;
      };
      // Detaching is split out and called unconditionally below, because
      // the early-return guard used to sit *before* the removals: a
      // pointerup with a mismatched pointerId (multi-touch, stray pointer)
      // left all three document listeners attached forever, so they piled
      // up one set per drag attempt for the life of the session.
      const detach = () => {
        document.removeEventListener("pointermove", move, true);
        document.removeEventListener("pointerup", up, true);
        document.removeEventListener("pointercancel", up, true);
      };
      const up = (e) => {
        if (drag && drag.id != null && e.pointerId !== drag.id) return;
        if (drag && drag.active) {
          try {
            const mrect = mapEl.getBoundingClientRect();
            const rect = el.getBoundingClientRect();
            // Whichever state the panel is in RIGHT NOW is the state
            // this drag just repositioned — a collapsed bubble being
            // dragged saves its own position, an expanded panel being
            // dragged saves its own, and the two never overwrite each
            // other.
            const posKey = el.classList.contains("collapsed") ? PANEL_COLLAPSED_POS_KEY : PANEL_POS_KEY;
            localStorage.setItem(posKey, JSON.stringify({
              left: Math.round(rect.left - mrect.left),
              top: Math.round(rect.top - mrect.top),
            }));
          } catch {}
          try { el.releasePointerCapture(drag.id); } catch {}
        }
        drag = null;
        detach();
      };
      document.addEventListener("pointermove", move, true);
      document.addEventListener("pointerup", up, true);
      document.addEventListener("pointercancel", up, true);
    });

    // ── Horizontal resize handle ──
    // A thin strip along the right edge; every interaction with it is
    // intentional (unlike the header, it has no "click to expand/collapse"
    // meaning to preserve), so this claims the pointer and prevents
    // default immediately on pointerdown rather than waiting for a
    // movement threshold the way the header drag does.
    const resizeHandle = document.createElement("div");
    resizeHandle.className = "wmeRcPinsResize";
    resizeHandle.title = T("Drag to resize");
    let resize = null;
    resizeHandle.addEventListener("pointerdown", (ev) => {
      if (ev.button != null && ev.button !== 0) return;
      ev.stopPropagation();
      ev.preventDefault();
      const r = el.getBoundingClientRect();
      // Map width captured once for the gesture: reading it inside move
      // forced a synchronous layout on every pointermove, and the map
      // element can't change width mid-drag. Same fix as the route
      // details panel's own drag handler.
      resize = {
        id: ev.pointerId, x: ev.clientX, startWidth: r.width,
        mapW: mapEl.getBoundingClientRect().width,
      };
      try { resizeHandle.setPointerCapture(ev.pointerId); } catch {}

      const move = (e) => {
        if (!resize || (resize.id != null && e.pointerId !== resize.id)) return;
        e.preventDefault();
        const curLeft = parseFloat(el.style.left) || 0;
        const width = clampPanelWidth(resize.startWidth + (e.clientX - resize.x), curLeft, resize.mapW);
        el.style.width = `${width}px`;
      };
      const detach = () => {
        document.removeEventListener("pointermove", move, true);
        document.removeEventListener("pointerup", up, true);
        document.removeEventListener("pointercancel", up, true);
      };
      const up = (e) => {
        if (resize && resize.id != null && e.pointerId !== resize.id) return;
        if (resize) {
          try {
            const rect = el.getBoundingClientRect();
            localStorage.setItem(PANEL_WIDTH_KEY, JSON.stringify({ width: Math.round(rect.width) }));
          } catch {}
          try { resizeHandle.releasePointerCapture(resize.id); } catch {}
        }
        resize = null;
        detach();
      };
      document.addEventListener("pointermove", move, true);
      document.addEventListener("pointerup", up, true);
      document.addEventListener("pointercancel", up, true);
    });
    panelResizeHandleEl = resizeHandle;

    // ── Left-edge resize handle ──
    // Same idea, mirrored: needed specifically for a panel parked near
    // the screen's right edge, where there's no room left to drag the
    // RIGHT handle any further right — growing from the left is the
    // only direction with space. Dragging this one keeps the panel's
    // right edge fixed and moves left/top together with the width (see
    // computeLeftEdgeResize), rather than only changing width in place.
    const resizeHandleLeft = document.createElement("div");
    resizeHandleLeft.className = "wmeRcPinsResize wmeRcPinsResizeLeft";
    resizeHandleLeft.title = T("Drag to resize");
    let resizeLeft = null;
    resizeHandleLeft.addEventListener("pointerdown", (ev) => {
      if (ev.button != null && ev.button !== 0) return;
      ev.stopPropagation();
      ev.preventDefault();
      const r = el.getBoundingClientRect();
      const mr = mapEl.getBoundingClientRect();
      resizeLeft = { id: ev.pointerId, x: ev.clientX, startLeft: r.left - mr.left, startWidth: r.width };
      try { resizeHandleLeft.setPointerCapture(ev.pointerId); } catch {}

      const move = (e) => {
        if (!resizeLeft || (resizeLeft.id != null && e.pointerId !== resizeLeft.id)) return;
        e.preventDefault();
        const { left, width } = computeLeftEdgeResize(
          resizeLeft.startLeft, resizeLeft.startWidth, e.clientX - resizeLeft.x,
        );
        el.style.left = `${left}px`;
        el.style.width = `${width}px`;
      };
      const detach = () => {
        document.removeEventListener("pointermove", move, true);
        document.removeEventListener("pointerup", up, true);
        document.removeEventListener("pointercancel", up, true);
      };
      const up = (e) => {
        if (resizeLeft && resizeLeft.id != null && e.pointerId !== resizeLeft.id) return;
        if (resizeLeft) {
          try {
            const mrect = mapEl.getBoundingClientRect();
            const rect = el.getBoundingClientRect();
            localStorage.setItem(PANEL_WIDTH_KEY, JSON.stringify({ width: Math.round(rect.width) }));
            // Resizing from the left moves the panel's position too —
            // unlike the right-edge handle, which only ever changes
            // width. Always PANEL_POS_KEY, never the collapsed-position
            // key: this handle is hidden entirely while collapsed (see
            // the CSS), so it can only ever run against the expanded
            // panel.
            localStorage.setItem(PANEL_POS_KEY, JSON.stringify({
              left: Math.round(rect.left - mrect.left),
              top: Math.round(rect.top - mrect.top),
            }));
          } catch {}
          try { resizeHandleLeft.releasePointerCapture(resizeLeft.id); } catch {}
        }
        resizeLeft = null;
        detach();
      };
      document.addEventListener("pointermove", move, true);
      document.addEventListener("pointerup", up, true);
      document.addEventListener("pointercancel", up, true);
    });
    panelResizeHandleLeftEl = resizeHandleLeft;

    mapEl.appendChild(el);
    panelEl = el;
    renderPinsPanel();
    return true;
  }

  /* ------------------------------------------------------------------ *
   *  Pins: sorting
   * ------------------------------------------------------------------ */

  // Sort orders offered by the ⇅ button in the pins panel header. The ids
  // are persisted in settings, so renaming one would silently reset every
  // existing user's choice — add new entries rather than editing these.
  const PIN_SORT_OPTIONS = [
    { id: "created-desc", label: "Newest first" },
    { id: "created-asc", label: "Oldest first" },
    { id: "name-asc", label: "Name (A–Z)" },
    { id: "user-asc", label: "Editor (A–Z)" },
  ];

  // dd/mm/yyyy HH:MM — the Portuguese written convention, and the same
  // shape formatClosureDateTime() already uses elsewhere in the script,
  // so the two never disagree about how a date looks.
  function formatPinCreatedAt(ts) {
    const d = new Date(Number(ts));
    if (!Number.isFinite(d.valueOf())) return "";
    return `${pad2n(d.getDate())}/${pad2n(d.getMonth() + 1)}/${d.getFullYear()}`
      + ` ${pad2n(d.getHours())}:${pad2n(d.getMinutes())}`;
  }

  // Text for the toast shown when a MAP MARKER (not a list row) is
  // clicked. Mirrors the list row's meta line — name, "Pinned by" for a
  // shared pin with a known author, and the creation date whenever one
  // exists — so a marker click on the map surfaces the same information
  // as the panel, not a subset of it.
  function formatPinMarkerToast(pin) {
    const bits = [pin.name];
    if (pin.shared && pin.createdBy) bits.push(`${T("Pinned by")}: ${pin.createdBy}`);
    if (Number.isFinite(Number(pin.createdAt)) && Number(pin.createdAt) > 0) {
      bits.push(`${T("Created")}: ${formatPinCreatedAt(pin.createdAt)}`);
    }
    if (pin.shared && pin.lockLevel > 0) bits.push(`${T("Requires Level")} ${pin.lockLevel}+`);
    return bits.join(" — ");
  }

  function normalizePinSortMode(id) {
    const v = String(id || "").trim();
    return PIN_SORT_OPTIONS.some((o) => o.id === v) ? v : "created-desc";
  }

  function getPinSortMode() {
    return normalizePinSortMode(loadSettings().pinSortMode);
  }

  function setPinSortMode(id) {
    const s = loadSettings();
    s.pinSortMode = normalizePinSortMode(id);
    saveSettings(s);
  }

  // localeCompare with the "pt" locale so accented names sort where a
  // Portuguese reader expects them (Ávila next to Avila, not after Z),
  // and numeric:true so "Pin #2" comes before "Pin #10" instead of after
  // it — the default lexicographic order on the auto-generated pin names
  // is exactly the case people notice first.
  function comparePinText(a, b) {
    return String(a || "").localeCompare(String(b || ""), "pt", { sensitivity: "base", numeric: true });
  }

  // Returns a NEW array — callers pass arrays that came straight out of
  // loadPins()/loadAllPins() and are also used elsewhere in the same
  // render, so sorting in place would be an invisible side effect.
  function sortPins(pins, mode) {
    const arr = (pins || []).slice();
    switch (normalizePinSortMode(mode)) {
      case "created-asc":
        arr.sort((a, b) => (Number(a.createdAt) || 0) - (Number(b.createdAt) || 0));
        break;
      case "name-asc":
        arr.sort((a, b) => comparePinText(a.name, b.name));
        break;
      case "user-asc":
        // Local pins have no createdBy at all. Rather than scattering
        // them randomly among the named ones, they're grouped under the
        // empty key and pushed to the end, then ordered by name so the
        // block itself is still readable.
        arr.sort((a, b) => {
          const ua = String(a.createdBy || "");
          const ub = String(b.createdBy || "");
          if (!ua !== !ub) return ua ? -1 : 1;
          const byUser = comparePinText(ua, ub);
          return byUser !== 0 ? byUser : comparePinText(a.name, b.name);
        });
        break;
      default: // "created-desc"
        arr.sort((a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0));
        break;
    }
    return arr;
  }

  const PIN_LOGO_URL = "https://i.imgur.com/UksVMzF.png";

  const FOLDER_STATE_KEY = `${SCRIPT_ID}:folderState:v1`;

  function loadFolderState() {
    try {
      const raw = JSON.parse(localStorage.getItem(FOLDER_STATE_KEY) || "{}");
      return {
        shared: !!raw.shared,
        mine: !!raw.mine,
        reminders: !!raw.reminders,
      };
    } catch {
      return { shared: false, mine: false, reminders: false };
    }
  }

  function saveFolderState(state) {
    try { localStorage.setItem(FOLDER_STATE_KEY, JSON.stringify(state)); } catch {}
  }

  // Opens a small dialog to rewrite a pin's text. Shared and local pins
  // share the dialog but not the write path: local goes through
  // updatePin() (localStorage), shared through renameSharedPin() (a
  // Firebase PATCH), which is also the only one that can fail.
  function openRenamePinModal(pin) {
    const isShared = !!pin.shared;

    openModal({
      title: T("Edit pin text"),
      icon: ICONS.pencil,
      build: ({ body, close }) => {
        const lbl = document.createElement("div");
        lbl.className = "wmeRcClLbl";
        lbl.textContent = T("Pin name");
        body.appendChild(lbl);

        const inp = document.createElement("input");
        inp.type = "text";
        inp.className = "wmeRcInput";
        // Shared pins are normalized to 60 chars on the way in and out of
        // Firebase; matching that here means the field can't accept text
        // that would be silently truncated after saving.
        inp.maxLength = 60;
        inp.value = pin.name || "";
        inp.placeholder = T("Pin name");
        body.appendChild(inp);

        if (isShared) {
          const hint = document.createElement("div");
          hint.className = "wmeRcClHint warn";
          hint.textContent = T("This pin is shared — the new text will be visible to every editor using the script.");
          body.appendChild(hint);
        }

        const actions = document.createElement("div");
        actions.className = "wmeRcActions";

        const cancelBtn = document.createElement("div");
        cancelBtn.className = "wmeRcBtn";
        cancelBtn.textContent = T("Cancel");
        cancelBtn.addEventListener("click", close);

        const saveBtn = document.createElement("div");
        saveBtn.className = "wmeRcBtn primary";
        saveBtn.textContent = T("Save");
        saveBtn.addEventListener("click", async () => {
          const name = inp.value.trim();
          if (!name) { toast(T("Give the pin a name first.")); return; }
          if (name === pin.name) { close(); return; }
          if (saveBtn.classList.contains("is-disabled")) return;

          if (!isShared) {
            updatePin(pin.id, { name });
            toast(T("Pin updated"));
            close();
            return;
          }

          // The network round-trip can fail, so the dialog stays open and
          // locked until it resolves — closing optimistically would leave
          // the user believing an edit landed when it didn't.
          saveBtn.classList.add("is-disabled");
          saveBtn.textContent = T("Saving…");
          const ok = await renameSharedPin(pin.id, name);
          saveBtn.classList.remove("is-disabled");
          saveBtn.textContent = T("Save");
          if (ok) { toast(T("Pin updated")); close(); }
        });

        actions.appendChild(cancelBtn);
        actions.appendChild(saveBtn);
        body.appendChild(actions);

        setTimeout(() => { try { inp.focus(); inp.select(); } catch {} }, 60);
      },
    });
  }

  // Builds a single pin row exactly as before — this used to be inlined in
  // the render loop, pulled out so the same row markup/behavior can be
  // reused across three separate folder sections instead of one flat list.
  function buildPinRowEl(pin, { isNew = false } = {}) {
    const row = document.createElement("div");
    row.className = "wmeRcPinRow";
    row.dataset.pinId = pin.id;
    // Name and coordinates are still tooltip-only: the name can be
    // ellipsis-truncated in the row, and coordinates aren't shown
    // anywhere visible. "Pinned by" and the creation date used to be
    // duplicated here too, but they're now a permanent line in the row
    // itself (below), so repeating them in the tooltip would just be
    // stale busywork if either is ever styled differently later.
    const titleLines = [pin.name, `${fmt(pin.lat)}, ${fmt(pin.lon)}`];
    if (pin.shared) titleLines.push(T("Shared with all script users"));
    row.title = titleLines.join("\n");
    if (pin.reminderAt && !pin.reminderDone) row.classList.add("has-reminder");

    const dot = document.createElement("div");
    dot.className = "wmeRcPinDot";
    dot.style.background = pin.color;

    const mid = document.createElement("div");
    mid.className = "wmeRcPinMid";

    const nameRow = document.createElement("div");
    nameRow.className = "wmeRcPinNameRow";
    const name = document.createElement("div");
    name.className = "wmeRcPinName";
    name.textContent = pin.name;
    nameRow.appendChild(name);
    if (pin.shared) {
      const sharedTag = document.createElement("div");
      sharedTag.className = "wmeRcPinSharedTag";
      sharedTag.title = T("Shared with all script users");
      sharedTag.innerHTML = ICONS.people;
      nameRow.appendChild(sharedTag);
    }
    if (pin.syncing) {
      const syncTag = document.createElement("div");
      syncTag.className = "wmeRcPinSyncTag";
      syncTag.title = T("No connection yet — will be sent automatically once you're back online.");
      syncTag.innerHTML = ICONS.sync;
      nameRow.appendChild(syncTag);
    }
    if (isNew) {
      const newTag = document.createElement("div");
      newTag.className = "wmeRcPinNewTag";
      newTag.title = T("New community pin, not seen yet");
      newTag.textContent = T("New");
      nameRow.appendChild(newTag);
    }
    mid.appendChild(nameRow);

    // Creation date (and "Pinned by" for shared pins) as VISIBLE lines,
    // not just in row.title above — a tooltip only helps someone who
    // stops to hover, and the whole point of listing pins is to scan them
    // quickly. These used to be combined onto one line separated by " · "
    // to save vertical space, but .wmeRcPinBy is a single-line, ellipsis-
    // truncated element — a longer username pushed the date past the
    // truncation point, making it unreadable exactly when there WAS a
    // username to show. Two lines costs a little more height but means
    // the date is never at the mercy of how long the name above it is.
    if (pin.shared && pin.createdBy) {
      const byLine = document.createElement("div");
      byLine.className = "wmeRcPinBy";
      byLine.textContent = `${T("Pinned by")}: ${pin.createdBy}`;
      mid.appendChild(byLine);
    }
    if (Number.isFinite(Number(pin.createdAt)) && Number(pin.createdAt) > 0) {
      const dateLine = document.createElement("div");
      dateLine.className = "wmeRcPinBy";
      dateLine.textContent = `${T("Created")}: ${formatPinCreatedAt(pin.createdAt)}`;
      mid.appendChild(dateLine);
    }
    if (pin.shared && pin.lockLevel > 0) {
      const lockLine = document.createElement("div");
      lockLine.className = "wmeRcPinBy wmeRcPinLock";
      // The icon is a trusted constant, so innerHTML is fine for it —
      // but the level itself originates from another user's Firebase
      // record, so it goes in as text rather than markup. It's already
      // coerced with Math.round(Number(...)) on ingest, making this
      // defence in depth rather than a live hole; the point is that the
      // safety no longer depends on a coercion happening somewhere far
      // away from here.
      const lockIco = document.createElement("span");
      lockIco.innerHTML = ICONS.lock;
      lockLine.appendChild(lockIco);
      lockLine.appendChild(document.createTextNode(` ${T("Requires Level")} ${pin.lockLevel}+`));
      mid.appendChild(lockLine);
    }

    if (pin.syncing) {
      const syncLine = document.createElement("div");
      syncLine.className = "wmeRcPinBy wmeRcPinSyncLine";
      syncLine.textContent = T("Waiting to sync…");
      mid.appendChild(syncLine);
    }

    if (pin.shared && pin.expiresAt) {
      const expiryLine = document.createElement("div");
      expiryLine.className = "wmeRcPinBy wmeRcPinExpiry";
      expiryLine.textContent = `${T("Expires")} ${formatExpiryIn(pin.expiresAt)}`;
      mid.appendChild(expiryLine);
    }

    if (pin.reminderAt && !pin.reminderDone) {
      const badge = document.createElement("div");
      badge.className = "wmeRcPinCountdown";
      badge.dataset.reminderAt = String(pin.reminderAt);
      const repeatUnitTxt = pin.repeatUnit === "hours" ? T("hours") : pin.repeatUnit === "weeks" ? T("weeks") : T("days");
      const repeatTxt = pin.repeatEvery > 0 ? ` · ↻ ${T("every")} ${pin.repeatEvery} ${repeatUnitTxt}` : "";
      badge.dataset.repeatTxt = repeatTxt;
      badge.textContent = formatCountdown(pin.reminderAt) + repeatTxt;
      mid.appendChild(badge);
    }

    // Reminders only make sense for local pins — there is no per-user
    // identity in the shared database to hang a personal reminder off.
    if (!pin.shared) {
      const bell = document.createElement("div");
      bell.className = "wmeRcPinBell" + (pin.reminderAt && !pin.reminderDone ? " active" : "");
      bell.title = pin.reminderAt && !pin.reminderDone ? T("Edit reminder") : T("Set reminder");
      bell.innerHTML = ICONS.bell;
      bell.addEventListener("click", (e) => {
        e.stopPropagation();
        openReminderModal(pin.id);
      });
      row.appendChild(dot);
      row.appendChild(mid);
      row.appendChild(bell);
    } else {
      row.appendChild(dot);
      row.appendChild(mid);
    }

    const belowRank = pin.shared && !canEditOrDeletePins();
    // Only meaningful once belowRank is already false — canEditOrDeleteSharedPin()
    // re-checks the baseline internally too, but the distinct flag here is
    // what lets the tooltip/toast say WHICH restriction actually applies.
    const belowLock = pin.shared && !belowRank && pin.lockLevel > 0 && !canEditOrDeleteSharedPin(pin);
    const restricted = belowRank || belowLock;
    const restrictedMsg = belowLock
      ? `${T("Requires Level")} ${pin.lockLevel} ${T("or above")} ${T("(locked by creator)")}`
      : `${T("Requires Level")} ${MIN_EDIT_RANK_LEVEL} ${T("or above")}`;

    // Edit sits immediately before delete so the destructive button stays
    // the rightmost one — moving it would retrain muscle memory built on
    // every previous version.
    const edit = document.createElement("div");
    edit.className = "wmeRcPinEdit" + (restricted ? " is-disabled" : "");
    edit.title = restricted ? restrictedMsg : T("Edit pin text");
    edit.innerHTML = ICONS.pencil;
    edit.addEventListener("click", (e) => {
      e.stopPropagation();
      if (restricted) {
        toast(restrictedMsg);
        return;
      }
      // A pin still sitting in the offline queue has no Firebase id yet,
      // so a PATCH would have nothing to address — block the edit rather
      // than issue a request that can only 404.
      if (pin.shared && pin.syncing) {
        toast(T("This pin hasn't been sent yet — try again once it has synced."));
        return;
      }
      openRenamePinModal(pin);
    });
    row.appendChild(edit);

    const del = document.createElement("div");
    del.className = "wmeRcPinDel" + (restricted ? " is-disabled" : "");
    del.title = pin.shared
      ? (restricted ? restrictedMsg : T("Remove shared pin"))
      : T("Remove pin");
    del.innerHTML = ICONS.trash;
    del.addEventListener("click", async (e) => {
      e.stopPropagation();
      if (restricted) {
        toast(restrictedMsg);
        return;
      }
      if (pin.shared) {
        const confirmed = await showConfirmModal({
          title: T("Delete this shared pin?"),
          icon: ICONS.trash,
          message: T("This pin was shared with every editor using this script, not just you. Make sure you're sure before removing it — if it belongs to someone else, only delete it once its task is actually done."),
          confirmLabel: T("Yes, delete it"),
          cancelLabel: T("Cancel"),
          danger: true,
        });
        if (!confirmed) return;
        const ok = await removeSharedPin(pin.id);
        if (ok) toast(T("Pin removed"));
      } else {
        removePin(pin.id);
        toast(T("Pin removed"));
      }
    });

    // Edit above Delete, not side by side — this is what actually saves
    // the horizontal space that was asked for: two 22px squares in a row
    // cost roughly double the width of one column of the same two
    // squares stacked. The row is align-items:center, so the stack ends
    // up vertically centered against .wmeRcPinMid regardless of how many
    // meta lines that pin has.
    const actions = document.createElement("div");
    actions.className = "wmeRcPinActions";
    actions.appendChild(edit);
    actions.appendChild(del);
    row.appendChild(actions);

    row.addEventListener("click", () => centerMapOn(pin.lon, pin.lat, pin.zoom || 17));
    return row;
  }

  // Builds one collapsible folder section: a clickable header (name, count,
  // chevron) plus a list of rows built via buildPinRowEl, or an empty-state
  // message when the folder has no pins. Collapse state is per-folder and
  // persists across reloads via FOLDER_STATE_KEY.
  function buildFolderEl({ key, label, pins, emptyLabel, folderState }) {
    const folder = document.createElement("div");
    folder.className = "wmeRcPinFolder";

    const hdr = document.createElement("div");
    hdr.className = "wmeRcPinFolderHdr";
    hdr.innerHTML = `
      <div class="wmeRcPinFolderChevron">${ICONS.chevron}</div>
      <span class="wmeRcPinFolderLabel">${label}</span>
      <span class="wmeRcPinFolderCount">${pins.length}</span>
    `;

    const body = document.createElement("div");
    body.className = "wmeRcPinFolderBody";

    const collapsed = !!folderState[key];
    folder.classList.toggle("collapsed", collapsed);

    // Only the "Pins for everyone" folder ever has a "Novo" tag — local
    // pins are the current editor's own, so there's no "seen by me yet"
    // question to ask about them.
    const isSharedFolder = key === "shared";
    const seenIds = isSharedFolder ? loadSeenSharedPinIds() : null;

    if (!pins.length) {
      const empty = document.createElement("div");
      empty.className = "wmeRcPinsEmpty";
      empty.textContent = emptyLabel;
      body.appendChild(empty);
    } else {
      for (const pin of pins) {
        const isNew = isSharedFolder && !seenIds.has(String(pin.id));
        body.appendChild(buildPinRowEl(pin, { isNew }));
      }
    }

    // Rows visible right now (folder expanded) count as "shown to the
    // user" — the tag still displays for THIS render (isNew was already
    // decided above), but marking them seen here means the next full
    // re-render (a fetch, a pin added/removed, reopening the panel) will
    // no longer flag them. A collapsed folder never marks anything seen,
    // since nothing inside it was actually shown.
    if (isSharedFolder && !collapsed && pins.length) {
      markSharedPinsSeen(pins.map((p) => p.id));
    }

    hdr.addEventListener("click", (e) => {
      e.stopPropagation();
      const next = !folder.classList.contains("collapsed");
      folder.classList.toggle("collapsed", next);
      const state = loadFolderState();
      state[key] = next;
      saveFolderState(state);
      // Expanding a folder that was collapsed at render time means its
      // rows were built with isNew computed against the not-yet-updated
      // seen-set. Mark them seen now too, so the tag is gone by the very
      // next re-render rather than needing a second expand/collapse cycle.
      if (isSharedFolder && !next) markSharedPinsSeen(pins.map((p) => p.id));
    });

    folder.appendChild(hdr);
    folder.appendChild(body);
    return folder;
  }

  // ── Pins sort popup ──
  // State lives at module scope (not inside renderPinsPanel) because the
  // popup is parented to <body>: .wmeRcPins is overflow:hidden, so an
  // in-panel popup gets clipped whenever the panel is shorter than the
  // menu. Being outside the panel means a panel re-render can't remove it
  // implicitly, so closePinSortPop() has to be callable from anywhere —
  // in particular from the top of renderPinsPanel().
  let pinSortPop = null;
  let pinSortOutsideHandler = null;

  function closePinSortPop() {
    if (pinSortOutsideHandler) {
      document.removeEventListener("pointerdown", pinSortOutsideHandler, true);
      pinSortOutsideHandler = null;
    }
    if (pinSortPop) {
      pinSortPop.remove();
      pinSortPop = null;
    }
  }

  function openPinSortPop(sortBtn) {
    closePinSortPop();
    const current = getPinSortMode();

    const pop = document.createElement("div");
    // position:fixed puts this outside .wmeRcPins, so it can't inherit
    // the panel's theme-light class through a descendant selector — it
    // has to carry its own.
    pop.className = "wmeRcSortPop" + (isLightTheme() ? " theme-light" : "");

    // The panel swallows these events for everything inside it so clicks
    // don't fall through to the map underneath. The popup is no longer
    // inside the panel, so it needs the same treatment on its own.
    for (const evt of ["mousedown", "click", "dblclick", "contextmenu", "wheel"]) {
      pop.addEventListener(evt, (e) => e.stopPropagation(), evt === "wheel" ? { passive: true } : false);
    }

    for (const opt of PIN_SORT_OPTIONS) {
      const row = document.createElement("div");
      row.className = "wmeRcSortOpt" + (opt.id === current ? " on" : "");
      row.innerHTML = `<span class="wmeRcSortOptTick">${ICONS.check}</span><span></span>`;
      row.lastElementChild.textContent = T(opt.label);
      row.addEventListener("click", (ev) => {
        ev.stopPropagation();
        setPinSortMode(opt.id);
        closePinSortPop();
        renderPinsPanel();
      });
      pop.appendChild(row);
    }

    // Rendered off-screen first so it can be measured: width and height
    // aren't known until it's in the document, and both clamps need them.
    pop.style.left = "-9999px";
    pop.style.top = "-9999px";
    (document.body || document.documentElement).appendChild(pop);
    pinSortPop = pop;

    const btnRect = sortBtn.getBoundingClientRect();
    const popRect = pop.getBoundingClientRect();
    const vw = window.innerWidth || document.documentElement.clientWidth;
    const vh = window.innerHeight || document.documentElement.clientHeight;
    // Right-aligned to the button, but flipped above it when there isn't
    // room below — the panel can be dragged to the bottom of the map, and
    // a menu opening off the bottom edge would be unusable.
    const left = btnRect.right - popRect.width;
    let top = btnRect.bottom + 4;
    if (top + popRect.height > vh - 8) top = btnRect.top - popRect.height - 4;
    pop.style.left = `${Math.round(clamp(left, 8, Math.max(8, vw - popRect.width - 8)))}px`;
    pop.style.top = `${Math.round(clamp(top, 8, Math.max(8, vh - popRect.height - 8)))}px`;

    pinSortOutsideHandler = (ev) => {
      // Self-heals if the popup was torn out of the document by something
      // other than closePinSortPop(), rather than leaving this listener
      // bound to the document for the rest of the session.
      if (!pinSortPop || !document.contains(pinSortPop)) { closePinSortPop(); return; }
      if (!pinSortPop.contains(ev.target) && !sortBtn.contains(ev.target)) closePinSortPop();
    };
    // Registered on the NEXT tick: adding it synchronously would let the
    // click that opened the popup bubble straight into it and shut the
    // menu again before it was ever visible.
    setTimeout(() => {
      if (pinSortOutsideHandler) document.addEventListener("pointerdown", pinSortOutsideHandler, true);
    }, 0);
  }

  // Computes where a box of a given size should sit, in pixels relative
  // to the map container, so it never ends up outside the visible map
  // area. Pure geometry — no DOM reads — so it can be unit tested
  // without a real layout engine. Used for both the expanded panel and
  // the collapsed bubble: either one can end up needing to be pulled
  // back on-screen (an expand growing past an edge, or a saved bubble
  // position left stale after the browser window was resized smaller).
  //
  // Only ever pulls the position INWARD (left/top can decrease, never
  // increase): a box that already has room to grow is left exactly
  // where it was. This is what makes a bubble parked near the right
  // edge expand leftward, and one near the bottom expand upward, while
  // anywhere else behaves exactly as before.
  function clampPanelPosToMapBounds(curLeft, curTop, boxWidth, boxHeight, mapWidth, mapHeight, margin = 6) {
    const maxLeft = Math.max(margin, mapWidth - boxWidth - margin);
    const maxTop = Math.max(margin, mapHeight - boxHeight - margin);
    return {
      left: Math.round(Math.max(margin, Math.min(curLeft, maxLeft))),
      top: Math.round(Math.max(margin, Math.min(curTop, maxTop))),
    };
  }

  // Expands the collapsed bubble into the full panel, then — if that
  // growth would have pushed it past the map's right or bottom edge —
  // pulls the panel back inward so it stays fully visible.
  //
  // The panel's width/height are CSS-transitioned (.16s), so measuring
  // its size immediately after removing the "collapsed" class would
  // catch it mid-animation, still close to the 48x48 bubble rather than
  // its final expanded size. The transition is disabled for this one
  // instant so the browser lays out the FINAL size synchronously,
  // letting the clamp below work off real numbers; it's restored right
  // after so later collapse/expand cycles keep their normal animation.
  // (left/top themselves were never covered by that transition rule —
  // only width/height/border-radius are — so repositioning here can't
  // itself introduce any visible jump.)
  function expandPinsPanel() {
    const mapEl = getMapContainerEl();
    const prevTransition = panelEl.style.transition;
    panelEl.style.transition = "none";
    panelEl.classList.remove("collapsed");
    try { localStorage.setItem(PANEL_COLLAPSED_KEY, "0"); } catch {}
    renderPinsPanel();

    if (mapEl) {
      const mapRect = mapEl.getBoundingClientRect();

      // Applied BEFORE measuring for the position clamp below, so a
      // custom saved width participates in that same "don't end up
      // off-screen" check rather than being clamped separately — a
      // wide panel near the right edge needs its POSITION pulled in
      // further than a default-width one would, and measuring after
      // this is what makes that happen automatically.
      let savedWidth = null;
      try { savedWidth = JSON.parse(localStorage.getItem(PANEL_WIDTH_KEY) || "null"); } catch {}
      if (savedWidth && Number.isFinite(savedWidth.width)) {
        const curLeftForWidth = (panelEl.getBoundingClientRect().left - mapRect.left);
        panelEl.style.width = `${clampPanelWidth(savedWidth.width, curLeftForWidth, mapRect.width)}px`;
      }

      const panelRect = panelEl.getBoundingClientRect();
      const curLeft = panelRect.left - mapRect.left;
      const curTop = panelRect.top - mapRect.top;
      const { left, top } = clampPanelPosToMapBounds(
        curLeft, curTop, panelRect.width, panelRect.height, mapRect.width, mapRect.height,
      );
      if (left !== Math.round(curLeft) || top !== Math.round(curTop)) {
        panelEl.style.left = `${left}px`;
        panelEl.style.top = `${top}px`;
        try { localStorage.setItem(PANEL_POS_KEY, JSON.stringify({ left, top })); } catch {}
      }
    }

    requestAnimationFrame(() => { panelEl.style.transition = prevTransition; });
  }

  // Shrinks the panel back to the collapsed bubble. Unlike a plain class
  // toggle, this restores the bubble to wherever it last sat on its OWN
  // (PANEL_COLLAPSED_POS_KEY) — not wherever the expanded panel happens
  // to currently be — since expanding can move the panel's top-left
  // corner (see expandPinsPanel's inward clamp). Without this, a bubble
  // parked at the right edge that gets expanded, then collapsed again,
  // would reappear wherever the expanded panel's corner ended up instead
  // of back where it was originally dragged to.
  //
  // If no collapsed position was ever recorded (a fresh panel that's
  // never been dragged while collapsed), there's nothing to restore to,
  // so the panel is simply left wherever it already is — which then
  // becomes its collapsed position going forward once this or a future
  // drag saves it.
  function collapsePinsPanel() {
    const mapEl = getMapContainerEl();
    let savedPos = null;
    try { savedPos = JSON.parse(localStorage.getItem(PANEL_COLLAPSED_POS_KEY) || "null"); } catch {}

    panelEl.classList.add("collapsed");
    try { localStorage.setItem(PANEL_COLLAPSED_KEY, "1"); } catch {}
    // An inline width (set while expanded, via the resize handle or the
    // saved-width restore) beats any class rule regardless of
    // specificity — left in place, it would override .wmeRcPins.collapsed's
    // 48px and leave the "collapsed" bubble stuck at whatever width the
    // panel had. The saved width itself is untouched in storage; it's
    // reapplied the next time the panel expands.
    panelEl.style.width = "";
    renderPinsPanel();

    if (mapEl && savedPos && Number.isFinite(savedPos.left) && Number.isFinite(savedPos.top)) {
      const mapRect = mapEl.getBoundingClientRect();
      // Re-clamped against CURRENT map bounds, not just replayed as-is:
      // the browser window may have been resized smaller since this
      // position was saved, and a stale bubble position could otherwise
      // land outside the visible area just as easily as an un-clamped
      // expand would.
      const { left, top } = clampPanelPosToMapBounds(savedPos.left, savedPos.top, 48, 48, mapRect.width, mapRect.height);
      panelEl.style.left = `${left}px`;
      panelEl.style.top = `${top}px`;
    }
  }

  function renderPinsPanel() {
    if (!panelEl || !document.contains(panelEl)) return;

    // Covers the "was allowed when the panel was built, got revoked
    // mid-session" case — ensurePinsPanel() only ever gates CREATION, so
    // a panel that already exists needs its own check here to actually
    // disappear and stop showing pin data once access is pulled.
    if (!isEditorAllowed()) {
      panelEl.classList.add("hidden");
      panelEl.innerHTML = "";
      return;
    }

    // The popup is parented to <body>, so wiping the panel below would
    // otherwise leave it floating over the map with nothing to close it.
    closePinSortPop();

    const st = loadSettings();
    const localPins = loadPins();
    const allPins = loadAllPins();
    const collapsed = panelEl.classList.contains("collapsed");
    const activeReminders = localPins.filter((p) => p.reminderAt && !p.reminderDone).length;

    panelEl.classList.toggle("hidden", !st.showPanel || allPins.length === 0);
    panelEl.classList.toggle("theme-light", isLightTheme());

    panelEl.innerHTML = "";

    if (collapsed) {
      const bubble = document.createElement("div");
      bubble.className = "wmeRcPinsBubble";
      const sharedPins = allPins.filter((p) => p.shared);
      const seenIds = loadSeenSharedPinIds();
      const newPinsCount = sharedPins.filter((p) => !seenIds.has(String(p.id))).length;
      bubble.title = newPinsCount
        ? `${newPinsCount} ${newPinsCount === 1 ? T("new pin") : T("new pins")} — ${T("click to expand")}`
        : `${allPins.length} ${allPins.length === 1 ? T("pin") : T("pins")} — ${T("click to expand")}`;

      const img = document.createElement("img");
      img.className = "wmeRcPinsBubbleImg";
      img.src = PIN_LOGO_URL;
      img.alt = T("Pins");
      img.draggable = false;
      bubble.appendChild(img);

      // Shows how many community pins haven't been seen yet, not the
      // total pin count — the badge is meant to draw attention to what's
      // new, and a running total doesn't tell the user anything actionable.
      // Hidden entirely when there's nothing new, same as the reminder dot
      // below only appearing when there's something pending.
      if (newPinsCount) {
        const count = document.createElement("div");
        count.className = "wmeRcPinsBubbleCount";
        count.textContent = newPinsCount > 99 ? "99+" : String(newPinsCount);
        bubble.appendChild(count);
      }

      if (activeReminders) {
        const dot = document.createElement("div");
        dot.className = "wmeRcPinsBubbleReminder";
        dot.title = `${activeReminders} ${activeReminders === 1 ? T("reminder pending") : T("reminders pending")}`;
        bubble.appendChild(dot);
      }

      // Acts as both the drag handle (ensurePinsPanel's drag listener looks
      // for .wmeRcPinsHdr) and the click-to-expand target.
      bubble.classList.add("wmeRcPinsHdr");
      bubble.addEventListener("click", (e) => {
        if (panelDidDrag) { panelDidDrag = false; return; }
        e.stopPropagation();
        expandPinsPanel();
      });

      panelEl.appendChild(bubble);
      return;
    }

    const hdr = document.createElement("div");
    hdr.className = "wmeRcPinsHdr";
    hdr.innerHTML = `<span>${T("Pins")}</span>
      <div class="wmeRcPinsHdrRight">
        <span class="wmeRcPinsCount">${allPins.length}</span>
        <div class="wmeRcPinsBtn wmeRcPinsSortBtn" title="${T("Sort pins")}">${ICONS.sort}</div>
        <div class="wmeRcPinsBtn wmeRcPinsRefreshBtn" title="${T("Refresh shared pins")}">${ICONS.refresh}</div>
        <div class="wmeRcPinsBtn" title="${T("Collapse")}">${ICONS.chevron}</div>
      </div>`;

    // ── Sort menu ──
    // Opening is delegated to openPinSortPop(), which keeps the popup's
    // state at module scope. That matters because the popup lives on
    // <body> (see the CSS note about the panel's overflow:hidden) rather
    // than inside the panel: a background re-render wipes the panel but
    // would NOT remove a popup parented elsewhere, so the teardown has to
    // be reachable from outside this render's closure.
    const sortBtn = hdr.querySelector(".wmeRcPinsSortBtn");
    sortBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (pinSortPop) { closePinSortPop(); return; }
      openPinSortPop(sortBtn);
    });
    const refreshBtn = hdr.querySelector(".wmeRcPinsRefreshBtn");
    refreshBtn.addEventListener("click", async (e) => {
      e.stopPropagation();
      if (sharedPinsLoading) return;
      refreshBtn.classList.add("spinning");
      await fetchSharedPins();
      refreshBtn.classList.remove("spinning");
    });
    hdr.querySelectorAll(".wmeRcPinsBtn").forEach((btn) => {
      // Every header button shares the .wmeRcPinsBtn class for styling,
      // but only the chevron collapses the panel — the others already
      // have their own handlers bound above.
      if (btn === refreshBtn || btn === sortBtn) return;
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        collapsePinsPanel();
      });
    });
    panelEl.appendChild(hdr);

    const list = document.createElement("div");
    list.className = "wmeRcPinsList wmeRcScroll";

    if (!allPins.length) {
      const empty = document.createElement("div");
      empty.className = "wmeRcPinsEmpty";
      empty.textContent = T("No pins yet");
      list.appendChild(empty);
    } else {
      // Sorting is applied per folder rather than to the flat list: the
      // folders are the grouping the user actually reads, so a global
      // sort followed by a split would produce the same visible order
      // anyway, only with more work.
      const sortMode = getPinSortMode();
      const sharedPins = sortPins(allPins.filter((p) => p.shared), sortMode);
      const myPinsWithReminder = sortPins(allPins.filter((p) => !p.shared && p.reminderAt && !p.reminderDone), sortMode);
      const myPinsPlain = sortPins(allPins.filter((p) => !p.shared && !(p.reminderAt && !p.reminderDone)), sortMode);
      const folderState = loadFolderState();

      list.appendChild(buildFolderEl({
        key: "shared",
        label: T("Pins for everyone"),
        pins: sharedPins,
        emptyLabel: T("No shared pins yet"),
        folderState,
      }));
      list.appendChild(buildFolderEl({
        key: "mine",
        label: T("My pins"),
        pins: myPinsPlain,
        emptyLabel: T("You have no pins yet"),
        folderState,
      }));
      list.appendChild(buildFolderEl({
        key: "reminders",
        label: T("My pins with reminder"),
        pins: myPinsWithReminder,
        emptyLabel: T("No pins with a reminder"),
        folderState,
      }));
    }

    panelEl.appendChild(list);
    updateCountdownBadges();

    // Re-attaches the SAME nodes (and their already-wired listeners) that
    // were detached by the innerHTML wipe at the top of this function —
    // see the panelResizeHandleEl declaration for why these aren't just
    // created fresh here. Only for the expanded panel: the collapsed
    // bubble returns early above and never reaches this line.
    if (panelResizeHandleEl) panelEl.appendChild(panelResizeHandleEl);
    if (panelResizeHandleLeftEl) panelEl.appendChild(panelResizeHandleLeftEl);
  }

  /* ------------------------------------------------------------------ *
   *  Reminders
   * ------------------------------------------------------------------ */

  const REMINDER_SOUND_OPTIONS = [
    { id: "mute", label: "(no sound)" },
    { id: "gentle", label: "Gentle chime" },
    { id: "bright", label: "Bright ping" },
    { id: "double", label: "Double chime" },
  ];

  function normalizeReminderSoundId(id) {
    const v = String(id || "").trim();
    return REMINDER_SOUND_OPTIONS.some((o) => o.id === v) ? v : "gentle";
  }

  const REMINDER_SOUND_KEY = `${SCRIPT_ID}:reminderSound:v1`;

  function getReminderSoundId() {
    try { return normalizeReminderSoundId(localStorage.getItem(REMINDER_SOUND_KEY)); } catch { return "gentle"; }
  }

  function setReminderSoundId(id) {
    try { localStorage.setItem(REMINDER_SOUND_KEY, normalizeReminderSoundId(id)); } catch {}
  }

  let lastBellAt = 0;

  function playReminderSound(soundId, opts = {}) {
    const now = Date.now();
    if (!opts.force && now - lastBellAt < 900) return;
    lastBellAt = now;

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = playReminderSound._ctx || (playReminderSound._ctx = new AudioCtx());
      try { if (ctx.state === "suspended") ctx.resume(); } catch {}

      const id = normalizeReminderSoundId(soundId || getReminderSoundId());
      if (id === "mute") return;

      const t0 = ctx.currentTime + 0.01;
      const master = ctx.createGain();
      master.gain.setValueAtTime(0.7, t0);
      master.connect(ctx.destination);

      const tone = (freq, offset, dur, peak) => {
        const start = t0 + offset;
        const gain = ctx.createGain();
        const osc = ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(Math.max(0.001, peak), start + Math.min(0.018, dur * 0.12));
        gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
        osc.connect(gain);
        gain.connect(master);
        osc.start(start);
        osc.stop(start + dur + 0.03);
      };

      if (id === "gentle") { tone(659.25, 0, 0.8, 0.11); tone(783.99, 0.18, 0.7, 0.08); }
      else if (id === "bright") { tone(1046.5, 0, 0.5, 0.10); tone(1568, 0.03, 0.36, 0.035); }
      else if (id === "double") { tone(880, 0, 0.5, 0.11); tone(1046.5, 0.28, 0.58, 0.10); }
    } catch {}
  }

  async function ensureNotificationPermission() {
    try {
      if (!("Notification" in window)) return false;
      if (Notification.permission === "granted") return true;
      if (Notification.permission === "denied") return false;
      return (await Notification.requestPermission()) === "granted";
    } catch { return false; }
  }

  function showDesktopNotification(pin) {
    try {
      const st = loadSettings();
      if (!st.desktopNotifications) return;
      if (!("Notification" in window) || Notification.permission !== "granted") return;
      const n = new Notification(pin.name || T("Pin reminder"), {
        body: pin.reminderNote || T("Reminder for your pinned place"),
        tag: `${SCRIPT_ID}-${pin.id}`,
      });
      n.onclick = () => {
        try { window.focus(); } catch {}
        centerMapOn(pin.lon, pin.lat, pin.zoom || 17);
        try { n.close(); } catch {}
      };
    } catch {}
  }

  async function sendWebhookNotification(pin) {
    try {
      const st = loadSettings();
      if (!st.webhookEnabled || !st.webhookUrl) return;
      const payload = {
        type: "wme_pin_reminder",
        title: T("WME Pin Reminder"),
        message: pin.reminderNote ? `${T("Reminder")}: ${pin.name} — ${pin.reminderNote}` : `${T("Reminder")}: ${pin.name}`,
        pin: { id: pin.id, name: pin.name, lat: pin.lat, lon: pin.lon },
        ts: Date.now(),
      };
      // Same CSP situation as the shared-pins database: a page-context
      // fetch() to an arbitrary user-supplied host is blocked by Waze's
      // connect-src policy. GM_xmlhttpRequest runs outside the page and
      // is unaffected — the userscript manager will prompt the user to
      // approve this specific host the first time, since it isn't (and
      // can't be, being user-configurable) in the script's static
      // @connect list.
      await gmFetch(st.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).catch((err) => dlog("sendWebhookNotification failed", err));
    } catch {}
  }

  // Quiet hours support a range that wraps past midnight (e.g. 22:00–07:00).
  function isWithinQuietHours(date = new Date()) {
    const st = loadSettings();
    if (!st.quietHoursEnabled) return false;
    const [sh, sm] = String(st.quietHoursStart || "22:00").split(":").map(Number);
    const [eh, em] = String(st.quietHoursEnd || "07:00").split(":").map(Number);
    if (![sh, sm, eh, em].every(Number.isFinite)) return false;
    const nowMin = date.getHours() * 60 + date.getMinutes();
    const startMin = sh * 60 + sm;
    const endMin = eh * 60 + em;
    if (startMin === endMin) return false;
    if (startMin < endMin) return nowMin >= startMin && nowMin < endMin;
    return nowMin >= startMin || nowMin < endMin; // wraps past midnight
  }

  function repeatMs(pin) {
    const n = Number(pin?.repeatEvery) || 0;
    if (n <= 0) return 0;
    const unit = pin.repeatUnit || "days";
    const mult = unit === "hours" ? 3600000 : unit === "weeks" ? 7 * 86400000 : 86400000;
    return n * mult;
  }

  function formatCountdown(reminderAt) {
    const ms = Number(reminderAt) - Date.now();
    if (!Number.isFinite(ms) || ms <= 0) return "00:00";
    const totalSec = Math.max(0, Math.ceil(ms / 1000));
    const day = 86400;
    if (totalSec >= day) {
      const days = Math.floor(totalSec / day);
      // Was hard-coded English ("3 days") while the rest of the panel —
      // including formatExpiryIn() right below, which has always done
      // this correctly — is PT-PT. The "day"/"days" keys already existed
      // in STRINGS_PT; this was simply not using them.
      return `${days} ${days === 1 ? T("day") : T("days")}`;
    }
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return h > 0
      ? `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
      : `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  // Date-granularity display for a shared pin's expiry — deliberately
  // coarser than formatCountdown's HH:MM:SS, since an expiry set in whole
  // days/weeks doesn't need second-level precision shown back to the user.
  function formatExpiryIn(expiresAt) {
    const ms = Number(expiresAt) - Date.now();
    if (!Number.isFinite(ms)) return "";
    if (ms <= 0) return T("expiring soon");
    const totalHours = Math.ceil(ms / 3600000);
    if (totalHours < 24) {
      return `${T("in")} ${totalHours}h`;
    }
    const days = Math.ceil(totalHours / 24);
    return `${T("in")} ${days} ${days === 1 ? T("day") : T("days")}`;
  }

  let countdownTimer = null;

  function updateCountdownBadges() {
    if (!panelEl) return;
    const badges = panelEl.querySelectorAll(".wmeRcPinCountdown");
    if (!badges.length) { stopCountdownLoop(); return; }
    badges.forEach((el) => {
      const at = Number(el.dataset.reminderAt);
      if (!Number.isFinite(at)) return;
      el.textContent = formatCountdown(at) + (el.dataset.repeatTxt || "");
    });
    // Deliberately does NOT call checkRemindersNow() here. This function
    // runs from renderPinsPanel(), and firing a reminder re-enters
    // renderPinsPanel() via updatePin -> savePins, so the old coupling
    // caused a nested redundant re-render every time a due reminder was
    // painted. Firing is already owned by the 1.5s reminder sweep and the
    // per-pin setTimeout, both of which are independent of rendering.
    startCountdownLoop();
  }

  function startCountdownLoop() {
    if (countdownTimer) return;
    countdownTimer = setInterval(() => {
      if (!panelEl || !panelEl.querySelector(".wmeRcPinCountdown")) { stopCountdownLoop(); return; }
      updateCountdownBadges();
    }, 1000);
  }

  function stopCountdownLoop() {
    if (!countdownTimer) return;
    clearInterval(countdownTimer);
    countdownTimer = null;
  }

  const reminderTimers = new Map();
  const firedReminderIds = new Set();
  let reminderLoopTimer = null;
  let missedCheckedOnce = false;

  function clearReminderTimer(id) {
    const t = reminderTimers.get(String(id));
    if (t) clearTimeout(t);
    reminderTimers.delete(String(id));
  }

  function scheduleReminderTimer(pin) {
    if (!pin || !pin.id) return;
    clearReminderTimer(pin.id);
    if (!pin.reminderAt || pin.reminderDone) return;
    const delay = Math.max(0, Math.min(0x7fffffff, pin.reminderAt - Date.now()));
    const t = setTimeout(() => triggerReminder(String(pin.id), pin.reminderAt), delay);
    reminderTimers.set(String(pin.id), t);
  }

  function scheduleAllReminderTimers() {
    for (const p of loadPins()) scheduleReminderTimer(p);
  }

  function triggerReminder(id, expectedAt) {
    const pin = loadPins().find((p) => p.id === id);
    if (!pin || !pin.reminderAt || pin.reminderDone) return;
    if (expectedAt != null && Number(expectedAt) !== Number(pin.reminderAt)) return;
    if (pin.reminderAt > Date.now()) { scheduleReminderTimer(pin); return; }
    if (firedReminderIds.has(id)) return;
    firedReminderIds.add(id);

    const quiet = isWithinQuietHours();
    showReminderNotice(pin, { silent: quiet });
    if (!quiet) {
      showDesktopNotification(pin);
      sendWebhookNotification(pin);
    }

    const every = repeatMs(pin);
    if (every > 0) {
      // Recurring: schedule the next occurrence instead of marking done.
      // Skip forward past any already-elapsed occurrences (e.g. laptop
      // was asleep for several cycles) rather than firing a burst of them.
      let next = pin.reminderAt + every;
      const now = Date.now();
      while (next <= now) next += every;
      firedReminderIds.delete(id);
      updatePin(id, { reminderAt: next, reminderDone: false });
    } else {
      updatePin(id, { reminderDone: true });
    }
  }

  function checkRemindersNow() {
    // Runs every 1.5s for the whole session, and used to JSON.parse the
    // entire pins array each time even for users with no reminders at all.
    // reminderTimers holds one entry per armed reminder, so an empty map
    // is a reliable, allocation-free "nothing to do" signal. The map is
    // repopulated by scheduleAllReminderTimers()/updatePin() whenever a
    // reminder is created, so this can't cause a missed fire.
    if (!reminderTimers.size) return;
    const now = Date.now();
    for (const p of loadPins()) {
      if (p.reminderAt && !p.reminderDone && p.reminderAt <= now) triggerReminder(p.id, p.reminderAt);
    }
  }

  function handleMissedRemindersOnStart() {
    const now = Date.now();
    const pins = loadPins();
    const missed = pins.filter((p) => p.reminderAt && !p.reminderDone && p.reminderAt <= now - 2000);
    if (!missed.length) return;
    for (const p of missed) updatePin(p.id, { reminderDone: true });
    showReminderNotice(missed[0], { title: T("Missed reminder"), silent: true });
  }

  function startReminderLoop() {
    if (reminderLoopTimer) return;
    if (!missedCheckedOnce) { missedCheckedOnce = true; handleMissedRemindersOnStart(); }
    reminderLoopTimer = setInterval(checkRemindersNow, 1500);
    // Order matters: scheduleAllReminderTimers() populates reminderTimers,
    // and checkRemindersNow() early-outs on an empty reminderTimers map.
    // Checking first would make this initial sweep a no-op and delay an
    // already-overdue reminder by up to one full 1.5s tick.
    scheduleAllReminderTimers();
    checkRemindersNow();
  }

  let noticeStack = null;

  function ensureNoticeStack() {
    if (noticeStack && document.contains(noticeStack)) return noticeStack;
    noticeStack = document.createElement("div");
    noticeStack.className = "wmeRcNoticeStack";
    (document.body || document.documentElement).appendChild(noticeStack);
    return noticeStack;
  }

  function showReminderNotice(pin, opts = {}) {
    if (!pin) return;
    ensureCss();
    const stack = ensureNoticeStack();
    const light = isLightTheme();

    const card = document.createElement("div");
    card.className = "wmeRcNotice" + (light ? " theme-light" : "");

    const title = opts.title || T("Reminder");
    const note = String(pin.reminderNote || "").trim();

    card.innerHTML = `
      <div class="wmeRcNoticeHead">
        <div class="wmeRcNoticeIco">${ICONS.bell}</div>
        <div class="wmeRcNoticeText">
          <div class="wmeRcNoticeTitle">${title}</div>
          <div class="wmeRcNoticeMsg"></div>
        </div>
        <div class="wmeRcNoticeX">${ICONS.close}</div>
      </div>
      ${note ? `<div class="wmeRcNoticeNote"></div>` : ""}
      <div class="wmeRcNoticeActions">
        <div class="wmeRcBtn wmeRcNoticeSnooze">${T("Snooze")}</div>
        <div class="wmeRcBtn wmeRcNoticeDismiss">${T("Dismiss")}</div>
        <div class="wmeRcBtn primary wmeRcNoticeGo">${T("Go there")}</div>
      </div>
    `;
    card.querySelector(".wmeRcNoticeMsg").textContent = pin.name || T("Pinned place");
    if (note) card.querySelector(".wmeRcNoticeNote").textContent = note;

    const close = () => {
      try { closeSnoozePopover(); } catch {}
      card.classList.remove("show");
      setTimeout(() => card.remove(), 200);
    };

    const snoozeBy = (mins) => {
      const m = Math.max(1, Math.round(Number(mins) || 0));
      updatePin(pin.id, { reminderAt: Date.now() + m * 60000, reminderDone: false });
      firedReminderIds.delete(String(pin.id));
      toast(`${T("Snoozed")} ${m} ${T("min")}`);
      close();
    };

    let snoozePop = null;
    const closeSnoozePopover = () => {
      try { snoozePop?.remove(); } catch {}
      snoozePop = null;
      try { document.removeEventListener("pointerdown", onSnoozeOutside, true); } catch {}
    };
    const onSnoozeOutside = (ev) => {
      if (snoozePop && (snoozePop === ev.target || snoozePop.contains(ev.target))) return;
      // The Snooze BUTTON has to be excluded too, or it can never close
      // the popover it opened: this listener runs on pointerdown in the
      // CAPTURE phase, so it fired first, closed the popover and nulled
      // snoozePop — and then the button's own click handler saw a null
      // snoozePop and immediately reopened it. Letting the button's
      // handler own the toggle is what makes a second click close it.
      if (snoozeBtn && (snoozeBtn === ev.target || snoozeBtn.contains(ev.target))) return;
      closeSnoozePopover();
    };

    const snoozeBtn = card.querySelector(".wmeRcNoticeSnooze");
    snoozeBtn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      if (snoozePop) { closeSnoozePopover(); return; }
      snoozePop = document.createElement("div");
      snoozePop.className = "wmeRcSnoozePop" + (light ? " theme-light" : "");
      snoozePop.innerHTML = `
        <div class="wmeRcSnoozeGrid">
          <div class="wmeRcSnoozeChip" data-m="5">5m</div>
          <div class="wmeRcSnoozeChip" data-m="10">10m</div>
          <div class="wmeRcSnoozeChip" data-m="15">15m</div>
          <div class="wmeRcSnoozeChip" data-m="30">30m</div>
          <div class="wmeRcSnoozeChip" data-m="60">1h</div>
          <div class="wmeRcSnoozeChip" data-m="1440">${T("1 day")}</div>
        </div>
        <div class="wmeRcSnoozeCustomRow">
          <input type="number" min="1" step="1" class="wmeRcInput wmeRcSnoozeCustom" placeholder="${T("Custom minutes")}">
          <div class="wmeRcBtn primary wmeRcSnoozeGo">${T("Go")}</div>
        </div>
      `;
      snoozePop.querySelectorAll(".wmeRcSnoozeChip").forEach((chip) => {
        chip.addEventListener("click", () => snoozeBy(Number(chip.dataset.m)));
      });
      const customInp = snoozePop.querySelector(".wmeRcSnoozeCustom");
      const doCustom = () => {
        const v = Number(customInp.value);
        if (Number.isFinite(v) && v > 0) snoozeBy(v);
        else toast(T("Enter minutes"));
      };
      snoozePop.querySelector(".wmeRcSnoozeGo").addEventListener("click", doCustom);
      customInp.addEventListener("keydown", (e) => { if (e.key === "Enter") doCustom(); });
      card.appendChild(snoozePop);
      setTimeout(() => document.addEventListener("pointerdown", onSnoozeOutside, true), 0);
    });

    card.querySelector(".wmeRcNoticeX").addEventListener("click", close);
    card.querySelector(".wmeRcNoticeDismiss").addEventListener("click", close);
    card.querySelector(".wmeRcNoticeGo").addEventListener("click", () => {
      centerMapOn(pin.lon, pin.lat, pin.zoom || 17);
      close();
    });

    stack.appendChild(card);
    requestAnimationFrame(() => card.classList.add("show"));

    if (!opts.silent) playReminderSound(getReminderSoundId());
  }

  function pad2(n) { return String(n).padStart(2, "0"); }

  function openReminderModal(pinId) {
    const pin = loadPins().find((p) => p.id === String(pinId));
    if (!pin) return;

    const hasActive = !!(pin.reminderAt && !pin.reminderDone);
    let mode = "in";
    let inValue = 30;
    let inUnit = "minutes";

    const now = new Date(Date.now() + 30 * 60000);
    let atDate = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
    let atTime = `${pad2(now.getHours())}:${pad2(now.getMinutes())}`;

    if (hasActive) {
      const d = new Date(pin.reminderAt);
      mode = "at";
      atDate = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
      atTime = `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
    }

    openModal({
      title: T("Reminder"),
      icon: ICONS.bell,
      build: ({ body, close }) => {
        const sub = document.createElement("div");
        sub.className = "wmeRcHint";
        sub.textContent = pin.name;
        body.appendChild(sub);

        const tabs = document.createElement("div");
        tabs.className = "wmeRcTabs";
        tabs.innerHTML = `<div class="wmeRcTab" data-m="in">${T("In")}</div><div class="wmeRcTab" data-m="at">${T("At")}</div>`;
        body.appendChild(tabs);

        const inRow = document.createElement("div");
        inRow.className = "wmeRcRow";
        inRow.innerHTML = `
          <input type="number" min="1" step="1" class="wmeRcInput wmeRcInValue" style="max-width:100px;">
          <select class="wmeRcInput wmeRcInUnit" style="max-width:140px;">
            <option value="minutes">${T("minutes")}</option>
            <option value="hours">${T("hours")}</option>
          </select>
        `;

        const atRow = document.createElement("div");
        atRow.className = "wmeRcRow";
        atRow.innerHTML = `
          <input type="date" class="wmeRcInput wmeRcAtDate">
          <input type="time" class="wmeRcInput wmeRcAtTime">
        `;

        const inValueEl = inRow.querySelector(".wmeRcInValue");
        const inUnitEl = inRow.querySelector(".wmeRcInUnit");
        inValueEl.value = String(inValue);
        inUnitEl.value = inUnit;
        inValueEl.addEventListener("input", () => { inValue = Math.max(1, Number(inValueEl.value) || 1); });
        inUnitEl.addEventListener("change", () => { inUnit = inUnitEl.value; });

        const atDateEl = atRow.querySelector(".wmeRcAtDate");
        const atTimeEl = atRow.querySelector(".wmeRcAtTime");
        atDateEl.value = atDate;
        atTimeEl.value = atTime;
        atDateEl.addEventListener("input", () => { atDate = atDateEl.value; });
        atTimeEl.addEventListener("input", () => { atTime = atTimeEl.value; });

        body.appendChild(inRow);
        body.appendChild(atRow);

        const noteLbl = document.createElement("div");
        noteLbl.className = "wmeRcHint";
        noteLbl.textContent = T("Note (optional)");
        body.appendChild(noteLbl);

        const noteInp = document.createElement("textarea");
        noteInp.className = "wmeRcInput";
        noteInp.rows = 2;
        noteInp.style.resize = "none";
        noteInp.value = pin.reminderNote || "";
        body.appendChild(noteInp);

        const repeatLbl = document.createElement("div");
        repeatLbl.className = "wmeRcHint";
        repeatLbl.textContent = T("Repeat (optional)");
        body.appendChild(repeatLbl);

        const repeatRow = document.createElement("div");
        repeatRow.className = "wmeRcRow";
        repeatRow.innerHTML = `
          <input type="number" min="0" step="1" class="wmeRcInput wmeRcRepeatEvery" style="max-width:100px;" placeholder="${T("0 = never")}">
          <select class="wmeRcInput wmeRcRepeatUnit" style="max-width:140px;">
            <option value="hours">${T("hours")}</option>
            <option value="days">${T("days")}</option>
            <option value="weeks">${T("weeks")}</option>
          </select>
        `;
        const repeatEveryEl = repeatRow.querySelector(".wmeRcRepeatEvery");
        const repeatUnitEl = repeatRow.querySelector(".wmeRcRepeatUnit");
        repeatEveryEl.value = String(pin.repeatEvery || 0);
        repeatUnitEl.value = pin.repeatUnit || "days";
        body.appendChild(repeatRow);

        const repeatHint = document.createElement("div");
        repeatHint.className = "wmeRcHint";
        repeatHint.textContent = T("e.g. every 7 days — the reminder reschedules itself after firing instead of stopping.");
        body.appendChild(repeatHint);

        const soundLbl = document.createElement("div");
        soundLbl.className = "wmeRcHint";
        soundLbl.textContent = T("Sound");
        body.appendChild(soundLbl);

        const soundSel = document.createElement("select");
        soundSel.className = "wmeRcInput";
        for (const o of REMINDER_SOUND_OPTIONS) {
          const opt = document.createElement("option");
          opt.value = o.id;
          opt.textContent = T(o.label);
          soundSel.appendChild(opt);
        }
        soundSel.value = getReminderSoundId();
        soundSel.addEventListener("change", () => setReminderSoundId(soundSel.value));
        body.appendChild(soundSel);

        const setMode = (m) => {
          mode = m;
          tabs.querySelectorAll(".wmeRcTab").forEach((t) => t.classList.toggle("on", t.dataset.m === m));
          inRow.style.display = m === "in" ? "flex" : "none";
          atRow.style.display = m === "at" ? "flex" : "none";
        };
        tabs.querySelectorAll(".wmeRcTab").forEach((t) => t.addEventListener("click", () => setMode(t.dataset.m)));
        setMode(mode);

        const actions = document.createElement("div");
        actions.className = "wmeRcActions";
        actions.style.justifyContent = "space-between";

        const clearBtn = document.createElement("div");
        clearBtn.className = "wmeRcBtn danger";
        clearBtn.textContent = T("Clear");
        clearBtn.style.display = hasActive ? "" : "none";
        clearBtn.addEventListener("click", () => {
          updatePin(pin.id, { reminderAt: null, reminderDone: false, reminderNote: "", repeatEvery: 0, repeatUnit: "days" });
          toast(T("Reminder cleared"));
          close();
        });

        const right = document.createElement("div");
        right.style.display = "flex";
        right.style.gap = "9px";

        const cancel = document.createElement("div");
        cancel.className = "wmeRcBtn";
        cancel.textContent = T("Cancel");
        cancel.addEventListener("click", close);

        const save = document.createElement("div");
        save.className = "wmeRcBtn primary";
        save.textContent = T("Set reminder");
        save.addEventListener("click", async () => {
          let when = null;
          if (mode === "in") {
            const mins = inUnit === "hours" ? inValue * 60 : inValue;
            when = Date.now() + mins * 60000;
          } else {
            const t = new Date(`${atDate}T${atTime}:00`).getTime();
            if (!Number.isFinite(t)) { toast(T("Pick a valid date and time")); return; }
            if (t <= Date.now() + 5000) { toast(T("Pick a time in the future")); return; }
            when = t;
          }
          updatePin(pin.id, {
            reminderAt: when,
            reminderDone: false,
            reminderNote: noteInp.value.trim(),
            repeatEvery: Math.max(0, Number(repeatEveryEl.value) || 0),
            repeatUnit: repeatUnitEl.value,
          });
          toast(T("Reminder set"));
          await ensureNotificationPermission();
          close();
        });

        right.appendChild(cancel);
        right.appendChild(save);
        actions.appendChild(clearBtn);
        actions.appendChild(right);
        body.appendChild(actions);
      },
    });
  }

  /* ------------------------------------------------------------------ *
   *  Pins: create dialog
   * ------------------------------------------------------------------ */

  // ─── Closures panel ──────────────────────────────────────────────────
  // Same field set as WazePT Fechos, rebuilt on this script's modal shell
  // and design tokens. "Guardar automaticamente ao aplicar" is deliberately
  // absent here — it now lives in the sidebar settings.
  //
  // segmentId (optional) is the segment under the cursor at right-click
  // time — same flow as the speed bump / stop light items: hover a
  // segment, pick the action, done. Deliberately does NOT call
  // sdk.Editing.setSelection(): that IS WME's real selection, so setting
  // it would also pop open WME's own native segment editor panel as a
  // side effect — exactly what right-clicking a segment you never
  // left-clicked is supposed to avoid. Instead the segment is tracked as
  // an explicit override that getClosureSelection() (and therefore
  // applyRoadClosure) reads directly, with no visible effect on WME's own
  // UI. If no segmentId is given, the panel just reads whatever selection
  // already exists — including WME's native panel already being open for
  // it, which is expected when the user picked it themselves.
  // Accepts a single segment id or an array of them — the array case is
  // what makes "select several segments, right-click one of them" target
  // the whole selection instead of only the segment under the cursor.
  function actionOpenClosures(segmentIdOrIds) {
    if (!isEditorAllowed()) {
      toast(T("This feature is restricted to editors on the approved list."));
      return;
    }
    // Number(null) and Number(undefined) are 0 and NaN respectively — 0
    // is finite, so a bare Number.isFinite filter let a null/undefined
    // entry through as a bogus "segment 0". That happened on every
    // "closures with nothing hovered and nothing selected" call, because
    // closureTargetIds() legitimately returns null for that case to mean
    // "no explicit target, read WME's live selection instead" — but null
    // was reaching this filter and surviving it. The panel then showed
    // one selected segment named "Unnamed" instead of the empty state,
    // since segment id 0 doesn't exist and getAddress() for it fails.
    // Filtering out null/undefined BEFORE the Number() coercion is what
    // makes an absent target actually mean absent.
    const targets = (Array.isArray(segmentIdOrIds) ? segmentIdOrIds : [segmentIdOrIds])
      .filter((v) => v !== null && v !== undefined)
      .map(Number)
      .filter(Number.isFinite);
    closureExplicitTargetIds = targets.length ? Array.from(new Set(targets)) : null;
    if (closureExplicitTargetIds) dlog("actionOpenClosures: explicit target", closureExplicitTargetIds);

    const st = loadSettings();

    // Deliberately NOT rounded up to the next 5-minute block. Opening the
    // panel at 22:33 and getting a start of 22:35 means the road is left
    // open for two minutes it was meant to be shut — the honest default
    // is the moment the editor decided to close it.
    const now = new Date();
    now.setSeconds(0, 0);
    const tomorrow = new Date(now.getTime() + 24 * 3600 * 1000);
    // The single-closure End field defaults to the END OF THE SAME
    // calendar day as Start, not "this time tomorrow": a Start of 2 Nov
    // should default to an End that's still 2 Nov, not roll into 3 Nov
    // just because the default span is measured in hours (24h) rather
    // than in days. Only used by the "Simples" pane's End datetime —
    // Weekly's own "To" field is a different concept (the calendar range
    // a RECURRING closure spans, typically weeks or months) and keeps
    // using `tomorrow`.
    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 0, 0);
    // Edge case: opening the panel in the last minute of the day (23:59)
    // leaves no time left to offer a positive same-day duration — `now`
    // is already floored to the minute above, so at 23:59 exactly the
    // two would be equal. Falls back to +1h in that one-minute sliver
    // rather than handing the user a zero/negative default duration.
    if (endOfToday <= now) endOfToday.setTime(now.getTime() + 3600 * 1000);

    let mode = st.closureMode || "simples";
    let endModeSimple = st.closureEndModeSimple || "fim";
    let endModeWeekly = st.closureEndModeWeekly || "fim";
    let holidayMode = normalizeHolidayMode(st.closureHolidayMode);
    let weekdays = Array.isArray(st.closureWeekdays) && st.closureWeekdays.length === 7
      ? st.closureWeekdays.slice()
      : [false, true, true, true, true, true, false];

    openModal({
      title: T("Closures"),
      icon: ICONS.closure,
      posKey: "closures",
      onClose: () => { closureExplicitTargetIds = null; },
      build: ({ body, close }) => {
        const el = (tag, cls, html) => {
          const e = document.createElement(tag);
          if (cls) e.className = cls;
          if (html != null) e.innerHTML = html;
          return e;
        };

        // Selection strip
        const selStrip = el("div", "wmeRcClSel", `<span class="wmeRcClDot"></span><span class="wmeRcClSelText"></span>`);
        body.appendChild(selStrip);

        // Description
        // Read from settings (with the old hard-coded value as fallback)
        // so the sidebar can override it per editor. Read once, here, at
        // open time: changing it mid-dialog would leave the toggle's own
        // "did the user type over it?" comparison pointing at stale text.
        const CLOSURE_QUICK_DESCRIPTION =
          String(st.closureQuickDescription || "").trim() || DEFAULT_QUICK_DESCRIPTION;

        // Label and the quick-description toggle share one row (same
        // pattern as the "End" row's duration/end-time pill) instead of
        // the toggle sitting in its own row below the input — that, plus
        // dropping the preview line entirely, is what actually saves the
        // vertical space this was asked for. The full text is still one
        // click away by just turning the toggle on; a preview of it
        // wasn't earning its line.
        //
        // All three pieces — the "Description" label, "Use previous",
        // and "Use quick description" — sit on this ONE row, in that
        // left-to-right order, rather than "Use previous" getting a row
        // of its own below. Both toggle groups are wrapped together in
        // descTogglesWrap so justify-content:space-between on the row
        // still only ever sees two children (the label and this group),
        // keeping the label pinned left and the pair of toggles pinned
        // right as a unit.
        const descLblRow = el("div", "wmeRcClLblRow");
        const descLbl = el("div", "wmeRcClLbl");
        descLbl.style.margin = "0";
        descLbl.textContent = T("Description");
        descLblRow.appendChild(descLbl);

        const descTogglesWrap = el("div");
        descTogglesWrap.style.display = "flex";
        descTogglesWrap.style.alignItems = "center";
        descTogglesWrap.style.gap = "14px";
        descLblRow.appendChild(descTogglesWrap);

        // Reusing whatever description text the LAST successfully-applied
        // closure used — a different source than the fixed
        // quick-description text below, so it's its own toggle rather
        // than folded into that one. Read once at open time, same
        // reasoning as CLOSURE_QUICK_DESCRIPTION: a value that could
        // change mid-dialog would leave the toggle's own "did the user
        // type over it?" check comparing against stale text.
        const CLOSURE_LAST_DESCRIPTION = loadLastClosureDescription();
        let descPrevOn = false;
        const descPrevWrap = el("div");
        descPrevWrap.style.display = "flex";
        descPrevWrap.style.alignItems = "center";
        descPrevWrap.style.gap = "6px";
        const descPrevLbl = el("div");
        descPrevLbl.style.fontSize = "11px";
        descPrevLbl.style.fontWeight = "700";
        descPrevLbl.style.opacity = CLOSURE_LAST_DESCRIPTION ? "0.85" : "0.4";
        descPrevLbl.textContent = T("Use previous");
        const descPrevToggle = document.createElement("button");
        descPrevToggle.type = "button";
        descPrevToggle.className = "wmeRcToggle";
        // Nothing to reuse yet (first closure ever, or the value was
        // cleared) — disabled rather than hidden, so the control is
        // still there to explain itself via the title, not a mystery
        // gap that appears later.
        if (!CLOSURE_LAST_DESCRIPTION) {
          descPrevToggle.classList.add("is-disabled");
          descPrevWrap.title = T("No previous description to reuse yet");
        }
        descPrevWrap.appendChild(descPrevLbl);
        descPrevWrap.appendChild(descPrevToggle);
        descTogglesWrap.appendChild(descPrevWrap);

        // Not persisted: this is a one-shot fill for THIS closure, not a
        // standing preference — leaving it "on" across closures would
        // silently overwrite whatever the user types next time they open
        // the panel with something else in mind.
        let descQuickOn = false;
        const descQuickWrap = el("div");
        descQuickWrap.style.display = "flex";
        descQuickWrap.style.alignItems = "center";
        descQuickWrap.style.gap = "6px";
        const descQuickLbl = el("div");
        descQuickLbl.style.fontSize = "11px";
        descQuickLbl.style.fontWeight = "700";
        descQuickLbl.style.opacity = "0.85";
        descQuickLbl.textContent = T("Use quick description");
        const descQuickToggle = document.createElement("button");
        descQuickToggle.type = "button";
        descQuickToggle.className = "wmeRcToggle";
        descQuickWrap.appendChild(descQuickLbl);
        descQuickWrap.appendChild(descQuickToggle);
        descTogglesWrap.appendChild(descQuickWrap);
        body.appendChild(descLblRow);

        const descInp = document.createElement("input");
        descInp.type = "text";
        descInp.className = "wmeRcInput";
        descInp.maxLength = 100;
        descInp.placeholder = T("Reason for the closure");
        body.appendChild(descInp);

        descQuickToggle.addEventListener("click", () => {
          descQuickOn = !descQuickToggle.classList.contains("on");
          descQuickToggle.classList.toggle("on", descQuickOn);
          if (descQuickOn) {
            // Only one source can be filling the field at a time — turning
            // this on while "Use previous" is active would leave BOTH
            // toggles lit over text that only matches one of them.
            if (descPrevOn) { descPrevOn = false; descPrevToggle.classList.remove("on"); }
            descInp.value = CLOSURE_QUICK_DESCRIPTION;
          } else if (descInp.value === CLOSURE_QUICK_DESCRIPTION) {
            descInp.value = "";
          }
        });
        descPrevToggle.addEventListener("click", () => {
          if (!CLOSURE_LAST_DESCRIPTION) return; // is-disabled, but belt-and-braces against a stray click
          descPrevOn = !descPrevToggle.classList.contains("on");
          descPrevToggle.classList.toggle("on", descPrevOn);
          if (descPrevOn) {
            if (descQuickOn) { descQuickOn = false; descQuickToggle.classList.remove("on"); }
            descInp.value = CLOSURE_LAST_DESCRIPTION;
          } else if (descInp.value === CLOSURE_LAST_DESCRIPTION) {
            descInp.value = "";
          }
        });
        // Typing over either toggle's text (or clearing it) turns that
        // one off again, so it never silently re-fills something the
        // user just edited on purpose.
        descInp.addEventListener("input", () => {
          if (descQuickOn && descInp.value !== CLOSURE_QUICK_DESCRIPTION) {
            descQuickOn = false;
            descQuickToggle.classList.remove("on");
          }
          if (descPrevOn && descInp.value !== CLOSURE_LAST_DESCRIPTION) {
            descPrevOn = false;
            descPrevToggle.classList.remove("on");
          }
        });

        // Direction
        const dirLbl = el("div", "wmeRcClLbl");
        dirLbl.textContent = T("Direction");
        body.appendChild(dirLbl);
        const dirSel = document.createElement("select");
        dirSel.className = "wmeRcInput";
        dirSel.innerHTML = `
          <option value="${CLOSURE_DIR.TWO}">${T("Both directions")}</option>
          <option value="${CLOSURE_DIR.AtoB}">A &rArr; B</option>
          <option value="${CLOSURE_DIR.BtoA}">B &rArr; A</option>`;
        body.appendChild(dirSel);
        const dirHint = el("div", "wmeRcClHint warn");
        dirHint.style.display = "none";
        body.appendChild(dirHint);

        // Date mode tabs
        const modeLbl = el("div", "wmeRcClLbl");
        modeLbl.textContent = T("Date range");
        modeLbl.style.marginTop = "4px";
        body.appendChild(modeLbl);
        const modeTabs = el("div", "wmeRcTabs");
        const MODES = [
          { id: "simples", label: T("Single") },
          { id: "semanal", label: T("Weekly") },
          { id: "repetir", label: T("Repeat") },
        ];
        for (const m of MODES) {
          const tab = el("div", "wmeRcTab" + (m.id === mode ? " on" : ""));
          tab.textContent = m.label;
          tab.dataset.mode = m.id;
          modeTabs.appendChild(tab);
        }
        body.appendChild(modeTabs);

        // Builds a duration triple (days / hours / minutes)
        // Compact labels on the buttons themselves (space is tight — four
        // of them share one row via flex:1), full words in the tooltip
        // via `full`. "1 month" is a fixed 30 days, not a calendar month
        // (which has no fixed length) — these presets fill day/hour/
        // minute fields with a flat offset, so a calendar-aware month
        // has nothing meaningful to anchor to here.
        const CLOSURE_DURATION_PRESETS = [
          { label: "1h", full: T("1 hour"), days: 0, hours: 1, mins: 0 },
          { label: "1d", full: T("1 day"), days: 1, hours: 0, mins: 0 },
          { label: "1w", full: T("1 week"), days: 7, hours: 0, mins: 0 },
          { label: "1m", full: T("1 month"), days: 30, hours: 0, mins: 0 },
        ];

        const durationBlock = (prefix, dDays, dHours, dMins, withPresets) => {
          const wrap = el("div");
          wrap.style.marginTop = "6px";
          const row = el("div", "wmeRcClRow");
          row.innerHTML = `
            <div><label class="wmeRcClLbl">${T("Days")}</label>
              <input type="number" min="0" class="wmeRcInput" id="wmeRcCl-${prefix}dd" value="${dDays}"></div>
            <div><label class="wmeRcClLbl">${T("Hours")}</label>
              <input type="number" min="0" class="wmeRcInput" id="wmeRcCl-${prefix}dh" value="${dHours}"></div>
            <div><label class="wmeRcClLbl">${T("Minutes")}</label>
              <input type="number" min="0" class="wmeRcInput" id="wmeRcCl-${prefix}dm" value="${dMins}"></div>`;
          wrap.appendChild(row);

          if (withPresets) {
            const presetRow = el("div", "wmeRcClDays");
            presetRow.style.marginTop = "5px";
            for (const p of CLOSURE_DURATION_PRESETS) {
              const btn = document.createElement("button");
              btn.type = "button";
              btn.className = "wmeRcClDay";
              btn.textContent = p.label;
              btn.title = `${T("Set duration to")} ${p.full}`;
              btn.addEventListener("click", () => {
                const dd = row.querySelector(`#wmeRcCl-${prefix}dd`);
                const dh = row.querySelector(`#wmeRcCl-${prefix}dh`);
                const dm = row.querySelector(`#wmeRcCl-${prefix}dm`);
                if (dd) dd.value = String(p.days);
                if (dh) dh.value = String(p.hours);
                if (dm) dm.value = String(p.mins);
                setStatus("", "info");
                updateRepeatWarning();
              });
              presetRow.appendChild(btn);
            }
            wrap.appendChild(presetRow);
          }
          return wrap;
        };

        // ── Single ──
        const paneSimple = el("div");
        paneSimple.innerHTML = `
          <label class="wmeRcClLbl" style="margin-top:6px">${T("Start")}</label>
          <input type="datetime-local" class="wmeRcInput" id="wmeRcCl-start" value="${toDateTimeField(now)}">`;
        const simpleEndRow = el("div");
        simpleEndRow.innerHTML = `
          <div class="wmeRcClLblRow" style="margin-top:6px">
            <label class="wmeRcClLbl" style="margin:0">${T("End")}</label>
            <button type="button" class="wmeRcClToggleEnd" id="wmeRcCl-toggle-simple"></button>
          </div>`;
        const simpleEndInput = el("div");
        simpleEndInput.innerHTML = `<input type="datetime-local" class="wmeRcInput" id="wmeRcCl-end" value="${toDateTimeField(endOfToday)}">`;
        const simpleDurBlock = durationBlock("s-", 0, 24, 0, true);
        paneSimple.appendChild(simpleEndRow);
        paneSimple.appendChild(simpleEndInput);
        paneSimple.appendChild(simpleDurBlock);
        body.appendChild(paneSimple);

        // ── Weekly ──
        const paneWeekly = el("div");
        paneWeekly.innerHTML = `
          <div class="wmeRcClRow" style="margin-top:6px">
            <div><label class="wmeRcClLbl">${T("From (date)")}</label>
              <input type="date" class="wmeRcInput" id="wmeRcCl-wfrom" value="${toDayField(now)}"></div>
            <div><label class="wmeRcClLbl">${T("To")}</label>
              <input type="date" class="wmeRcInput" id="wmeRcCl-wto" value="${toDayField(tomorrow)}"></div>
          </div>`;
        const daysRow = el("div", "wmeRcClDays");
        CLOSURE_WEEKDAYS.forEach((name, dow) => {
          const b = document.createElement("button");
          b.type = "button";
          b.className = "wmeRcClDay" + (weekdays[dow] ? " on" : "");
          b.textContent = name;
          b.dataset.dow = String(dow);
          b.setAttribute("aria-pressed", String(!!weekdays[dow]));
          b.addEventListener("click", () => {
            weekdays[dow] = !weekdays[dow];
            b.classList.toggle("on", weekdays[dow]);
            b.setAttribute("aria-pressed", String(weekdays[dow]));
            const s = loadSettings(); s.closureWeekdays = weekdays.slice(); saveSettings(s);
            setStatus("", "info");
          });
          daysRow.appendChild(b);
        });
        paneWeekly.appendChild(daysRow);

        // ── Feriados ──
        // Same four options as WME Closures Toolkit. Only shown in the
        // weekly pane: the other two modes aren't day-of-calendar driven,
        // so "except holidays" has nothing meaningful to filter there.
        const holLbl = el("div", "wmeRcClLbl");
        holLbl.style.marginTop = "6px";
        holLbl.textContent = T("Public holidays");
        paneWeekly.appendChild(holLbl);
        const holSel = document.createElement("select");
        holSel.className = "wmeRcInput";
        holSel.innerHTML = `
          <option value="normal">${T("Ignore holidays")}</option>
          <option value="excepto">${T("Except holidays")}</option>
          <option value="apenas">${T("Holidays only")}</option>
          <option value="mais">${T("Plus holidays")}</option>`;
        holSel.value = holidayMode;
        holSel.addEventListener("change", () => {
          holidayMode = normalizeHolidayMode(holSel.value);
          const s = loadSettings(); s.closureHolidayMode = holidayMode; saveSettings(s);
          updateHolidayHint();
          setStatus("", "info");
        });
        paneWeekly.appendChild(holSel);
        const holHint = el("div", "wmeRcClHint");
        paneWeekly.appendChild(holHint);

        const weeklyStart = el("div");
        weeklyStart.innerHTML = `
          <label class="wmeRcClLbl" style="margin-top:6px">${T("Start time")}</label>
          <input type="time" class="wmeRcInput" id="wmeRcCl-wstart" value="21:00">`;
        paneWeekly.appendChild(weeklyStart);
        const weeklyEndRow = el("div");
        weeklyEndRow.innerHTML = `
          <div class="wmeRcClLblRow" style="margin-top:6px">
            <label class="wmeRcClLbl" style="margin:0">${T("End time")}</label>
            <button type="button" class="wmeRcClToggleEnd" id="wmeRcCl-toggle-weekly"></button>
          </div>`;
        const weeklyEndInput = el("div");
        weeklyEndInput.innerHTML = `<input type="time" class="wmeRcInput" id="wmeRcCl-wend" value="05:00">`;
        const weeklyDurBlock = durationBlock("w-", 0, 8, 0, true);
        paneWeekly.appendChild(weeklyEndRow);
        paneWeekly.appendChild(weeklyEndInput);
        paneWeekly.appendChild(weeklyDurBlock);
        const weeklyNote = el("div", "wmeRcClHint");
        weeklyNote.textContent = T("The closure repeats on each ticked day, between the two dates.");
        paneWeekly.appendChild(weeklyNote);
        body.appendChild(paneWeekly);

        // ── Repeat ──
        const paneRepeat = el("div");
        paneRepeat.innerHTML = `
          <label class="wmeRcClLbl" style="margin-top:6px">${T("Start")}</label>
          <input type="datetime-local" class="wmeRcInput" id="wmeRcCl-rstart" value="${toDateTimeField(now)}">
          <div class="wmeRcClRow" style="margin-top:6px">
            <div><label class="wmeRcClLbl">${T("Repeat")}</label>
              <input type="number" min="1" class="wmeRcInput" id="wmeRcCl-rtimes" value="5"></div>
            <div><label class="wmeRcClLbl">${T("Every")}</label>
              <input type="number" min="1" class="wmeRcInput" id="wmeRcCl-rint" value="1"></div>
            <div><label class="wmeRcClLbl">&nbsp;</label>
              <select class="wmeRcInput" id="wmeRcCl-runit">
                <option value="dias">${T("days")}</option>
                <option value="horas">${T("hours")}</option>
                <option value="minutos">${T("minutes")}</option>
              </select></div>
          </div>
          <label class="wmeRcClLbl" style="margin-top:6px">${T("Duration of each closure")}</label>`;
        const repeatDurBlock = durationBlock("r-", 0, 2, 0);
        paneRepeat.appendChild(repeatDurBlock);
        const repeatHint = el("div", "wmeRcClHint warn");
        repeatHint.style.display = "none";
        paneRepeat.appendChild(repeatHint);
        body.appendChild(paneRepeat);

        // Event + Source
        const evtLblRow = el("div", "wmeRcClLblRow");
        evtLblRow.style.marginTop = "4px";
        evtLblRow.innerHTML = `<label class="wmeRcClLbl" style="margin:0">${T("Event")}</label>`;
        const evtRefreshBtn = document.createElement("div");
        evtRefreshBtn.className = "wmeRcPinsBtn";
        evtRefreshBtn.title = T("Reload events from WME's Events tab");
        evtRefreshBtn.innerHTML = ICONS.refresh;
        evtRefreshBtn.style.width = "22px";
        evtRefreshBtn.style.height = "22px";
        evtLblRow.appendChild(evtRefreshBtn);
        body.appendChild(evtLblRow);
        const evtSel = document.createElement("select");
        evtSel.className = "wmeRcInput";
        body.appendChild(evtSel);
        const evtHint = el("div", "wmeRcClHint");
        // ⚠️ An event can be visible in this list and still make
        // addClosure fail with "not found in data model" — the internal
        // list this reads from isn't the same registry addClosure
        // validates against. (An earlier version of this comment
        // attributed that specific behaviour to "WME Closures Toolkit's
        // own field notes" — that attribution was wrong and unverified;
        // the string this checks for doesn't appear anywhere in that
        // script's source. Corrected here rather than repeated again.)
        //
        // This is also, separately, the exact failure a tester once hit
        // with an EMPTY list that never populated no matter how many
        // times they opened WME's Events tab and pressed refresh here:
        // the two registries can end up out of sync even when nothing
        // has thrown an error. EVT_HINT_DEFAULT is restored after every
        // successful refresh (see refreshEvents() below) rather than
        // being cleared to blank, so this guidance stays visible
        // whenever the list might not be showing everything it should —
        // not just the one time this dialog first opens.
        const EVT_HINT_DEFAULT = T("If applying with an event fails, open WME's own Events tab once, then press ↻ here and try again.");
        evtHint.textContent = EVT_HINT_DEFAULT;
        body.appendChild(evtHint);

        const srcLbl = el("div", "wmeRcClLbl");
        srcLbl.textContent = T("Source");
        body.appendChild(srcLbl);
        const srcSel = document.createElement("select");
        srcSel.className = "wmeRcInput";
        srcSel.disabled = true;
        body.appendChild(srcSel);
        const srcHint = el("div", "wmeRcClHint");
        body.appendChild(srcHint);

        // ── Node closures ("Cortes nos nós") ──────────────────────────
        // Ported from WME Closures Toolkit, including its □/■ diagrams:
        // the little four-knot picture is the fastest way to read what
        // each mode actually does, and reusing the exact same glyphs
        // means an editor who already uses that script recognises the
        // control instantly instead of having to re-learn it here.
        // Sits between Source and the toggles row, the same position it
        // occupies over there.
        const nodesLbl = el("div", "wmeRcClLbl");
        nodesLbl.textContent = T("Node closures");
        nodesLbl.title = T("Also close nodes: none, only those INSIDE the selection (avoids blocking adjacent streets), or all of them.");
        body.appendChild(nodesLbl);
        const nodesSel = document.createElement("select");
        nodesSel.className = "wmeRcInput";
        nodesSel.title = nodesLbl.title;
        nodesSel.innerHTML = `
          <option value="${CLOSURE_NODES.none}">${T("None (□—□—□—□)")}</option>
          <option value="${CLOSURE_NODES.inner}">${T("Inner nodes (□—■—■—□)")}</option>
          <option value="${CLOSURE_NODES.all}">${T("All (■—■—■—■)")}</option>`;
        // Remembered between openings the same way Direction/Ignore
        // traffic are — this is a standing editing preference, not a
        // per-closure decision, and re-picking it every time would be
        // busywork.
        nodesSel.value = String(normalizeClosureNodeMode(st.closureNodeMode));
        nodesSel.addEventListener("change", () => {
          const s = loadSettings();
          s.closureNodeMode = normalizeClosureNodeMode(nodesSel.value);
          saveSettings(s);
        });
        body.appendChild(nodesSel);

        // "Usar WazePT" and "Ignorar trânsito" side by side, label-only
        // (no description text), to take up less vertical space than the
        // two full description-carrying rows this used to be.
        const compactTogglesRow = el("div", "wmeRcClRow");
        compactTogglesRow.style.marginTop = "6px";

        const wazeptCol = el("div");
        wazeptCol.style.display = "flex";
        wazeptCol.style.alignItems = "center";
        wazeptCol.style.justifyContent = "flex-start";
        wazeptCol.style.gap = "8px";
        const wazeptLbl = el("div", "wmeRcSideTitle");
        wazeptLbl.style.fontWeight = "700";
        wazeptLbl.style.fontSize = "12px";
        wazeptLbl.textContent = T("Use WazePT");
        let useWazept = !!st.closureUseWazept;
        const wazeptToggle = document.createElement("button");
        wazeptToggle.type = "button";
        wazeptToggle.className = "wmeRcToggle" + (useWazept ? " on" : "");
        wazeptToggle.title = T("Keeps WazePT selected as the Source automatically, whenever it's available in this view.");
        wazeptToggle.addEventListener("click", () => {
          useWazept = !wazeptToggle.classList.contains("on");
          wazeptToggle.classList.toggle("on", useWazept);
          const s = loadSettings(); s.closureUseWazept = useWazept; saveSettings(s);
          if (useWazept) applyWazeptSourceIfAvailable();
        });
        wazeptCol.appendChild(wazeptLbl);
        wazeptCol.appendChild(wazeptToggle);

        // Toggle stays anchored to the right of its column (unchanged);
        // the LABEL moves next to it instead, so both flex-end together
        // rather than the label sitting far over on the left.
        const ignCol = el("div");
        ignCol.style.display = "flex";
        ignCol.style.alignItems = "center";
        ignCol.style.justifyContent = "flex-end";
        ignCol.style.gap = "8px";
        const ignLbl = el("div", "wmeRcSideTitle");
        ignLbl.style.fontWeight = "700";
        ignLbl.style.fontSize = "12px";
        ignLbl.textContent = T("Ignore traffic");
        let ignoreTraffic = !!st.closureIgnoreTraffic;
        const ignToggle = document.createElement("button");
        ignToggle.type = "button";
        ignToggle.className = "wmeRcToggle" + (ignoreTraffic ? " on" : "");
        ignToggle.title = T("Ignores traffic history when computing travel time — for a full closure.");
        ignToggle.addEventListener("click", () => {
          ignoreTraffic = !ignToggle.classList.contains("on");
          ignToggle.classList.toggle("on", ignoreTraffic);
          const s = loadSettings(); s.closureIgnoreTraffic = ignoreTraffic; saveSettings(s);
        });
        ignCol.appendChild(ignLbl);
        ignCol.appendChild(ignToggle);

        compactTogglesRow.appendChild(wazeptCol);
        compactTogglesRow.appendChild(ignCol);
        body.appendChild(compactTogglesRow);

        // Status + actions
        const statusEl = el("div", "wmeRcClStatus");
        body.appendChild(statusEl);

        const actions = el("div", "wmeRcActions");
        const cancelBtn = el("div", "wmeRcBtn");
        cancelBtn.textContent = T("Close");
        cancelBtn.addEventListener("click", close);
        const applyNoSaveBtn = el("div", "wmeRcBtn");
        applyNoSaveBtn.textContent = T("Apply without saving");
        const applyBtn = el("div", "wmeRcBtn primary");
        applyBtn.textContent = T("Apply closure");
        actions.appendChild(cancelBtn);
        actions.appendChild(applyNoSaveBtn);
        actions.appendChild(applyBtn);
        body.appendChild(actions);

        // ── Helpers bound to the built DOM ──
        function setStatus(text, tone) {
          statusEl.textContent = text || "";
          statusEl.className = "wmeRcClStatus" + (text ? ` ${tone || "info"}` : "");
        }

        const $ = (id) => body.querySelector(`#${id}`);

        const readDuration = (prefix) => {
          const d = Number($(`wmeRcCl-${prefix}dd`)?.value) || 0;
          const h = Number($(`wmeRcCl-${prefix}dh`)?.value) || 0;
          const m = Number($(`wmeRcCl-${prefix}dm`)?.value) || 0;
          return d * 1440 + h * 60 + m;
        };
        const readTimeMin = (v) => {
          const m = /^(\d{2}):(\d{2})/.exec(v || "");
          return m ? (+m[1]) * 60 + (+m[2]) : null;
        };

        function readDateConfig() {
          if (mode === "simples") {
            const endMode = endModeSimple === "fim";
            const cfg = { mode, endMode, start: readLocalDateTime($("wmeRcCl-start")?.value) };
            if (endMode) cfg.end = readLocalDateTime($("wmeRcCl-end")?.value);
            else cfg.durationMin = readDuration("s-");
            return cfg;
          }
          if (mode === "semanal") {
            const endMode = endModeWeekly === "fim";
            const cfg = {
              mode,
              endMode,
              startDay: readLocalDay($("wmeRcCl-wfrom")?.value),
              endDay: readLocalDay($("wmeRcCl-wto")?.value),
              startMin: readTimeMin($("wmeRcCl-wstart")?.value) ?? 0,
              days: weekdays,
              holidayMode,
            };
            if (endMode) cfg.endMin = readTimeMin($("wmeRcCl-wend")?.value) ?? 0;
            else cfg.durationMin = readDuration("w-");
            return cfg;
          }
          return {
            mode,
            start: readLocalDateTime($("wmeRcCl-rstart")?.value),
            times: parseInt($("wmeRcCl-rtimes")?.value, 10),
            intervalValue: Number($("wmeRcCl-rint")?.value) || 0,
            intervalUnit: $("wmeRcCl-runit")?.value || "dias",
            durationMin: readDuration("r-"),
          };
        }

        function applyEndToggle(which) {
          const isWeekly = which === "weekly";
          const val = isWeekly ? endModeWeekly : endModeSimple;
          const btn = isWeekly ? $("wmeRcCl-toggle-weekly") : $("wmeRcCl-toggle-simple");
          const endBlock = isWeekly ? weeklyEndInput : simpleEndInput;
          const durBlock = isWeekly ? weeklyDurBlock : simpleDurBlock;
          if (btn) btn.textContent = val === "fim" ? T("use duration") : T("use end time");
          endBlock.style.display = val === "fim" ? "" : "none";
          durBlock.style.display = val === "fim" ? "none" : "";
        }

        function showMode(m) {
          mode = m;
          modeTabs.querySelectorAll(".wmeRcTab").forEach((t2) => t2.classList.toggle("on", t2.dataset.mode === m));
          paneSimple.style.display = m === "simples" ? "" : "none";
          paneWeekly.style.display = m === "semanal" ? "" : "none";
          paneRepeat.style.display = m === "repetir" ? "" : "none";
          const s = loadSettings(); s.closureMode = m; saveSettings(s);
          setStatus("", "info");
          updateRepeatWarning();
        }

        // Explains what the chosen holiday mode actually does, and greys
        // out the weekday buttons in "apenas feriados" — they're ignored
        // in that mode, and leaving them looking live invites the user to
        // tick days that will have no effect.
        function updateHolidayHint() {
          const ignoresWeekdays = holidayMode === "apenas";
          daysRow.style.opacity = ignoresWeekdays ? "0.4" : "";
          daysRow.style.pointerEvents = ignoresWeekdays ? "none" : "";
          holHint.textContent =
            holidayMode === "excepto" ? T("Skips any ticked day that is a national public holiday.")
              : holidayMode === "apenas" ? T("Only national public holidays in the range — the weekdays above are ignored.")
                : holidayMode === "mais" ? T("Ticked weekdays plus every national public holiday in the range.")
                  : T("Only fixed-date national holidays are considered (Easter-based ones are not).");
        }

        function updateRepeatWarning() {
          if (mode !== "repetir") { repeatHint.style.display = "none"; return; }
          const { error, warning } = buildClosureOccurrences(readDateConfig());
          if (error) { repeatHint.style.display = "none"; return; }
          repeatHint.textContent = warning || "";
          repeatHint.style.display = warning ? "block" : "none";
        }

        function refreshSelection() {
          const sel = getClosureSelection();
          const n = sel.ids.length;
          selStrip.classList.toggle("has-sel", n > 0);
          selStrip.querySelector(".wmeRcClSelText").textContent =
            n === 0 ? T("No segment selected")
              : n === 1 ? `1 ${T("segment")}: ${closureSegmentName(sel.ids[0])}`
                : `${n} ${T("segments selected")}`;
          applyBtn.classList.toggle("is-disabled", n === 0);
          applyNoSaveBtn.classList.toggle("is-disabled", n === 0);

          const valid = validClosureDirections(sel.ids);
          Array.from(dirSel.options).forEach((op) => { op.disabled = !valid.includes(Number(op.value)); });
          if (n && !valid.includes(Number(dirSel.value))) {
            dirSel.value = String(valid[0] ?? CLOSURE_DIR.TWO);
          }
          const limited = n > 0 && valid.length < 3;
          dirHint.textContent = limited ? T("Directions limited by the segment(s) one-way setting.") : "";
          dirHint.style.display = limited ? "block" : "none";
        }

        function refreshEvents() {
          const prev = evtSel.value;
          const { events, error } = listTrafficEvents();
          if (error) {
            // Distinct from "no events in this view": this is WME's own
            // internal model failing to read (missing property, wrong
            // type, a thrown exception) — the old code showed the exact
            // same "No event in this view" text for this as for a
            // genuinely empty area, making a real failure look like
            // nothing was wrong and refresh look like it did nothing.
            evtSel.innerHTML = `<option value="">${T("Could not load events")}</option>`;
            evtSel.disabled = true;
            evtHint.textContent = T("WME's internal events list could not be read. Try reloading the page — if this keeps happening, please report it.");
            evtHint.style.display = "block";
            return;
          }
          evtSel.disabled = false;
          evtHint.textContent = EVT_HINT_DEFAULT;
          evtHint.classList.remove("warn");
          evtHint.style.display = "block";
          // Built with DOM APIs rather than an innerHTML string. The
          // previous version interpolated `e.id` straight into
          // value="…" with no escaping at all, so an id containing a
          // double quote would break out of the attribute — the
          // textbook injection shape, on data that comes from WME's
          // internal model rather than from this script. The name was
          // only half-guarded too (`<>&` stripped, quotes not), which
          // happens to be enough in text position but relied on the
          // reader knowing that. Setting .value and .textContent puts
          // both through the DOM, where nothing is parsed as markup,
          // and skips an HTML parse per refresh as a side benefit.
          evtSel.replaceChildren();
          evtSel.appendChild(new Option(events.length ? T("None") : T("No event in this view"), ""));
          for (const e of events) {
            evtSel.appendChild(new Option(String(e.name ?? ""), String(e.id ?? "")));
          }
          if (prev && events.some((e) => String(e.id) === prev)) evtSel.value = prev;
        }
        evtRefreshBtn.addEventListener("click", () => {
          evtRefreshBtn.classList.add("spinning");
          refreshEvents();
          setTimeout(() => evtRefreshBtn.classList.remove("spinning"), 300);
        });

        async function refreshSource() {
          await refreshClosurePartners();
          const prev = srcSel.value;
          // Same treatment as the events list above: partner records
          // come from the Descartes Partners endpoint, so their ids and
          // names are remote data and don't belong in an unescaped
          // attribute.
          srcSel.replaceChildren();
          srcSel.appendChild(new Option(T("None"), ""));
          for (const p of closurePartners) {
            srcSel.appendChild(new Option(String(p.name ?? ""), String(p.id ?? "")));
          }
          srcSel.disabled = !closureSourceAvailable;
          if (prev && closurePartners.some((p) => p.id === prev)) srcSel.value = prev;
          srcHint.textContent = closureSourceAvailable ? "" : T("Unavailable — no partner permissions, or none in this area.");
          srcHint.style.display = closureSourceAvailable ? "none" : "block";
          if (useWazept) applyWazeptSourceIfAvailable();
        }

        // "Usar WazePT": finds WazePT in the freshly-loaded partner list
        // (case-insensitive, since the exact casing the API returns isn't
        // guaranteed) and selects it. Silently does nothing if WazePT isn't
        // a partner in the current map view — the toggle stays on for next
        // time rather than getting switched off just because one area
        // doesn't have it.
        function applyWazeptSourceIfAvailable() {
          const wazept = closurePartners.find((p) => p.name.trim().toLowerCase() === "wazept");
          if (wazept) srcSel.value = wazept.id;
        }

        // Wire up
        modeTabs.querySelectorAll(".wmeRcTab").forEach((tab) => {
          tab.addEventListener("click", () => showMode(tab.dataset.mode));
        });
        $("wmeRcCl-toggle-simple")?.addEventListener("click", () => {
          endModeSimple = endModeSimple === "fim" ? "dur" : "fim";
          const s = loadSettings(); s.closureEndModeSimple = endModeSimple; saveSettings(s);
          applyEndToggle("simple");
          setStatus("", "info");
        });
        $("wmeRcCl-toggle-weekly")?.addEventListener("click", () => {
          endModeWeekly = endModeWeekly === "fim" ? "dur" : "fim";
          const s = loadSettings(); s.closureEndModeWeekly = endModeWeekly; saveSettings(s);
          applyEndToggle("weekly");
          setStatus("", "info");
        });

        // Moving the START past the current END would otherwise leave an
        // invalid range sitting in the form (buildClosureOccurrences
        // rejects it, but only once Apply is pressed) — auto-advancing
        // the end to follow the start is what was asked for: "the end
        // date can't be before the start date". Bound to 'change', not
        // the generic 'input' listener below, so this only fires once a
        // date is actually committed (native picker selection or blur),
        // not on every half-typed keystroke.
        $("wmeRcCl-start")?.addEventListener("change", () => {
          const endInp = $("wmeRcCl-end");
          if (!endInp) return; // duration mode has no explicit end field
          const clamped = computeClampedSimpleEnd($("wmeRcCl-start")?.value, endInp.value);
          if (clamped !== null) endInp.value = clamped;
          setStatus("", "info");
          updateRepeatWarning();
        });
        $("wmeRcCl-wfrom")?.addEventListener("change", () => {
          const wfromInp = $("wmeRcCl-wfrom");
          const wtoInp = $("wmeRcCl-wto");
          if (!wfromInp || !wtoInp) return;
          const clamped = computeClampedWeeklyTo(wfromInp.value, wtoInp.value);
          if (clamped !== null) wtoInp.value = clamped;
          setStatus("", "info");
          updateRepeatWarning();
        });

        body.querySelectorAll("input, select").forEach((f) => {
          f.addEventListener("input", () => { setStatus("", "info"); updateRepeatWarning(); });
        });

        // Shared by both buttons — the only difference between "Aplicar
        // sem gravar" and "Aplicar" is whether the resulting edit
        // gets saved, decided here per click rather than read from a
        // standing setting (which is what closureAutoSave used to be,
        // before these two explicit buttons replaced the need for it).
        async function doApply(autoSave) {
          // Set once the success path has decided to dismiss the dialog,
          // so the finally block below can skip work on a detached tree.
          let closing = false;
          // Checks BOTH buttons rather than just applyBtn: they're always
          // toggled together today (see refreshSelection above), but a
          // guard that only checks one is a trap for a future edit that
          // touches one without the other — cheap to make correct now.
          if (applyBtn.classList.contains("is-disabled") || applyNoSaveBtn.classList.contains("is-disabled")) return;
          setStatus(T("Applying…"), "info");
          applyBtn.classList.add("is-disabled");
          applyNoSaveBtn.classList.add("is-disabled");
          try {
            const result = await applyRoadClosure({
              description: descInp.value.trim(),
              direction: Number(dirSel.value),
              eventId: evtSel.value || null,
              sourceId: srcSel.value || null,
              nodeMode: normalizeClosureNodeMode(nodesSel.value),
              ignoreTraffic,
              autoSave,
              dates: readDateConfig(),
            });
            setStatus(result.message, result.tone);
            // Both Apply buttons dismiss the panel once the closure has
            // actually landed — the job is done and leaving the dialog up
            // over the map serves no purpose. The result message moves to
            // a toast so it isn't lost with the panel it was written in.
            //
            // A FAILED apply deliberately keeps the panel open: the error
            // text usually says what to fix (unloaded event, bad date
            // range), and closing would throw away everything the user
            // just filled in along with the explanation.
            if (result.tone === "ok") {
              toast(result.message);
              saveLastClosureDescription(descInp.value);
              closing = true;
              close();
              return;
            }
          } catch (err) {
            dlog("applyRoadClosure threw", err);
            setStatus(String(err?.message || err), "error");
          } finally {
            // On the success path the dialog is already going away, and
            // refreshSelection() is not free — it calls into the SDK for
            // getReversedSegments/getAddress to re-validate directions.
            // Doing that against a detached DOM tree is pure waste.
            if (!closing) {
              applyBtn.classList.remove("is-disabled");
              applyNoSaveBtn.classList.remove("is-disabled");
              refreshSelection();
            }
          }
        }

        applyBtn.addEventListener("click", () => doApply(true));
        applyNoSaveBtn.addEventListener("click", () => doApply(false));

        applyEndToggle("simple");
        applyEndToggle("weekly");
        updateHolidayHint();
        showMode(mode);
        refreshSelection();
        refreshEvents();
        refreshSource();

        setTimeout(() => { try { descInp.focus(); } catch {} }, 60);
      },
    });
  }

  function actionPinThisPlace(ll) {
    if (!isEditorAllowed()) {
      closeMenu();
      toast(T("This feature is restricted to editors on the approved list."));
      return;
    }
    if (!ll || !Number.isFinite(ll.lat) || !Number.isFinite(ll.lon)) {
      toast(T("Move the mouse over the map first."));
      return;
    }
    closeMenu();
    ensurePinsPanel();

    const pins = loadPins();
    const fallback = `Pin #${nextPinNumber(pins)}`;
    let color = PIN_COLORS[Math.floor(Math.random() * PIN_COLORS.length)];
    let scope = "me"; // "me" | "everyone"
    const canShare = canEditOrDeletePins();

    openModal({
      title: T("Pin this place"),
      icon: ICONS.pin,
      build: ({ body, close }) => {
        const scopeTabs = document.createElement("div");
        scopeTabs.className = "wmeRcTabs";
        scopeTabs.innerHTML = `
          <div class="wmeRcTab on" data-scope="me">${T("For me")}</div>
          <div class="wmeRcTab${canShare ? "" : " is-disabled"}" data-scope="everyone"
               title="${canShare ? "" : `${T("Requires Level")} ${MIN_EDIT_RANK_LEVEL} ${T("or above")}`}">${T("For everyone")}</div>
        `;
        body.appendChild(scopeTabs);

        const scopeHint = document.createElement("div");
        scopeHint.className = "wmeRcHint";
        body.appendChild(scopeHint);

        const input = document.createElement("input");
        input.className = "wmeRcInput";
        input.placeholder = fallback;
        input.maxLength = 40;

        const hint = document.createElement("div");
        hint.className = "wmeRcHint";
        hint.textContent = `${fmt(ll.lat)}, ${fmt(ll.lon)}`;

        const colors = document.createElement("div");
        colors.className = "wmeRcColors";
        const swatches = [];
        for (const c of PIN_COLORS) {
          const sw = document.createElement("div");
          sw.className = "wmeRcSwatch" + (c === color ? " sel" : "");
          sw.style.background = c;
          sw.addEventListener("click", () => {
            color = c;
            swatches.forEach((s) => s.classList.toggle("sel", s.dataset.c === c));
          });
          sw.dataset.c = c;
          swatches.push(sw);
          colors.appendChild(sw);
        }

        const remRow = document.createElement("div");
        remRow.className = "wmeRcSideRow";
        remRow.style.padding = "0";
        remRow.innerHTML = `<div class="wmeRcSideTitle" style="font-weight:700;font-size:12px;">${T("Set a reminder after pinning")}</div>`;
        let wantReminder = false;
        const remToggle = document.createElement("button");
        remToggle.type = "button";
        remToggle.className = "wmeRcToggle";
        remToggle.addEventListener("click", () => {
          wantReminder = !remToggle.classList.contains("on");
          remToggle.classList.toggle("on", wantReminder);
        });
        remRow.appendChild(remToggle);

        // Expiry only makes sense for a pin visible to the whole
        // community — a personal pin has no one else's clutter to worry
        // about, so this section only ever shows for the "everyone" scope
        // (the mirror image of the reminder toggle above, which only
        // shows for "me").
        const expiryWrap = document.createElement("div");
        expiryWrap.style.display = "none";

        const expiryLbl = document.createElement("div");
        expiryLbl.className = "wmeRcHint";
        expiryLbl.textContent = T("Expires (optional)");
        expiryWrap.appendChild(expiryLbl);

        const expirySel = document.createElement("select");
        expirySel.className = "wmeRcInput";
        const EXPIRY_OPTIONS = [
          { id: "never", ms: 0, label: T("Never") },
          { id: "1d", ms: 24 * 3600000, label: T("1 day") },
          { id: "3d", ms: 3 * 24 * 3600000, label: T("3 days") },
          { id: "1w", ms: 7 * 24 * 3600000, label: T("1 week") },
          { id: "1m", ms: 30 * 24 * 3600000, label: T("1 month") },
        ];
        for (const o of EXPIRY_OPTIONS) {
          const opt = document.createElement("option");
          opt.value = o.id;
          opt.textContent = o.label;
          expirySel.appendChild(opt);
        }
        expiryWrap.appendChild(expirySel);

        const expiryHint = document.createElement("div");
        expiryHint.className = "wmeRcHint";
        expiryHint.style.marginTop = "4px";
        expiryHint.textContent = T("The pin is removed for everyone automatically once it expires.");
        expiryWrap.appendChild(expiryHint);

        // Same visibility rule as expiry: only meaningful once the pin is
        // actually shared with everyone else — a personal pin has no one
        // else who'd need to be kept out.
        const lockWrap = document.createElement("div");
        lockWrap.style.display = "none";
        lockWrap.style.marginTop = "10px";

        const lockLbl = document.createElement("div");
        lockLbl.className = "wmeRcHint";
        lockLbl.textContent = T("Lock editing/removal to (optional)");
        lockWrap.appendChild(lockLbl);

        const lockSel = document.createElement("select");
        lockSel.className = "wmeRcInput";
        // Starts at MIN_EDIT_RANK_LEVEL: a lock below that would add no
        // restriction beyond what already applies to every shared pin,
        // so offering it would just be a confusing no-op option.
        const LOCK_OPTIONS = [{ level: 0, label: T("No lock") }];
        for (let lvl = MIN_EDIT_RANK_LEVEL; lvl <= 6; lvl++) {
          LOCK_OPTIONS.push({ level: lvl, label: `${T("Level")} ${lvl}+` });
        }
        for (const o of LOCK_OPTIONS) {
          const opt = document.createElement("option");
          opt.value = String(o.level);
          opt.textContent = o.label;
          lockSel.appendChild(opt);
        }
        lockWrap.appendChild(lockSel);

        const lockHint = document.createElement("div");
        lockHint.className = "wmeRcHint";
        lockHint.style.marginTop = "4px";
        lockHint.textContent = T("Only editors at this level or above will be able to edit or remove this pin — you can always remove your own, regardless of level. Enforced by this script only: someone bypassing it entirely is still possible.");
        lockWrap.appendChild(lockHint);

        const setScope = (s) => {
          if (s === "everyone" && !canShare) {
            toast(`${T("Requires Level")} ${MIN_EDIT_RANK_LEVEL} ${T("or above")}`);
            return;
          }
          scope = s;
          scopeTabs.querySelectorAll(".wmeRcTab").forEach((t) => t.classList.toggle("on", t.dataset.scope === s));
          if (s === "everyone") {
            scopeHint.textContent = T("Shared with all script users");
            // Reminders are a local-only feature (no per-user identity in
            // the shared database), so hide that option entirely rather
            // than let it silently do nothing for a shared pin.
            remRow.style.display = "none";
            wantReminder = false;
            remToggle.classList.remove("on");
            expiryWrap.style.display = "";
            lockWrap.style.display = "";
          } else {
            scopeHint.textContent = "";
            remRow.style.display = "";
            expiryWrap.style.display = "none";
            lockWrap.style.display = "none";
          }
        };
        scopeTabs.querySelectorAll(".wmeRcTab").forEach((t) => {
          t.addEventListener("click", () => setScope(t.dataset.scope));
        });
        setScope(scope);

        const actions = document.createElement("div");
        actions.className = "wmeRcActions";

        const cancel = document.createElement("div");
        cancel.className = "wmeRcBtn";
        cancel.textContent = T("Cancel");
        cancel.addEventListener("click", close);

        const ok = document.createElement("div");
        ok.className = "wmeRcBtn primary";
        ok.textContent = T("Pin");
        ok.addEventListener("click", async () => {
          const name = (input.value || "").trim() || fallback;

          if (scope === "everyone") {
            const proceed = await showConfirmModal({
              title: T("Before sharing this pin"),
              icon: ICONS.pin,
              message:
                T("Shared pins are not a substitute for map comments or the Waze Map Update Request tools — don't rely on them to keep track of anything important, since any user of this script can see and remove them at any time.") +
                "\n\n" +
                T("Please be a responsible editor: don't remove another editor's pin unless the task it refers to has actually been completed."),
              confirmLabel: T("I understand, share it"),
              cancelLabel: T("Go back"),
            });
            if (!proceed) return;

            ok.textContent = T("Saving to the shared database…");
            ok.style.pointerEvents = "none";
            const chosenExpiry = EXPIRY_OPTIONS.find((o) => o.id === expirySel.value);
            const expiresAt = chosenExpiry && chosenExpiry.ms > 0 ? Date.now() + chosenExpiry.ms : null;
            const saved = await addSharedPin({
              name,
              lon: Number(ll.lon),
              lat: Number(ll.lat),
              zoom: getZoomBestEffort(),
              color: normalizeColor(color),
              createdAt: Date.now(),
              expiresAt,
              lockLevel: Number(lockSel.value) || 0,
            });
            if (saved) {
              toast(T("Shared pin saved"));
              close();
            } else {
              ok.textContent = T("Pin");
              ok.style.pointerEvents = "";
            }
            return;
          }

          const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
          addPin({
            id,
            name,
            lon: Number(ll.lon),
            lat: Number(ll.lat),
            zoom: getZoomBestEffort(),
            color: normalizeColor(color),
            createdAt: Date.now(),
          });
          toast(T("Pin saved"));
          close();
          if (wantReminder) setTimeout(() => openReminderModal(id), 80);
        });

        actions.appendChild(cancel);
        actions.appendChild(ok);

        body.appendChild(input);
        body.appendChild(hint);
        body.appendChild(colors);
        body.appendChild(remRow);
        body.appendChild(expiryWrap);
        body.appendChild(lockWrap);
        body.appendChild(actions);

        setTimeout(() => { try { input.focus(); } catch {} }, 60);
      },
    });
  }

  /* ------------------------------------------------------------------ *
   *  Radial menu
   * ------------------------------------------------------------------ */

  function closeMenu() {
    try { if (escHandler) document.removeEventListener("keydown", escHandler, true); } catch {}
    try {
      if (outsideHandler) {
        document.removeEventListener("mousedown", outsideHandler, true);
        document.removeEventListener("touchstart", outsideHandler, true);
        document.removeEventListener("contextmenu", outsideHandler, true);
      }
    } catch {}
    escHandler = null;
    outsideHandler = null;
    try { menuEl?.remove?.(); } catch {}
    menuEl = null;
  }

  function openRadialMenu(cx0, cy0, items, hubDefault) {
    const list = (items || []).filter(Boolean);
    if (!list.length) return;

    closeMenu();
    ensureCss();

    const need = RADIUS + BTN / 2 + EDGE_PAD;
    const vw = window.innerWidth || document.documentElement.clientWidth || 0;
    const vh = window.innerHeight || document.documentElement.clientHeight || 0;
    const cx = clamp(cx0, need, Math.max(need, vw - need));
    const cy = clamp(cy0, need, Math.max(need, vh - need));

    const wrap = document.createElement("div");
    const st = loadSettings();
    const animEnabled = st.radialAnimEnabled !== false;
    const animStyle = normalizeRadialAnimStyle(st.radialAnimStyle);
    const speedMult = radialAnimSpeedMultiplier(st.radialAnimSpeed);
    const stagger = RADIAL_ANIM_STAGGER[animStyle] ?? 0;
    wrap.className = "wmeRcRadial"
      + (isLightTheme() ? " theme-light" : "")
      + (animEnabled ? ` anim-${animStyle}` : " no-anim");
    wrap.style.setProperty("--wmeRcDur", String(speedMult));
    wrap.style.left = `${Math.round(cx)}px`;
    wrap.style.top = `${Math.round(cy)}px`;

    const hub = document.createElement("div");
    hub.className = "wmeRcRadialHub";
    hub.title = T("Close");
    hub.innerHTML = `<div class="wmeRcRadialHubTxt"></div>`;
    const hubTxt = hub.querySelector(".wmeRcRadialHubTxt");
    const setHub = (t) => { hubTxt.textContent = String(t || ""); };
    setHub(hubDefault || T("Actions"));
    hub.addEventListener("click", (e) => { e.preventDefault(); e.stopPropagation(); closeMenu(); });
    wrap.appendChild(hub);

    const n = list.length;
    list.forEach((it, i) => {
      const ang = (-Math.PI / 2) + (i * 2 * Math.PI / n);
      const el = document.createElement("div");
      el.className = "wmeRcRadialItem"
        + (it.disabled ? " is-disabled" : "")
        + (it.accent && !it.disabled ? ` is-accent-${it.accent}` : "");
      const hoverLabel = it.disabled && it.disabledTitle ? `${it.label} — ${it.disabledTitle}` : it.label;
      el.title = it.kbd && !it.disabled ? `${it.label} (${it.kbd})` : hoverLabel;
      // The little on-icon letter badge (Z / ⇧T / I for speed bump, stop
      // light, and draw road — the only items that ever set `kbd`) was
      // removed: it sat permanently on top of the icon and read as UI
      // clutter more than help. The shortcut itself isn't gone — it's
      // still in the tooltip above, one hover away — this just stops
      // painting it onto the icon at all times.
      el.innerHTML = it.icon;
      el.style.left = `${Math.round(Math.cos(ang) * RADIUS)}px`;
      el.style.top = `${Math.round(Math.sin(ang) * RADIUS)}px`;
      // Used only by the "slide" style, which animates FROM the hub's
      // center rather than growing in place — harmless to set
      // unconditionally on every style since pop/fade/spin never
      // reference these custom properties at all.
      el.style.setProperty("--wmeRcDx", `${Math.round(Math.cos(ang) * RADIUS)}px`);
      el.style.setProperty("--wmeRcDy", `${Math.round(Math.sin(ang) * RADIUS)}px`);
      // Per-item stagger. Read by the CSS as animation-delay, and the
      // amount is per style rather than one global number: a sweeping
      // 26ms cascade suits the pop and the slide, whereas "esbater" is
      // supposed to read as one soft simultaneous dissolve, so it gets
      // barely any. Spin gets none at all — see RADIAL_ANIM_STAGGER.
      el.style.setProperty("--wmeRcDelay", animEnabled ? `${Math.round(i * stagger * speedMult)}ms` : "0ms");
      el.addEventListener("mouseenter", () => setHub(hoverLabel));
      el.addEventListener("mouseleave", () => setHub(hubDefault || "Actions"));
      el.addEventListener("click", async (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (it.disabled) return;
        try { await it.onClick(); }
        catch (err) { console.error(err); toast(String(err?.message || err)); }
      });
      wrap.appendChild(el);
    });

    (document.body || document.documentElement).appendChild(wrap);

    if (animEnabled) {
      // A single requestAnimationFrame is not reliably enough here — this
      // is the intermittent "menu just appears, no animation" bug. rAF
      // fires before the NEXT repaint, but there's no guarantee the
      // browser has already committed a style/layout pass for THIS
      // newly-appended element before that callback runs; when it
      // hasn't, the "no .show" and "with .show" states can end up
      // computed together in a single style pass, so the transition has
      // no earlier state to animate FROM and the menu just snaps open.
      // Forcing a synchronous layout read (offsetWidth) guarantees the
      // initial state is actually committed, and nesting a second rAF
      // inside the first is the standard, well-documented fix for this
      // exact class of "transition sometimes doesn't play" bug.
      void wrap.offsetWidth;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          wrap.classList.add("show");
          // A CSS animation with fill-mode:both keeps asserting its final
          // transform for as long as it stays attached, which would leave
          // the hover lift and the :active press permanently outvoted.
          // So the animation is dropped the moment it's done and the same
          // final values are restated as plain rules (.anim-settled).
          // Because those values are identical to the 100% keyframe,
          // handing over is invisible.
          const settle = () => {
            // Guard: by the time this resolves the menu may already have
            // been closed and replaced by a newer one.
            if (wrap.isConnected) wrap.classList.add("anim-settled");
          };
          let handled = false;
          try {
            const anims = wrap.getAnimations?.({ subtree: true }) || [];
            if (anims.length) {
              handled = true;
              // .finished rejects on cancel (menu closed mid-animation),
              // which is a non-event here — settle() no-ops on a detached
              // wrap anyway.
              Promise.all(anims.map((a) => a.finished.catch(() => {}))).then(settle);
            }
          } catch { /* getAnimations unsupported — fall through to the timer */ }
          if (!handled) {
            const maxDelay = Math.max(0, (list.length - 1) * stagger * speedMult);
            const base = RADIAL_ANIM_BASE_MS[animStyle] ?? 500;
            setTimeout(settle, Math.round(base * speedMult + maxDelay) + 60);
          }
        });
      });
    } else {
      // Nothing to guard against here: no transition exists at all (see
      // the .no-anim CSS rule), so adding the class immediately, on the
      // same tick, is both correct and simpler than routing a no-op
      // through two animation frames for no reason.
      wrap.classList.add("show");
    }

    menuEl = wrap;

    outsideHandler = (e) => {
      if (menuEl && (menuEl === e.target || menuEl.contains(e.target))) return;
      closeMenu();
    };
    document.addEventListener("mousedown", outsideHandler, true);
    document.addEventListener("contextmenu", outsideHandler, true);
    document.addEventListener("touchstart", outsideHandler, { capture: true, passive: true });

    escHandler = (ev) => {
      if (ev && ev.key === "Escape") { ev.preventDefault(); ev.stopPropagation(); closeMenu(); }
    };
    document.addEventListener("keydown", escHandler, true);
  }


  /* ------------------------------------------------------------------ *
   *  Route test (A → B)
   *
   *  Imported from the "Test route" script, reduced to just the routing
   *  request and the drawn result — deliberately WITHOUT its speed
   *  readout, its car-playback animation, or its turn-by-turn
   *  instruction markers. Also without its turf.js dependency: turf was
   *  only needed for the segment snapping and along-the-line distance
   *  maths that fed those dropped features, so the route line itself is
   *  drawn straight from the coordinates the routing server returns.
   * ------------------------------------------------------------------ */

  // Up to three alternatives, drawn in the same colours WME Route
  // Checker uses so the primary/alternative distinction reads the same
  // way to anyone who already knows that script.
  let routeLayer = null;
  let routeMarkersLayer = null;
  // null | { lon, lat } — the placed A point, waiting for its B.
  let routeStart = null;
  // True once a full A→B pair has been placed. Tracked separately from
  // routeStart (which is cleared the moment B goes down) because the
  // menu needs a third, distinct phase after that: "there's a route on
  // screen, offer to clear it".
  let routeDrawn = false;
  let lastRouteRequestAt = 0;

  // State kept purely for the details panel's "recalculate at a
  // different time" feature: the last A/B pair actually sent to the
  // server (so recalculating doesn't need the points re-clicked), the
  // routes it returned (so switching the highlighted alternative can
  // redraw the map without a new request), and which of those routes is
  // currently getting the full speed-gradient/turn-instruction
  // treatment.
  let lastRouteStartPoint = null;
  let lastRouteEndPoint = null;
  let activeRouteIndex = 0;
  // Minutes offset (server's own "at" convention: minutes from now,
  // negative = past) last used to fetch the routes currently on screen —
  // shown back in the panel so "which time is this?" doesn't require
  // reopening the dropdowns.
  let lastRouteAtMinutes = 0;

  // Which of the three phases the single radial entry is currently in:
  //   "start" — nothing placed yet; next click sets A.
  //   "end"   — A is down; next click sets B and calculates.
  //   "clear" — a route is drawn; next click wipes everything.
  function routePhase() {
    if (routeStart) return "end";
    if (routeDrawn) return "clear";
    return "start";
  }

  function ensureRouteLayers() {
    try {
      const ol = UW?.OpenLayers;
      const map = getOlMap();
      if (!ol || !map || typeof map.addLayer !== "function") return null;

      if (!routeLayer || !(Array.isArray(map.layers) && map.layers.includes(routeLayer))) {
        // Constructed exactly the way WME Route Checker does it: options
        // passed to the CONSTRUCTOR, and no setZIndex call. Setting
        // uniqueName/displayInLayerSwitcher as properties after the fact
        // isn't equivalent — OpenLayers reads them during construction —
        // and forcing a z-index fights WME's own layer stacking, which
        // is the difference between a line that renders and one that
        // silently doesn't.
        routeLayer = new ol.Layer.Vector("WazePT Route", {
          displayInLayerSwitcher: false,
          uniqueName: `${SCRIPT_ID}_route`,
        });
        map.addLayer(routeLayer);
      }
      if (!routeMarkersLayer || !(Array.isArray(map.layers) && map.layers.includes(routeMarkersLayer))) {
        routeMarkersLayer = new ol.Layer.Markers("WazePT Route Points", {
          displayInLayerSwitcher: false,
          uniqueName: `${SCRIPT_ID}_routePoints`,
        });
        map.addLayer(routeMarkersLayer);
      }
      try { routeLayer.setVisibility(true); } catch {}
      try { routeMarkersLayer.setVisibility(true); } catch {}
      return routeLayer;
    } catch {
      return null;
    }
  }

  function routeEndpointIconUri(letter, color) {
    const s = `<svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 34 34">
      <path d="M17 33s11-11.5 11-19A11 11 0 0 0 6 14c0 7.5 11 19 11 19z"
            fill="${color}" stroke="#fff" stroke-width="2"/>
      <text x="17" y="20" text-anchor="middle" font-family="system-ui,Segoe UI,Roboto,Arial"
            font-size="14" font-weight="800" fill="#fff">${letter}</text>
    </svg>`;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(s)}`;
  }

  function addRouteEndpointMarker(lon, lat, letter, color) {
    try {
      const ol = UW?.OpenLayers;
      if (!ol || !routeMarkersLayer) return;
      const pos = toMapProjection(lon, lat);
      if (!pos) return;
      const size = new ol.Size(34, 34);
      const icon = new ol.Icon(routeEndpointIconUri(letter, color), size, new ol.Pixel(-17, -33));
      routeMarkersLayer.addMarker(new ol.Marker(pos, icon));
    } catch {}
  }

  // Clears the drawn lines AND both endpoint markers, and forgets any
  // half-finished A placement — the single "start over" path.
  function clearRoute() {
    try { routeLayer?.removeAllFeatures?.(); } catch {}
    try { routeMarkersLayer?.clearMarkers?.(); } catch {}
    routeStart = null;
    routeDrawn = false;
    lastRouteStartPoint = null;
    lastRouteEndPoint = null;
    activeRouteIndex = 0;
    lastRouteAtMinutes = 0;
    // Hidden, not destroyed — position/size stay exactly where the user
    // left them for the next route.
    try { routeDetailsEl?.classList.add("hidden"); } catch {}
  }


  // ⚠️ CONFIRMED HARD TO SEE IN THE FIELD: the previous alternative
  // colours (a washed-out teal and a dark olive) at low opacity were
  // barely visible against most map backgrounds. Replaced with genuinely
  // vivid, high-chroma colours — a bright orange and a bright green —
  // distinct from the primary purple and from each other, and from most
  // road/terrain colours WME itself uses.
  const ROUTE_COLORS = ["#8309e1", "#ff6d00", "#00c853"];
  const ROUTE_VALID_REGIONS = ["row", "na", "il", "am"];

  // ─── Segment speed gradient (imported from WME Route Speeds) ────────
  // Metric-only (km/h) — this suite targets Portuguese editors, unlike
  // the source script which also supports mph. Colour bands and cutoffs
  // are otherwise identical to WME Route Speeds' own METRIC_SPEED_COLORS.
  const ROUTE_SPEED_INVALID_COLOR = "#808080";
  // Legs shorter than this get a colour but no km/h label — see the
  // note at the label-building site in drawRouteSpeedGradient.
  const ROUTE_SPEED_LABEL_MIN_LENGTH_M = 40;
  const ROUTE_SPEED_COLORS = [
    "#2e131c", // < 5.5 km/h
    "#711422", // < 10.5 km/h
    "#af0b26", // < 15.5 km/h
    "#e9052a", // < 20.5 km/h
    "#ff632a", // < 30.5 km/h
    "#ffab20", // < 40.5 km/h
    "#ffd60f", // < 50.5 km/h
    "#9ce30b", // < 60.5 km/h
    "#23bf4c", // < 70.5 km/h
    "#32c6c2", // < 80.5 km/h
    "#09d7ff", // < 90.5 km/h
    "#09a9ff", // < 100.5 km/h
    "#1555fe", // < 110.5 km/h
    "#5e00e0", // < 120.5 km/h
    "#a504cd", // < 130.5 km/h
    "#851680", // < 140.5 km/h
    "#531947", // >= 140.5 km/h
  ];

  // km/h from a leg's length (m) and cross time (s) — same formula WME
  // Route Speeds uses for its metric mode.
  function routeSegmentSpeedKmh(length_m, time_s) {
    if (!time_s) return 0;
    return 3.6 * length_m / time_s;
  }

  function routeSpeedColor(speedKmh) {
    if (speedKmh === 0) return ROUTE_SPEED_INVALID_COLOR;
    const rounded = Math.round(speedKmh);
    if (rounded <= 20) return ROUTE_SPEED_COLORS[Math.ceil(rounded / 5) - 1];
    return ROUTE_SPEED_COLORS[Math.min(Math.ceil(rounded / 10) + 1, ROUTE_SPEED_COLORS.length - 1)];
  }

  // "62" / "?" (zero-time leg, speed unknown) / "<1" (crawling) — same
  // three cases WME Route Speeds' label text uses.
  function routeSpeedLabel(speedKmh) {
    if (speedKmh >= 1) return String(Math.round(speedKmh));
    if (speedKmh === 0) return "?";
    return "<1";
  }

  // Midpoint of a lon/lat polyline by planar arc-length, not geodesic —
  // turf.along() did this in the original scripts but this file
  // deliberately has no turf dependency (see the note at the top of the
  // route-test section). At the scale of a single road segment the
  // planar approximation and the geodesic one are indistinguishable.
  function lineMidpointLonLat(coords) {
    if (!coords.length) return null;
    if (coords.length === 1) return coords[0];
    const segLens = [];
    let total = 0;
    for (let i = 1; i < coords.length; i++) {
      const dx = coords[i][0] - coords[i - 1][0];
      const dy = coords[i][1] - coords[i - 1][1];
      const d = Math.sqrt(dx * dx + dy * dy);
      segLens.push(d);
      total += d;
    }
    if (total === 0) return coords[Math.floor(coords.length / 2)];
    const half = total / 2;
    let acc = 0;
    for (let i = 0; i < segLens.length; i++) {
      if (acc + segLens[i] >= half) {
        const t = segLens[i] === 0 ? 0 : (half - acc) / segLens[i];
        const a = coords[i];
        const b = coords[i + 1];
        return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
      }
      acc += segLens[i];
    }
    return coords[coords.length - 1];
  }

  // Slices a route's full coordinate list back into per-leg polylines by
  // walking the coordinates and cutting whenever the running point
  // matches the next leg's boundary point (`results[n].path.x/y`) — the
  // same technique WME Route Speeds' splitGeometryIntoSegments uses.
  //
  // ⚠️ Deliberately simplified vs. the source script: Route Speeds also
  // offsets each leg sideways with turf.lineOffset when the route
  // revisits the same node (a loop), so overlapping legs don't paint on
  // top of each other. That offset step is turf-only and this file has
  // no turf dependency, so it's omitted here — a route that loops back
  // through the same junction will have its speed segments overlap
  // there instead of fanning out. Rare in practice (most A→B test
  // routes don't self-intersect) and the trade-off matches this file's
  // existing "no turf" decision for the plain route line above.
  function splitRouteGeometryIntoSegments(route) {
    const coords = routeCoordPairs(route);
    const results = Array.isArray(route?.results) ? route.results : [];
    if (coords.length < 2 || !results.length) return [];

    // ~10 cm at these latitudes. Deliberately NOT tighter: `coords` and
    // `results[n].path` come back as separate fields of the same
    // response and don't necessarily share bit-identical float
    // representations of the same node. A 1e-8 (≈1 mm) tolerance is
    // below that representation noise and can miss real boundaries,
    // while 1e-6 is still orders of magnitude finer than the distance
    // between two distinct road nodes, so it can't merge them.
    const COORD_EPS = 1e-6;
    const closeEnough = (a, b) =>
      a && b && Number.isFinite(a[0]) && Number.isFinite(b[0])
      && Number.isFinite(a[1]) && Number.isFinite(b[1])
      && Math.abs(a[0] - b[0]) < COORD_EPS && Math.abs(a[1] - b[1]) < COORD_EPS;

    const segments = [];
    let legIndex = 0;
    let current = [coords[0]];
    let nextBoundary = results.length > 1
      ? [results[1]?.path?.x, results[1]?.path?.y]
      : null;

    for (let i = 1; i < coords.length; i++) {
      current.push(coords[i]);
      if (nextBoundary && closeEnough(coords[i], nextBoundary) && legIndex < results.length - 1) {
        segments.push({ coords: current, legIndex });
        legIndex++;
        current = [coords[i]];
        nextBoundary = legIndex + 1 < results.length
          ? [results[legIndex + 1]?.path?.x, results[legIndex + 1]?.path?.y]
          : null;
      }
    }
    segments.push({ coords: current, legIndex });

    // A multi-leg route that produced exactly ONE segment means no
    // boundary ever matched — the split silently failed. Returning it
    // anyway would paint the WHOLE route in leg 0's colour and label it
    // with leg 0's speed, which looks like a real answer while being
    // completely wrong. Returning [] instead makes the caller fall back
    // to the plain single-colour route line: no speed data shown, but
    // nothing false shown either.
    if (results.length > 1 && segments.length === 1) {
      dlog("splitRouteGeometryIntoSegments: no leg boundaries matched, falling back", {
        coords: coords.length, legs: results.length,
      });
      return [];
    }
    // A partial match still colours most legs correctly, so it's kept —
    // but logged, since a persistent mismatch here is the signal that
    // the response shape has changed.
    if (segments.length !== results.length) {
      dlog("splitRouteGeometryIntoSegments: partial boundary match", {
        segments: segments.length, legs: results.length,
      });
    }
    return segments;
  }

  // The routing server is rate limited on the client side to stay a
  // polite consumer of an endpoint that isn't a public API.
  const ROUTE_RATE_LIMIT_MS = 2000;

  // Which regional routing host to talk to. Route Checker keys this off
  // W.model.topCountry.attributes.env; this reads BOTH that and the
  // plain .env property, because the two WME builds in the wild expose
  // it differently and picking only one silently sends every request to
  // the wrong continent's server. Falls back to "row" (rest of world —
  // correct for Portugal) rather than guessing or throwing.
  function routeRegion() {
    let raw = "";
    try {
      const tc = UW?.W?.model?.topCountry;
      raw = String(tc?.attributes?.env ?? tc?.env ?? "").toLowerCase();
    } catch {}
    if (raw === "usa" || raw === "na") raw = "am";
    return ROUTE_VALID_REGIONS.includes(raw) ? raw : "row";
  }

  function routeRequestUrl() {
    let url = `https://routing-livemap-${routeRegion()}.waze.com/RoutingManager/routingRequest`;
    // W.Config.routing is undocumented. When present it's more accurate
    // than the constructed host above, but it's validated against a
    // waze.com domain first — an unvalidated URL from a mutable global
    // is an open-redirect waiting to happen.
    try {
      let candidate = UW?.W?.Config?.routing?.routingManagerUrl;
      if (candidate) {
        if (candidate.startsWith("/")) candidate = location.origin + candidate;
        if (/^https:\/\/[a-z0-9.-]+\.waze\.com\//i.test(candidate)) url = candidate;
        else dlog("ignoring unexpected routingManagerUrl domain", candidate);
      }
    } catch {}
    return url;
  }

  // ─── Route options (imported from WME Route Checker) ────────────────
  // The same bit flags that script uses, kept numerically identical so a
  // value means the same thing in both.
  const ROUTE_OPT = {
    AVOID_TOLLS: 1,
    AVOID_FREEWAYS: 2,
    AVOID_DIRT: 4,
    ALLOW_UTURNS: 16,
    VEHICLE_TAXI: 64,
    VEHICLE_BIKE: 128,
  };

  function routeOptionsValue() {
    const st = loadSettings();
    const v = Number(st.routeOptions);
    // ALLOW_UTURNS on its own is Route Checker's own default.
    return Number.isFinite(v) ? v : ROUTE_OPT.ALLOW_UTURNS;
  }

  // The `options` query parameter: a comma-separated list of
  // FLAG:t / FLAG:f pairs. Note AVOID_PRIMARIES is the server's name for
  // what the UI calls "avoid freeways".
  function buildRouteOptionsParam(opts) {
    return [
      `AVOID_TOLL_ROADS:${opts & ROUTE_OPT.AVOID_TOLLS ? "t" : "f"}`,
      `AVOID_PRIMARIES:${opts & ROUTE_OPT.AVOID_FREEWAYS ? "t" : "f"}`,
      `AVOID_TRAILS:${opts & ROUTE_OPT.AVOID_DIRT ? "t" : "f"}`,
      `ALLOW_UTURNS:${opts & ROUTE_OPT.ALLOW_UTURNS ? "t" : "f"}`,
    ].join(",");
  }

  // Taxi and motorcycle are mutually exclusive; anything else is a
  // private vehicle, which the server represents by sending no
  // vehicleType at all.
  function routeVehicleType(opts) {
    if (opts & ROUTE_OPT.VEHICLE_TAXI) return "TAXI";
    if (opts & ROUTE_OPT.VEHICLE_BIKE) return "MOTORCYCLE";
    return null;
  }

  // ─── Turn arrows / lane arrows (imported from WME Route Checker) ────
  function getLaneArrow(angle) {
    switch (angle) {
      case -180: return "\u21B6";
      case -135: return "\u2199";
      case -90: return "\u21B0";
      case -45: return "\u2196";
      case 0: return "\u2191";
      case 45: return "\u2197";
      case 90: return "\u21B1";
      case 135: return "\u2198";
      case 180: return "\u21B7";
      default: return String(angle);
    }
  }

  // The glyph shown for a manoeuvre. Roundabout exits use the circled
  // digits block: ⓵ is U+24F5, so the nth exit is that codepoint plus
  // n-1 — the same trick Route Checker uses, and the reason roundabout
  // exits read as a numbered marker rather than a generic arrow.
  function getTurnArrow(opcode, nth = 0) {
    switch (opcode) {
      case "BEGIN": return "\uD83D\uDD88";
      case "CONTINUE":
      case "NONE": return getLaneArrow(0);
      case "TURN_LEFT": return getLaneArrow(-90);
      case "TURN_RIGHT": return getLaneArrow(90);
      case "KEEP_LEFT":
      case "EXIT_LEFT": return getLaneArrow(-45);
      case "KEEP_RIGHT":
      case "EXIT_RIGHT": return getLaneArrow(45);
      case "UTURN": return getLaneArrow(-180);
      case "APPROACHING_DESTINATION": return "\u2691";
      case "ROUNDABOUT_LEFT":
      case "ROUNDABOUT_EXIT_LEFT": return "\u24C1";
      case "ROUNDABOUT_RIGHT":
      case "ROUNDABOUT_EXIT_RIGHT": return "\u24C7";
      case "ROUNDABOUT_STRAIGHT":
      case "ROUNDABOUT_EXIT_STRAIGHT": return "\u24C8";
      case "ROUNDABOUT_ENTER":
      case "ROUNDABOUT_EXIT": return String.fromCharCode(0x24F5 + Math.max(1, Number(nth) || 1) - 1);
      case "ROUNDABOUT_U": return "\u24CA";
      default: return "";
    }
  }

  // Road-type predicates, by WME's own numeric road types.
  function isPrimaryRoad(t) { return t === 3 || t === 6 || t === 7; }
  function isRamp(t) { return t === 4; }
  function isFreewayOrRamp(t) { return t === 3 || t === 4; }

  // "Keep right" onto a slip road is really "exit right" — Route
  // Checker's rule, reproduced: leaving a primary for a non-primary, or
  // leaving a ramp for something that's neither.
  function isKeepForExit(fromType, toType) {
    if (isPrimaryRoad(fromType) && !isPrimaryRoad(toType)) return true;
    if (isRamp(fromType) && !isPrimaryRoad(toType) && !isRamp(toType)) return true;
    return false;
  }

  function isRoundaboutSegment(id) {
    try {
      const seg = UW?.W?.model?.segments?.getObjectById?.(id);
      return !!seg && seg.attributes?.junctionId != null;
    } catch { return false; }
  }

  // The street a manoeuvre puts you onto — which is NOT necessarily the
  // next segment's, because unnamed segments are skipped over. The
  // 4-segment / 400 m ceiling is the Wazeopedia "navigation instructions
  // for unnamed segments" rule, and roundabout segments are exempt from
  // counting toward it.
  function getNextStreetName(results, index, streetNames) {
    let streetName = "";
    let unnamedCount = 0;
    let unnamedLength = 0;

    if (index === results.length - 1) {
      streetName = streetNames?.[results[index]?.street] || "";
    }

    let i = index;
    while (++i < results.length && streetName === "") {
      streetName = streetNames?.[results[i]?.street] || "";
      if (streetName === ""
          && !isFreewayOrRamp(results[i]?.roadType)
          && !isRoundaboutSegment(results[i]?.path?.segmentId)) {
        unnamedLength += Number(results[i]?.length) || 0;
        unnamedCount++;
        if (unnamedCount >= 4 || unnamedLength >= 400) break;
      }
    }
    return streetName;
  }

  // Turns a raw opcode into the phrase shown to the editor. Roundabout
  // handling is the important part: ROUNDABOUT_ENTER carries the exit
  // number in `arg`, and the various ROUNDABOUT_* variants each get
  // their own wording rather than collapsing into one generic
  // "roundabout" instruction.
  function describeOpcode(opcode, arg) {
    let text = String(opcode || "");

    if (text === "ROUNDABOUT_ENTER") {
      const n = Number(arg) || 0;
      const ord = n === 1 ? "1ª" : n === 2 ? "2ª" : n === 3 ? "3ª" : `${n}ª`;
      return `${T("at the roundabout, take the")} ${ord} ${T("exit")}`;
    }

    if (/^APPROACHING_DESTINATION$/.test(text)) return T("arrive");
    if (/^ROUNDABOUT_(EXIT_)?LEFT$/.test(text)) return T("at the roundabout, turn left");
    if (/^ROUNDABOUT_(EXIT_)?RIGHT$/.test(text)) return T("at the roundabout, turn right");
    if (/^ROUNDABOUT_(EXIT_)?STRAIGHT$/.test(text)) return T("at the roundabout, continue straight");
    if (/^ROUNDABOUT_U$/.test(text)) return T("at the roundabout, make a U-turn");
    if (/^UTURN$/.test(text)) return T("make a U-turn");

    const simple = {
      TURN_LEFT: "turn left",
      TURN_RIGHT: "turn right",
      KEEP_LEFT: "keep left",
      KEEP_RIGHT: "keep right",
      EXIT_LEFT: "exit left",
      EXIT_RIGHT: "exit right",
      CONTINUE: "continue",
      BEGIN: "start driving",
      NONE: "none",
    };
    if (simple[text]) return T(simple[text]);
    return text.toLowerCase().replace(/_/g, " ");
  }

  // Walks one route's results and produces the manoeuvres worth drawing.
  // Mirrors Route Checker's filtering: opcodes with nothing to say are
  // skipped, and a plain ROUNDABOUT_EXIT with no lane guidance is
  // dropped because the matching ROUNDABOUT_ENTER already described it.
  function buildRouteInstructions(route) {
    const results = Array.isArray(route?.results) ? route.results : [];
    const streetNames = route?.streetNames || {};
    const out = [];
    const leftHand = !!UW?.W?.model?.isLeftHand;

    for (let i = 0; i < results.length; i++) {
      const instr = results[i]?.instruction;
      const opcode = instr?.opcode;
      if (!opcode) continue;

      if (/ROUNDABOUT_EXIT|NONE/.test(opcode) && instr.laneGuidance == null) continue;
      if (opcode === "NONE" && !instr.laneGuidance?.enable_display && !instr.laneGuidance?.enable_voice) continue;

      const arrow = getTurnArrow(opcode, instr.arg);
      const streetName = getNextStreetName(results, i, streetNames);
      let text = describeOpcode(opcode, instr.arg);

      // "keep right" that is really an exit, per isKeepForExit above.
      const keepWord = leftHand ? T("keep left") : T("keep right");
      if (text === keepWord && i + 1 < results.length
          && isKeepForExit(results[i]?.roadType, results[i + 1]?.roadType)) {
        text = leftHand ? T("exit left") : T("exit right");
      }

      if (text === T("none")) continue;

      // Where the marker goes: an arrival sits at the very end of the
      // drawn line, everything else at the start of the segment you're
      // being told to move onto.
      const isArrive = text === T("arrive");
      const point = isArrive
        ? (route.coords?.length ? route.coords[route.coords.length - 1] : null)
        : (results[i + 1]?.path || null);

      out.push({
        opcode, arrow, text, streetName, point, isArrive,
        length: Number(results[i]?.length) || 0,
      });
    }
    return out;
  }

  // "turn left onto Rua X" / "arrive at Rua X".
  function formatInstructionTitle(item) {
    let title = item.text;
    if (item.streetName) {
      title += ` ${item.isArrive ? T("at") : T("onto")} ${item.streetName}`;
    } else if (item.isArrive) {
      title += ` ${T("at")} ${T("destination")}`;
    }
    return title;
  }

  // Builds one usable route from a response node, pulling each piece from
  // wherever the server actually put it.
  //
  // ⚠️ Confirmed from a real response: the envelope is
  //   { response: { results, streetNames, ... }, coords: [...] }
  // — the GEOMETRY sits BESIDE `response`, not inside it, while the
  // results and street names sit within. Returning `json.response`
  // wholesale (as this did) yields a route with results but zero coords,
  // so nothing is ever drawn and the failure is silent. Each field is
  // therefore resolved independently, checking the node itself first and
  // falling back to its nested `response`.
  function normalizeRoute(node) {
    if (!node) return null;
    const inner = node.response || {};
    const coords = node.coords || inner.coords || [];
    const results = node.results || inner.results || [];
    const streetNames = node.streetNames || inner.streetNames || {};
    if (!coords.length && !results.length) return null;
    return { ...inner, ...node, coords, results, streetNames };
  }

  function extractRoutes(json) {
    if (!json) return [];
    const alts = (Array.isArray(json.alternatives) && json.alternatives.length)
      ? json.alternatives
      : (Array.isArray(json.response?.alternatives) && json.response.alternatives.length
        ? json.response.alternatives
        : null);
    if (alts) return alts.map(normalizeRoute).filter(Boolean);
    const single = normalizeRoute(json);
    return single ? [single] : [];
  }

  function routeCoordPairs(route) {
    const coords = Array.isArray(route?.coords) ? route.coords : [];
    return coords
      .map((c) => [c.x ?? c[0], c.y ?? c[1]])
      .filter((p) => Number.isFinite(p[0]) && Number.isFinite(p[1]))
      .filter((p, i, arr) => i === 0 || p[0] !== arr[i - 1][0] || p[1] !== arr[i - 1][1]);
  }

  function drawRouteLine(coords4326, colorIndex) {
    const ol = UW?.OpenLayers;
    const map = getOlMap();
    // Logged rather than silently returning false: "no line appeared" has
    // several possible causes and they need telling apart.
    if (!ol || !map || !routeLayer || coords4326.length < 2) {
      dlog("drawRouteLine skipped", {
        hasOl: !!ol, hasMap: !!map, hasLayer: !!routeLayer, coords: coords4326.length,
      });
      return false;
    }
    try {
      const proj4326 = new ol.Projection("EPSG:4326");
      const projMap = map.getProjectionObject?.() || map.projection;
      const points = coords4326.map(([lon, lat]) =>
        new ol.Geometry.Point(lon, lat).transform(proj4326, projMap));
      routeLayer.addFeatures([
        new ol.Feature.Vector(new ol.Geometry.LineString(points), { type: "route-line" }, {
          strokeColor: ROUTE_COLORS[colorIndex % ROUTE_COLORS.length],
          // The primary route is still slightly thicker/more opaque so
          // it reads as "the main one" where routes overlap — but the
          // gap is small now. The previous gap (7px/0.85 vs 5px/0.55)
          // is what made alternatives nearly invisible; vivid colour
          // alone doesn't help if it's also thin and half-transparent.
          strokeWidth: colorIndex === 0 ? 7 : 6,
          strokeOpacity: colorIndex === 0 ? 0.9 : 0.85,
        }),
      ]);
      dlog("drawRouteLine added", {
        colorIndex, points: points.length,
        featuresOnLayer: routeLayer.features?.length ?? -1,
        visible: routeLayer.getVisibility?.() ?? "n/a",
      });
      return true;
    } catch (err) {
      dlog("drawRouteLine failed", err);
      return false;
    }
  }

  // Draws the ACTIVE route leg-by-leg, each leg coloured by its own
  // speed and labelled with the km/h, instead of one flat route-colour
  // line — ported from WME Route Speeds' per-segment styling. A dark
  // outline is drawn under every leg first (Route Speeds' own trick) so
  // adjacent legs stay visually separated even when two neighbouring
  // speed bands land on similar colours.
  //
  // Returns false (and draws nothing) on any failure so the caller can
  // fall back to the plain single-colour drawRouteLine — a route line
  // is always better than none.
  function drawRouteSpeedGradient(route) {
    const ol = UW?.OpenLayers;
    const map = getOlMap();
    if (!ol || !map || !routeLayer) return false;

    let segments;
    try { segments = splitRouteGeometryIntoSegments(route); } catch (err) {
      dlog("splitRouteGeometryIntoSegments failed", err);
      return false;
    }
    if (!segments.length) return false;

    const results = Array.isArray(route?.results) ? route.results : [];

    try {
      const proj4326 = new ol.Projection("EPSG:4326");
      const projMap = map.getProjectionObject?.() || map.projection;
      // Projects a [lon,lat] to map coords ONCE and returns plain
      // numbers. Fresh ol.Geometry.Point objects are then built from
      // those numbers wherever one is needed. Transforming straight to
      // Point objects and reusing them isn't safe here: an OL2
      // LineString takes ownership of its component points (it sets
      // `parent` on each), so the same Point can't back both the
      // outline and the coloured line. Caching the numbers instead
      // halves the projection maths without sharing any geometry.
      const toXY = ([lon, lat]) => {
        const p = new ol.Geometry.Point(lon, lat).transform(proj4326, projMap);
        return [p.x, p.y];
      };

      const features = [];
      const mainFeatures = [];
      const labelFeatures = [];

      for (const seg of segments) {
        if (seg.coords.length < 2) continue;
        const leg = results[seg.legIndex] || {};
        const speed = routeSegmentSpeedKmh(Number(leg.length) || 0, Number(leg.crossTime) || 0);
        const color = routeSpeedColor(speed);

        const xy = seg.coords.map(toXY);
        const mkPoints = () => xy.map(([x, y]) => new ol.Geometry.Point(x, y));

        features.push(
          new ol.Feature.Vector(new ol.Geometry.LineString(mkPoints()), { type: "route-speed-outline" }, {
            strokeColor: "#20242b", strokeWidth: 11, strokeOpacity: 0.85,
          }),
        );
        mainFeatures.push(
          new ol.Feature.Vector(new ol.Geometry.LineString(mkPoints()), { type: "route-speed-main" }, {
            strokeColor: color, strokeWidth: 8, strokeOpacity: 0.95,
          }),
        );

        // Labels are skipped on legs too short to hold the text. A long
        // route is mostly made of very short legs (every junction ends
        // one), and drawing a km/h number on each produced an
        // unreadable pile of overlapping text as well as hundreds of
        // needless features. Judged in projected map units, which are
        // metres in WME's spherical-mercator projection, so the cutoff
        // means roughly "at least 40 m of road to label".
        const legLenM = Number(leg.length) || 0;
        if (legLenM >= ROUTE_SPEED_LABEL_MIN_LENGTH_M) {
          const midLonLat = lineMidpointLonLat(seg.coords);
          if (midLonLat) {
            const [mx, my] = toXY(midLonLat);
            labelFeatures.push(
              new ol.Feature.Vector(new ol.Geometry.Point(mx, my), { type: "route-speed-label" }, {
                label: routeSpeedLabel(speed), fontColor: "#ffffff", fontSize: "11px", fontWeight: "bold",
                labelOutlineColor: "#1f2933", labelOutlineWidth: 3, labelAlign: "cm",
                pointRadius: 0, fillOpacity: 0, strokeOpacity: 0, graphicZIndex: 9100,
              }),
            );
          }
        }
      }

      if (!mainFeatures.length) return false;
      // Outline first (bottom), then colour (middle), then labels (top)
      // — matches WME Route Speeds' own draw order. Concatenated into a
      // SINGLE addFeatures call: OL2 triggers a layer redraw per call,
      // so three calls meant three full redraws of the same features
      // for no benefit, and within one call draw order still follows
      // array order.
      features.push(...mainFeatures, ...labelFeatures);
      routeLayer.addFeatures(features);
      dlog("drawRouteSpeedGradient added", { legs: segments.length, labels: labelFeatures.length });
      return true;
    } catch (err) {
      dlog("drawRouteSpeedGradient failed", err);
      return false;
    }
  }

  // Instruction markers are drawn for the ACTIVE route only — the same
  // choice Route Checker makes for its primary route. Overlaying three
  // routes' worth of turn arrows produces an unreadable map, and the
  // alternatives are there to compare shape and timing, not to be
  // followed turn by turn.
  function drawRouteInstructions(route) {
    const ol = UW?.OpenLayers;
    const map = getOlMap();
    if (!ol || !map || !routeLayer) return;
    let items;
    try { items = buildRouteInstructions(route); } catch (err) { dlog("buildRouteInstructions failed", err); return; }
    if (!items.length) return;

    try {
      const proj4326 = new ol.Projection("EPSG:4326");
      const projMap = map.getProjectionObject?.() || map.projection;
      const features = [];

      for (const item of items) {
        const pt = item.point;
        if (!pt) continue;
        const lon = pt.x ?? pt[0];
        const lat = pt.y ?? pt[1];
        if (!Number.isFinite(lon) || !Number.isFinite(lat)) continue;

        const geom = new ol.Geometry.Point(lon, lat).transform(proj4326, projMap);
        const title = formatInstructionTitle(item);

        features.push(
          new ol.Feature.Vector(geom.clone(), { type: "turn-dot" }, {
            pointRadius: 9, fillColor: "#1f2933", fillOpacity: 0.9,
            strokeColor: "#fff", strokeWidth: 2, graphicZIndex: 9200,
          }),
          new ol.Feature.Vector(geom.clone(), { type: "turn-arrow" }, {
            label: item.arrow || "\u2022", fontColor: "#ffffff", fontSize: "13px",
            fontWeight: "bold", labelAlign: "cm",
            pointRadius: 0, fillOpacity: 0, strokeOpacity: 0, graphicZIndex: 9201,
          }),
          new ol.Feature.Vector(geom.clone(), { type: "turn-label" }, {
            label: title, fontColor: "#ffffff", fontSize: "11px", fontWeight: "bold",
            labelOutlineColor: "#1f2933", labelOutlineWidth: 4,
            labelAlign: "cb", labelYOffset: 20,
            pointRadius: 0, fillOpacity: 0, strokeOpacity: 0, graphicZIndex: 9202,
          }),
        );
      }

      if (features.length) routeLayer.addFeatures(features);
    } catch (err) {
      dlog("drawRouteInstructions failed", err);
    }
  }

  // Redraws every currently-known route (`routes`) onto the map: the
  // ACTIVE one (`activeIndex`) with the per-segment speed gradient (or a
  // plain line, when that's toggled off or the split fails) plus its
  // turn instructions, everything else as a plain single-colour line.
  // Shared by the initial fetch and by switching the active alternative
  // in the details panel — neither of those needs a fresh network
  // request, just a re-render of routes already in hand.
  function redrawRouteLinesOnMap(routes, activeIndex) {
    try { routeLayer?.removeAllFeatures?.(); } catch {}

    const st = loadSettings();
    const showSpeeds = st.routeShowSpeeds !== false;

    for (let i = routes.length - 1; i >= 0; i--) {
      if (i === activeIndex) {
        const drewGradient = showSpeeds && drawRouteSpeedGradient(routes[i]);
        if (!drewGradient) drawRouteLine(routeCoordPairs(routes[i]), i);
      } else {
        drawRouteLine(routeCoordPairs(routes[i]), i);
      }
    }
    if (routes[activeIndex]) drawRouteInstructions(routes[activeIndex]);
  }

  /* ------------------------------------------------------------------ *
   *  Route details panel (opt-in)
   *
   *  A persistent, draggable, natively-resizable panel — not a modal:
   *  no backdrop, no outside-click handler, appended to the map once and
   *  shown/hidden from then on. That is what makes "click outside
   *  without closing it" true; a modal built from openModal() couldn't
   *  do that without changing what every OTHER dialog in this script
   *  does when you click away from it.
   * ------------------------------------------------------------------ */

  let routeDetailsEl = null;
  const ROUTE_DETAILS_POS_KEY = `${SCRIPT_ID}:routeDetailsPos:v1`;
  const ROUTE_DETAILS_SIZE_KEY = `${SCRIPT_ID}:routeDetailsSize:v1`;

  // Sums the per-leg fields WME Route Checker itself accumulates the
  // same way (route.results[i].length / .crossTime) — the confirmed
  // source of both a route's total distance and total time.
  function routeTotals(route) {
    const results = Array.isArray(route?.results) ? route.results : [];
    let totalDist = 0;
    let totalTime = 0;
    for (const r of results) {
      totalDist += Number(r?.length) || 0;
      totalTime += Number(r?.crossTime) || 0;
    }
    return { totalDist, totalTime };
  }

  // ─── Time-of-day / day-of-week recalculation (imported from WME Route
  // Speeds) ───────────────────────────────────────────────────────────
  // The routing server's own convention: "at" is a signed minute offset
  // from the moment of the request (0 = now, negative = in the past).
  // hourVal is "now" or a minutes-since-midnight string ("0".."1410" in
  // 30-min steps, matching the dropdown's option values); dayVal is
  // "today" or a JS Date.getDay() digit ("0".."6", Sunday = 0). This is
  // the same day/hour → offset arithmetic as Route Speeds' getnowtoday,
  // reduced to just the pieces this panel's two dropdowns need.
  function computeRouteAtOffsetMinutes(hourVal, dayVal) {
    const now = new Date();
    const nowMinuteOfDay = now.getHours() * 60 + now.getMinutes();
    const nowAbsolute = now.getDay() * 1440 + nowMinuteOfDay;

    let targetAbsolute = nowAbsolute;
    if (hourVal === "now") {
      if (dayVal !== "today") {
        targetAbsolute = parseInt(dayVal, 10) * 1440 + nowMinuteOfDay;
      }
    } else {
      const hourMinutes = parseInt(hourVal, 10);
      const dayIndex = dayVal === "today" ? now.getDay() : parseInt(dayVal, 10);
      targetAbsolute = dayIndex * 1440 + (Number.isFinite(hourMinutes) ? hourMinutes : nowMinuteOfDay);
    }
    return targetAbsolute - nowAbsolute;
  }

  const ROUTE_WEEKDAY_KEYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  // "Agora" / "Hoje 14:00" / "Segunda-feira 08:30" — a short human label
  // for the same offset computeRouteAtOffsetMinutes produced, shown back
  // in the panel so switching alternatives later doesn't lose track of
  // which time the numbers on screen are actually for.
  function formatRouteAtLabel(atMinutes) {
    if (!atMinutes) return T("Now");
    const now = new Date();
    const target = new Date(now.getTime() + atMinutes * 60000);
    const hh = String(target.getHours()).padStart(2, "0");
    const mm = String(target.getMinutes()).padStart(2, "0");
    const sameDay = target.getDate() === now.getDate() && target.getMonth() === now.getMonth() && target.getFullYear() === now.getFullYear();
    const dayLabel = sameDay ? T("Today") : T(ROUTE_WEEKDAY_KEYS[target.getDay()]);
    return `${dayLabel} ${hh}:${mm}`;
  }

  // "5:32" / "1:05:32" — always down to the second, the same colon
  // notation WME Route Speeds' own getTimeText uses. Replaced the
  // earlier "X h Y min" text: rounding a route's total time to the
  // nearest minute was hiding exactly the seconds-level detail this is
  // meant to show.
  function formatRouteTime(totalSecondsRaw) {
    const totalSeconds = Math.max(0, Math.round(Number(totalSecondsRaw) || 0));
    const seconds = totalSeconds % 60;
    const minutes = Math.floor(totalSeconds / 60) % 60;
    const hours = Math.floor(totalSeconds / 3600);
    if (hours === 0) return `${minutes}:${String(seconds).padStart(2, "0")}`;
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  // "300 m" / "1.4 km" for a SINGLE leg, or "" when it's too short to be
  // worth showing at all (a few metres either side of a turn isn't
  // meaningful). Deliberately separate from formatRouteDistanceTotal
  // below, which always shows something even for a very short total.
  function formatRouteDistance(distM) {
    const d = Number(distM);
    if (!Number.isFinite(d) || d <= 50) return "";
    if (d < 1000) return `${Math.round(d / 10) * 10} ${T("m")}`;
    return `${(d / 1000).toFixed(1)} ${T("km")}`;
  }

  function ensureRouteDetailsPanel() {
    const mapEl = getMapContainerEl();
    if (!mapEl) return null;
    if (routeDetailsEl && document.contains(routeDetailsEl)) return routeDetailsEl;

    const el = document.createElement("div");
    el.className = "wmeRcRD hidden";

    try {
      const pos = JSON.parse(localStorage.getItem(ROUTE_DETAILS_POS_KEY) || "null");
      if (pos && Number.isFinite(pos.left) && Number.isFinite(pos.top)) {
        el.style.left = `${Math.max(0, pos.left)}px`;
        el.style.top = `${Math.max(0, pos.top)}px`;
      }
    } catch {}
    try {
      const size = JSON.parse(localStorage.getItem(ROUTE_DETAILS_SIZE_KEY) || "null");
      // Only trust a saved size if it's at least as roomy as this
      // panel's own comfortable floor. Guards against a stale size
      // saved back when the panel's CSS default was smaller (before the
      // time-of-day controls row existed) — without this, a user who'd
      // never manually resized would still be stuck with the old
      // cramped dimensions forever, since a saved size always overrides
      // the (now bigger) CSS default below.
      if (size && Number.isFinite(size.width) && Number.isFinite(size.height)
          && size.width >= 380 && size.height >= 480) {
        el.style.width = `${size.width}px`;
        el.style.height = `${size.height}px`;
      }
    } catch {}

    const hdr = document.createElement("div");
    hdr.className = "wmeRcRDHdr";
    const title = document.createElement("div");
    title.textContent = T("Route details");
    const closeBtn = document.createElement("div");
    closeBtn.className = "wmeRcRDClose";
    closeBtn.innerHTML = ICONS.close;
    closeBtn.title = T("Close");
    closeBtn.addEventListener("click", () => el.classList.add("hidden"));
    hdr.appendChild(title);
    hdr.appendChild(closeBtn);

    // Time-of-day / day-of-week controls — imported from WME Route
    // Speeds' own sidebar hour/day selects and "Calculate Route" button,
    // reduced to just what recalculating an already-drawn route needs.
    // Kept as a fixed row OUTSIDE the scrollable body (which
    // renderRouteDetailsBody wipes and rebuilds on every render/alt
    // switch) so the dropdowns' own selections survive that.
    const controls = document.createElement("div");
    controls.className = "wmeRcRDControls";

    const hourSelect = document.createElement("select");
    hourSelect.className = "wmeRcRDSelect wmeRcRDHour";
    hourSelect.appendChild(new Option(T("Now"), "now"));
    for (let m = 0; m < 1440; m += 30) {
      const hh = String(Math.floor(m / 60)).padStart(2, "0");
      const mm = String(m % 60).padStart(2, "0");
      hourSelect.appendChild(new Option(`${hh}:${mm}`, String(m)));
    }

    const daySelect = document.createElement("select");
    daySelect.className = "wmeRcRDSelect wmeRcRDDay";
    daySelect.appendChild(new Option(T("Today"), "today"));
    // Monday(1)…Saturday(6), Sunday(0) last — the order editors expect
    // to read a week in, even though the stored value is JS's
    // Sunday-first getDay() digit.
    for (const d of [1, 2, 3, 4, 5, 6, 0]) {
      daySelect.appendChild(new Option(T(ROUTE_WEEKDAY_KEYS[d]), String(d)));
    }

    const recalcBtn = document.createElement("button");
    recalcBtn.type = "button";
    recalcBtn.className = "wmeRcRDRecalcBtn";
    recalcBtn.textContent = T("Recalculate");
    recalcBtn.addEventListener("click", () => {
      if (!lastRouteStartPoint || !lastRouteEndPoint) {
        toast(T("No route to recalculate — test a route first."));
        return;
      }
      const atMinutes = computeRouteAtOffsetMinutes(hourSelect.value, daySelect.value);
      toast(T("Recalculating route…"));
      fetchAndDrawRoute(lastRouteStartPoint, lastRouteEndPoint, { atMinutes, resetActive: false });
    });

    controls.appendChild(hourSelect);
    controls.appendChild(daySelect);
    controls.appendChild(recalcBtn);

    const body = document.createElement("div");
    body.className = "wmeRcRDBody wmeRcScroll";

    el.appendChild(hdr);
    el.appendChild(controls);
    el.appendChild(body);

    // Same convention as the pins panel: swallow events at the panel's
    // own boundary so a click/wheel/etc. inside it never reaches WME's
    // map underneath. This is also HALF of what makes clicking OUTSIDE
    // the panel harmless — the other half is simply that nothing in
    // this script ever listens for an outside click on this panel at
    // all, unlike a real modal.
    for (const evt of ["mousedown", "click", "dblclick", "contextmenu", "touchstart", "wheel"]) {
      el.addEventListener(evt, (e) => e.stopPropagation(), evt === "wheel" ? { passive: true } : false);
    }

    // Dragging via the header only. Simpler than the pins panel's own
    // drag handling (no collapse/expand bubble state to protect a plain
    // tap for), but the same movement-threshold idea: a click that
    // never moves is left alone so the close button's own click still
    // fires normally.
    let drag = null;
    hdr.addEventListener("pointerdown", (ev) => {
      if (ev.target?.closest?.(".wmeRcRDClose")) return;
      if (ev.button != null && ev.button !== 0) return;
      const r = el.getBoundingClientRect();
      const mr = mapEl.getBoundingClientRect();
      // Both rects are captured ONCE here and reused for the whole
      // gesture. The move handler used to call getBoundingClientRect()
      // on each of them on every pointermove, and each call forces a
      // synchronous layout — two forced reflows per frame for the
      // duration of the drag. Neither rect can actually change while
      // dragging: the panel isn't being resized, and the map element
      // isn't moving.
      drag = {
        id: ev.pointerId, x: ev.clientX, y: ev.clientY,
        left: r.left - mr.left, top: r.top - mr.top, active: false,
        mapW: mr.width, mapH: mr.height, elW: r.width,
      };

      const move = (e) => {
        if (!drag || (drag.id != null && e.pointerId !== drag.id)) return;
        if (!drag.active) {
          if (Math.abs(e.clientX - drag.x) <= 4 && Math.abs(e.clientY - drag.y) <= 4) return;
          drag.active = true;
          try { hdr.setPointerCapture(drag.id); } catch {}
        }
        e.preventDefault();
        const left = clamp(drag.left + (e.clientX - drag.x), 0, Math.max(0, drag.mapW - drag.elW));
        const top = clamp(drag.top + (e.clientY - drag.y), 0, Math.max(0, drag.mapH - 40));
        el.style.left = `${Math.round(left)}px`;
        el.style.top = `${Math.round(top)}px`;
      };
      const detach = () => {
        document.removeEventListener("pointermove", move, true);
        document.removeEventListener("pointerup", up, true);
        document.removeEventListener("pointercancel", up, true);
      };
      const up = () => {
        if (drag?.active) {
          try {
            localStorage.setItem(ROUTE_DETAILS_POS_KEY, JSON.stringify({
              left: parseFloat(el.style.left) || 0, top: parseFloat(el.style.top) || 0,
            }));
          } catch {}
        }
        drag = null;
        detach();
      };
      document.addEventListener("pointermove", move, true);
      document.addEventListener("pointerup", up, true);
      document.addEventListener("pointercancel", up, true);
    });

    // Native CSS resize (see .wmeRcRD's own `resize:both`) rather than a
    // custom resize-drag handler — the browser already does this
    // correctly, including touch support, for free. ResizeObserver is
    // what notices when it happens, since there's no pointer event of
    // our own to hook a "resize finished" moment onto.
    //
    // Debounced: ResizeObserver fires on every frame of a resize drag,
    // and localStorage.setItem is a SYNCHRONOUS main-thread write. Left
    // undebounced this did a JSON.stringify plus a blocking disk-backed
    // write dozens of times a second for the whole drag. Only the final
    // size matters, so the write is deferred until the drag settles.
    try {
      let sizeSaveTimer = null;
      const ro = new ResizeObserver(() => {
        if (sizeSaveTimer) clearTimeout(sizeSaveTimer);
        sizeSaveTimer = setTimeout(() => {
          sizeSaveTimer = null;
          try {
            const r = el.getBoundingClientRect();
            localStorage.setItem(ROUTE_DETAILS_SIZE_KEY, JSON.stringify({ width: Math.round(r.width), height: Math.round(r.height) }));
          } catch {}
        }, 250);
      });
      ro.observe(el);
    } catch {}

    mapEl.appendChild(el);
    routeDetailsEl = el;
    return el;
  }

  // Renders the summary + alternatives + turn-by-turn list for
  // `routes[activeIndex]`, and re-renders in place when a different
  // alternative row is clicked — informational only, this never
  // re-draws anything on the map itself.
  function renderRouteDetailsBody(routes, activeIndex) {
    if (!routeDetailsEl) return;
    routeDetailsEl.classList.toggle("theme-light", isLightTheme());
    const body = routeDetailsEl.querySelector(".wmeRcRDBody");
    if (!body) return;
    body.innerHTML = "";

    const active = routes[activeIndex] || routes[0];
    const { totalDist, totalTime } = routeTotals(active);

    const summary = document.createElement("div");
    summary.className = "wmeRcRDSummary";
    summary.textContent = `${formatRouteDistanceTotal(totalDist)} — ${formatRouteTime(totalTime)}`;
    body.appendChild(summary);

    const summarySub = document.createElement("div");
    summarySub.className = "wmeRcRDSummarySub";
    summarySub.textContent = routes.length > 1
      ? `${T("Route")} ${activeIndex + 1} ${T("of")} ${routes.length}`
      : T("Route calculated");
    body.appendChild(summarySub);

    // Which time-of-day/day this data is actually for — easy to lose
    // track of once an alternative has been recalculated a couple of
    // times, since the dropdowns above keep whatever was last picked
    // rather than reflecting what's currently drawn.
    const atLbl = document.createElement("div");
    atLbl.className = "wmeRcRDSummarySub wmeRcRDAtLabel";
    atLbl.textContent = `${T("For:")} ${formatRouteAtLabel(lastRouteAtMinutes)}`;
    body.appendChild(atLbl);

    if (routes.length > 1) {
      const altLbl = document.createElement("div");
      altLbl.className = "wmeRcRDSectionLbl";
      altLbl.textContent = T("Alternatives");
      body.appendChild(altLbl);

      routes.forEach((r, i) => {
        const t = routeTotals(r);
        const row = document.createElement("div");
        row.className = "wmeRcRDAlt" + (i === activeIndex ? " active" : "");
        const dot = document.createElement("div");
        dot.className = "wmeRcRDAltColor";
        dot.style.background = ROUTE_COLORS[i % ROUTE_COLORS.length];
        const main = document.createElement("div");
        main.className = "wmeRcRDAltMain";
        main.textContent = i === 0 ? T("Primary route") : `${T("Alternative")} ${i}`;
        const meta = document.createElement("div");
        meta.className = "wmeRcRDAltMeta";
        meta.textContent = `${formatRouteDistanceTotal(t.totalDist)} · ${formatRouteTime(t.totalTime)}`;
        row.appendChild(dot);
        row.appendChild(main);
        row.appendChild(meta);
        row.addEventListener("click", () => {
          if (activeRouteIndex === i) return;
          activeRouteIndex = i;
          redrawRouteLinesOnMap(routes, i);
          renderRouteDetailsBody(routes, i);
        });
        body.appendChild(row);
      });
    }

    const stepsLbl = document.createElement("div");
    stepsLbl.className = "wmeRcRDSectionLbl";
    stepsLbl.textContent = T("Directions");
    body.appendChild(stepsLbl);

    let items = [];
    try { items = buildRouteInstructions(active); } catch (err) { dlog("buildRouteInstructions failed (details panel)", err); }
    if (!items.length) {
      const empty = document.createElement("div");
      empty.className = "wmeRcRDStepStreet";
      empty.textContent = T("No turn-by-turn instructions available for this route.");
      body.appendChild(empty);
      return;
    }
    for (const item of items) {
      const row = document.createElement("div");
      row.className = "wmeRcRDStep";
      const icon = document.createElement("div");
      icon.className = "wmeRcRDStepIcon";
      icon.textContent = item.arrow || "•";
      const main = document.createElement("div");
      main.className = "wmeRcRDStepMain";
      const title = document.createElement("div");
      title.textContent = formatInstructionTitle(item);
      main.appendChild(title);
      const dist = document.createElement("div");
      dist.className = "wmeRcRDStepDist";
      dist.textContent = formatRouteDistance(item.length);
      row.appendChild(icon);
      row.appendChild(main);
      row.appendChild(dist);

      // item.point is {x, y} in lon/lat — the same shape
      // drawRouteInstructions already turns into map markers for this
      // exact step, so a click on the text list and the marker on the
      // map jump to the same spot. No zoom change: recentring is
      // useful, forcing a zoom level on top of that fights whatever
      // zoom the editor was already using to review the route.
      const lon = Number(item.point?.x ?? item.point?.[0]);
      const lat = Number(item.point?.y ?? item.point?.[1]);
      if (Number.isFinite(lon) && Number.isFinite(lat)) {
        row.classList.add("wmeRcRDStepClickable");
        row.title = T("Click to center the map here");
        row.addEventListener("click", () => centerMapOn(lon, lat));
      }
      body.appendChild(row);
    }
  }

  // "1.2 km" / "350 m" for a TOTAL distance — deliberately separate from
  // formatRouteDistance (which returns "" below 50 m, correct for a
  // single short leg but wrong for a route total, which should always
  // show something even if the whole route is only 30 m long).
  function formatRouteDistanceTotal(distM) {
    const d = Number(distM) || 0;
    if (d < 1000) return `${Math.round(d)} ${T("m")}`;
    return `${(d / 1000).toFixed(1)} ${T("km")}`;
  }

  function showRouteDetailsPanel(routes, activeIndex) {
    const el = ensureRouteDetailsPanel();
    if (!el) return;
    el.classList.remove("hidden");
    renderRouteDetailsBody(routes, activeIndex || 0);
  }

  // `atMinutes`: signed minute offset from now, server convention (see
  // computeRouteAtOffsetMinutes) — 0 is "now", what every existing call
  // site got implicitly before this parameter existed.
  // `resetActive`: true for a brand-new A/B pair (always show the
  // primary route first), false for the details panel's "recalculate"
  // button (keep whichever alternative was already highlighted, since
  // the whole point of recalculating there is to see how THAT
  // alternative's time changes).
  async function fetchAndDrawRoute(start, end, { atMinutes = 0, resetActive = true } = {}) {
    const now = Date.now();
    if (now - lastRouteRequestAt < ROUTE_RATE_LIMIT_MS) {
      toast(T("Please wait a moment before testing another route."));
      return;
    }
    lastRouteRequestAt = now;

    const opts = routeOptionsValue();
    const st = loadSettings();
    // bd:true asks the server to snap each end to a real segment rather
    // than routing from open space — without it a click a few metres off
    // the road can silently produce a different (or no) route.
    const params = new URLSearchParams({
      from: `x:${start.lon} y:${start.lat} bd:true`,
      to: `x:${end.lon} y:${end.lat} bd:true`,
      returnJSON: "true",
      returnGeometries: "true",
      returnInstructions: "true",
      type: "HISTORIC_TIME",
      clientVersion: "4.0.0",
      timeout: "60000",
      nPaths: st.routeAlternatives === false ? "1" : "3",
      options: buildRouteOptionsParam(opts),
      // Minutes from now — 0 ("now") behaves exactly like every request
      // before this parameter existed, so it's always sent rather than
      // only when non-zero.
      at: String(Math.round(Number(atMinutes) || 0)),
    });
    const vehicle = routeVehicleType(opts);
    if (vehicle) params.set("vehicleType", vehicle);
    if (location.hostname === "beta.waze.com") params.set("id", "beta");

    const requestUrl = `${routeRequestUrl()}?${params.toString()}`;
    dlog("route request", requestUrl);
    try {
      const res = await gmFetch(requestUrl, { method: "GET" });
      dlog("route response status", { status: res.status, ok: res.ok });
      if (!res.ok) {
        dlog("route request failed", res.status);
        toast(`${T("Could not calculate the route")} (HTTP ${res.status})`);
        return;
      }
      let json = null;
      let bodyText = "";
      try {
        bodyText = await res.text();
        json = JSON.parse(bodyText);
      } catch (err) {
        dlog("route response was not JSON", err, bodyText.slice(0, 300));
      }
      // The top-level keys are what tell us whether extractRoutes below
      // is looking in the right place — without this, an unrecognised
      // envelope is indistinguishable from "the server found no route".
      dlog("route response keys", json ? Object.keys(json) : null,
        json?.response ? `response:[${Object.keys(json.response).join(",")}]` : "");
      if (json?.error) {
        dlog("routing server returned an error", json.error);
        toast(T("No route found between those two points."));
        return;
      }

      const routes = extractRoutes(json);
      dlog("route parse", {
        routes: routes.length,
        coordCounts: routes.map((r) => routeCoordPairs(r).length),
        resultCounts: routes.map((r) => (Array.isArray(r?.results) ? r.results.length : -1)),
        firstRouteKeys: routes[0] ? Object.keys(routes[0]) : null,
      });
      if (!routes.length) {
        toast(T("No route found between those two points."));
        return;
      }

      if (resetActive || activeRouteIndex >= routes.length) activeRouteIndex = 0;
      lastRouteStartPoint = start;
      lastRouteEndPoint = end;
      lastRouteAtMinutes = Math.round(Number(atMinutes) || 0);

      // Drawn back to front so the active route's line ends up on top
      // of the alternatives rather than buried under them. Clearing
      // first (inside redrawRouteLinesOnMap) matters here specifically
      // for a recalculation, which reuses the same layer instead of
      // starting from a freshly cleared one.
      redrawRouteLinesOnMap(routes, activeRouteIndex);
      if (!routeLayer?.features?.length) {
        toast(T("Could not calculate the route"));
        return;
      }
      if (st.routeShowDetails) showRouteDetailsPanel(routes, activeRouteIndex);
      toast(routes.length > 1
        ? `${T("Route calculated")} (${routes.length} ${T("alternatives")})`
        : T("Route calculated"));
    } catch (err) {
      dlog("fetchAndDrawRoute failed", err);
      toast(T("Could not calculate the route"));
    }
  }

  // The radial-menu action. First invocation places A and leaves the
  // menu entry showing B (in red) for the next one; the second places B
  // and immediately requests the route. A third starts a fresh pair
  // rather than accumulating points, which is what "test another route"
  // almost always means.
  function actionRoutePoint(ll) {
    if (!isEditorAllowed()) {
      closeMenu();
      toast(T("This feature is restricted to editors on the approved list."));
      return;
    }
    closeMenu();

    // Phase 3 — a route is on screen, so this click clears it. Checked
    // BEFORE the cursor-position guard: clearing doesn't need a valid
    // map location, and refusing to clear just because the pointer
    // wasn't over the map would leave the user stuck with no way out.
    if (routePhase() === "clear") {
      clearRoute();
      toast(T("Route cleared"));
      return;
    }

    if (!ll || !Number.isFinite(ll.lat) || !Number.isFinite(ll.lon)) {
      toast(T("Move the mouse over the map first."));
      return;
    }
    if (!ensureRouteLayers()) {
      toast(T("Map not ready yet."));
      return;
    }

    // Phase 1 — place A.
    if (!routeStart) {
      routeStart = { lon: Number(ll.lon), lat: Number(ll.lat) };
      addRouteEndpointMarker(routeStart.lon, routeStart.lat, "A", "#2e7d32");
      toast(T("Start (A) placed — now place the end (B)."));
      return;
    }

    // Phase 2 — place B and calculate. routeDrawn is set here rather
    // than inside fetchAndDrawRoute's success path so the menu offers
    // "clear" even when the request fails: the A and B markers are
    // already on the map either way, and the user needs a way to remove
    // them without a working route.
    const end = { lon: Number(ll.lon), lat: Number(ll.lat) };
    addRouteEndpointMarker(end.lon, end.lat, "B", "#e5484d");
    const start = routeStart;
    routeStart = null;
    routeDrawn = true;
    toast(T("Calculating route…"));
    fetchAndDrawRoute(start, end);
  }

  /* ------------------------------------------------------------------ *
   *  Map comment (area) — imported from WazePT Nota Rápida
   *
   *  Only the AREA half of that script: its point-note mode is not
   *  brought over. No custom dialog either, on request — the drawn
   *  shape is turned into a bare comment immediately, then handed
   *  straight to WME's OWN comment editor by selecting it, the same way
   *  clicking an existing map comment on the map would. Title,
   *  description, expiry, and any lock level are filled in through
   *  WME's native panel, not a form of this script's own.
   * ------------------------------------------------------------------ */

  let mapNoteAreaBusy = false;

  async function actionDrawMapNoteArea() {
    if (!isEditorAllowed()) {
      closeMenu();
      toast(T("This feature is restricted to editors on the approved list."));
      return;
    }
    closeMenu();
    if (mapNoteAreaBusy) return;
    if (typeof sdk?.Map?.drawPolygon !== "function") {
      toast(T("Map note drawing isn't available in this WME version."));
      return;
    }

    mapNoteAreaBusy = true;
    toast(T("Click the map to draw the area. Double-click to finish, Esc to cancel."));

    // The busy guard has to cover BOTH the drawing phase and the
    // create-then-open phase. It used to be cleared right after
    // drawPolygon resolved, which left a window where the comment was
    // still being created but a second invocation was already allowed
    // in — producing two comments from one drawn area. try/finally so
    // it's released on every exit path, including a thrown error.
    try {
      let geometry = null;
      try {
        geometry = await sdk.Map.drawPolygon();
      } catch (err) {
        // A cancelled drawing (Esc) surfaces as an InvalidStateError — not
        // a real failure, so it gets no error toast, matching Nota
        // Rápida's own handling of exactly this case.
        const isCancel = sdk?.Errors && err instanceof sdk.Errors.InvalidStateError;
        if (!isCancel) {
          dlog("drawPolygon failed", err);
          toast(T("Something went wrong while drawing. Check the console for details."));
        }
        return;
      }

      if (!geometry) {
        toast(T("Invalid area — draw at least 3 points without crossing lines, then try again."));
        return;
      }

      try {
        const newKey = await createBareMapComment(geometry);
        if (newKey == null) {
          // Created, but the before/after diff below found no new key to
          // open — surfaced honestly rather than pretending it worked.
          toast(T("Comment created, but it couldn't be opened automatically. Find it on the map to edit it."));
          return;
        }
        openNativeMapCommentEditor(newKey);
      } catch (err) {
        dlog("createBareMapComment failed", err);
        toast(T("Could not create the map note. Check the console for details."));
      }
    } finally {
      mapNoteAreaBusy = false;
    }
  }

  // Possible names for the "create a map comment" method, across SDK
  // versions — Nota Rápida's own field notes: the public docs have used
  // both "addMapComment" and "addComment" at different times, and this
  // tries each in turn rather than betting on one.
  const MAP_COMMENT_METHOD_CANDIDATES = ["addMapComment", "addComment", "createMapComment", "create"];

  function resolveAddMapCommentFn() {
    const mc = sdk?.DataModel?.MapComments;
    if (!mc) throw new Error("sdk.DataModel.MapComments is not available in this SDK version.");
    for (const name of MAP_COMMENT_METHOD_CANDIDATES) {
      if (typeof mc[name] === "function") return mc[name].bind(mc);
    }
    throw new Error("No known method to create a map note was found on sdk.DataModel.MapComments.");
  }

  // Creates a comment with just the drawn geometry — no title/body of
  // our own asking, since WME's own editor (opened right after this) is
  // where those get filled in. Returns the new comment's model key, or
  // null if none could be identified.
  //
  // ⚠️ Like sdk.DataModel.RoadClosures.addClosure elsewhere in this file,
  // addMapComment doesn't hand back the object it just created — a
  // before/after diff of the model's own key list is the only way to
  // find it again. UW.W.model.mapComments.objects is the guessed
  // location, following the SAME W.model.<pluralCamelCase>.objects shape
  // already confirmed for roadClosures in this exact file; it is NOT
  // independently confirmed for map comments specifically. Logged either
  // way so a "the editor never opened" report has something concrete to
  // check.
  //
  // ⚠️ endDate history, confirmed directly from the SDK's OWN error text
  // and behaviour in the field (not guessed):
  //   - omitted entirely  → "Invalid arguments: endDate must be defined"
  //   - endDate: null     → "Invalid arguments: endDate cannot be null"
  //   - endDate: 0        → accepted, no error — but WME shows this as a
  //                         real 1 Jan 1970 expiry, not "no expiry".
  // So the field is REQUIRED, must be a real non-null value, AND there is
  // no confirmed sentinel this API treats as "never expires" — WME's own
  // native drawing tool must be creating comments through a different
  // path than this SDK method exposes. Given that, this stops chasing a
  // sentinel and uses an unmistakable PLACEHOLDER future date instead:
  // the comment opens directly in WME's own native edit panel right
  // after this, where the expiry field can simply be cleared by hand if
  // WME's own UI allows clearing it (unconfirmed, but a reasonable bet —
  // update validation is often looser than create validation). Three
  // months out, on request: long enough that an area comment left in
  // place through a normal editing cycle doesn't quietly expire before
  // the work it marks is finished.
  async function createBareMapComment(geometry) {
    const args = { geometry, subject: "", body: "" };
    dlog("createBareMapComment args", args);
    const addFn = resolveAddMapCommentFn();
    const keysBefore = new Set(Object.keys(UW?.W?.model?.mapComments?.objects || {}));

    const isValidationError = (err) => sdk?.Errors && err instanceof sdk.Errors.ValidationError;

    try {
      await addFn(args);
    } catch (err) {
      if (!isValidationError(err)) throw err;
      dlog("createBareMapComment: no endDate rejected, retrying with a placeholder near-future date", err);
      // 3 months out. Confirmed there is no accepted "never" sentinel, so
      // this is a deliberate, honest placeholder — not a further guess
      // at a magic value, since 0 already disproved that idea.
      // Calendar-accurate (setMonth), not a fixed day count, so the
      // placeholder lands on the same day-of-month 3 months out
      // regardless of how many days those months actually contain.
      const placeholder = new Date();
      placeholder.setMonth(placeholder.getMonth() + 3);
      await addFn({ ...args, endDate: placeholder.getTime() });
    }

    const newKeys = Object.keys(UW?.W?.model?.mapComments?.objects || {}).filter((k) => !keysBefore.has(k));
    dlog("createBareMapComment newKeys", newKeys);
    return newKeys.length ? newKeys[0] : null;
  }

  // Selects the freshly created comment exactly the way clicking an
  // existing one on the map would, which is what actually opens WME's
  // own edit panel for it in the left sidebar — the whole point of
  // dropping this script's own form.
  //
  // ⚠️ "mapComment" as the objectType string is this file's best-informed
  // guess (segment/venue selection elsewhere in this codebase follows
  // the same lowercase-camelCase pattern), not a confirmed value — no
  // documentation available here pins the exact string WME expects for
  // a map comment. If it's wrong, setSelection should throw, which is
  // caught and logged rather than left as a silent no-op.
  function openNativeMapCommentEditor(key) {
    try {
      sdk.Editing.setSelection({ selection: { objectType: "mapComment", ids: [key] } });
      toast(T("Map note created"));
    } catch (err) {
      dlog("openNativeMapCommentEditor failed", err);
      toast(T("Comment created, but it couldn't be opened automatically. Find it on the map to edit it."));
    }
  }

  /* ------------------------------------------------------------------ *
   *  Split segment — imported from WazePT Segments
   *
   *  Confirmed API: sdk.DataModel.Segments.splitSegment({ segmentId,
   *  splitPoint: { type: "Point", coordinates: [lon, lat] } }) — and,
   *  unlike addClosure/addMapComment elsewhere in this file, it DOES
   *  hand back the two new segment ids directly, no before/after diff
   *  needed here.
   *
   *  Two modes, matching what was asked for:
   *   - cursor already on a segment when the menu opened (hitSeg is
   *     set): split immediately, no confirmation.
   *   - cursor not on a segment: draw a guide line to the nearest one
   *     (same idea as WME Toolbox's split tool) and split on the next
   *     left-click, wherever that nearest point turns out to be.
   * ------------------------------------------------------------------ */

  let splitGuideLayer = null;
  // Whether "click nearest to split" mode is currently armed. Read by
  // the always-on mouse-move/mousedown handlers below, which otherwise
  // do nothing — this keeps the feature at zero runtime cost for
  // everyone who hasn't turned it on, without needing to dynamically
  // add/remove event listeners (an API this codebase doesn't otherwise
  // rely on sdk.Events exposing).
  let splitPickModeActive = false;
  // { segmentId, lon, lat } for whatever the guide line is currently
  // pointing at, or null while nothing is within range.
  let splitPickTarget = null;
  let splitPickEscHandler = null;
  // How far the "nearest segment" search reaches, in screen pixels —
  // generous compared to the ordinary hover-to-select radius
  // (segmentSnapRadiusPx), since the whole point of this mode is
  // reaching a segment the cursor ISN'T already on top of.
  const SPLIT_PICK_RADIUS_PX = 600;

  function ensureSplitGuideLayer() {
    try {
      const ol = UW?.OpenLayers;
      const map = getOlMap();
      if (!ol || !map || typeof map.addLayer !== "function") return null;
      if (!splitGuideLayer || !(Array.isArray(map.layers) && map.layers.includes(splitGuideLayer))) {
        splitGuideLayer = new ol.Layer.Vector("WazePT Split Guide", {
          displayInLayerSwitcher: false,
          uniqueName: `${SCRIPT_ID}_splitGuide`,
        });
        map.addLayer(splitGuideLayer);
      }
      try { splitGuideLayer.setVisibility(true); } catch {}
      return splitGuideLayer;
    } catch {
      return null;
    }
  }

  function clearSplitGuideLine() {
    try { splitGuideLayer?.removeAllFeatures?.(); } catch {}
    splitPickTarget = null;
  }

  // Redraws the dashed guide line from the current cursor position to
  // the closest point on the nearest segment, or clears it when nothing
  // is within SPLIT_PICK_RADIUS_PX. findSegmentUnderCursor already does
  // exactly this nearest-point projection — reused as-is with a much
  // larger radius than its usual hover-to-select role.
  function updateSplitGuideLine(cursorLL) {
    if (!splitGuideLayer) return;
    if (!cursorLL) { clearSplitGuideLine(); return; }

    const hit = findSegmentUnderCursor(cursorLL, SPLIT_PICK_RADIUS_PX);
    if (!hit) { clearSplitGuideLine(); return; }
    splitPickTarget = hit;

    try {
      const ol = UW?.OpenLayers;
      const map = getOlMap();
      if (!ol || !map) return;
      const proj4326 = new ol.Projection("EPSG:4326");
      const projMap = map.getProjectionObject?.() || map.projection;
      const from = new ol.Geometry.Point(cursorLL.lon, cursorLL.lat).transform(proj4326, projMap);
      const to = new ol.Geometry.Point(hit.lon, hit.lat).transform(proj4326, projMap);
      splitGuideLayer.removeAllFeatures();
      splitGuideLayer.addFeatures([
        new ol.Feature.Vector(new ol.Geometry.LineString([from, to]), {}, {
          strokeColor: "#ffb347", strokeWidth: 3, strokeOpacity: 0.9,
          strokeDashstyle: "dash",
        }),
        new ol.Feature.Vector(to, {}, {
          pointRadius: 6, fillColor: "#ffb347", fillOpacity: 1,
          strokeColor: "#fff", strokeWidth: 2,
        }),
      ]);
    } catch (err) {
      dlog("updateSplitGuideLine failed", err);
    }
  }

  function stopSplitPickMode() {
    splitPickModeActive = false;
    clearSplitGuideLine();
    if (splitPickEscHandler) {
      document.removeEventListener("keydown", splitPickEscHandler, true);
      splitPickEscHandler = null;
    }
  }

  function startSplitPickMode() {
    if (typeof sdk?.DataModel?.Segments?.splitSegment !== "function") {
      toast(T("Splitting isn't available in this WME version."));
      return;
    }
    if (!ensureSplitGuideLayer()) {
      toast(T("Map not ready yet."));
      return;
    }
    splitPickModeActive = true;
    toast(T("Click the nearest segment to split it there. Esc to cancel."));

    splitPickEscHandler = (ev) => {
      if (ev?.key === "Escape") {
        ev.preventDefault();
        stopSplitPickMode();
        toast(T("Split cancelled"));
      }
    };
    document.addEventListener("keydown", splitPickEscHandler, true);
  }

  // Called from onMouseDown below on a left-click while pick mode is
  // active. Single-shot, like the route A/B flow elsewhere in this
  // file: whatever this click does, pick mode ends right after —
  // staying armed indefinitely after a miss would be more confusing
  // than just asking the user to reopen the menu.
  function commitSplitPick() {
    const target = splitPickTarget;
    stopSplitPickMode();
    if (!target) {
      toast(T("No segment was close enough to split."));
      return;
    }
    performSplit(target.segmentId, target.lon, target.lat);
  }

  async function performSplit(segmentId, lon, lat) {
    try {
      const pair = await sdk.DataModel.Segments.splitSegment({
        segmentId: Number(segmentId),
        splitPoint: { type: "Point", coordinates: [lon, lat] },
      });
      if (!Array.isArray(pair) || pair.length !== 2) {
        dlog("splitSegment unexpected result", pair);
        toast(T("Could not split the segment."));
        return;
      }
      toast(T("Segment split"));
    } catch (err) {
      dlog("splitSegment failed", err);
      toast(T("Could not split the segment."));
    }
  }

  // The radial menu action. hitSeg is whatever the menu itself already
  // found under the cursor at open time (buildItems' own parameter) —
  // reused here rather than re-detecting, so "split immediately" is
  // guaranteed to act on the exact segment the menu was opened over.
  function actionSplitSegment(hitSeg) {
    if (!isEditorAllowed()) {
      closeMenu();
      toast(T("This feature is restricted to editors on the approved list."));
      return;
    }
    closeMenu();
    if (hitSeg) {
      performSplit(hitSeg.segmentId, hitSeg.lon, hitSeg.lat);
    } else {
      startSplitPickMode();
    }
  }

  function buildItems(ll, segIds, x, y, hitSeg) {
    const hasLL = !!(ll && Number.isFinite(ll.lat) && Number.isFinite(ll.lon));
    const clickAt = hitSeg ? { x, y } : null;
    const onSegSuffix = hitSeg ? " (on segment)" : "";
    // If nothing is explicitly selected, fall back to whichever segment the
    // cursor is hovering so "Copy permalink" / "Refresh here" still include
    // it — matches the same segment the speed bump / stop light / road
    // tools snap onto.
    const linkSegIds = (segIds && segIds.length) ? segIds : (hitSeg ? [hitSeg.segmentId] : []);

    const canSpeedBump = editorMeetsLevel(MIN_SPEED_BUMP_LEVEL);
    const canStopLight = editorMeetsLevel(MIN_STOP_LIGHT_LEVEL);
    const levelTooltip = (n) => `${T("Requires Level")} ${n} ${T("or above")}`;

    // Which segment(s) "Cortes" should open against.
    //
    // The case that matters: several segments are selected and the user
    // right-clicks ONE of them. Passing only the segment under the cursor
    // would silently drop the rest of the selection — the user did the
    // work of selecting them and has every reason to expect all of them
    // in the closure. So when the hovered segment is part of the current
    // selection, the whole selection wins.
    //
    // Right-clicking a segment OUTSIDE the selection is read as switching
    // target to that one segment, not as adding it: that's the existing
    // "hover a segment and open Cortes without left-clicking it first"
    // behaviour, and it stays intact.
    //
    // Returning null (no hovered segment, nothing selected) leaves
    // closureExplicitTargetIds unset, so the panel falls back to reading
    // WME's live selection as it always did.
    function closureTargetIds() {
      const hovered = Number(hitSeg?.segmentId);
      // segIds comes from selectedSegmentIds() (the SDK read). The
      // closure code has always trusted W.selectionManager first, since
      // that's what proved reliable there — fall back to it here too, so
      // a selection the SDK read misses still reaches the panel.
      let selected = (segIds || []).map(Number).filter(Number.isFinite);
      if (!selected.length) {
        const live = getClosureSelection();
        if (live.objectType === "segment") selected = live.ids.map(Number).filter(Number.isFinite);
      }
      if (Number.isFinite(hovered)) {
        return selected.includes(hovered) ? selected : [hovered];
      }
      return selected.length ? selected : null;
    }

    const allItems = [
      {
        key: "pin",
        label: T("Pin this place"),
        icon: ICONS.pin,
        disabled: !hasLL,
        onClick: () => actionPinThisPlace(ll),
      },
      {
        key: "permalink",
        label: T("Copy permalink") + T(onSegSuffix),
        icon: ICONS.link,
        disabled: !hasLL,
        onClick: () => actionCopyPermalink(ll, linkSegIds),
      },
      {
        key: "refresh",
        label: T("Refresh here") + T(onSegSuffix),
        icon: ICONS.refresh,
        disabled: !hasLL,
        onClick: () => actionRefreshHere(ll, linkSegIds),
      },
      {
        key: "newTab",
        label: T("Open in new tab") + T(onSegSuffix),
        icon: ICONS.externalLink,
        disabled: !hasLL,
        onClick: () => actionOpenNewTab(ll, linkSegIds),
      },
      {
        key: "googleMaps",
        label: T("Open in Google Maps"),
        icon: ICONS.externalMap,
        disabled: !hasLL,
        onClick: () => actionOpenGoogleMaps(ll),
      },
      {
        key: "speedBump",
        label: T("Speed bump") + T(onSegSuffix),
        kbd: "Z",
        icon: ICONS.bump,
        disabled: !canSpeedBump,
        disabledTitle: canSpeedBump ? null : levelTooltip(MIN_SPEED_BUMP_LEVEL),
        onClick: () => runMapShortcut("z", {}, T("Speed bump"), clickAt),
      },
      {
        key: "stopLight",
        label: T("Stop light") + T(onSegSuffix),
        kbd: "⇧T",
        icon: ICONS.light,
        disabled: !canStopLight,
        disabledTitle: canStopLight ? null : levelTooltip(MIN_STOP_LIGHT_LEVEL),
        onClick: () => runMapShortcut("t", { shift: true }, T("Stop light"), clickAt),
      },
      {
        key: "road",
        label: T("Draw road") + T(onSegSuffix),
        kbd: "I",
        icon: ICONS.road,
        onClick: () => runMapShortcut("i", {}, T("Road tool"), clickAt),
      },
      {
        key: "route",
        // One entry, three phases — A, then B, then clear. Keeping it as
        // a single rotating entry (rather than three separate ones) is
        // what makes the flow readable without a mode indicator anywhere
        // else on screen: the label, icon and colour together say what
        // the next click will do.
        label: {
          start: T("Route: place start (A)"),
          end: T("Route: place end (B)"),
          clear: T("Route: clear"),
        }[routePhase()],
        icon: { start: ICONS.routeA, end: ICONS.routeB, clear: ICONS.trash }[routePhase()],
        accent: { start: null, end: "blue", clear: "red" }[routePhase()],
        onClick: () => actionRoutePoint(ll),
      },
      {
        key: "mapNote",
        label: T("Map note (area)"),
        icon: ICONS.mapNoteArea,
        onClick: () => actionDrawMapNoteArea(),
      },
      {
        key: "splitSegment",
        // The label itself communicates which of the two modes is about
        // to happen — immediate split here, or "click the nearest one"
        // — since there's no other on-screen indicator until the guide
        // line for the second mode actually appears.
        label: hitSeg ? T("Split segment") : T("Split nearest segment"),
        icon: ICONS.scissors,
        onClick: () => actionSplitSegment(hitSeg),
      },
      {
        key: "closures",
        // Stays enabled even off a segment: without one it just opens
        // against whatever is already selected (or reports "no segment
        // selected"), which is friendlier than a dead menu entry. With
        // the cursor over a segment it selects that segment first, so
        // there's no need to left-click it beforehand.
        label: T("Closures") + T(onSegSuffix),
        icon: ICONS.closure,
        onClick: () => { closeMenu(); actionOpenClosures(closureTargetIds()); },
      },
    ];

    const orderedKeys = getEnabledRadialMenuKeysInOrder();
    const byKey = new Map(allItems.map((it) => [it.key, it]));
    return orderedKeys.map((k) => byKey.get(k)).filter(Boolean);
  }

  // Every possible radial-menu entry, in a fixed canonical order — used as
  // the fallback when nothing's been customised yet, and as the source of
  // truth for what keys are even valid. Kept separate from buildItems' own
  // array so the settings UI doesn't need to run buildItems (with its live
  // cursor-position/segment context) just to know what entries exist.
  const RADIAL_ITEM_CATALOG = [
    { key: "pin", label: "Pin this place" },
    { key: "permalink", label: "Copy permalink" },
    { key: "refresh", label: "Refresh here" },
    { key: "newTab", label: "Open in new tab" },
    { key: "googleMaps", label: "Open in Google Maps" },
    { key: "speedBump", label: "Speed bump" },
    { key: "stopLight", label: "Stop light" },
    { key: "road", label: "Draw road" },
    { key: "route", label: "Test route (A → B)" },
    { key: "mapNote", label: "Map note (area)" },
    { key: "splitSegment", label: "Split segment" },
    { key: "closures", label: "Closures" },
  ];

  // The FULL catalog's keys in the user's saved order — including disabled
  // ones. This is what the settings drag-list renders, so unchecking an
  // item and later re-checking it puts it back where it was rather than
  // at the end of the list. Falls back to the catalog's own fixed order
  // for anyone who's never touched this setting, and repairs a stale/
  // foreign/incomplete saved value (hand-edited localStorage, or a
  // catalog entry added after the value was last saved) rather than
  // trusting it outright: known keys missing from the saved array are
  // appended at the end, and unknown keys are dropped.
  function getFullRadialMenuOrder() {
    const st = loadSettings();
    const saved = st.radialMenuOrder;
    const validKeys = RADIAL_ITEM_CATALOG.map((i) => i.key);
    if (!Array.isArray(saved)) return validKeys.slice();
    const validSet = new Set(validKeys);
    const seen = new Set();
    const kept = saved.filter((k) => {
      if (!validSet.has(k) || seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    const missing = validKeys.filter((k) => !seen.has(k));
    return [...kept, ...missing];
  }

  // Catalog entries that must stay OFF even for someone who's never
  // opened the radial-menu customization settings at all. Without this,
  // adding a new item to RADIAL_ITEM_CATALOG would make it appear for
  // every existing user the moment they update the script — the
  // "never touched radialMenuEnabledItems" branch below otherwise
  // treats the whole catalog as enabled by default. Both "Open in
  // Google Maps" and "Open in new tab" were specifically asked to ship
  // opt-in: available to turn on from settings, but not shown until the
  // person chooses to.
  const DEFAULT_DISABLED_RADIAL_KEYS = new Set(["googleMaps", "newTab", "mapNote", "splitSegment"]);

  // Same order, but only the keys the user has left enabled — this is
  // what actually drives what shows up in the radial menu and in what
  // sequence.
  function getEnabledRadialMenuKeysInOrder() {
    const st = loadSettings();
    const saved = st.radialMenuEnabledItems;
    const fullOrder = getFullRadialMenuOrder();
    if (!Array.isArray(saved)) return fullOrder.filter((k) => !DEFAULT_DISABLED_RADIAL_KEYS.has(k));
    const validKeys = new Set(RADIAL_ITEM_CATALOG.map((i) => i.key));
    const enabledSet = new Set(saved.filter((k) => validKeys.has(k)));

    // radialMenuEnabledItems stores ONLY enabled keys, so absence alone
    // can't distinguish "the user turned this off" from "this entry
    // didn't exist yet when they last saved". radialMenuOrder can: it
    // stores the FULL catalog (enabled and disabled alike), so a key
    // missing from the SAVED order is necessarily one added by a later
    // script version. Those default to on — otherwise every new radial
    // entry would ship invisible to everyone who has ever opened these
    // settings, which is most existing users. Anything explicitly
    // shipped opt-in stays off.
    const savedOrder = Array.isArray(st.radialMenuOrder) ? new Set(st.radialMenuOrder) : null;
    if (savedOrder) {
      for (const k of validKeys) {
        if (!savedOrder.has(k) && !DEFAULT_DISABLED_RADIAL_KEYS.has(k)) enabledSet.add(k);
      }
    }

    return fullOrder.filter((k) => enabledSet.has(k));
  }

  /* ------------------------------------------------------------------ *
   *  Right-click interception
   * ------------------------------------------------------------------ */

  function onContextMenu(e) {
    if (!enabled) return;
    // Access control, applied here rather than only inside individual
    // actions: this is the SAME single check the Pins panel/markers/
    // sidebar tab already gate on (isEditorAllowed()), extended to cover
    // the radial menu — which is how every other feature in this script
    // (route test, closures, split segment, map note area, the WME
    // shortcut relays) gets launched. Blocking it here means a
    // disallowed editor's right-click falls through to WME's own native
    // context menu instead, exactly like `enabled === false` already
    // behaves above — no menu, no toast spam on every right-click, and
    // nothing built that would need tearing down later.
    if (!isEditorAllowed()) return;
    if (e.shiftKey) return;
    if (!isMapClick(e.clientX, e.clientY)) return;

    const segIds = selectedSegmentIds();
    const ll = lonLatFromClick(e.clientX, e.clientY);
    const hitSeg = ll ? findSegmentUnderCursor(ll, loadSettings().segmentSnapRadiusPx || 14) : null;
    const items = buildItems(ll, segIds, e.clientX, e.clientY, hitSeg);
    // If the user has disabled every radial-menu item in settings, don't
    // swallow the right-click for a menu that has nothing to show — let
    // WME's own native context menu open instead of nothing at all.
    if (!items.length) return;

    e.preventDefault();
    e.stopPropagation();
    if (e.stopImmediatePropagation) e.stopImmediatePropagation();

    const hub = segIds.length
      ? `${segIds.length} ${segIds.length === 1 ? T("segment") : T("segments")}`
      : (hitSeg ? T("On segment") : T("Actions"));

    openRadialMenu(e.clientX, e.clientY, items, hub);
  }

  function onMouseDown(e) {
    if (!enabled) return;
    // Same gate as onContextMenu above — this handler's only real job is
    // consuming the LEFT-click that commits an armed split-pick, and
    // split-pick can only ever have been armed via the (now-gated)
    // radial menu in the first place. Kept here too rather than relying
    // solely on that upstream gate, on the same defense-in-depth
    // reasoning the rest of this script already applies: a future code
    // path that could re-arm split-pick some other way shouldn't
    // silently inherit access it was never granted.
    if (!isEditorAllowed()) return;
    // Left-click while "click nearest to split" is armed: consumed here
    // instead of reaching WME's own click-to-select handling, since a
    // normal left-click during this mode means "split there", not
    // "select this instead".
    if (splitPickModeActive && e.button === 0 && !e.shiftKey) {
      if (!isMapClick(e.clientX, e.clientY)) return;
      e.preventDefault();
      e.stopPropagation();
      if (e.stopImmediatePropagation) e.stopImmediatePropagation();
      commitSplitPick();
      return;
    }
    if (e.button !== 2 || e.shiftKey) return;
    if (!isMapClick(e.clientX, e.clientY)) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.stopImmediatePropagation) e.stopImmediatePropagation();
  }

  window.addEventListener("contextmenu", onContextMenu, { capture: true });
  window.addEventListener("mousedown", onMouseDown, { capture: true });

  /* ------------------------------------------------------------------ *
   *  Sidebar tab
   * ------------------------------------------------------------------ */

  function makeToggle(on, onChange) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "wmeRcToggle" + (on ? " on" : "");
    b.addEventListener("click", () => {
      const next = !b.classList.contains("on");
      b.classList.toggle("on", next);
      onChange(next, b);
    });
    return b;
  }

  /* ------------------------------------------------------------------ *
   *  Backup / restore
   * ------------------------------------------------------------------ */

  // Every localStorage key this backup can export and restore, plus a
  // short label used only inside the on-disk JSON — stable and readable
  // even if someone opens the file directly, and decoupled from the raw
  // key strings so renaming an internal key later doesn't silently break
  // old backup files (the label, not the key, is what's matched on import).
  //
  // Deliberately NOT included, with reasons:
  //   - AUTH_SESSION_KEY: an anonymous Firebase refresh token tied to
  //     this browser. It regenerates itself automatically on next use;
  //     backing it up would put a live credential inside a file that
  //     might get shared, synced to cloud storage, or emailed without a
  //     second thought.
  //   - SHARED_PIN_CACHE_KEY: a read-only cache of server data, rebuilt
  //     from scratch on the next fetch. Restoring a stale copy would
  //     show pins that may no longer exist until the next refresh
  //     corrects it — actively worse than not restoring it at all.
  //   - SHARED_PIN_QUEUE_KEY: pins waiting to sync to Firebase RIGHT
  //     NOW. Restoring old queue entries on a different day risks
  //     re-sending something that already reached the server, creating
  //     a duplicate shared pin nobody asked for.
  //   - DEBUG_KEY: a developer toggle, not a user setting.
  const BACKUP_KEYS = [
    { key: SETTINGS_KEY, label: "settings" },
    { key: PIN_KEY, label: "pins" },
    { key: PANEL_POS_KEY, label: "panelPosition" },
    { key: PANEL_COLLAPSED_POS_KEY, label: "panelCollapsedPosition" },
    { key: PANEL_WIDTH_KEY, label: "panelWidth" },
    { key: CLOSURE_LAST_DESCRIPTION_KEY, label: "closureLastDescription" },
    { key: PANEL_COLLAPSED_KEY, label: "panelCollapsed" },
    { key: MODAL_POS_KEY, label: "modalPositions" },
    { key: FOLDER_STATE_KEY, label: "folderState" },
    { key: SEEN_SHARED_PIN_IDS_KEY, label: "seenSharedPinIds" },
    { key: SEEN_PINS_BOOTSTRAPPED_KEY, label: "seenPinsBootstrapped" },
    { key: REMINDER_SOUND_KEY, label: "reminderSound" },
  ];

  const BACKUP_SCHEMA = "wazept-pins-backup";
  const BACKUP_FORMAT_VERSION = 1;

  // Builds the exportable object. Raw localStorage STRINGS are copied
  // as-is — never re-parsed and re-serialised — so import is a
  // byte-for-byte round trip with no risk of a parse/stringify pass
  // silently normalising away something the live code would have
  // handled differently (e.g. key ordering, number formatting).
  function buildBackupPayload() {
    const data = {};
    for (const { key, label } of BACKUP_KEYS) {
      const raw = localStorage.getItem(key);
      if (raw !== null) data[label] = raw;
    }
    return {
      schema: BACKUP_SCHEMA,
      version: BACKUP_FORMAT_VERSION,
      scriptVersion: SCRIPT_VERSION,
      exportedAt: new Date().toISOString(),
      data,
    };
  }

  // Checks the shape of a parsed backup file WITHOUT touching
  // localStorage, so the caller can show a clear error before anything
  // is overwritten rather than partially applying a malformed file.
  // Returns an error string, or null if the payload looks restorable.
  function validateBackupPayload(payload) {
    if (!payload || typeof payload !== "object") return T("Not a valid backup file.");
    if (payload.schema !== BACKUP_SCHEMA) return T("This file isn't a WazePT Pins backup.");
    if (!Number.isFinite(payload.version) || payload.version > BACKUP_FORMAT_VERSION) {
      return T("This backup was made by a newer version of the script.");
    }
    if (!payload.data || typeof payload.data !== "object") return T("This backup file has nothing to restore.");
    return null;
  }

  // Writes every recognised key back into localStorage. An unrecognised
  // label in the file (from a newer script version, or hand-edited) is
  // silently skipped rather than rejected outright — an otherwise-valid
  // older backup shouldn't fail to restore just because it predates a
  // key introduced later. Caller is expected to have already confirmed
  // this with the person and validated the payload's shape.
  function applyBackupPayload(payload) {
    for (const { key, label } of BACKUP_KEYS) {
      if (!Object.prototype.hasOwnProperty.call(payload.data, label)) continue;
      const val = payload.data[label];
      if (typeof val !== "string") continue; // corrupt/foreign entry — skip, don't throw
      try { localStorage.setItem(key, val); } catch {}
    }
    // In-memory caches would otherwise keep serving pre-import data
    // until something else happens to invalidate them. A page reload is
    // recommended to the person right after this runs (too much other
    // runtime state — timers, the Firebase session, cached DOM — to
    // safely hot-reinitialise everything), but dropping these two keeps
    // the in-session state honest even if they decline to reload.
    settingsCacheRaw = null; settingsCacheVal = null;
    pinsCacheRaw = null; pinsCacheVal = null;
  }

  // Triggers a browser download of the current backup — no dialog, no
  // confirmation needed, since exporting can't lose or overwrite
  // anything. Uses the same Blob + temporary <a download> pattern as
  // every other userscript file-download; revoking the object URL is
  // delayed rather than immediate because some browsers resolve the
  // click asynchronously and would cancel the download if the URL died
  // first.
  function actionExportBackup() {
    try {
      const payload = buildBackupPayload();
      const json = JSON.stringify(payload, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const stamp = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `wazept-pins-backup-${stamp}.json`;
      (document.body || document.documentElement).appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      toast(T("Backup exported"));
    } catch (e) {
      dlog("export backup failed", e);
      toast(T("Could not create the backup file"));
    }
  }

  // Reads a File the person picked (from the hidden <input type=file>
  // wired up in the sidebar), validates it, asks for explicit
  // confirmation since this OVERWRITES current settings and pins, then
  // applies it and reloads. Every failure path (bad JSON, wrong schema,
  // future format version) reports a specific reason rather than a
  // generic "import failed" — the person can't fix what they can't see.
  function actionImportBackup(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onerror = () => toast(T("Could not read the file"));
    reader.onload = async () => {
      let payload;
      try {
        payload = JSON.parse(String(reader.result || ""));
      } catch {
        toast(T("That file isn't valid JSON"));
        return;
      }
      const err = validateBackupPayload(payload);
      if (err) { toast(err); return; }

      const exportedLabel = (() => {
        const d = new Date(payload.exportedAt);
        return Number.isFinite(d.valueOf()) ? formatPinCreatedAt(d.getTime()) : null;
      })();

      const ok = await showConfirmModal({
        title: T("Restore backup?"),
        icon: ICONS.upload,
        message: T("This replaces your current settings and pins with the ones in this file. This cannot be undone.")
          + (exportedLabel ? `\n\n${T("Backup date")}: ${exportedLabel}` : ""),
        confirmLabel: T("Restore"),
        danger: true,
      });
      if (!ok) return;

      applyBackupPayload(payload);
      toast(T("Backup restored — reloading…"));
      // A short delay so the toast is actually visible before the page
      // reload tears the DOM down — an instant reload would make the
      // confirmation feel like nothing happened.
      setTimeout(() => { try { location.reload(); } catch {} }, 700);
    };
    reader.readAsText(file);
  }

  /* ------------------------------------------------------------------ *
   *  Diagnostics export
   * ------------------------------------------------------------------ */
  //
  // A read-only sibling of the backup feature above: bundles enough
  // context — environment, WME/SDK detection, current settings, pin
  // counts, and the recent dlog() ring buffer — into one file a tester
  // can send after hitting a bug, without needing to have turned on
  // verbose logging beforehand or manually copy anything out of the
  // console. Never re-imported anywhere, which is why it can safely
  // include things the backup export deliberately leaves out (the
  // offline sync queue, the shared-pins cache) — there's no "restoring
  // stale data" risk when nothing ever reads this file back in.
  //
  // The one thing NEVER included, in any form, is the raw Firebase
  // auth session: it's a live bearer/refresh credential, and a bug
  // report is not a safe place for one. summarizeAuthSession() below
  // reports only whether it's present and roughly when it expires.

  const DIAGNOSTICS_SCHEMA = "wazept-pins-diagnostics";
  const DIAGNOSTICS_FORMAT_VERSION = 1;

  // Deliberately broader than BACKUP_KEYS: this is a read-only snapshot
  // for a human (or me) to read, not something ever written back into
  // localStorage, so the restore-safety concerns that excluded the
  // shared-pins cache, the offline sync queue, and the debug flag from
  // the backup export simply don't apply here — seeing their exact
  // current state is the point.
  const DIAGNOSTIC_STORAGE_KEYS = [
    { key: SETTINGS_KEY, label: "settings" },
    { key: PIN_KEY, label: "pins" },
    { key: SHARED_PIN_CACHE_KEY, label: "sharedPinsCache" },
    { key: SHARED_PIN_QUEUE_KEY, label: "sharedPinsQueue" },
    { key: PANEL_POS_KEY, label: "panelPosition" },
    { key: PANEL_COLLAPSED_POS_KEY, label: "panelCollapsedPosition" },
    { key: PANEL_WIDTH_KEY, label: "panelWidth" },
    { key: CLOSURE_LAST_DESCRIPTION_KEY, label: "closureLastDescription" },
    { key: PANEL_COLLAPSED_KEY, label: "panelCollapsed" },
    { key: MODAL_POS_KEY, label: "modalPositions" },
    { key: FOLDER_STATE_KEY, label: "folderState" },
    { key: SEEN_SHARED_PIN_IDS_KEY, label: "seenSharedPinIds" },
    { key: SEEN_PINS_BOOTSTRAPPED_KEY, label: "seenPinsBootstrapped" },
    { key: REMINDER_SOUND_KEY, label: "reminderSound" },
    { key: DEBUG_KEY, label: "debugFlag" },
    { key: ALLOWLIST_CACHE_KEY, label: "allowlistCache" },
  ];

  // Host and path only — never the query string, where a webhook URL's
  // own auth token (if the person's webhook endpoint needs one) would
  // most likely live.
  function redactWebhookUrl(raw) {
    const s = String(raw || "").trim();
    if (!s) return null;
    try {
      const u = new URL(s);
      return `${u.protocol}//${u.host}${u.pathname && u.pathname !== "/" ? " (path hidden)" : ""}`;
    } catch {
      return "(unparsable URL)";
    }
  }

  // Presence and rough expiry only. localId is truncated rather than
  // omitted — it's the same uid already visible on every shared pin this
  // editor has ever created (createdByUid), so it's not learning an
  // attacker anything new, but there's no reason to spell it out in full
  // in a file that might get pasted into a public issue tracker either.
  function summarizeAuthSession() {
    try {
      const raw = localStorage.getItem(AUTH_SESSION_KEY);
      if (!raw) return { present: false };
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return { present: true, malformed: true };
      const localId = typeof parsed.localId === "string" && parsed.localId
        ? `${parsed.localId.slice(0, 4)}…`
        : null;
      const expiresAt = Number.isFinite(parsed.expiresAt) ? new Date(parsed.expiresAt).toISOString() : null;
      return {
        present: true,
        hasIdToken: !!parsed.idToken,
        hasRefreshToken: !!parsed.refreshToken,
        localId,
        expiresAt,
      };
    } catch {
      return { present: true, malformed: true };
    }
  }

  function detectWmeInfo() {
    const info = {};
    try { info.hasSdk = typeof sdk !== "undefined" && !!sdk; } catch { info.hasSdk = false; }
    try { info.hasLegacyW = !!(UW && UW.W); } catch { info.hasLegacyW = false; }
    try { info.hasModel = !!(UW?.W?.model); } catch { info.hasModel = false; }
    try { info.hasMajorTrafficEvents = !!(UW?.W?.model?.majorTrafficEvents); } catch { info.hasMajorTrafficEvents = false; }
    // Neither of these is documented as stable — best-effort only, and
    // explicitly allowed to come back null rather than throwing.
    try { info.sdkVersion = sdk?.getSDKVersion?.() ?? sdk?.version ?? null; } catch { info.sdkVersion = null; }
    try { info.wmeVersion = UW?.W?.VERSION ?? null; } catch { info.wmeVersion = null; }
    return info;
  }

  function detectEnvironmentInfo() {
    const info = {};
    try { info.userAgent = navigator.userAgent; } catch { info.userAgent = null; }
    try { info.language = navigator.language; } catch { info.language = null; }
    try { info.platform = navigator.platform; } catch { info.platform = null; }
    try { info.screen = { width: screen.width, height: screen.height, dpr: window.devicePixelRatio || 1 }; } catch { info.screen = null; }
    try { info.viewport = { width: window.innerWidth, height: window.innerHeight }; } catch { info.viewport = null; }
    try { info.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { info.timezone = null; }
    try { info.url = location.href; } catch { info.url = null; }
    return info;
  }

  // Every field individually try/caught: this function has to succeed
  // and produce SOMETHING even if half of what it's trying to read is
  // itself broken — a diagnostics export that throws instead of
  // reporting the very failure it exists to help debug would be a
  // uniquely unhelpful bug.
  function buildDiagnosticsPayload() {
    const rawStorage = {};
    for (const { key, label } of DIAGNOSTIC_STORAGE_KEYS) {
      try {
        const raw = localStorage.getItem(key);
        if (raw !== null) rawStorage[label] = raw;
      } catch {}
    }

    let settings = null;
    try {
      settings = { ...loadSettings() };
      if (settings.webhookUrl) settings.webhookUrl = redactWebhookUrl(settings.webhookUrl);
    } catch {}

    const safe = (fn, fallback = null) => { try { return fn(); } catch { return fallback; } };

    return {
      schema: DIAGNOSTICS_SCHEMA,
      version: DIAGNOSTICS_FORMAT_VERSION,
      scriptVersion: SCRIPT_VERSION,
      generatedAt: new Date().toISOString(),
      // Explicit and always present, unlike rawStorage.debugFlag below:
      // rawStorage only includes a key when localStorage actually has
      // it, so a person who's never touched the toggle has no
      // "debugFlag" entry there at all — a reader would have to already
      // know that "absent" means "off" to interpret that correctly.
      // This field spells it out directly instead.
      debugMode: safe(() => isDebugOn(), false),
      environment: detectEnvironmentInfo(),
      wme: detectWmeInfo(),
      editor: {
        level: safe(() => getEditorLevel()),
        username: safe(() => getEditorUsername()),
      },
      // Explicit, live summary — separate from rawStorage.allowlistCache
      // (the raw cached entry) because the two can legitimately diverge:
      // isAllowed reflects allowlistState right now, in memory, which is
      // what actually gates the panel; the cache is what a PAST check
      // wrote to localStorage and might be for a different username
      // entirely (e.g. right after switching WME accounts in the same
      // browser) or simply stale. Reading both together is what makes a
      // "why do/don't I have access" report actually diagnosable instead
      // of requiring a follow-up question every time.
      allowlist: safe(() => ({
        isAllowed: isEditorAllowed(),
        checked: allowlistState.checked,
        allowedInState: allowlistState.allowed,
        cache: (() => {
          const c = loadAllowlistCache();
          if (!c) return null;
          return { username: c.username, allowed: c.allowed, checkedAt: new Date(c.checkedAt).toISOString() };
        })(),
      })),
      authSession: safe(() => summarizeAuthSession(), { present: false }),
      settings,
      counts: {
        localPins: safe(() => loadPins().length),
        sharedPinsCache: safe(() => sharedPinsCache.length),
        sharedPinsQueue: safe(() => loadSharedPinQueue().length),
      },
      // The most recent fetchSharedPins() failure, if any. It was already
      // being captured but never read anywhere — surfacing it here is
      // what makes it worth capturing: a report of "shared pins aren't
      // loading" is far easier to act on with the actual error attached
      // than with only the generic toast the user saw.
      sharedPinsLastError: safe(() => (sharedPinsLastError
        ? String(sharedPinsLastError?.message || sharedPinsLastError)
        : null)),
      rawStorage,
      recentLog: getRecentDebugLog(),
    };
  }

  function actionExportDiagnostics() {
    try {
      const payload = buildDiagnosticsPayload();
      const json = JSON.stringify(payload, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      // Colons in a filename are invalid on Windows; the same
      // ISO-with-colons-stripped pattern is used nowhere else in this
      // script yet, but it's the standard safe-filename transform for
      // an ISO timestamp.
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      a.href = url;
      a.download = `wazept-pins-diagnostics-${stamp}.json`;
      (document.body || document.documentElement).appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      toast(T("Diagnostics exported"));
    } catch (e) {
      dlog("export diagnostics failed", e);
      toast(T("Could not create the diagnostics file"));
    }
  }

  // Stores which sections are EXPANDED (not which are collapsed) — so
  // that a section this script has never seen before (a new user, or a
  // brand new settings group added later) defaults to ABSENT from the
  // set, which reads as collapsed. ":v2" rather than reusing the old
  // ":v1" collapsed-list key: those meant the opposite thing, and
  // reinterpreting an existing user's old "sections I collapsed" list as
  // "sections I expanded" would have silently flipped every section's
  // open/closed state for them on upgrade.
  const SIDEBAR_EXPANDED_KEY = `${SCRIPT_ID}:sidebarExpanded:v2`;

  function loadExpandedSidebarSections() {
    try {
      const arr = JSON.parse(localStorage.getItem(SIDEBAR_EXPANDED_KEY) || "[]");
      return new Set(Array.isArray(arr) ? arr.filter((k) => typeof k === "string") : []);
    } catch { return new Set(); }
  }

  function saveExpandedSidebarSections(set) {
    try { localStorage.setItem(SIDEBAR_EXPANDED_KEY, JSON.stringify([...set])); } catch {}
  }

  // Wraps `contentEl` in a titled, collapsible section. `id` is a stable
  // key (independent of the visible title, which is translated and could
  // change wording) used to remember collapsed/expanded state across
  // reloads. Defaults to COLLAPSED — these are settings someone opens
  // occasionally to change one thing, not a dashboard meant to be read
  // top to bottom, so keeping them tucked away until asked for keeps the
  // panel short.
  function mkCollapsibleSection(id, titleText, contentEl) {
    const section = document.createElement("div");
    section.className = "wmeRcSideSection";

    const card = document.createElement("div");
    card.className = "wmeRcSideCard";

    const header = document.createElement("div");
    header.className = "wmeRcSideSectionHeader";
    header.innerHTML = `<span class="wmeRcSideSectionArrow">\u25B8</span><span class="wmeRcSideTitle">${titleText}</span>`;

    const body = document.createElement("div");
    body.className = "wmeRcSideSectionBody";
    body.appendChild(contentEl);

    card.appendChild(header);
    card.appendChild(body);
    section.appendChild(card);

    const expanded = loadExpandedSidebarSections();
    section.classList.toggle("collapsed", !expanded.has(id));

    header.addEventListener("click", () => {
      const willBeCollapsed = !section.classList.contains("collapsed");
      section.classList.toggle("collapsed", willBeCollapsed);
      const set = loadExpandedSidebarSections();
      if (willBeCollapsed) set.delete(id); else set.add(id);
      saveExpandedSidebarSections(set);
    });

    return section;
  }

  function buildSidebar() {
    const wrap = document.createElement("div");
    // Follows WME's OWN theme, not this script's themeMode setting: the
    // sidebar is WME's panel and sits on WME's background, so matching
    // the script's independent dark/light choice here would be wrong.
    wrap.className = "wmeRcSide" + (detectWmeIsLightTheme() ? " wme-light" : "");

    const mkRow = (title, sub, on, onChange) => {
      const row = document.createElement("div");
      row.className = "wmeRcSideRow";
      const left = document.createElement("div");
      left.innerHTML = `<div class="wmeRcSideTitle">${title}</div>` + (sub ? `<div class="wmeRcSideSub">${sub}</div>` : "");
      row.appendChild(left);
      const toggle = makeToggle(on, onChange);
      row.appendChild(toggle);
      row.toggleEl = toggle;
      return row;
    };

    const st = loadSettings();

    const card1 = document.createElement("div");
    card1.className = "wmeRcSideCard";
    card1.appendChild(mkRow(T("Radial menu"), T("Shift + right click = default menu"), enabled, (v) => {
      enabled = v;
      closeMenu();
      toast(`${SCRIPT_NAME}: ${T(v ? "ON" : "OFF")}`);
    }));
    wrap.appendChild(card1);

    const card1c = document.createElement("div");
    const menuItemsSub = document.createElement("div");
    menuItemsSub.className = "wmeRcSideSub";
    menuItemsSub.style.marginBottom = "6px";
    menuItemsSub.textContent = T("Choose which actions appear, and drag to reorder them.");
    card1c.appendChild(menuItemsSub);

    const menuList = document.createElement("div");
    menuList.className = "wmeRcMenuOrderList";

    // Reads fresh from settings rather than closing over a stale array —
    // matters here because both a checkbox toggle and a drag-drop can
    // each trigger a save, and either one needs to see the other's latest
    // result rather than an in-memory snapshot from when the sidebar
    // opened.
    function persistMenuState(fullOrderKeys, enabledKeys) {
      const s = loadSettings();
      s.radialMenuOrder = fullOrderKeys;
      s.radialMenuEnabledItems = enabledKeys;
      saveSettings(s);
    }

    function currentRowOrder() {
      return [...menuList.querySelectorAll(".wmeRcMenuOrderRow")].map((r) => r.dataset.key);
    }
    function currentEnabledKeys() {
      return [...menuList.querySelectorAll(".wmeRcMenuOrderRow")]
        .filter((r) => r.querySelector(".wmeRcToggle").classList.contains("on"))
        .map((r) => r.dataset.key);
    }

    const byKeyLabel = new Map(RADIAL_ITEM_CATALOG.map((i) => [i.key, i.label]));
    const fullOrder = getFullRadialMenuOrder();
    const enabledSet = new Set(getEnabledRadialMenuKeysInOrder());

    let dragSrcKey = null;

    for (const key of fullOrder) {
      const row = document.createElement("div");
      row.className = "wmeRcMenuOrderRow";
      row.draggable = true;
      row.dataset.key = key;

      const handle = document.createElement("div");
      handle.className = "wmeRcMenuOrderHandle";
      handle.innerHTML = ICONS.grip;
      handle.title = T("Drag to reorder");

      const label = document.createElement("div");
      label.className = "wmeRcSideTitle";
      label.style.flex = "1 1 auto";
      label.textContent = T(byKeyLabel.get(key) || key);

      const toggle = makeToggle(enabledSet.has(key), () => {
        persistMenuState(currentRowOrder(), currentEnabledKeys());
      });

      row.appendChild(handle);
      row.appendChild(label);
      row.appendChild(toggle);

      row.addEventListener("dragstart", (e) => {
        dragSrcKey = key;
        row.classList.add("dragging");
        try { e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", key); } catch {}
      });
      row.addEventListener("dragend", () => {
        row.classList.remove("dragging");
        menuList.querySelectorAll(".wmeRcMenuOrderRow").forEach((r) => r.classList.remove("drag-over"));
        dragSrcKey = null;
      });
      row.addEventListener("dragover", (e) => {
        if (!dragSrcKey || dragSrcKey === key) return;
        e.preventDefault();
        try { e.dataTransfer.dropEffect = "move"; } catch {}
        row.classList.add("drag-over");
      });
      row.addEventListener("dragleave", () => row.classList.remove("drag-over"));
      row.addEventListener("drop", (e) => {
        e.preventDefault();
        row.classList.remove("drag-over");
        if (!dragSrcKey || dragSrcKey === key) return;
        const srcEl = menuList.querySelector(`.wmeRcMenuOrderRow[data-key="${CSS.escape(dragSrcKey)}"]`);
        if (!srcEl) return;
        // Drop BEFORE the target row — simplest, most predictable rule,
        // matching how dragging a bookmark or a browser tab behaves.
        menuList.insertBefore(srcEl, row);
        persistMenuState(currentRowOrder(), currentEnabledKeys());
      });

      menuList.appendChild(row);
    }

    card1c.appendChild(menuList);
    wrap.appendChild(mkCollapsibleSection("menuItems", T("Radial menu items"), card1c));

    // ── Radial menu animation ──
    const card1d = document.createElement("div");

    const animRow = mkRow(T("Animate opening"), T("Turn off for an instant, no-motion menu"), st.radialAnimEnabled !== false, (v) => {
      const s = loadSettings(); s.radialAnimEnabled = v; saveSettings(s);
      styleTabs.style.opacity = v ? "" : ".45";
      styleTabs.style.pointerEvents = v ? "" : "none";
      speedTabs.style.opacity = v ? "" : ".45";
      speedTabs.style.pointerEvents = v ? "" : "none";
    });
    card1d.appendChild(animRow);

    const styleLbl = document.createElement("div");
    styleLbl.className = "wmeRcSideSub";
    styleLbl.style.margin = "8px 0 6px";
    styleLbl.textContent = T("Style");
    card1d.appendChild(styleLbl);

    const styleTabs = document.createElement("div");
    styleTabs.className = "wmeRcTabs";
    const styleOptions = [
      { id: "pop", label: T("Pop") },
      { id: "fade", label: T("Fade") },
      { id: "spin", label: T("Spin") },
      { id: "slide", label: T("Slide") },
    ];
    for (const opt of styleOptions) {
      const tab = document.createElement("div");
      tab.className = "wmeRcTab" + (normalizeRadialAnimStyle(st.radialAnimStyle) === opt.id ? " on" : "");
      tab.textContent = opt.label;
      tab.addEventListener("click", () => {
        const s = loadSettings();
        s.radialAnimStyle = opt.id;
        saveSettings(s);
        styleTabs.querySelectorAll(".wmeRcTab").forEach((t) => t.classList.remove("on"));
        tab.classList.add("on");
      });
      styleTabs.appendChild(tab);
    }
    card1d.appendChild(styleTabs);

    const speedLbl = document.createElement("div");
    speedLbl.className = "wmeRcSideSub";
    speedLbl.style.margin = "10px 0 6px";
    speedLbl.textContent = T("Speed");
    card1d.appendChild(speedLbl);

    const speedTabs = document.createElement("div");
    speedTabs.className = "wmeRcTabs";
    const speedOptions = [
      { id: "slow", label: T("Slow") },
      { id: "normal", label: T("Normal") },
      { id: "fast", label: T("Fast") },
    ];
    for (const opt of speedOptions) {
      const tab = document.createElement("div");
      tab.className = "wmeRcTab" + (normalizeRadialAnimSpeed(st.radialAnimSpeed) === opt.id ? " on" : "");
      tab.textContent = opt.label;
      tab.addEventListener("click", () => {
        const s = loadSettings();
        s.radialAnimSpeed = opt.id;
        saveSettings(s);
        speedTabs.querySelectorAll(".wmeRcTab").forEach((t) => t.classList.remove("on"));
        tab.classList.add("on");
      });
      speedTabs.appendChild(tab);
    }
    card1d.appendChild(speedTabs);

    // Reflects the CURRENT toggle state on first render — mkRow's own
    // checkbox already shows the right on/off, but the two tab rows
    // need their disabled-look applied up front too, not just after the
    // person flips the toggle once.
    if (st.radialAnimEnabled === false) {
      styleTabs.style.opacity = ".45";
      styleTabs.style.pointerEvents = "none";
      speedTabs.style.opacity = ".45";
      speedTabs.style.pointerEvents = "none";
    }

    wrap.appendChild(mkCollapsibleSection("radialAnim", T("Radial menu animation"), card1d));


    const card1b = document.createElement("div");
    card1b.className = "wmeRcSideCard";
    const themeTitle = document.createElement("div");
    themeTitle.className = "wmeRcSideTitle";
    themeTitle.textContent = T("Appearance");
    card1b.appendChild(themeTitle);
    const themeSub = document.createElement("div");
    themeSub.className = "wmeRcSideSub";
    themeSub.style.marginBottom = "8px";
    themeSub.textContent = T("Controls the menu, pins panel, and dialogs — independent of WME's own theme.");
    card1b.appendChild(themeSub);

    const themeTabs = document.createElement("div");
    themeTabs.className = "wmeRcTabs";
    const themeOptions = [
      { id: "auto", label: T("Auto") },
      { id: "dark", label: T("Dark") },
      { id: "light", label: T("Light") },
    ];
    for (const opt of themeOptions) {
      const tab = document.createElement("div");
      tab.className = "wmeRcTab" + (st.themeMode === opt.id ? " on" : "");
      tab.textContent = opt.label;
      tab.addEventListener("click", () => {
        const s = loadSettings();
        s.themeMode = opt.id;
        saveSettings(s);
        themeTabs.querySelectorAll(".wmeRcTab").forEach((t) => t.classList.remove("on"));
        tab.classList.add("on");
        // Repaint everything already on screen so the change is visible
        // immediately, not just on the next thing the user happens to open.
        renderPinsPanel();
        renderPinMarkers();
      });
      themeTabs.appendChild(tab);
    }
    card1b.appendChild(themeTabs);
    wrap.appendChild(card1b);

    const card2 = document.createElement("div");
    card2.appendChild(mkRow(T("Pins panel"), T("Show the list of saved pins"), st.showPanel, (v) => {
      const s = loadSettings(); s.showPanel = v; saveSettings(s); renderPinsPanel();
    }));
    card2.appendChild(mkRow(T("Pin names on map"), T("Draw the pin label next to the marker"), st.showPinNames, (v) => {
      const s = loadSettings(); s.showPinNames = v; saveSettings(s); renderPinMarkers();
    }));
    card2.appendChild(mkRow(T("Marker in permalink"), T("Add &marker=true when copying"), st.markerOnCopy, (v) => {
      const s = loadSettings(); s.markerOnCopy = v; saveSettings(s);
    }));
    card2.appendChild(mkRow(T("Marker on refresh"), T("Add &marker=true when refreshing"), st.markerOnRefresh, (v) => {
      const s = loadSettings(); s.markerOnRefresh = v; saveSettings(s);
    }));
    card2.appendChild(mkRow(T("Marker on new tab"), T("Add &marker=true when opening in a new tab"), st.markerOnNewTab, (v) => {
      const s = loadSettings(); s.markerOnNewTab = v; saveSettings(s);
    }));
    card2.appendChild(mkRow(T("Keep layer settings"), T("Carry layers=… into permalinks"), st.includeLayers, (v) => {
      const s = loadSettings(); s.includeLayers = v; saveSettings(s);
    }));
    wrap.appendChild(mkCollapsibleSection("pinsPanel", T("Pins panel"), card2));

    // ── Opções de rota (imported from WME Route Checker) ──
    const cardRoute = document.createElement("div");

    // Vehicle type is a three-way choice stored as two mutually
    // exclusive bits, so it gets radio-style rows rather than toggles:
    // setting one must clear the other, which a plain toggle per option
    // wouldn't express.
    const vehSub = document.createElement("div");
    vehSub.className = "wmeRcSideSub";
    vehSub.style.marginBottom = "6px";
    vehSub.textContent = T("Vehicle type");
    cardRoute.appendChild(vehSub);

    const vehRow = document.createElement("div");
    vehRow.className = "wmeRcTabs";
    vehRow.style.marginBottom = "10px";
    const VEHICLES = [
      { id: "private", label: T("Private") },
      { id: "taxi", label: T("Taxi") },
      { id: "bike", label: T("Motorcycle") },
    ];
    const currentVehicle = () => {
      const v = routeOptionsValue();
      if (v & ROUTE_OPT.VEHICLE_TAXI) return "taxi";
      if (v & ROUTE_OPT.VEHICLE_BIKE) return "bike";
      return "private";
    };
    for (const veh of VEHICLES) {
      const tab = document.createElement("div");
      tab.className = "wmeRcTab" + (currentVehicle() === veh.id ? " on" : "");
      tab.textContent = veh.label;
      tab.addEventListener("click", () => {
        const s = loadSettings();
        let v = Number(s.routeOptions);
        if (!Number.isFinite(v)) v = ROUTE_OPT.ALLOW_UTURNS;
        v &= ~(ROUTE_OPT.VEHICLE_TAXI | ROUTE_OPT.VEHICLE_BIKE);
        if (veh.id === "taxi") v |= ROUTE_OPT.VEHICLE_TAXI;
        else if (veh.id === "bike") v |= ROUTE_OPT.VEHICLE_BIKE;
        s.routeOptions = v;
        saveSettings(s);
        vehRow.querySelectorAll(".wmeRcTab").forEach((el2, i) => {
          el2.classList.toggle("on", VEHICLES[i].id === veh.id);
        });
      });
      vehRow.appendChild(tab);
    }
    cardRoute.appendChild(vehRow);

    // The avoid/allow flags ARE independent, so these stay toggles.
    const mkFlagRow = (title, sub, bit) => mkRow(title, sub, (routeOptionsValue() & bit) !== 0, (on) => {
      const s = loadSettings();
      let v = Number(s.routeOptions);
      if (!Number.isFinite(v)) v = ROUTE_OPT.ALLOW_UTURNS;
      s.routeOptions = on ? (v | bit) : (v & ~bit);
      saveSettings(s);
    });

    const avoidSub = document.createElement("div");
    avoidSub.className = "wmeRcSideSub";
    avoidSub.style.marginBottom = "2px";
    avoidSub.textContent = T("Avoid");
    cardRoute.appendChild(avoidSub);
    cardRoute.appendChild(mkFlagRow(T("Toll roads"), "", ROUTE_OPT.AVOID_TOLLS));
    cardRoute.appendChild(mkFlagRow(T("Freeways"), "", ROUTE_OPT.AVOID_FREEWAYS));
    cardRoute.appendChild(mkFlagRow(T("Unpaved"), "", ROUTE_OPT.AVOID_DIRT));

    const allowSub = document.createElement("div");
    allowSub.className = "wmeRcSideSub";
    allowSub.style.margin = "10px 0 2px";
    allowSub.textContent = T("Allow");
    cardRoute.appendChild(allowSub);
    cardRoute.appendChild(mkFlagRow(T("U-turns"), "", ROUTE_OPT.ALLOW_UTURNS));

    cardRoute.appendChild(mkRow(
      T("Show alternative routes"),
      T("Requests up to 3 routes and draws the alternatives in lighter colours."),
      st.routeAlternatives !== false,
      (v) => { const s = loadSettings(); s.routeAlternatives = v; saveSettings(s); },
    ));

    cardRoute.appendChild(mkRow(
      T("Details"),
      T("Opens a movable window with the distance, time, turn-by-turn list and alternatives every time a route is calculated."),
      !!st.routeShowDetails,
      (v) => { const s = loadSettings(); s.routeShowDetails = v; saveSettings(s); },
    ));

    cardRoute.appendChild(mkRow(
      T("Show segment speeds"),
      T("Colours each segment of the active route by speed and shows the km/h, imported from WME Route Speeds."),
      st.routeShowSpeeds !== false,
      (v) => { const s = loadSettings(); s.routeShowSpeeds = v; saveSettings(s); },
    ));

    wrap.appendChild(mkCollapsibleSection("routeOptions", T("Route options"), cardRoute));


    // ── Cortes (closures) ──
    const card2c = document.createElement("div");

    const quickSub = document.createElement("div");
    quickSub.className = "wmeRcSideSub";
    quickSub.style.marginBottom = "6px";
    quickSub.textContent = T("Text filled in by the \"quick description\" toggle in the closures window.");
    card2c.appendChild(quickSub);

    const quickInp = document.createElement("input");
    quickInp.type = "text";
    quickInp.className = "wmeRcInput";
    quickInp.maxLength = 100;
    quickInp.placeholder = DEFAULT_QUICK_DESCRIPTION;
    quickInp.value = st.closureQuickDescription || DEFAULT_QUICK_DESCRIPTION;
    quickInp.addEventListener("change", () => {
      const s = loadSettings();
      // An emptied field falls back to the default rather than being
      // saved as "": a blank quick description would make the toggle in
      // the closures window do nothing at all, with no clue why.
      const v = quickInp.value.trim();
      s.closureQuickDescription = v || DEFAULT_QUICK_DESCRIPTION;
      saveSettings(s);
      quickInp.value = s.closureQuickDescription;
      toast(T("Quick description saved"));
    });
    card2c.appendChild(quickInp);

    const quickResetRow = document.createElement("div");
    quickResetRow.className = "wmeRcSideRow";
    const quickResetBtn = document.createElement("div");
    quickResetBtn.className = "wmeRcBtn";
    quickResetBtn.style.flex = "1 1 auto";
    quickResetBtn.style.textAlign = "center";
    quickResetBtn.textContent = T("Reset to default text");
    quickResetBtn.addEventListener("click", () => {
      const s = loadSettings();
      s.closureQuickDescription = DEFAULT_QUICK_DESCRIPTION;
      saveSettings(s);
      quickInp.value = DEFAULT_QUICK_DESCRIPTION;
      toast(T("Quick description saved"));
    });
    quickResetRow.appendChild(quickResetBtn);
    card2c.appendChild(quickResetRow);

    const posSub = document.createElement("div");
    posSub.className = "wmeRcSideSub";
    posSub.style.marginTop = "10px";
    posSub.style.marginBottom = "6px";
    posSub.textContent = T("The closures window can be dragged by its title bar. If it ends up off-screen, put it back in the middle here.");
    card2c.appendChild(posSub);

    const posResetRow = document.createElement("div");
    posResetRow.className = "wmeRcSideRow";
    const posResetBtn = document.createElement("div");
    posResetBtn.className = "wmeRcBtn";
    posResetBtn.style.flex = "1 1 auto";
    posResetBtn.style.textAlign = "center";
    posResetBtn.textContent = T("Restore window placement");
    posResetBtn.addEventListener("click", () => {
      resetModalPositions();
      // Also re-centres a window that's open RIGHT NOW, so the fix is
      // visible immediately instead of only on the next open — which is
      // exactly the case where the user can't find the window to close it.
      document.querySelectorAll(".wmeRcModal.positioned").forEach((m) => {
        m.classList.remove("positioned");
        m.style.left = "";
        m.style.top = "";
      });
      toast(T("Window placement restored"));
    });
    posResetRow.appendChild(posResetBtn);
    card2c.appendChild(posResetRow);

    wrap.appendChild(mkCollapsibleSection("closures", T("Closures"), card2c));

    const card2b = document.createElement("div");
    const soundRow = document.createElement("div");
    soundRow.className = "wmeRcSideRow";
    soundRow.innerHTML = `<div><div class="wmeRcSideTitle">${T("Reminder sound")}</div>
      <div class="wmeRcSideSub">${T("Played when a pin reminder fires")}</div></div>`;
    const soundSel = document.createElement("select");
    soundSel.className = "wmeRcInput" + (detectWmeIsLightTheme() ? " wme-light-select" : "");
    soundSel.style.maxWidth = "150px";
    for (const o of REMINDER_SOUND_OPTIONS) {
      const opt = document.createElement("option");
      opt.value = o.id;
      opt.textContent = T(o.label);
      soundSel.appendChild(opt);
    }
    soundSel.value = getReminderSoundId();
    soundSel.addEventListener("change", () => {
      setReminderSoundId(soundSel.value);
      if (soundSel.value !== "mute") playReminderSound(soundSel.value, { force: true });
    });
    soundRow.appendChild(soundSel);
    card2b.appendChild(soundRow);
    const card2d = document.createElement("div");

    let stNow = loadSettings();

    card2d.appendChild(mkRow(T("Desktop notifications"), T("Show a native OS notification when a reminder fires"), stNow.desktopNotifications, async (v, toggleBtn) => {
      if (v) {
        const ok = await ensureNotificationPermission();
        if (!ok) {
          toast(T("Notifications blocked by the browser"));
          v = false;
          try { toggleBtn.classList.remove("on"); } catch {}
        }
      }
      const s = loadSettings(); s.desktopNotifications = v; saveSettings(s);
      renderSidebarQuietRows();
    }));

    const quietRow = mkRow(T("Quiet hours"), T("Mute sound/notifications during this window"), stNow.quietHoursEnabled, (v) => {
      const s = loadSettings(); s.quietHoursEnabled = v; saveSettings(s);
      renderSidebarQuietRows();
    });
    card2d.appendChild(quietRow);

    const quietTimesRow = document.createElement("div");
    quietTimesRow.className = "wmeRcSideRow";
    quietTimesRow.innerHTML = `<div class="wmeRcSideSub">${T("From")}</div>`;
    const quietStartInp = document.createElement("input");
    quietStartInp.type = "time";
    quietStartInp.className = "wmeRcInput";
    quietStartInp.style.maxWidth = "110px";
    quietStartInp.value = stNow.quietHoursStart || "22:00";
    const quietToLbl = document.createElement("div");
    quietToLbl.className = "wmeRcSideSub";
    quietToLbl.textContent = T("to");
    quietToLbl.style.margin = "0 6px";
    const quietEndInp = document.createElement("input");
    quietEndInp.type = "time";
    quietEndInp.className = "wmeRcInput";
    quietEndInp.style.maxWidth = "110px";
    quietEndInp.value = stNow.quietHoursEnd || "07:00";
    quietStartInp.addEventListener("change", () => { const s = loadSettings(); s.quietHoursStart = quietStartInp.value; saveSettings(s); });
    quietEndInp.addEventListener("change", () => { const s = loadSettings(); s.quietHoursEnd = quietEndInp.value; saveSettings(s); });
    quietTimesRow.appendChild(quietStartInp);
    quietTimesRow.appendChild(quietToLbl);
    quietTimesRow.appendChild(quietEndInp);
    card2d.appendChild(quietTimesRow);

    const webhookRow = mkRow(T("Webhook notify"), T("POST a JSON payload to a URL when a reminder fires"), stNow.webhookEnabled, (v) => {
      const s = loadSettings(); s.webhookEnabled = v; saveSettings(s);
      renderSidebarQuietRows();
    });
    card2d.appendChild(webhookRow);

    const webhookUrlRow = document.createElement("div");
    webhookUrlRow.className = "wmeRcSideRow";
    const webhookInp = document.createElement("input");
    webhookInp.type = "text";
    webhookInp.className = "wmeRcInput";
    webhookInp.placeholder = "https://example.com/hook";
    webhookInp.value = stNow.webhookUrl || "";
    webhookInp.addEventListener("change", () => { const s = loadSettings(); s.webhookUrl = webhookInp.value.trim(); saveSettings(s); });
    webhookUrlRow.appendChild(webhookInp);
    card2d.appendChild(webhookUrlRow);

    function renderSidebarQuietRows() {
      const s = loadSettings();
      quietTimesRow.style.display = s.quietHoursEnabled ? "flex" : "none";
      webhookUrlRow.style.display = s.webhookEnabled ? "flex" : "none";
    }
    renderSidebarQuietRows();

    const notifWrap = document.createElement("div");
    card2d.style.marginTop = "10px";
    card2d.style.paddingTop = "8px";
    card2d.style.borderTop = "1px solid rgba(127,127,127,.2)";
    notifWrap.appendChild(card2b);
    notifWrap.appendChild(card2d);
    wrap.appendChild(mkCollapsibleSection("notifications", T("System notifications"), notifWrap));

    // ── Backup (export / import) ──
    const card3 = document.createElement("div");
    card3.className = "wmeRcSideCard";
    const backupTitle = document.createElement("div");
    backupTitle.className = "wmeRcSideTitle";
    backupTitle.textContent = T("Backup");
    card3.appendChild(backupTitle);

    const backupSub = document.createElement("div");
    backupSub.className = "wmeRcSideSub";
    backupSub.style.marginBottom = "6px";
    backupSub.textContent = T("Save your settings and pins to a file, or restore them from one saved earlier.");
    card3.appendChild(backupSub);

    const backupRow = document.createElement("div");
    backupRow.className = "wmeRcSideRow";
    backupRow.style.gap = "8px";

    const exportBtn = document.createElement("div");
    exportBtn.className = "wmeRcBtn";
    exportBtn.style.flex = "1 1 0";
    exportBtn.style.textAlign = "center";
    exportBtn.style.display = "flex";
    exportBtn.style.alignItems = "center";
    exportBtn.style.justifyContent = "center";
    exportBtn.style.gap = "6px";
    exportBtn.innerHTML = `${ICONS.download}<span>${T("Export")}</span>`;
    exportBtn.addEventListener("click", actionExportBackup);

    const importBtn = document.createElement("div");
    importBtn.className = "wmeRcBtn";
    importBtn.style.flex = "1 1 0";
    importBtn.style.textAlign = "center";
    importBtn.style.display = "flex";
    importBtn.style.alignItems = "center";
    importBtn.style.justifyContent = "center";
    importBtn.style.gap = "6px";
    importBtn.innerHTML = `${ICONS.upload}<span>${T("Import")}</span>`;

    // A real <input type=file> is required to open the OS file picker —
    // there's no scriptable equivalent — so the visible button is a
    // plain div that just proxies its click to a hidden input, the same
    // pattern used for every "styled file picker" on the web.
    const importFileInp = document.createElement("input");
    importFileInp.type = "file";
    importFileInp.accept = "application/json,.json";
    importFileInp.style.display = "none";
    importBtn.addEventListener("click", () => importFileInp.click());
    importFileInp.addEventListener("change", () => {
      const file = importFileInp.files && importFileInp.files[0];
      // Reset immediately (not after the read completes) so picking the
      // SAME file twice in a row still fires 'change' the second time —
      // browsers only emit it when the file list actually differs from
      // the input's previous value.
      importFileInp.value = "";
      if (file) actionImportBackup(file);
    });

    backupRow.appendChild(exportBtn);
    backupRow.appendChild(importBtn);
    backupRow.appendChild(importFileInp);
    card3.appendChild(backupRow);

    wrap.appendChild(card3);

    // ── Diagnostics ──
    const card4 = document.createElement("div");

    const diagSub = document.createElement("div");
    diagSub.className = "wmeRcSideSub";
    diagSub.style.marginBottom = "6px";
    diagSub.textContent = T("Found a bug? Export this file and send it to the developer. It includes your settings, pins, and — if debugging mode is on — a recent activity log. Never your login credentials.");
    card4.appendChild(diagSub);

    const verboseRow = mkRow(
      T("Debugging mode"),
      T("Records detailed activity (last hour) to include when you export diagnostics below."),
      isDebugOn(),
      (v) => setDebugOn(v),
    );
    card4.appendChild(verboseRow);

    const diagRow = document.createElement("div");
    diagRow.className = "wmeRcSideRow";
    diagRow.style.marginTop = "6px";
    const diagBtn = document.createElement("div");
    diagBtn.className = "wmeRcBtn";
    diagBtn.style.flex = "1 1 auto";
    diagBtn.style.textAlign = "center";
    diagBtn.style.display = "flex";
    diagBtn.style.alignItems = "center";
    diagBtn.style.justifyContent = "center";
    diagBtn.style.gap = "6px";
    diagBtn.innerHTML = `${ICONS.bug}<span>${T("Export diagnostics")}</span>`;
    diagBtn.addEventListener("click", actionExportDiagnostics);
    diagRow.appendChild(diagBtn);
    card4.appendChild(diagRow);

    wrap.appendChild(mkCollapsibleSection("diagnostics", T("Diagnostics"), card4));

    const ver = document.createElement("div");
    ver.className = "wmeRcSideSub";
    ver.textContent = `${SCRIPT_NAME} v${SCRIPT_VERSION}`;
    wrap.appendChild(ver);

    // Same credit line (and icon) as the rest of the WazePT script suite
    // (e.g. WazePT Abreviaturas) — kept consistent across scripts rather
    // than reworded here.
    const credit = document.createElement("div");
    credit.className = "wmeRcSideCredit";
    credit.innerHTML =
      `<img src="https://i.imgur.com/UksVMzF.png" alt="">` +
      `Este script foi feito por ` +
      `<a href="https://www.waze.com/pt-PT/user/editor/Xtryker" target="_blank" rel="noopener noreferrer">Xtryker</a>` +
      ` com amor para a comunidade <a href="https://linktr.ee/wazept" target="_blank" rel="noopener noreferrer">WazePT</a>`;
    wrap.appendChild(credit);

    return wrap;
  }

  function mountSidebar() {
    if (!isEditorAllowed()) return false;
    if (sidebarMounted) return true;
    try {
      const us = UW?.W?.userscripts || UW?.userscripts;
      if (typeof us?.registerSidebarTab === "function") {
        const { tabLabel, tabPane } = us.registerSidebarTab(SCRIPT_ID) || {};
        if (tabLabel && tabPane) {
          tabLabel.textContent = "Pins";
          tabLabel.title = SCRIPT_NAME;
          tabPane.appendChild(buildSidebar());
          sidebarMounted = true;
          return true;
        }
      }
    } catch (e) {
      console.warn(`[${SCRIPT_NAME}] sidebar mount failed`, e);
    }
    return false;
  }

  /* ------------------------------------------------------------------ *
   *  Init
   * ------------------------------------------------------------------ */

  // The setup loop below calls this on every tick until the panel, layer
  // AND sidebar are all up — so on any page where the sidebar never
  // mounts, this used to run 40 times and register 40 copies of each
  // OpenLayers handler, none of which OL ever drops. The debounce inside
  // schedule() hid the symptom (renderPinMarkers still only ran once per
  // event), which is exactly why it went unnoticed: the cost was a
  // growing handler list, not visible duplicate work.
  let mapSyncStarted = false;

  function startMapSync() {
    if (mapSyncStarted) return true;
    const map = getOlMap();
    if (!map?.events?.register) return false;
    let t = 0;
    const schedule = () => {
      if (t) return;
      t = setTimeout(() => { t = 0; try { renderPinMarkers(); } catch {} }, 150);
    };
    try { map.events.register("zoomend", map, schedule); } catch {}
    try { map.events.register("changelayer", map, schedule); } catch {}
    mapSyncStarted = true;
    return true;
  }

  async function initSdk() {
    try {
      sdk = UW.getWmeSdk({ scriptId: SCRIPT_ID, scriptName: SCRIPT_NAME });
    } catch (err) {
      console.warn(`[${SCRIPT_NAME}] getWmeSdk failed`, err);
    }

    ensureCss();

    try {
      sdk?.Events?.on?.({
        eventName: "wme-map-mouse-move",
        eventHandler: (ev) => {
          if (ev && isFinite(ev.lon) && isFinite(ev.lat)) lastLonLat = { lon: ev.lon, lat: ev.lat };
          // Cheap early-exit when the split "click nearest" mode isn't
          // active — this handler otherwise fires on every pixel of
          // mouse movement over the map, so anything more than a flag
          // check here would be a real cost paid by everyone regardless
          // of whether they've ever touched this feature.
          if (splitPickModeActive) updateSplitGuideLine(lastLonLat);
        },
      });
    } catch {}

    // Awaited BEFORE anything pin-related starts up: on a cache hit
    // (the common case — see ALLOWLIST_TTL_MS) this resolves with no
    // network round trip at all, so the very first setup-loop tick
    // below already knows the right answer instead of needing the
    // separate 3s poller to catch up a tick or two late.
    await refreshAllowlistState();
    lastKnownAllowlistAllowed = isEditorAllowed();

    startReminderLoop();
    startExpirySweepLoop();
    startSharedPinsAutoRefreshLoop();
    // Resumes retrying any pin that was still queued when the browser was
    // last closed — startSharedPinQueueLoop() is itself idempotent (checks
    // its own timer before starting), so calling it here is safe even if
    // queueSharedPin() also calls it later in the same session.
    if (loadSharedPinQueue().length) startSharedPinQueueLoop();

    // Show the locally-cached shared pins immediately (renderPinsPanel
    // already runs from the interval below), then refresh from Firebase
    // silently in the background so the map isn't blocked on network.
    fetchSharedPins({ silent: true });

    try {
      // Schedule before checking, for the same reason as startReminderLoop:
      // checkRemindersNow() early-outs when reminderTimers is empty, so a
      // sweep that runs first would be a no-op right after the tab wakes up.
      //
      // Also re-fetches shared pins on the same trigger. The 60s auto-
      // refresh interval alone isn't reliable for this: browsers throttle
      // setInterval heavily in backgrounded/inactive tabs, so a peer who
      // keeps WME open in a tab while working elsewhere can go well past
      // a minute without an actual tick firing. The moment they switch
      // back to the tab is exactly when they'd notice a missing pin, and
      // focus/visibilitychange fire reliably regardless of how throttled
      // the interval was, so this is the real fix for "doesn't show up
      // until I refresh manually" — the interval is a secondary catch-all
      // for tabs that stay foregrounded a long time without ever losing
      // and regaining focus.
      const resync = () => {
        scheduleAllReminderTimers();
        checkRemindersNow();
        if (!sharedPinsLoading) fetchSharedPins({ silent: true });
      };
      window.addEventListener("focus", resync, { passive: true });
      document.addEventListener("visibilitychange", () => {
        if (!document.hidden) resync();
      }, { passive: true });
    } catch {}

    let tries = 0;
    const iv = setInterval(() => {
      tries++;
      const panelOk = ensurePinsPanel();
      const layerOk = !!ensurePinsLayer();
      if (layerOk) { renderPinMarkers(); startMapSync(); }
      mountSidebar();
      if ((panelOk && layerOk && sidebarMounted) || tries > 40) clearInterval(iv);
    }, 600);

    // Separate from the setup loop above, which stops once the panel/layer/
    // sidebar exist — editor rank can take longer than that to become
    // available from the SDK, and the allowlist check can resolve even
    // later still (a fresh network fetch, or the editor's username only
    // becoming available after the setup loop already gave up). Unlike
    // setup this has no natural "done" state to stop at (rank could
    // change later after a promotion, and allowlist membership can
    // change at any time from outside this session entirely). Runs for
    // the life of the page; each tick is cheap (a cache-hit allowlist
    // check plus a level read) and only actually does anything on the
    // rare occasions either one changes.
    setInterval(refreshPinsAccessState, 3000);
  }

  if (UW.SDK_INITIALIZED?.then) {
    UW.SDK_INITIALIZED.then(initSdk);
  } else {
    const t = setInterval(() => {
      if (UW.SDK_INITIALIZED?.then) { clearInterval(t); UW.SDK_INITIALIZED.then(initSdk); }
    }, 250);
    setTimeout(() => clearInterval(t), 20000);
  }
})();
