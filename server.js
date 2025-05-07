import express from 'express';
import multer from 'multer';
import { extractTextFromFile } from './extractor.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// Configurar multer para mantener la extensión original del archivo
const storage = multer.diskStorage({
    destination: 'uploads/',
    filename: function (req, file, cb) {
        // Obtener la extensión original del archivo
        const ext = file.originalname.split('.').pop();
        // Crear un nombre único con la extensión original
        cb(null, `${file.fieldname}-${Date.now()}.${ext}`);
    }
});

const upload = multer({ storage: storage });

// Ruta de prueba con el archivo específico
app.get('/test', async (req, res) => {
    try {
        const testFilePath = '/Users/lifm7/Downloads/garantia .pdf';
        const result = await extractTextFromFile(testFilePath);
        res.json(result);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Error al procesar el archivo de prueba' });
    }
});

app.post('/extract', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No se proporcionó ningún archivo' });
        }

        console.log('Archivo recibido:', {
            originalName: req.file.originalname,
            savedAs: req.file.filename,
            mimetype: req.file.mimetype
        });

        const filePath = req.file.path;
        const result = await extractTextFromFile(filePath);

        // Limpiar el archivo temporal
        fs.unlinkSync(filePath);

        res.json(result);
    } catch (error) {
        console.error('Error:', error);
        if (req.file) {
            // Asegurarse de limpiar el archivo temporal en caso de error
            try {
                fs.unlinkSync(req.file.path);
            } catch (unlinkError) {
                console.error('Error al eliminar archivo temporal:', unlinkError);
            }
        }
        res.status(500).json({ error: 'Error al procesar el archivo' });
    }
});

// Función para encontrar un puerto disponible
function findAvailablePort(startPort) {
    return new Promise((resolve, reject) => {
        const server = app.listen(startPort);
        server.on('listening', () => {
            const port = server.address().port;
            server.close(() => resolve(port));
        });
        server.on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                resolve(findAvailablePort(startPort + 1));
            } else {
                reject(err);
            }
        });
    });
}

// Asegurarse de que existe el directorio uploads
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

// Iniciar el servidor en un puerto disponible
findAvailablePort(3000)
    .then(port => {
        app.listen(port, () => {
            console.log(`Servidor corriendo en http://localhost:${port}`);
        });
    })
    .catch(err => {
        console.error('Error al iniciar el servidor:', err);
    }); 