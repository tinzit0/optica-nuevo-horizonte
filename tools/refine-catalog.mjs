import { readFileSync, writeFileSync } from 'node:fs';

const path = new URL('../data/productos.json', import.meta.url);
const products = JSON.parse(readFileSync(path, 'utf8').replace(/^\uFEFF/, ''));

const audience = {
  mujer: 'para mujer',
  hombre: 'para hombre',
  infantil: 'para niños',
  unisex: 'unisex'
};

for (const product of products) {
  const model = String(product.title).replace(/\s+C-?\d+[A-Z]?$/i, '').replace(/\s+Principal$/i, '');
  const type = product.category === 'sol' ? 'de sol' : 'óptico';
  const material = product.material ? ` en ${product.material}` : '';
  const target = audience[product.gender] || 'unisex';
  const variant = product.color ? `, variante ${String(product.color).toUpperCase()}` : '';
  if (product.brand === 'Seguridad') {
    product.description = `Protección visual modelo ${product.title}, diseñada para brindar cobertura y comodidad durante la jornada.`;
  } else {
    product.description = `Armazón ${type} ${product.brand} ${model}${material}, ${target}${variant}. Diseño cómodo y contemporáneo para el día a día.`;
  }
}

writeFileSync(path, `${JSON.stringify(products, null, 2)}\n`, 'utf8');
