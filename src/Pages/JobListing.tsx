import React, { useEffect, useState } from 'react';
import useFetch from '../Hooks/use_fetch.js';
import { useUser } from "@clerk/clerk-react";
import { getJobs } from '@/Api/apiJobs.js';
import BarLoader from "react-spinners/BarLoader";
import JobCard from '../components/job-card.jsx';
import { getCompanies } from '@/Api/apiCompanies.js';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { State } from 'country-state-city';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

const JobListing = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [location, setLocation] = useState("");
  const [company_id, setCompany_id] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [jobsPerPage] = useState(9);

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

  const {
    data: Companies,
    fn: fnCompanies,
  } = useFetch(getCompanies, {});

  useEffect(() => {
    if (isLoaded) fnCompanies();
  }, [isLoaded]);

  useEffect(() => {
    if (isLoaded) fnJobs();
  }, [isLoaded, location, company_id, searchQuery]);

  // Pagination logic
  const indexOfLastJob = currentPage * jobsPerPage;
  const indexOfFirstJob = indexOfLastJob - jobsPerPage;
  const currentJobs = jobs?.slice(indexOfFirstJob, indexOfLastJob) || [];
  const totalPages = jobs ? Math.ceil(jobs.length / jobsPerPage) : 0;

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo(0, 0);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    let formData = new FormData(e.target);

    const query = formData.get("search-query");
    if (query) setSearchQuery(query.toString());
    setCurrentPage(1); // Reset to first page when searching
  };

  const clearFilters = () => {
    setSearchQuery("");
    setLocation("");
    setCompany_id("");
    setCurrentPage(1);
  };

  if (!isLoaded || loadingJobs) {
    return <BarLoader className="mb-4" width={"100%"} color="#36d7b7" />;
  }

  if (!jobs || jobs.length === 0) {
    return <div>Aucune offre d'emploi trouvée</div>;
  }

  return (
    <div className="">
      <h1 className="gradient-title font-extrabold text-6xl text-center pb-7">
        Dernières offres d'emploi
      </h1>

      <form
        onSubmit={handleSearch}
        className="h-14 flex flex-row w-full gap-2 items-center mb-3"
      >
        <Input
          type="text"
          placeholder="Rechercher un poste..."
          name="search-query"
          className="h-full flex-1 px-4 text-md"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <Button type="submit" className="h-full sm:w-28" variant="blue">
          Rechercher
        </Button>
      </form>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        {/* Location Filter */}
        <Select value={location} onValueChange={(value) => {
          setLocation(value);
          setCurrentPage(1); // Reset to first page when filtering
        }}>
          <SelectTrigger className="w-full sm:w-64">
            <SelectValue placeholder="Filtrer par emplacement" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {State.getStatesOfCountry("MA").map((state) => (
                <SelectItem key={state.isoCode} value={state.name}>
                  {state.name}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>

        {/* Company Filter */}
        <Select value={company_id} onValueChange={(value) => {
          setCompany_id(value);
          setCurrentPage(1); // Reset to first page when filtering
        }}>
          <SelectTrigger className="w-full sm:w-64">
            <SelectValue placeholder="Filtrer par entreprise" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {Companies?.map(({ name, id }) => (
                <SelectItem key={id} value={id}>
                  {name}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <Button
          className="sm:w-28"
          variant="destructive"
          onClick={clearFilters}
        >
          Clear Filters
        </Button>
      </div>

      {loadingJobs && (<BarLoader className="mb-4" width={"100%"} color="#36d7b7" />)}
      {loadingJobs === false && (
        <div className='mt-7 grid md:grid-cols-2 lg:grid-cols-3 gap-4'>
          {currentJobs.length > 0 ? (
            currentJobs.map((job) => (
              <JobCard 
                key={job.id} 
                job={job}
                savedInit={job.saved?.length > 0}
              />
            ))
          ) : (
            <div>No Jobs Found</div>
          )}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-8">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious 
                  onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                  className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"} 
                />
              </PaginationItem>
              
              {/* First page */}
              {currentPage > 3 && (
                <PaginationItem>
                  <PaginationLink onClick={() => handlePageChange(1)}>
                    1
                  </PaginationLink>
                </PaginationItem>
              )}

              {/* Ellipsis if needed */}
              {currentPage > 4 && (
                <PaginationItem>
                  <PaginationEllipsis />
                </PaginationItem>
              )}

              {/* Show current page and adjacent pages */}
              {Array.from({ length: Math.min(3, totalPages) }, (_, index) => {
                const pageNum = currentPage === 1 
                  ? currentPage + index 
                  : currentPage + index - 1;
                
                if (pageNum <= totalPages && pageNum > 0) {
                  return (
                    <PaginationItem key={pageNum}>
                      <PaginationLink 
                        onClick={() => handlePageChange(pageNum)}
                        isActive={pageNum === currentPage}
                      >
                        {pageNum}
                      </PaginationLink>
                    </PaginationItem>
                  );
                }
                return null;
              })}

              {/* Ellipsis if needed */}
              {currentPage < totalPages - 3 && (
                <PaginationItem>
                  <PaginationEllipsis />
                </PaginationItem>
              )}

              {/* Last page */}
              {currentPage < totalPages - 2 && (
                <PaginationItem>
                  <PaginationLink onClick={() => handlePageChange(totalPages)}>
                    {totalPages}
                  </PaginationLink>
                </PaginationItem>
              )}

              <PaginationItem>
                <PaginationNext 
                  onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                  className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"} 
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
};

export default JobListing;