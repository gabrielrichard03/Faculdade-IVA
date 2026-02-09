import pg from 'pg';
import bcrypt from 'bcrypt';
import 'dotenv/config'; // Para carregar DATABASE_URL do .env

// --- CONFIGURAÇÃO DE CONEXÃO ---
const DATABASE_URL = process.env.DATABASE_URL;

const pool = new pg.Pool({
    connectionString: DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

// --- DADOS DOS ALUNOS PARA IMPORTAR ---
// Você pode preencher este array com os dados dos seus alunos.
// A senha padrão será "senha123" para todos, e será criptografada.
// IMPORTANTE: Preencha com a lista de alunos fornecida por Isaack Ramon.
const alunosParaImportar = [
    // --- TURMA T-I2025 ---
    // Substitua pelos nomes e e-mails reais dos alunos desta turma.
    { nome: "Nome Aluno 1 T-I2025", email: "aluno1.ti2025@iva.com.br", turma: "T-I2025" },
    { nome: "Nome Aluno 2 T-I2025", email: "aluno2.ti2025@iva.com.br", turma: "T-I2025" },
    { nome: "Nome Aluno 3 T-I2025", email: "aluno3.ti2025@iva.com.br", turma: "T-I2025" },
    // ... adicione o restante dos alunos da T-I2025 aqui

    // --- TURMA T-I2026 ---
    // Substitua pelos nomes e e-mails reais dos alunos desta turma.
    { nome: "Nome Aluno 1 T-I2026", email: "aluno1.ti2026@iva.com.br", turma: "T-I2026" },
    { nome: "Nome Aluno 2 T-I2026", email: "aluno2.ti2026@iva.com.br", turma: "T-I2026" },
    { nome: "Nome Aluno 3 T-I2026", email: "aluno3.ti2026@iva.com.br", turma: "T-I2026" },
    // ... adicione o restante dos alunos da T-I2026 aqui

    // --- TURMA T-N2026 ---
    // Substitua pelos nomes e e-mails reais dos alunos desta turma.
    { nome: "Nome Aluno 1 T-N2026", email: "aluno1.tn2026@iva.com.br", turma: "T-N2026" },
    { nome: "Nome Aluno 2 T-N2026", email: "aluno2.tn2026@iva.com.br", turma: "T-N2026" },
    { nome: "Nome Aluno 3 T-N2026", email: "aluno3.tn2026@iva.com.br", turma: "T-N2026" },
    // ... adicione o restante dos alunos da T-N2026 aqui
];

const importarAlunos = async () => {
    const turmaParaImportar = process.argv[2];

    if (!turmaParaImportar) {
        console.error("----------------------------------------------------------------");
        console.error("⚠️  Por favor, especifique uma turma para importar.");
        console.error("   Exemplo: node importarAlunos.js T-I2025");
        console.error("   Turmas disponíveis na lista: T-I2025, T-I2026, T-N2026");
        console.error("----------------------------------------------------------------");
        process.exit(1);
    }

    const alunosFiltrados = alunosParaImportar.filter(aluno => aluno.turma === turmaParaImportar);

    if (alunosFiltrados.length === 0) {
        console.warn(`🟡 Nenhum aluno encontrado para a turma '${turmaParaImportar}' na lista de importação.`);
        await pool.end();
        return;
    }

    if (!DATABASE_URL) {
        console.error("❌ ERRO FATAL: A variável de ambiente DATABASE_URL não está definida.");
        process.exit(1);
    }

    console.log(`Iniciando importação de ${alunosFiltrados.length} alunos para a turma ${turmaParaImportar}...`);

    const defaultPassword = "senha123"; // Senha padrão para os novos alunos
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(defaultPassword, salt);

    let importedCount = 0;
    let errorCount = 0;

    for (const aluno of alunosFiltrados) {
        const formattedEmail = aluno.email.includes('@') ? aluno.email : `${aluno.email}@iva.com.br`;
        const sql = `
            INSERT INTO usuarios (nome, email, senha, tipo, turma)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (email) DO UPDATE SET
                nome = EXCLUDED.nome,
                turma = EXCLUDED.turma,
                senha = EXCLUDED.senha // Atualiza a senha para o padrão em caso de conflito
            RETURNING id
        `;
        const params = [aluno.nome, formattedEmail, hashedPassword, 'aluno', aluno.turma];

        try {
            const result = await pool.query(sql, params);
            console.log(`✅ Sucesso: Aluno '${aluno.nome}' (${formattedEmail}) importado/atualizado com ID: ${result.rows[0].id}`);
            importedCount++;
        } catch (err) {
            console.error(`❌ Erro ao importar aluno '${aluno.nome}' (${formattedEmail}):`, err.message);
            errorCount++;
        }
    }

    console.log(`\n--- Resumo da Importação ---`);
    console.log(`Total de alunos processados para a turma ${turmaParaImportar}: ${alunosFiltrados.length}`);
    console.log(`Alunos importados/atualizados: ${importedCount}`);
    console.log(`Alunos com erro: ${errorCount}`);
    await pool.end();
};

importarAlunos();