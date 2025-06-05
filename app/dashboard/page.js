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
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-100 p-6 rounded-xl border border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Welcome Back</h3>
                    <p className="text-sm text-gray-600 mt-1">You're successfully signed in</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                    <Home className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-green-50 to-emerald-100 p-6 rounded-xl border border-green-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Generator</h3>
                    <p className="text-sm text-gray-600 mt-1">Create amazing content</p>
                  </div>
                  <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
                    <Zap className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-purple-50 to-violet-100 p-6 rounded-xl border border-purple-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Editor</h3>
                    <p className="text-sm text-gray-600 mt-1">Write and edit documents</p>
                  </div>
                  <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center">
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button 
                  onClick={() => setActiveTab('generator')}
                  className="flex items-center p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors duration-200 group"
                >
                  <Zap className="w-5 h-5 text-green-500 mr-3" />
                  <span className="text-gray-700 group-hover:text-gray-900">Start Generator</span>
                  <ChevronRight className="w-4 h-4 text-gray-400 ml-auto group-hover:text-gray-600" />
                </button>
                <button 
                  onClick={() => setActiveTab('editor')}
                  className="flex items-center p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors duration-200 group"
                >
                  <FileText className="w-5 h-5 text-purple-500 mr-3" />
                  <span className="text-gray-700 group-hover:text-gray-900">Open Editor</span>
                  <ChevronRight className="w-4 h-4 text-gray-400 ml-auto group-hover:text-gray-600" />
                </button>
              </div>
            </div>
          </div>
        );
      case 'generator':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-gray-900">Generator</h1>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <Generator />
            </div>
          </div>
        );
      case 'editor':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-gray-900">Editor</h1>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <NotionEditor />
            </div>
          </div>
        );
      case 'settings':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
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
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="p-2 bg-white rounded-lg shadow-md border border-gray-200"
        >
          {sidebarCollapsed ? <Menu className="w-5 h-5" /> : <X className="w-5 h-5" />}
        </button>
      </div>

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out ${
        sidebarCollapsed ? '-translate-x-full lg:translate-x-0' : 'translate-x-0'
      }`}>
        <div className="flex flex-col h-full">
          {/* Logo/Brand */}
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Outline</h2>
            <div className="mt-3">
              <ButtonAccount />
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setSidebarCollapsed(true); // Close mobile menu
                  }}
                  className={`w-full flex items-center px-4 py-3 text-left rounded-lg transition-colors duration-200 ${
                    activeTab === item.id
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Icon className={`w-5 h-5 mr-3 ${
                    activeTab === item.id ? 'text-blue-500' : 'text-gray-400'
                  }`} />
                  <span className="font-medium">{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* External Links Section */}
          <div className="px-4 pb-4">
            <div className="border-t border-gray-200 pt-4">
              <h3 className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                External Resources
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
                      className="w-full flex items-center px-4 py-3 text-left rounded-lg transition-colors duration-200 text-gray-700 hover:bg-gray-50 hover:text-gray-900 group"
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
          <div className="p-4 border-t border-gray-200">
            <div className="text-xs text-gray-500 text-center">
              © 2025 Outline
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:ml-64">
        <main className="p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {renderContent()}
          </div>
        </main>
      </div>

      {/* Mobile overlay */}
      {!sidebarCollapsed && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setSidebarCollapsed(true)}
        />
      )}
    </div>
  );
}