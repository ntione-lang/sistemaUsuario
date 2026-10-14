const http = require("node:http");
const sqlite3 = require("sqlite3");
const fs = require("node:fs");
const path = require("node:path");

// ========================================
// 1. CONFIGURAÇÃO DA PASTA DO BANCO
// ========================================

const pastaData = path.join(__dirname, "data");

if (!fs.existsSync(pastaData)) {
  fs.mkdirSync(pastaData, { recursive: true });
}

const banco = new sqlite3.Database(
  path.join(pastaData, "banco_dados.db")
);

// ========================================
// 2. PREPARAR O BANCO DE DADOS
// ========================================

function prepararBanco(callback) {
  const sqlCriarTabela = `
    CREATE TABLE IF NOT EXISTS tb_usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      codinome TEXT,
      email TEXT NOT NULL UNIQUE,
      telefone TEXT,
      nivel TEXT
    )
  `;
  banco.run(sqlCriarTabela, (err) => {
    if (err) {
      console.error("Erro ao criar tabela:", err.message);
      process.exit(1);
    }
    banco.all("PRAGMA table_info(tb_usuarios)", (err, colunas) => {
      if (err) {
        console.error("Erro ao verificar tabela:", err.message);
        process.exit(1);
      }

      const nomesColunas = colunas.map((coluna) => coluna.name);

      const novasColunas = [
        { nome: "codinome", tipo: "TEXT" },
        { nome: "nivel", tipo: "TEXT" }
      ].filter((coluna) => !nomesColunas.includes(coluna.nome));

      function adicionarColuna(indice) {
        if (indice >= novasColunas.length) {
          console.log("Banco de dados preparado com sucesso!");
          return callback();
        }

        const coluna = novasColunas[indice];

        banco.run(
          `ALTER TABLE tb_usuarios ADD COLUMN ${coluna.nome} ${coluna.tipo}`,
          (err) => {
            if (err) {
              console.error("Erro ao adicionar coluna:", err.message);
              process.exit(1);
            }

            adicionarColuna(indice + 1);
          }
        );
      }

      adicionarColuna(0);
    });
  });
}

// ========================================
// 3. FUNÇÃO PARA ENVIAR RESPOSTAS JSON
// ========================================

function enviarJson(res, status, dados) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8"
  });

  res.end(JSON.stringify(dados));
}

// ========================================
// 4. FUNÇÃO PARA LER O CORPO DA REQUISIÇÃO
// ========================================

async function lerCorpo(req) {
  const partes = [];

  for await (const parte of req) {
    partes.push(parte);
  }

  const texto = Buffer.concat(partes).toString("utf8");

  return texto.trim() ? JSON.parse(texto) : {};
}

// ========================================
// 5. FUNÇÕES DE NORMALIZAÇÃO
// ========================================

function normalizarTexto(valor) {
  return typeof valor === "string" ? valor.trim() : "";
}

function normalizarEmail(valor) {
  return normalizarTexto(valor).toLowerCase();
}

// ========================================
// 6. SERVIR ARQUIVOS ESTÁTICOS
// ========================================

function servirArquivo(res, caminhoArquivo, tipoConteudo) {
  try {
    const arquivo = fs.readFileSync(caminhoArquivo);

    res.writeHead(200, {
      "Content-Type": tipoConteudo
    });

    return res.end(arquivo);
  } catch (err) {
    return enviarJson(res, 404, {
      erro: "Arquivo não encontrado."
    });
  }
}

// ========================================
// 7. CRIAR O SERVIDOR
// ========================================

const servidor = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type"
  );

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    return res.end();
  }

  const url = new URL(req.url, "http://localhost:3000");
  const pathname = url.pathname;

  // ========================================
  // 8. ABRIR PÁGINAS E ARQUIVOS ESTÁTICOS
  // ========================================

  if (req.method === "GET" && pathname === "/") {
    return servirArquivo(
      res,
      path.join(__dirname, "../frontend/index.html"),
      "text/html; charset=utf-8"
    );
  }

  if (req.method === "GET" && pathname === "/style.css") {
    return servirArquivo(
      res,
      path.join(__dirname, "../frontend/style.css"),
      "text/css; charset=utf-8"
    );
  }

  if (req.method === "GET" && pathname === "/script.js") {
    return servirArquivo(
      res,
      path.join(__dirname, "../frontend/script.js"),
      "application/javascript; charset=utf-8"
    );
  }

  // ========================================
  // 9. LISTAR TODOS OS USUÁRIOS
  // GET /api/usuarios
  // ========================================

  if (req.method === "GET" && pathname === "/api/usuarios") {
    banco.all(
      `SELECT id, nome, codinome, email, telefone, nivel
       FROM tb_usuarios
       ORDER BY id DESC`,
      [],
      (err, linhas) => {
        if (err) {
          return enviarJson(res, 500, {
            erro: "Erro ao listar usuários."
          });
        }

        return enviarJson(res, 200, linhas);
      }
    );

    return;
  }

  // ========================================
  // 10. CADASTRAR UM USUÁRIO
  // POST /api/usuarios
  // ========================================

  if (req.method === "POST" && pathname === "/api/usuarios") {
    try {
      const dados = await lerCorpo(req);

      const nome = normalizarTexto(dados.nome);
      const codinome = normalizarTexto(dados.codinome);
      const email = normalizarEmail(dados.email);
      const telefone = normalizarTexto(dados.telefone);
      const nivel = normalizarTexto(dados.nivel);

      if (!nome || !email) {
        return enviarJson(res, 400, {
          erro: "Nome e e-mail são obrigatórios."
        });
      }

      banco.run(
        `INSERT INTO tb_usuarios
         (nome, codinome, email, telefone, nivel)
         VALUES (?, ?, ?, ?, ?)`,
        [nome, codinome, email, telefone, nivel],
        function (err) {
          if (err) {
            if (err.message.includes("UNIQUE")) {
              return enviarJson(res, 409, {
                erro: "Este e-mail já está cadastrado."
              });
            }

            return enviarJson(res, 500, {
              erro: "Erro ao cadastrar usuário."
            });
          }

          return enviarJson(res, 201, {
            mensagem: "Usuário cadastrado com sucesso!",
            id: this.lastID
          });
        }
      );
    } catch (err) {
      return enviarJson(res, 400, {
        erro: "Dados enviados inválidos."
      });
    }

    return;
  }

  // ========================================
  // 11. IDENTIFICAR ROTAS COM ID
  // Exemplo: /api/usuarios/1
  // ========================================

  const rotaUsuario = pathname.match(/^\/api\/usuarios\/(\d+)$/);

  // ========================================
  // 12. EDITAR UM USUÁRIO
  // PUT /api/usuarios/1
  // ========================================

  if (rotaUsuario && req.method === "PUT") {
    const id = Number(rotaUsuario[1]);

    try {
      const dados = await lerCorpo(req);

      const nome = normalizarTexto(dados.nome);
      const codinome = normalizarTexto(dados.codinome);
      const email = normalizarEmail(dados.email);
      const telefone = normalizarTexto(dados.telefone);
      const nivel = normalizarTexto(dados.nivel);

      if (!nome || !email) {
        return enviarJson(res, 400, {
          erro: "Nome e e-mail são obrigatórios."
        });
      }

      banco.run(
        `UPDATE tb_usuarios
         SET nome = ?,
             codinome = ?,
             email = ?,
             telefone = ?,
             nivel = ?
         WHERE id = ?`,
        [nome, codinome, email, telefone, nivel, id],
        function (err) {
          if (err) {
            if (err.message.includes("UNIQUE")) {
              return enviarJson(res, 409, {
                erro: "Este e-mail já está cadastrado em outro usuário."
              });
            }

            return enviarJson(res, 500, {
              erro: "Erro ao atualizar usuário."
            });
          }

          if (this.changes === 0) {
            return enviarJson(res, 404, {
              erro: "Usuário não encontrado."
            });
          }

          return enviarJson(res, 200, {
            mensagem: "Usuário atualizado com sucesso!"
          });
        }
      );
    } catch (err) {
      return enviarJson(res, 400, {
        erro: "Dados enviados inválidos."
      });
    }

    return;
  }

  // ========================================
  // 13. EXCLUIR UM USUÁRIO
  // DELETE /api/usuarios/1
  // ========================================

  if (rotaUsuario && req.method === "DELETE") {
    const id = Number(rotaUsuario[1]);

    banco.run(
      "DELETE FROM tb_usuarios WHERE id = ?",
      [id],
      function (err) {
        if (err) {
          return enviarJson(res, 500, {
            erro: "Erro ao excluir usuário."
          });
        }

        if (this.changes === 0) {
          return enviarJson(res, 404, {
            erro: "Usuário não encontrado."
          });
        }

        return enviarJson(res, 200, {
          mensagem: "Usuário excluído com sucesso!"
        });
      }
    );

    return;
  }

  // ========================================
  // 14. ROTA NÃO ENCONTRADA
  // ========================================

  return enviarJson(res, 404, {
    erro: "Rota não encontrada."
  });
});

// ========================================
// 15. PREPARAR BANCO E INICIAR SERVIDOR
// ========================================

prepararBanco(() => {
  servidor.listen(3000, () => {
    console.log("Servidor rodando em http://localhost:3000");
    console.log("API disponível em http://localhost:3000/api/usuarios");
  });
});