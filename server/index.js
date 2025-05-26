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

console.log('🚀 Serveur démarré sur le port', port);

// Middleware
app.use(cors());
app.use(express.json());

// API endpoint for generating job descriptions
app.post('/api/generate-job-description', async (req, res) => {
  try {
    const { title, requirements, companyInfo } = req.body;
   
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
    
    let generatedText = data.choices[0].message.content.trim();
    
    const titleMatch = generatedText.match(/===TITLE===(.*?)===DESCRIPTION===/s);
    const descriptionMatch = generatedText.match(/===DESCRIPTION===(.*?)===REQUIREMENTS===/s);
    const requirementsMatch = generatedText.match(/===REQUIREMENTS===(.*?)$/s);
    
    const cleanedTitle = titleMatch ? titleMatch[1].trim() : title;
    let cleanedDescription = descriptionMatch ? descriptionMatch[1].trim() : 'Description générée par IA';
    const cleanedRequirements = requirementsMatch ? requirementsMatch[1].trim() : 'Exigences générées par IA';
    
    const cleanText = (text) => text
      .replace(/[""'']/g, '"')
      .replace(/[–—]/g, '-')
      .replace(/•/g, '-')
      .replace(/\*\*/g, '')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/^\s*[\*\-\+]\s*/gm, '- ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    
    cleanedDescription = cleanText(cleanedDescription);
    const sentences = cleanedDescription.split(/[.!?]+/);
    if (sentences.length > 3) {
      cleanedDescription = sentences.slice(0, 3).join('.').trim() + '.';
    }
    
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

// NOUVELLE ROUTE - Analyse complète du CV
app.post('/api/analyze-cv-complete', upload.single('cv'), async (req, res) => {
  try {
    let cvText = '';
    const { candidate_id } = req.body;
    
    console.log('📄 Début analyse CV complète pour candidat:', candidate_id);
    
    if (req.file) {
      const dataBuffer = fs.readFileSync(req.file.path);
      const data = await pdf(dataBuffer);
      cvText = data.text;
      fs.unlinkSync(req.file.path);
      console.log('✅ PDF extrait, longueur texte:', cvText.length);
    } else {
      cvText = req.body.cvText;
    }

    if (!cvText || cvText.trim().length < 50) {
      return res.status(400).json({ error: 'CV text too short or empty' });
    }

    // 1. Structuration du CV (avec DeepSeek et fallback)
    console.log('🤖 Structuration du CV...');
    const structuredData = await structureCVWithFallback(cvText);
    
    // 2. Stockage (simulation)
    console.log('💾 Stockage du CV...');
    const cvId = Date.now();
    
    // 3. Recherche d'offres compatibles
    console.log('🔍 Recherche d\'offres compatibles...');
    const recommendedJobs = await findCompatibleJobs(structuredData);
    
    // 4. Génération de conseils d'amélioration
    console.log('💡 Génération de conseils...');
    const improvements = await generateCVImprovementsWithAI(structuredData, cvText);
    
    console.log('✅ Analyse complète terminée');
    
    res.json({
      success: true,
      cvId: cvId,
      originalText: cvText,
      structuredData: structuredData,
      recommendedJobs: recommendedJobs,
      improvements: improvements,
      totalRecommendations: recommendedJobs.length
    });
    
  } catch (error) {
    console.error('❌ Error in CV analysis:', error);
    res.status(500).json({ 
      error: 'Failed to analyze CV',
      details: error.message 
    });
  }
});

// Route pour analyser et stocker un CV (ancienne version)
app.post('/api/analyze-and-store-cv', upload.single('cv'), async (req, res) => {
  try {
    let cvText = '';
    
    if (req.file) {
      const dataBuffer = fs.readFileSync(req.file.path);
      const data = await pdf(dataBuffer);
      cvText = data.text;
      fs.unlinkSync(req.file.path);
    } else {
      cvText = req.body.cvText;
    }

    const structuredData = await structureCVWithFallback(cvText);
    
    res.json({
      success: true,
      cvId: Date.now(),
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
    
    const allCVs = await getAllStoredCVs();
    const candidatesWithScores = [];
    
    for (const cv of allCVs) {
      const matchResult = await calculateJobCVMatchWithAI(jobData, cv.structured_data);
      
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
    
    candidatesWithScores.sort((a, b) => b.matchScore - a.matchScore);
    
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

// FONCTION COMBINÉE - Structuration CV avec DeepSeek et fallback manuel
async function structureCVWithFallback(cvText) {
  console.log('🤖 Tentative d\'analyse avec DeepSeek R1...');
  
  try {
    // Tentative avec DeepSeek R1 d'abord
    const aiResult = await structureCVWithDeepSeek(cvText);
    
    // Vérifier la qualité du résultat AI
    if (aiResult && aiResult.nom && aiResult.nom !== "Extraction impossible" && 
        aiResult.competences && aiResult.competences.length > 0) {
      console.log('✅ Analyse DeepSeek réussie');
      return aiResult;
    } else {
      console.log('⚠️ Résultat DeepSeek incomplet, utilisation du fallback');
      throw new Error('Résultat AI incomplet');
    }
  } catch (error) {
    console.log('❌ Erreur DeepSeek, passage au mode manuel:', error.message);
    return await structureCVManual(cvText);
  }
}

// Fonction DeepSeek pour structurer un CV
async function structureCVWithDeepSeek(cvText) {
  const prompt = `Analyse ce CV et extrait les informations suivantes au format JSON strict :

CV : ${cvText}

Réponds UNIQUEMENT avec un JSON valide dans ce format exact :
{
  "nom": "Nom complet du candidat",
  "email": "email@exemple.com",
  "telephone": "+1234567890",
  "competences": ["compétence1", "compétence2", "compétence3"],
  "experience_annees": 5,
  "experiences": [
    {
      "poste": "Titre du poste",
      "entreprise": "Nom entreprise", 
      "duree": "2020-2023",
      "description": "Description courte des responsabilités"
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
}

IMPORTANT : Extrait uniquement les informations présentes dans le CV. Si une information n'est pas disponible, utilise une chaîne vide "" ou un tableau vide [].`;

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
          content: "Tu es un expert en analyse de CV. Réponds toujours avec un JSON valide, rien d'autre. Extrait uniquement les informations présentes dans le texte fourni."
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

  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }

  const data = await response.json();
  let content = data.choices[0].message.content.trim();
  
  // Nettoyer le contenu pour extraire seulement le JSON
  if (content.includes('```json')) {
    content = content.split('```json')[1].split('```')[0];
  } else if (content.includes('```')) {
    content = content.split('```')[1];
  }
  
  // Supprimer les caractères non-JSON au début/fin
  content = content.replace(/^[^{]*/, '').replace(/[^}]*$/, '');
  
  return JSON.parse(content);
}

// Fonction manuelle de fallback (du premier code)
async function structureCVManual(cvText) {
  console.log('🔍 Mode fallback - extraction manuelle...');
  
  try {
    // Extraction basique avec regex
    const emailMatch = cvText.match(/[\w\.-]+@[\w\.-]+\.\w+/);
    const phoneMatch = cvText.match(/(\+?\d{1,4}[\s\-]?)?(\(?\d{1,4}\)?[\s\-]?)?[\d\s\-]{8,}/);
    
    // Tentative d'extraction du nom (première ligne souvent)
    const lines = cvText.split('\n').filter(line => line.trim().length > 2);
    let possibleName = lines[0] || "Candidat";
    
    // Nettoyer le nom
    possibleName = possibleName.replace(/[^\w\s\-\.]/g, '').trim();
    if (possibleName.length < 2 || possibleName.length > 50) {
      possibleName = "Candidat Expert";
    }
    
    // Recherche de mots-clés pour les compétences
    const skillKeywords = [
      'JavaScript', 'Python', 'Java', 'React', 'Node.js', 'PHP', 'C++', 'C#',
      'HTML', 'CSS', 'SQL', 'MongoDB', 'PostgreSQL', 'Docker', 'Git',
      'Angular', 'Vue.js', 'TypeScript', 'Spring', 'Laravel', 'Django',
      'AWS', 'Azure', 'Google Cloud', 'Kubernetes', 'Jenkins', 'Linux',
      'Bootstrap', 'jQuery', 'Express', 'MySQL', 'Redis', 'GraphQL',
      'Figma', 'Photoshop', 'Illustrator', 'UX', 'UI', 'Design',
      'Excel', 'Power BI', 'Tableau', 'Analytics', 'Machine Learning'
    ];
    
    const foundSkills = skillKeywords.filter(skill => 
      cvText.toLowerCase().includes(skill.toLowerCase())
    );
    
    if (foundSkills.length === 0) {
      foundSkills.push('Bureautique', 'Communication', 'Travail en équipe');
    }
    
    // Estimation de l'expérience
    const yearMatches = cvText.match(/20\d{2}/g);
    const years = yearMatches ? [...new Set(yearMatches.map(y => parseInt(y)))].sort() : [];
    let experience = 0;
    
    if (years.length >= 2) {
      experience = Math.max(0, Math.max(...years) - Math.min(...years));
    } else if (years.length === 1) {
      experience = Math.max(0, new Date().getFullYear() - years[0]);
    } else {
      experience = 1;
    }
    
    experience = Math.min(experience, 20);
    
    // Détection du domaine
    let domaine = "Non déterminé";
    if (foundSkills.some(skill => ['React', 'JavaScript', 'HTML', 'CSS', 'Node.js', 'Angular', 'Vue.js'].includes(skill))) {
      domaine = "Développement web";
    } else if (foundSkills.some(skill => ['Python', 'Java', 'C++', 'C#'].includes(skill))) {
      domaine = "Développement logiciel";
    } else if (foundSkills.some(skill => ['SQL', 'MongoDB', 'PostgreSQL', 'MySQL'].includes(skill))) {
      domaine = "Base de données";
    } else if (foundSkills.some(skill => ['AWS', 'Azure', 'Docker', 'Kubernetes'].includes(skill))) {
      domaine = "DevOps / Cloud";
    } else if (foundSkills.some(skill => ['Figma', 'Photoshop', 'UX', 'UI', 'Design'].includes(skill))) {
      domaine = "Design / UX";
    } else if (foundSkills.some(skill => ['Power BI', 'Tableau', 'Analytics', 'Machine Learning'].includes(skill))) {
      domaine = "Data Science";
    } else {
      domaine = "Informatique";
    }
    
    // Recherche de formation
    const educationKeywords = ['diplôme', 'master', 'licence', 'bac', 'ingénieur', 'université', 'école', 'formation'];
    const educationLines = lines.filter(line => 
      educationKeywords.some(keyword => line.toLowerCase().includes(keyword))
    );
    
    return {
      nom: possibleName,
      email: emailMatch ? emailMatch[0] : "",
      telephone: phoneMatch ? phoneMatch[0].replace(/\s+/g, ' ').trim() : "",
      competences: foundSkills.slice(0, 12),
      experience_annees: experience,
      experiences: [
        {
          poste: `Expérience en ${domaine}`,
          entreprise: "Entreprise précédente",
          duree: years.length >= 2 ? `${Math.min(...years)}-${Math.max(...years)}` : `${new Date().getFullYear() - experience}-${new Date().getFullYear()}`,
          description: `Expérience professionnelle de ${experience} ans dans le domaine ${domaine}`
        }
      ],
      formation: educationLines.length > 0 ? [
        {
          diplome: educationLines[0].substring(0, 80),
          etablissement: "Institution éducative",
          annee: years.length > 0 ? Math.min(...years).toString() : "Non spécifié"
        }
      ] : [
        {
          diplome: `Formation en ${domaine}`,
          etablissement: "Formation professionnelle",
          annee: years.length > 0 ? Math.min(...years).toString() : "2020"
        }
      ],
      langues: ["Français", "Anglais"],
      domaine: domaine,
      localisation: "France",
      resume_profil: `Professionnel en ${domaine} avec ${experience} ans d'expérience. Compétences principales : ${foundSkills.slice(0, 3).join(', ')}.`
    };
    
  } catch (error) {
    console.error('❌ Erreur extraction manuelle:', error);
    return {
      nom: "Candidat Expert",
      email: "",
      telephone: "",
      competences: ["Informatique", "Communication", "Travail en équipe"],
      experience_annees: 2,
      experiences: [{
        poste: "Poste professionnel",
        entreprise: "Entreprise",
        duree: "2022-2024",
        description: "Expérience professionnelle"
      }],
      formation: [{
        diplome: "Formation supérieure",
        etablissement: "Institution",
        annee: "2022"
      }],
      langues: ["Français", "Anglais"],
      domaine: "Informatique",
      localisation: "France",
      resume_profil: "Professionnel avec expérience dans le domaine informatique."
    };
  }
}

// Fonction améliorée pour generateCVImprovements avec AI
async function generateCVImprovementsWithAI(structuredData, originalText) {
  console.log('💡 Génération de conseils avec DeepSeek...');
  
  try {
    const prompt = `Analyse ce CV structuré et génère des conseils d'amélioration détaillés.

DONNÉES DU CV:
- Nom: ${structuredData.nom}
- Compétences: ${structuredData.competences?.join(', ')}
- Expérience: ${structuredData.experience_annees} ans
- Domaine: ${structuredData.domaine}
- Formation: ${structuredData.formation?.map(f => f.diplome).join(', ')}

TEXTE ORIGINAL (premiers 500 caractères):
${originalText.substring(0, 500)}...

Réponds avec un JSON valide contenant une analyse complète :
{
  "overall_score": 0.75,
  "strengths": ["Point fort 1", "Point fort 2", "Point fort 3"],
  "weaknesses": ["Faiblesse 1", "Faiblesse 2"],
  "specific_improvements": [
    {
      "category": "Compétences",
      "issue": "Description du problème",
      "action": "Action recommandée",
      "priority": "high"
    }
  ],
  "keywords_to_add": ["mot-clé1", "mot-clé2"],
  "format_suggestions": ["suggestion 1", "suggestion 2"]
}`;

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
            content: "Tu es un expert RH spécialisé dans l'amélioration de CV. Analyse le CV et donne des conseils constructifs et actionnable en JSON valide."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.4
      })
    });

    if (!response.ok) {
      throw new Error('API Error');
    }

    const data = await response.json();
    let content = data.choices[0].message.content.trim();
    
    if (content.includes('```json')) {
      content = content.split('```json')[1].split('```')[0];
    }
    
    content = content.replace(/^[^{]*/, '').replace(/[^}]*$/, '');
    
    const result = JSON.parse(content);
    console.log('✅ Conseils AI générés');
    return result;
    
  } catch (error) {
    console.error('❌ Erreur génération conseils AI, fallback manuel:', error);
    
    // Fallback manuel
    const domaine = structuredData.domaine || "Informatique";
    const experience = structuredData.experience_annees || 0;
    const competences = structuredData.competences || [];
    
    let score = 0.6;
    if (competences.length > 5) score += 0.1;
    if (experience > 2) score += 0.1;
    if (structuredData.email) score += 0.05;
    if (structuredData.telephone) score += 0.05;
    if (structuredData.formation && structuredData.formation.length > 0) score += 0.1;
    
    return {
      overall_score: Math.min(score, 0.95),
      strengths: [
        `Expérience de ${experience} ans dans le ${domaine}`,
        `Maîtrise de ${competences.length} compétences techniques`,
        "Profil complet et structuré"
      ],
      weaknesses: [
        "Manque de certifications récentes",
        "Peu de projets personnels mentionnés"
      ],
      specific_improvements: [
        {
          category: "Compétences",
          issue: "Compétences techniques à moderniser",
          action: `Ajouter des formations en technologies ${domaine} récentes`,
          priority: "high"
        }
      ],
      keywords_to_add: [...competences.slice(0, 3), "Leadership", "Innovation"],
      format_suggestions: ["Ajouter une section projets", "Structurer par ordre chronologique"]
    };
  }
}

// Fonction pour calculer correspondance Job-CV avec AI
async function calculateJobCVMatchWithAI(jobData, cvData) {
  try {
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

    const response = await fetch('https://DeepSeek-R1-gADK.eastus.models.ai.azure.com/v1/chat/completions?api-version=2024-06-01-preview', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.AZURE_API_KEY}`
      },
      body: JSON.stringify({
        model: "DeepSeek-R1-gADK",
        messages: [{ 
          role: "user", 
          content: matchingPrompt 
        }],
        max_tokens: 700,
        temperature: 0.4
      })
    });

    if (!response.ok) {
      throw new Error('API Error');
    }

    const data = await response.json();
    let content = data.choices[0].message.content.trim();
    
    if (content.includes('```json')) {
      content = content.split('```json')[1].split('```')[0];
    }
    
    content = content.replace(/^[^{]*/, '').replace(/[^}]*$/, '');
    
    return JSON.parse(content);
  } catch (error) {
    console.error('Error with AI matching, using fallback:', error);
    return {
      score: Math.random() * 0.4 + 0.5,
      points_forts: ["Compétences techniques", "Expérience adaptée"],
      points_faibles: ["Formation à compléter"],
      recommandation: "Bon candidat potentiel"
    };
  }
}

// Fonction améliorée pour findCompatibleJobs
async function findCompatibleJobs(cvData) {
  console.log('🔍 Recherche d\'offres compatibles pour:', cvData.domaine);
  
  const domaine = cvData.domaine || "Informatique";
  const competences = cvData.competences || [];
  const experience = cvData.experience_annees || 0;
  
  const jobTemplates = [
    {
      title: `Développeur ${domaine} Senior`,
      description: `Nous recherchons un développeur expérimenté en ${domaine} pour rejoindre notre équipe innovante.`,
      requirements: `${competences.slice(0, 3).join(', ')}, ${experience}+ ans d'expérience`,
      company: "TechCorp",
      location: "Paris",
      baseScore: 0.85
    },
    {
      title: `Expert ${domaine}`,
      description: `Poste d'expert technique pour des projets ${domaine} de grande envergure.`,
      requirements: `Expertise ${competences[0] || 'technique'}, leadership, ${Math.max(3, experience)} ans d'expérience`,
      company: "InnovaTech",
      location: "Lyon",
      baseScore: 0.78
    },
    {
      title: `Consultant ${domaine}`,
      description: `Mission de conseil en ${domaine} auprès de grands comptes.`,
      requirements: `${competences.slice(0, 2).join(', ')}, consulting, adaptabilité`,
      company: "ConseilPro",
      location: "Marseille",
      baseScore: 0.72
    },
    {
      title: "Chef de Projet Technique",
      description: `Direction de projets techniques avec une équipe ${domaine}.`,
      requirements: `Management, ${competences[0] || 'technique'}, gestion de projet`,
      company: "ProjectLead",
      location: "Toulouse",
      baseScore: 0.68
    },
    {
      title: `Architecte ${domaine}`,
      description: `Conception d'architectures ${domaine} scalables et performantes.`,
      requirements: `Architecture, ${competences.slice(0, 2).join(', ')}, senior level`,
      company: "ArchitectSoft",
      location: "Nantes",
      baseScore: 0.75
    }
  ];
  
  return jobTemplates.map((template, index) => ({
    jobData: {
      id: index + 1,
      title: template.title,
      description: template.description,
      requirements: template.requirements,
      location: template.location,
      company: template.company,
      logo_url: null
    },
    matchScore: Math.min(template.baseScore + (experience * 0.02), 0.95),
    reasons: [
      `Compétences ${competences[0] || 'techniques'} requises`,
      `Expérience de ${experience} ans adaptée`,
      `Domaine ${domaine} correspondant`
    ],
    concerns: experience < 3 ? ["Expérience junior"] : ["Niveau senior requis"],
    recommendation: template.baseScore > 0.8 ? "Candidat très adapté" : "Bon potentiel"
  })).filter(job => job.matchScore > 0.5).slice(0, 5);
}

// Fonction pour récupérer tous les CV (version démo améliorée)
async function getAllStoredCVs() {
  return [
    {
      id: 1,
      original_text: "Développeur Full-Stack avec 5 ans d'expérience en React, Node.js, JavaScript et Python. Passionné par les nouvelles technologies et l'innovation. Expérience en startup et grande entreprise.",
      structured_data: { 
        nom: "Jean Dupont",
        competences: ["React", "JavaScript", "Node.js", "Python", "MongoDB"],
        experience_annees: 5,
        domaine: "Développement web",
        email: "jean.dupont@email.com",
        localisation: "Paris, France"
      },
      created_at: "2024-01-01"
    },
    {
      id: 2,
      original_text: "Data Scientist passionné par l'IA et le Machine Learning. 3 ans d'expérience en analyse de données, Python, TensorFlow et SQL. Diplômé d'une école d'ingénieur.",
      structured_data: { 
        nom: "Marie Martin",
        competences: ["Python", "TensorFlow", "SQL", "Machine Learning", "Pandas"],
        experience_annees: 3,
        domaine: "Data Science",
        email: "marie.martin@email.com",
        localisation: "Lyon, France"
      },
      created_at: "2024-01-02"
    },
    {
      id: 3,
      original_text: "Designer UI/UX avec 4 ans d'expérience. Maîtrise de Figma, Adobe Creative Suite, et notions de développement front-end. Spécialisé dans l'expérience utilisateur mobile.",
      structured_data: { 
        nom: "Sophie Durand",
        competences: ["Figma", "Adobe XD", "UI/UX", "Prototyping", "HTML/CSS"],
        experience_annees: 4,
        domaine: "Design",
        email: "sophie.durand@email.com",
        localisation: "Marseille, France"
      },
      created_at: "2024-01-03"
    },
    {
      id: 4,
      original_text: "Ingénieur DevOps avec 6 ans d'expérience en cloud computing, Docker, Kubernetes et CI/CD. Expert en AWS et Azure, automatisation des déploiements.",
      structured_data: { 
        nom: "Pierre Lambert",
        competences: ["Docker", "Kubernetes", "AWS", "Azure", "Jenkins", "Terraform"],
        experience_annees: 6,
        domaine: "DevOps / Cloud",
        email: "pierre.lambert@email.com",
        localisation: "Toulouse, France"
      },
      created_at: "2024-01-04"
    },
    {
      id: 5,
      original_text: "Chef de projet informatique avec 8 ans d'expérience en gestion d'équipes techniques. Spécialisé en méthodes agiles, Scrum Master certifié.",
      structured_data: { 
        nom: "Laura Rousseau",
        competences: ["Scrum", "Agile", "Management", "JIRA", "Confluence", "Leadership"],
        experience_annees: 8,
        domaine: "Gestion de projet",
        email: "laura.rousseau@email.com",
        localisation: "Nantes, France"
      },
      created_at: "2024-01-05"
    }
  ];
}

// Fonction pour recherche avancée
async function searchCandidatesAdvanced(criteria) {
  const allCVs = await getAllStoredCVs();
  
  return allCVs.filter(cv => {
    const data = cv.structured_data;
    
    if (criteria.skills.length > 0) {
      const hasSkills = criteria.skills.some(skill => 
        data.competences?.some(comp => 
          comp.toLowerCase().includes(skill.toLowerCase())
        )
      );
      if (!hasSkills) return false;
    }
    
    if (data.experience_annees < criteria.minExperience || 
        data.experience_annees > criteria.maxExperience) {
      return false;
    }
    
    if (criteria.domain && 
        !data.domaine?.toLowerCase().includes(criteria.domain.toLowerCase())) {
      return false;
    }
    
    if (criteria.location && 
        !data.localisation?.toLowerCase().includes(criteria.location.toLowerCase())) {
      return false;
    }
    
    return true;
  }).slice(0, criteria.limit);
}

// Route de test pour vérifier le fonctionnement
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Server is running with DeepSeek AI + Manual fallback',
    timestamp: new Date().toISOString(),
    features: [
      'Job Description Generation (DeepSeek AI)',
      'CV Analysis (DeepSeek AI + Manual Fallback)',
      'Job-CV Matching (DeepSeek AI + Fallback)',
      'CV Improvement Suggestions (DeepSeek AI + Fallback)',
      'Advanced Candidate Search'
    ]
  });
});

// Route de debug pour tester l'extraction CV
app.post('/api/debug-cv-extraction', upload.single('cv'), async (req, res) => {
  try {
    let cvText = '';
    
    if (req.file) {
      const dataBuffer = fs.readFileSync(req.file.path);
      const data = await pdf(dataBuffer);
      cvText = data.text;
      fs.unlinkSync(req.file.path);
    } else {
      cvText = req.body.cvText;
    }

    console.log('🔍 Debug - Test des deux méthodes...');
    
    // Test méthode DeepSeek
    let deepSeekResult = null;
    try {
      deepSeekResult = await structureCVWithDeepSeek(cvText);
      console.log('✅ DeepSeek réussi');
    } catch (error) {
      console.log('❌ DeepSeek échoué:', error.message);
    }
    
    // Test méthode manuelle
    const manualResult = await structureCVManual(cvText);
    console.log('✅ Méthode manuelle terminée');
    
    res.json({
      success: true,
      originalTextLength: cvText.length,
      originalTextPreview: cvText.substring(0, 200),
      deepSeekResult: deepSeekResult,
      manualResult: manualResult,
      recommendation: deepSeekResult ? 'DeepSeek utilisé' : 'Fallback manuel utilisé'
    });
    
  } catch (error) {
    console.error('Debug error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`✅ Server running on port ${port}`);
  console.log(`🔗 Frontend: http://localhost:5173`);
  console.log(`🔗 Backend: http://localhost:${port}`);
  console.log(`🤖 AI Integration: DeepSeek R1 avec fallback manuel`);
  console.log(`🧪 Debug endpoint: http://localhost:${port}/api/debug-cv-extraction`);
  console.log(`❤️ Health check: http://localhost:${port}/api/health`);
});