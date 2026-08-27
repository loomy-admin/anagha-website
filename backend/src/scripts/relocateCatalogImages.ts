import 'dotenv/config';
import { relocateAllCatalogImages } from '../lib/copyErpImages.js';

const result = await relocateAllCatalogImages();
console.log(JSON.stringify(result, null, 2));
process.exit(0);
