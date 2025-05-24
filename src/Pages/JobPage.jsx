import { getSingleJob, updateHiringStatus } from '@/Api/apiJobs.js';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUser } from "@clerk/clerk-react";
import MDEditor from "@uiw/react-md-editor";
import { Briefcase, DoorClosed, DoorOpen, MapPinIcon } from "lucide-react";
import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { BarLoader } from "react-spinners";
import useFetch from '../Hooks/use_fetch.js';
import ApplicationCard from "../components/application-card";
import ApplyJobDrawer from "../components/apply-job";

const JobPage = () => {
  const { id } = useParams();
  const { isLoaded, user } = useUser();

  const {
    loading: loadingJob,
    data: job,
    fn: fnJob,
  } = useFetch(getSingleJob, {
    job_id: id,
  });

  useEffect(() => {
    if (isLoaded) fnJob();
  }, [isLoaded]);

  const { loading: loadingHiringStatus, fn: fnHiringStatus } = useFetch(
    updateHiringStatus,
    {
      job_id: id,
    }
  );

  const handleStatusChange = (value) => {
    const isOpen = value === "open";
    fnHiringStatus(isOpen).then(() => fnJob());
  };

  if (!isLoaded || loadingJob) {
    return <BarLoader className="mb-4" width={"100%"} color="#36d7b7" />;
  }

  return (
    <div className="flex flex-col gap-8 mt-5">
      <div className="flex flex-col-reverse gap-6 md:flex-row justify-between items-center">
        <h1 className="gradient-title font-extrabold pb-3 text-4xl sm:text-6xl">
          {job?.title}
        </h1>
        <img src={job?.company?.logo_url} className="h-12" alt={job?.title} />
      </div>

      <div className="flex justify-between">
        <div className="flex gap-2">
          <MapPinIcon /> {job?.location}
        </div>
        <div className="flex gap-2">
          <Briefcase /> {job?.applications?.length} Applicants
        </div>
        <div className="flex gap-2">
          {job?.isOpen ? (
            <>
              <DoorOpen /> Open
            </>
          ) : (
            <>
              <DoorClosed /> Closed
            </>
          )}
        </div>
      </div>

      {/* Recruiter-only status selector */}
      {job?.recruiter_id === user?.id && (
        <Select onValueChange={handleStatusChange}>
          <SelectTrigger
            style={{
              backgroundColor: job?.isOpen ? 'rgba(0, 128, 0, 0.2)' : 'rgba(255, 0, 0, 0.2)',
              borderColor: job?.isOpen ? 'green' : 'red',
              borderWidth: '1px',
            }}
            className="w-full rounded-md p-2"
          >
            <SelectValue
              placeholder={
                <span style={{ color: job?.isOpen ? 'rgb(22, 163, 74)' : 'rgb(220, 38, 38)' }}>
                  Hiring Status {job?.isOpen ? "(Open)" : "(Closed)"}
                </span>
              }
            />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
      )}

<div className="space-y-6">
  <div>
    <h2 className="text-2xl font-bold mb-4 text-blue-500">Description du poste</h2>
    <div className="bg-card border rounded-lg p-6">
      <div className="prose prose-lg max-w-none dark:prose-invert">
        {job?.description?.split('\n').map((paragraph, index) => (
          <p key={index} className="mb-3 text-gray-700 dark:text-gray-300 leading-relaxed">
            {paragraph}
          </p>
        ))}
      </div>
    </div>
  </div>

  <div>
    <h2 className="text-2xl font-bold mb-4 text-green-500">Exigences et Compétences</h2>
    <div className="bg-card border rounded-lg p-6">
      <MDEditor.Markdown
        source={job?.requirements}
        className="bg-transparent prose prose-lg max-w-none dark:prose-invert"
      />
    </div>
  </div>
</div>

      {/* Candidate-only Apply button */}
      {job?.recruiter_id !== user?.id && (
        <ApplyJobDrawer
          job={job}
          user={user}
          fetchJob={fnJob}
          applied={job?.applications?.find((ap) => ap.candidate_id === user.id)}
        />
      )}

      {/* Status loading indicator */}
      {loadingHiringStatus && <BarLoader width={"100%"} color="#36d7b7" />}

      {/* Recruiter-only application list */}
      {job?.applications?.length > 0 && job?.recruiter_id === user?.id && (
        <div className="flex flex-col gap-2">
          <h2 className="font-bold mb-4 text-xl ml-1">Applications</h2>
          {job?.applications.map((application) => (
            <ApplicationCard key={application.id} application={application} />
          ))}
        </div>
      )}
    </div>
  );
};

export default JobPage;
