/* eslint-disable react/prop-types */
import { deleteJob, saveJob } from "@/Api/apiJobs";
import { useUser } from "@clerk/clerk-react";
import { MapPinIcon, Star, Trash2Icon } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BarLoader } from "react-spinners";
import useFetch from '../Hooks/use_fetch.js';
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./ui/card";
    
const JobCard = ({
  job,
  savedInit = false,
  onJobAction = () => {},
  isMyJob = false,
}) => {
  const [saved, setSaved] = useState(savedInit);

  const { user } = useUser();

  const { loading: loadingDeleteJob, fn: fnDeleteJob } = useFetch(deleteJob, {
    job_id: job.id,
  });

  const {
    loading: loadingSavedJob,
    data: savedJob,
    fn: fnSavedJob,
  } = useFetch(saveJob,{
    alreadySaved:saved,
  });

  const handleSaveJob = async () => {
    await fnSavedJob({
      user_id: user.id,
      job_id: job.id,
    });
    onJobAction();
  };

  const handleDeleteJob = async () => {
    await fnDeleteJob();
    onJobAction();
  };

  useEffect(() => {
    if (savedJob !== undefined) setSaved(savedJob?.length > 0);
  }, [savedJob]);

  // Fonction pour gérer la description de manière sécurisée
  const getJobDescription = () => {
    if (!job.description || typeof job.description !== 'string') {
      return "No description available";
    }
    
    const dotIndex = job.description.indexOf(".");
    if (dotIndex === -1) {
      // Pas de point trouvé, prendre les 100 premiers caractères
      return job.description.substring(0, 100) + (job.description.length > 100 ? "..." : "");
    }
    
    return job.description.substring(0, dotIndex) + ".";
  };

  return (
    
    <Card className="flex flex-col">
      {loadingDeleteJob && (
        <BarLoader className="mt-4" width={"100%"} color="#36d7b7" />
      )}
      <CardHeader className="flex">
        <CardTitle className="flex justify-between font-bold">
          {job.title || "No title"}
          {isMyJob && (
            <Trash2Icon
              fill="red"
              size={18}
              className="text-red-300 cursor-pointer"
              onClick={handleDeleteJob}
            />
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 flex-1">
        <div className="flex justify-between">
          {job.company && job.company.logo_url && (
            <img src={job.company.logo_url} className="h-6" alt="Company logo" />
          )}
          <div className="flex gap-2 items-center">
            <MapPinIcon size={15} /> {job.location || "Location not specified"}
          </div>
        </div>
        <hr />
        {getJobDescription()}
      </CardContent>
      <CardFooter className="flex gap-2">
        <Link to={`/job/${job.id}`} className="flex-1">
          <Button variant="secondary" className="w-full">
            More Details
          </Button>
        </Link>
        {!isMyJob && (
          <Button
            variant="outline"
            className="w-15"
            onClick={handleSaveJob}
            disabled={loadingSavedJob}
          >
            {saved ? (
                < Star size={20} stroke="yellow" fill="yellow"/>
            ) : (
              <Star size={20} />
            )}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default JobCard;