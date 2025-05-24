import { analyzeAndStoreCV } from '@/Api/aiService';
import { Briefcase, CheckCircle2, Mail, MapPin, Upload, User } from 'lucide-react';
import { useState } from 'react';
import { BarLoader } from 'react-spinners';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';

const CVAnalyzerComplete = () => {
  const [cvFile, setCvFile] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [cvData, setCvData] = useState(null);
  const [analysisComplete, setAnalysisComplete] = useState(false);

  const handleAnalyzeCV = async () => {
    if (!cvFile) return;
    
    setAnalyzing(true);
    try {
      const formData = new FormData();
      formData.append('cv', cvFile);
      
      const result = await analyzeAndStoreCV(formData);
      setCvData(result.structuredData);
      setAnalysisComplete(true);
    } catch (error) {
      console.error('Erreur analyse CV:', error);
      alert('Erreur lors de l\'analyse du CV');
    } finally {
      setAnalyzing(false);
    }
  };

  const resetAnalysis = () => {
    setCvFile(null);
    setCvData(null);
    setAnalysisComplete(false);
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload size={24} />
          🤖 Analyseur de CV IA - SkillMatch
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {!analysisComplete ? (
          // Phase 1: Upload et analyse
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Télécharger un CV (PDF)
              </label>
              <Input
                type="file"
                accept=".pdf"
                onChange={(e) => setCvFile(e.target.files[0])}
                className="cursor-pointer"
              />
            </div>
            
            {cvFile && (
              <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded">
                <CheckCircle2 size={16} className="text-blue-600" />
                <span className="text-sm">Fichier sélectionné: {cvFile.name}</span>
              </div>
            )}
            
            <Button 
              onClick={handleAnalyzeCV}
              disabled={!cvFile || analyzing}
              className="w-full"
              size="lg"
            >
              {analyzing ? (
                <>
                  <BarLoader className="mr-2" width={20} color="#ffffff" />
                  🔄 Analyse en cours...
                </>
              ) : (
                '📄 Analyser et Stocker le CV'
              )}
            </Button>
            
            {analyzing && (
              <div className="text-center space-y-2">
                <BarLoader width="100%" color="#36d7b7" />
                <p className="text-sm text-gray-600">
                  Extraction du texte et analyse IA en cours...
                </p>
              </div>
            )}
          </div>
        ) : (
          // Phase 2: Résultats de l'analyse
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-green-600 flex items-center gap-2">
                <CheckCircle2 size={20} />
                ✅ CV Analysé et Stocké avec Succès
              </h3>
              <Button onClick={resetAnalysis} variant="outline" size="sm">
                Analyser un autre CV
              </Button>
            </div>
            
            {cvData && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Informations personnelles */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <User size={18} />
                      Informations Personnelles
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2">
                      <User size={14} />
                      <span className="font-medium">{cvData.nom}</span>
                    </div>
                    {cvData.email && (
                      <div className="flex items-center gap-2">
                        <Mail size={14} />
                        <span className="text-sm">{cvData.email}</span>
                      </div>
                    )}
                    {cvData.telephone && (
                      <div className="flex items-center gap-2">
                        <span>📞</span>
                        <span className="text-sm">{cvData.telephone}</span>
                      </div>
                    )}
                    {cvData.localisation && (
                      <div className="flex items-center gap-2">
                        <MapPin size={14} />
                        <span className="text-sm">{cvData.localisation}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Profil professionnel */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Briefcase size={18} />
                      Profil Professionnel
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <span className="font-medium">Domaine:</span>
                      <span className="ml-2 text-sm">{cvData.domaine}</span>
                    </div>
                    <div>
                      <span className="font-medium">Expérience:</span>
                      <span className="ml-2 text-sm">{cvData.experience_annees} ans</span>
                    </div>
                    {cvData.resume_profil && (
                      <div>
                        <span className="font-medium">Résumé:</span>
                        <p className="text-sm mt-1 text-gray-600 dark:text-gray-300">
                          {cvData.resume_profil}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Compétences */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">🛠️ Compétences</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {cvData.competences?.map((comp, idx) => (
                        <span 
                          key={idx} 
                          className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 px-2 py-1 rounded text-xs font-medium"
                        >
                          {comp}
                        </span>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Langues */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">🌍 Langues</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {cvData.langues?.map((lang, idx) => (
                        <span 
                          key={idx} 
                          className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 px-2 py-1 rounded text-xs"
                        >
                          {lang}
                        </span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Expériences détaillées */}
            {cvData?.experiences && cvData.experiences.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">💼 Expériences Professionnelles</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {cvData.experiences.map((exp, idx) => (
                      <div key={idx} className="border-l-4 border-blue-500 pl-4 py-2">
                        <h4 className="font-semibold">{exp.poste}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          {exp.entreprise} • {exp.duree}
                        </p>
                        {exp.description && (
                          <p className="text-sm mt-1">{exp.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Formation */}
            {cvData?.formation && cvData.formation.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">🎓 Formation</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {cvData.formation.map((form, idx) => (
                      <div key={idx} className="border-l-4 border-green-500 pl-4 py-2">
                        <h4 className="font-semibold">{form.diplome}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          {form.etablissement} • {form.annee}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CVAnalyzerComplete;