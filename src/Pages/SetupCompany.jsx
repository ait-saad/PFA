import { addNewCompany, getCompanies } from "@/Api/apiCompanies";
import useFetch from "@/Hooks/use_fetch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUser } from "@clerk/clerk-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BarLoader } from "react-spinners";

const SetupCompany = () => {
  const { user, isLoaded } = useUser();
  const navigate = useNavigate();
  const [selectedOption, setSelectedOption] = useState(""); // "existing" ou "new"
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [newCompanyName, setNewCompanyName] = useState("");
  const [newCompanyLogo, setNewCompanyLogo] = useState(null);

  const { data: companies, fn: fnCompanies, loading: loadingCompanies } = useFetch(getCompanies);
  const { fn: fnAddCompany, loading: loadingAdd } = useFetch(addNewCompany);

  useEffect(() => {
    if (isLoaded) {
      fnCompanies();
    }
  }, [isLoaded]);

  const handleSubmit = async () => {
    if (selectedOption === "existing" && selectedCompanyId) {
      // Associer à une compagnie existante
      await user.update({
        unsafeMetadata: {
          role: "recruiter",
          company_id: parseInt(selectedCompanyId)
        }
      });
      navigate("/post-job");
      
    } else if (selectedOption === "new" && newCompanyName && newCompanyLogo) {
      // Créer une nouvelle compagnie
      try {
        const newCompany = await fnAddCompany({
          name: newCompanyName,
          logo_url: newCompanyLogo
        });
        
        if (newCompany && newCompany[0]) {
          await user.update({
            unsafeMetadata: {
              role: "recruiter",
              company_id: newCompany[0].id
            }
          });
          navigate("/post-job");
        }
      } catch (error) {
        console.error("Erreur lors de la création de la compagnie:", error);
      }
    }
  };

  if (!isLoaded || loadingCompanies) {
    return <BarLoader className="mb-4" width={"100%"} color="#36d7b7" />;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4">
      <h2 className="text-center bg-gradient-to-r from-blue-500 to-teal-400 text-transparent bg-clip-text font-extrabold text-4xl sm:text-5xl md:text-6xl tracking-tight mb-8">
        Associez-vous à une entreprise
      </h2>

      <div className="w-full max-w-md space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">Choisissez une option :</label>
          <Select onValueChange={setSelectedOption}>
            <SelectTrigger>
              <SelectValue placeholder="Sélectionnez une option" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="existing">Rejoindre une entreprise existante</SelectItem>
              <SelectItem value="new">Créer une nouvelle entreprise</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {selectedOption === "existing" && (
          <div>
            <label className="block text-sm font-medium mb-2">Entreprise :</label>
            <Select onValueChange={setSelectedCompanyId}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionnez votre entreprise" />
              </SelectTrigger>
              <SelectContent>
                {companies?.map((company) => (
                  <SelectItem key={company.id} value={company.id.toString()}>
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {selectedOption === "new" && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nom de l'entreprise :</label>
              <Input
                value={newCompanyName}
                onChange={(e) => setNewCompanyName(e.target.value)}
                placeholder="Nom de votre entreprise"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Logo de l'entreprise :</label>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => setNewCompanyLogo(e.target.files[0])}
              />
            </div>
          </div>
        )}

        {(loadingAdd) && <BarLoader width={"100%"} color="#36d7b7" />}

        <Button
          onClick={handleSubmit}
          disabled={
            !selectedOption ||
            (selectedOption === "existing" && !selectedCompanyId) ||
            (selectedOption === "new" && (!newCompanyName || !newCompanyLogo)) ||
            loadingAdd
          }
          className="w-full"
          variant="blue"
        >
          Continuer
        </Button>
      </div>
    </div>
  );
};

export default SetupCompany;