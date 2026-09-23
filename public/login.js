document.addEventListener("DOMContentLoaded", () => {
  // Inicialização do Socket.io (trata erro caso o servidor não esteja pronto)
  let socket;
  try {
    socket = io();
  } catch (e) {
    console.warn("Socket.io não conectado no ambiente atual.");
  }

  const telaLogin = document.getElementById("tela-login");
  const telaConversas = document.getElementById("tela-conversas");
  const telaUsuarios = document.getElementById("tela-usuarios");
  const telaChat = document.getElementById("tela-chat");

  const formLogin = document.getElementById("form-login");
  const formChat = document.getElementById("chat-form");
  const loginMensagem = document.getElementById("login-mensagem");

  const listaConversasUl = document.getElementById("lista-conversas-ul");
  const listaUsuariosUl = document.getElementById("lista-usuarios-ul");

  const btnIniciarConversa = document.getElementById("btn-iniciar-conversa");
  const btnCancelarNovoChat = document.getElementById("btn-cancelar-novo-chat");
  const inputMensagem = document.getElementById("campo-mensagem");

  const nomeUsuarioLogado = document.getElementById("nome-usuario-logado");
  const idConversaTitulo = document.getElementById("id-conversa-titulo");
  const painel = document.getElementById("painel-mensagens");

  const btnLimpar = document.getElementById("btn-limpar");
  const btnVoltar = document.getElementById("btn-voltar");

  let usuarioLogado = "";
  let idConversaAtiva = null;

  // Login
  formLogin.addEventListener("submit", (e) => {
    e.preventDefault();
    const usuario = document.getElementById("login-usuario").value.trim();
    const senha = document.getElementById("login-senha").value.trim();

    if (usuario && senha) {
      if (socket && socket.connected) {
        socket.emit("login usuario", { usuario, senha });
      } else {
        // Fallback visual
        usuarioLogado = usuario;
        nomeUsuarioLogado.textContent = usuarioLogado;
        loginMensagem.textContent = "";

        telaLogin.style.display = "none";
        telaConversas.style.display = "flex";
      }
    }
  });

  if (socket) {
    socket.on("resposta login", (res) => {
      if (res.sucesso) {
        usuarioLogado = res.usuario;
        nomeUsuarioLogado.textContent = usuarioLogado;
        loginMensagem.textContent = "";

        telaLogin.style.display = "none";
        telaConversas.style.display = "flex";

        socket.emit("listar conversas", usuarioLogado);
      } else {
        loginMensagem.textContent = res.mensagem;
      }
    });

    socket.on("lista conversas", (listaIds) => {
      renderizarListaConversas(listaIds);
    });

    socket.on("lista outros usuarios", (usuarios) => {
      renderizarListaUsuarios(usuarios);
    });

    socket.on("conversa iniciada", (idConversa) => {
      telaUsuarios.style.display = "none";
      abrirChat(idConversa);
    });

    socket.on("chat message", (data) => renderizarMensagem(data));

    socket.on("historico mensagens", (listaMensagens) => {
      painel.innerHTML = "";
      if (listaMensagens) {
        listaMensagens.forEach((msg) => renderizarMensagem(msg));
      }
      painel.scrollTop = painel.scrollHeight;
    });

    socket.on("historico limpo", () => {
      painel.innerHTML = "";
    });
  }

  // Ações de Botões
  btnIniciarConversa.addEventListener("click", (e) => {
    e.preventDefault();
    if (socket && socket.connected) {
      socket.emit("listar outros usuarios", usuarioLogado);
    } else {
      renderizarListaUsuarios(["Maria", "João", "Ana"]);
    }
  });

  btnCancelarNovoChat.addEventListener("click", (e) => {
    e.preventDefault();
    telaUsuarios.style.display = "none";
    telaConversas.style.display = "flex";
  });

  btnVoltar.addEventListener("click", (e) => {
    e.preventDefault();
    telaChat.style.display = "none";
    telaConversas.style.display = "flex";
    if (socket && socket.connected) {
      socket.emit("listar conversas", usuarioLogado);
    }
  });

  // Enviar Mensagem
  formChat.addEventListener("submit", (e) => {
    e.preventDefault();
    const mensagemTexto = inputMensagem.value.trim();

    if (mensagemTexto && idConversaAtiva !== null) {
      const horaAtual = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });

      const msgPayload = {
        usuario: usuarioLogado,
        texto: mensagemTexto,
        hora: horaAtual,
        idConversa: idConversaAtiva,
      };

      if (socket && socket.connected) {
        socket.emit("chat message", msgPayload);
      } else {
        renderizarMensagem(msgPayload);
      }

      inputMensagem.value = "";
    }
  });

  btnLimpar.addEventListener("click", () => {
    if (
      confirm(`Tem certeza que deseja apagar a conversa #${idConversaAtiva}?`)
    ) {
      if (socket && socket.connected) {
        socket.emit("limpar historico", idConversaAtiva);
      } else {
        painel.innerHTML = "";
      }
    }
  });

  // Funções Auxiliares de Renderização
  function abrirChat(id) {
    idConversaAtiva = id;
    idConversaTitulo.textContent = `#${idConversaAtiva}`;

    telaConversas.style.display = "none";
    telaUsuarios.style.display = "none";
    telaChat.style.display = "flex";

    if (socket && socket.connected) {
      socket.emit("abrir conversa por id", idConversaAtiva);
    }
  }

  function renderizarListaConversas(listaIds) {
    listaConversasUl.innerHTML = "";
    if (!listaIds || listaIds.length === 0) {
      listaConversasUl.innerHTML =
        "<li style='color: #8696a0; text-align: center; padding: 12px;'>Nenhuma conversa encontrada.</li>";
    } else {
      listaIds.forEach((id) => {
        const li = document.createElement("li");
        li.className = "item-usuario";
        li.innerHTML = `💬 <strong>Conversa #${id}</strong> <span>Entrar &rsaquo;</span>`;
        li.addEventListener("click", () => abrirChat(id));
        listaConversasUl.appendChild(li);
      });
    }
  }

  function renderizarListaUsuarios(usuarios) {
    listaUsuariosUl.innerHTML = "";
    if (!usuarios || usuarios.length === 0) {
      listaUsuariosUl.innerHTML =
        "<li style='color: #8696a0; text-align: center; padding: 12px;'>Nenhum usuário cadastrado.</li>";
    } else {
      usuarios.forEach((u) => {
        const li = document.createElement("li");
        li.className = "item-usuario";
        li.innerHTML = `👤 <strong>${u}</strong> <span>Iniciar Chat &rsaquo;</span>`;
        li.addEventListener("click", () => {
          if (socket && socket.connected) {
            socket.emit("iniciar conversa", {
              meuUsuario: usuarioLogado,
              outroUsuario: u,
            });
          } else {
            abrirChat("101");
          }
        });
        listaUsuariosUl.appendChild(li);
      });
    }
    telaConversas.style.display = "none";
    telaUsuarios.style.display = "flex";
  }

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
});
