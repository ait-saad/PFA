const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const multer = require('multer');
const pdf = require('pdf-parse');
const fs = require('fs');

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;
const upload = multer({ dest: 'uploads/' });

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

// Route pour analyser et stocker un CV
app.post('/api/analyze-and-store-cv', upload.single('cv'), async (req, res) => {
  try {
    let cvText = '';
    
    if (req.file) {
      // Extraction du texte PDF
      const dataBuffer = fs.readFileSync(req.file.path);
      const data = await pdf(dataBuffer);
      cvText = data.text;
      
      // Nettoyer le fichier temporaire
      fs.unlinkSync(req.file.path);
    } else {
      cvText = req.body.cvText;
    }

    // Structuration via Azure DeepSeek
    const structuredData = await structureCV(cvText);
    
    res.json({
      success: true,
      cvId: Date.now(), // ID temporaire
      originalText: cvText,
      structuredData: structuredData
    });
  } catch (error) {
    console.error('Error analyzing CV:', error);
    res.status(500).json({ error: error.message });
  }
});

// Route pour trouver les meilleurs candidats pour une offre
app.post('/api/find-candidates-for-job', async (req, res) => {
  try {
    const { jobData, limit = 10 } = req.body;
    
    // Récupérer tous les CV de la base (à implémenter avec votre DB)
    const allCVs = await getAllStoredCVs();
    
    // Calculer le score pour chaque CV
    const candidatesWithScores = [];
    
    for (const cv of allCVs) {
      const matchResult = await calculateJobCVMatch(jobData, cv.structured_data);
      
      candidatesWithScores.push({
        cvId: cv.id,
        candidateData: cv.structured_data,
        matchScore: matchResult.score,
        strengths: matchResult.points_forts,
        weaknesses: matchResult.points_faibles,
        recommendation: matchResult.recommandation,
        originalText: cv.original_text
      });
    }
    
    // Trier par score décroissant
    candidatesWithScores.sort((a, b) => b.matchScore - a.matchScore);
    
    // Retourner les meilleurs candidats
    res.json({
      success: true,
      totalCandidates: candidatesWithScores.length,
      topCandidates: candidatesWithScores.slice(0, limit),
      jobAnalyzed: jobData
    });
    
  } catch (error) {
    console.error('Error finding candidates:', error);
    res.status(500).json({ error: error.message });
  }
});

// Route pour recherche avancée de candidats
app.post('/api/search-candidates', async (req, res) => {
  try {
    const { 
      skills = [], 
      minExperience = 0, 
      maxExperience = 20,
      domain = '',
      location = '',
      limit = 20 
    } = req.body;
    
    // Récupérer et filtrer les CV selon les critères
    const filteredCandidates = await searchCandidatesAdvanced({
      skills,
      minExperience,
      maxExperience, 
      domain,
      location,
      limit
    });
    
    res.json({
      success: true,
      candidates: filteredCandidates,
      totalFound: filteredCandidates.length
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Fonction pour structurer un CV via IA
async function structureCV(cvText) {
  const prompt = `Analyse ce CV et extrait les informations suivantes au format JSON strict :

CV : ${cvText}

Réponds UNIQUEMENT avec un JSON valide dans ce format exact :
{
  "nom": "Nom complet",
  "email": "email@exemple.com",
  "telephone": "+1234567890",
  "competences": ["compétence1", "compétence2", "compétence3"],
  "experience_annees": 5,
  "experiences": [
    {
      "poste": "Titre du poste",
      "entreprise": "Nom entreprise", 
      "duree": "2020-2023",
      "description": "Description courte"
    }
  ],
  "formation": [
    {
      "diplome": "Nom du diplôme",
      "etablissement": "Nom école/université",
      "annee": "2020"
    }
  ],
  "langues": ["Français", "Anglais"],
  "domaine": "Développement web",
  "localisation": "Ville, Pays",
  "resume_profil": "Résumé en 2 phrases du profil professionnel"
}`;

  try {
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
            content: "Tu es un expert en analyse de CV. Réponds toujours avec un JSON valide, rien d'autre."
          },
          {
            role: "user", 
            content: prompt
          }
        ],
        max_tokens: 1200,
        temperature: 0.3
      })
    });

    const data = await response.json();
    let content = data.choices[0].message.content.trim();
    
    // Nettoyer le contenu pour extraire seulement le JSON
    if (content.includes('```json')) {
      content = content.split('```json')[1].split('```')[0];
    } else if (content.includes('```')) {
      content = content.split('```')[1];
    }
    
    return JSON.parse(content);
  } catch (error) {
    console.error('Error with AI structuring:', error);
    // Retourner une structure par défaut en cas d'erreur
    return {
      nom: "Extraction impossible",
      email: "",
      telephone: "",
      competences: [],
      experience_annees: 0,
      experiences: [],
      formation: [],
      langues: [],
      domaine: "Non déterminé",
      localisation: "",
      resume_profil: "Erreur lors de l'analyse automatique"
    };
  }
}

// Fonction pour calculer correspondance Job-CV
async function calculateJobCVMatch(jobData, cvData) {
  const matchingPrompt = `Évalue la correspondance entre ce candidat et cette offre d'emploi.

CANDIDAT:
- Nom: ${cvData.nom}
- Compétences: ${cvData.competences?.join(', ') || 'Non spécifié'}
- Expérience: ${cvData.experience_annees} ans
- Domaine: ${cvData.domaine}
- Formation: ${cvData.formation?.map(f => f.diplome).join(', ') || 'Non spécifié'}

OFFRE D'EMPLOI:
- Titre: ${jobData.title}
- Description: ${jobData.description}
- Exigences: ${jobData.requirements}

Évalue la correspondance et réponds avec un JSON valide :
{
  "score": 0.85,
  "points_forts": ["Maîtrise excellente de React", "Expérience pertinente de 5 ans"],
  "points_faibles": ["Manque d'expérience en Docker", "Formation non technique"],
  "recommandation": "Candidat très adapté au poste"
}`;

  try {
    const response = await fetch('https://DeepSeek-R1-gADK.eastus.models.ai.azure.com/v1/chat/completions?api-version=2024-06-01-preview', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.AZURE_API_KEY}`
      },
      body: JSON.stringify({
        model: "DeepSeek-R1-gADK",
        messages: [{ role: "user", content: matchingPrompt }],
        max_tokens: 700,
        temperature: 0.4
      })
    });

    const data = await response.json();
    let content = data.choices[0].message.content.trim();
    
    if (content.includes('```json')) {
      content = content.split('```json')[1].split('```')[0];
    }
    
    return JSON.parse(content);
  } catch (error) {
    console.error('Error with matching:', error);
    return {
      score: 0.5,
      points_forts: ["Analyse en cours"],
      points_faibles: ["Erreur de traitement"],
      recommandation: "Erreur lors de l'évaluation"
    };
  }
}

// Fonction pour récupérer tous les CV (version démo)
async function getAllStoredCVs() {
  // Version démo avec des données fictives
  return [
    {
      id: 1,
      original_text: "CV exemple...",
      structured_data: { 
        nom: "Jean Dupont",
        competences: ["React", "JavaScript", "Node.js"],
        experience_annees: 5,
        domaine: "Développement web"
      },
      created_at: "2024-01-01"
    }
  ];
}

// Fonction pour recherche avancée (version démo)
async function searchCandidatesAdvanced(criteria) {
  const allCVs = await getAllStoredCVs();
  
  return allCVs.filter(cv => {
    const data = cv.structured_data;
    
    // Filtrer par compétences
    if (criteria.skills.length > 0) {
      const hasSkills = criteria.skills.some(skill => 
        data.competences?.some(comp => 
          comp.toLowerCase().includes(skill.toLowerCase())
        )
      );
      if (!hasSkills) return false;
    }
    
    // Filtrer par expérience
    if (data.experience_annees < criteria.minExperience || 
        data.experience_annees > criteria.maxExperience) {
      return false;
    }
    
    // Filtrer par domaine
    if (criteria.domain && 
        !data.domaine?.toLowerCase().includes(criteria.domain.toLowerCase())) {
      return false;
    }
    
    return true;
  }).slice(0, criteria.limit);
}

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});