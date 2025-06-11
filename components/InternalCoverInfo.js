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
        return <FileText className="h-4 w-4 text-gray-400" />;
      case 'type':
        return <BookOpen className="h-4 w-4 text-gray-400" />;
      case 'student':
        return <GraduationCap className="h-4 w-4 text-gray-400" />;
      case 'program':
        return <BookOpen className="h-4 w-4 text-gray-400" />;
      case 'smer':
        return <BookOpen className="h-4 w-4 text-gray-400" />;
      case 'mentor':
        return <UserCheck className="h-4 w-4 text-gray-400" />;
      case 'somentor':
        return <Users className="h-4 w-4 text-gray-400" />;
      case 'lektor':
        return <Pencil className="h-4 w-4 text-gray-400" />;
      default:
        return <User className="h-4 w-4 text-gray-400" />;
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
  ].filter(field => field.value);

  return (
    <div className="max-w-4xl mx-auto bg-white">
      <div className="mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-2 leading-tight">
          {title || "Notranja naslovna stran"}
        </h1>
        <div className="w-16 h-1 bg-gray-200 rounded-full"></div>
      </div>

      <div className="space-y-8">
        {fields.map((field, index) => (
          <div key={field.key} className="group">
            <div className="flex items-start gap-4 py-3 hover:bg-gray-50 -mx-2 px-2 rounded-md transition-colors duration-150">
              <div className="flex-shrink-0 mt-1.5">
                {getIcon(field.key)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-500 mb-1">
                  {getLabel(field.key)}
                </div>
                <div className="text-base text-gray-900 leading-relaxed">
                  {field.value}
                </div>
              </div>
            </div>
            {index < fields.length - 1 && (
              <div className="border-b border-gray-100 mt-3 ml-8"></div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}