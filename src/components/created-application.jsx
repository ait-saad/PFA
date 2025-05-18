import { useUser } from "@clerk/clerk-react";
import ApplicationCard from "./application-card";
import { useEffect } from "react";
import { getApplications } from "@/Api/apiApplication";
import useFetch from "@/Hooks/use_fetch";
import { BarLoader } from "react-spinners";

const CreatedApplications = () => {
  const { user, isLoaded } = useUser();

  const {
    loading: loadingApplications,
    data: applications,
    fn: fnApplications,
  } = useFetch(getApplications, {
    user_id: user?.id, // Optional chaining
  });

  useEffect(() => {
    if (user?.id) {
      fnApplications();
    }
  }, [user]); // Run when user changes

  if (!isLoaded || loadingApplications) {
    return <BarLoader className="mb-4" width={"100%"} color="#36d7b7" />;
  }

  return (
    <div className="flex flex-col gap-2">
      {applications?.map((application) => (
        <ApplicationCard
          key={application.id}
          application={application}
          isCandidate
        />
      ))}
    </div>
  );
};

export default CreatedApplications;
