import React from "react";
import { FileText, GraduationCap, User, BookOpen, UserCheck, Users, Pencil } from "lucide-react";

export default function InternalCoverInfo({ info }) {
  if (!info) return null;
  
  const {
    title,
    type,
    student,
    program,
    smer,
    mentor,
    somentor,
    lektor,
  } = info;

  const getIcon = (field) => {
    switch (field) {
      case 'title':
        return <FileText className="h-5 w-5 text-blue-600" />;
      case 'type':
        return <BookOpen className="h-5 w-5 text-purple-600" />;
      case 'student':
        return <GraduationCap className="h-5 w-5 text-green-600" />;
      case 'program':
        return <BookOpen className="h-5 w-5 text-indigo-600" />;
      case 'smer':
        return <BookOpen className="h-5 w-5 text-teal-600" />;
      case 'mentor':
        return <UserCheck className="h-5 w-5 text-orange-600" />;
      case 'somentor':
        return <Users className="h-5 w-5 text-amber-600" />;
      case 'lektor':
        return <Pencil className="h-5 w-5 text-red-600" />;
      default:
        return <User className="h-5 w-5 text-gray-600" />;
    }
  };

  const getLabel = (field) => {
    const labels = {
      title: 'Naslov dela',
      type: 'Vrsta dela',
      student: 'Študent(ka)',
      program: 'Študijski program',
      smer: 'Smer',
      mentor: 'Mentor(ica)',
      somentor: 'Somentor(ica)',
      lektor: 'Lektor(ica)'
    };
    return labels[field] || field;
  };

  const fields = [
    { key: 'type', value: type },
    { key: 'student', value: student },
    { key: 'program', value: program },
    { key: 'smer', value: smer },
    { key: 'mentor', value: mentor },
    { key: 'somentor', value: somentor },
    { key: 'lektor', value: lektor }
  ].filter(field => field.value); // Only include fields with values

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-slate-50 via-white to-blue-50 border border-slate-200 rounded-2xl shadow-xl mb-8">
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full opacity-30 -translate-y-16 translate-x-16"></div>
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-green-100 to-teal-100 rounded-full opacity-30 translate-y-12 -translate-x-12"></div>
      
      <div className="relative p-8">
        {/* Header */}
        <div className="flex items-center mb-8">
          <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl shadow-lg mr-4">
            <FileText className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{title || "Notranja naslovna stran"}</h2>
            <p className="text-sm text-gray-600 mt-1">Osnovne informacije o dokumentu</p>
          </div>
        </div>

        {/* Content Grid */}
        <div className="space-y-6">
          {/* Fields in responsive grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {fields.map((field) => (
              <div
                key={field.key}
                className="bg-white/70 backdrop-blur-sm border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-200 hover:border-gray-300"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1">
                    {getIcon(field.key)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">
                      {getLabel(field.key)}
                    </div>
                    <div className="text-base text-gray-900 font-medium leading-relaxed">
                      {field.value}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}