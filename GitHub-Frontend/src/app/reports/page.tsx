'use client';

import React, { useState } from 'react';
import Header from '../../components/layout/header';
import ChatDrawer from '../../components/ai/chat-drawer';
import { useReports } from '../../hooks/use-reports';
import { useProjects } from '../../hooks/use-projects';
import { useRepositories } from '../../hooks/use-repositories';
import { useDevelopers } from '../../hooks/use-developers';
import { ReportCard } from '../../components/reports/ReportCard';
import { GenerateReportModal } from '../../components/reports/GenerateReportModal';
import { ProjectFilter } from '../../components/filters/ProjectFilter';
import { RepositoryFilter } from '../../components/filters/RepositoryFilter';
import { DeveloperFilter } from '../../components/filters/DeveloperFilter';
import { LoadingState } from '../../components/common/LoadingState';
import { EmptyState } from '../../components/common/EmptyState';
import { ErrorState } from '../../components/common/ErrorState';
import { ReportPeriodType, EngineeringReportMeta } from '../../types';
import { 
  FileText, 
  Search, 
  Sparkles, 
  Plus, 
  Calendar, 
  ShieldCheck 
} from 'lucide-react';

export default function ReportsPage() {
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('ALL');
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>(undefined);
  const [selectedRepositoryId, setSelectedRepositoryId] = useState<string | undefined>(undefined);
  const [selectedDeveloperId, setSelectedDeveloperId] = useState<string | undefined>(undefined);

  const { projects } = useProjects();
  const { repositories } = useRepositories();
  const { developers } = useDevelopers();

  const { reports, isLoading, isError, refetch } = useReports({
    periodType: selectedPeriod === 'ALL' ? undefined : (selectedPeriod as ReportPeriodType),
    projectId: selectedProjectId,
    repositoryId: selectedRepositoryId,
    developerId: selectedDeveloperId,
    search: searchQuery,
  });

  const handleReportGenerated = (title: string) => {
    refetch();
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-slate-950 text-slate-100 min-h-screen">
      <Header onOpenAIChat={() => setIsAIChatOpen(true)} />

      <main className="flex-1 p-6 space-y-6 max-w-7xl w-full mx-auto">
        {/* Header Title & Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
              <FileText className="w-6 h-6 text-amber-400" /> Engineering Reports
            </h1>
            <p className="text-slate-400 text-xs mt-1">
              Automated daily, weekly, monthly, and custom engineering activity digests for executive oversight.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold">
              <ShieldCheck className="w-4 h-4" />
              <span>Read-Only Telemetry Engine</span>
            </div>

            <button
              onClick={() => setIsGenerateModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-amber-600/20 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Generate Report</span>
            </button>
          </div>
        </div>

        {/* Global Filter Bar */}
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl space-y-3">
          {/* Top Row: Period Type Pills & Search Input */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {/* Period Type Pills */}
            <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 p-1 rounded-xl text-xs overflow-x-auto">
              {(['ALL', 'DAILY', 'WEEKLY', 'MONTHLY', 'CUSTOM'] as const).map((period) => (
                <button
                  key={period}
                  onClick={() => setSelectedPeriod(period)}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-all shrink-0 ${
                    selectedPeriod === period
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {period === 'ALL' ? 'All Reports' : period}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search report title or scope..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
              />
            </div>
          </div>

          {/* Bottom Row: Project, Repository, Developer Filters */}
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-800/80">
            <ProjectFilter
              projects={projects}
              value={selectedProjectId}
              onChange={(val) => {
                setSelectedProjectId(val);
                setSelectedRepositoryId(undefined);
              }}
            />

            <RepositoryFilter
              repositories={repositories}
              value={selectedRepositoryId}
              onChange={(val) => setSelectedRepositoryId(val)}
            />

            <DeveloperFilter
              developers={developers}
              value={selectedDeveloperId}
              onChange={(val) => setSelectedDeveloperId(val)}
            />
          </div>
        </div>

        {/* Content Area: Report Cards Grid */}
        {isLoading ? (
          <LoadingState message="Fetching engineering activity digests and reports..." />
        ) : isError ? (
          <ErrorState
            title="Failed to Load Reports"
            message="Could not retrieve reports from backend engine."
            onRetry={() => refetch()}
          />
        ) : reports.length === 0 ? (
          <EmptyState
            title="No Engineering Reports Found"
            description="No reports matching the selected period and filter scope. Click 'Generate Report' to create one."
            action={
              <button
                onClick={() => setIsGenerateModalOpen(true)}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition-all"
              >
                Generate Report
              </button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {reports.map((rep) => (
              <ReportCard key={rep.id} report={rep} />
            ))}
          </div>
        )}
      </main>

      {/* Generate Report Modal */}
      <GenerateReportModal
        isOpen={isGenerateModalOpen}
        onClose={() => setIsGenerateModalOpen(false)}
        projects={projects}
        repositories={repositories}
        developers={developers}
        onReportGenerated={handleReportGenerated}
      />

      <ChatDrawer isOpen={isAIChatOpen} onClose={() => setIsAIChatOpen(false)} />
    </div>
  );
}
