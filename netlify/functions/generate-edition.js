// netlify/functions/generate-edition.js

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
            // Translation request
            const textOnlyPayload = { mainArticle: articles[0], secondaryArticles: articles.slice(1) };
            prompt = `Translate the following JSON object containing news articles into ${languageName}. Keep the exact JSON structure. Translate the 'headline', 'byline', and 'body' for each article. Original articles: ${JSON.stringify(textOnlyPayload)}`;
        } else {
            // Generation request for original, post-book events
            prompt = `Generate a full front page for the Daily Prophet newspaper in ${languageName}. The events must take place several years after the main Harry Potter books (e.g., in the 2020s) and must be completely original, not retelling stories from the books or films like Sirius Black's escape. Create new, imaginative events. Respond with ONLY a single valid JSON object. The JSON object must contain a 'mainArticle' (with 'headline', 'byline', and a full multi-paragraph 'body') and an array of two 'secondaryArticles' (each with 'headline', 'byline', and a one-paragraph 'body').`;
        }
        
        const payload = {
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "application/json", temperature: 0.8 }
        };

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('Gemini API Error:', data);
            return { statusCode: response.status, body: JSON.stringify({ error: 'Failed to generate edition', details: data }) };
        }
        
        if (!data.candidates || data.candidates.length === 0 || !data.candidates[0].content || !data.candidates[0].content.parts) {
            throw new Error("Invalid response structure from Gemini API.");
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
