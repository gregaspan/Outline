"use client";
import React, { useState, useEffect } from 'react';
import ButtonSignin from "@/components/ButtonSignin";

export default function Page() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="p-6 flex justify-end max-w-7xl mx-auto">
        <ButtonSignin text="Login" />
      </header>

      {/* Main Content */}
      <main className="flex flex-col items-center justify-center min-h-[80vh] px-8">
        <div className={`transition-all duration-1000 ease-out ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          
          {/* Hero Section */}
          <div className="text-center space-y-8 max-w-4xl mx-auto">
            
            {/* Main Heading */}
            <div className="space-y-6">
              <h1 className="text-6xl md:text-7xl font-light tracking-tight text-gray-900">
                Outline
              </h1>
              
              <div className="w-16 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent mx-auto"></div>
              
              <p className="text-xl md:text-2xl text-gray-600 font-light leading-relaxed max-w-2xl mx-auto">
Outline helps Slovenian-speaking students streamline thesis writing by automatically validating document structure, analyzing content, and providing AI-driven feedback.

              </p>
            </div>

            {/* CTA Section */}
            <div className="pt-8">
              <a
                href="https://outline-1.gitbook.io/outline"
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-3 px-8 py-4 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-all duration-300 transform hover:scale-105 hover:shadow-lg text-lg font-medium"
              >
                Learn More
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1"
                >
                  <path
                    fillRule="evenodd"
                    d="M5 10a.75.75 0 01.75-.75h6.638L10.23 7.29a.75.75 0 111.04-1.08l3.5 3.25a.75.75 0 010 1.08l-3.5 3.25a.75.75 0 11-1.04-1.08l2.158-1.96H5.75A.75.75 0 015 10z"
                    clipRule="evenodd"
                  />
                </svg>
              </a>
            </div>
          </div>

          {/* Decorative Elements */}
          <div className="absolute inset-0 -z-10 overflow-hidden">
            <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-gray-50 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse"></div>
            <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-gray-100 rounded-full mix-blend-multiply filter blur-xl opacity-50 animate-pulse" style={{animationDelay: '2s'}}></div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="pb-8">
        <div className="max-w-7xl mx-auto px-8">
          <div className="flex justify-center">
            <div className="flex space-x-8 text-sm text-gray-500">
              <span className="hover:text-gray-700 transition-colors cursor-pointer">About</span>
              <span className="hover:text-gray-700 transition-colors cursor-pointer">Contact</span>
              <span className="hover:text-gray-700 transition-colors cursor-pointer">Privacy</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}