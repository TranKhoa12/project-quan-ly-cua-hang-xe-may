// Synthetic unit-test inputs only. Never imported by application code or seeded into Supabase.
export function transactionFixture() {
  return {
    customers: [], repairs: [], sales: [], movements: [],
    parts: Array.from({ length: 7 }, (_, index) => ({
      id: `PT00${index + 1}`, name: `Test part ${index + 1}`, category: 'Test', brand: 'Test',
      stock: [24, 4, 18, 3, 8, 2, 12][index], min: 1,
      price: [185000, 145000, 85000, 120000, 520000, 350000, 280000][index],
      cost: [125000, 85000, 45000, 65000, 370000, 245000, 195000][index],
    })),
  };
}
