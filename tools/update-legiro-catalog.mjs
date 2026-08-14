import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const path = join(root, 'data', 'productos.json');
let products = JSON.parse(readFileSync(path, 'utf8').replace(/^\uFEFF/, ''));
if (!Array.isArray(products) && Array.isArray(products.value)) products = products.value;

products = products.filter(product => !(product.brand === 'Le Giro' && /\(1\)/.test(product.title)));
for (const product of products) {
  if (product.brand !== 'Le Giro' || !product.image.endsWith('-principal.jpg')) continue;
  const normalized = product.image.replace(/\.jpg$/, '-catalogo.jpg');
  if (existsSync(join(root, normalized))) product.image = normalized;
}

writeFileSync(path, `${JSON.stringify(products, null, 2)}\n`, 'utf8');
console.log(`Productos conservados: ${products.length}`);
