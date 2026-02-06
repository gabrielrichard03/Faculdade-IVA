import pg from 'pg';
import bcrypt from 'bcrypt';

// 1. Conexão com o banco de dados PostgreSQL do Render
// A URL do banco de dados deve ser configurada como uma variável de ambiente.
const DATABASE_URL = process.env.DATABASE_URL;

const pool = new pg.Pool({
    connectionString: DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});


// --- EDITE AQUI OS DADOS DO USUÁRIO QUE DESEJA CRIAR ---
const novoUsuario = {
    nome: "Aluno VIP",
    email: "vip@iva.com",
    senha: "123", // A senha será criptografada antes de ser salva
    tipo: "aluno", // Opções: 'aluno' ou 'professor'
    turma: "A"     // Opções: 'A' ou 'B'
};
// -------------------------------------------------------

const criarUsuario = async () => {
    // Usamos RETURNING id para obter o ID do usuário criado no PostgreSQL
    if (!DATABASE_URL) {
        console.error("❌ ERRO FATAL: A variável de ambiente DATABASE_URL não está definida.");
        process.exit(1);
    }

    // CRIPTOGRAFA A SENHA
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(novoUsuario.senha, salt);

    const sql = `INSERT INTO usuarios (nome, email, senha, tipo, turma) VALUES ($1, $2, $3, $4, $5) RETURNING id`;
    const params = [novoUsuario.nome, novoUsuario.email, hashedPassword, novoUsuario.tipo, novoUsuario.turma];

    try {
        const result = await pool.query(sql, params);
        console.log(`✅ Sucesso! Usuário '${novoUsuario.nome}' criado com ID: ${result.rows[0].id}`);
        console.log(`   Login: ${novoUsuario.email}`);
        console.log(`   Senha: ${novoUsuario.senha}`);
    } catch (err) {
        console.error("Erro ao criar usuário:", err.message);
    } finally {
        await pool.end(); // Fecha a conexão com o banco
    }
};

criarUsuario();