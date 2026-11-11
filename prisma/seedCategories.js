const path = require('path');
const prisma = require(path.join(__dirname, '../src/config/prisma'));

const defaultCategories = [
  // Expense Categories
  { name: 'Food & Dining', categoryType: 'EXPENSE', icon: 'utensils', colorHex: '#F59E0B' },
  { name: 'Shopping', categoryType: 'EXPENSE', icon: 'shopping-bag', colorHex: '#EC4899' },
  { name: 'Transportation', categoryType: 'EXPENSE', icon: 'car', colorHex: '#3B82F6' },
  { name: 'Bills & Utilities', categoryType: 'EXPENSE', icon: 'receipt', colorHex: '#EF4444' },
  { name: 'Entertainment', categoryType: 'EXPENSE', icon: 'film', colorHex: '#8B5CF6' },
  { name: 'Health & Wellness', categoryType: 'EXPENSE', icon: 'heart', colorHex: '#10B981' },
  { name: 'Groceries', categoryType: 'EXPENSE', icon: 'shopping-cart', colorHex: '#84CC16' },
  { name: 'Travel', categoryType: 'EXPENSE', icon: 'plane', colorHex: '#06B6D4' },
  { name: 'Education', categoryType: 'EXPENSE', icon: 'book', colorHex: '#6366F1' },
  { name: 'Miscellaneous Expense', categoryType: 'EXPENSE', icon: 'tag', colorHex: '#6B7280' },

  // Income Categories
  { name: 'Salary', categoryType: 'INCOME', icon: 'briefcase', colorHex: '#10B981' },
  { name: 'Freelance / Consulting', categoryType: 'INCOME', icon: 'laptop', colorHex: '#3B82F6' },
  { name: 'Investments Return', categoryType: 'INCOME', icon: 'trending-up', colorHex: '#059669' },
  { name: 'Gifts & Grants', categoryType: 'INCOME', icon: 'gift', colorHex: '#F59E0B' },
  { name: 'Miscellaneous Income', categoryType: 'INCOME', icon: 'wallet', colorHex: '#6B7280' },

  // Transfer & Investment Categories
  { name: 'Account Transfer', categoryType: 'TRANSFER', icon: 'arrow-right-left', colorHex: '#64748B' },
  { name: 'Investment', categoryType: 'INVESTMENT', icon: 'line-chart', colorHex: '#2563EB' },
];

async function seedCategories() {
  console.log('Seeding system categories...');
  for (const cat of defaultCategories) {
    const existing = await prisma.category.findFirst({
      where: {
        name: cat.name,
        userId: null,
      },
    });

    if (!existing) {
      await prisma.category.create({
        data: {
          name: cat.name,
          categoryType: cat.categoryType,
          icon: cat.icon,
          colorHex: cat.colorHex,
          userId: null, // System-wide category
        },
      });
      console.log(`+ Created category: ${cat.name} (${cat.categoryType})`);
    }
  }
  console.log('Categories seeded successfully.');
}

if (require.main === module) {
  require('dotenv').config();
  seedCategories()
    .then(async () => {
      await prisma.$disconnect();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('Seeding error:', err);
      await prisma.$disconnect();
      process.exit(1);
    });
}

module.exports = { seedCategories };
