import React, { useEffect, useState } from 'react';
import useFetch from '../Hooks/use_fetch.js';
import { useUser } from "@clerk/clerk-react";
import { getJobs } from '@/Api/ApiJobs.js';
import BarLoader from "react-spinners/BarLoader";

const JobListing = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [location, setLocation] = useState("");
  const [company_id, setCompany_id] = useState("");

  const { isLoaded } = useUser();

  const {
    loading: loadingJobs,
    data: jobs,
    fn: fnJobs,
  } = useFetch(getJobs, {
    location,
    company_id,
    searchQuery,
  });

  useEffect(() => {
    if (isLoaded) fnJobs();
  }, [isLoaded, location, company_id, searchQuery]);

  if (!isLoaded || loadingJobs) {
    return <BarLoader className="mb-4" width={"100%"} color="#36d7b7" />;
  }

  if (!jobs || jobs.length === 0) {
    return <div>Aucune offre d'emploi trouvée</div>;
  }

  return (
    <div className="job-listing-container">
      <h1 className="gradient-title font-extrabold text-6xl text-center pb-7">
        Dernières offres d'emploi
      </h1>

      <div className="jobs-list">
        {jobs.map((job) => (
          <div key={job.id} className="job-card border p-4 mb-4 rounded shadow">
            <h3 className="text-xl font-bold">{job.title}</h3>

            {/* Affiche le logo de l’entreprise si disponible */}
            {job.company?.logo_url && (
              <img src={job.company.logo_url} alt="Logo" className="h-10 my-2" />
            )}

            {/* Affiche le nom de l’entreprise */}
            <p className="text-gray-600">
              {job.company?.name ?? "Entreprise inconnue"} - {job.location}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default JobListing;
