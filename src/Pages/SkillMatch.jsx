import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUser } from "@clerk/clerk-react";
import { Brain, Search, Upload, Users } from 'lucide-react';
import { useState } from 'react';
import { BarLoader } from "react-spinners";
import CandidateFinder from '../components/candidate-finder';
import CVAnalyzerComplete from '../components/cv-analyzer-complete';

const SkillMatch = () => {
  const { user, isLoaded } = useUser();
  const [selectedJob, setSelectedJob] = useState(null);

  if (!isLoaded) {
    return <BarLoader className="mb-4" width={"100%"} color="#36d7b7" />;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="gradient-title font-extrabold text-4xl sm:text-6xl lg:text-7xl mb-4">
          <Brain className="inline-block mr-4" size={60} />
          SkillMatch AI
        </h1>
        <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
          Système intelligent d'analyse de CV et de recommandation de candidats. 
          Utilisez l'IA pour automatiser votre processus de recrutement.
        </p>
      </div>

      {/* Statistiques rapides */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardContent className="flex items-center p-6">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg mr-4">
              <Upload size={24} className="text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">150+</p>
              <p className="text-sm text-gray-600">CV Analysés</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg mr-4">
              <Search size={24} className="text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">95%</p>
              <p className="text-sm text-gray-600">Précision Matching</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg mr-4">
              <Users size={24} className="text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">50+</p>
              <p className="text-sm text-gray-600">Recruteurs Actifs</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Interface principale */}
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
          
          {/* Guide d'utilisation */}
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
          
          {/* Guide recherche */}
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
    </div>
  );
};

export default SkillMatch;