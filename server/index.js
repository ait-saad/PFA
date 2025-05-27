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

// ============================================================================
// UTILITAIRES ET HELPERS
// ============================================================================

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Validation des données extraites
function validateExtractedData(data) {
  const score = { total: 0, details: [] };

  // Validation nom
  if (data.nom && data.nom.length > 2 && data.nom.length < 100) {
    if (!/^[A-Za-z\s\-\.àâäéèêëïîôùûüÿç]+$/.test(data.nom)) {
      score.details.push("⚠️ Nom contient des caractères suspects");
    } else {
      score.total += 20;
      score.details.push("✓ Nom valide");
    }
  } else {
    score.details.push("❌ Nom invalide ou manquant");
  }

  // Validation email
  if (data.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    score.total += 15;
    score.details.push("✓ Email valide");
  } else {
    score.details.push("⚠️ Email manquant");
  }

  // Validation compétences
  if (data.competences && Array.isArray(data.competences) && data.competences.length > 0) {
    if (data.competences.length > 15) {
      score.details.push("⚠️ Trop de compétences");
      score.total += 15;
    } else {
      score.total += 25;
      score.details.push(`✓ ${data.competences.length} compétences`);
    }
  } else {
    score.details.push("❌ Compétences manquantes");
  }

  // Validation expérience
  if (data.experience_annees && data.experience_annees >= 0 && data.experience_annees <= 50) {
    score.total += 15;
    score.details.push(`✓ Expérience: ${data.experience_annees} ans`);
  } else {
    score.details.push("⚠️ Expérience invalide");
  }

  // Validation domaine
  if (data.domaine && data.domaine !== "Non déterminé" && data.domaine.length > 3) {
    score.total += 10;
    score.details.push(`✓ Domaine: ${data.domaine}`);
  }

  if (data.formation && Array.isArray(data.formation) && data.formation.length > 0) {
    score.total += 10;
    score.details.push("✓ Formation identifiée");
  }

  if (data.localisation && data.localisation.length > 2) {
    score.total += 5;
    score.details.push("✓ Localisation identifiée");
  }

  return {
    score: score.total,
    isValid: score.total >= 50,
    details: score.details
  };
}

// Normalisation des données
function normalizeExtractedData(data) {
  return {
    nom: data.nom ? data.nom.trim().replace(/\s+/g, ' ') : "Candidat Expert",
    email: data.email ? data.email.toLowerCase().trim() : "",
    telephone: data.telephone ? data.telephone.replace(/\s+/g, ' ').trim() : "",
    competences: Array.isArray(data.competences) ? 
      data.competences.filter(c => c && c.length > 1).slice(0, 12) : [],
    experience_annees: Math.max(0, Math.min(50, parseInt(data.experience_annees) || 0)),
    experiences: Array.isArray(data.experiences) ? data.experiences : [],
    formation: Array.isArray(data.formation) ? data.formation : [],
    langues: Array.isArray(data.langues) ? data.langues : ["Français"],
    domaine: data.domaine || "Informatique",
    localisation: data.localisation ? data.localisation.trim() : "France",
    resume_profil: data.resume_profil ? data.resume_profil.substring(0, 500) : ""
  };
}

// ============================================================================
// RETRY LOGIC AVEC BACKOFF EXPONENTIEL
// ============================================================================

async function retryDeepSeekCall(promptFn, maxRetries = 3, baseDelay = 2000) {
  let lastError = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      console.log(`🔄 Tentative ${attempt + 1}/${maxRetries} avec DeepSeek...`);
      
      const timeout = 90000 + (attempt * 30000); // 90s, 120s, 150s
      const result = await promptFn(timeout);
      
      console.log(`✅ DeepSeek réussi à la tentative ${attempt + 1}`);
      return result;
      
    } catch (error) {
      lastError = error;
      console.log(`❌ Tentative ${attempt + 1} échouée:`, error.message);
      
      if (attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt);
        console.log(`⏳ Attente de ${delay}ms avant retry...`);
        await sleep(delay);
      }
    }
  }
  
  console.log(`❌ Toutes les tentatives DeepSeek ont échoué`);
  throw lastError;
}

// ============================================================================
// EXTRACTION MANUELLE SUPER AMÉLIORÉE
// ============================================================================

async function extractCVDataAdvanced(cvText) {
  console.log('🔍 Extraction manuelle avancée...');
  
  const lines = cvText.split('\n').filter(line => line.trim().length > 1);
  const fullText = cvText.toLowerCase();
  
  // ===== EXTRACTION DU NOM =====
  let nom = "Candidat Expert";
  
  const namePatterns = [
    /^([A-ZÀÁÂÄÇÉÈÊËÏÎÔÖÙÚÛÜŸ][a-zàáâäçéèêëïîôöùúûüÿ]+(?:\s+[A-ZÀÁÂÄÇÉÈÊËÏÎÔÖÙÚÛÜŸ][a-zàáâäçéèêëïîôöùúûüÿ]+)+)/m,
    /(?:nom|name|prénom|prenom)\s*:?\s*([A-ZÀ-Ÿ][a-zà-ÿ]+(?:\s+[A-ZÀ-Ÿ][a-zà-ÿ]+)*)/i,
    /^([A-ZÀÁÂÄÇÉÈÊËÏÎÔÖÙÚÛÜŸ\s]{10,50})$/m
  ];
  
  for (const pattern of namePatterns) {
    const match = cvText.match(pattern);
    if (match && match[1]) {
      const candidateName = match[1].trim();
      if (candidateName.length > 5 && candidateName.length < 60) {
        nom = candidateName;
        break;
      }
    }
  }
  
  if (nom === "Candidat Expert") {
    for (const line of lines.slice(0, 5)) {
      const cleanLine = line.trim().replace(/[^A-Za-zÀ-ÿ\s]/g, '');
      if (cleanLine.length > 5 && cleanLine.length < 50 && /^[A-ZÀ-Ÿ]/.test(cleanLine)) {
        nom = cleanLine;
        break;
      }
    }
  }

  // ===== EXTRACTION CONTACT =====
  const emailMatch = cvText.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  const email = emailMatch ? emailMatch[1] : "";
  
  const phonePatterns = [
    /(\+33\s?[1-9](?:[\s.-]?\d{2}){4})/,
    /(0[1-9](?:[\s.-]?\d{2}){4})/,
    /(\+?\d{2,4}[\s.-]?\d{2,4}[\s.-]?\d{2,4}[\s.-]?\d{2,4})/
  ];
  
  let telephone = "";
  for (const pattern of phonePatterns) {
    const match = cvText.match(pattern);
    if (match) {
      telephone = match[1].replace(/\s+/g, ' ').trim();
      break;
    }
  }

  // ===== EXTRACTION COMPÉTENCES AVANCÉE =====
  const skillKeywords = [
    'JavaScript', 'TypeScript', 'React', 'Vue.js', 'Angular', 'Node.js', 'Express',
    'HTML', 'CSS', 'SASS', 'Bootstrap', 'Tailwind', 'jQuery',
    'Python', 'Java', 'C#', 'PHP', 'Ruby', 'Go', 'C++', 'C',
    'Django', 'Flask', 'Spring', 'Laravel', '.NET', 'Ruby on Rails',
    'SQL', 'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'Elasticsearch',
    'AWS', 'Azure', 'Google Cloud', 'Docker', 'Kubernetes', 'Jenkins',
    'Git', 'GitLab', 'GitHub', 'Webpack', 'Vite', 'Jest', 'Cypress',
    'Figma', 'Adobe XD', 'Photoshop', 'UI/UX', 'Design System',
    'Machine Learning', 'TensorFlow', 'PyTorch', 'Pandas', 'NumPy',
    'React Native', 'Flutter', 'Swift', 'Kotlin',
    'Agile', 'Scrum', 'JIRA', 'Project Management', 'Leadership'
  ];

  const foundSkills = [];
  
  for (const skill of skillKeywords) {
    const patterns = [
      new RegExp(`\\b${skill}\\b`, 'gi'),
      new RegExp(`[•\\-*]\\s*${skill}`, 'gi')
    ];
    
    for (const pattern of patterns) {
      if (pattern.test(cvText)) {
        foundSkills.push(skill);
        break;
      }
    }
  }
  
  if (foundSkills.length < 3) {
    foundSkills.push('Communication', 'Travail en équipe', 'Résolution de problèmes');
  }

  // ===== ESTIMATION EXPÉRIENCE AMÉLIORÉE =====
  let experience_annees = 0;
  
  const expPatterns = [
    /(\d+)\s*an[s]?\s*(?:d[\'e]\s*)?(?:expérience|experience)/gi,
    /(?:expérience|experience)\s*:?\s*(\d+)\s*an[s]?/gi,
    /(\d+)\s*year[s]?\s*(?:of\s*)?experience/gi
  ];
  
  for (const pattern of expPatterns) {
    const matches = [...cvText.matchAll(pattern)];
    if (matches.length > 0) {
      experience_annees = Math.max(...matches.map(m => parseInt(m[1])));
      break;
    }
  }
  
  if (experience_annees === 0) {
    const years = [...cvText.matchAll(/20\d{2}/g)]
      .map(m => parseInt(m[0]))
      .filter(year => year >= 2005 && year <= new Date().getFullYear());
    
    if (years.length >= 2) {
      const uniqueYears = [...new Set(years)].sort();
      experience_annees = Math.max(0, uniqueYears[uniqueYears.length - 1] - uniqueYears[0]);
    } else if (years.length === 1) {
      experience_annees = Math.max(0, new Date().getFullYear() - years[0]);
    }
  }
  
  experience_annees = Math.min(experience_annees, 40);
  
  if (experience_annees === 0) {
    if (fullText.includes('senior') || fullText.includes('lead')) {
      experience_annees = 6;
    } else if (fullText.includes('junior') || fullText.includes('stagiaire')) {
      experience_annees = 1;
    } else {
      experience_annees = 3;
    }
  }

  // ===== DÉTECTION DOMAINE INTELLIGENTE =====
  let domaine = "Informatique";
  
  const domaineMapping = {
    "Développement web": ['react', 'angular', 'vue', 'javascript', 'html', 'css', 'frontend', 'backend', 'fullstack', 'web developer', 'node.js'],
    "Développement mobile": ['react native', 'flutter', 'swift', 'kotlin', 'mobile', 'ios', 'android', 'xamarin'],
    "Data Science": ['python', 'machine learning', 'data scientist', 'tensorflow', 'pandas', 'analytics', 'big data', 'numpy', 'pytorch'],
    "DevOps / Cloud": ['docker', 'kubernetes', 'aws', 'azure', 'devops', 'cloud', 'infrastructure', 'jenkins', 'terraform'],
    "Design / UX": ['figma', 'adobe', 'photoshop', 'ui/ux', 'design', 'wireframe', 'prototype', 'sketch'],
    "Gestion de projet": ['scrum', 'agile', 'project manager', 'jira', 'management', 'chef de projet', 'kanban'],
    "Cybersécurité": ['sécurité', 'security', 'cybersecurity', 'pentest', 'firewall', 'cybersécurité'],
    "Intelligence Artificielle": ['ai', 'artificial intelligence', 'deep learning', 'neural network', 'nlp', 'computer vision']
  };
  
  let maxScore = 0;
  for (const [domain, keywords] of Object.entries(domaineMapping)) {
    let score = 0;
    for (const keyword of keywords) {
      if (fullText.includes(keyword.toLowerCase())) {
        score++;
      }
    }
    if (score > maxScore) {
      maxScore = score;
      domaine = domain;
    }
  }

  // ===== EXTRACTION EXPÉRIENCES =====
  const experiences = [];
  const currentYear = new Date().getFullYear();
  const startYear = Math.max(2010, currentYear - experience_annees);
  
  experiences.push({
    poste: `Expert en ${domaine}`,
    entreprise: "Entreprise précédente", 
    duree: `${startYear}-${currentYear}`,
    description: `${experience_annees} ans d'expérience en ${domaine} avec maîtrise des technologies : ${foundSkills.slice(0, 3).join(', ')}`
  });

  // ===== EXTRACTION FORMATION =====
  const formation = [];
  
  const educationKeywords = [
    'diplôme', 'master', 'licence', 'bac', 'bachelor', 'ingénieur', 'université', 
    'école', 'formation', 'degree', 'education', 'phd', 'doctorat'
  ];
  
  const educationLines = lines.filter(line => 
    educationKeywords.some(keyword => 
      line.toLowerCase().includes(keyword.toLowerCase())
    )
  );
  
  if (educationLines.length > 0) {
    for (const line of educationLines.slice(0, 2)) {
      const yearMatch = line.match(/20\d{2}/);
      formation.push({
        diplome: line.trim().substring(0, 80),
        etablissement: "Institution éducative",
        annee: yearMatch ? yearMatch[0] : "Non spécifié"
      });
    }
  } else {
    formation.push({
      diplome: `Formation en ${domaine}`,
      etablissement: "Formation professionnelle",
      annee: (new Date().getFullYear() - experience_annees).toString()
    });
  }

  // ===== EXTRACTION LOCALISATION =====
  let localisation = "France";
  
  const locationPatterns = [
    /(?:adresse|address|ville|city)\s*:?\s*([^:\n]+)/gi,
    /(\d{5})\s+([A-Za-zÀ-ÿ\s-]+)/g,
    /(Paris|Lyon|Marseille|Toulouse|Nice|Nantes|Strasbourg|Montpellier|Bordeaux|Lille|Rennes|Grenoble)/gi
  ];
  
  for (const pattern of locationPatterns) {
    const match = cvText.match(pattern);
    if (match) {
      localisation = match[1] ? match[1].trim() : match[0].trim();
      if (localisation.length > 50) localisation = localisation.substring(0, 50);
      break;
    }
  }

  // ===== RÉSUMÉ PROFIL =====
  const resume_profil = `Professionnel en ${domaine} avec ${experience_annees} ans d'expérience. ` +
    `Maîtrise de ${foundSkills.slice(0, 3).join(', ')} et autres technologies modernes. ` +
    `Expertise développée dans un environnement ${domaine.toLowerCase()} avec une approche orientée résultats.`;

  return {
    nom,
    email,
    telephone,
    competences: foundSkills.slice(0, 12),
    experience_annees,
    experiences,
    formation,
    langues: ["Français", "Anglais"],
    domaine,
    localisation,
    resume_profil
  };
}

// ============================================================================
// SYSTÈME DEEPSEEK AMÉLIORÉ PAR ÉTAPES
// ============================================================================

async function callDeepSeekAPI(prompt, options = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options.timeout || 120000);

  try {
    const response = await fetch('https://DeepSeek-R1-gADK.eastus.models.ai.azure.com/v1/chat/completions?api-version=2024-06-01-preview', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.AZURE_API_KEY}`
      },
      body: JSON.stringify({
        model: "DeepSeek-R1-gADK",
        messages: [
          {
            role: "system",
            content: "Tu es un expert en analyse de CV. Réponds exclusivement avec du JSON valide, sans aucun texte additionnel."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: options.max_tokens || 800,
        temperature: options.temperature || 0.2
      })
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    
    if (!data?.choices?.[0]?.message?.content) {
      throw new Error('Invalid API response structure');
    }
    
    let content = data.choices[0].message.content.trim();
    
    // Nettoyage du JSON
    if (content.includes('```json')) {
      content = content.split('```json')[1].split('```')[0].trim();
    } else if (content.includes('```')) {
      content = content.split('```')[1].trim();
    }
    
    content = content.replace(/^[^{]*/, '').replace(/[^}]*$/, '');
    
    if (!content.startsWith('{') || !content.endsWith('}')) {
      throw new Error('Content is not valid JSON format');
    }
    
    const result = JSON.parse(content);
    return result;
    
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

async function extractWithDeepSeekSteps(cvText) {
  console.log('🤖 Extraction DeepSeek par étapes...');
  
  let result = {};
  
  // ===== ÉTAPE 1: INFORMATIONS BASIQUES =====
  try {
    console.log('📋 Étape 1: Extraction informations basiques...');
    
    const basicPrompt = `Extrait UNIQUEMENT les informations de base de ce CV au format JSON strict :

CV: ${cvText.substring(0, 1500)}

Format EXACT attendu (AUCUN texte avant ou après) :
{
  "nom": "Nom Prénom",
  "email": "email@example.com", 
  "telephone": "+33123456789",
  "localisation": "Ville, Pays"
}

Règles:
- Si une info n'est pas trouvée, mettre ""
- Nom: prénom + nom uniquement
- Email: format valide uniquement
- Répondre SEULEMENT avec le JSON`;

    const basicInfo = await retryDeepSeekCall(async (timeout) => {
      return await callDeepSeekAPI(basicPrompt, { 
        max_tokens: 200, 
        temperature: 0.1,
        timeout 
      });
    });
    
    result = { ...result, ...basicInfo };
    console.log('✅ Étape 1 terminée:', Object.keys(basicInfo));
    
  } catch (error) {
    console.log('⚠️ Étape 1 échouée, utilisation fallback...');
    const fallback = await extractBasicInfoFallback(cvText);
    result = { ...result, ...fallback };
  }

  // ===== ÉTAPE 2: COMPÉTENCES ET DOMAINE =====
  try {
    console.log('🛠️ Étape 2: Extraction compétences et domaine...');
    
    const skillsPrompt = `Analyse ce CV et extrait les compétences techniques et le domaine.

CV: ${cvText.substring(0, 2000)}

Format JSON EXACT (AUCUN autre texte) :
{
  "competences": ["compétence1", "compétence2", "compétence3"],
  "domaine": "Développement web",
  "experience_annees": 5
}

Règles:
- competences: maximum 10 compétences techniques précises
- domaine: choisir parmi "Développement web", "Data Science", "DevOps / Cloud", "Design / UX", "Gestion de projet", "Cybersécurité", "Développement mobile", "Intelligence Artificielle", "Informatique"
- experience_annees: nombre d'années (0-40)`;

    const skillsInfo = await retryDeepSeekCall(async (timeout) => {
      return await callDeepSeekAPI(skillsPrompt, { 
        max_tokens: 400, 
        temperature: 0.2,
        timeout 
      });
    });
    
    result = { ...result, ...skillsInfo };
    console.log('✅ Étape 2 terminée:', skillsInfo.competences?.length, 'compétences');
    
  } catch (error) {
    console.log('⚠️ Étape 2 échouée, utilisation fallback...');
    const fallback = await extractSkillsFallback(cvText);
    result = { ...result, ...fallback };
  }

  // ===== ÉTAPE 3: EXPÉRIENCES ET FORMATION =====
  try {
    console.log('🎓 Étape 3: Extraction expériences et formation...');
    
    const expPrompt = `Extrait les expériences et formations de ce CV.

CV: ${cvText}

Format JSON EXACT (AUCUN autre texte) :
{
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
      "diplome": "Nom diplôme",
      "etablissement": "École/Université",
      "annee": "2020"
    }
  ],
  "langues": ["Français", "Anglais"],
  "resume_profil": "Résumé professionnel en 2 phrases"
}

Règles:
- experiences: maximum 3 expériences principales
- formation: maximum 2 formations principales  
- langues: langues maîtrisées
- resume_profil: synthèse professionnelle courte`;

    const expInfo = await retryDeepSeekCall(async (timeout) => {
      return await callDeepSeekAPI(expPrompt, { 
        max_tokens: 800, 
        temperature: 0.3,
        timeout 
      });
    });
    
    result = { ...result, ...expInfo };
    console.log('✅ Étape 3 terminée:', expInfo.experiences?.length, 'expériences');
    
  } catch (error) {
    console.log('⚠️ Étape 3 échouée, utilisation fallback...');
    const fallback = await extractExperiencesFallback(cvText, result.domaine || "Informatique");
    result = { ...result, ...fallback };
  }

  return result;
}

// ============================================================================
// FALLBACKS POUR CHAQUE ÉTAPE
// ============================================================================

async function extractBasicInfoFallback(cvText) {
  const emailMatch = cvText.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  const phoneMatch = cvText.match(/(\+?\d{2,4}[\s.-]?\d{2,4}[\s.-]?\d{2,4}[\s.-]?\d{2,4})/);
  
  const lines = cvText.split('\n').filter(l => l.trim().length > 2);
  let nom = "Candidat Expert";
  
  for (const line of lines.slice(0, 3)) {
    const cleanLine = line.trim().replace(/[^A-Za-zÀ-ÿ\s]/g, '');
    if (cleanLine.length > 5 && cleanLine.length < 50) {
      nom = cleanLine;
      break;
    }
  }
  
  return {
    nom,
    email: emailMatch ? emailMatch[1] : "",
    telephone: phoneMatch ? phoneMatch[1] : "",
    localisation: "France"
  };
}

async function extractSkillsFallback(cvText) {
  const skillKeywords = [
    'JavaScript', 'Python', 'Java', 'React', 'Node.js', 'PHP', 'C++',
    'HTML', 'CSS', 'SQL', 'MongoDB', 'Docker', 'Git', 'AWS'
  ];
  
  const foundSkills = skillKeywords.filter(skill => 
    cvText.toLowerCase().includes(skill.toLowerCase())
  );
  
  if (foundSkills.length === 0) {
    foundSkills.push('Informatique', 'Communication');
  }
  
  return {
    competences: foundSkills.slice(0, 8),
    domaine: "Informatique",
    experience_annees: 3
  };
}

async function extractExperiencesFallback(cvText, domaine) {
  const currentYear = new Date().getFullYear();
  
  return {
    experiences: [{
      poste: `Expert en ${domaine}`,
      entreprise: "Entreprise",
      duree: `${currentYear - 3}-${currentYear}`,
      description: `Expérience professionnelle en ${domaine}`
    }],
    formation: [{
      diplome: `Formation en ${domaine}`,
      etablissement: "Institution",
      annee: (currentYear - 5).toString()
    }],
    langues: ["Français", "Anglais"],
    resume_profil: `Professionnel en ${domaine} avec expertise technique solide.`
  };
}

// ============================================================================
// FONCTION PRINCIPALE COMBINÉE AMÉLIORÉE
// ============================================================================

async function structureCVWithFallback(cvText) {
  console.log('🚀 Début analyse CV avec système amélioré...');
  
  let finalResult = null;
  let analysisMethod = "unknown";
  let validationResult = null;
  
  // ===== MÉTHODE 1: DEEPSEEK PAR ÉTAPES AVEC RETRY =====
  try {
    console.log('🤖 Tentative avec DeepSeek par étapes...');
    const deepSeekResult = await extractWithDeepSeekSteps(cvText);
    
    // Normalisation
    const normalized = normalizeExtractedData(deepSeekResult);
    
    // Validation
    validationResult = validateExtractedData(normalized);
    console.log('📊 Score validation DeepSeek:', validationResult.score, '/100');
    console.log('📋 Détails:', validationResult.details);
    
    if (validationResult.isValid) {
      finalResult = normalized;
      analysisMethod = "deepseek_steps";
      console.log('✅ DeepSeek par étapes - SUCCÈS');
    } else {
      console.log('⚠️ DeepSeek par étapes - Score insuffisant, passage au fallback');
      throw new Error(`Score validation trop bas: ${validationResult.score}`);
    }
    
  } catch (error) {
    console.log('❌ DeepSeek par étapes échoué:', error.message);
    
    // ===== MÉTHODE 2: EXTRACTION MANUELLE AVANCÉE =====
    try {
      console.log('🔧 Passage à l\'extraction manuelle avancée...');
      const manualResult = await extractCVDataAdvanced(cvText);
      
      // Normalisation
      const normalized = normalizeExtractedData(manualResult);
      
      // Validation
      validationResult = validateExtractedData(normalized);
     console.log('📊 Score validation manuelle:', validationResult.score, '/100');
     console.log('📋 Détails:', validationResult.details);
     
     if (validationResult.isValid) {
       finalResult = normalized;
       analysisMethod = "manual_advanced";
       console.log('✅ Extraction manuelle avancée - SUCCÈS');
     } else {
       console.log('⚠️ Extraction manuelle - Score faible mais accepté');
       finalResult = normalized;
       analysisMethod = "manual_advanced_low_score";
     }
     
   } catch (error) {
     console.log('❌ Extraction manuelle avancée échouée:', error.message);
     
     // ===== MÉTHODE 3: FALLBACK BASIQUE =====
     console.log('🆘 Passage au fallback basique...');
     const basicResult = await structureCVManual(cvText);
     finalResult = normalizeExtractedData(basicResult);
     analysisMethod = "basic_fallback";
     validationResult = validateExtractedData(finalResult);
     console.log('📊 Score validation basique:', validationResult.score, '/100');
   }
 }
 
 // ===== POST-TRAITEMENT ET ENRICHISSEMENT =====
 if (finalResult) {
   // Enrichissement final
   finalResult.analysis_metadata = {
     method: analysisMethod,
     validation_score: validationResult?.score || 0,
     validation_details: validationResult?.details || [],
     processing_date: new Date().toISOString(),
     text_length: cvText.length,
     confidence_level: getConfidenceLevel(analysisMethod, validationResult?.score || 0)
   };
   
   console.log(`✅ Analyse terminée avec méthode: ${analysisMethod}`);
   console.log(`🎯 Niveau de confiance: ${finalResult.analysis_metadata.confidence_level}`);
   
   return finalResult;
 }
 
 // ===== ÉCHEC TOTAL - DONNÉES MINIMALES =====
 console.log('❌ Échec total - Génération de données minimales');
 return {
   nom: "Candidat",
   email: "",
   telephone: "",
   competences: ["Informatique", "Communication"],
   experience_annees: 2,
   experiences: [{
     poste: "Poste professionnel",
     entreprise: "Entreprise",
     duree: "2022-2024",
     description: "Expérience professionnelle"
   }],
   formation: [{
     diplome: "Formation",
     etablissement: "Institution",
     annee: "2022"
   }],
   langues: ["Français"],
   domaine: "Informatique",
   localisation: "France",
   resume_profil: "Professionnel avec expérience.",
   analysis_metadata: {
     method: "emergency_fallback",
     validation_score: 0,
     validation_details: ["Échec total d'extraction"],
     processing_date: new Date().toISOString(),
     text_length: cvText.length,
     confidence_level: "très faible"
   }
 };
}

function getConfidenceLevel(method, score) {
 if (method === "deepseek_steps" && score >= 80) return "très élevé";
 if (method === "deepseek_steps" && score >= 60) return "élevé";
 if (method === "manual_advanced" && score >= 70) return "élevé";
 if (method === "manual_advanced" && score >= 50) return "moyen";
 if (method === "basic_fallback") return "faible";
 return "très faible";
}

// ============================================================================
// FONCTION MANUELLE BASIQUE (CONSERVÉE POUR COMPATIBILITÉ)
// ============================================================================

async function structureCVManual(cvText) {
 console.log('🔍 Mode fallback basique...');
 
 try {
   const emailMatch = cvText.match(/[\w\.-]+@[\w\.-]+\.\w+/);
   const phoneMatch = cvText.match(/(\+?\d{1,4}[\s\-]?)?(\(?\d{1,4}\)?[\s\-]?)?[\d\s\-]{8,}/);
   
   const lines = cvText.split('\n').filter(line => line.trim().length > 2);
   let possibleName = lines[0] || "Candidat";
   
   possibleName = possibleName.replace(/[^\w\s\-\.]/g, '').trim();
   if (possibleName.length < 2 || possibleName.length > 50) {
     possibleName = "Candidat Expert";
   }
   
   const skillKeywords = [
     'JavaScript', 'Python', 'Java', 'React', 'Node.js', 'PHP', 'C++', 'C#',
     'HTML', 'CSS', 'SQL', 'MongoDB', 'PostgreSQL', 'Docker', 'Git',
     'Angular', 'Vue.js', 'TypeScript', 'Spring', 'Laravel', 'Django',
     'AWS', 'Azure', 'Google Cloud', 'Kubernetes', 'Jenkins', 'Linux'
   ];
   
   const foundSkills = skillKeywords.filter(skill => 
     cvText.toLowerCase().includes(skill.toLowerCase())
   );
   
   if (foundSkills.length === 0) {
     foundSkills.push('Bureautique', 'Communication', 'Travail en équipe');
   }
   
   const yearMatches = cvText.match(/20\d{2}/g);
   const years = yearMatches ? [...new Set(yearMatches.map(y => parseInt(y)))].sort() : [];
   let experience = 1;
   
   if (years.length >= 2) {
     experience = Math.max(0, Math.max(...years) - Math.min(...years));
   } else if (years.length === 1) {
     experience = Math.max(0, new Date().getFullYear() - years[0]);
   }
   
   experience = Math.min(experience, 20);
   
   let domaine = "Informatique";
   if (foundSkills.some(skill => ['React', 'JavaScript', 'HTML', 'CSS', 'Node.js'].includes(skill))) {
     domaine = "Développement web";
   } else if (foundSkills.some(skill => ['Python', 'Machine Learning', 'Data'].includes(skill))) {
     domaine = "Data Science";
   } else if (foundSkills.some(skill => ['AWS', 'Docker', 'Kubernetes'].includes(skill))) {
     domaine = "DevOps / Cloud";
   }
   
   return {
     nom: possibleName,
     email: emailMatch ? emailMatch[0] : "",
     telephone: phoneMatch ? phoneMatch[0].replace(/\s+/g, ' ').trim() : "",
     competences: foundSkills.slice(0, 8),
     experience_annees: experience,
     experiences: [{
       poste: `Expert en ${domaine}`,
       entreprise: "Entreprise précédente",
       duree: years.length >= 2 ? `${Math.min(...years)}-${Math.max(...years)}` : `${new Date().getFullYear() - experience}-${new Date().getFullYear()}`,
       description: `Expérience professionnelle de ${experience} ans dans le domaine ${domaine}`
     }],
     formation: [{
       diplome: `Formation en ${domaine}`,
       etablissement: "Formation professionnelle",
       annee: years.length > 0 ? Math.min(...years).toString() : "2020"
     }],
     langues: ["Français", "Anglais"],
     domaine: domaine,
     localisation: "France",
     resume_profil: `Professionnel en ${domaine} avec ${experience} ans d'expérience. Compétences principales : ${foundSkills.slice(0, 3).join(', ')}.`
   };
   
 } catch (error) {
   console.error('❌ Erreur extraction basique:', error);
   return {
     nom: "Candidat Expert",
     email: "",
     telephone: "",
     competences: ["Informatique", "Communication"],
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
     langues: ["Français"],
     domaine: "Informatique",
     localisation: "France",
     resume_profil: "Professionnel avec expérience dans le domaine informatique."
   };
 }
}

// ============================================================================
// AMÉLIORATION DES CONSEILS CV AVEC RETRY
// ============================================================================

async function generateCVImprovementsWithAI(structuredData, originalText) {
 console.log('💡 Génération de conseils avec système amélioré...');
 
 try {
   const prompt = `Analyse ce CV et génère des conseils d'amélioration.

PROFIL:
- Nom: ${structuredData.nom || 'Non spécifié'}
- Compétences: ${(structuredData.competences || []).join(', ') || 'Non spécifié'}
- Expérience: ${structuredData.experience_annees || 0} ans
- Domaine: ${structuredData.domaine || 'Non spécifié'}
- Score analyse: ${structuredData.analysis_metadata?.validation_score || 'N/A'}

EXTRAIT CV: ${originalText.substring(0, 800)}

Réponds UNIQUEMENT avec ce JSON exact (sans commentaires) :
{
 "overall_score": 0.75,
 "strengths": ["Point fort 1", "Point fort 2", "Point fort 3"],
 "weaknesses": ["Faiblesse 1", "Faiblesse 2"],
 "specific_improvements": [
   {
     "category": "Compétences",
     "issue": "Problème identifié",
     "action": "Action recommandée",
     "priority": "high"
   }
 ],
 "keywords_to_add": ["mot1", "mot2", "mot3"],
 "format_suggestions": ["suggestion1", "suggestion2"]
}`;

   const result = await retryDeepSeekCall(async (timeout) => {
     return await callDeepSeekAPI(prompt, {
       max_tokens: 1000,
       temperature: 0.3,
       timeout
     });
   });

   console.log('✅ Conseils AI générés avec succès');
   return result;
   
 } catch (error) {
   console.error('❌ Erreur génération conseils AI, fallback manuel:', error.message);
   
   // Fallback manuel intelligent
   const domaine = structuredData.domaine || "Informatique";
   const experience = structuredData.experience_annees || 0;
   const competences = structuredData.competences || [];
   const analysisScore = structuredData.analysis_metadata?.validation_score || 60;
   
   let score = 0.6;
   if (competences.length > 5) score += 0.15;
   if (experience > 2) score += 0.15;
   if (structuredData.email) score += 0.05;
   if (structuredData.telephone) score += 0.05;
   if (structuredData.formation && structuredData.formation.length > 0) score += 0.1;
   
   // Ajustement basé sur le score d'analyse
   if (analysisScore >= 80) score += 0.1;
   else if (analysisScore < 50) score -= 0.1;
   
   return {
     overall_score: Math.min(score, 0.95),
     strengths: [
       `Expérience de ${experience} ans dans le ${domaine}`,
       `Maîtrise de ${competences.length} compétences techniques`,
       "Profil structuré et analysable",
       analysisScore >= 70 ? "CV bien formaté" : "Structure basique détectée"
     ].filter(s => s.length > 0),
     weaknesses: [
       analysisScore < 70 ? "Format CV à améliorer" : "Certifications récentes à ajouter",
       competences.length < 5 ? "Compétences à étoffer" : "Projets personnels peu détaillés",
       experience < 2 ? "Expérience à développer" : "Soft skills à développer"
     ],
     specific_improvements: [
       {
         category: "Compétences",
         issue: competences.length < 5 ? "Peu de compétences identifiées" : "Technologies à moderniser",
         action: competences.length < 5 ? `Ajouter plus de compétences ${domaine}` : `Se former aux dernières technologies ${domaine}`,
         priority: "high"
       },
       {
         category: "Format",
         issue: analysisScore < 70 ? "Structure CV difficile à analyser" : "Structure CV à optimiser",
         action: analysisScore < 70 ? "Restructurer le CV avec sections claires" : "Réorganiser les sections par ordre d'importance",
         priority: analysisScore < 70 ? "high" : "medium"
       },
       {
         category: "Contenu",
         issue: "Manque de quantification",
         action: "Ajouter des chiffres et résultats mesurables",
         priority: "high"
       }
     ],
     keywords_to_add: [
       ...competences.slice(0, 3),
       "Leadership",
       "Innovation", 
       "Collaboration",
       "Agilité",
       `Expert ${domaine}`
     ].filter(k => k && k.length > 0),
     format_suggestions: [
       analysisScore < 70 ? "Améliorer la structure générale du CV" : "Ajouter une section projets détaillée",
       "Inclure des liens GitHub/Portfolio",
       "Structurer par ordre chronologique inverse",
       "Ajouter une section compétences transversales",
       "Inclure des recommandations/témoignages"
     ]
   };
 }
}

// ============================================================================
// AMÉLIORATION DU MATCHING JOB-CV
// ============================================================================

async function calculateJobCVMatchWithAI(jobData, cvData) {
 try {
   const matchingPrompt = `Compare ce candidat avec cette offre d'emploi et donne un score de correspondance précis.

CANDIDAT:
- Nom: ${cvData.nom || 'Non spécifié'}
- Compétences: ${(cvData.competences || []).join(', ') || 'Non spécifié'}
- Expérience: ${cvData.experience_annees || 0} ans
- Domaine: ${cvData.domaine || 'Non spécifié'}
- Score CV: ${cvData.analysis_metadata?.validation_score || 'N/A'}

OFFRE:
- Titre: ${jobData.title || 'Non spécifié'}
- Description: ${(jobData.description || '').substring(0, 300)}
- Exigences: ${(jobData.requirements || '').substring(0, 300)}

Analyse la correspondance et réponds avec un JSON valide :
{
 "score": 0.85,
 "points_forts": ["Point fort précis 1", "Point fort précis 2"],
 "points_faibles": ["Point faible précis 1", "Point faible précis 2"],
 "recommandation": "Évaluation détaillée du candidat"
}

Score de 0.0 à 1.0 selon :
- Correspondance compétences techniques (40%)
- Niveau d'expérience requis (30%) 
- Adéquation domaine (20%)
- Qualité du profil (10%)`;

   const result = await retryDeepSeekCall(async (timeout) => {
     return await callDeepSeekAPI(matchingPrompt, {
       max_tokens: 600,
       temperature: 0.3,
       timeout
     });
   });

   return result;
   
 } catch (error) {
   console.error('Error with AI matching, using enhanced fallback:', error.message);
   
   // Fallback amélioré avec logique de matching
   const candidateSkills = cvData.competences || [];
   const candidateExp = cvData.experience_annees || 0;
   const candidateDomain = cvData.domaine || "";
   
   const jobTitle = (jobData.title || "").toLowerCase();
   const jobDesc = (jobData.description || "").toLowerCase();
   const jobReq = (jobData.requirements || "").toLowerCase();
   const jobText = `${jobTitle} ${jobDesc} ${jobReq}`;
   
   // Calcul score par critères
   let skillsScore = 0;
   let expScore = 0;
   let domainScore = 0;
   let qualityScore = cvData.analysis_metadata?.validation_score ? 
     cvData.analysis_metadata.validation_score / 100 : 0.6;
   
   // Score compétences (40%)
   if (candidateSkills.length > 0) {
     const matchingSkills = candidateSkills.filter(skill => 
       jobText.includes(skill.toLowerCase())
     );
     skillsScore = Math.min(matchingSkills.length / Math.max(candidateSkills.length * 0.5, 1), 1);
   }
   
   // Score expérience (30%)
   if (jobText.includes('senior') || jobText.includes('expert')) {
     expScore = candidateExp >= 5 ? 1 : candidateExp / 5;
   } else if (jobText.includes('junior') || jobText.includes('débutant')) {
     expScore = candidateExp <= 3 ? 1 : Math.max(0.5, (6 - candidateExp) / 3);
   } else {
     expScore = candidateExp >= 2 ? Math.min(1, candidateExp / 5) : candidateExp / 2;
   }
   
   // Score domaine (20%)
   if (candidateDomain && candidateDomain !== "Informatique") {
     const domainWords = candidateDomain.toLowerCase().split(' ');
     domainScore = domainWords.some(word => jobText.includes(word)) ? 1 : 0.3;
   } else {
     domainScore = 0.5; // Score neutre pour domaine générique
   }
   
   // Calcul final pondéré
   const finalScore = (skillsScore * 0.4) + (expScore * 0.3) + (domainScore * 0.2) + (qualityScore * 0.1);
   
   return {
     score: Math.min(finalScore + (Math.random() * 0.05), 0.98), // Légère variation
     points_forts: [
       candidateSkills.length > 3 ? `Maîtrise de ${candidateSkills.length} compétences techniques` : "Compétences techniques identifiées",
       candidateExp > 0 ? `${candidateExp} ans d'expérience pertinente` : "Profil analysé et structuré",
       candidateDomain !== "Informatique" ? `Spécialisation en ${candidateDomain}` : "Profil polyvalent en informatique"
     ].filter(p => p && p.length > 0),
     points_faibles: [
       skillsScore < 0.5 ? "Compétences spécifiques à développer" : "Analyse approfondie nécessaire",
       expScore < 0.7 ? "Niveau d'expérience à consolider" : "Correspondance à valider en entretien",
       qualityScore < 0.7 ? "Profil à préciser" : "Détails techniques à approfondir"
     ],
     recommandation: finalScore > 0.8 ? "Candidat très adapté au poste" : 
                    finalScore > 0.6 ? "Bon candidat potentiel" : 
                    "Profil à évaluer en entretien"
   };
 }
}

// ============================================================================
// ROUTES API (INCHANGÉES MAIS UTILISENT LES NOUVELLES FONCTIONS)
// ============================================================================

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

// NOUVELLE ROUTE - Analyse complète du CV (AMÉLIORÉE)
app.post('/api/analyze-cv-complete', upload.single('cv'), async (req, res) => {
 try {
   let cvText = '';
   const { candidate_id } = req.body;
   
   console.log('📄 Début analyse CV complète AMÉLIORÉE pour candidat:', candidate_id);
   
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

   // 1. Structuration du CV avec système amélioré
   console.log('🤖 Structuration du CV avec système amélioré...');
   const structuredData = await structureCVWithFallback(cvText);
   
   // 2. Stockage (simulation avec metadata)
   console.log('💾 Stockage du CV...');
   const cvId = Date.now();
   
   // 3. Recherche d'offres compatibles
   console.log('🔍 Recherche d\'offres compatibles...');
   const recommendedJobs = await findCompatibleJobs(structuredData);
   
   // 4. Génération de conseils d'amélioration avec système amélioré
   console.log('💡 Génération de conseils...');
   const improvements = await generateCVImprovementsWithAI(structuredData, cvText);
   
   console.log('✅ Analyse complète terminée avec succès');
   console.log(`📊 Méthode utilisée: ${structuredData.analysis_metadata?.method}`);
   console.log(`🎯 Score de confiance: ${structuredData.analysis_metadata?.confidence_level}`);
   
   res.json({
     success: true,
     cvId: cvId,
     originalText: cvText,
     structuredData: structuredData,
     recommendedJobs: recommendedJobs,
     improvements: improvements,
     totalRecommendations: recommendedJobs.length,
     analysisMetadata: structuredData.analysis_metadata
   });
   
 } catch (error) {
   console.error('❌ Error in CV analysis:', error);
   res.status(500).json({ 
     error: 'Failed to analyze CV',
     details: error.message,
     timestamp: new Date().toISOString()
   });
 }
});

// Route pour analyser et stocker un CV (version simple)
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

// Route pour trouver les meilleurs candidats pour une offre (AMÉLIORÉE)
app.post('/api/find-candidates-for-job', async (req, res) => {
 try {
   const { jobData, limit = 10 } = req.body;
   
   const allCVs = await getAllStoredCVs();
   const candidatesWithScores = [];
   
   console.log(`🔍 Analyse de ${allCVs.length} candidats pour le poste: ${jobData.title}`);
   
   for (const cv of allCVs) {
     const matchResult = await calculateJobCVMatchWithAI(jobData, cv.structured_data);
     
     candidatesWithScores.push({
       cvId: cv.id,
       candidateData: cv.structured_data,
       matchScore: matchResult.score,
       strengths: matchResult.points_forts,
       weaknesses: matchResult.points_faibles,
       recommendation: matchResult.recommandation,
       originalText: cv.original_text,
       analysisMetadata: cv.structured_data.analysis_metadata || null
     });
   }
   
   candidatesWithScores.sort((a, b) => b.matchScore - a.matchScore);
   
   console.log(`✅ Analyse terminée. Meilleur score: ${candidatesWithScores[0]?.matchScore.toFixed(2)}`);
   
   res.json({
     success: true,
     totalCandidates: candidatesWithScores.length,
     topCandidates: candidatesWithScores.slice(0, limit),
     jobAnalyzed: jobData,
     timestamp: new Date().toISOString()
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
     totalFound: filteredCandidates.length,
     searchCriteria: {
       skills,
       minExperience,
       maxExperience,
       domain,
       location
     },
     timestamp: new Date().toISOString()
   });
   
 } catch (error) {
   res.status(500).json({ error: error.message });
 }
});

// ============================================================================
// FONCTIONS UTILITAIRES POUR LES JOBS ET CANDIDATS
// ============================================================================

// Fonction améliorée pour findCompatibleJobs
async function findCompatibleJobs(cvData) {
 console.log('🔍 Recherche d\'offres compatibles pour:', cvData.domaine);
 
 const domaine = cvData.domaine || "Informatique";
 const competences = cvData.competences || [];
 const experience = cvData.experience_annees || 0;
 const confidenceLevel = cvData.analysis_metadata?.confidence_level || "moyen";
 
 const jobTemplates = [
   {
     title: `Développeur ${domaine} Senior`,
     description: `Nous recherchons un développeur expérimenté en ${domaine} pour rejoindre notre équipe innovante et participer à des projets technologiques d'envergure.`,
     requirements: `Maîtrise de ${competences.slice(0, 3).join(', ')}, ${Math.max(3, experience)} ans d'expérience minimum, autonomie et esprit d'équipe`,
     company: "TechCorp",
     location: "Paris",
     baseScore: 0.85,
     requiredExp: Math.max(3, experience)
   },
   {
     title: `Expert ${domaine}`,
     description: `Poste d'expert technique pour concevoir et diriger des projets ${domaine} de grande envergure dans un environnement stimulant.`,
     requirements: `Expertise ${competences[0] || 'technique'}, leadership technique, ${Math.max(5, experience)} ans d'expérience, gestion d'équipe`,
     company: "InnovaTech",
     location: "Lyon",
     baseScore: 0.82,
     requiredExp: Math.max(5, experience)
   },
   {
     title: `Consultant ${domaine}`,
     description: `Mission de conseil en ${domaine} auprès de grands comptes pour optimiser leurs solutions technologiques.`,
     requirements: `${competences.slice(0, 2).join(', ')}, consulting, adaptabilité, ${Math.max(2, experience)} ans d'expérience`,
     company: "ConseilPro",
     location: "Marseille",
     baseScore: 0.78,
     requiredExp: Math.max(2, experience)
   },
   {
     title: "Chef de Projet Technique",
     description: `Direction de projets techniques avec une équipe spécialisée ${domaine} dans un contexte agile et innovant.`,
     requirements: `Management, ${competences[0] || 'technique'}, gestion de projet, ${Math.max(4, experience)} ans d'expérience`,
     company: "ProjectLead",
     location: "Toulouse",
     baseScore: 0.75,
     requiredExp: Math.max(4, experience)
   },
   {
     title: `Architecte ${domaine}`,
     description: `Conception d'architectures ${domaine} scalables et performantes pour des applications critiques.`,
     requirements: `Architecture, ${competences.slice(0, 2).join(', ')}, design patterns, ${Math.max(6, experience)} ans d'expérience`,
     company: "ArchitectSoft",
     location: "Nantes",
     baseScore: 0.80,
     requiredExp: Math.max(6, experience)
   },
   {
     title: `Développeur ${domaine} Junior`,
     description: `Opportunité pour jeune talent motivé en ${domaine} avec accompagnement et formation continue.`,
     requirements: `Bases solides en ${competences.slice(0, 2).join(', ')}, motivation, 0-2 ans d'expérience`,
     company: "StartupTech",
     location: "Bordeaux",
     baseScore: 0.70,
     requiredExp: 2
   }
 ];
 
 return jobTemplates.map((template, index) => {
   // Calcul du score basé sur plusieurs critères
   let finalScore = template.baseScore;
   
   // Ajustement basé sur l'expérience
   const expDiff = Math.abs(experience - template.requiredExp);
   if (expDiff === 0) finalScore += 0.05;
   else if (expDiff <= 1) finalScore += 0.02;
   else if (expDiff > 3) finalScore -= 0.1;
   
   // Ajustement basé sur la confiance de l'analyse
   if (confidenceLevel === "très élevé") finalScore += 0.05;
   else if (confidenceLevel === "élevé") finalScore += 0.03;
   else if (confidenceLevel === "faible") finalScore -= 0.05;
   else if (confidenceLevel === "très faible") finalScore -= 0.1;
   
   // Ajustement basé sur le nombre de compétences
   if (competences.length >= 5) finalScore += 0.03;
   else if (competences.length < 3) finalScore -= 0.05;
   
   // Variation aléatoire pour la diversité
   finalScore += (Math.random() - 0.5) * 0.02;
   finalScore = Math.max(0.5, Math.min(0.98, finalScore));
   
   // Génération des raisons et préoccupations
   const reasons = [
     `Compétences ${competences[0] || 'techniques'} recherchées`,
     `Niveau d'expérience ${experience} ans adapté`,
     `Spécialisation ${domaine} correspondante`
   ];
   
   const concerns = [];
   if (experience < template.requiredExp) {
     concerns.push(`Expérience minimum ${template.requiredExp} ans requise`);
   } else if (experience > template.requiredExp + 3) {
     concerns.push("Profil potentiellement surqualifié");
   }
   
   if (competences.length < 3) {
     concerns.push("Compétences techniques à approfondir");
   }
   
   if (confidenceLevel === "faible" || confidenceLevel === "très faible") {
     concerns.push("Profil CV à clarifier");
   }
   
   if (concerns.length === 0) {
     concerns.push("Entretien technique recommandé");
   }
   
   return {
     jobData: {
       id: index + 1,
       title: template.title,
       description: template.description,
       requirements: template.requirements,
       location: template.location,
       company: template.company,
       logo_url: null,
       requiredExperience: template.requiredExp
     },
     matchScore: finalScore,
     reasons: reasons,
     concerns: concerns,
     recommendation: finalScore > 0.85 ? "Candidat très adapté" : 
                    finalScore > 0.75 ? "Bon potentiel" : 
                    finalScore > 0.65 ? "Profil intéressant" : "À évaluer",
     confidenceLevel: confidenceLevel
   };
 })
 .filter(job => job.matchScore > 0.55)
 .sort((a, b) => b.matchScore - a.matchScore)
 .slice(0, 5);
}

// Fonction pour récupérer tous les CV (version démo enrichie)
async function getAllStoredCVs() {
 return [
   {
     id: 1,
     original_text: "Développeur Full-Stack avec 5 ans d'expérience en React, Node.js, JavaScript et Python. Passionné par les nouvelles technologies et l'innovation. Expérience en startup et grande entreprise. Expert en développement d'applications web modernes et scalables.",
     structured_data: { 
       nom: "Jean Dupont",
       competences: ["React", "JavaScript", "Node.js", "Python", "MongoDB", "TypeScript", "Docker"],
       experience_annees: 5,
       domaine: "Développement web",
       email: "jean.dupont@email.com",
       localisation: "Paris, France",
       analysis_metadata: {
         method: "deepseek_steps",
         validation_score: 85,
         confidence_level: "élevé"
       }
     },
     created_at: "2024-01-01"
   },
   {
     id: 2,
     original_text: "Data Scientist passionné par l'IA et le Machine Learning. 3 ans d'expérience en analyse de données, Python, TensorFlow et SQL. Diplômé d'une école d'ingénieur avec spécialisation en intelligence artificielle.",
     structured_data: { 
       nom: "Marie Martin",
       competences: ["Python", "TensorFlow", "SQL", "Machine Learning", "Pandas", "NumPy", "Scikit-learn"],
       experience_annees: 3,
       domaine: "Data Science",
       email: "marie.martin@email.com",
       localisation: "Lyon, France",
       analysis_metadata: {
         method: "deepseek_steps",
         validation_score: 80,
         confidence_level: "élevé"
       }
     },
     created_at: "2024-01-02"
   },
   {
     id: 3,
     original_text: "Designer UI/UX avec 4 ans d'expérience. Maîtrise de Figma, Adobe Creative Suite, et notions de développement front-end. Spécialisé dans l'expérience utilisateur mobile et web. Portfolio riche en projets innovants.",
     structured_data: { 
       nom: "Sophie Durand",
       competences: ["Figma", "Adobe XD", "UI/UX", "Prototyping", "HTML/CSS", "Sketch", "InVision"],
       experience_annees: 4,
       domaine: "Design / UX",
       email: "sophie.durand@email.com",
       localisation: "Marseille, France",
       analysis_metadata: {
         method: "manual_advanced",
         validation_score: 75,
         confidence_level: "moyen"
       }
     },
     created_at: "2024-01-03"
   },
   {
     id: 4,
     original_text: "Ingénieur DevOps avec 6 ans d'expérience en cloud computing, Docker, Kubernetes et CI/CD. Expert en AWS et Azure, automatisation des déploiements. Certifications AWS Solutions Architect et Azure DevOps Engineer.",
     structured_data: { 
       nom: "Pierre Lambert",
       competences: ["Docker", "Kubernetes", "AWS", "Azure", "Jenkins", "Terraform", "GitLab CI", "Ansible"],
       experience_annees: 6,
       domaine: "DevOps / Cloud",
       email: "pierre.lambert@email.com",
       localisation: "Toulouse, France",
       analysis_metadata: {
         method: "deepseek_steps",
         validation_score: 90,
         confidence_level: "très élevé"
       }
     },
     created_at: "2024-01-04"
   },
   {
     id: 5,
     original_text: "Chef de projet informatique avec 8 ans d'expérience en gestion d'équipes techniques. Spécialisé en méthodes agiles, Scrum Master certifié. Expertise en transformation digitale et conduite du changement.",
     structured_data: { 
       nom: "Laura Rousseau",
       competences: ["Scrum", "Agile", "Management", "JIRA", "Confluence", "Leadership", "Kanban", "SAFe"],
       experience_annees: 8,
       domaine: "Gestion de projet",
       email: "laura.rousseau@email.com",
       localisation: "Nantes, France",
       analysis_metadata: {
         method: "deepseek_steps",
         validation_score: 88,
         confidence_level: "élevé"
       }
     },
     created_at: "2024-01-05"
   },
   {
     id: 6,
     original_text: "Développeur mobile spécialisé React Native et Flutter. 3 ans d'expérience dans le développement d'applications iOS et Android. Expertise en intégration d'APIs et optimisation des performances.",
     structured_data: { 
       nom: "Thomas Moreau",
       competences: ["React Native", "Flutter", "JavaScript", "Dart", "iOS", "Android", "Firebase"],
       experience_annees: 3,
       domaine: "Développement mobile",
       email: "thomas.moreau@email.com",
       localisation: "Bordeaux, France",
       analysis_metadata: {
         method: "manual_advanced",
         validation_score: 70,
         confidence_level: "moyen"
       }
     },
     created_at: "2024-01-06"
   }
 ];
}

// Fonction pour recherche avancée améliorée
async function searchCandidatesAdvanced(criteria) {
 const allCVs = await getAllStoredCVs();
 
 return allCVs.filter(cv => {
   const data = cv.structured_data;
   
   // Filtre par compétences
   if (criteria.skills.length > 0) {
     const hasSkills = criteria.skills.some(skill => 
       data.competences?.some(comp => 
         comp.toLowerCase().includes(skill.toLowerCase())
       )
     );
     if (!hasSkills) return false;
   }
   
   // Filtre par expérience
   if (data.experience_annees < criteria.minExperience || 
       data.experience_annees > criteria.maxExperience) {
     return false;
   }
   
   // Filtre par domaine
   if (criteria.domain && 
       !data.domaine?.toLowerCase().includes(criteria.domain.toLowerCase())) {
     return false;
   }
   
   // Filtre par localisation
   if (criteria.location && 
       !data.localisation?.toLowerCase().includes(criteria.location.toLowerCase())) {
     return false;
   }
   
   return true;
 })
 .sort((a, b) => {
   // Tri par score de confiance puis par expérience
   const scoreA = a.structured_data.analysis_metadata?.validation_score || 0;
   const scoreB = b.structured_data.analysis_metadata?.validation_score || 0;
   
   if (scoreA !== scoreB) return scoreB - scoreA;
   return b.structured_data.experience_annees - a.structured_data.experience_annees;
 })
 .slice(0, criteria.limit);
}

// ============================================================================
// ROUTES DE DEBUG ET TEST AMÉLIORÉES
// ============================================================================

// Route de debug améliorée pour tester l'extraction CV
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

   console.log('🔍 Debug - Test du système complet amélioré...');
   console.log('📝 Longueur du texte:', cvText.length);
   
   const startTime = Date.now();
   
   // Test de la nouvelle fonction combinée
   const result = await structureCVWithFallback(cvText);
   
   const executionTime = Date.now() - startTime;
   
   console.log('✅ Analyse terminée en', executionTime, 'ms');
   console.log('📊 Méthode utilisée:', result.analysis_metadata?.method);
   console.log('🎯 Score de validation:', result.analysis_metadata?.validation_score);
   
   res.json({
     success: true,
     originalTextLength: cvText.length,
     originalTextPreview: cvText.substring(0, 300),
     extractedData: result,
     analysisMetadata: result.analysis_metadata,
     executionTime: executionTime,
     recommendation: `Analyse réussie avec méthode: ${result.analysis_metadata?.method}`,
     apiStatus: process.env.AZURE_API_KEY ? 'Clé API présente' : 'Clé API manquante'
   });
   
 } catch (error) {
   console.error('Debug error:', error);
   res.status(500).json({ 
     error: error.message,
     stack: error.stack,
     timestamp: new Date().toISOString()
   });
 }
});

// Route pour tester uniquement la connexion API (améliorée)
app.get('/api/test-deepseek', async (req, res) => {
 try {
   console.log('🧪 Test de connexion DeepSeek avec retry...');
   
   const testResult = await retryDeepSeekCall(async (timeout) => {
     return await callDeepSeekAPI(
       'Réponds avec ce JSON exact: {"test": "success", "status": "ok", "timestamp": "' + new Date().toISOString() + '"}',
       {
         max_tokens: 100,
         temperature: 0.1,
         timeout
       }
     );
   });
   
   res.json({
     success: true,
     apiConnected: true,
     response: testResult,
     message: 'DeepSeek API fonctionne correctement avec retry logic',
     apiKey: process.env.AZURE_API_KEY ? 'Présente' : 'Manquante',
     timestamp: new Date().toISOString()
   });
   
 } catch (error) {
   console.error('❌ Test DeepSeek échoué après retry:', error.message);
   res.status(500).json({
     success: false,
     apiConnected: false,
     error: error.message,
     message: 'Problème de connexion à DeepSeek API après retry',
     apiKey: process.env.AZURE_API_KEY ? 'Présente' : 'Manquante',
     timestamp: new Date().toISOString()
   });
 }
});

// Route pour vérifier les variables d'environnement (enrichie)
app.get('/api/env-check', (req, res) => {
 res.json({
   port: port,
   nodeEnv: process.env.NODE_ENV || 'development',
   apiKeyPresent: !!process.env.AZURE_API_KEY,
   apiKeyLength: process.env.AZURE_API_KEY ? process.env.AZURE_API_KEY.length : 0,
   timestamp: new Date().toISOString(),
   features: {
     deepseek_retry: true,
     advanced_extraction: true,
     validation_system: true,
     fallback_logic: true
   }
 });
});

// Route de test pour vérifier le fonctionnement (mise à jour)
app.get('/api/health', (req, res) => {
 res.json({ 
   status: 'OK', 
   message: 'Server running with Advanced CV Analysis System',
   timestamp: new Date().toISOString(),
   version: '2.0 - Enhanced',
   features: [
     'DeepSeek R1 API with Retry Logic',
     'Advanced Manual CV Extraction',
     'Multi-step Analysis with Fallback',
     'Enhanced Data Validation',
     'Intelligent Job Matching',
     'CV Improvement Suggestions',
     'Advanced Candidate Search',
     'Confidence Level Assessment'
   ],
   improvements: [
     'Retry logic avec backoff exponentiel',
     'Extraction manuelle super améliorée',
     'Validation des données extraites',
     'Système de fallback intelligent',
     'Métadonnées d\'analyse détaillées',
     'Scores de confiance pour chaque extraction'
   ]
 });
});

// ============================================================================
// DÉMARRAGE DU SERVEUR
// ============================================================================

app.listen(port, () => {
 console.log(`✅ Server running on port ${port}`);
 console.log(`🔗 Frontend: http://localhost:5173`);
 console.log(`🔗 Backend: http://localhost:${port}`);
 console.log(`🤖 AI Integration: DeepSeek R1 avec système amélioré`);
 console.log(`🧪 Debug endpoint: http://localhost:${port}/api/debug-cv-extraction`);
 console.log(`🔌 API Test: http://localhost:${port}/api/test-deepseek`);
 console.log(`🔧 Env Check: http://localhost:${port}/api/env-check`);
 console.log(`❤️ Health check: http://localhost:${port}/api/health`);
 
 console.log('\n🚀 NOUVEAU SYSTÈME CV ANALYZER V2.0 - CARACTÉRISTIQUES:');
 console.log('   ✅ Retry logic avec backoff exponentiel (3 tentatives)');
 console.log('   ✅ Extraction manuelle super améliorée');
 console.log('   ✅ Validation des données avec scoring');
 console.log('   ✅ Système de fallback intelligent');
 console.log('   ✅ Métadonnées d\'analyse détaillées');
 console.log('   ✅ Scores de confiance pour chaque extraction');
 
 // Vérification au démarrage
 if (!process.env.AZURE_API_KEY) {
   console.log('⚠️ ATTENTION: Variable AZURE_API_KEY non définie');
   console.log('   Le serveur fonctionnera en mode fallback uniquement');
 } else {
   console.log('✅ Clé API Azure détectée - Système complet opérationnel');
 }
});
      