import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUser } from "@clerk/clerk-react";
import { Award, Brain, FileText, Search, Target, Upload, Users } from 'lucide-react';
import { useState } from 'react';
import { BarLoader } from "react-spinners";
import CandidateCVAnalyzer from '../components/candidate-cv-analyzer';
import CandidateFinder from '../components/candidate-finder';
import CVAnalyzerComplete from '../components/cv-analyzer-complete';

const SkillMatch = () => {
  const { user, isLoaded } = useUser();
  const [selectedJob, setSelectedJob] = useState(null);

  if (!isLoaded) {
    return <BarLoader className="mb-4" width={"100%"} color="#36d7b7" />;
  }

  const isRecruiter = user?.unsafeMetadata?.role === "recruiter";

  // Statistiques pour les recruteurs
  const recruiterStats = [
    {
      icon: Upload,
      value: "150+",
      label: "CV Analysés",
      color: "blue"
    },
    {
      icon: Search,
      value: "95%",
      label: "Précision Matching",
      color: "green"
    },
    {
      icon: Users,
      value: "50+",
      label: "Recruteurs Actifs",
      color: "purple"
    }
  ];

  // Statistiques pour les candidats
  const candidateStats = [
    {
      icon: FileText,
      value: "500+",
      label: "CV Optimisés",
      color: "blue"
    },
    {
      icon: Target,
      value: "87%",
      label: "Taux de Matching",
      color: "green"
    },
    {
      icon: Award,
      value: "200+",
      label: "Candidats Placés",
      color: "purple"
    }
  ];

  const stats = isRecruiter ? recruiterStats : candidateStats;

  const getColorClasses = (color) => {
    const colors = {
      blue: {
        bg: "bg-blue-100 dark:bg-blue-900/30",
        text: "text-blue-600"
      },
      green: {
        bg: "bg-green-100 dark:bg-green-900/30",
        text: "text-green-600"
      },
      purple: {
        bg: "bg-purple-100 dark:bg-purple-900/30",
        text: "text-purple-600"
      }
    };
    return colors[color];
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="gradient-title font-extrabold text-4xl sm:text-6xl lg:text-7xl mb-4">
          <Brain className="inline-block mr-4" size={60} />
          SkillMatch AI
        </h1>
        <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
          {isRecruiter
            ? "Système intelligent d'analyse de CV et de recommandation de candidats. Utilisez l'IA pour automatiser votre processus de recrutement."
            : "Analysez votre CV avec l'IA et découvrez les opportunités qui correspondent parfaitement à votre profil professionnel."
          }
        </p>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {stats.map((stat, index) => {
          const colorClasses = getColorClasses(stat.color);
          return (
            <Card key={index}>
              <CardContent className="flex items-center p-6">
                <div className={`p-2 ${colorClasses.bg} rounded-lg mr-4`}>
                  <stat.icon size={24} className={colorClasses.text} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-sm text-gray-600">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Interface selon le rôle */}
      {isRecruiter ? (
        // Interface Recruteur avec onglets
        <Tabs defaultValue="analyze" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="analyze" className="flex items-center gap-2">
              <Upload size={18} />
              Analyser un CV
            </TabsTrigger>
            <TabsTrigger value="search" className="flex items-center gap-2">
              <Search size={18} />
              Rechercher des Candidats
            </TabsTrigger>
          </TabsList>

          <TabsContent value="analyze" className="space-y-6">
            <CVAnalyzerComplete />
            
            {/* Guide d'utilisation pour recruteurs */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">📋 Comment utiliser l'Analyseur de CV</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">1</div>
                    <div>
                      <h4 className="font-medium">Téléchargez le CV</h4>
                      <p className="text-gray-600">Sélectionnez un fichier PDF contenant le CV du candidat</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">2</div>
                    <div>
                      <h4 className="font-medium">Analyse automatique</h4>
                      <p className="text-gray-600">L'IA extrait et structure automatiquement les informations</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">3</div>
                    <div>
                      <h4 className="font-medium">Données structurées</h4>
                      <p className="text-gray-600">Consultez le profil candidat organisé et stocké en base</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="search" className="space-y-6">
            <CandidateFinder job={selectedJob} />
            
            {/* Guide recherche pour recruteurs */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">🎯 Guide de Recherche de Candidats</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Recherche par Offre d'Emploi</h4>
                    <p className="text-sm text-gray-600 mb-2">
                      Idéal pour trouver les candidats les plus adaptés à une offre spécifique.
                    </p>
                    <ul className="text-sm text-gray-600 space-y-1 ml-4">
                      <li>• Analyse automatique de correspondance</li>
                      <li>• Score de matching précis</li>
                      <li>• Points forts et points d'attention</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">Recherche Avancée</h4>
                    <p className="text-sm text-gray-600 mb-2">
                      Filtrez par critères spécifiques pour un sourcing ciblé.
                    </p>
                    <ul className="text-sm text-gray-600 space-y-1 ml-4">
                      <li>• Compétences techniques requises</li>
                      <li>• Niveau d'expérience souhaité</li>
                      <li>• Domaine de spécialisation</li>
                      <li>• Localisation géographique</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      ) : (
        // Interface Candidat simplifiée mais avec design cohérent
        <div className="space-y-6">
          <CandidateCVAnalyzer />
          
          {/* Guide d'utilisation pour candidats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">💡 Comment optimiser votre profil</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs font-bold">1</div>
                  <div>
                    <h4 className="font-medium">Analysez votre CV</h4>
                    <p className="text-gray-600">Téléchargez votre CV pour une analyse IA complète</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs font-bold">2</div>
                  <div>
                    <h4 className="font-medium">Découvrez vos forces</h4>
                    <p className="text-gray-600">Identifiez vos compétences clés et points d'amélioration</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs font-bold">3</div>
                  <div>
                    <h4 className="font-medium">Trouvez vos opportunités</h4>
                    <p className="text-gray-600">Découvrez les postes qui correspondent à votre profil</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Conseils pour candidats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">🚀 Conseils pour maximiser vos chances</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Optimisation du CV</h4>
                  <ul className="text-sm text-gray-600 space-y-1 ml-4">
                    <li>• Utilisez des mots-clés pertinents pour votre secteur</li>
                    <li>• Quantifiez vos réalisations avec des chiffres</li>
                    <li>• Adaptez votre CV à chaque candidature</li>
                    <li>• Mettez en avant vos compétences techniques</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Amélioration du profil</h4>
                  <ul className="text-sm text-gray-600 space-y-1 ml-4">
                    <li>• Complétez votre profil avec vos certifications</li>
                    <li>• Ajoutez des projets personnels ou professionnels</li>
                    <li>• Maintenez votre profil à jour régulièrement</li>
                    <li>• Sollicitez des recommandations</li>
                  </ul>
                </div>
              </div>
            </CardContent>
            </Card>
        </div>
      )}
    </div>
  );
};

export default SkillMatch;