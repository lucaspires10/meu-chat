const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const dbFile = path.resolve(__dirname, "database.db");

console.log("📍 Conectando ao banco de dados em:", dbFile);

const db = new sqlite3.Database(dbFile, (err) => {
  if (err) {
    console.error("❌ ERRO AO CONECTAR NO BANCO:", err.message);
  } else {
    console.log("✅ Conectado com sucesso ao database.db");

    db.serialize(() => {
      db.run(
        `CREATE TABLE IF NOT EXISTS "cadastro" (
          "id" INTEGER PRIMARY KEY AUTOINCREMENT,
          "login" TEXT UNIQUE,
          "senha" TEXT
        )`,
      );

      db.run(
        `CREATE TABLE IF NOT EXISTS "base-mensagens" (
          "id" INTEGER PRIMARY KEY AUTOINCREMENT,
          "data-mensagem" TEXT,
          "hora-mensagem" TEXT,
          "escreveu-mensagem" TEXT,
          "id-conversa" NUMERIC,
          "id-usuario" INTEGER
        )`,
      );
    });
  }
});

app.use(express.static(path.join(__dirname, "public")));

io.on("connection", (socket) => {
  // CADASTRAR USUÁRIO
  socket.on("cadastrar usuario", (data) => {
    const { usuario, senha } = data;
    if (!usuario || !senha) {
      return socket.emit("resposta cadastro", {
        sucesso: false,
        mensagem: "Preencha todos os campos!",
      });
    }

    db.run(
      `INSERT INTO "cadastro" ("login", "senha") VALUES (?, ?)`,
      [usuario, senha],
      function (err) {
        if (err) {
          if (err.message.includes("UNIQUE")) {
            socket.emit("resposta cadastro", {
              sucesso: false,
              mensagem: "Este nome de usuário já existe!",
            });
          } else {
            socket.emit("resposta cadastro", {
              sucesso: false,
              mensagem: `Erro no banco: ${err.message}`,
            });
          }
        } else {
          socket.emit("resposta cadastro", {
            sucesso: true,
            mensagem: "Cadastrado com sucesso!",
          });
        }
      },
    );
  });

  // LOGIN DO USUÁRIO
  socket.on("login usuario", (data) => {
    const { usuario, senha } = data;

    db.get(
      `SELECT * FROM "cadastro" WHERE "login" = ? AND "senha" = ?`,
      [usuario, senha],
      (err, row) => {
        if (err || !row) {
          return socket.emit("resposta login", {
            sucesso: false,
            mensagem: "Usuário ou senha incorretos!",
          });
        }
        socket.emit("resposta login", { sucesso: true, usuario: row.login });
      },
    );
  });

  // BUSCAR LISTA DE CONVERSAS ONDE APENAS O USUÁRIO LOGADO PARTICIPOU
  socket.on("listar conversas", (meuUsuario) => {
    db.all(
      `SELECT DISTINCT "id-conversa" 
       FROM "base-mensagens" 
       WHERE "escreveu-mensagem" LIKE ? AND "id-conversa" IS NOT NULL 
       ORDER BY "id-conversa" ASC`,
      [`%[${meuUsuario}]%`],
      (err, rows) => {
        if (!err && rows) {
          const listaIds = rows.map((r) => r["id-conversa"]);
          socket.emit("lista conversas", listaIds);
        } else {
          socket.emit("lista conversas", []);
        }
      },
    );
  });

  // ENTRAR EM UMA CONVERSA ESPECÍFICA PELO ID
  socket.on("abrir conversa por id", (idConversa) => {
    const roomName = `conversa_${idConversa}`;

    socket.rooms.forEach((room) => {
      if (room !== socket.id) socket.leave(room);
    });

    socket.join(roomName);
    socket.conversaAtivaId = idConversa;

    db.all(
      `SELECT * FROM "base-mensagens" WHERE "id-conversa" = ? ORDER BY id ASC`,
      [idConversa],
      (err, rows) => {
        if (!err && rows) {
          const historicoFormatado = rows.map((row) => {
            const partes = row["escreveu-mensagem"].split("]: ");
            const usuario = partes[0] ? partes[0].replace("[", "") : "Anônimo";
            const texto = partes[1] || row["escreveu-mensagem"];
            return { usuario, texto, hora: row["hora-mensagem"] };
          });
          socket.emit("historico mensagens", historicoFormatado);
        }
      },
    );
  });

  // ENVIAR MENSAGEM
  socket.on("chat message", (data) => {
    const { usuario, texto, hora, idConversa } = data;
    const roomName = `conversa_${idConversa}`;

    const agora = new Date();
    const dataMensagem = agora.toLocaleDateString("pt-BR");
    const horaMensagem =
      hora ||
      agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    const conteudoParaBanco = `[${usuario}]: ${texto}`;

    db.run(
      `INSERT INTO "base-mensagens" ("id-conversa", "data-mensagem", "hora-mensagem", "escreveu-mensagem") VALUES (?, ?, ?, ?)`,
      [idConversa, dataMensagem, horaMensagem, conteudoParaBanco],
    );

    io.to(roomName).emit("chat message", {
      usuario: usuario,
      texto: texto,
      hora: horaMensagem,
    });
  });

  // EXCLUIR/LIMPAR MENSAGENS DO ID SELECIONADO
  socket.on("limpar historico", (idConversa) => {
    const roomName = `conversa_${idConversa}`;
    db.run(
      `DELETE FROM "base-mensagens" WHERE "id-conversa" = ?`,
      [idConversa],
      (err) => {
        if (!err) {
          io.to(roomName).emit("historico limpo");
        }
      },
    );
  });
});

const PORT = 3000;
server.listen(PORT, () =>
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`),
);
