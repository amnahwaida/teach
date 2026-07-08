const bcrypt = require('bcryptjs');

// Dynamically import Prisma since this runs as a standalone script
async function main() {
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();

  console.log('🌱 Seeding database...');

  // Create admin user
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@ajar.in';
  const adminPass = process.env.ADMIN_PASSWORD || 'admin123';
  const adminPassword = await bcrypt.hash(adminPass, 12);
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      name: 'Super Admin',
      email: adminEmail,
      passwordHash: adminPassword,
      role: 'admin',
      status: 'active',
    },
  });
  console.log(`✅ Admin created: ${admin.email} (password: ${adminPass})`);

  // Create demo teacher
  const guruPassword = await bcrypt.hash('guru123', 12);
  const guru = await prisma.user.upsert({
    where: { email: 'guru@ajar.in' },
    update: {},
    create: {
      name: 'Bu Sari (Demo)',
      email: 'guru@ajar.in',
      passwordHash: guruPassword,
      role: 'guru',
      status: 'active',
    },
  });
  console.log(`✅ Guru created: ${guru.email} (password: guru123)`);

  console.log('🎉 Seed completed!');
  console.log('---');
  console.log(`Login sebagai Admin:  ${adminEmail} / ${adminPass}`);
  console.log('Login sebagai Guru:   guru@ajar.in / guru123');

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('❌ Seed failed:', e);
  process.exit(1);
});
