// netlify/functions/generate-image.js
// Ez a verzió nem igényel külső könyvtárakat ('npm install').

exports.handler = async function(event) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { headline } = JSON.parse(event.body);
        if (!headline) {
            return { statusCode: 400, body: 'Headline is required' };
        }

        const apiKey = process.env.GEMINI_API_KEY;
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`;
        
        // Biztonsági okokból eltávolítjuk az esetleges idézőjeleket a főcímből
        const sanitizedHeadline = headline.replace(/"/g, '');
        const imagePrompt = `A black and white, vintage newspaper photograph from a magical world: ${sanitizedHeadline}`;
        
        const payload = {
            instances: [{ prompt: imagePrompt }],
            parameters: { sampleCount: 1 }
        };

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Image Generation API Error:', errorText);
            return { statusCode: response.status, body: JSON.stringify({ error: "Image generation failed", details: errorText }) };
        }

        const data = await response.json();
        
        if (!data.predictions || data.predictions.length === 0 || !data.predictions[0].bytesBase64Encoded) {
             return { statusCode: 500, body: JSON.stringify({ error: 'No image data in API response' }) };
        }

        const imageUrl = `data:image/png;base64,${data.predictions[0].bytesBase64Encoded}`;

        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ imageUrl: imageUrl }),
        };

    } catch (error) {
        console.error("Error in generate-image function:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message }),
        };
    }
};
