import { useUser } from "@clerk/clerk-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { BarLoader } from "react-spinners";

const Onboarding = () => {
  const { user, isLoaded } = useUser();
  const navigate = useNavigate();

  const navigateUser = (currRole) => {
    navigate(currRole === "recruiter" ? "/post-job" : "/jobs");
  };

  const handleRoleSelection = async (role) => {
    await user
      .update({ unsafeMetadata: { role } })
      .then(() => {
        console.log(`Role updated to: ${role}`);
        navigateUser(role);
      })
      .catch((err) => {
        console.error("Error updating role:", err);
      });
  };

  useEffect(() => {
    if (user?.unsafeMetadata?.role) {
      navigateUser(user.unsafeMetadata.role);
    }
  }, [user]);

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-screen">
        <BarLoader width={"100%"} color="#36d7b7" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4">
      <h2 className="text-center bg-gradient-to-r from-blue-500 to-teal-400 text-transparent bg-clip-text font-extrabold text-5xl sm:text-6xl md:text-7xl tracking-tight">
        Je suis un...
      </h2>

      <div className="mt-16 grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-3xl">
        <Button
          variant="blue"
          className="h-32 sm:h-36 text-xl sm:text-2xl rounded-2xl shadow-lg transition duration-300 hover:scale-105"
          onClick={() => handleRoleSelection("candidate")}
        >
          Candidat
        </Button>

        <Button
          variant="destructive"
          className="h-32 sm:h-36 text-xl sm:text-2xl rounded-2xl shadow-lg transition duration-300 hover:scale-105"
          onClick={() => handleRoleSelection("recruiter")}
        >
          Recruteur
        </Button>
      </div>
    </div>
  );
};

export default Onboarding;
