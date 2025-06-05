import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Eye, EyeOff } from 'lucide-react';

const ResultSummary = ({ frontMatter, bodySections }) => {
    const [falsePositives, setFalsePositives] = useState(new Set());
    const [structureScore, setStructureScore] = useState(0);

    // Calculate structure score
    useEffect(() => {
        if (!frontMatter || !bodySections) return;

        const allSections = { ...frontMatter, ...bodySections };
        const totalSections = Object.keys(allSections).length;
        const foundSections = Object.values(allSections).filter(Boolean).length;
        const markedAsFound = falsePositives.size;
        
        const adjustedFound = foundSections + markedAsFound;
        const score = Math.round((adjustedFound / totalSections) * 100);
        setStructureScore(Math.min(100, score));
    }, [frontMatter, bodySections, falsePositives]);

    const toggleFalsePositive = (sectionKey) => {
        const newFalsePositives = new Set(falsePositives);
        if (newFalsePositives.has(sectionKey)) {
            newFalsePositives.delete(sectionKey);
        } else {
            newFalsePositives.add(sectionKey);
        }
        setFalsePositives(newFalsePositives);
    };

    const getScoreColor = (score) => {
        if (score >= 90) return 'text-green-600';
        if (score >= 70) return 'text-yellow-600';
        return 'text-red-600';
    };

    const getScoreBackground = (score) => {
        if (score >= 90) return 'bg-green-100 border-green-200';
        if (score >= 70) return 'bg-yellow-100 border-yellow-200';
        return 'bg-red-100 border-red-200';
    };

    const SectionItem = ({ name, found, sectionKey }) => {
        const isMarkedAsFound = falsePositives.has(sectionKey);
        const effectivelyFound = found || isMarkedAsFound;

        return (
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                    {effectivelyFound ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                        <XCircle className="w-5 h-5 text-red-500" />
                    )}
                    <span className={`text-sm font-medium ${
                        effectivelyFound ? 'text-gray-900' : 'text-gray-600'
                    }`}>
                        {name}
                    </span>
                    {isMarkedAsFound && (
                        <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                            Najdeno/nepotrebno
                        </span>
                    )}
                </div>
                {!found && (
                    <button
                        onClick={() => toggleFalsePositive(sectionKey)}
                        className={`p-1 rounded-md transition-colors ${
                            isMarkedAsFound
                                ? 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                                : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                        }`}
                        title={isMarkedAsFound ? 'Označi kot manjkajoče' : 'Označi kot najdeno'}
                    >
                        {isMarkedAsFound ? (
                            <EyeOff className="w-4 h-4" />
                        ) : (
                            <Eye className="w-4 h-4" />
                        )}
                    </button>
                )}
            </div>
        );
    };

    if (!frontMatter || !bodySections) {
        return null;
    }

    const frontMatterCount = Object.values(frontMatter).filter(Boolean).length;
    const bodyCount = Object.values(bodySections).filter(Boolean).length;
    const totalFound = frontMatterCount + bodyCount;
    const totalSections = Object.keys(frontMatter).length + Object.keys(bodySections).length;

    return (
        <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                    Povzetek analize strukture
                </h3>
                <div className={`px-4 py-2 rounded-lg border-2 ${getScoreBackground(structureScore)}`}>
                    <div className="text-center">
                        <div className={`text-2xl font-bold ${getScoreColor(structureScore)}`}>
                            {structureScore}%
                        </div>
                        <div className="text-xs text-gray-600">
                            Ocena primernosti
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                {/* Front Matter Sections */}
                <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                        <h4 className="font-medium text-gray-900">Preverjanje strukture</h4>
                        <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                            {frontMatterCount}/{Object.keys(frontMatter).length}
                        </span>
                    </div>
                    <div className="space-y-2">
                        {Object.entries(frontMatter).map(([key, found]) => (
                            <SectionItem
                                key={key}
                                name={key}
                                found={found}
                                sectionKey={`front_${key}`}
                            />
                        ))}
                    </div>
                </div>

                {/* Body Sections */}
                <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                        <h4 className="font-medium text-gray-900">Analiza vsebine</h4>
                        <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                            {bodyCount}/{Object.keys(bodySections).length}
                        </span>
                    </div>
                    <div className="space-y-2">
                        {Object.entries(bodySections).map(([key, found]) => (
                            <SectionItem
                                key={key}
                                name={key}
                                found={found}
                                sectionKey={`body_${key}`}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* Overall Statistics */}
            <div className="border-t pt-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="p-3 bg-green-50 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">
                            {totalFound + falsePositives.size}
                        </div>
                        <div className="text-xs text-gray-600">Najdeno</div>
                    </div>
                    <div className="p-3 bg-red-50 rounded-lg">
                        <div className="text-2xl font-bold text-red-600">
                            {totalSections - totalFound - falsePositives.size}
                        </div>
                        <div className="text-xs text-gray-600">Manjka</div>
                    </div>
                    <div className="p-3 bg-blue-50 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">
                            {falsePositives.size}
                        </div>
                        <div className="text-xs text-gray-600">Označeno</div>
                    </div>
                </div>
            </div>

            {/* Score Interpretation */}
            <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-start space-x-2">
                    <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5" />
                    <div className="text-sm text-gray-700">
                        <div className="font-medium mb-1">Interpretacija ocene:</div>
                        <div className="space-y-1 text-xs">
                            <div>• <span className="text-green-600 font-medium">90-100%</span>: Odlična struktura</div>
                            <div>• <span className="text-yellow-600 font-medium">70-89%</span>: Dobra struktura z manjšimi pomanjkljivostmi</div>
                            <div>• <span className="text-red-600 font-medium">0-69%</span>: Potrebne večje popravke strukture</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ResultSummary;