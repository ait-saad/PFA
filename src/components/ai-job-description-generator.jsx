import { generateJobDescription } from "@/Api/aiService";
import { AlertCircle, CheckCircle2, Copy } from "lucide-react";
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
  const [generatedDescription, setGeneratedDescription] = useState("");
  const [copied, setCopied] = useState(false);

  const handleGenerateDescription = async () => {
    if (!jobTitle.trim() || !keyRequirements.trim()) {
      setError("Please provide both job title and key requirements");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await generateJobDescription({
        title: jobTitle,
        requirements: keyRequirements,
        companyInfo: companyInfo,
      });
      
      setGeneratedDescription(result.description);
      // Pass the generated description up to the parent component if needed
      if (onDescriptionGenerated) {
        onDescriptionGenerated(result.description);
      }
    } catch (err) {
      setError("Failed to generate job description. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(generatedDescription);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-card rounded-xl border p-6 shadow-sm">
      <h2 className="text-2xl font-bold mb-4">AI Job Description Generator</h2>
      <p className="text-muted-foreground mb-6">
        Let AI help you create a professional job description by providing a few key details.
      </p>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Job Title</label>
          <Input
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            placeholder="e.g. Senior React Developer"
            className="w-full"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Key Requirements</label>
          <Textarea
            value={keyRequirements}
            onChange={(e) => setKeyRequirements(e.target.value)}
            placeholder="List key skills, experience, and qualifications separated by commas"
            className="w-full min-h-[100px]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Company Information (Optional)</label>
          <Textarea
            value={companyInfo}
            onChange={(e) => setCompanyInfo(e.target.value)}
            placeholder="Brief description of your company and culture"
            className="w-full min-h-[80px]"
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
        >
          {loading ? "Generating..." : "Generate Description"}
        </Button>

        {loading && <BarLoader width={"100%"} color="#36d7b7" />}
        
        {/* SECTION CACHÉE avec CSS - mais code intact */}
        {generatedDescription && (
          <div className="mt-6" style={{display: 'none'}}>
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-medium">Generated Job Description</h3>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleCopyToClipboard}
                className="flex items-center gap-1"
              >
                {copied ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                {copied ? "Copied!" : "Copy"}
              </Button>
            </div>
            <div className="bg-muted/50 rounded-md p-4 whitespace-pre-wrap">
              {generatedDescription}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIJobDescriptionGenerator;