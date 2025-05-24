import { generateJobDescription } from "@/Api/aiService";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { BarLoader } from "react-spinners";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";

const AIJobDescriptionGenerator = ({ onDescriptionGenerated }) => {
  const [jobTitle, setJobTitle] = useState("");
  const [keyRequirements, setKeyRequirements] = useState("");
  const [companyInfo, setCompanyInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [generatedContent, setGeneratedContent] = useState(null);

  const handleGenerateDescription = async () => {
    // Validation améliorée
    if (!jobTitle.trim()) {
      setError("Le titre du poste est obligatoire");
      return;
    }
    
    if (jobTitle.trim().length < 3) {
      setError("Le titre du poste doit contenir au moins 3 caractères");
      return;
    }
    
    if (!keyRequirements.trim()) {
      setError("Les exigences clés sont obligatoires");
      return;
    }
    
    if (keyRequirements.trim().length < 10) {
      setError("Veuillez fournir des exigences plus détaillées (minimum 10 caractères)");
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const result = await generateJobDescription({
        title: jobTitle.trim(),
        requirements: keyRequirements.trim(),
        companyInfo: companyInfo.trim(),
      });
      
      // DEBUG : Voir ce que renvoie le serveur
      console.log('Réponse du serveur:', result);
      
      if (!result) {
        throw new Error("Réponse invalide du serveur");
      }

      let content;
      
      // Vérifier si on a la nouvelle structure avec 3 éléments séparés
      if (result.title && result.description && result.requirements) {
        // Nouvelle structure du serveur
        content = {
          title: result.title,
          description: result.description,
          requirements: result.requirements
        };
      } else if (result.description) {
        // Ancienne structure - on sépare manuellement le contenu
        const fullDescription = result.description;
        
        // Séparer intelligemment le contenu
        const sections = fullDescription.split('\n\n');
        
        // Extraire une description brève (premiers paragraphes)
        let briefDescription = "";
        let detailedRequirements = "";
        
        if (sections.length >= 3) {
          // Si assez de contenu, séparer proprement
          briefDescription = sections.slice(0, 2).join('\n\n');
          detailedRequirements = sections.slice(2).join('\n\n');
        } else {
          // Sinon, créer une structure basique
          briefDescription = sections[0] || "Description du poste générée par l'IA";
          detailedRequirements = sections.slice(1).join('\n\n') || fullDescription;
        }
        
        content = {
          title: jobTitle.trim(), // Utiliser le titre saisi
          description: briefDescription,
          requirements: detailedRequirements
        };
      } else {
        throw new Error("Format de réponse non reconnu");
      }
      
      // Validation du contenu
      if (!content.title || !content.description || !content.requirements) {
        throw new Error("Contenu généré incomplet");
      }
      
      if (content.description.length < 20) {
        setError("La description générée semble trop courte. Veuillez réessayer avec plus de détails.");
        return;
      }
      
      setGeneratedContent(content);
      
      // Passer les 3 éléments au formulaire principal
      if (onDescriptionGenerated) {
        onDescriptionGenerated(content);
      }
      
    } catch (err) {
      console.error('Erreur lors de la génération:', err);
      
      // Messages d'erreur plus spécifiques
      if (err.message.includes('Failed to fetch')) {
        setError("Problème de connexion. Vérifiez votre connexion internet et réessayez.");
      } else if (err.message.includes('500')) {
        setError("Erreur serveur. Le service AI est temporairement indisponible.");
      } else if (err.message.includes('401') || err.message.includes('403')) {
        setError("Problème d'authentification avec le service AI. Contactez l'administrateur.");
      } else {
        setError(`Erreur lors de la génération: ${err.message || 'Erreur inconnue'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-card rounded-xl border p-6 shadow-sm">
      <h2 className="text-2xl font-bold mb-4">🤖 Assistant IA - Création Complète</h2>
      <p className="text-muted-foreground mb-6">
        Remplissez les informations ci-dessous et l'IA générera automatiquement le titre, la description et les exigences.
      </p>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Titre du Poste</label>
          <Input
            value={jobTitle}
            onChange={(e) => {
              setJobTitle(e.target.value);
              if (error && e.target.value.trim().length >= 3) {
                setError(null);
              }
            }}
            placeholder="ex. Développeur React Senior"
            className="w-full"
            maxLength={100}
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Compétences et Exigences</label>
          <Textarea
            value={keyRequirements}
            onChange={(e) => {
              setKeyRequirements(e.target.value);
              if (error && e.target.value.trim().length >= 10) {
                setError(null);
              }
            }}
            placeholder="Ex: React, Node.js, 3+ ans d'expérience, TypeScript, travail en équipe..."
            className="w-full min-h-[100px]"
            maxLength={500}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Informations sur l'Entreprise (Optionnel)</label>
          <Textarea
            value={companyInfo}
            onChange={(e) => setCompanyInfo(e.target.value)}
            placeholder="Brève description de votre entreprise et de sa culture"
            className="w-full min-h-[80px]"
            maxLength={300}
          />
        </div>

        {error && (
          <div className="bg-destructive/20 text-destructive p-3 rounded-md flex items-center gap-2">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <Button 
          onClick={handleGenerateDescription} 
          disabled={loading || !jobTitle.trim() || !keyRequirements.trim()}
          className="w-full"
          size="lg"
        >
          {loading ? "🔄 Génération en cours..." : "✨ Générer Titre + Description + Exigences"}
        </Button>

        {loading && <BarLoader width={"100%"} color="#36d7b7" />}
        
        {generatedContent && (
          <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 size={16} className="text-green-600" />
              <h3 className="font-medium text-green-800 dark:text-green-200">
                Contenu complet généré avec succès !
              </h3>
            </div>
            <p className="text-sm text-green-700 dark:text-green-300">
              ✅ Titre du poste: {generatedContent.title}<br/>
              ✅ Description brève<br/>
              ✅ Exigences détaillées
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIJobDescriptionGenerator;