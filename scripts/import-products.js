require('dotenv').config();

const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function importProducts() {
  const products = JSON.parse(
    fs.readFileSync('./data/productos.json', 'utf8')
  );

  console.log(`Productos encontrados: ${products.length}`);

  const rows = products.map((p) => ({
    product_code: p.id,
    title: p.title,
    brand: p.brand || '',
    price: p.price || 0,
    price_old: null,
    image: p.image || '',
    category: p.category || '',
    shape: p.shape || '',
    stock: 1,
    gender: p.gender || '',
    color: p.color || '',
    material: p.material || '',
    features: p.features || [],
    description: p.description || '',
    published: true
  }));

  const batchSize = 500;

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);

    const { error } = await supabase
      .from('optica_productos')
      .upsert(batch, {
        onConflict: 'product_code'
      });

    if (error) {
      console.error('Error insertando lote:', error);
      process.exit(1);
    }

    console.log(
      `Importados ${Math.min(i + batchSize, rows.length)} / ${rows.length}`
    );
  }

  console.log('Importación terminada correctamente');
}

importProducts();