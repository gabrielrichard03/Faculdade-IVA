import pg from 'pg';
import bcrypt from 'bcrypt';

// --- DADOS DO ADMINISTRADOR ---
const adminUser = {
    nome: "Gabriel (Admin)",
    email: "gabriel@iva.com",
    senha: "uma_senha_muito_forte", // Troque por uma senha segura
    tipo: "professor", // Admin tem perfil de professor para ter acesso a tudo
    turma: "" // Admin não pertence a uma turma específica
};
// ------------------------------

// --- CONFIGURAÇÃO DE CONEXÃO ---
// IMPORTANTE: Use uma variável de ambiente para a URL em produção.
// No Render, configure a variável de ambiente 'EXTERNAL_DATABASE_URL' com o valor abaixo.
const DATABASE_URL = process.env.EXTERNAL_DATABASE_URL || 'postgresql://banco_iva_user:gpW2tKCcwxGv3WatU4SlsbVpzrAx5Jfn@dpg-d61l7ajuibrs73e1lhbg-a.oregon-postgres.render.com/banco_iva';

const pool = new pg.Pool({
    connectionString: DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

const criarAdmin = async () => {
    console.log(`Criando/Atualizando usuário admin: ${adminUser.email}`);

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(adminUser.senha, salt);

    const sql = `INSERT INTO usuarios (nome, email, senha, tipo, turma) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (email) DO UPDATE SET nome = EXCLUDED.nome, senha = EXCLUDED.senha, tipo = EXCLUDED.tipo RETURNING id`;
    const params = [adminUser.nome, adminUser.email, hashedPassword, adminUser.tipo, adminUser.turma];

    try {
        const result = await pool.query(sql, params);
        console.log(`✅ Sucesso! Usuário Admin '${adminUser.nome}' criado/atualizado com ID: ${result.rows[0].id}`);
    } catch (err) {
        console.error("❌ Erro ao criar usuário admin:", err.message);
    } finally {
        await pool.end();
    }
};

criarAdmin();