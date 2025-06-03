"use client";

import { useState } from 'react';
import { ChevronDown, ChevronRight, FileText, Download, Settings, Play, Pause, RotateCcw } from 'lucide-react';

const Generator = () => {
  const [topic, setTopic] = useState('');
  const [language, setLanguage] = useState('sl');
  const [citationStyle, setCitationStyle] = useState('APA');
  const [currentStep, setCurrentStep] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [generatedSections, setGeneratedSections] = useState({});
  const [expandedSections, setExpandedSections] = useState({});
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');

  const sections = [
    { id: 1, name: 'Outline', slovenian: 'Oris', length: '250-300 besed' },
    { id: 2, name: 'Introduction', slovenian: 'Uvod', length: '~350 besed' },
    { id: 3, name: 'Literature Review', slovenian: 'Teoretski pregled področja', length: '~1200 besed' },
    { id: 4, name: 'Methodology', slovenian: 'Metodologija', length: '~700 besed' },
    { id: 5, name: 'Results', slovenian: 'Rezultati', length: '~1100 besed' },
    { id: 6, name: 'Discussion', slovenian: 'Diskusija', length: '~450 besed' },
    { id: 7, name: 'Conclusion', slovenian: 'Zaključek', length: '~450 besed' },
    { id: 8, name: 'References', slovenian: 'Literatura in viri', length: 'Po potrebi' }
  ];

  const prompts = {
    1: {
      system: "You are \"Aithor Outline Creator\", an academic writing assistant.",
      user: `Generate a hierarchical outline (~250–300 words) for a research article on <TOPIC> that follows this structure.  
Use Calibri-equivalent 12 pt and Arabic numbering exactly as below; Slovenian headings if LANG = sl, English headings if LANG = en.  
Give ONE summary sentence under each heading about <TOPIC>.

Required major headings (each starts new section):
1  UVOD (or INTRODUCTION if English)
2  TEORETSKI PREGLED PODROČJA (or LITERATURE REVIEW if English)
 2.1  Podpoglavje 1 (or Subsection 1 if English) 
 2.2  Podpoglavje 2 (or Subsection 2 if English)
 2.3  Podpoglavje 3 (or Subsection 3 if English)
3  METODOLOGIJA (or METHODOLOGY if English)
4  REZULTATI (or RESULTS if English)
 4.1  Podpoglavje 1 (or Subsection 1 if English)
 4.2  Podpoglavje 2 (or Subsection 2 if English)
5  DISKUSIJA (or DISCUSSION if English)
6  ZAKLJUČEK (or CONCLUSION if English)
7  LITERATURA IN VIRI (or REFERENCES if English)

Return only the outline with topic-specific content for: <TOPIC>`
    },
    2: {
      system: "You are an academic author drafting the Introduction.",
      user: `Write section 1 UVOD in <LANG>, FOUR paragraphs, total ≈ 350 words for the topic: <TOPIC>.  
Paragraphs:
1. Broad → narrow field; importance.  
2. Problem statement & research questions / goals.  
3. What this project does to address them.  
4. Roadmap of the paper.  
Formatting: Calibri 12 pt, 1.5 line spacing, no sub-headings.  
Embed in-text citations with <CITATION_STYLE> placeholders (e.g., (Author, Year) or [n]).  
Do **not** produce the reference list yet.`
    },
    3: {
      system: "You are an academic literature-review writer.",
      user: `Compose section 2 TEORETSKI PREGLED PODROČJA (~1 200 words) in <LANG> for the topic: <TOPIC>.  
Write 2–3 robust paragraphs per sub-chapter (2.1–2.3) following the provided outline structure.  
• Summarise 5–10 scholarly sources (≥ 1 non-web).  
• Show how each source frames or justifies our work on <TOPIC>.  
• Cite using <CITATION_STYLE>.  
• If you reference a figure, announce it and add caption placeholder: "Slika 1: … [n]".  
Paraphrase—no plagiarism; keep logical flow.`
    },
    4: {
      system: "You are documenting research methodology.",
      user: `Draft section 3 METODOLOGIJA (~700 words) in <LANG> for the research topic: <TOPIC>.  
Paragraph order:  
1. Restate problem + goals/hypotheses for <TOPIC>.  
2. Describe methods, procedures, and tools (languages, frameworks, DBs, libraries) with one-sentence rationale each.  
3-n. Step-by-step process: data acquisition, processing, testing, evaluation metrics.  
Final paragraph: study limitations and key assumptions.  
Cite sources for methods/tools as needed with <CITATION_STYLE>.`
    },
    5: {
      system: "You are reporting research results objectively.",
      user: `Produce section 4 REZULTATI (~1 100 words) in <LANG> for the research on <TOPIC>, split into 4.1 and 4.2.  
For each sub-chapter:  
• Start with a brief aim statement related to <TOPIC>.  
• Present core findings (figures, tables, numerical results, screenshots descriptions).  
• Introduce every figure/table in text and give caption placeholders ("Tabela 1: …").  
No interpretation—save that for Discussion.  
Cite external data sources if used.`
    },
    6: {
      system: "You are analysing and interpreting results.",
      user: `Write section 5 DISKUSIJA (~450 words, no sub-headings) in <LANG> for the research on <TOPIC>.  
Tasks:  
• Interpret key findings from section 4—explain WHY these results occurred for <TOPIC>.  
• Compare with expectations and prior literature about <TOPIC>.  
• Note limitations, anomalies, and suggest improvements or future work for <TOPIC>.  
Use critical reflective tone; cite sources with <CITATION_STYLE>.`
    },
    7: {
      system: "You are summarising the study.",
      user: `Create section 6 ZAKLJUČEK (~450 words) in <LANG> for the research on <TOPIC>.  
Include four concise paragraphs:  
1. Recap aims & methods for studying <TOPIC>.  
2. Main contributions / findings about <TOPIC>.  
3. Practical implications of this <TOPIC> research.  
4. Concrete future research directions for <TOPIC>.  
Avoid introducing new citations unless essential.`
    },
    8: {
      system: "You are a reference-list formatter.",
      user: `Compile the full reference list for every in-text citation, formatted in <CITATION_STYLE>.  
List only works actually cited; sort alphabetically (APA) or numerically (IEEE).  
Include all metadata (authors, year, title, source, URL + access date for web items).  
Return nothing except the formatted list.`
    }
  };

  const callGeminiAPI = async (systemPrompt, userPrompt) => {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${process.env.NEXT_PUBLIC_GEMINI_API_KEY}`;
    
    // Replace all placeholders with actual values
    const processedUserPrompt = userPrompt
      .replace(/<TOPIC>/g, topic)
      .replace(/⟨TOPIC⟩/g, topic)
      .replace(/<LANG>/g, language)
      .replace(/⟨LANG⟩/g, language)
      .replace(/<CITATION_STYLE>/g, citationStyle)
      .replace(/⟨CITATION_STYLE⟩/g, citationStyle);
    
    const processedSystemPrompt = systemPrompt
      .replace(/<TOPIC>/g, topic)
      .replace(/⟨TOPIC⟩/g, topic)
      .replace(/<LANG>/g, language)
      .replace(/⟨LANG⟩/g, language)
      .replace(/<CITATION_STYLE>/g, citationStyle)
      .replace(/⟨CITATION_STYLE⟩/g, citationStyle);

    const requestBody = {
      contents: [{
        parts: [{
          text: `${processedSystemPrompt}\n\n${processedUserPrompt}`
        }]
      }],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192,
      }
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.candidates[0].content.parts[0].text;
    } catch (error) {
      console.error('Error calling Gemini API:', error);
      throw error;
    }
  };

  const generateSection = async (sectionId) => {
    try {
      setError('');
      const prompt = prompts[sectionId];
      
      // Build context from previous sections
      let contextualPrompt = prompt.user;
      
      if (sectionId > 1 && generatedSections[1]) {
        contextualPrompt = `Based on this outline:\n\n${generatedSections[1]}\n\n${contextualPrompt}`;
      }
      
      // Add previous sections context for methodology and beyond
      if (sectionId >= 4) {
        let previousContext = '';
        for (let i = 2; i < sectionId; i++) {
          if (generatedSections[i]) {
            previousContext += `\n\nPrevious Section ${i}:\n${generatedSections[i]}`;
          }
        }
        if (previousContext) {
          contextualPrompt = `${contextualPrompt}\n\nFor context, here are the previous sections:${previousContext}`;
        }
      }
      
      const result = await callGeminiAPI(prompt.system, contextualPrompt);
      
      setGeneratedSections(prev => ({
        ...prev,
        [sectionId]: result
      }));
      
      return result;
    } catch (error) {
      setError(`Napaka pri generiranju razdelka ${sectionId}: ${error.message}`);
      throw error;
    }
  };

  const generateAllSections = async () => {
    if (!topic.trim()) {
      setError('Prosimo, vnesite temo raziskave.');
      return;
    }

    setIsGenerating(true);
    setIsPaused(false);
    setCurrentStep(0);
    setProgress(0);
    setError('');

    try {
      for (let i = 1; i <= 8; i++) {
        if (isPaused) break;
        
        setCurrentStep(i);
        await generateSection(i);
        setProgress((i / 8) * 100);
        
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      if (!isPaused) {
        setCurrentStep(0);
      }
    } catch (error) {
      console.error('Error generating sections:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const pauseGeneration = () => {
    setIsPaused(true);
    setIsGenerating(false);
  };

  const resumeGeneration = async () => {
    if (currentStep === 0) return;
    
    setIsGenerating(true);
    setIsPaused(false);
    
    try {
      for (let i = currentStep + 1; i <= 8; i++) {
        if (isPaused) break;
        
        setCurrentStep(i);
        await generateSection(i);
        setProgress((i / 8) * 100);
        
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      if (!isPaused) {
        setCurrentStep(0);
      }
    } catch (error) {
      console.error('Error resuming generation:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const resetGeneration = () => {
    setCurrentStep(0);
    setIsGenerating(false);
    setIsPaused(false);
    setProgress(0);
    setGeneratedSections({});
    setError('');
  };

  const toggleSection = (sectionId) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  const exportPaper = () => {
    let fullPaper = `# ${topic}\n\n`;
    
    sections.forEach(section => {
      if (generatedSections[section.id]) {
        fullPaper += `## ${section.id}. ${section.slovenian}\n\n`;
        fullPaper += generatedSections[section.id] + '\n\n';
      }
    });

    const blob = new Blob([fullPaper], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${topic.replace(/\s+/g, '_')}_raziskovalni_clanek.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
          <FileText className="h-8 w-8 text-blue-600" />
          Generator
        </h1>
      </div>

      {/* Configuration Panel */}
      <div className="bg-gray-50 rounded-lg p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Settings className="h-5 w-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">Nastavitve</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tema raziskave
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="npr. Umetna inteligenca v izobraževanju"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isGenerating}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Jezik
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isGenerating}
            >
              <option value="sl">Slovenščina</option>
              <option value="en">Angleščina</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Način citiranja
            </label>
            <select
              value={citationStyle}
              onChange={(e) => setCitationStyle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isGenerating}
            >
              <option value="APA">APA</option>
              <option value="IEEE">IEEE</option>
            </select>
          </div>
        </div>
      </div>

      {/* Control Panel */}
      <div className="bg-blue-50 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-blue-900 mb-1">Kontrola generiranja</h3>
            {currentStep > 0 && (
              <p className="text-sm text-blue-700">
                Trenutno: {sections[currentStep - 1]?.slovenian} ({currentStep}/8)
              </p>
            )}
          </div>
          
          <div className="flex gap-2">
            {!isGenerating && !isPaused && (
              <button
                onClick={generateAllSections}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
                disabled={!topic.trim()}
              >
                <Play className="h-4 w-4" />
                Generiraj članek
              </button>
            )}
            
            {isGenerating && (
              <button
                onClick={pauseGeneration}
                className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 flex items-center gap-2"
              >
                <Pause className="h-4 w-4" />
                Prekini
              </button>
            )}
            
            {isPaused && currentStep > 0 && (
              <button
                onClick={resumeGeneration}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-2"
              >
                <Play className="h-4 w-4" />
                Nadaljuj
              </button>
            )}
            
            {Object.keys(generatedSections).length > 0 && (
              <>
                <button
                  onClick={resetGeneration}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 flex items-center gap-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  Ponastavi
                </button>
                
                <button
                  onClick={exportPaper}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Izvozi
                </button>
              </>
            )}
          </div>
        </div>
        
        {/* Progress Bar */}
        {(isGenerating || isPaused || progress > 0) && (
          <div className="mt-4">
            <div className="flex justify-between text-sm text-blue-700 mb-1">
              <span>Napredek</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-blue-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Generated Sections */}
      <div className="space-y-4">
        {sections.map((section) => (
          <div key={section.id} className="border border-gray-200 rounded-lg">
            <button
              onClick={() => toggleSection(section.id)}
              className={`w-full px-4 py-3 flex items-center justify-between text-left ${
                generatedSections[section.id] 
                  ? 'bg-green-50 hover:bg-green-100' 
                  : currentStep === section.id 
                    ? 'bg-blue-50 hover:bg-blue-100'
                    : 'bg-gray-50 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                  generatedSections[section.id]
                    ? 'bg-green-500 text-white'
                    : currentStep === section.id
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-300 text-gray-600'
                }`}>
                  {section.id}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{section.slovenian}</h3>
                  <p className="text-sm text-gray-600">{section.length}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {currentStep === section.id && isGenerating && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                )}
                {expandedSections[section.id] ? (
                  <ChevronDown className="h-5 w-5 text-gray-400" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                )}
              </div>
            </button>
            
            {expandedSections[section.id] && generatedSections[section.id] && (
              <div className="px-4 py-4 border-t border-gray-200 bg-white">
                <div className="prose max-w-none">
                  <pre className="whitespace-pre-wrap font-sans text-sm text-gray-800 leading-relaxed">
                    {generatedSections[section.id]}
                  </pre>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Generator;