import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import "./App.css";
import { ProtectedRoute } from "./components/protected-route";
import { ThemeProvider } from "./components/theme-provider";
import AppLayout from "./layout/Applayout";
import JobListing from "./Pages/JobListing";
import JobPage from "./Pages/JobPage";
import LandingPage from "./Pages/LandingPage";
import MyJobs from "./Pages/MyJobs";
import Onboarding from "./Pages/Onboarding";
import PostJob from "./Pages/PostJob";
import SaveJobs from "./Pages/saved-jobs";
import SetupCompany from "./Pages/SetupCompany";
import SkillMatch from "./Pages/SkillMatch";
const router = createBrowserRouter([
  { 
    path: "/",
    element: <AppLayout />,
    children: [
      {
        path: "/",
        element: <LandingPage />,
      },
      {
        path: "/onboarding",
        element: (
          <ProtectedRoute>
            <Onboarding />
          </ProtectedRoute>
        ),
      },
      {
        path: "/jobs",
        element: (
          <ProtectedRoute>
            <JobListing />
          </ProtectedRoute>
        ),
      },
      {
        path: "/post-job",
        element: (
          <ProtectedRoute>
            <PostJob />
          </ProtectedRoute>
        ),
      },
      {
        path: "/my-jobs",
        element: (
          <ProtectedRoute>
            <MyJobs/>
          </ProtectedRoute>
        ),
      },
      {
        path: "/saved-jobs",
        element: (
          <ProtectedRoute>
            <SaveJobs />
          </ProtectedRoute>
        ),
      },
      {
        path: "/job/:id",
        element: (
          <ProtectedRoute>
            <JobPage />
          </ProtectedRoute>
        ),
      },

      {
        path: "/setup-company",
        element: (
          <ProtectedRoute>
            <SetupCompany />
          </ProtectedRoute>
        ),
      },

      {
        path: "/skillmatch",
        element: (
          <ProtectedRoute>
            <SkillMatch />
          </ProtectedRoute>
        ),
      },
    ]
  }
]);

const App = () => {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
    
      <RouterProvider router={router} />
    </ThemeProvider>
  );
};


export default App;