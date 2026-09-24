import { pool } from '../db/connection.js';

export interface CodeChurnFilters {
  projectId?: string;
  repositoryId?: string;
  developerId?: string;
  dateFrom?: string;
  dateTo?: string;
  file?: string;
  limit?: number;
}

export interface DirectGitHubFacts {
  file: string;
  commitsCount: number;
  additions: number;
  deletions: number;
  totalChanges: number;
  revertCommitsCount: number;
  distinctAuthorsCount: number;
  firstCommittedAt: string | null;
  lastCommittedAt: string | null;
}

export interface DerivedChurnMetrics {
  netLineGrowth: number;
  churnRatio: number; // deletions / totalChanges
  reworkRatio: number;
  avgChangesPerCommit: number;
}

export interface HeuristicSignalItem {
  triggered: boolean;
  value: number | boolean;
  description: string;
}

export interface HeuristicChurnSignals {
  repeatedModifications: HeuristicSignalItem;
  additionsFollowedByDeletions: HeuristicSignalItem;
  addRemoveAddOscillations: HeuristicSignalItem;
  revertCommitsDetected: HeuristicSignalItem;
  highFileChurn: HeuristicSignalItem;
  reworkSignalsCount: number;
}

export interface FileChurnAnalysis {
  file: string;
  changes: number;
  additions: number;
  deletions: number;
  reworkSignals: number;
  directFacts: DirectGitHubFacts;
  derivedMetrics: DerivedChurnMetrics;
  heuristicSignals: HeuristicChurnSignals;
}

export interface CodeChurnSummaryResponse {
  summary: {
    totalFilesAnalyzed: number;
    totalCommitsAnalyzed: number;
    totalAdditions: number;
    totalDeletions: number;
    totalRevertCommits: number;
    filesWithReworkSignals: number;
    overallChurnRatio: number;
  };
  disclaimer: string;
  files: FileChurnAnalysis[];
}

export class CodeChurnService {
  /**
   * Analyzes code churn and rework patterns across repository commit files history.
   */
  public async analyzeCodeChurn(filters: CodeChurnFilters): Promise<CodeChurnSummaryResponse> {
    const conditions: string[] = [];
    const params: any[] = [];
    let pIdx = 1;

    if (filters.repositoryId) {
      conditions.push(`(c.repository_id = $${pIdx} OR r.full_name = $${pIdx} OR r.name = $${pIdx})`);
      params.push(filters.repositoryId);
      pIdx++;
    } else if (filters.projectId) {
      conditions.push(`r.project_id = $${pIdx}`);
      params.push(filters.projectId);
      pIdx++;
    }

    if (filters.developerId) {
      conditions.push(`c.developer_id = $${pIdx}`);
      params.push(filters.developerId);
      pIdx++;
    }

    if (filters.dateFrom) {
      conditions.push(`c.committed_at >= $${pIdx}`);
      params.push(filters.dateFrom);
      pIdx++;
    }

    if (filters.dateTo) {
      conditions.push(`c.committed_at <= $${pIdx}`);
      params.push(filters.dateTo);
      pIdx++;
    }

    if (filters.file) {
      conditions.push(`cf.filename = $${pIdx}`);
      params.push(filters.file);
      pIdx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT 
        cf.filename,
        cf.status as file_status,
        cf.additions,
        cf.deletions,
        cf.changes,
        cf.patch,
        c.id as commit_id,
        c.github_commit_sha,
        c.message as commit_message,
        c.committed_at,
        c.developer_id
      FROM commit_files cf
      JOIN commits c ON cf.commit_id = c.id
      JOIN repositories r ON c.repository_id = r.id
      ${whereClause}
      ORDER BY cf.filename ASC, c.committed_at ASC
    `;

    const { rows } = await pool.query(query, params);

    // Group rows by filename
    const filesMap = new Map<string, any[]>();
    const allCommitIds = new Set<string>();

    for (const row of rows) {
      allCommitIds.add(row.commit_id);
      if (!filesMap.has(row.filename)) {
        filesMap.set(row.filename, []);
      }
      filesMap.get(row.filename)!.push(row);
    }

    let totalAdditionsAll = 0;
    let totalDeletionsAll = 0;
    let totalRevertCommitsAll = 0;
    let filesWithReworkCount = 0;

    const analyzedFiles: FileChurnAnalysis[] = [];

    for (const [filename, fileRevisions] of filesMap.entries()) {
      let additions = 0;
      let deletions = 0;
      let totalChanges = 0;
      let revertCommitsCount = 0;
      const authors = new Set<string>();
      
      let firstCommittedAt: string | null = null;
      let lastCommittedAt: string | null = null;

      // Track commit sequence for heuristics
      let hasAdditionsThenDeletions = false;
      let addRemoveAddCount = 0;

      let prevHadAdditions = false;
      let prevHadDeletions = false;

      for (let i = 0; i < fileRevisions.length; i++) {
        const rev = fileRevisions[i];
        const add = Number(rev.additions || 0);
        const del = Number(rev.deletions || 0);
        const chg = Number(rev.changes || (add + del));

        additions += add;
        deletions += del;
        totalChanges += chg;

        if (rev.developer_id) {
          authors.add(rev.developer_id);
        }

        if (!firstCommittedAt || new Date(rev.committed_at) < new Date(firstCommittedAt)) {
          firstCommittedAt = rev.committed_at;
        }
        if (!lastCommittedAt || new Date(rev.committed_at) > new Date(lastCommittedAt)) {
          lastCommittedAt = rev.committed_at;
        }

        // Revert commit check (message contains 'revert' or 'rollback')
        const isRevertMsg = /revert|rollback/i.test(rev.commit_message || '');
        if (isRevertMsg) {
          revertCommitsCount++;
        }

        // Sequence pattern heuristics: additions followed by deletions
        if (prevHadAdditions && del > 0) {
          hasAdditionsThenDeletions = true;
        }

        // Oscillations: Added -> Removed/Reverted -> Added again
        if (prevHadDeletions && add > 0) {
          addRemoveAddCount++;
        }

        if (add > 0) prevHadAdditions = true;
        if (del > 0) prevHadDeletions = true;
      }

      totalAdditionsAll += additions;
      totalDeletionsAll += deletions;
      totalRevertCommitsAll += revertCommitsCount;

      const commitsCount = fileRevisions.length;

      // Direct facts
      const directFacts: DirectGitHubFacts = {
        file: filename,
        commitsCount,
        additions,
        deletions,
        totalChanges,
        revertCommitsCount,
        distinctAuthorsCount: authors.size,
        firstCommittedAt: firstCommittedAt ? new Date(firstCommittedAt).toISOString() : null,
        lastCommittedAt: lastCommittedAt ? new Date(lastCommittedAt).toISOString() : null,
      };

      // Derived metrics
      const netLineGrowth = additions - deletions;
      const churnRatio = totalChanges > 0 ? Number((deletions / totalChanges).toFixed(3)) : 0;
      const avgChangesPerCommit = commitsCount > 0 ? Number((totalChanges / commitsCount).toFixed(1)) : 0;
      const reworkRatio = totalChanges > 0 ? Number(((deletions + (revertCommitsCount * 50)) / (additions + deletions + 1)).toFixed(3)) : 0;

      const derivedMetrics: DerivedChurnMetrics = {
        netLineGrowth,
        churnRatio,
        reworkRatio,
        avgChangesPerCommit,
      };

      // Heuristic signals
      const isRepeatedMods = commitsCount >= 3;
      const isRevertDetected = revertCommitsCount > 0;
      const isHighChurn = totalChanges >= 50 && (deletions / (additions + 1)) > 0.4;
      const isAddRemoveAdd = addRemoveAddCount > 0;

      let reworkSignalsCount = 0;
      if (isRepeatedMods) reworkSignalsCount++;
      if (hasAdditionsThenDeletions) reworkSignalsCount++;
      if (isAddRemoveAdd) reworkSignalsCount++;
      if (isRevertDetected) reworkSignalsCount++;
      if (isHighChurn) reworkSignalsCount++;

      if (reworkSignalsCount > 0) {
        filesWithReworkCount++;
      }

      const heuristicSignals: HeuristicChurnSignals = {
        repeatedModifications: {
          triggered: isRepeatedMods,
          value: commitsCount,
          description: isRepeatedMods
            ? `File modified repeatedly across ${commitsCount} commits`
            : `File modified in ${commitsCount} commit(s)`,
        },
        additionsFollowedByDeletions: {
          triggered: hasAdditionsThenDeletions,
          value: hasAdditionsThenDeletions ? 1 : 0,
          description: hasAdditionsThenDeletions
            ? 'Additions in earlier commits followed by deletions in subsequent commits'
            : 'No additions-followed-by-deletions pattern detected',
        },
        addRemoveAddOscillations: {
          triggered: isAddRemoveAdd,
          value: addRemoveAddCount,
          description: isAddRemoveAdd
            ? `Add-Remove-Add oscillation pattern detected (${addRemoveAddCount} occurrence(s))`
            : 'No add-remove-add oscillation detected',
        },
        revertCommitsDetected: {
          triggered: isRevertDetected,
          value: revertCommitsCount,
          description: isRevertDetected
            ? `Explicit revert/rollback commit detected touching this file (${revertCommitsCount} time(s))`
            : 'No revert commits detected',
        },
        highFileChurn: {
          triggered: isHighChurn,
          value: isHighChurn,
          description: isHighChurn
            ? 'High turnover of lines detected (deletions account for a large portion of changes)'
            : 'Normal line change turnover',
        },
        reworkSignalsCount,
      };

      analyzedFiles.push({
        file: filename,
        changes: totalChanges,
        additions,
        deletions,
        reworkSignals: reworkSignalsCount,
        directFacts,
        derivedMetrics,
        heuristicSignals,
      });
    }

    // Sort files by reworkSignals descending, then totalChanges descending
    analyzedFiles.sort((a, b) => {
      if (b.reworkSignals !== a.reworkSignals) {
        return b.reworkSignals - a.reworkSignals;
      }
      return b.changes - a.changes;
    });

    const limitVal = filters.limit || 50;
    const finalFiles = analyzedFiles.slice(0, limitVal);

    const grandTotalChanges = totalAdditionsAll + totalDeletionsAll;
    const overallChurnRatio = grandTotalChanges > 0 ? Number((totalDeletionsAll / grandTotalChanges).toFixed(3)) : 0;

    return {
      summary: {
        totalFilesAnalyzed: filesMap.size,
        totalCommitsAnalyzed: allCommitIds.size,
        totalAdditions: totalAdditionsAll,
        totalDeletions: totalDeletionsAll,
        totalRevertCommits: totalRevertCommitsAll,
        filesWithReworkSignals: filesWithReworkCount,
        overallChurnRatio,
      },
      disclaimer:
        'Factual Note: Code churn and rework signals measure code revision volatility and historical iteration patterns from Git metadata. High churn or rework signals do NOT imply developer inefficiency or low code quality.',
      files: finalFiles,
    };
  }
}

export const codeChurnService = new CodeChurnService();
