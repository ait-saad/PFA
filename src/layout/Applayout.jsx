import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from '../components/Header';

const AppLayout = () => {
  return (
    <div>
      <div className="grid-background">
      </div>
      <main className="min-h-screen container mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <Header/>
        <Outlet /> 
      </main>
      <div className="bg-gray-800 text-white text-center py-4 mt-4">
       application de recrutement  
      </div>
    </div>

  );
};

export default AppLayout;
