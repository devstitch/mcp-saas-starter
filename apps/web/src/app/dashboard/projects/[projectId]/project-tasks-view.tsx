'use client';

import { useState } from 'react';
import type { Task } from '@mcp-saas-starter/database';

export interface ProjectTasksViewProps {
  tasks: Task[];
  projectName: string;
}

function statusBadge(status: string) {
  switch (status) {
    case 'done':
      return 'badge-success';
    case 'in_progress':
      return 'badge-info';
    case 'blocked':
      return 'badge-danger';
    case 'todo':
    default:
      return 'badge-muted';
  }
}

function statusDot(status: string) {
  switch (status) {
    case 'done':
      return 'bg-success';
    case 'in_progress':
      return 'bg-info';
    case 'blocked':
      return 'bg-danger';
    case 'todo':
    default:
      return 'bg-muted';
  }
}

export function ProjectTasksView({ tasks, projectName }: ProjectTasksViewProps) {
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Filter tasks based on query and status filter
  const filteredTasks = tasks.filter((task) => {
    const matchesQuery =
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (task.description && task.description.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus =
      statusFilter === 'all' ? true : task.status === statusFilter;

    return matchesQuery && matchesStatus;
  });

  // Groupings for Kanban Board view
  const columns: { id: Task['status']; label: string; dotClass: string; badgeClass: string }[] = [
    { id: 'todo', label: 'To Do', dotClass: 'bg-muted', badgeClass: 'badge-muted' },
    { id: 'in_progress', label: 'In Progress', dotClass: 'bg-info', badgeClass: 'badge-info' },
    { id: 'blocked', label: 'Blocked', dotClass: 'bg-danger', badgeClass: 'badge-danger' },
    { id: 'done', label: 'Done', dotClass: 'bg-success', badgeClass: 'badge-success' },
  ];

  return (
    <div className="space-y-6">
      {/* Control Bar: Search, Status Filter Pills & View Switcher */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Search & Status Filters */}
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative min-w-[200px] max-w-xs">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-9 py-1.5 text-xs rounded-lg"
            />
          </div>

          {/* Quick status filter chips */}
          <div className="flex items-center gap-1 overflow-x-auto py-1">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                statusFilter === 'all'
                  ? 'bg-accent text-white'
                  : 'bg-surface text-muted-foreground hover:bg-surface-hover hover:text-foreground'
              }`}
            >
              All ({tasks.length})
            </button>
            {columns.map((col) => {
              const count = tasks.filter((t) => t.status === col.id).length;
              return (
                <button
                  key={col.id}
                  type="button"
                  onClick={() => setStatusFilter(col.id)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                    statusFilter === col.id
                      ? 'bg-accent text-white'
                      : 'bg-surface text-muted-foreground hover:bg-surface-hover hover:text-foreground'
                  }`}
                >
                  {col.label} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* View Switcher: Board vs Table */}
        <div className="flex items-center rounded-lg border border-border bg-surface p-1 shrink-0">
          <button
            type="button"
            onClick={() => setViewMode('board')}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-colors ${
              viewMode === 'board'
                ? 'bg-surface-elevated text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="18" rx="1" />
              <rect x="14" y="3" width="7" height="11" rx="1" />
            </svg>
            Board
          </button>
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-colors ${
              viewMode === 'list'
                ? 'bg-surface-elevated text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="8" y1="6" x2="21" y2="6" />
              <line x1="8" y1="12" x2="21" y2="12" />
              <line x1="8" y1="18" x2="21" y2="18" />
              <line x1="3" y1="6" x2="3.01" y2="6" />
              <line x1="3" y1="12" x2="3.01" y2="12" />
              <line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
            List
          </button>
        </div>
      </div>

      {/* Empty State */}
      {filteredTasks.length === 0 ? (
        <div className="glass-card flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-elevated text-muted mb-3">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-foreground">No tasks found</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs">
            {searchQuery || statusFilter !== 'all'
              ? 'Try adjusting your search query or status filter.'
              : `No tasks have been added to ${projectName} yet. Use the MCP create_task tool to add tasks.`}
          </p>
        </div>
      ) : viewMode === 'board' ? (
        /* ─── KANBAN BOARD VIEW ─── */
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {columns.map((column) => {
            const colTasks = filteredTasks.filter((t) => t.status === column.id);

            return (
              <div
                key={column.id}
                className="flex flex-col rounded-xl border border-border/80 bg-surface/30 p-3.5"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-3 border-b border-border/60">
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${column.dotClass}`} />
                    <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                      {column.label}
                    </span>
                  </div>
                  <span className={`badge-counter ${column.badgeClass}`}>
                    {colTasks.length}
                  </span>
                </div>

                {/* Column Task Cards */}
                <div className="mt-3 space-y-2.5 flex-1 min-h-[140px]">
                  {colTasks.length === 0 ? (
                    <div className="flex h-28 items-center justify-center rounded-lg border border-dashed border-border/60 text-center text-xs text-muted">
                      No tasks in {column.label}
                    </div>
                  ) : (
                    colTasks.map((task) => (
                      <div
                        key={task.id}
                        className="glass-card group p-4 cursor-pointer transition-all hover:border-border-strong hover:shadow-md"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-sm font-semibold text-foreground leading-snug group-hover:text-accent transition-colors">
                            {task.title}
                          </h4>
                          <span className={`badge ${statusBadge(task.status)} shrink-0 text-[0.625rem]`}>
                            {task.status.replace('_', ' ')}
                          </span>
                        </div>

                        {task.description && (
                          <p className="mt-2 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                            {task.description}
                          </p>
                        )}

                        <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-2.5 text-[0.6875rem] text-muted">
                          <div className="flex items-center gap-1.5">
                            {task.assignee_id ? (
                              <span className="inline-flex items-center gap-1 text-foreground font-medium">
                                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                                Assigned
                              </span>
                            ) : (
                              <span>Unassigned</span>
                            )}
                          </div>
                          <span className="font-mono text-[0.625rem]">#{task.id.slice(0, 6)}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ─── STRUCTURED LIST / TABLE VIEW ─── */
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="w-12 text-center">Status</th>
                  <th>Task Title</th>
                  <th>Description</th>
                  <th>Assignee</th>
                  <th>State</th>
                  <th className="text-right">Task ID</th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.map((task) => (
                  <tr key={task.id} className="transition-colors hover:bg-surface-hover">
                    <td className="text-center">
                      <span className={`inline-block glow-dot ${statusDot(task.status)}`} />
                    </td>
                    <td>
                      <span className="text-sm font-semibold text-foreground">{task.title}</span>
                    </td>
                    <td>
                      <span className="text-xs text-muted-foreground line-clamp-1 max-w-md">
                        {task.description || '—'}
                      </span>
                    </td>
                    <td>
                      {task.assignee_id ? (
                        <span className="inline-flex items-center gap-1.5 rounded bg-surface-elevated px-2 py-0.5 text-xs text-foreground font-medium">
                          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                          Assigned
                        </span>
                      ) : (
                        <span className="text-xs text-muted">Unassigned</span>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${statusBadge(task.status)}`}>
                        {task.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="text-right font-mono text-[0.6875rem] text-muted">
                      {task.id.slice(0, 8)}...
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
