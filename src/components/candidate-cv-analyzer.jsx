import { analyzeCVComplete } from '@/Api/aiService';
import { useUser } from "@clerk/clerk-react";
import {
    Briefcase,
    CheckCircle2,
    ExternalLink,
    Eye,
    FileText,
    Lightbulb,
    Mail,
    MapPin,
    Phone,
    Search,
    Star,
    Target,
    TrendingUp,
    Upload,
    User
} from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarLoader } from 'react-spinners';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';

const CandidateCVAnalyzer = () => {
  const { user } = useUser();
  const navigate = useNavigate();
  const [cvFile, setCvFile] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [analysisComplete, setAnalysisComplete] = useState(false);

  const handleAnalyze = async () => {
    if (!cvFile) return;
    
    setAnalyzing(true);
    setResult(null);
    setAnalysisComplete(false);
    
    try {
      const formData = new FormData();
      formData.append('cv', cvFile);
      formData.append('candidate_id', user?.id || 'temp_candidate');
      
      console.log('🚀 Envoi du CV pour analyse complète...');
      const response = await analyzeCVComplete(formData);
      console.log('📥 Réponse reçue:', response);
      
      setResult(response);
      setAnalysisComplete(true);
    } catch (error) {
      console.error('❌ Erreur analyse CV:', error);
      alert('Erreur lors de l\'analyse du CV. Vérifiez la console pour plus de détails.');
    } finally {
      setAnalyzing(false);
    }
  };

  const resetAnalysis = () => {
    setCvFile(null);
    setResult(null);
    setAnalysisComplete(false);
  };

  const handleViewCompatibleJobs = () => {
    // Stocker les données du CV dans le localStorage pour les utiliser dans la recherche
    localStorage.setItem('candidateProfile', JSON.stringify(result?.structuredData));
    localStorage.setItem('recommendedJobs', JSON.stringify(result?.recommendedJobs));
    
    // Rediriger vers la page des offres avec un paramètre pour filtrer
    navigate('/jobs?source=cv-analysis');
  };

  const getScoreColor = (score) => {
    if (score >= 0.8) return 'bg-green-500';
    if (score >= 0.6) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getScoreLabel = (score) => {
    if (score >= 0.8) return 'Excellent';
    if (score >= 0.6) return 'Bon';
    return 'À améliorer';
  };

  return (
    <div className="space-y-6">
      {!analysisComplete ? (
        // Phase 1: Upload et analyse
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload size={20} />
              Analysez votre CV et trouvez des opportunités
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Téléchargez votre CV (PDF)
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
              onClick={handleAnalyze}
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
                '📄 Analyser mon CV'
              )}
            </Button>
            
            {analyzing && (
              <div className="text-center space-y-2">
                <BarLoader width="100%" color="#36d7b7" />
                <p className="text-sm text-gray-600">
                  Extraction, structuration et recherche d'opportunités en cours...
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        // Phase 2: Résultats complets avec style professionnel
        <div className="space-y-6">
          {/* Header avec succès */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                <CheckCircle2 size={20} className="text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-green-600">CV Analysé et Stocké avec Succès</h2>
                <p className="text-sm text-gray-600">Analyse complète réalisée avec recommandations personnalisées</p>
              </div>
            </div>
            <Button onClick={resetAnalysis} variant="outline" size="sm">
              Analyser un autre CV
            </Button>
          </div>

          {/* Grille principale avec layout professionnel */}
          {result?.structuredData && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* INFORMATIONS PERSONNELLES */}
              <Card className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                    <User size={20} />
                    Informations Personnelles
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2">
                    <User size={16} className="text-slate-600" />
                    <span className="font-semibold text-lg">{result.structuredData.nom}</span>
                  </div>
                  
                  {result.structuredData.email && (
                    <div className="flex items-center gap-2">
                      <Mail size={16} className="text-slate-600" />
                      <span className="text-sm">{result.structuredData.email}</span>
                    </div>
                  )}
                  
                  {result.structuredData.telephone && (
                    <div className="flex items-center gap-2">
                      <Phone size={16} className="text-slate-600" />
                      <span className="text-sm">{result.structuredData.telephone}</span>
                    </div>
                  )}
                  
                  {result.structuredData.localisation && (
                    <div className="flex items-center gap-2">
                      <MapPin size={16} className="text-slate-600" />
                      <span className="text-sm">{result.structuredData.localisation}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* PROFIL PROFESSIONNEL */}
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                    <Briefcase size={20} />
                    Profil Professionnel
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <span className="font-medium text-blue-800 dark:text-blue-200">Domaine:</span>
                    <span className="ml-2 text-sm">{result.structuredData.domaine}</span>
                  </div>
                  <div>
                    <span className="font-medium text-blue-800 dark:text-blue-200">Expérience:</span>
                    <span className="ml-2 text-sm">{result.structuredData.experience_annees} ans</span>
                  </div>
                  {result.structuredData.resume_profil && (
                    <div>
                      <span className="font-medium text-blue-800 dark:text-blue-200">Résumé:</span>
                      <p className="text-sm mt-1 text-slate-600 dark:text-slate-300 leading-relaxed">
                        {result.structuredData.resume_profil}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* COMPÉTENCES - Style similaire à votre capture */}
          {result?.structuredData?.competences && (
            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-purple-700 dark:text-purple-300">
                  <Target size={20} />
                  Compétences
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {result.structuredData.competences.map((comp, idx) => (
                    <Badge 
                      key={idx} 
                      className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1"
                    >
                      {comp}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* LANGUES */}
          {result?.structuredData?.langues && result.structuredData.langues.length > 0 && (
            <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-300">
                  🌍 Langues
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {result.structuredData.langues.map((lang, idx) => (
                    <Badge 
                      key={idx} 
                      variant="outline"
                      className="border-green-600 text-green-700 dark:text-green-300"
                    >
                      {lang}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* EXPÉRIENCES PROFESSIONNELLES */}
          {result?.structuredData?.experiences && result.structuredData.experiences.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase size={20} />
                  💼 Expériences Professionnelles
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {result.structuredData.experiences.map((exp, idx) => (
                    <div key={idx} className="border-l-4 border-blue-500 pl-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-r">
                      <h4 className="font-semibold text-blue-700 dark:text-blue-300">{exp.poste}</h4>
                      <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                        {exp.entreprise} • {exp.duree}
                      </p>
                      {exp.description && (
                        <p className="text-sm mt-2 text-slate-700 dark:text-slate-300">{exp.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* FORMATION */}
          {result?.structuredData?.formation && result.structuredData.formation.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText size={20} />
                  🎓 Formation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {result.structuredData.formation.map((form, idx) => (
                    <div key={idx} className="border-l-4 border-green-500 pl-4 py-3 bg-green-50 dark:bg-green-900/20 rounded-r">
                      <h4 className="font-semibold text-green-700 dark:text-green-300">{form.diplome}</h4>
                      <p className="text-sm text-green-600 dark:text-green-400">
                        {form.etablissement} • {form.annee}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* SCORE ET CONSEILS - Version compacte */}
          {result?.improvements && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Score global */}
              <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-800/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-orange-700 dark:text-orange-300">
                    <TrendingUp size={20} />
                    Score de Votre CV
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-center space-y-4">
                  <div className="flex items-center justify-center">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-lg ${getScoreColor(result.improvements.overall_score || 0.7)}`}>
                      {Math.round((result.improvements.overall_score || 0.7) * 100)}%
                    </div>
                  </div>
                  <div>
                    <p className="font-medium">{getScoreLabel(result.improvements.overall_score || 0.7)}</p>
                    <p className="text-sm text-gray-600">Évaluation globale</p>
                  </div>
                </CardContent>
              </Card>

              {/* Points forts */}
              <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/30 dark:to-emerald-800/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
                    <Star size={20} />
                    Vos Atouts
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {result.improvements.strengths?.slice(0, 3).map((strength, idx) => (
                      <li key={idx} className="text-sm text-emerald-700 dark:text-emerald-300 flex items-start gap-2">
                        <span className="text-emerald-600">✓</span>
                        {strength}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          )}

          {/* BOUTON PRINCIPAL - VOIR LES OFFRES COMPATIBLES */}
          {result?.recommendedJobs && result.recommendedJobs.length > 0 && (
            <Card className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
              <CardContent className="p-6">
                <div className="text-center space-y-4">
                  <div className="flex items-center justify-center gap-2">
                    <Search size={24} />
                    <h3 className="text-xl font-bold">
                      {result.recommendedJobs.length} Offres Compatibles Trouvées !
                    </h3>
                  </div>
                  <p className="text-blue-100">
                    Nous avons analysé votre profil et trouvé des opportunités qui correspondent à vos compétences
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button 
                      onClick={handleViewCompatibleJobs}
                      variant="secondary"
                      size="lg"
                      className="bg-white text-blue-600 hover:bg-blue-50 font-semibold"
                    >
                      <Eye size={20} className="mr-2" />
                      Voir les Offres Compatibles
                    </Button>
                    <Button 
                      variant="outline"
                      size="lg"
                      className="border-white text-white hover:bg-white hover:text-blue-600"
                      onClick={() => navigate('/jobs')}
                    >
                      <ExternalLink size={20} className="mr-2" />
                      Toutes les Offres
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* CONSEILS RAPIDES */}
          {result?.improvements && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb size={20} />
                  💡 Conseils d'Amélioration Rapides
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Mots-clés à ajouter */}
                  <div>
                    <h4 className="font-medium mb-2 text-blue-600">🔍 Mots-clés Recommandés</h4>
                    <div className="flex flex-wrap gap-1">
                      {result.improvements.keywords_to_add?.slice(0, 6).map((keyword, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {keyword}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Suggestions format */}
                  <div>
                    <h4 className="font-medium mb-2 text-green-600">📝 Améliorations Format</h4>
                    <ul className="space-y-1">
                      {result.improvements.format_suggestions?.slice(0, 3).map((suggestion, idx) => (
                        <li key={idx} className="text-xs flex items-start gap-1">
                          <span className="text-green-600">•</span>
                          {suggestion}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

export default CandidateCVAnalyzer;