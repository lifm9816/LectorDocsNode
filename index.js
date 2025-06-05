import path from "path";
import { fileURLToPath } from "url";
import { extractTextFromFile } from "./extractor.js";
import { classifyText } from "./classify.js";

// Compatibilidad con __dirname en módulos ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ruta del archivo a procesar
const filePath = process.argv[2];

if (!filePath) {
  console.error("❌ Debes proporcionar la ruta del archivo a procesar.");
  process.exit(1);
}

try {
  console.log("📤 Extrayendo contenido del archivo...");
  const extractedData = await extractTextFromFile(filePath);

  console.log("🧠 Clasificando contenido...");
  // Unir todos los chunks para la clasificación
  const fullText = extractedData.chunks.join(' ');
  const folder = await classifyText(fullText);

  console.log(`📁 El documento debe almacenarse en la carpeta: ${folder}`);
} catch (err) {
  console.error("❌ Error durante el procesamiento:", err.message);
}
