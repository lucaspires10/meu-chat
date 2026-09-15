const socket = io();
const form = document.getElementById("chat-form");
const inputMensagem = document.getElementById("campo-mensagem");
const perfilSelect = document.getElementById("perfil-usuario");
const painel = document.getElementById("painel-mensagens");
const btnLimpar = document.getElementById("btn-limpar");

// Função para renderizar uma mensagem na tela
function renderizarMensagem(data) {
  const meuNomeAtual = perfilSelect.value;
  const msgDiv = document.createElement("div");
  const ehMinhaMensagem = data.usuario === meuNomeAtual;

  msgDiv.classList.add(
    "mensagem",
    ehMinhaMensagem ? "mensagem-enviada" : "mensagem-recebida",
  );

  msgDiv.innerHTML = `
    <span class="usuario">${data.usuario}</span>
    <p>${data.texto}</p>
    <span class="hora">${data.hora}</span>
  `;

  painel.appendChild(msgDiv);
  painel.scrollTop = painel.scrollHeight;
}

// Enviar mensagem
form.addEventListener("submit", (e) => {
  e.preventDefault();
  const mensagemTexto = inputMensagem.value.trim();
  const meuNome = perfilSelect.value;

  if (mensagemTexto) {
    const horaAtual = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    socket.emit("chat message", {
      usuario: meuNome,
      texto: mensagemTexto,
      hora: horaAtual,
    });

    inputMensagem.value = "";
  }
});

// Clique no botão para Excluir Conversa
btnLimpar.addEventListener("click", () => {
  const confirmacao = confirm(
    "Tem certeza que deseja excluir toda a conversa?",
  );
  if (confirmacao) {
    socket.emit("limpar historico");
  }
});

// Receber mensagem nova do servidor
socket.on("chat message", (data) => {
  renderizarMensagem(data);
});

// Receber histórico de mensagens salvas do banco quando a página carrega
socket.on("historico mensagens", (listaMensagens) => {
  painel.innerHTML = "";
  listaMensagens.forEach((msg) => renderizarMensagem(msg));
  painel.scrollTop = painel.scrollHeight;
});

// Quando o servidor avisar que o histórico foi apagado
socket.on("historico limpo", () => {
  painel.innerHTML = ""; // Limpa a tela de chat de todos os usuários
});
