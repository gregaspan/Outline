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
        if (score >= 90) return 'bg-green-50 border-green-200';
        if (score >= 70) return 'bg-yellow-50 border-yellow-200';
        return 'bg-red-50 border-red-200';
    };

    const SectionItem = ({ name, found, sectionKey }) => {
        const isMarkedAsFound = falsePositives.has(sectionKey);
        const effectivelyFound = found || isMarkedAsFound;

        return (
            <div className="flex items-center justify-between py-2 px-3 hover:bg-gray-50 rounded-md transition-colors group">
                <div className="flex items-center space-x-3">
                    {effectivelyFound ? (
                        <div className="w-4 h-4 rounded-full bg-green-100 flex items-center justify-center">
                            <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        </div>
                    ) : (
                        <div className="w-4 h-4 rounded-full border-2 border-gray-300"></div>
                    )}
                    <span className={`text-sm ${
                        effectivelyFound ? 'text-gray-900' : 'text-gray-500'
                    }`}>
                        {name}
                    </span>
                    {isMarkedAsFound && (
                        <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
                            Manual
                        </span>
                    )}
                </div>
                {!found && (
                    <button
                        onClick={() => toggleFalsePositive(sectionKey)}
                        className={`opacity-0 group-hover:opacity-100 p-1 rounded transition-all ${
                            isMarkedAsFound
                                ? 'bg-blue-100 text-blue-600 hover:bg-blue-200 opacity-100'
                                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                        }`}
                        title={isMarkedAsFound ? 'Mark as missing' : 'Mark as found'}
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
        <div className="bg-white border border-gray-100 rounded-lg p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-1">
                        Structure Analysis
                    </h3>
                    <p className="text-sm text-gray-500">
                        Document structure completeness assessment
                    </p>
                </div>
                <div className={`px-4 py-3 rounded-lg border ${getScoreBackground(structureScore)}`}>
                    <div className="text-center">
                        <div className={`text-2xl font-bold ${getScoreColor(structureScore)}`}>
                            {structureScore}%
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                            Score
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                        <h4 className="font-medium text-gray-900">Structure Check</h4>
                        <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                            {frontMatterCount}/{Object.keys(frontMatter).length}
                        </span>
                    </div>
                    <div className="space-y-1">
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

                <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                        <h4 className="font-medium text-gray-900">Content Analysis</h4>
                        <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                            {bodyCount}/{Object.keys(bodySections).length}
                        </span>
                    </div>
                    <div className="space-y-1">
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

            <div className="pt-6 border-t border-gray-100">
                <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-green-50/50 rounded-lg">
                        <div className="text-2xl font-bold text-green-600 mb-1">
                            {totalFound + falsePositives.size}
                        </div>
                        <div className="text-xs text-gray-500 uppercase tracking-wide">
                            Found
                        </div>
                    </div>
                    <div className="text-center p-4 bg-red-50/50 rounded-lg">
                        <div className="text-2xl font-bold text-red-600 mb-1">
                            {totalSections - totalFound - falsePositives.size}
                        </div>
                        <div className="text-xs text-gray-500 uppercase tracking-wide">
                            Missing
                        </div>
                    </div>
                    <div className="text-center p-4 bg-blue-50/50 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600 mb-1">
                            {falsePositives.size}
                        </div>
                        <div className="text-xs text-gray-500 uppercase tracking-wide">
                            Manual
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-gray-50/50 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                    <div className="text-amber-500 mt-0.5">💡</div>
                    <div className="text-sm text-gray-700">
                        <div className="font-medium mb-2">Score Interpretation</div>
                        <div className="space-y-1 text-xs leading-relaxed">
                            <div className="flex items-center space-x-2">
                                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                                <span><span className="font-medium">90-100%</span> Excellent structure</span>
                            </div>
                            <div className="flex items-center space-x-2">
                                <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                                <span><span className="font-medium">70-89%</span> Good structure with minor issues</span>
                            </div>
                            <div className="flex items-center space-x-2">
                                <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                                <span><span className="font-medium">0-69%</span> Needs significant structural improvements</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ResultSummary;