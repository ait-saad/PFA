const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// API endpoint for generating job descriptions
app.post('/api/generate-job-description', async (req, res) => {
  try {
    const { title, requirements, companyInfo } = req.body;
   
    // Prompt modifié pour générer une description courte en français
    const prompt = `Tu es un spécialiste RH professionnel. Crée une offre d'emploi complète pour un poste de "${title}".

Exigences à inclure : ${requirements}
${companyInfo ? `Contexte de l'entreprise : ${companyInfo}` : ''}

Génère le contenu dans cette structure EXACTE avec des séparateurs clairs :

===TITLE===
${title}

===DESCRIPTION===
[Écris UNIQUEMENT un aperçu du poste en 2-3 phrases maximum qui décrit brièvement ce que l'entreprise recherche et l'objectif principal du rôle. Commence par "Nous recherchons..." ou "Nous sommes à la recherche...". Reste concis et professionnel en français.]

===REQUIREMENTS===
## Qualifications Requises
- [Liste des compétences et expériences essentielles en français]
- [Inclure les exigences de formation si pertinent]
- [Mentionner les années d'expérience nécessaires]

## Compétences Souhaitées
- [Liste des compétences optionnelles en français]
- [Technologies ou certifications supplémentaires]

## Ce Que Nous Offrons
- Package salarial compétitif
- Opportunités de développement professionnel
- Arrangements de travail flexibles
- Avantages santé et bien-être

IMPORTANT : Tout doit être en FRANÇAIS. La section DESCRIPTION doit faire exactement 2-3 phrases maximum, comme un paragraphe d'aperçu du poste. Ne pas inclure de responsabilités détaillées dans cette section.`;

    // Appel API Azure DeepSeek
    const response = await fetch('https://DeepSeek-R1-gADK.eastus.models.ai.azure.com/v1/chat/completions?api-version=2024-06-01-preview', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.AZURE_API_KEY}`
      },
      body: JSON.stringify({
        model: "DeepSeek-R1-gADK",
        messages: [
          {
            role: "system",
            content: "Tu es un expert RH qui crée des descriptions de poste claires et bien structurées en français. Utilise toujours le format exact demandé avec les séparateurs ===TITLE===, ===DESCRIPTION===, et ===REQUIREMENTS===. La section DESCRIPTION doit être très courte (2-3 phrases maximum)."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 1200,
        temperature: 0.6,
        top_p: 0.9
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Azure API error:', errorText);
      throw new Error(`Azure API error: ${response.status} - ${response.statusText}`);
    }

    const data = await response.json();
    
    // Récupérer et parser le contenu généré
    let generatedText = data.choices[0].message.content.trim();
    
    // Séparer le contenu en 3 parties
    const titleMatch = generatedText.match(/===TITLE===(.*?)===DESCRIPTION===/s);
    const descriptionMatch = generatedText.match(/===DESCRIPTION===(.*?)===REQUIREMENTS===/s);
    const requirementsMatch = generatedText.match(/===REQUIREMENTS===(.*?)$/s);
    
    const cleanedTitle = titleMatch ? titleMatch[1].trim() : title;
    let cleanedDescription = descriptionMatch ? descriptionMatch[1].trim() : 'Description générée par IA';
    const cleanedRequirements = requirementsMatch ? requirementsMatch[1].trim() : 'Exigences générées par IA';
    
    // Nettoyer et limiter la description
    const cleanText = (text) => text
      .replace(/[""'']/g, '"')
      .replace(/[–—]/g, '-')
      .replace(/•/g, '-')
      .replace(/\*\*/g, '')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/^\s*[\*\-\+]\s*/gm, '- ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    
    // Limiter la description à 3 phrases maximum
    cleanedDescription = cleanText(cleanedDescription);
    const sentences = cleanedDescription.split(/[.!?]+/);
    if (sentences.length > 3) {
      cleanedDescription = sentences.slice(0, 3).join('.').trim() + '.';
    }
    
    // Supprimer les crochets et textes d'instruction s'ils sont restés
    cleanedDescription = cleanedDescription
      .replace(/\[.*?\]/g, '')
      .replace(/^\s*-\s*/gm, '')
      .trim();
    
    res.json({
      title: cleanText(cleanedTitle),
      description: cleanedDescription,
      requirements: cleanText(cleanedRequirements)
    });
  } catch (error) {
    console.error('Error generating job description:', error);
    res.status(500).json({ 
      error: 'Failed to generate job description',
      details: error.message 
    });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});