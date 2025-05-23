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