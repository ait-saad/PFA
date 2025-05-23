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
   
    // Prompt amélioré pour un texte plus organisé et professionnel
    const prompt = `You are a professional HR specialist. Create a clean, well-structured job description for a "${title}" position.

Requirements to include: ${requirements}

${companyInfo ? `Company context: ${companyInfo}` : ''}

Please format the response with clear sections using this structure:

## Job Overview
[Write a brief, engaging introduction about the role and its importance]

## Key Responsibilities
- [List 4-5 main responsibilities using bullet points]
- [Focus on what the person will actually do day-to-day]
- [Use action verbs and be specific]

## Required Qualifications
- [List essential skills and experience]
- [Include education requirements if relevant]
- [Mention years of experience needed]

## Preferred Skills
- [List nice-to-have skills]
- [Additional technologies or certifications]

## What We Offer
- Competitive salary package
- Professional development opportunities
- Flexible working arrangements
- Health and wellness benefits

Keep the language professional, clear, and engaging. Avoid special characters, excessive formatting, or overly complex sentences. Use simple bullet points with hyphens (-) only.`;

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
            content: "You are an expert HR professional who creates clear, well-structured job descriptions. Always use clean formatting with simple markdown headers (##) and bullet points (-). Avoid special characters, emojis, or complex formatting."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 1000,
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
    
    // Nettoyer le texte généré
    let generatedText = data.choices[0].message.content.trim();
    
    // Supprimer les caractères indésirables et normaliser
    generatedText = generatedText
      .replace(/[""'']/g, '"')  // Remplacer les guillemets fantaisistes
      .replace(/[–—]/g, '-')    // Remplacer les tirets fantaisistes
      .replace(/•/g, '-')       // Remplacer les puces par des tirets
      .replace(/\*\*/g, '')     // Supprimer le markdown bold (**) 
      .replace(/\*([^*]+)\*/g, '$1') // Supprimer les italiques simples
      .replace(/^\s*[\*\-\+]\s*/gm, '- ') // Normaliser les listes
      .replace(/\n{3,}/g, '\n\n') // Réduire les espaces multiples
      .trim();
    
    res.json({
      description: generatedText
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