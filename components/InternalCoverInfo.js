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

  const getEmoji = (field) => {
    switch (field) {
      case 'type':
        return '📄';
      case 'student':
        return '🎓';
      case 'program':
        return '📚';
      case 'smer':
        return '🎯';
      case 'mentor':
        return '👨‍🏫';
      case 'somentor':
        return '👥';
      case 'lektor':
        return '✏️';
      default:
        return '👤';
    }
  };

  const getLabel = (field) => {
    const labels = {
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
    <div className="mb-12 pb-8 border-b border-gray-100">
      {/* Title */}
      {title && (
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2 leading-tight">
            {title}
          </h2>
        </div>
      )}

      {/* Properties */}
      <div className="space-y-3">
        {fields.map((field) => (
          <div 
            key={field.key} 
            className="flex items-center py-1 hover:bg-gray-50 rounded px-2 -mx-2 transition-colors duration-150"
          >
            <div className="flex items-center min-w-0 flex-1">
              <span className="text-lg mr-3 flex-shrink-0">
                {getEmoji(field.key)}
              </span>
              <div className="flex items-center min-w-0 flex-1">
                <span className="text-sm text-gray-500 mr-8 flex-shrink-0 w-32">
                  {getLabel(field.key)}
                </span>
                <span className="text-sm text-gray-900 min-w-0 flex-1">
                  {field.value}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Subtle indicator */}
      <div className="mt-6 flex items-center text-xs text-gray-400">
        <div className="w-1.5 h-1.5 bg-green-400 rounded-full mr-2"></div>
        Document metadata
      </div>
    </div>
  );
}