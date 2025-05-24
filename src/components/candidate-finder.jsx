import { findCandidatesForJob, searchCandidatesAdvanced } from '@/Api/aiService';
import { Eye, Filter, Search, Star, Users } from 'lucide-react';
import { useState } from 'react';
import { BarLoader } from 'react-spinners';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';

const CandidateFinder = ({ job }) => {
  const [searching, setSearching] = useState(false);
  const [candidates, setCandidates] = useState([]);
  const [searchMode, setSearchMode] = useState('job'); // 'job' ou 'advanced'
  
  // Critères de recherche avancée
  const [searchCriteria, setSearchCriteria] = useState({
    skills: '',
    minExperience: 0,
    maxExperience: 20,
    domain: '',
    location: ''
  });

  const handleFindCandidatesForJob = async () => {
    if (!job) return;
    
    setSearching(true);
    try {
      const result = await findCandidatesForJob(job, 10);
      setCandidates(result.topCandidates || []);
    } catch (error) {
      console.error('Erreur recherche candidats:', error);
      alert('Erreur lors de la recherche');
    } finally {
      setSearching(false);
    }
  };

  const handleAdvancedSearch = async () => {
    setSearching(true);
    try {
      const criteria = {
        ...searchCriteria,
        skills: searchCriteria.skills.split(',').map(s => s.trim()).filter(s => s)
      };
      
      const result = await searchCandidatesAdvanced(criteria);
      setCandidates(result.candidates || []);
    } catch (error) {
      console.error('Erreur recherche avancée:', error);
      alert('Erreur lors de la recherche avancée');
    } finally {
      setSearching(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 0.8) return 'bg-green-500';
    if (score >= 0.6) return 'bg-yellow-500'; 
    return 'bg-red-500';
  };

  const getScoreLabel = (score) => {
    if (score >= 0.8) return 'Excellent';
    if (score >= 0.6) return 'Bon';
    return 'Moyen';
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users size={24} />
          🎯 Recherche de Candidats SkillMatch
        </CardTitle>
        
        {/* Toggle mode de recherche */}
        <div className="flex gap-2">
          <Button
            variant={searchMode === 'job' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSearchMode('job')}
          >
            Pour cette offre
          </Button>
          <Button
            variant={searchMode === 'advanced' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSearchMode('advanced')}
          >
            <Filter size={16} className="mr-1" />
            Recherche avancée
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {searchMode === 'job' ? (
          // Mode: Candidats pour cette offre
          <div className="space-y-4">
            {job ? (
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <h3 className="font-semibold">{job.title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                  {job.description?.substring(0, 150)}...
                </p>
              </div>
            ) : (
              <div className="p-4 bg-gray-50 dark:bg-gray-900/20 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Aucune offre sélectionnée pour la recherche
                </p>
              </div>
            )}
            
            <Button 
              onClick={handleFindCandidatesForJob}
              disabled={!job || searching}
              className="w-full"
              size="lg"
            >
              {searching ? (
                <>
                  <BarLoader className="mr-2" width={20} color="#ffffff" />
                  🔍 Recherche en cours...
                </>
              ) : (
                <>
                  <Search size={18} className="mr-2" />
                  Trouver les Meilleurs Candidats
                </>
              )}
            </Button>
          </div>
        ) : (
          // Mode: Recherche avancée
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Compétences (séparées par des virgules)
                </label>
                <Input
                  value={searchCriteria.skills}
                  onChange={(e) => setSearchCriteria({...searchCriteria, skills: e.target.value})}
                  placeholder="React, JavaScript, Python..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Domaine</label>
                <Input
                  value={searchCriteria.domain}
                  onChange={(e) => setSearchCriteria({...searchCriteria, domain: e.target.value})}
                  placeholder="Développement web, Data Science..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">
                  Expérience minimum (années)
                </label>
                <Input
                  type="number"
                  value={searchCriteria.minExperience}
                  onChange={(e) => setSearchCriteria({...searchCriteria, minExperience: parseInt(e.target.value) || 0})}
                  min="0"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">
                  Expérience maximum (années)
                </label>
                <Input
                  type="number"
                  value={searchCriteria.maxExperience}
                  onChange={(e) => setSearchCriteria({...searchCriteria, maxExperience: parseInt(e.target.value) || 20})}
                  min="0"
                />
              </div>
            </div>
            
            <Button 
              onClick={handleAdvancedSearch}
              disabled={searching}
              className="w-full"
              size="lg"
            >
              {searching ? (
                <>
                  <BarLoader className="mr-2" width={20} color="#ffffff" />
                  🔍 Recherche en cours...
                </>
              ) : (
                <>
                  <Filter size={18} className="mr-2" />
                  Lancer la Recherche Avancée
                </>
              )}
            </Button>
          </div>
        )}

        {searching && (
          <div className="text-center">
            <BarLoader width="100%" color="#36d7b7" />
            <p className="text-sm text-gray-600 mt-2">
              Analyse de tous les CV en base et calcul des scores...
            </p>
          </div>
        )}

        {/* Résultats */}
        {candidates.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold flex items-center gap-2">
              <Star size={20} />
               {candidates.length} Candidat{candidates.length > 1 ? 's' : ''} Trouvé{candidates.length > 1 ? 's' : ''}
             </h3>
             <span className="text-sm text-gray-500">
               Triés par score de correspondance
             </span>
           </div>

           <div className="space-y-4 max-h-96 overflow-y-auto">
             {candidates.map((candidate, index) => (
               <Card key={candidate.cvId || index} className="hover:shadow-md transition-shadow">
                 <CardContent className="p-4">
                   <div className="flex items-start justify-between">
                     {/* Informations candidat */}
                     <div className="flex-1">
                       <div className="flex items-center gap-3 mb-2">
                         <h4 className="font-semibold text-lg">
                           {candidate.candidateData?.nom || 'Nom non disponible'}
                         </h4>
                         
                         {/* Score badge */}
                         <div className={`px-2 py-1 rounded-full text-white text-xs font-bold ${getScoreColor(candidate.matchScore)}`}>
                           {(candidate.matchScore * 100).toFixed(0)}% - {getScoreLabel(candidate.matchScore)}
                         </div>
                         
                         <Badge variant="outline" className="text-xs">
                           #{index + 1}
                         </Badge>
                       </div>

                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                         <div className="space-y-1">
                           {candidate.candidateData?.email && (
                             <p className="text-sm text-gray-600">
                               📧 {candidate.candidateData.email}
                             </p>
                           )}
                           {candidate.candidateData?.telephone && (
                             <p className="text-sm text-gray-600">
                               📞 {candidate.candidateData.telephone}
                             </p>
                           )}
                           {candidate.candidateData?.localisation && (
                             <p className="text-sm text-gray-600">
                               📍 {candidate.candidateData.localisation}
                             </p>
                           )}
                         </div>

                         <div className="space-y-1">
                           <p className="text-sm">
                             <span className="font-medium">Domaine:</span> {candidate.candidateData?.domaine}
                           </p>
                           <p className="text-sm">
                             <span className="font-medium">Expérience:</span> {candidate.candidateData?.experience_annees} ans
                           </p>
                         </div>
                       </div>

                       {/* Compétences */}
                       {candidate.candidateData?.competences && (
                         <div className="mb-3">
                           <p className="text-sm font-medium mb-1">Compétences:</p>
                           <div className="flex flex-wrap gap-1">
                             {candidate.candidateData.competences.slice(0, 6).map((comp, idx) => (
                               <Badge key={idx} variant="secondary" className="text-xs">
                                 {comp}
                               </Badge>
                             ))}
                             {candidate.candidateData.competences.length > 6 && (
                               <Badge variant="outline" className="text-xs">
                                 +{candidate.candidateData.competences.length - 6} autres
                               </Badge>
                             )}
                           </div>
                         </div>
                       )}

                       {/* Points forts et faibles */}
                       {(candidate.strengths || candidate.weaknesses) && (
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                           {candidate.strengths && (
                             <div>
                               <p className="text-sm font-medium text-green-600 mb-1">✅ Points forts:</p>
                               <ul className="text-xs space-y-1">
                                 {candidate.strengths.slice(0, 2).map((strength, idx) => (
                                   <li key={idx} className="text-green-700">• {strength}</li>
                                 ))}
                               </ul>
                             </div>
                           )}

                           {candidate.weaknesses && (
                             <div>
                               <p className="text-sm font-medium text-orange-600 mb-1">⚠️ Points d'attention:</p>
                               <ul className="text-xs space-y-1">
                                 {candidate.weaknesses.slice(0, 2).map((weakness, idx) => (
                                   <li key={idx} className="text-orange-700">• {weakness}</li>
                                 ))}
                               </ul>
                             </div>
                           )}
                         </div>
                       )}

                       {/* Recommandation */}
                       {candidate.recommendation && (
                         <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-sm">
                           <span className="font-medium">Recommandation IA:</span> {candidate.recommendation}
                         </div>
                       )}
                     </div>

                     {/* Actions */}
                     <div className="flex flex-col gap-2 ml-4">
                       <Button size="sm" variant="outline">
                         <Eye size={14} className="mr-1" />
                         Voir CV
                       </Button>
                       <Button size="sm" variant="default">
                         Contacter
                       </Button>
                     </div>
                   </div>
                 </CardContent>
               </Card>
             ))}
           </div>
         </div>
       )}

       {candidates.length === 0 && !searching && (
         <div className="text-center p-8 text-gray-500">
           <Users size={48} className="mx-auto mb-4 opacity-50" />
           <p>Aucun candidat trouvé. Lancez une recherche pour voir les résultats.</p>
         </div>
       )}
     </CardContent>
   </Card>
 );
};

export default CandidateFinder;