document.addEventListener("DOMContentLoaded", () => {
  const socket = io();

  const telaLogin = document.getElementById("tela-login");
  const telaConversas = document.getElementById("tela-conversas");
  const telaChat = document.getElementById("tela-chat");

  const formLogin = document.getElementById("form-login");
  const formChat = document.getElementById("chat-form");
  const loginMensagem = document.getElementById("login-mensagem");

  const listaConversasUl = document.getElementById("lista-conversas-ul");
  const inputMensagem = document.getElementById("campo-mensagem");
  const nomeUsuarioLogado = document.getElementById("nome-usuario-logado");
  const idConversaTitulo = document.getElementById("id-conversa-titulo");
  const painel = document.getElementById("painel-mensagens");
  const btnLimpar = document.getElementById("btn-limpar");
  const btnVoltar = document.getElementById("btn-voltar");

  let usuarioLogado = "";
  let idConversaAtiva = null;

  // LOGIN
  formLogin.addEventListener("submit", (e) => {
    e.preventDefault();
    const usuario = document.getElementById("login-usuario").value.trim();
    const senha = document.getElementById("login-senha").value.trim();

    if (usuario && senha) {
      socket.emit("login usuario", { usuario, senha });
    }
  });

  socket.on("resposta login", (res) => {
    if (res.sucesso) {
      usuarioLogado = res.usuario;
      nomeUsuarioLogado.textContent = usuarioLogado;
      loginMensagem.textContent = "";

      telaLogin.style.display = "none";
      telaConversas.style.display = "flex";

      socket.emit("listar conversas", usuarioLogado);
    } else {
      loginMensagem.style.color = "#f28b82";
      loginMensagem.textContent = res.mensagem;
    }
  });

  socket.on("lista conversas", (listaIds) => {
    listaConversasUl.innerHTML = "";

    if (listaIds.length === 0) {
      listaConversasUl.innerHTML =
        "<li style='color: #8696a0;'>Você não tem conversas salvas.</li>";
      return;
    }

    listaIds.forEach((id) => {
      const li = document.createElement("li");
      li.className = "item-usuario";
      li.innerHTML = `💬 <strong>Conversa #${id}</strong> <span>Entrar ➡</span>`;

      li.addEventListener("click", () => {
        idConversaAtiva = id;
        idConversaTitulo.textContent = `#${idConversaAtiva}`;

        telaConversas.style.display = "none";
        telaChat.style.display = "flex";

        socket.emit("abrir conversa por id", idConversaAtiva);
      });

      listaConversasUl.appendChild(li);
    });
  });

  btnVoltar.addEventListener("click", () => {
    telaChat.style.display = "none";
    telaConversas.style.display = "flex";
    socket.emit("listar conversas", usuarioLogado);
  });

  function renderizarMensagem(data) {
    const msgDiv = document.createElement("div");
    const ehMinhaMensagem = data.usuario === usuarioLogado;

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

  formChat.addEventListener("submit", (e) => {
    e.preventDefault();
    const mensagemTexto = inputMensagem.value.trim();

    if (mensagemTexto && idConversaAtiva !== null) {
      const horaAtual = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });

      socket.emit("chat message", {
        usuario: usuarioLogado,
        texto: mensagemTexto,
        hora: horaAtual,
        idConversa: idConversaAtiva,
      });

      inputMensagem.value = "";
    }
  });

  btnLimpar.addEventListener("click", () => {
    if (
      confirm(`Tem certeza que deseja apagar a conversa #${idConversaAtiva}?`)
    ) {
      socket.emit("limpar historico", idConversaAtiva);
    }
  });

  socket.on("chat message", (data) => renderizarMensagem(data));

  socket.on("historico mensagens", (listaMensagens) => {
    painel.innerHTML = "";
    listaMensagens.forEach((msg) => renderizarMensagem(msg));
    painel.scrollTop = painel.scrollHeight;
  });

  socket.on("historico limpo", () => {
    painel.innerHTML = "";
  });
});
