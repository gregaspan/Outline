"use client";

import { useState } from 'react';
import ButtonAccount from "@/components/ButtonAccount";
import NotionEditor from "@/components/Editor";
import Generator from "@/components/Generator";
import ProfileSettings from "@/components/ProfileSettings";
import { 
  Home, 
  Settings, 
  FileText, 
  Zap, 
  Menu, 
  X,
  ChevronRight,
  BookOpen,
  Code2,
  ExternalLink
} from 'lucide-react';

export const dynamic = "force-dynamic";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const navigationItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'generator', label: 'Generator', icon: Zap },
    { id: 'editor', label: 'Editor', icon: FileText },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const externalLinks = [
    { 
      label: 'Documentation', 
      href: 'https://outline-1.gitbook.io/outline', 
      icon: BookOpen,
      description: 'View documentation'
    },
    { 
      label: 'FastAPI', 
      href: 'https://outline-api.onrender.com/docs', 
      icon: Code2,
      description: 'FastAPI framework'
    },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="space-y-8">
            <div className="space-y-2">
              <h1 className="text-3xl font-light tracking-tight text-gray-900">
                Welcome back
              </h1>
              <p className="text-gray-600 font-light">
                Continue where you left off
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 bg-white rounded-lg border border-gray-100 hover:border-gray-200 transition-all duration-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Dashboard</h3>
                    <p className="text-lg font-light text-gray-900 mt-1">Overview</p>
                  </div>
                  <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center">
                    <Home className="w-5 h-5 text-gray-600" />
                  </div>
                </div>
              </div>
              
              <div className="p-6 bg-white rounded-lg border border-gray-100 hover:border-gray-200 transition-all duration-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Generator</h3>
                    <p className="text-lg font-light text-gray-900 mt-1">Create</p>
                  </div>
                  <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center">
                    <Zap className="w-5 h-5 text-gray-600" />
                  </div>
                </div>
              </div>
              
              <div className="p-6 bg-white rounded-lg border border-gray-100 hover:border-gray-200 transition-all duration-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Editor</h3>
                    <p className="text-lg font-light text-gray-900 mt-1">Write</p>
                  </div>
                  <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center">
                    <FileText className="w-5 h-5 text-gray-600" />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <h2 className="text-xl font-light text-gray-900">Quick Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button 
                  onClick={() => setActiveTab('generator')}
                  className="flex items-center p-6 bg-white border border-gray-100 rounded-lg hover:border-gray-200 transition-all duration-200 group text-left"
                >
                  <Zap className="w-5 h-5 text-gray-400 mr-4 group-hover:text-gray-600" />
                  <div className="flex-1">
                    <span className="text-gray-900 font-medium">Start Generator</span>
                    <p className="text-sm text-gray-500 mt-1">Create amazing content</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500" />
                </button>
                <button 
                  onClick={() => setActiveTab('editor')}
                  className="flex items-center p-6 bg-white border border-gray-100 rounded-lg hover:border-gray-200 transition-all duration-200 group text-left"
                >
                  <FileText className="w-5 h-5 text-gray-400 mr-4 group-hover:text-gray-600" />
                  <div className="flex-1">
                    <span className="text-gray-900 font-medium">Open Editor</span>
                    <p className="text-sm text-gray-500 mt-1">Write and edit documents</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500" />
                </button>
              </div>
            </div>
          </div>
        );
      case 'generator':
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <h1 className="text-3xl font-light tracking-tight text-gray-900">Generator</h1>
              <p className="text-gray-600 font-light">Create amazing content with AI</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
              <Generator />
            </div>
          </div>
        );
      case 'editor':
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <h1 className="text-3xl font-light tracking-tight text-gray-900">Editor</h1>
              <p className="text-gray-600 font-light">Write and edit your documents</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
              <NotionEditor />
            </div>
          </div>
        );
      case 'settings':
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <h1 className="text-3xl font-light tracking-tight text-gray-900">Settings</h1>
              <p className="text-gray-600 font-light">Manage your account and preferences</p>
            </div>
            <ProfileSettings />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-6 left-6 z-50">
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="p-2 bg-white rounded-lg shadow-sm border border-gray-200 hover:border-gray-300 transition-colors duration-200"
        >
          {sidebarCollapsed ? <Menu className="w-5 h-5 text-gray-600" /> : <X className="w-5 h-5 text-gray-600" />}
        </button>
      </div>

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-gray-100 transform transition-transform duration-300 ease-in-out ${
        sidebarCollapsed ? '-translate-x-full lg:translate-x-0' : 'translate-x-0'
      }`}>
        <div className="flex flex-col h-full">
          {/* Logo/Brand */}
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-xl font-light tracking-tight text-gray-900">Outline</h2>
            <div className="mt-4">
              <ButtonAccount />
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setSidebarCollapsed(true); // Close mobile menu
                  }}
                  className={`w-full flex items-center px-4 py-3 text-left rounded-lg transition-all duration-200 ${
                    activeTab === item.id
                      ? 'bg-gray-100 text-gray-900'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Icon className={`w-5 h-5 mr-3 ${
                    activeTab === item.id ? 'text-gray-700' : 'text-gray-400'
                  }`} />
                  <span className="font-medium">{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* External Links Section */}
          <div className="px-4 pb-4">
            <div className="border-t border-gray-100 pt-6">
              <h3 className="px-4 py-2 text-xs font-medium text-gray-400 uppercase tracking-wider">
                Resources
              </h3>
              <div className="space-y-1">
                {externalLinks.map((link) => {
                  const Icon = link.icon;
                  return (
                    <a
                      key={link.label}
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center px-4 py-3 text-left rounded-lg transition-all duration-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900 group"
                      title={link.description}
                    >
                      <Icon className="w-5 h-5 mr-3 text-gray-400 group-hover:text-gray-600" />
                      <span className="font-medium flex-1">{link.label}</span>
                      <ExternalLink className="w-4 h-4 text-gray-300 group-hover:text-gray-500" />
                    </a>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Bottom section */}
          <div className="p-6 border-t border-gray-100">
            <div className="text-xs text-gray-400 text-center font-light">
              © 2025 Outline
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:ml-64">
        <main className="p-8 lg:p-12">
          <div className="max-w-6xl mx-auto">
            {renderContent()}
          </div>
        </main>
      </div>

      {/* Mobile overlay */}
      {!sidebarCollapsed && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-20 z-30 lg:hidden backdrop-blur-sm"
          onClick={() => setSidebarCollapsed(true)}
        />
      )}

      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-gray-100 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{animationDelay: '2s'}}></div>
      </div>
    </div>
  );
}