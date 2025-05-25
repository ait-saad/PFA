import { analyzeAndStoreCV } from '@/Api/aiService';
import { useUser } from "@clerk/clerk-react";
import { Briefcase, Upload } from 'lucide-react';
import { useState } from 'react';
import { BarLoader } from 'react-spinners';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';

const CandidateCVAnalyzer = () => {
  const { user } = useUser();
  const [cvFile, setCvFile] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);

  const handleAnalyze = async () => {
    if (!cvFile) return;
    
    setAnalyzing(true);
    try {
      const formData = new FormData();
      formData.append('cv', cvFile);
      formData.append('candidate_id', user?.id);
      
      const response = await analyzeAndStoreCV(formData);
      setResult(response);
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de l\'analyse');
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload size={20} />
            Analysez votre CV et trouvez des opportunités
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            type="file"
            accept=".pdf"
            onChange={(e) => setCvFile(e.target.files[0])}
          />
          
          <Button 
            onClick={handleAnalyze}
            disabled={!cvFile || analyzing}
            className="w-full"
          >
            {analyzing ? '🔄 Analyse en cours...' : '📄 Analyser mon CV'}
          </Button>
          
          {analyzing && <BarLoader width="100%" color="#36d7b7" />}
        </CardContent>
      </Card>

      {/* ✅ RECOMMANDATIONS D'OFFRES */}
      {result?.recommendedJobs && result.recommendedJobs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase size={20} />
              🎯 Offres Recommandées pour Vous ({result.recommendedJobs.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {result.recommendedJobs.map((job, idx) => (
                <div key={idx} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-semibold text-lg">{job.jobData.title}</h4>
                      <p className="text-sm text-gray-600">{job.jobData.company} • {job.jobData.location}</p>
                      <p className="text-sm mt-2">{job.jobData.description?.substring(0, 150)}...</p>
                      
                      {job.reasons && (
                        <div className="mt-3">
                          <p className="text-sm font-medium text-green-600 mb-1">✅ Pourquoi ce poste vous convient:</p>
                          <ul className="text-xs space-y-1">
                            {job.reasons.slice(0, 2).map((reason, i) => (
                              <li key={i} className="text-green-700">• {reason}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                    
                    <div className="ml-4 text-center">
                      <div className={`px-3 py-1 rounded-full text-white text-sm font-bold ${
                        job.matchScore >= 0.8 ? 'bg-green-500' : 
                        job.matchScore >= 0.6 ? 'bg-yellow-500' : 'bg-blue-500'
                      }`}>
                        {(job.matchScore * 100).toFixed(0)}%
                      </div>
                      <p className="text-xs mt-1">Compatibilité</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" variant="outline">
                      Voir l'offre
                    </Button>
                    <Button size="sm">
                      Postuler
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CandidateCVAnalyzer;