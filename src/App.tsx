import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
} from "@clerk/clerk-react";
import { AppProvider } from './context/AppContext';
import Layout from "./components/Layout";
import VerifyUserIsolation from './components/VerifyUserIsolation';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/*" element={
          <>
            <SignedOut>
              <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
                <div className="text-center space-y-8 p-8">
                  {/* Logo */}
                  <div className="flex justify-center mb-8">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 via-purple-600 to-blue-700 flex items-center justify-center shadow-2xl shadow-blue-500/25">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  </div>
                  
                  {/* Welcome Text */}
                  <div className="space-y-4">
                    <h1 className="text-5xl font-bold text-white tracking-tight">
                      Welcome to <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Dilly's Dally</span>
                    </h1>
                    <p className="text-xl text-gray-300 max-w-md mx-auto">
                      Your personal journaling and habit tracking companion
                    </p>
                  </div>

                  {/* Auth Buttons */}
                  <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
                    <SignInButton>
                      <button className="px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-2xl hover:from-blue-700 hover:to-blue-800 transition-all duration-300 font-semibold shadow-xl shadow-blue-500/25 transform hover:scale-105">
                        Sign In
                      </button>
                    </SignInButton>
                    <SignUpButton>
                      <button className="px-8 py-4 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-2xl hover:from-purple-700 hover:to-purple-800 transition-all duration-300 font-semibold shadow-xl shadow-purple-500/25 transform hover:scale-105">
                        Get Started
                      </button>
                    </SignUpButton>
                  </div>

                  {/* Features Preview */}
                  <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                    <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                      <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center mb-4 mx-auto">
                        <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold text-white mb-2">Daily Journaling</h3>
                      <p className="text-gray-300 text-sm">Reflect on your thoughts and experiences with our intuitive journaling interface.</p>
                    </div>

                    <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                      <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center mb-4 mx-auto">
                        <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold text-white mb-2">Habit Tracking</h3>
                      <p className="text-gray-300 text-sm">Build better habits and track your progress with beautiful visualizations.</p>
                    </div>

                    <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                      <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center mb-4 mx-auto">
                        <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold text-white mb-2">Progress Analytics</h3>
                      <p className="text-gray-300 text-sm">Gain insights into your personal growth with detailed analytics and trends.</p>
                    </div>
                  </div>
                </div>
              </div>
            </SignedOut>
            
            <SignedIn>
              <AppProvider>
                <Routes>
                  <Route path="/" element={<Layout />} />
                  <Route path="/verify" element={<VerifyUserIsolation />} />
                </Routes>
              </AppProvider>
            </SignedIn>
          </>
        } />
      </Routes>
    </Router>
  );
}

export default App;