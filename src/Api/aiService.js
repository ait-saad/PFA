// Function to generate job description
export const generateJobDescription = async (jobData) => {
  try {
    const response = await fetch('http://localhost:3001/api/generate-job-description', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(jobData),
    });
    
    if (!response.ok) {
      throw new Error('Failed to generate job description');
    }
    
    return await response.json();
  } catch (error) {
    console.error("Error generating job description:", error);
    throw error;
  }
};
export const analyzeAndStoreCV = async (formData) => {
  try {
    const response = await fetch('http://localhost:3001/api/analyze-and-store-cv', {
      method: 'POST',
      body: formData, // FormData avec le fichier PDF
    });
    
    if (!response.ok) {
      throw new Error('Erreur lors de l\'analyse du CV');
    }
    
    return await response.json();
  } catch (error) {
    console.error("Error analyzing and storing CV:", error);
    throw error;
  }
};

// Trouver les meilleurs candidats pour une offre
export const findCandidatesForJob = async (jobData, limit = 10) => {
  try {
    const response = await fetch('http://localhost:3001/api/find-candidates-for-job', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ jobData, limit }),
    });
    
    return await response.json();
  } catch (error) {
    console.error("Error finding candidates:", error);
    throw error;
  }
};

// Recherche avancée de candidats
export const searchCandidatesAdvanced = async (criteria) => {
  try {
    const response = await fetch('http://localhost:3001/api/search-candidates', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(criteria),
    });
    
    return await response.json();
  } catch (error) {
    console.error("Error searching candidates:", error);
    throw error;
  }
};
