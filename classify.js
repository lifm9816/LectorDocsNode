import fetch from 'node-fetch';

/**
 * Envía el texto a la API de Deno Fresh para clasificarlo.
 * @param {string} text - Texto extraído del documento.
 * @returns {Promise<string>} - Carpeta sugerida.
 */
export async function classifyText(text) {
  try {
    const response = await fetch('http://localhost:8000/api/sugerencia', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      throw new Error('Error al clasificar el texto');
    }

    const data = await response.json();
    return data.folder || 'Documentos sin clasificar';
  } catch (error) {
    console.error('Error en classifyText:', error);
    return 'Documentos sin clasificar';
  }
}
