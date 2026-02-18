// Script para criar usuário paciente via Prisma direto
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('Paciente@2024', 10);
  
  const user = await prisma.user.create({
    data: {
      email: 'paciente.maria@email.com',
      passwordHash,
      role: 'PATIENT',
      patient: {
        create: {
          fullName: 'Maria Oliveira',
          cpf: '12345678901',
          phone: '(11) 98765-4321',
          city: 'São Paulo',
          state: 'SP',
          bloodType: 'O+',
        },
      },
    },
    include: { patient: true },
  });
  
  console.log('Paciente criado:');
  console.log('Email:', user.email);
  console.log('Senha: Paciente@2024');
  console.log('Nome:', user.patient.fullName);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
