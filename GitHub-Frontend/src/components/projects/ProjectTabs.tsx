'use client';

import React, { useState } from 'react';
import { ProjectDetailData } from '../../types';
import { ProjectOverviewTab } from './ProjectOverviewTab';
import { ProjectRepositoriesTab } from './ProjectRepositoriesTab';
import { ProjectDevelopersTab } from './ProjectDevelopersTab';
import { ProjectActivityTab } from './ProjectActivityTab';
import { ProjectCommitsTab } from './ProjectCommitsTab';
import { ProjectPullRequestsTab } from './ProjectPullRequestsTab';
import { ProjectIssuesTab } from './ProjectIssuesTab';
import { ProjectCodeChangesTab } from './ProjectCodeChangesTab';
import { 
  LayoutDashboard, 
  GitBranch, 
  Users, 
  Activity, 
  GitCommit, 
  GitPullRequest, 
  AlertCircle, 
  Code2 
} from 'lucide-react';

export type ProjectTabId = 
  | 'overview' 
  | 'repositories' 
  | 'developers' 
  | 'activity' 
  | 'commits' 
  | 'pull-requests' 
  | 'issues' 
  | 'code-changes';

interface ProjectTabsProps {
  detail: ProjectDetailData;
  onConnectRepo?: () => void;
}

export function ProjectTabs({ detail, onConnectRepo }: ProjectTabsProps) {
  const [activeTab, setActiveTab] = useState<ProjectTabId>('overview');

  const tabs: { id: ProjectTabId; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'repositories', label: 'Repositories', icon: <GitBranch className="w-4 h-4" />, count: detail.repositories.length },
    { id: 'developers', label: 'Developers', icon: <Users className="w-4 h-4" />, count: detail.developers.length },
    { id: 'activity', label: 'Activity', icon: <Activity className="w-4 h-4" />, count: detail.recentActivity.length },
    { id: 'commits', label: 'Commits', icon: <GitCommit className="w-4 h-4" />, count: detail.commits.length },
    { id: 'pull-requests', label: 'Pull Requests', icon: <GitPullRequest className="w-4 h-4" />, count: detail.pullRequests.length },
    { id: 'issues', label: 'Issues', icon: <AlertCircle className="w-4 h-4" />, count: detail.issues.length },
    { id: 'code-changes', label: 'Code Changes', icon: <Code2 className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6">
      {/* Navigation Tab Bar */}
      <div className="border-b border-slate-800 overflow-x-auto scrollbar-none">
        <div role="tablist" aria-label="Project section tabs" className="flex items-center gap-1 min-w-max pb-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              id={`project-tab-${tab.id}`}
              aria-selected={activeTab === tab.id}
              aria-controls={`project-panel-${tab.id}`}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all relative ${
                activeTab === tab.id
                  ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                  activeTab === tab.id
                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                    : 'bg-slate-800 text-slate-400'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Contents */}
      <div
        role="tabpanel"
        id={`project-panel-${activeTab}`}
        aria-labelledby={`project-tab-${activeTab}`}
        className="pt-2"
      >
        {activeTab === 'overview' && <ProjectOverviewTab detail={detail} onConnectRepo={onConnectRepo} />}
        {activeTab === 'repositories' && <ProjectRepositoriesTab repositories={detail.repositories} onConnectRepo={onConnectRepo} />}
        {activeTab === 'developers' && <ProjectDevelopersTab developers={detail.developers} />}
        {activeTab === 'activity' && <ProjectActivityTab activity={detail.recentActivity} />}
        {activeTab === 'commits' && <ProjectCommitsTab commits={detail.commits} />}
        {activeTab === 'pull-requests' && <ProjectPullRequestsTab pullRequests={detail.pullRequests} />}
        {activeTab === 'issues' && <ProjectIssuesTab issues={detail.issues} />}
        {activeTab === 'code-changes' && <ProjectCodeChangesTab codeChanges={detail.codeChanges} />}
      </div>
    </div>
  );
}
