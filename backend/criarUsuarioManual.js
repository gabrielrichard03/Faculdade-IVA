import pg from 'pg';

// 1. Conexão com o banco de dados PostgreSQL do Render
const DATABASE_URL = 'postgresql://banco_iva_user:gpW2tKCcwxGv3WatU4SlsbVpzrAx5Jfn@dpg-d61l7ajuibrs73e1lhbg-a/banco_iva';

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
    senha: "123",
    tipo: "aluno", // Opções: 'aluno' ou 'professor'
    turma: "A"     // Opções: 'A' ou 'B'
};
// -------------------------------------------------------

const criarUsuario = async () => {
    // Usamos RETURNING id para obter o ID do usuário criado no PostgreSQL
    const sql = `INSERT INTO usuarios (nome, email, senha, tipo, turma) VALUES ($1, $2, $3, $4, $5) RETURNING id`;
    const params = [novoUsuario.nome, novoUsuario.email, novoUsuario.senha, novoUsuario.tipo, novoUsuario.turma];

    try {
        const result = await pool.query(sql, params);
        console.log(`Sucesso! Usuário '${novoUsuario.nome}' criado com ID: ${result.rows[0].id}`);
        console.log(`Login: ${novoUsuario.email}`);
        console.log(`Senha: ${novoUsuario.senha}`);
    } catch (err) {
        console.error("Erro ao criar usuário:", err.message);
    } finally {
        await pool.end(); // Fecha a conexão com o banco
    }
};

criarUsuario();