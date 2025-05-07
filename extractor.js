import fs from 'fs';
import path from 'path';
import mammoth from 'mammoth';
import * as xlsx from 'xlsx';
import XLSX from 'xlsx';
import { exec } from 'child_process';
import { promisify } from 'util';
import { createReadStream } from 'fs';
import { createInterface } from 'readline';

const execAsync = promisify(exec);

// Función para dividir el texto en chunks más pequeños
function splitTextIntoChunks(text, maxChunkSize = 15000) {
    const words = text.split(/\s+/);
    const chunks = [];
    let currentChunk = [];
    let currentSize = 0;

    for (const word of words) {
        // Estimación aproximada de caracteres (siendo conservadores)
        const wordSize = word.length;
        
        if (currentSize + wordSize > maxChunkSize) {
            chunks.push(currentChunk.join(' '));
            currentChunk = [word];
            currentSize = wordSize;
        } else {
            currentChunk.push(word);
            currentSize += wordSize;
        }
    }

    if (currentChunk.length > 0) {
        chunks.push(currentChunk.join(' '));
    }

    return chunks;
}

// Función para extraer texto de PPTX usando unzip
async function extractPPTXText(filePath) {
    try {
        // Crear un directorio temporal
        const tempDir = path.join(path.dirname(filePath), 'temp_pptx_' + Date.now());
        await fs.promises.mkdir(tempDir, { recursive: true });

        // Descomprimir el archivo PPTX
        await execAsync(`unzip -q "${filePath}" -d "${tempDir}"`);

        // Leer los archivos de diapositivas
        const slidesDir = path.join(tempDir, 'ppt/slides');
        const notesDir = path.join(tempDir, 'ppt/notesSlides');
        let text = [];

        // Función para extraer texto de un archivo XML
        async function extractTextFromXML(filePath) {
            const content = await fs.promises.readFile(filePath, 'utf8');
            // Extraer texto entre etiquetas <a:t>
            const matches = content.match(/<a:t[^>]*>(.*?)<\/a:t>/g) || [];
            return matches
                .map(match => match.replace(/<[^>]+>/g, '').trim())
                .filter(text => text.length > 0)
                .join(' ');
        }

        // Procesar diapositivas
        if (fs.existsSync(slidesDir)) {
            const files = await fs.promises.readdir(slidesDir);
            for (const file of files.filter(f => f.endsWith('.xml'))) {
                const slideText = await extractTextFromXML(path.join(slidesDir, file));
                if (slideText) {
                    text.push(`Diapositiva ${file.replace(/[^\d]/g, '')}:`);
                    text.push(slideText);
                }
            }
        }

        // Procesar notas
        if (fs.existsSync(notesDir)) {
            const files = await fs.promises.readdir(notesDir);
            for (const file of files.filter(f => f.endsWith('.xml'))) {
                const noteText = await extractTextFromXML(path.join(notesDir, file));
                if (noteText) {
                    text.push(`Notas de diapositiva ${file.replace(/[^\d]/g, '')}:`);
                    text.push(noteText);
                }
            }
        }

        // Limpiar
        await fs.promises.rm(tempDir, { recursive: true, force: true });

        return text.join('\n\n');
    } catch (error) {
        console.error('Error extrayendo texto de PPTX:', error);
        throw error;
    }
}

// Principal function to extract text from different type of documents
export async function extractTextFromFile(filePath) {
    try {
        const fileExtension = filePath.toLowerCase().split('.').pop();
        let extractedText = '';

        switch (fileExtension) {
            case 'pdf': {
                const dataBuffer = fs.readFileSync(filePath);
                // Importar pdf-parse dinámicamente solo cuando se necesite
                const pdfParse = (await import('pdf-parse')).default;
                const data = await pdfParse(dataBuffer);
                extractedText = data.text;
                break;
            }
            case 'docx': {
                const buffer = fs.readFileSync(filePath);
                const result = await mammoth.extractRawText({ buffer });
                extractedText = result.value;
                break;
            }
            case 'xlsx': {
                const workbook = XLSX.readFile(filePath);
                const sheetNames = workbook.SheetNames;
                const texts = [];
                
                for (const sheetName of sheetNames) {
                    const sheet = workbook.Sheets[sheetName];
                    texts.push(`Hoja: ${sheetName}`);
                    texts.push(XLSX.utils.sheet_to_string(sheet));
                }
                
                extractedText = texts.join('\n\n');
                break;
            }
            case 'pptx': {
                extractedText = await extractPPTXText(filePath);
                break;
            }
            case 'txt': {
                extractedText = fs.readFileSync(filePath, 'utf8');
                break;
            }
            default:
                throw new Error(`Formato de archivo no soportado: ${fileExtension}`);
        }

        console.log('Texto extraído:', {
            fileName: path.basename(filePath),
            fileType: fileExtension,
            textLength: extractedText.length,
            preview: extractedText.substring(0, 200)
        });

        // Dividir el texto en chunks y devolverlos
        const chunks = splitTextIntoChunks(extractedText);
        return {
            chunks,
            totalChunks: chunks.length,
            fileType: fileExtension
        };

    } catch (error) {
        console.error('Error al extraer texto:', error);
        throw error;
    }
}

// Si se llama desde la línea de comandos
if (import.meta.url === `file://${process.argv[1]}`) {
    const filePath = process.argv[2];
    if (!filePath) {
        console.error("Por favor proporciona la ruta del archivo");
        process.exit(1);
    }

    extractTextFromFile(filePath)
        .then(text => {
            console.log(text);
            process.exit(0);
        })
        .catch(error => {
            console.error("Error:", error.message);
            process.exit(1);
        });
}