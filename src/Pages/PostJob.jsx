import { getCompanies } from "@/Api/apiCompanies";
import { addNewJob } from "@/Api/apiJobs";
import useFetch from "@/Hooks/use_fetch";
import AIJobDescriptionGenerator from "@/components/ai-job-description-generator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useUser } from "@clerk/clerk-react";
import { zodResolver } from "@hookform/resolvers/zod";
import MDEditor from "@uiw/react-md-editor";
import { State } from "country-state-city";
import { useEffect, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Navigate, useNavigate } from "react-router-dom";
import { BarLoader } from "react-spinners";
import { z } from "zod";

const schema = z.object({
  title: z.string().min(1, { message: "Title is required" }),
  description: z.string().min(1, { message: "Description is required" }),
  location: z.string().min(1, { message: "Select a location" }),
  requirements: z.string().min(1, { message: "Requirements are required" }),
});

const PostJob = () => {
  const { user, isLoaded } = useUser();
  const navigate = useNavigate();
  const [aiGeneratedTitle, setAiGeneratedTitle] = useState(false);
  const [aiGeneratedDescription, setAiGeneratedDescription] = useState(false);
  const [aiGeneratedRequirements, setAiGeneratedRequirements] = useState(false);
  
  // Refs pour tracker les valeurs générées par IA
  const aiTitleValue = useRef("");
  const aiDescriptionValue = useRef("");
  const aiRequirementsValue = useRef("");

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: { 
      location: "", 
      requirements: "",
      title: "",
      description: "",
    },
    resolver: zodResolver(schema),
  });

  const {
    loading: loadingCreateJob,
    error: errorCreateJob,
    data: dataCreateJob,
    fn: fnCreateJob,
  } = useFetch(addNewJob);

  const onSubmit = (data) => {
    fnCreateJob({
      ...data,
      recruiter_id: user.id,
      company_id: user.unsafeMetadata?.company_id,
      isOpen: true,
    });
  };

  useEffect(() => {
    if (dataCreateJob?.length > 0) navigate("/jobs");
  }, [loadingCreateJob]);

  const {
    loading: loadingCompanies,
    data: companies,
    fn: fnCompanies,
  } = useFetch(getCompanies);

  useEffect(() => {
    if (isLoaded) {
      fnCompanies();
    }
  }, [isLoaded]);

  // Fonction pour gérer les 3 éléments générés par l'IA
  const handleDescriptionGenerated = (generatedContent) => {
    // L'IA génère maintenant 3 choses : title, description, requirements
    setValue("title", generatedContent.title);
    setValue("description", generatedContent.description);
    setValue("requirements", generatedContent.requirements);
    
    // Stocker les valeurs IA
    aiTitleValue.current = generatedContent.title;
    aiDescriptionValue.current = generatedContent.description;
    aiRequirementsValue.current = generatedContent.requirements;
    
    // Marquer tous comme générés par IA
    setAiGeneratedTitle(true);
    setAiGeneratedDescription(true);
    setAiGeneratedRequirements(true);
  };

  // Vérifier si les valeurs actuelles sont celles générées par IA
  const isTitleFromAI = aiGeneratedTitle && watch("title") === aiTitleValue.current;
  const isDescriptionFromAI = aiGeneratedDescription && watch("description") === aiDescriptionValue.current;
  const isRequirementsFromAI = aiGeneratedRequirements && watch("requirements") === aiRequirementsValue.current;

  if (!isLoaded || loadingCompanies) {
    return <BarLoader className="mb-4" width={"100%"} color="#36d7b7" />;
  }

  if (user?.unsafeMetadata?.role !== "recruiter") {
    return <Navigate to="/jobs" />;
  }

  if (!user?.unsafeMetadata?.company_id) {
    return <Navigate to="/setup-company" />;
  }

  return (
    <div>
      <h1 className="gradient-title font-extrabold text-5xl sm:text-7xl text-center pb-8">
        Post a Job
      </h1>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-4 p-4 pb-0"
      >
        {/* AI Assistant EN PREMIER */}
        <div className="mb-4">
          <AIJobDescriptionGenerator 
            onDescriptionGenerated={handleDescriptionGenerated}
          />
        </div>

        {/* Job Title */}
        <div>
          <label className="block text-sm font-medium mb-1">Titre du Poste</label>
          <Input 
            placeholder="Saisissez le titre du poste ou utilisez l'IA ci-dessus" 
            {...register("title")} 
            value={watch("title")}
            onChange={(e) => setValue("title", e.target.value)}
            className={isTitleFromAI ? "bg-green-50 border-green-300 dark:bg-green-900/20" : ""}
          />
          {errors.title && <p className="text-red-500">{errors.title.message}</p>}
          {isTitleFromAI && (
            <p className="text-sm text-green-600 mt-1">✅ Rempli par l'IA (modifiable)</p>
          )}
        </div>

        {/* Job Description */}
        <div>
          <label className="block text-sm font-medium mb-1">Description du Poste</label>
          <Textarea
            placeholder="Brève description du poste ou utilisez l'IA ci-dessus"
            {...register("description")}
            value={watch("description")}
            onChange={(e) => setValue("description", e.target.value)}
            className={`min-h-[120px] ${isDescriptionFromAI ? "bg-green-50 border-green-300 dark:bg-green-900/20" : ""}`}
          />
          {errors.description && <p className="text-red-500">{errors.description.message}</p>}
          {isDescriptionFromAI && (
            <p className="text-sm text-green-600 mt-1">✅ Rempli par l'IA (modifiable)</p>
          )}
        </div>

        {/* Location et Company */}
        <div className="flex gap-4 items-center">
          <Controller
            name="location"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Job Location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {State.getStatesOfCountry("MA").map(({ name }) => (
                      <SelectItem key={name} value={name}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            )}
          />
          
          <div className="flex-1 p-2 border rounded-md bg-muted">
            <span className="text-sm text-muted-foreground">Entreprise :</span>
            <p className="font-medium">
              {companies?.find(c => c.id === user?.unsafeMetadata?.company_id)?.name || "Chargement..."}
            </p>
          </div>
        </div>
        
        {errors.location && (
          <p className="text-red-500">{errors.location.message}</p>
        )}

        {/* Requirements */}
        <div>
          <label className="block text-sm font-medium mb-2">Exigences et Compétences Requises</label>
          <Controller
            name="requirements"
            control={control}
            render={({ field }) => (
              <MDEditor 
                value={field.value} 
                onChange={field.onChange}
                preview="edit"
                height={250}
                placeholder="Exigences détaillées, compétences et qualifications..."
                className={isRequirementsFromAI ? "border-green-300" : ""}
              />
            )}
          />
          {errors.requirements && (
            <p className="text-red-500">{errors.requirements.message}</p>
          )}
          {isRequirementsFromAI && (
            <p className="text-sm text-green-600 mt-1">✅ Rempli par l'IA (modifiable)</p>
          )}
        </div>

        {/* Error Messages */}
        {errorCreateJob?.message && (
          <p className="text-red-500">{errorCreateJob?.message}</p>
        )}

        {/* Loading */}
        {loadingCreateJob && <BarLoader width={"100%"} color="#36d7b7" />}

        {/* Submit Button */}
        <Button 
          type="submit" 
          variant="blue" 
          size="lg" 
          className="mt-2"
          disabled={loadingCreateJob}
        >
          Submit
        </Button>

        {/* Indication de ce qui vient de l'IA */}
        {(isTitleFromAI || isDescriptionFromAI || isRequirementsFromAI) && (
          <div className="text-center">
            <p className="text-sm text-blue-600">
              💡 Contenu généré par l'IA : {
                [
                  isTitleFromAI && "Titre",
                  isDescriptionFromAI && "Description", 
                  isRequirementsFromAI && "Exigences"
                ].filter(Boolean).join(", ")
              }
            </p>
          </div>
        )}
      </form>
    </div>
  );
};

export default PostJob;