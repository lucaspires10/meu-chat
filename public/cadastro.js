document.addEventListener("DOMContentLoaded", () => {
  const socket = io();
  const formCadastro = document.getElementById("form-cadastro");
  const cadMensagem = document.getElementById("cad-mensagem");
  formCadastro.addEventListener("submit", (e) => {
    e.preventDefault();
    const usuario = document.getElementById("cad-usuario").value.trim();
    const senha = document.getElementById("cad-senha").value.trim();

    if (usuario && senha) {
      socket.emit("cadastrar usuario", { usuario, senha });
    }
  });

  socket.on("resposta cadastro", (res) => {
    cadMensagem.textContent = res.mensagem;
    if (res.sucesso) {
      cadMensagem.style.color = "#81c995";
      setTimeout(() => {
        window.location.href = "index.html";
      }, 1500);
    } else {
      cadMensagem.style.color = "#f28b82";
    }
  });
});
