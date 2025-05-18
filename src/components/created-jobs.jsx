import { useUser } from "@clerk/clerk-react";
import { useEffect } from "react";
import useFetch from "@/Hooks/use_fetch";
import { getJobs } from "@/Api/apiJobs";
import JobCard from "./job-card";
import { BarLoader } from "react-spinners";

const CreatedJobs = () => {
  const { user, isLoaded } = useUser();

  const {
    loading: loadingJobs,
    data: jobs,
    fn: fnJobs,
  } = useFetch(getJobs, {
    user_id: user?.id,
  });

  useEffect(() => {
    if (user?.id) {
      fnJobs();
    }
  }, [user]);

  if (!isLoaded || loadingJobs) {
    return <BarLoader className="mb-4" width={"100%"} color="#36d7b7" />;
  }

  if (!jobs?.length) {
    return <p className="text-center text-gray-500">No jobs found.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {jobs.map((job) => (
        <JobCard
          key={job.id}
          job={job}
          isMyJob={true}
          onJobAction={fnJobs} // ✅ correct function to re-fetch jobs
        />
      ))}
    </div>
  );
};

export default CreatedJobs;
