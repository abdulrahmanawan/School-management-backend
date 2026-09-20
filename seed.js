const sequelize = require('./config/db');
const User = require('./models/User');
const bcrypt = require('bcryptjs');

async function seed() {
  try {
    await sequelize.sync();

    // Owner
    const ownerEmail = 'owner@example.com';
    const ownerPassword = 'owner123';
    const owner = await User.findOne({ where: { email: ownerEmail } });
    if (!owner) {
      const hashed = await bcrypt.hash(ownerPassword, 10);
      await User.create({
        name: 'System Owner',
        email: ownerEmail,
        password: hashed,
        role: 'owner',
      });
      console.log('Owner created');
    }

    // Principal
    const principalEmail = 'principal@example.com';
    const principalPassword = 'principal123';
    const principal = await User.findOne({ where: { email: principalEmail } });
    if (!principal) {
      const hashed = await bcrypt.hash(principalPassword, 10);
      await User.create({
        name: 'School Principal',
        email: principalEmail,
        password: hashed,
        role: 'principal',
      });
      console.log('Principal created');
    }

    console.log('Seeding completed');
  } catch (err) {
    console.error('Seed failed:', err);
  }
}

seed();