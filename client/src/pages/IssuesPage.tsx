import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import { getLocalDateString } from '../lib/date-utils';
import type { Issue } from '../../../shared/types';
import IssuesByDayBar from '../components/IssuesByDayBar';

interface IssueFormProps {
  issue?: Issue;
  onSave: () => void;
  onCancel: () => void;
}

function IssueForm({ issue, onSave, onCancel }: IssueFormProps) {
  const [date, setDate] = useState(issue?.date || getLocalDateString());
  const [title, setTitle] = useState(issue?.title || '');
  const [severity, setSeverity] = useState(issue?.severity?.toString() || '0');
  const [description, setDescription] = useState(issue?.description || '');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title || !date) return;

    setSubmitting(true);
    try {
      const data = {
        date,
        title,
        severity: parseInt(severity, 10),
        description: description || undefined,
      };

      if (issue) {
        await api.issues.update(issue.id, data);
      } else {
        await api.issues.create(data);
      }
      onSave();
    } catch (error) {
      console.error('Failed to save issue:', error);
      alert('Failed to save issue');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="card padded mb-4">
      <h2 className="h2">{issue ? 'Edit Issue' : 'New Issue'}</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="date" className="text-sm text-muted mb-2">Date *</label>
          <input
            id="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className="input"
          />
        </div>
        <div>
          <label htmlFor="title" className="text-sm text-muted mb-2">Title *</label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="Brief description of the issue"
            className="input"
            maxLength={255}
          />
        </div>
        <div>
          <label htmlFor="severity" className="text-sm text-muted mb-2">Severity * (0-5)</label>
          <input
            id="severity"
            type="number"
            min="0"
            max="5"
            value={severity}
            onChange={(e) => setSeverity(e.target.value)}
            required
            className="input"
          />
        </div>
        <div>
          <label htmlFor="description" className="text-sm text-muted mb-2">Description</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Detailed notes (optional)"
            className="input"
            rows={4}
            style={{ resize: 'vertical' }}
          />
        </div>
        <div className="row gap-4">
          <button type="submit" disabled={submitting} className={`btn ${submitting ? 'btn-ghost' : 'btn-primary'}`}>
            {submitting ? 'Saving...' : 'Save'}
          </button>
          <button type="button" onClick={onCancel} className="btn btn-ghost">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

export default function IssuesPage() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [editingIssue, setEditingIssue] = useState<Issue | undefined>();
  const [days, setDays] = useState<number>(14);
  const [totals, setTotals] = useState<Array<{ date: string; total: number }>>([]);

  const loadIssues = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.issues.list({ page, per_page: perPage, search: search || undefined });
      setIssues(data.issues);
      setTotalPages(data.pagination.total_pages);
      setTotal(data.pagination.total);
    } catch (error) {
      console.error('Failed to load issues:', error);
    } finally {
      setLoading(false);
    }
  }, [page, perPage, search]);

  useEffect(() => {
    loadIssues();
  }, [loadIssues]);

  useEffect(() => {
    loadTotals(days);
  }, [days]);

  async function loadTotals(d: number) {
    try {
      const res = await api.stats.issuesByDay(d);
      setTotals(res.totals);
    } catch (error) {
      console.error('Failed to load issue totals:', error);
    }
  }

  function handleNewIssue() {
    setEditingIssue(undefined);
    setShowForm(true);
  }

  function handleEditIssue(issue: Issue) {
    setEditingIssue(issue);
    setShowForm(true);
  }

  function handleFormSave() {
    setShowForm(false);
    setEditingIssue(undefined);
    loadIssues();
  }

  function handleFormCancel() {
    setShowForm(false);
    setEditingIssue(undefined);
  }

  async function handleDeleteIssue(issue: Issue) {
    if (!confirm(`Delete issue "${issue.title}"?`)) return;

    try {
      await api.issues.delete(issue.id);
      loadIssues();
    } catch (error) {
      console.error('Failed to delete issue:', error);
      alert('Failed to delete issue');
    }
  }

  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1); // Reset to first page on search
  }

  function handlePerPageChange(value: number) {
    setPerPage(value);
    setPage(1); // Reset to first page when changing page size
  }

  if (loading && issues.length === 0) {
    return <div className="text-muted">Loading...</div>;
  }

  return (
    <div>
      <h1 className="h1 mb-4">Issues</h1>

      <div className="card padded mb-4">
        <div className="space-between items-center">
          <div className="row">
            <div className="font-medium mr-3">Issue severity per day</div>
            <div className="row">
              <label className="text-sm text-muted mr-2" htmlFor="daysInput">Days</label>
              <input
                id="daysInput"
                type="number"
                min={1}
                max={365}
                value={days}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!isNaN(val)) setDays(Math.max(1, Math.min(365, val)));
                }}
                className="input"
                style={{ width: 96 }}
              />
            </div>
          </div>
        </div>
        <div className="mt-4">
          <IssuesByDayBar totals={totals} />
        </div>
      </div>

      {showForm ? (
        <IssueForm
          issue={editingIssue}
          onSave={handleFormSave}
          onCancel={handleFormCancel}
        />
      ) : (
        <>
          <div className="card padded mb-4">
            <div className="row gap-4" style={{ alignItems: 'end' }}>
              <div style={{ flex: 1 }}>
                <label htmlFor="search" className="text-sm text-muted mb-2">Search</label>
                <input
                  id="search"
                  type="text"
                  value={search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="Search title or description..."
                  className="input"
                />
              </div>
              <button onClick={handleNewIssue} className="btn btn-primary">
                New Issue
              </button>
            </div>
          </div>

          <div>
            <div className="card">
              {issues.length === 0 ? (
                <div className="padded center text-muted">
                  {search ? 'No issues found matching your search.' : 'No issues yet. Create your first issue above!'}
                </div>
              ) : (
                <table className="table">
                  <thead className="thead">
                    <tr>
                      <th className="th text-muted">Date</th>
                      <th className="th text-muted">Title</th>
                      <th className="th text-muted">Severity</th>
                      <th className="th text-muted text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {issues.map((issue) => (
                      <tr
                        key={issue.id}
                        className="tr"
                        style={{ cursor: 'pointer' }}
                        onClick={() => handleEditIssue(issue)}
                      >
                        <td className="td">
                          {new Date(issue.date).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="td">{issue.title}</td>
                        <td className="td">{issue.severity}</td>
                        <td className="td text-right" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleDeleteIssue(issue)}
                            className="btn btn-danger text-sm"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {totalPages > 1 && (
              <div className="card padded mt-4">
                <div className="row gap-4" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
                  <div className="row gap-2" style={{ alignItems: 'center' }}>
                    <span className="text-sm text-muted">Per page:</span>
                    <select
                      value={perPage}
                      onChange={(e) => handlePerPageChange(parseInt(e.target.value, 10))}
                      className="input"
                      style={{ width: 80 }}
                    >
                      <option value="10">10</option>
                      <option value="25">25</option>
                      <option value="50">50</option>
                    </select>
                  </div>
                  <div className="row gap-2" style={{ alignItems: 'center' }}>
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="btn btn-ghost text-sm"
                    >
                      Previous
                    </button>
                    <span className="text-sm text-muted">
                      Page {page} of {totalPages} ({total} total)
                    </span>
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="btn btn-ghost text-sm"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
