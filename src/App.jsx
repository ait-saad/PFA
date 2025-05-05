import "./App.css";
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import LandingPage from "./Pages/LandingPage";
import AppLayout from  "./layout/Applayout";
import Onboarding from "./Pages/Onboarding";
import MyJobs from "./Pages/MyJobs";
import SaveJobs from "./Pages/SaveJobs";
import JobPage from "./Pages/JobPage";
import PostJob from "./Pages/PostJob";
import JobListing from "./Pages/JobListing";  
import { ThemeProvider } from "./components/theme-provider";
import { ProtectedRoute } from "./components/protected-route";
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
            <JobPage/>
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