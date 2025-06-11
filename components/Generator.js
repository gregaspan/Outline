"use client";

import { useState } from 'react';
import { ChevronRight, FileText, Download, Play, Pause, RotateCcw, Plus } from 'lucide-react';

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
    <div className="min-h-screen bg-white">

      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="mb-8">
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Enter your research topic..."
            className="w-full text-2xl font-medium text-gray-900 placeholder-gray-400 border-none outline-none bg-transparent"
            disabled={isGenerating}
          />
          
          <div className="flex items-center gap-6 mt-4 text-sm text-gray-600">
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="border-none outline-none bg-transparent cursor-pointer hover:text-gray-900"
              disabled={isGenerating}
            >
              <option value="sl">Slovenščina</option>
              <option value="en">English</option>
            </select>
            
            <select
              value={citationStyle}
              onChange={(e) => setCitationStyle(e.target.value)}
              className="border-none outline-none bg-transparent cursor-pointer hover:text-gray-900"
              disabled={isGenerating}
            >
              <option value="APA">APA Style</option>
              <option value="IEEE">IEEE Style</option>
            </select>
          </div>
        </div>

        {topic.trim() && (
          <div className="flex items-center gap-3 mb-8 pb-4 border-b border-gray-100">
            {!isGenerating && !isPaused && (
              <button
                onClick={generateAllSections}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-md hover:bg-gray-800 transition-colors"
              >
                <Play className="h-4 w-4" />
                Generate Paper
              </button>
            )}
            
            {isGenerating && (
              <button
                onClick={pauseGeneration}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                <Pause className="h-4 w-4" />
                Pause
              </button>
            )}
            
            {isPaused && currentStep > 0 && (
              <button
                onClick={resumeGeneration}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-md hover:bg-gray-800 transition-colors"
              >
                <Play className="h-4 w-4" />
                Resume
              </button>
            )}
            
            {Object.keys(generatedSections).length > 0 && (
              <>
                <button
                  onClick={resetGeneration}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <RotateCcw className="h-4 w-4" />
                  Reset
                </button>
                
                <button
                  onClick={exportPaper}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <Download className="h-4 w-4" />
                  Export
                </button>
              </>
            )}
            
            {(isGenerating || isPaused) && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                {isGenerating && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
                )}
                <span>{Math.round(progress)}% complete</span>
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="mb-6 p-3 text-sm text-red-700 bg-red-50 rounded-md border border-red-100">
            {error}
          </div>
        )}

        <div className="space-y-1">
          {sections.map((section) => (
            <div key={section.id}>
              <button
                onClick={() => toggleSection(section.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 text-left rounded-md transition-colors group ${
                  generatedSections[section.id] 
                    ? 'hover:bg-gray-50' 
                    : currentStep === section.id 
                      ? 'bg-blue-50'
                      : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex-shrink-0">
                  {expandedSections[section.id] ? (
                    <ChevronRight className="h-4 w-4 text-gray-400 rotate-90 transition-transform" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-gray-400 transition-transform" />
                  )}
                </div>
                
                <div className="flex items-center gap-3 flex-1">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    generatedSections[section.id]
                      ? 'bg-green-500'
                      : currentStep === section.id
                        ? 'bg-blue-500'
                        : 'bg-gray-300'
                  }`} />
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">
                        {section.id}. {section.slovenian}
                      </span>
                      {currentStep === section.id && isGenerating && (
                        <div className="animate-spin rounded-full h-3 w-3 border-b border-blue-500"></div>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">{section.length}</div>
                  </div>
                </div>
              </button>
              
              {expandedSections[section.id] && generatedSections[section.id] && (
                <div className="ml-10 mt-2 mb-4">
                  <div className="prose prose-sm max-w-none">
                    <div className="p-4 bg-gray-50 rounded-md border border-gray-100">
                      <pre className="whitespace-pre-wrap font-sans text-sm text-gray-800 leading-relaxed">
                        {generatedSections[section.id]}
                      </pre>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
          
          <button className="w-full flex items-center gap-3 px-3 py-2 text-left rounded-md hover:bg-gray-50 transition-colors group opacity-50">
            <Plus className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-500">Add section</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Generator;