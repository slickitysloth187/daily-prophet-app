// netlify/functions/generate-edition.js
// Ez a verzió sem igényel külső könyvtárakat.
//
exports.handler = async function(event) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { lang, articles } = JSON.parse(event.body);
        const apiKey = process.env.GEMINI_API_KEY;
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`;
        
        const languageNames = { en: 'English', hu: 'Hungarian', de: 'German', es: 'Spanish', fr: 'French', it: 'Italian' };
        const languageName = languageNames[lang] || 'English';

        let prompt;
        if (articles) {
            // Fordítási kérés
            const textOnlyPayload = { mainArticle: articles[0], secondaryArticles: articles.slice(1) };
            prompt = `Translate the following JSON object containing news articles into ${languageName}. Keep the exact JSON structure. Translate the 'headline', 'byline', and 'body' for each article. Original articles: ${JSON.stringify(textOnlyPayload)}`;
        } else {
            // Generálási kérés
            prompt = `Generate a full front page for the Daily Prophet newspaper in ${languageName}. Respond with ONLY a single valid JSON object. The JSON object must contain a 'mainArticle' (with 'headline', 'byline', and a full multi-paragraph 'body') and an array of two 'secondaryArticles' (each with 'headline', 'byline', and a one-paragraph 'body').`;
        }

        const payload = {
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "application/json", temperature: 0.75 }
        };

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Gemini API Error:', errorText);
            return { statusCode: response.status, body: JSON.stringify({ error: 'Failed to generate edition', details: errorText }) };
        }

        const data = await response.json();
        
        if (!data.candidates || data.candidates.length === 0) {
            throw new Error("No candidates in Gemini response.");
        }
        
        const generatedText = data.candidates[0].content.parts[0].text;

        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: generatedText,
        };

    } catch (error) {
        console.error("Error in generate-edition function:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message }),
        };
    }
};
