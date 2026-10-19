/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { parseExamText } from '../../utils/questionParser';
import {
  ParseResult,
  RawParsedQuestion,
  ImportQuestionType,
  IMPORT_TYPE_CONFIGS,
} from '../../types/questionImport';
import { Button } from '../ui/Button';
import {
  X,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  ArrowRight,
  RotateCcw,
  Sparkles,
  ChevronLeft,
  Check,
  Info,
  Upload,
  ListOrdered,
  CheckSquare,
  ListChecks,
  PenLine,
  FormInput,
  ArrowLeftRight,
  BookOpen,
} from 'lucide-react';

interface QuestionImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  destinationSectionTitle?: string | null;
  isDestinationInvalid?: boolean;
  onImportQuestions: (
    parsedQuestions: RawParsedQuestion[],
    readingPassage?: { title?: string; passage: string }
  ) => void;
}

export function QuestionImportModal({
  isOpen,
  onClose,
  destinationSectionTitle,
  isDestinationInvalid = false,
  onImportQuestions,
}: QuestionImportModalProps) {
  const [selectedType, setSelectedType] = useState<ImportQuestionType | null>(null);
  const [activeStep, setActiveStep] = useState<'select_type' | 'input' | 'preview'>('select_type');
  const [inputText, setInputText] = useState('');
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [warningsAcknowledged, setWarningsAcknowledged] = useState(false);
  const [destinationError, setDestinationError] = useState<string | null>(null);


  // Reset state whenever modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedType(null);
      setActiveStep('select_type');
      setInputText('');
      setParseResult(null);
      setWarningsAcknowledged(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentConfig = selectedType ? IMPORT_TYPE_CONFIGS[selectedType] : null;

  const handleSelectType = (type: ImportQuestionType) => {
    // If switching types, clear previous parse result
    if (selectedType !== type) {
      setParseResult(null);
      // If text matches the previous type sample, replace with new type sample
      if (selectedType && inputText === IMPORT_TYPE_CONFIGS[selectedType].sampleText) {
        setInputText(IMPORT_TYPE_CONFIGS[type].sampleText);
      }
    }
    setSelectedType(type);
    setActiveStep('input');
  };

  const handleParse = () => {
    if (!selectedType) return;
    const result = parseExamText(inputText, selectedType);
    setParseResult(result);
    setWarningsAcknowledged(false);
    setActiveStep('preview');
  };

  const handleLoadSample = () => {
    if (currentConfig) {
      setInputText(currentConfig.sampleText);
    }
  };

  const handleClear = () => {
    setInputText('');
    setParseResult(null);
  };

  const handleExecuteImport = () => {
    if (isDestinationInvalid) {
      setDestinationError('The selected section is no longer available. Please choose a valid section or refresh.');
      return;
    }
    if (!parseResult || parseResult.hasErrors) return;

    // Filter valid questions
    const valid = parseResult.questions.filter((q) => q.status !== 'ERROR');
    onImportQuestions(valid, parseResult.readingPassage);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-[#FCFCFA] rounded-2xl border border-[#DCE4EE] shadow-2xl max-w-4xl w-full p-4 sm:p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#DCE4EE] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#EEF5FF] text-[#2563EB] flex items-center justify-center border border-[#DCE4EE] shrink-0">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-extrabold text-[#173B72]">
                  {destinationSectionTitle ? `Import Questions into ${destinationSectionTitle}` : 'Import Questions into Test'}
                </h2>
                {destinationSectionTitle && (
                  <span className="text-2xs font-mono font-bold px-2 py-0.5 rounded-md bg-orange-100/90 text-orange-800 border border-orange-300">
                    Destination: {destinationSectionTitle}
                  </span>
                )}
                {selectedType && (
                  <span
                    className={`text-2xs font-bold px-2 py-0.5 rounded-full border ${
                      selectedType === 'multiple_choice'
                        ? 'bg-[#EEF5FF] text-[#2563EB] border-blue-200'
                        : selectedType === 'multiple_select'
                        ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                        : selectedType === 'short_answer'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : selectedType === 'fill_blank'
                        ? 'bg-teal-50 text-teal-700 border-teal-200'
                        : selectedType === 'matching'
                        ? 'bg-purple-50 text-purple-700 border-purple-200'
                        : selectedType === 'ordering'
                        ? 'bg-sky-50 text-sky-700 border-sky-200'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}
                  >
                    {IMPORT_TYPE_CONFIGS[selectedType].label}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                {activeStep === 'select_type'
                  ? 'Choose a question format to start importing.'
                  : activeStep === 'input'
                  ? `Paste questions in the established ${currentConfig?.label} Main Format.`
                  : 'Review parsed questions and validation status before importing.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Close import dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Scrollable */}
        <div className="flex-1 overflow-y-auto space-y-5 pr-1">
          {/* Invalid destination warning if section was deleted */}
          {(isDestinationInvalid || destinationError) && (
            <div className="bg-rose-50 border-2 border-rose-300 rounded-xl p-3.5 sm:p-4 flex items-start gap-2.5 text-rose-800">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold">Destination Section Unavailable</p>
                <p className="text-2xs text-rose-700 mt-0.5">
                  {destinationError || 'The selected section could not be found or was removed. Questions cannot be imported into an invalid section.'}
                </p>
              </div>
            </div>
          )}

          {/* STEP 1: CHOOSE QUESTION TYPE */}
          {activeStep === 'select_type' && (
            <div className="space-y-4">
              <div className="bg-[#EEF5FF] border border-blue-200/80 rounded-xl p-3.5 sm:p-4 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-[#2563EB] shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-[#173B72]">
                    Select Question Format
                  </p>
                  <p className="text-2xs sm:text-xs text-slate-600 leading-relaxed">
                    Assessora uses dedicated Main Format parsers and validators for each question type.
                    Choose the format you want to import below. Mixed-type imports in a single operation are not supported.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-1">
                {/* Option 1: Multiple Choice */}
                <div
                  onClick={() => handleSelectType('multiple_choice')}
                  className="group relative bg-white border-2 border-[#DCE4EE] hover:border-[#2563EB] hover:shadow-md rounded-2xl p-4 sm:p-4.5 transition-all cursor-pointer flex flex-col justify-between space-y-3.5"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="w-8 h-8 rounded-lg bg-[#EEF5FF] text-[#2563EB] flex items-center justify-center border border-blue-200 group-hover:scale-105 transition-transform">
                        <ListOrdered className="w-4 h-4" />
                      </div>
                      <span className="text-3xs font-bold font-mono px-2 py-0.5 rounded-full bg-[#EEF5FF] text-[#2563EB] border border-blue-200">
                        1 Answer
                      </span>
                    </div>

                    <div>
                      <h3 className="text-sm font-extrabold text-[#173B72] group-hover:text-[#2563EB] transition-colors">
                        Multiple Choice
                      </h3>
                      <p className="text-2xs text-slate-600 mt-0.5 leading-relaxed">
                        4 options (A-D) and 1 correct answer letter.
                      </p>
                    </div>

                    <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-2 font-mono text-3xs text-slate-700 space-y-0.5">
                      <p className="text-slate-400 font-semibold mb-0.5 text-3xs uppercase tracking-wider">Example:</p>
                      <p className="text-[#173B72] font-semibold truncate">1. Capital of France?</p>
                      <p>A. London</p>
                      <p>B. Paris</p>
                      <p className="text-emerald-700 font-semibold pt-0.5">ANSWER: B</p>
                    </div>
                  </div>

                  <Button
                    variant="primary"
                    size="sm"
                    className="w-full justify-center group-hover:bg-[#1D4ED8] text-xs py-1.5"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectType('multiple_choice');
                    }}
                    rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                  >
                    Select MC
                  </Button>
                </div>

                {/* Option 2: True / False */}
                <div
                  onClick={() => handleSelectType('true_false')}
                  className="group relative bg-white border-2 border-[#DCE4EE] hover:border-emerald-500 hover:shadow-md rounded-2xl p-4 sm:p-4.5 transition-all cursor-pointer flex flex-col justify-between space-y-3.5"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200 group-hover:scale-105 transition-transform">
                        <CheckSquare className="w-4 h-4" />
                      </div>
                      <span className="text-3xs font-bold font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        True / False
                      </span>
                    </div>

                    <div>
                      <h3 className="text-sm font-extrabold text-[#173B72] group-hover:text-emerald-700 transition-colors">
                        True / False
                      </h3>
                      <p className="text-2xs text-slate-600 mt-0.5 leading-relaxed">
                        Statements with ANSWER: TRUE/FALSE. No options.
                      </p>
                    </div>

                    <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-2 font-mono text-3xs text-slate-700 space-y-0.5">
                      <p className="text-slate-400 font-semibold mb-0.5 text-3xs uppercase tracking-wider">Example:</p>
                      <p className="text-[#173B72] font-semibold truncate">1. Earth orbits Sun.</p>
                      <p className="text-emerald-700 font-semibold pt-0.5">ANSWER: TRUE</p>
                      <p className="text-[#173B72] font-semibold pt-0.5 truncate">2. Water boils at 50°C.</p>
                      <p className="text-rose-700 font-semibold pt-0.5">ANSWER: FALSE</p>
                    </div>
                  </div>

                  <Button
                    variant="primary"
                    size="sm"
                    className="w-full justify-center bg-emerald-600 hover:bg-emerald-700 group-hover:bg-emerald-700 border-transparent text-white text-xs py-1.5"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectType('true_false');
                    }}
                    rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                  >
                    Select T/F
                  </Button>
                </div>

                {/* Option 3: Multiple Select */}
                <div
                  onClick={() => handleSelectType('multiple_select')}
                  className="group relative bg-white border-2 border-[#DCE4EE] hover:border-indigo-500 hover:shadow-md rounded-2xl p-4 sm:p-4.5 transition-all cursor-pointer flex flex-col justify-between space-y-3.5"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-200 group-hover:scale-105 transition-transform">
                        <ListChecks className="w-4 h-4" />
                      </div>
                      <span className="text-3xs font-bold font-mono px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                        2+ Answers
                      </span>
                    </div>

                    <div>
                      <h3 className="text-sm font-extrabold text-[#173B72] group-hover:text-indigo-700 transition-colors">
                        Multiple Select
                      </h3>
                      <p className="text-2xs text-slate-600 mt-0.5 leading-relaxed">
                        Options with 2+ comma-separated answers.
                      </p>
                    </div>

                    <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-2 font-mono text-3xs text-slate-700 space-y-0.5">
                      <p className="text-slate-400 font-semibold mb-0.5 text-3xs uppercase tracking-wider">Example:</p>
                      <p className="text-[#173B72] font-semibold truncate">1. Which are colors?</p>
                      <p>A. Red</p>
                      <p>B. Blue</p>
                      <p className="text-indigo-700 font-semibold pt-0.5">ANSWER: A, B, D</p>
                    </div>
                  </div>

                  <Button
                    variant="primary"
                    size="sm"
                    className="w-full justify-center bg-indigo-600 hover:bg-indigo-700 group-hover:bg-indigo-700 border-transparent text-white text-xs py-1.5"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectType('multiple_select');
                    }}
                    rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                  >
                    Select MS
                  </Button>
                </div>

                {/* Option 4: Short Answer */}
                <div
                  onClick={() => handleSelectType('short_answer')}
                  className="group relative bg-white border-2 border-[#DCE4EE] hover:border-amber-500 hover:shadow-md rounded-2xl p-4 sm:p-4.5 transition-all cursor-pointer flex flex-col justify-between space-y-3.5"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200 group-hover:scale-105 transition-transform">
                        <PenLine className="w-4 h-4" />
                      </div>
                      <span className="text-3xs font-bold font-mono px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                        Text Answer
                      </span>
                    </div>

                    <div>
                      <h3 className="text-sm font-extrabold text-[#173B72] group-hover:text-amber-700 transition-colors">
                        Short Answer
                      </h3>
                      <p className="text-2xs text-slate-600 mt-0.5 leading-relaxed">
                        Open-ended questions with a typed answer. No options.
                      </p>
                    </div>

                    <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-2 font-mono text-3xs text-slate-700 space-y-0.5">
                      <p className="text-slate-400 font-semibold mb-0.5 text-3xs uppercase tracking-wider">Example:</p>
                      <p className="text-[#173B72] font-semibold truncate">1. Capital of France?</p>
                      <p className="text-amber-700 font-semibold pt-0.5">ANSWER: Paris</p>
                      <p className="text-[#173B72] font-semibold pt-0.5 truncate">2. What is 2 + 2?</p>
                      <p className="text-amber-700 font-semibold pt-0.5">ANSWER: Four</p>
                    </div>
                  </div>

                  <Button
                    variant="primary"
                    size="sm"
                    className="w-full justify-center bg-amber-600 hover:bg-amber-700 group-hover:bg-amber-700 border-transparent text-white text-xs py-1.5"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectType('short_answer');
                    }}
                    rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                  >
                    Select SA
                  </Button>
                </div>

                {/* Option 5: Fill in the Blank */}
                <div
                  onClick={() => handleSelectType('fill_blank')}
                  className="group relative bg-white border-2 border-[#DCE4EE] hover:border-teal-500 hover:shadow-md rounded-2xl p-4 sm:p-4.5 transition-all cursor-pointer flex flex-col justify-between space-y-3.5"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center border border-teal-200 group-hover:scale-105 transition-transform">
                        <FormInput className="w-4 h-4" />
                      </div>
                      <span className="text-3xs font-bold font-mono px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
                        1+ Blanks
                      </span>
                    </div>

                    <div>
                      <h3 className="text-sm font-extrabold text-[#173B72] group-hover:text-teal-700 transition-colors">
                        Fill in Blank
                      </h3>
                      <p className="text-2xs text-slate-600 mt-0.5 leading-relaxed">
                        Sentences with blanks (___) and pipe-separated answers.
                      </p>
                    </div>

                    <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-2 font-mono text-3xs text-slate-700 space-y-0.5">
                      <p className="text-slate-400 font-semibold mb-0.5 text-3xs uppercase tracking-wider">Example:</p>
                      <p className="text-[#173B72] font-semibold truncate">1. She ___ to school.</p>
                      <p className="text-teal-700 font-semibold pt-0.5">ANSWER: goes</p>
                      <p className="text-[#173B72] font-semibold pt-0.5 truncate">2. I ___ tea | milk.</p>
                      <p className="text-teal-700 font-semibold pt-0.5">ANSWER: like | likes</p>
                    </div>
                  </div>

                  <Button
                    variant="primary"
                    size="sm"
                    className="w-full justify-center bg-teal-600 hover:bg-teal-700 group-hover:bg-teal-700 border-transparent text-white text-xs py-1.5"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectType('fill_blank');
                    }}
                    rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                  >
                    Select Blank
                  </Button>
                </div>

                {/* Option 6: Matching */}
                <div
                  onClick={() => handleSelectType('matching')}
                  className="group relative bg-white border-2 border-[#DCE4EE] hover:border-purple-500 hover:shadow-md rounded-2xl p-4 sm:p-4.5 transition-all cursor-pointer flex flex-col justify-between space-y-3.5"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-200 group-hover:scale-105 transition-transform">
                        <ArrowLeftRight className="w-4 h-4" />
                      </div>
                      <span className="text-3xs font-bold font-mono px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                        Pair Items
                      </span>
                    </div>

                    <div>
                      <h3 className="text-sm font-extrabold text-[#173B72] group-hover:text-purple-700 transition-colors">
                        Matching
                      </h3>
                      <p className="text-2xs text-slate-600 mt-0.5 leading-relaxed">
                        LEFT: items (A, B) paired with RIGHT: items (1, 2) and ANSWER: pairs.
                      </p>
                    </div>

                    <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-2 font-mono text-3xs text-slate-700 space-y-0.5">
                      <p className="text-slate-400 font-semibold mb-0.5 text-3xs uppercase tracking-wider">Example:</p>
                      <p className="text-[#173B72] font-semibold truncate">LEFT: A. Huge</p>
                      <p className="text-[#173B72] font-semibold truncate">RIGHT: 1. Small 2. Fast</p>
                      <p className="text-purple-700 font-semibold pt-0.5">ANSWER: A-2, B-1</p>
                    </div>
                  </div>

                  <Button
                    variant="primary"
                    size="sm"
                    className="w-full justify-center bg-purple-600 hover:bg-purple-700 group-hover:bg-purple-700 border-transparent text-white text-xs py-1.5"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectType('matching');
                    }}
                    rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                  >
                    Select Matching
                  </Button>
                </div>

                {/* Option 7: Ordering */}
                <div
                  onClick={() => handleSelectType('ordering')}
                  className="group relative bg-white border-2 border-[#DCE4EE] hover:border-sky-500 hover:shadow-md rounded-2xl p-4 sm:p-4.5 transition-all cursor-pointer flex flex-col justify-between space-y-3.5"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center border border-sky-200 group-hover:scale-105 transition-transform">
                        <ListOrdered className="w-4 h-4" />
                      </div>
                      <span className="text-3xs font-bold font-mono px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
                        Sequence Items
                      </span>
                    </div>

                    <div>
                      <h3 className="text-sm font-extrabold text-[#173B72] group-hover:text-sky-700 transition-colors">
                        Ordering
                      </h3>
                      <p className="text-2xs text-slate-600 mt-0.5 leading-relaxed">
                        Lettered items (A, B, C...) with ANSWER: sequence separated by commas.
                      </p>
                    </div>

                    <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-2 font-mono text-3xs text-slate-700 space-y-0.5">
                      <p className="text-slate-400 font-semibold mb-0.5 text-3xs uppercase tracking-wider">Example:</p>
                      <p className="text-[#173B72] font-semibold truncate">1. Put steps in order.</p>
                      <p>A. Wake up</p>
                      <p>B. Have breakfast</p>
                      <p className="text-sky-700 font-semibold pt-0.5">ANSWER: A, B</p>
                    </div>
                  </div>

                  <Button
                    variant="primary"
                    size="sm"
                    className="w-full justify-center bg-sky-600 hover:bg-sky-700 group-hover:bg-sky-700 border-transparent text-white text-xs py-1.5"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectType('ordering');
                    }}
                    rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                  >
                    Select Ordering
                  </Button>
                </div>
              </div>

              {/* Option 8: Reading Passage */}
              <div
                onClick={() => handleSelectType('reading_passage')}
                className="group relative bg-white border-2 border-[#DCE4EE] hover:border-emerald-500 hover:shadow-md rounded-2xl p-4 sm:p-4.5 transition-all cursor-pointer flex flex-col justify-between space-y-3.5"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200 group-hover:scale-105 transition-transform">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <span className="text-3xs font-bold font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Passage + Questions
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm font-extrabold text-[#173B72] group-hover:text-emerald-700 transition-colors">
                      Reading Passage
                    </h3>
                    <p className="text-2xs sm:text-xs text-slate-500 mt-1 leading-relaxed">
                      One reading passage container with attached comprehension questions across any format.
                    </p>
                  </div>

                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-3xs font-mono text-slate-600 space-y-0.5">
                    <p className="text-[#173B72] font-semibold truncate">PASSAGE:</p>
                    <p className="truncate">The internet has changed...</p>
                    <p className="text-[#173B72] font-semibold truncate pt-0.5">QUESTIONS:</p>
                    <p className="truncate">1. What has changed?</p>
                    <p className="text-emerald-700 font-semibold pt-0.5">ANSWER: B</p>
                  </div>
                </div>

                <div className="pt-2">
                  <Button
                    variant="primary"
                    size="sm"
                    className="w-full justify-center bg-emerald-600 hover:bg-emerald-700 group-hover:bg-emerald-700 border-transparent text-white text-xs py-1.5"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectType('reading_passage');
                    }}
                    rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                  >
                    Select Reading Passage
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: INPUT TEXT */}
          {activeStep === 'input' && currentConfig && (
            <div className="space-y-4">
              {/* Type Switcher Bar */}
              <div className="flex items-center justify-between bg-white border border-[#DCE4EE] rounded-xl px-4 py-2.5 shadow-2xs">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-medium">Selected Format:</span>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                      selectedType === 'multiple_choice'
                        ? 'bg-[#EEF5FF] text-[#2563EB] border-blue-200'
                        : selectedType === 'multiple_select'
                        ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                        : selectedType === 'short_answer'
                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                        : selectedType === 'fill_blank'
                        ? 'bg-teal-50 text-teal-800 border-teal-200'
                        : selectedType === 'matching'
                        ? 'bg-purple-50 text-purple-800 border-purple-200'
                        : selectedType === 'ordering'
                        ? 'bg-sky-50 text-sky-800 border-sky-200'
                        : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    }`}
                  >
                    {selectedType === 'multiple_choice' ? (
                      <ListOrdered className="w-3.5 h-3.5" />
                    ) : selectedType === 'multiple_select' ? (
                      <ListChecks className="w-3.5 h-3.5" />
                    ) : selectedType === 'short_answer' ? (
                      <PenLine className="w-3.5 h-3.5" />
                    ) : selectedType === 'fill_blank' ? (
                      <FormInput className="w-3.5 h-3.5" />
                    ) : selectedType === 'matching' ? (
                      <ArrowLeftRight className="w-3.5 h-3.5" />
                    ) : selectedType === 'ordering' ? (
                      <ListOrdered className="w-3.5 h-3.5" />
                    ) : selectedType === 'reading_passage' ? (
                      <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <CheckSquare className="w-3.5 h-3.5" />
                    )}
                    <span>{currentConfig.label}</span>
                  </span>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveStep('select_type')}
                  className="text-xs text-slate-600 hover:text-[#173B72]"
                >
                  Change Format
                </Button>
              </div>

              {/* Guidance / Sample Card */}
              <div
                className={`border rounded-xl p-3.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                  selectedType === 'multiple_choice'
                    ? 'bg-[#EEF5FF] border-blue-200/80'
                    : selectedType === 'multiple_select'
                    ? 'bg-indigo-50/70 border-indigo-200'
                    : selectedType === 'short_answer'
                    ? 'bg-amber-50/70 border-amber-200'
                    : selectedType === 'fill_blank'
                    ? 'bg-teal-50/70 border-teal-200'
                    : selectedType === 'matching'
                    ? 'bg-purple-50/70 border-purple-200'
                    : selectedType === 'ordering'
                    ? 'bg-sky-50/70 border-sky-200'
                    : 'bg-emerald-50/70 border-emerald-200'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <Info
                    className={`w-4 h-4 shrink-0 mt-0.5 ${
                      selectedType === 'multiple_choice'
                        ? 'text-[#2563EB]'
                        : selectedType === 'multiple_select'
                        ? 'text-indigo-600'
                        : selectedType === 'short_answer'
                        ? 'text-amber-600'
                        : selectedType === 'fill_blank'
                        ? 'text-teal-600'
                        : selectedType === 'matching'
                        ? 'text-purple-600'
                        : selectedType === 'ordering'
                        ? 'text-sky-600'
                        : 'text-emerald-600'
                    }`}
                  />
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-[#173B72]">
                      {currentConfig.label} Main Format Rules
                    </p>
                    <p className="text-2xs sm:text-xs text-slate-600 leading-relaxed">
                      {currentConfig.formatDescription}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleLoadSample}
                    leftIcon={<Sparkles className="w-3.5 h-3.5 text-orange-500" />}
                    title={`Load ${currentConfig.label} sample`}
                  >
                    Load Sample
                  </Button>
                  {inputText && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleClear}
                      leftIcon={<RotateCcw className="w-3 h-3" />}
                    >
                      Clear
                    </Button>
                  )}
                </div>
              </div>

              {/* Textarea */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label htmlFor="import-textarea" className="font-bold text-[#173B72] uppercase tracking-wide">
                    Paste {currentConfig.label} Questions
                  </label>
                  <span className="font-mono text-slate-400 text-2xs">
                    {inputText.length} chars · {inputText.split('\n').filter(Boolean).length} lines
                  </span>
                </div>

                <textarea
                  id="import-textarea"
                  rows={13}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={currentConfig.placeholderText}
                  className="w-full font-mono text-xs sm:text-sm bg-[#F7F9FC] border border-[#DCE4EE] rounded-xl p-3.5 text-[#172033] placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] shadow-2xs leading-relaxed"
                />
              </div>
            </div>
          )}

          {/* STEP 3: PREVIEW */}
          {activeStep === 'preview' && parseResult && (
            <div className="space-y-4">
              {/* Stat Summary */}
              <div className="bg-[#FFFFFF] rounded-xl border border-[#DCE4EE] p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-sm sm:text-base text-[#173B72]">
                      {parseResult.totalDetected} {parseResult.totalDetected === 1 ? 'question' : 'questions'} detected
                    </h3>
                    <span
                      className={`text-2xs font-bold px-2 py-0.5 rounded-full border ${
                        parseResult.selectedType === 'multiple_choice'
                          ? 'bg-[#EEF5FF] text-[#2563EB] border-blue-200'
                          : parseResult.selectedType === 'multiple_select'
                          ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                          : parseResult.selectedType === 'short_answer'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : parseResult.selectedType === 'fill_blank'
                          ? 'bg-teal-50 text-teal-700 border-teal-200'
                          : parseResult.selectedType === 'matching'
                          ? 'bg-purple-50 text-purple-700 border-purple-200'
                          : parseResult.selectedType === 'ordering'
                          ? 'bg-sky-50 text-sky-700 border-sky-200'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}
                    >
                      {IMPORT_TYPE_CONFIGS[parseResult.selectedType].label} Format
                    </span>
                  </div>
                  <p className="text-2xs text-slate-500 mt-0.5">
                    Review validation results below before appending to your test.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-2xs">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>{parseResult.readyCount} ready</span>
                  </span>

                  {parseResult.warningCount > 0 && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-2xs">
                      <AlertTriangle className="w-3 h-3 text-amber-600" />
                      <span>{parseResult.warningCount} {parseResult.warningCount === 1 ? 'warning' : 'warnings'}</span>
                    </span>
                  )}

                  {parseResult.errorCount > 0 && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-2xs">
                      <AlertCircle className="w-3 h-3 text-rose-600" />
                      <span>{parseResult.errorCount} {parseResult.errorCount === 1 ? 'error' : 'errors'}</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Global Errors */}
              {parseResult.globalErrors.length > 0 && (
                <div className="rounded-xl border border-rose-200 bg-rose-50/90 p-4 space-y-1.5">
                  <div className="flex items-center gap-2 text-rose-800 font-bold text-xs">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>Import Blocked: Errors Detected</span>
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-2xs text-rose-700 pl-1">
                    {parseResult.globalErrors.map((err, idx) => (
                      <li key={`g_err_${idx}`} className="leading-relaxed whitespace-pre-line">
                        {err}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Global Warnings */}
              {parseResult.globalWarnings.length > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/90 p-4 space-y-1.5">
                  <div className="flex items-center gap-2 text-amber-800 font-bold text-xs">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Format Warnings (Review Recommended)</span>
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-2xs text-amber-800 pl-1">
                    {parseResult.globalWarnings.map((warn, idx) => (
                      <li key={`g_warn_${idx}`} className="leading-relaxed whitespace-pre-line font-mono">
                        {warn}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Reading Passage Preview Card (if reading_passage format) */}
              {parseResult.readingPassage && (
                <div className="bg-emerald-50/70 rounded-xl border border-emerald-200 p-4 sm:p-4.5 space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between pb-2.5 border-b border-emerald-200/80">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center border border-emerald-300">
                        <BookOpen className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs sm:text-sm font-extrabold text-[#173B72]">
                          {parseResult.readingPassage.title || 'Reading Passage Set'}
                        </h4>
                        <span className="text-3xs text-emerald-800 font-semibold uppercase tracking-wider">
                          Passage Container · {parseResult.questions.length} attached question{parseResult.questions.length === 1 ? '' : 's'}
                        </span>
                      </div>
                    </div>
                    <span className="text-2xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                      Paragraphs Preserved
                    </span>
                  </div>

                  <div className="bg-white rounded-lg border border-emerald-200 p-3 sm:p-4 text-xs sm:text-sm text-slate-800 leading-relaxed max-h-56 overflow-y-auto whitespace-pre-wrap font-sans">
                    {parseResult.readingPassage.passage}
                  </div>
                </div>
              )}

              {/* Questions Cards */}
              <div className="space-y-3">
                {parseResult.questions.map((q, qIdx) => {
                  const isError = q.status === 'ERROR';
                  const isWarning = q.status === 'WARNING';

                  return (
                    <div
                      key={`parsed_q_${q.questionNumber}_${qIdx}`}
                      className={`bg-white rounded-xl border p-4 transition-all shadow-2xs space-y-2.5 ${
                        isError
                          ? 'border-rose-300 ring-2 ring-rose-100'
                          : isWarning
                          ? 'border-amber-300 ring-2 ring-amber-100'
                          : 'border-[#DCE4EE]'
                      }`}
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-[#DCE4EE]/70">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-[#173B72] bg-[#EEF5FF] px-2 py-0.5 rounded-lg border border-[#DCE4EE]">
                            Question {q.questionNumber}
                          </span>
                          {q.type === 'true_false' ? (
                            <span className="text-2xs font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              True / False · 1 point
                            </span>
                          ) : q.type === 'multiple_select' ? (
                            <span className="text-2xs text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 font-semibold">
                              Multiple Select · 1 point
                            </span>
                          ) : q.type === 'short_answer' ? (
                            <span className="text-2xs text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-semibold">
                              Short Answer · 1 point
                            </span>
                          ) : q.type === 'fill_blank' ? (
                            <span className="text-2xs text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200 font-semibold">
                              Fill in the Blank · 1 point
                            </span>
                          ) : q.type === 'matching' ? (
                            <span className="text-2xs text-purple-800 bg-purple-50 px-2 py-0.5 rounded border border-purple-200 font-semibold">
                              Matching · {q.matchingPairs?.length || 1} points
                            </span>
                          ) : q.type === 'ordering' ? (
                            <span className="text-2xs text-sky-800 bg-sky-50 px-2 py-0.5 rounded border border-sky-200 font-semibold">
                              Ordering · 1 point
                            </span>
                          ) : (
                            <span className="text-2xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 font-semibold">
                              Multiple Choice · 1 point
                            </span>
                          )}
                        </div>

                        {isError ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            <AlertCircle className="w-3 h-3 text-rose-600" />
                            <span>ERROR</span>
                          </span>
                        ) : isWarning ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            <AlertTriangle className="w-3 h-3 text-amber-600" />
                            <span>WARNING</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>READY</span>
                          </span>
                        )}
                      </div>

                      <div className="text-xs sm:text-sm font-semibold text-[#172033] leading-relaxed">
                        {q.text || <span className="text-rose-500 italic">No question text</span>}
                      </div>

                      {/* Options or Answer Preview */}
                      {q.type === 'ordering' ? (
                        <div className="pt-1 space-y-2.5">
                          {/* Items to order */}
                          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                            <span className="font-bold text-slate-700 block text-2xs uppercase tracking-wide">
                              Items to Order ({q.orderingItems?.length || 0}):
                            </span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                              {(q.orderingItems || []).map((item, iIdx) => (
                                <div
                                  key={`parsed_ord_item_${q.questionNumber}_${iIdx}`}
                                  className="flex items-center gap-2 p-2 rounded-lg bg-white border border-[#DCE4EE] text-xs shadow-2xs"
                                >
                                  <span className="w-5 h-5 rounded-md bg-[#EEF5FF] text-[#173B72] font-bold text-2xs flex items-center justify-center shrink-0 border border-blue-200 font-mono">
                                    {item.label}
                                  </span>
                                  <span className="text-[#172033] font-medium truncate">{item.text}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Correct target sequence */}
                          <div className="p-3 rounded-xl bg-sky-50/70 border border-sky-200 text-xs space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-sky-950 flex items-center gap-1.5">
                                <ListOrdered className="w-3.5 h-3.5 text-sky-600" />
                                <span>Correct Sequence:</span>
                              </span>
                              <span className="font-mono text-2xs font-extrabold text-sky-800 bg-white px-2 py-0.5 rounded border border-sky-200">
                                {q.answer}
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                              {(q.correctOrder || (q.answer ? q.answer.split(',').map((s) => s.trim()) : [])).map((letter, stepIdx, arr) => {
                                const itemObj = q.orderingItems?.find((i) => i.label === letter);
                                return (
                                  <React.Fragment key={`step_${q.questionNumber}_${stepIdx}`}>
                                    <div className="inline-flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-sky-200 shadow-2xs">
                                      <span className="w-4 h-4 rounded-full bg-sky-600 text-white font-bold text-3xs flex items-center justify-center shrink-0">
                                        {stepIdx + 1}
                                      </span>
                                      <span className="font-mono font-bold text-sky-900">{letter}</span>
                                      {itemObj && (
                                        <span className="text-2xs text-slate-600 max-w-[140px] truncate hidden sm:inline">
                                          ({itemObj.text})
                                        </span>
                                      )}
                                    </div>
                                    {stepIdx < arr.length - 1 && (
                                      <ArrowRight className="w-3 h-3 text-sky-400 shrink-0" />
                                    )}
                                  </React.Fragment>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      ) : q.type === 'matching' ? (
                        <div className="pt-1">
                          <div className="p-3 rounded-xl bg-purple-50/60 border border-purple-200 text-xs space-y-2">
                            <span className="font-bold text-purple-950 block">
                              Matched Pairs ({q.matchingPairs?.length || 0}):
                            </span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {(q.matchingPairs || []).map((pair, pIdx) => (
                                <div
                                  key={`parsed_pair_${q.questionNumber}_${pIdx}`}
                                  className="flex items-center justify-between p-2 rounded-lg bg-white border border-purple-200 shadow-2xs text-xs gap-2"
                                >
                                  <div className="flex items-center gap-1.5 min-w-0 font-medium text-[#172033]">
                                    <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 font-bold text-2xs flex items-center justify-center shrink-0">
                                      {pair.leftLabel}
                                    </span>
                                    <span className="truncate">{pair.leftText}</span>
                                  </div>
                                  <ArrowRight className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                                  <div className="flex items-center gap-1.5 min-w-0 font-medium text-[#172033] justify-end">
                                    <span className="truncate">{pair.rightText}</span>
                                    <span className="w-5 h-5 rounded-full bg-purple-600 text-white font-bold text-2xs flex items-center justify-center shrink-0">
                                      {pair.rightLabel}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ) : q.type === 'fill_blank' ? (
                        <div className="pt-1">
                          <div className="p-3 rounded-xl bg-teal-50/60 border border-teal-200 text-xs space-y-2">
                            <span className="font-bold text-teal-900 block">
                              {(q.answers && q.answers.length > 1) ||
                              (q.answer && q.answer.includes('|'))
                                ? 'Accepted Blank Answers:'
                                : 'Accepted Blank Answer:'}
                            </span>
                            <div className="flex flex-wrap items-center gap-2">
                              {(q.answers && q.answers.length > 0
                                ? q.answers
                                : q.answer
                                ? q.answer.split('|').map((s) => s.trim())
                                : []
                              ).map((ans, bIdx) => (
                                <div
                                  key={`parsed_blank_${q.questionNumber}_${bIdx}`}
                                  className="inline-flex items-center gap-1.5 font-mono text-xs bg-white px-2.5 py-1 rounded-lg border border-teal-200 shadow-2xs"
                                >
                                  <span className="text-3xs uppercase tracking-wider font-bold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200">
                                    Blank {bIdx + 1}
                                  </span>
                                  <span className="font-semibold text-[#172033]">
                                    {ans || <span className="text-rose-500 italic">(empty)</span>}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ) : q.type === 'short_answer' ? (
                        <div className="pt-1">
                          <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50/60 border border-amber-200 text-xs">
                            <span className="font-bold text-amber-900 shrink-0">Accepted Answer:</span>
                            <span className="font-mono font-semibold text-[#172033] bg-white px-2.5 py-1 rounded-lg border border-amber-200/80 shadow-2xs">
                              {q.answer || <span className="text-rose-500 italic">None</span>}
                            </span>
                          </div>
                        </div>
                      ) : q.type === 'true_false' ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                          <div
                            className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold border ${
                              q.answer === 'TRUE'
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-900 shadow-2xs'
                                : 'bg-[#F7F9FC] border-[#DCE4EE] text-slate-600'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span
                                className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-2xs ${
                                  q.answer === 'TRUE'
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-slate-200 text-slate-700'
                                }`}
                              >
                                T
                              </span>
                              <span>True</span>
                            </div>
                            {q.answer === 'TRUE' && (
                              <span className="text-emerald-700 flex items-center gap-1 font-bold text-2xs">
                                <Check className="w-3.5 h-3.5" />
                                <span>Correct</span>
                              </span>
                            )}
                          </div>

                          <div
                            className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold border ${
                              q.answer === 'FALSE'
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-900 shadow-2xs'
                                : 'bg-[#F7F9FC] border-[#DCE4EE] text-slate-600'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span
                                className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-2xs ${
                                  q.answer === 'FALSE'
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-slate-200 text-slate-700'
                                }`}
                              >
                                F
                              </span>
                              <span>False</span>
                            </div>
                            {q.answer === 'FALSE' && (
                              <span className="text-emerald-700 flex items-center gap-1 font-bold text-2xs">
                                <Check className="w-3.5 h-3.5" />
                                <span>Correct</span>
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                          {q.options.map((opt, optIdx) => {
                            const isCorrect =
                              q.type === 'multiple_select'
                                ? (q.answers && q.answers.length > 0
                                    ? q.answers.includes(opt.label.toUpperCase())
                                    : (q.answer || '')
                                        .split(',')
                                        .map((s) => s.trim().toUpperCase())
                                        .includes(opt.label.toUpperCase()))
                                : Boolean(
                                    q.answer &&
                                      opt.label.toUpperCase() === q.answer.toUpperCase()
                                  );

                            return (
                              <div
                                key={`parsed_opt_${q.questionNumber}_${opt.rawLabel || opt.label}_${optIdx}`}
                                className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium border ${
                                  isCorrect
                                    ? 'bg-emerald-50/70 border-emerald-300 text-emerald-900 font-semibold'
                                    : 'bg-[#F7F9FC] border-[#DCE4EE] text-slate-700'
                                }`}
                              >
                                <div className="flex items-center gap-1.5 min-w-0 pr-2">
                                  <span
                                    className={`w-4 h-4 rounded-full flex items-center justify-center font-bold text-2xs shrink-0 ${
                                      isCorrect
                                        ? 'bg-emerald-600 text-white'
                                        : 'bg-slate-200 text-slate-700'
                                    }`}
                                  >
                                    {opt.rawLabel}
                                  </span>
                                  <span className="truncate">
                                    {opt.text || <span className="text-rose-500 italic">(empty)</span>}
                                  </span>
                                </div>

                                {isCorrect && (
                                  <span className="text-emerald-600 flex items-center gap-0.5 font-bold text-2xs shrink-0">
                                    <Check className="w-3 h-3" />
                                    <span>Key</span>
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Question-level errors */}
                      {q.errors.length > 0 && (
                        <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-2xs text-rose-700 space-y-1">
                          {q.errors.map((err, errIdx) => (
                            <div key={`parsed_q_err_${q.questionNumber}_${errIdx}`} className="flex items-start gap-1.5 font-medium whitespace-pre-line">
                              <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                              <span>{err}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between pt-3 border-t border-[#DCE4EE] gap-3 shrink-0">
          {activeStep === 'select_type' ? (
            <div className="flex items-center justify-between w-full">
              <Button variant="outline" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <p className="text-2xs text-slate-400">
                Choose a format to continue
              </p>
            </div>
          ) : activeStep === 'input' ? (
            <div className="flex items-center justify-between w-full">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveStep('select_type')}
                leftIcon={<ChevronLeft className="w-4 h-4" />}
              >
                Back to Type Selection
              </Button>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={!inputText.trim()}
                  onClick={handleParse}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Parse & Validate
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between w-full gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveStep('input')}
                leftIcon={<ChevronLeft className="w-4 h-4" />}
              >
                Back to Edit
              </Button>

              <div className="flex items-center gap-3">
                {/* Warning acknowledgment */}
                {parseResult && parseResult.hasWarnings && !parseResult.hasErrors && (
                  <label className="flex items-center gap-1.5 text-2xs text-slate-700 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={warningsAcknowledged}
                      onChange={(e) => setWarningsAcknowledged(e.target.checked)}
                      className="w-3.5 h-3.5 rounded text-orange-500 focus:ring-orange-400 cursor-pointer"
                    />
                    <span>Acknowledge warnings</span>
                  </label>
                )}

                {parseResult && parseResult.hasErrors ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setActiveStep('input')}
                  >
                    Review Errors
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={parseResult?.hasWarnings && !warningsAcknowledged}
                    onClick={handleExecuteImport}
                    leftIcon={<Check className="w-4 h-4" />}
                  >
                    {selectedType === 'reading_passage'
                      ? `Import Passage + ${parseResult?.readyCount} ${
                          parseResult?.readyCount === 1 ? 'Question' : 'Questions'
                        }`
                      : `Import ${parseResult?.readyCount} ${
                          parseResult?.readyCount === 1 ? 'Question' : 'Questions'
                        }`}
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
