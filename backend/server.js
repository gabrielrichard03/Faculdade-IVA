import express from 'express';
import cors from 'cors';
import bcrypt from 'bcrypt';
import pg from 'pg'; // 1. Trocamos a biblioteca do banco de dados
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Configuração do Servidor
const app = express();
// Em um ambiente de produção como o Render, é essencial usar a porta definida pelo sistema.
const PORT = process.env.PORT || 10000;

// Configuração de CORS para segurança em produção
const corsOptions = {
    // Permite requisições apenas do frontend publicado no Render.
    origin: 'https://faculdade-iva-portal.onrender.com'
};

// Permite que o servidor entenda JSON e aceite conexões do frontend
app.use(express.json());
app.use(cors(corsOptions));

// 2. Conexão com Banco de Dados (PostgreSQL)
// A URL de conexão deve ser configurada como uma variável de ambiente no Render.
if (!process.env.DATABASE_URL) {
    console.error("ERRO FATAL: A variável de ambiente DATABASE_URL não está definida. Verifique as configurações no painel do Render.");
    process.exit(1); // Encerra o processo se a variável não for encontrada.
}

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    // --- OTIMIZAÇÕES PARA PRODUÇÃO ---
    // Define o número máximo de clientes no pool. Ideal para os planos Starter do Render.
    max: 20,
    // Tempo em milissegundos que um cliente pode ficar ocioso antes de ser fechado.
    idleTimeoutMillis: 30000,
    // Tempo em milissegundos para esperar por uma conexão antes de dar erro.
    connectionTimeoutMillis: 2000,
});

// 3. Função para criar o schema do banco de dados (tabelas e dados iniciais)
const initializeDatabase = async () => {
    console.log("Inicializando o schema do banco de dados...");
    // Hash da senha padrão 'senha123' para os usuários de teste.
    const hashedDefaultPassword = await bcrypt.hash('senha123', 10);

    // Usamos 'SERIAL' para auto-incremento no PostgreSQL
    await pool.query(`
        CREATE TABLE IF NOT EXISTS avisos (
            id SERIAL PRIMARY KEY,
            titulo TEXT,
            mensagem TEXT,
            categoria TEXT,
            data TEXT,
            turma TEXT,
            aluno_id INTEGER,
            autor TEXT
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS eventos (
            id SERIAL PRIMARY KEY,
            titulo TEXT,
            descricao TEXT,
            data TEXT,
            categoria TEXT,
            tipo TEXT,
            turma TEXT,
            cor TEXT,
            materia TEXT
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS usuarios (
            id SERIAL PRIMARY KEY,
            email TEXT UNIQUE,
            senha TEXT,
            nome TEXT,
            tipo TEXT,
            turma TEXT,
            foto TEXT
        )
    `);
    // Usamos 'ON CONFLICT DO NOTHING' para evitar erros se o usuário já existir
    await pool.query("INSERT INTO usuarios (email, senha, nome, tipo, turma) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (email) DO NOTHING", ['aluno@iva.com', hashedDefaultPassword, 'Gabriel (Novo)', 'aluno', 'A']);
    await pool.query("INSERT INTO usuarios (email, senha, nome, tipo, turma) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (email) DO NOTHING", ['veterano@iva.com', hashedDefaultPassword, 'Veterano', 'aluno', 'B']);
    await pool.query("INSERT INTO usuarios (email, senha, nome, tipo, turma) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (email) DO NOTHING", ['isaack@iva.com', hashedDefaultPassword, 'Prof. Isaack', 'professor', '']);
    await pool.query("INSERT INTO usuarios (email, senha, nome, tipo, turma) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (email) DO NOTHING", ['maria@iva.com', hashedDefaultPassword, 'Maria Silva', 'aluno', 'A']);
    await pool.query("INSERT INTO usuarios (email, senha, nome, tipo, turma) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (email) DO NOTHING", ['joao@vale.com', hashedDefaultPassword, 'João Santos', 'aluno', 'B']);
    await pool.query("INSERT INTO usuarios (email, senha, nome, tipo, turma) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (email) DO NOTHING", ['amorosomhott@iva.com', hashedDefaultPassword, 'Amoroso Mhota', 'aluno', 'B']);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS materias (
            id SERIAL PRIMARY KEY,
            nome TEXT,
            professor TEXT,
            turma TEXT,
            horario TEXT
        )
    `);
    const materiasResult = await pool.query("SELECT count(*) as count FROM materias");
    if (materiasResult.rows[0].count === '0') {
        console.log("Populando matérias padrão para o Prof. Isaack...");
        const sql = "INSERT INTO materias (nome, professor, turma, horario) VALUES ($1, $2, $3, $4)";
        await pool.query(sql, ['Teologia Sistemática', 'Prof. Isaack', 'A', 'Seg 19:00']);
        await pool.query(sql, ['Hermenêutica', 'Prof. Isaack', 'A', 'Ter 19:00']);
        await pool.query(sql, ['Hebraico', 'Prof. Isaack', 'A', 'Qua 19:00']);
        await pool.query(sql, ['Teologia Sistemática', 'Prof. Isaack', 'B', 'Ter 20:00']);
        await pool.query(sql, ['Grego', 'Prof. Isaack', 'B', 'Sex 19:00']);
        await pool.query(sql, ['Homilética', 'Prof. Isaack', 'B', 'Qua 20:00']);
    }

    await pool.query(`
        CREATE TABLE IF NOT EXISTS frequencia (
            id SERIAL PRIMARY KEY,
            aluno_id INTEGER,
            disciplina TEXT,
            data TEXT,
            status TEXT,
            turma TEXT,
            UNIQUE(aluno_id, disciplina, data)
        )
    `);
    await pool.query("INSERT INTO frequencia (aluno_id, disciplina, data, status, turma) VALUES (1, 'Teologia Sistemática', '2023-11-01', 'Presente', 'A') ON CONFLICT DO NOTHING");
    await pool.query("INSERT INTO frequencia (aluno_id, disciplina, data, status, turma) VALUES (1, 'Teologia Sistemática', '2023-11-08', 'Presente', 'A') ON CONFLICT DO NOTHING");
    await pool.query("INSERT INTO frequencia (aluno_id, disciplina, data, status, turma) VALUES (1, 'Teologia Sistemática', '2023-11-15', 'Ausente', 'A') ON CONFLICT DO NOTHING");
    await pool.query("INSERT INTO frequencia (aluno_id, disciplina, data, status, turma) VALUES (1, 'História de Israel', '2023-11-02', 'Presente', 'A') ON CONFLICT DO NOTHING");

    await pool.query(`
        CREATE TABLE IF NOT EXISTS notas (
            id SERIAL PRIMARY KEY,
            aluno_id INTEGER,
            materia TEXT,
            turma TEXT,
            nota1 REAL,
            nota2 REAL,
            UNIQUE(aluno_id, materia)
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS mensagens_suporte (
            id SERIAL PRIMARY KEY,
            aluno_id INTEGER,
            assunto TEXT,
            mensagem TEXT,
            data TEXT,
            status TEXT DEFAULT 'Pendente',
            resposta TEXT
        )
    `);
    console.log("Schema do banco de dados inicializado com sucesso.");
};

// --- MIDDLEWARE DE SEGURANÇA (AUTORIZAÇÃO) ---
const checkAuth = async (req, res, next) => {
    // Ignora rotas públicas (Login, Registro)
    if (req.path === '/login' || req.path === '/register') return next();

    const userId = req.headers['x-user-id'];

    // SEGURANÇA: Bloqueia qualquer requisição que não tenha o ID do usuário
    if (!userId) return res.status(401).json({ error: "Acesso negado: Usuário não identificado." });

    try {
        const result = await pool.query("SELECT * FROM usuarios WHERE id = $1", [userId]);
        const user = result.rows[0];
        if (!user) return res.status(401).json({ error: "Usuário não autenticado." });

        // Anexa o usuário à requisição para uso nas rotas
        req.user = user;

        // REGRAS PARA ALUNOS
        if (user.tipo === 'aluno') {
            // 1. Impede ver notas/avisos de outro aluno
            if (req.query.aluno_id && parseInt(req.query.aluno_id) !== user.id) {
                return res.status(403).json({ message: "Acesso Negado: Você não pode acessar dados de outro aluno." });
            }
            // 2. Impede ver dados de outra turma
            if (req.query.turma && req.query.turma !== user.turma) {
                return res.status(403).json({ message: "Acesso Negado: Você não pertence a esta turma." });
            }
        }
        next();
    } catch (err) {
        console.error("Erro no middleware de autenticação:", err);
        return res.status(500).json({ error: "Ocorreu um erro inesperado no servidor." });
    }
};

// --- MIDDLEWARE DE SEGURANÇA (PROFESSOR) ---
const isProfessor = (req, res, next) => {
    // Este middleware deve ser usado DEPOIS do checkAuth
    if (req.user && req.user.tipo === 'professor') {
        return next(); // O usuário é um professor, pode prosseguir
    }
    // Se não for professor, nega o acesso
    return res.status(403).json({ error: "Acesso negado. Recurso exclusivo para professores." });
};

// 4. Rotas da API (Onde o Frontend vai bater)

// Aplica o middleware de segurança em todas as rotas abaixo
app.use(checkAuth);

// Rota de Login
app.post('/login', async (req, res) => {
    const { email, password, senha } = req.body;
    const userPassword = password || senha; // Aceita 'password' ou 'senha' vindo do frontend

    // Adiciona @iva.com se o email não contiver @
    const formattedEmail = email.includes('@') ? email : `${email}@iva.com`;

    try {
        // 1. Busca o usuário pelo e-mail
        const result = await pool.query("SELECT * FROM usuarios WHERE email = $1", [formattedEmail]);

        if (result.rows.length > 0) {
            const user = result.rows[0];
            // 2. Compara a senha fornecida com o hash salvo no banco
            const validPassword = await bcrypt.compare(userPassword, user.senha);
            if (validPassword) {
                res.json({ message: 'success', user: user });
            } else {
                res.status(401).json({ message: 'Usuário ou senha incorretos' });
            }
        } else {
            res.status(401).json({ message: 'Usuário ou senha incorretos' });
        }
    } catch (err) {
        console.error("Erro no login:", err);
        return res.status(500).json({ error: "Ocorreu um erro inesperado no servidor." });
    }
});

// Rota para Registrar Novo Usuário (CRIAR LOGIN)
app.post('/register', async (req, res) => {
    const { email, senha, nome, tipo, turma } = req.body;
    // Garante que o email tenha o domínio @iva.com
    const formattedEmail = email.includes('@') ? email : `${email}@iva.com`;

    // Criptografa a senha antes de salvar
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(senha, salt);

    const sql = "INSERT INTO usuarios (email, senha, nome, tipo, turma) VALUES ($1, $2, $3, $4, $5) RETURNING id";
    const params = [formattedEmail, hashedPassword, nome, tipo || 'aluno', turma || 'A']; // Padrão Turma A se não informado

    try {
        const result = await pool.query(sql, params);
        res.json({ "message": "success", "id": result.rows[0].id });
    } catch (err) {
        console.error("Erro ao registrar usuário:", err);
        return res.status(400).json({ "error": "Não foi possível criar o usuário. O e-mail pode já estar em uso." });
    }
});

// Rota para PEGAR dados do usuário (Perfil)
app.get('/usuarios/:id', async (req, res) => {
    const { id } = req.params;
    // Não retornamos a senha por segurança
    try {
        const result = await pool.query("SELECT id, email, nome, tipo, turma, foto FROM usuarios WHERE id = $1", [id]);
        res.json({ message: "success", data: result.rows[0] });
    } catch (err) {
        console.error(`Erro ao buscar usuário ${id}:`, err);
        return res.status(400).json({ error: "Usuário não encontrado." });
    }
});

// Rota para ATUALIZAR usuário (Perfil)
app.put('/usuarios/:id', async (req, res) => {
    const { nome, senha, foto } = req.body;
    const { id } = req.params;

    // Segurança: Garante que o usuário só altere seu próprio perfil
    if (req.headers['x-user-id'] && req.headers['x-user-id'] != id) {
        return res.status(403).json({ message: "Acesso negado" });
    }

    let updates = [];
    let params = [];
    let paramIndex = 1;

    if (nome) { updates.push(`nome = $${paramIndex++}`); params.push(nome); }
    if (senha) {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(senha, salt);
        updates.push(`senha = $${paramIndex++}`);
        params.push(hashedPassword);
    }
    if (foto) { updates.push(`foto = $${paramIndex++}`); params.push(foto); }

    if (updates.length === 0) return res.json({ message: "success", changes: 0 });

    const sql = `UPDATE usuarios SET ${updates.join(', ')} WHERE id = $${paramIndex}`;
    params.push(id);

    try {
        const result = await pool.query(sql, params);
        res.json({ message: "success", changes: result.rowCount });
    } catch (err) {
        console.error(`Erro ao atualizar perfil ${id}:`, err);
        return res.status(400).json({ error: "Não foi possível atualizar o perfil." });
    }
});

// Rota para PEGAR todos os avisos (GET)
app.get('/avisos', async (req, res) => {
    let { aluno_id, turma } = req.query;
    let sql = "SELECT * FROM avisos";
    let params = [];

    // SEGURANÇA: Se for aluno, ignora os parâmetros da URL e força os dados do próprio aluno
    if (req.user && req.user.tipo === 'aluno') {
        aluno_id = req.user.id;
        turma = req.user.turma;
    }

    // Se passar filtros (visão do aluno), aplica a lógica de direcionamento
    if (aluno_id || turma) {
        sql += " WHERE (aluno_id = $1) OR (turma = $2) OR (aluno_id IS NULL AND turma IS NULL)";
        params.push(aluno_id, turma);
    }

    try {
        const result = await pool.query(sql, params);
        res.json({
            "message": "success",
            "data": result.rows
        });
    } catch (err) {
        console.error("Erro ao buscar avisos:", err);
        return res.status(500).json({ "error": "Ocorreu um erro inesperado no servidor." });
    }
});

// Rota para PEGAR matérias (Com filtro opcional por turma)
app.get('/materias', async (req, res) => {
    const { turma, professor } = req.query;
    let sql = "SELECT * FROM materias WHERE 1=1";
    let params = [];

    let paramIndex = 1;
    if (turma) {
        sql += ` AND turma = $${paramIndex++}`;
        params.push(turma);
    }
    if (professor) {
        sql += ` AND professor LIKE $${paramIndex++}`;
        params.push(`%${professor}%`);
    }

    // Organiza por nome para facilitar a visualização
    sql += " ORDER BY nome ASC";

    try {
        const result = await pool.query(sql, params);
        res.json({ "message": "success", "data": result.rows });
    } catch (err) {
        console.error("Erro ao buscar matérias:", err);
        return res.status(500).json({ "error": "Ocorreu um erro inesperado no servidor." });
    }
});

// Rota para PEGAR alunos (Filtrados por turma)
app.get('/alunos', async (req, res) => {
    const { turma } = req.query;
    let sql = "SELECT id, nome, email, turma FROM usuarios WHERE tipo = 'aluno'";
    let params = [];

    if (turma) {
        sql += " AND turma = $1";
        params.push(turma);
    }

    // IMPORTANTE: Ordena alunos por nome para facilitar a chamada e lançamento de notas
    sql += " ORDER BY nome ASC";

    try {
        const result = await pool.query(sql, params);
        res.json({ "message": "success", "data": result.rows });
    } catch (err) {
        console.error("Erro ao buscar alunos:", err);
        return res.status(500).json({ "error": "Ocorreu um erro inesperado no servidor." });
    }
});

// Rota para PEGAR frequência (GET)
app.get('/frequencia', async (req, res) => {
    let { aluno_id, turma, disciplina, data } = req.query;
    let sql = "SELECT * FROM frequencia WHERE 1=1";
    let params = [];

    // SEGURANÇA: Se for aluno, força o ID do próprio aluno para ver apenas seus dados
    if (req.user && req.user.tipo === 'aluno') {
        aluno_id = req.user.id;
    }

    if (aluno_id) {
        sql += " AND aluno_id = $1";
        params.push(aluno_id);
    }
    if (turma) {
        sql += ` AND turma = $${params.length + 1}`;
        params.push(turma);
    }
    if (disciplina) {
        sql += ` AND disciplina = $${params.length + 1}`;
        params.push(disciplina);
    }
    if (data) {
        sql += ` AND data = $${params.length + 1}`;
        params.push(data);
    }

    // Ordena por data (mais recente primeiro) e depois pelo nome do aluno (se houver join, mas aqui é simples)
    sql += " ORDER BY data DESC";

    try {
        const result = await pool.query(sql, params);
        res.json({ "message": "success", "data": result.rows });
    } catch (err) {
        console.error("Erro ao buscar frequência:", err);
        return res.status(500).json({ "error": "Ocorreu um erro inesperado no servidor." });
    }
});

// Rota para SALVAR Frequência (POST)
app.post('/frequencia', isProfessor, async (req, res) => {
    const { aluno_id, disciplina, data, status, turma } = req.body;

    const sql = `
        INSERT INTO frequencia (aluno_id, disciplina, data, status, turma) 
        VALUES ($1, $2, $3, $4, $5) 
        ON CONFLICT (aluno_id, disciplina, data) 
        DO UPDATE SET status = EXCLUDED.status
    `;
    try {
        await pool.query(sql, [aluno_id, disciplina, data, status, turma]);
        res.json({ message: "success" });
    } catch (err) {
        console.error("Erro ao salvar frequência:", err);
        return res.status(400).json({ error: "Não foi possível salvar a frequência." });
    }
});

// Rota para PEGAR Notas de uma turma (GET)
// Preparada para: Professor ver turma inteira OU Aluno ver suas próprias notas
app.get('/notas', async (req, res) => {
    const { turma, materia, aluno_id } = req.query;
    let sql = "SELECT * FROM notas WHERE 1=1";
    let params = [];

    let paramIndex = 1;
    if (turma) { sql += ` AND turma = $${paramIndex++}`; params.push(turma); }
    if (materia) { sql += ` AND materia = $${paramIndex++}`; params.push(materia); }
    if (aluno_id) { sql += ` AND aluno_id = $${paramIndex++}`; params.push(aluno_id); }

    try {
        const result = await pool.query(sql, params);
        res.json({ message: "success", data: result.rows });
    } catch (err) {
        console.error("Erro ao buscar notas:", err);
        return res.status(500).json({ "error": "Ocorreu um erro inesperado no servidor." });
    }
});

// Rota para SALVAR Notas (POST - Upsert)
app.post('/notas', isProfessor, async (req, res) => {
    let { aluno_id, materia, turma, nota1, nota2 } = req.body;

    // Sanitização: Garante que vazios virem NULL e números sejam float
    nota1 = (nota1 === "" || nota1 === null) ? null : parseFloat(nota1);
    nota2 = (nota2 === "" || nota2 === null) ? null : parseFloat(nota2);

    const sql = `INSERT INTO notas (aluno_id, materia, turma, nota1, nota2) VALUES ($1, $2, $3, $4, $5) ON CONFLICT(aluno_id, materia) DO UPDATE SET nota1=excluded.nota1, nota2=excluded.nota2`;

    try {
        await pool.query(sql, [aluno_id, materia, turma, nota1, nota2]);
        res.json({ message: "success" });
    } catch (err) {
        console.error("Erro ao salvar nota:", err);
        return res.status(400).json({ error: "Não foi possível salvar a nota." });
    }
});

// Rota para CRIAR uma matéria (POST)
app.post('/materias', isProfessor, async (req, res) => {
    const { nome, professor, turma, horario } = req.body;
    const sql = "INSERT INTO materias (nome, professor, turma, horario) VALUES ($1, $2, $3, $4) RETURNING id";
    const params = [nome, professor, turma, horario];

    try {
        const result = await pool.query(sql, params);
        res.json({ "message": "success", "id": result.rows[0].id });
    } catch (err) {
        console.error("Erro ao criar matéria:", err);
        return res.status(400).json({ "error": "Não foi possível criar a matéria." });
    }
});

// Rota para ATUALIZAR uma matéria (PUT)
app.put('/materias/:id', isProfessor, async (req, res) => {
    const { nome, professor, turma, horario } = req.body;
    const { id } = req.params;
    const sql = "UPDATE materias SET nome = $1, professor = $2, turma = $3, horario = $4 WHERE id = $5";
    const params = [nome, professor, turma, horario, id];

    try {
        const result = await pool.query(sql, params);
        res.json({ "message": "success", "changes": result.rowCount });
    } catch (err) {
        console.error(`Erro ao atualizar matéria ${id}:`, err);
        return res.status(400).json({ "error": "Não foi possível atualizar a matéria." });
    }
});

// Rota para DELETAR uma matéria (DELETE)
app.delete('/materias/:id', isProfessor, async (req, res) => {
    const { id } = req.params;
    const sql = "DELETE FROM materias WHERE id = $1";

    try {
        const result = await pool.query(sql, [id]);
        res.json({ "message": "deleted", "changes": result.rowCount });
    } catch (err) {
        console.error(`Erro ao deletar matéria ${id}:`, err);
        return res.status(400).json({ "error": "Não foi possível deletar a matéria." });
    }
});

// Rota para POPULAR matérias (Seed) - Cria turmas padrão para o professor
app.post('/materias/seed', isProfessor, async (req, res) => {
    const { professor } = req.body;
    // Usa o nome fornecido ou 'Prof. Isaack' como padrão. Adiciona 'Prof.' se não tiver.
    const profName = professor ? (professor.includes('Prof.') ? professor : `Prof. ${professor}`) : 'Prof. Isaack';

    const sql = "INSERT INTO materias (nome, professor, turma, horario) VALUES ($1, $2, $3, $4)";

    try {
        await pool.query(sql, ['Teologia Sistemática', profName, 'A', 'Seg 19:00']);
        await pool.query(sql, ['Hermenêutica', profName, 'A', 'Ter 19:00']);
        await pool.query(sql, ['Hebraico', profName, 'A', 'Qua 19:00']);
        await pool.query(sql, ['Teologia Sistemática', profName, 'B', 'Ter 20:00']);
        await pool.query(sql, ['Grego', profName, 'B', 'Sex 19:00']);
        await pool.query(sql, ['Homilética', profName, 'B', 'Qua 20:00']);
        res.json({ "message": "success" });
    } catch (err) {
        console.error("Erro ao popular matérias:", err);
        res.status(500).json({ error: "Ocorreu um erro inesperado no servidor." });
    }
});

// Rota para CRIAR um aviso (POST) - Simulação do Professor criando aviso
app.post('/avisos', isProfessor, async (req, res) => {
    const { titulo, mensagem, categoria, data, turma, aluno_id, autor } = req.body;

    // Garante que o autor seja preenchido. Se vier vazio, assume 'Prof. Isaack'
    const autorFinal = autor || 'Prof. Isaack';

    const sql = "INSERT INTO avisos (titulo, mensagem, categoria, data, turma, aluno_id, autor) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id";
    const params = [titulo, mensagem, categoria, data, turma, aluno_id, autorFinal];

    try {
        const result = await pool.query(sql, params);
        res.json({
            "message": "success",
            "id": result.rows[0].id
        });
    } catch (err) {
        console.error("Erro ao criar aviso:", err);
        return res.status(400).json({ "error": "Não foi possível criar o aviso." });
    }
});

// Rota para DELETAR um aviso (DELETE)
app.delete('/avisos/:id', isProfessor, async (req, res) => {
    const { id } = req.params;
    const sql = "DELETE FROM avisos WHERE id = $1";
    try {
        const result = await pool.query(sql, [id]);
        res.json({ "message": "deleted", "changes": result.rowCount });
    } catch (err) {
        console.error(`Erro ao deletar aviso ${id}:`, err);
        return res.status(400).json({ "error": "Não foi possível deletar o aviso." });
    }
});

// --- ROTAS DA AGENDA (CALENDÁRIO) ---

// PEGAR eventos (Para o Aluno ver na Agenda)
app.get('/eventos', async (req, res) => {
    const { turma } = req.query;
    let sql = "SELECT * FROM eventos";
    let params = [];

    // Filtra eventos da turma do aluno OU eventos globais (sem turma definida)
    if (turma) {
        sql += " WHERE turma = $1 OR turma IS NULL OR turma = ''";
        params.push(turma);
    }

    // Ordena por data para que os eventos mais próximos apareçam primeiro
    sql += " ORDER BY data ASC";

    try {
        const result = await pool.query(sql, params);
        res.json({
            "message": "success",
            "data": result.rows
        });
    } catch (err) {
        console.error("Erro ao buscar eventos:", err);
        return res.status(500).json({ "error": "Ocorreu um erro inesperado no servidor." });
    }
});

// CRIAR evento (Para o Professor adicionar no Calendário)
app.post('/eventos', isProfessor, async (req, res) => {
    const { titulo, descricao, data, categoria, tipo, turma, cor, materia } = req.body;
    const sql = "INSERT INTO eventos (titulo, descricao, data, categoria, tipo, turma, cor, materia) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id";
    const params = [titulo, descricao, data, categoria, tipo, turma, cor, materia];

    try {
        const result = await pool.query(sql, params);
        res.json({ "message": "success", "id": result.rows[0].id });
    } catch (err) {
        console.error("Erro ao criar evento:", err);
        return res.status(400).json({ "error": "Não foi possível criar o evento." });
    }
});

// ATUALIZAR evento (Editar planejamento)
app.put('/eventos/:id', isProfessor, async (req, res) => {
    const { titulo, descricao, data, categoria, tipo, turma, cor, materia } = req.body;
    const { id } = req.params;
    const sql = "UPDATE eventos SET titulo = $1, descricao = $2, data = $3, categoria = $4, tipo = $5, turma = $6, cor = $7, materia = $8 WHERE id = $9";
    const params = [titulo, descricao, data, categoria, tipo, turma, cor, materia, id];

    try {
        const result = await pool.query(sql, params);
        res.json({ "message": "success", "changes": result.rowCount });
    } catch (err) {
        console.error(`Erro ao atualizar evento ${id}:`, err);
        return res.status(400).json({ "error": "Não foi possível atualizar o evento." });
    }
});

// DELETAR evento (Excluir planejamento)
app.delete('/eventos/:id', isProfessor, async (req, res) => {
    const { id } = req.params;
    const sql = "DELETE FROM eventos WHERE id = $1";
    try {
        const result = await pool.query(sql, [id]);
        res.json({ "message": "deleted", "changes": result.rowCount });
    } catch (err) {
        console.error(`Erro ao deletar evento ${id}:`, err);
        return res.status(400).json({ "error": "Não foi possível deletar o evento." });
    }
});

// ATUALIZAR aviso (Editar aviso)
app.put('/avisos/:id', isProfessor, async (req, res) => {
    const { titulo, mensagem, categoria, data, turma } = req.body;
    const { id } = req.params;
    const sql = "UPDATE avisos SET titulo = $1, mensagem = $2, categoria = $3, data = $4, turma = $5 WHERE id = $6";
    const params = [titulo, mensagem, categoria, data, turma, id];

    try {
        const result = await pool.query(sql, params);
        res.json({ "message": "success", "changes": result.rowCount });
    } catch (err) {
        console.error(`Erro ao atualizar aviso ${id}:`, err);
        return res.status(400).json({ "error": "Não foi possível atualizar o aviso." });
    }
});

// Rota para ENVIAR mensagem de suporte (POST)
app.post('/suporte', async (req, res) => {
    const { aluno_id, assunto, mensagem } = req.body;
    const data = new Date().toISOString(); // Data atual

    try {
        const result = await pool.query(
            "INSERT INTO mensagens_suporte (aluno_id, assunto, mensagem, data) VALUES ($1, $2, $3, $4) RETURNING id",
            [aluno_id, assunto, mensagem, data]
        );
        res.json({ message: "success", id: result.rows[0].id });
    } catch (err) {
        console.error("Erro ao enviar mensagem de suporte:", err);
        return res.status(400).json({ error: "Não foi possível enviar a mensagem." });
    }
});

// Rota para PEGAR mensagens de suporte (GET) - Visão do Professor e Histórico do Aluno
app.get('/suporte', async (req, res) => {
    const { aluno_id } = req.query;

    // Join com usuarios para pegar nome e turma do aluno
    let sql = `
        SELECT m.*, u.nome as aluno_nome, u.email as aluno_email, u.turma as aluno_turma
        FROM mensagens_suporte m
        LEFT JOIN usuarios u ON m.aluno_id = u.id
    `;

    const params = [];
    if (aluno_id) {
        sql += " WHERE m.aluno_id = $1";
        params.push(aluno_id);
    }

    sql += " ORDER BY m.data DESC";

    try {
        const result = await pool.query(sql, params);
        res.json({ message: "success", data: result.rows });
    } catch (err) {
        console.error("Erro ao buscar mensagens de suporte:", err);
        return res.status(500).json({ "error": "Ocorreu um erro inesperado no servidor." });
    }
});

// Rota para RESPONDER mensagem de suporte (PUT)
app.put('/suporte/:id', isProfessor, async (req, res) => {
    const { resposta, status } = req.body;
    const { id } = req.params;

    try {
        const result = await pool.query("UPDATE mensagens_suporte SET resposta = $1, status = $2 WHERE id = $3", [resposta, status || 'Respondido', id]);
        res.json({ message: "success", changes: result.rowCount });
    } catch (err) {
        console.error(`Erro ao responder suporte ${id}:`, err);
        return res.status(400).json({ error: "Não foi possível responder a mensagem." });
    }
});

// 5. Iniciar o Servidor
// Garante que o banco de dados seja inicializado ANTES de o servidor começar a ouvir requisições.
// Isso evita erros de "tabela não encontrada" na primeira execução.
const startServer = async () => {
    try {
        // 1. Testa a conexão com o banco de dados
        const client = await pool.connect();
        console.log('Conectado com sucesso ao PostgreSQL!');
        client.release();

        // 2. Garante que as tabelas e dados iniciais existam
        await initializeDatabase();

        // 3. Inicia o servidor web para ouvir requisições
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`Servidor rodando em http://0.0.0.0:${PORT}`);
        });
    } catch (err) {
        console.error("ERRO FATAL AO INICIAR O SERVIDOR:", err);
        process.exit(1); // Encerra o processo se não conseguir conectar/inicializar o DB
    }
};

startServer();
