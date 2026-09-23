document.addEventListener("DOMContentLoaded", () => {
  let socket;
  try {
    socket = io();
  } catch (e) {
    console.warn(
      "Socket.io não encontrado. A rodar em modo de demonstração local.",
    );
  }

  // Elementos da Interface
  const telaLogin = document.getElementById("tela-login");
  const mainWrapper = document.getElementById("main-wrapper");
  const sidebar = document.getElementById("sidebar");

  const formLogin = document.getElementById("form-login");
  const formChat = document.getElementById("chat-form");
  const loginMensagem = document.getElementById("login-mensagem");

  const tabConversas = document.getElementById("tab-conversas");
  const tabUsuarios = document.getElementById("tab-usuarios");
  const painelConversas = document.getElementById("painel-conversas");
  const painelUsuarios = document.getElementById("painel-usuarios");

  const listaConversasUl = document.getElementById("lista-conversas-ul");
  const listaUsuariosUl = document.getElementById("lista-usuarios-ul");

  const inputMensagem = document.getElementById("campo-mensagem");
  const nomeUsuarioLogado = document.getElementById("nome-usuario-logado");
  const idConversaTitulo = document.getElementById("id-conversa-titulo");
  const painel = document.getElementById("painel-mensagens");

  const chatEmpty = document.getElementById("chat-empty");
  const chatActive = document.getElementById("chat-active");

  const btnLimpar = document.getElementById("btn-limpar");
  const btnVoltar = document.getElementById("btn-voltar");
  const btnSair = document.getElementById("btn-sair");

  let usuarioLogado = "";
  let idConversaAtiva = null;

  // Lógica de Autenticação (Login)
  formLogin.addEventListener("submit", (e) => {
    e.preventDefault();
    const usuario = document.getElementById("login-usuario").value.trim();
    const senha = document.getElementById("login-senha").value.trim();

    if (usuario && senha) {
      if (socket && socket.connected) {
        socket.emit("login usuario", { usuario, senha });
      } else {
        // Fallback local se não houver backend Socket.io a correr
        fazerLoginComSucesso(usuario);
        renderizarListaConversas(["101", "102"]);
        renderizarListaUsuarios(["Maria", "João", "Ana"]);
      }
    }
  });

  function fazerLoginComSucesso(usuario) {
    usuarioLogado = usuario;
    nomeUsuarioLogado.textContent = usuarioLogado;
    loginMensagem.textContent = "";

    telaLogin.style.display = "none";
    mainWrapper.style.display = "flex";
  }

  // Eventos do Socket.io
  if (socket) {
    socket.on("resposta login", (res) => {
      if (res.sucesso) {
        fazerLoginComSucesso(res.usuario);
        socket.emit("listar conversas", usuarioLogado);
      } else {
        loginMensagem.textContent = res.mensagem;
      }
    });

    socket.on("lista conversas", (listaIds) =>
      renderizarListaConversas(listaIds),
    );
    socket.on("lista outros usuarios", (usuarios) =>
      renderizarListaUsuarios(usuarios),
    );

    socket.on("conversa iniciada", (idConversa) => {
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

  // Alternar abas na Sidebar
  tabConversas.addEventListener("click", () => {
    tabConversas.classList.add("active");
    tabUsuarios.classList.remove("active");
    painelConversas.style.display = "block";
    painelUsuarios.style.display = "none";
  });

  tabUsuarios.addEventListener("click", () => {
    tabUsuarios.classList.add("active");
    tabConversas.classList.remove("active");
    painelUsuarios.style.display = "block";
    painelConversas.style.display = "none";

    if (socket && socket.connected) {
      socket.emit("listar outros usuarios", usuarioLogado);
    }
  });

  // Ação de Voltar (Mobile)
  btnVoltar.addEventListener("click", () => {
    mainWrapper.classList.remove("chat-aberto");
    idConversaAtiva = null;
  });

  // Logout
  btnSair.addEventListener("click", () => {
    location.reload();
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

        // Resposta automática simulada no modo de teste
        setTimeout(() => {
          renderizarMensagem({
            usuario: "Bot",
            texto: "Mensagem recebida com sucesso!",
            hora: new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
          });
        }, 1000);
      }

      inputMensagem.value = "";
    }
  });

  // Limpar Mensagens
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

  // Abrir Janela do Chat
  function abrirChat(id) {
    idConversaAtiva = id;
    idConversaTitulo.textContent = `#${idConversaAtiva}`;

    chatEmpty.style.display = "none";
    chatActive.style.display = "flex";

    // Adiciona classe de controlo para navegação mobile
    mainWrapper.classList.add("chat-aberto");

    if (socket && socket.connected) {
      socket.emit("abrir conversa por id", idConversaAtiva);
    } else {
      painel.innerHTML = "";
    }
  }

  // Renderizar Lista de Conversas
  function renderizarListaConversas(listaIds) {
    listaConversasUl.innerHTML = "";
    if (!listaIds || listaIds.length === 0) {
      listaConversasUl.innerHTML =
        "<li style='color: #8696a0; text-align: center; padding: 16px;'>Nenhuma conversa encontrada.</li>";
    } else {
      listaIds.forEach((id) => {
        const li = document.createElement("li");
        li.className = "item-usuario";
        li.innerHTML = `<div>💬 <strong>Conversa #${id}</strong></div> <span>Entrar &rsaquo;</span>`;
        li.addEventListener("click", () => abrirChat(id));
        listaConversasUl.appendChild(li);
      });
    }
  }

  // Renderizar Lista de Utilizadores
  function renderizarListaUsuarios(usuarios) {
    listaUsuariosUl.innerHTML = "";
    if (!usuarios || usuarios.length === 0) {
      listaUsuariosUl.innerHTML =
        "<li style='color: #8696a0; text-align: center; padding: 16px;'>Nenhum usuário cadastrado.</li>";
    } else {
      usuarios.forEach((u) => {
        const li = document.createElement("li");
        li.className = "item-usuario";
        li.innerHTML = `<div>👤 <strong>${u}</strong></div> <span>Iniciar &rsaquo;</span>`;
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
