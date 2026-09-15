const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Variável para guardar o ID da conversa atual na memória
let idConversaAtual = 1;

// 1. Conectando ao banco de dados SQLite
const dbFile = path.join(__dirname, "database.db");
const db = new sqlite3.Database(dbFile, (err) => {
  if (err) {
    console.error("Erro ao abrir o banco de dados:", err.message);
  } else {
    console.log("Conectado ao banco de dados SQLite com sucesso!");

    // Garantindo a criação da tabela com a coluna "id-conversa"
    db.run(
      `CREATE TABLE IF NOT EXISTS "base-mensagens" (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        "id-conversa" INTEGER,
        "data-mensagem" TEXT,
        "hora-mensagem" TEXT,
        "escreveu-mensagem" TEXT
      )`,
      (err) => {
        if (!err) {
          // Busca o maior "id-conversa" já cadastrado no banco para continuar a partir dele
          db.get(
            `SELECT MAX("id-conversa") as ultimoId FROM "base-mensagens"`,
            [],
            (err, row) => {
              if (!err && row && row.ultimoId) {
                idConversaAtual = row.ultimoId;
              }
              console.log(`💬 ID da Conversa Ativa atual: ${idConversaAtual}`);
            },
          );
        }
      },
    );
  }
});

app.use(express.static(path.join(__dirname, "public")));

io.on("connection", (socket) => {
  console.log("Um usuário se conectou:", socket.id);

  // Envia apenas as mensagens da CONVERSA ATUAL para a tela
  db.all(
    `SELECT * FROM "base-mensagens" WHERE "id-conversa" = ? ORDER BY id ASC`,
    [idConversaAtual],
    (err, rows) => {
      if (!err && rows) {
        const historicoFormatado = rows.map((row) => {
          const partes = row["escreveu-mensagem"].split("]: ");
          const usuario = partes[0] ? partes[0].replace("[", "") : "Anônimo";
          const texto = partes[1] || row["escreveu-mensagem"];
          return {
            usuario: usuario,
            texto: texto,
            hora: row["hora-mensagem"],
          };
        });
        socket.emit("historico mensagens", historicoFormatado);
      }
    },
  );

  // Recebe e grava a mensagem nova vinculada ao "id-conversa" atual
  socket.on("chat message", (data) => {
    const agora = new Date();
    const dataMensagem = agora.toLocaleDateString("pt-BR");
    const horaMensagem =
      data.hora ||
      agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

    const textoMensagem = data.texto || "";
    const usuarioNome = data.usuario || "Anônimo";
    const conteudoParaBanco = `[${usuarioNome}]: ${textoMensagem}`;

    // Salvando incluindo o "id-conversa"
    const query = `INSERT INTO "base-mensagens" ("id-conversa", "data-mensagem", "hora-mensagem", "escreveu-mensagem") VALUES (?, ?, ?, ?)`;

    db.run(
      query,
      [idConversaAtual, dataMensagem, horaMensagem, conteudoParaBanco],
      function (err) {
        if (err) {
          console.error("Erro ao salvar mensagem no banco:", err.message);
        } else {
          console.log(
            `Mensagem salva na conversa ${idConversaAtual} com ID de linha: ${this.lastID}`,
          );
        }
      },
    );

    io.emit("chat message", {
      usuario: usuarioNome,
      texto: textoMensagem,
      hora: horaMensagem,
    });
  });

  // Ao clicar em EXCLUIR CONVERSA: Avança o "id-conversa" para iniciar um novo chat sem apagar o histórico antigo do banco!
  socket.on("limpar historico", () => {
    idConversaAtual += 1; // Incrementa o ID para a nova conversa
    console.log(
      `🔄 Conversa encerrada. Nova conversa iniciada com ID: ${idConversaAtual}`,
    );

    // Limpa a tela de todos os usuários para a nova conversa zerada
    io.emit("historico limpo");
  });

  socket.on("disconnect", () => {
    console.log("Usuário desconectado:", socket.id);
  });
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
