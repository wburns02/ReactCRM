/**
 * Geocivix Permits List Component
 *
 * Displays permits synced from Williamson County, TN Geocivix portal.
 * Includes sync status, manual sync trigger, and permit data table.
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import {
  FileText,
  RefreshCw,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  Clock,
  Download
} from 'lucide-react';
import { getPermitDocumentUrl } from '@/utils/geocivixProxy';

interface GeocivixPermit {
  issuance_id: string;
  permit_number: string;
  permit_type: string;
  status: string;
  issue_date: string | null;
  expiration_date: string | null;
  issued_by: string | null;
  document_url: string | null;
  detail_url: string;
}

interface GeocivixStatus {
  portal_name: string;
  portal_url: string;
  last_synced: string | null;
  total_records: number;
  is_authenticated: boolean;
}

interface SyncResponse {
  status: string;
  synced_count: number;
  inserted: number;
  updated: number;
  errors: number;
  synced_at: string;
}

export function GeocivixPermitsList() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const pageSize = 50;

  // Fetch portal status
  const { data: portalStatus } = useQuery<GeocivixStatus>({
    queryKey: ['geocivix-status'],
    queryFn: async () => {
      const response = await apiClient.get('/geocivix/status');
      return response.data;
    },
    staleTime: 60000
  });

  // Fetch permits
  const { data: permitsData, isLoading, error } = useQuery({
    queryKey: ['geocivix-permits', page],
    queryFn: async () => {
      const response = await apiClient.get('/geocivix/permits', {
        params: { skip: page * pageSize, limit: pageSize }
      });
      return response.data;
    },
    staleTime: 30000
  });

  // Sync mutation
  const syncMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.post('/geocivix/sync');
      return response.data as SyncResponse;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['geocivix-permits'] });
      queryClient.invalidateQueries({ queryKey: ['geocivix-status'] });
    }
  });

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleDateString();
    } catch {
      return dateStr;
    }
  };

  const getStatusBadge = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower.includes('issued') || statusLower.includes('approved')) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <CheckCircle className="w-3 h-3 mr-1" />
          {status}
        </span>
      );
    }
    if (statusLower.includes('pending') || statusLower.includes('review')) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          <Clock className="w-3 h-3 mr-1" />
          {status}
        </span>
      );
    }
    if (statusLower.includes('expired') || statusLower.includes('closed') || statusLower.includes('denied')) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          <AlertCircle className="w-3 h-3 mr-1" />
          {status}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Williamson County, TN Permits
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Synced from Geocivix portal
          </p>
        </div>
        <div className="flex items-center space-x-4">
          {portalStatus?.last_synced && (
            <span className="text-sm text-gray-500">
              Last synced: {new Date(portalStatus.last_synced).toLocaleString()}
            </span>
          )}
          <button
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
            {syncMutation.isPending ? 'Syncing...' : 'Sync Now'}
          </button>
        </div>
      </div>

      {/* Sync Result Message */}
      {syncMutation.isSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4">
          <div className="flex">
            <CheckCircle className="h-5 w-5 text-green-400" />
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800">
                Sync completed successfully
              </p>
              <p className="text-sm text-green-700">
                {syncMutation.data.inserted} inserted, {syncMutation.data.updated} updated, {syncMutation.data.errors} errors
              </p>
            </div>
          </div>
        </div>
      )}

      {syncMutation.isError && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <p className="text-sm font-medium text-red-800">
                Sync failed
              </p>
              <p className="text-sm text-red-700">
                {(syncMutation.error as Error)?.message || 'Unknown error occurred'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FileText className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Permits
                  </dt>
                  <dd className="text-lg font-semibold text-gray-900">
                    {portalStatus?.total_records || permitsData?.total || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ExternalLink className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Source Portal
                  </dt>
                  <dd className="text-sm font-semibold text-gray-900 truncate">
                    <a
                      href={portalStatus?.portal_url || 'https://williamson.geocivix.com/secure/'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      Geocivix Portal
                    </a>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Clock className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Sync Status
                  </dt>
                  <dd className="text-sm font-semibold text-gray-900">
                    {portalStatus?.last_synced ? 'Active' : 'Never Synced'}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Permits Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto text-gray-400" />
            <p className="mt-2 text-gray-500">Loading permits...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <AlertCircle className="h-8 w-8 mx-auto text-red-400" />
            <p className="mt-2 text-red-500">Failed to load permits</p>
          </div>
        ) : (
          <>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Permit #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Issue Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Expiration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Document
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {permitsData?.permits?.map((permit: GeocivixPermit) => (
                  <tr key={permit.issuance_id || permit.permit_number} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <FileText className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-sm font-medium text-gray-900 font-mono">
                          {permit.permit_number}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {permit.permit_type}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(permit.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(permit.issue_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(permit.expiration_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {permit.document_url ? (
                        <a
                          href={getPermitDocumentUrl(`https://williamson.geocivix.com${permit.document_url}`) || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-indigo-600 hover:text-indigo-900"
                        >
                          <Download className="h-4 w-4 mr-1" />
                          View PDF
                        </a>
                      ) : (
                        <span className="text-gray-400">N/A</span>
                      )}
                    </td>
                  </tr>
                ))}
                {(!permitsData?.permits || permitsData.permits.length === 0) && (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      No permits found. Click "Sync Now" to fetch permits from Geocivix.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Pagination */}
            {permitsData && permitsData.total > pageSize && (
              <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => setPage(Math.max(0, page - 1))}
                    disabled={page === 0}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage(page + 1)}
                    disabled={(page + 1) * pageSize >= permitsData.total}
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Showing <span className="font-medium">{page * pageSize + 1}</span> to{' '}
                      <span className="font-medium">
                        {Math.min((page + 1) * pageSize, permitsData.total)}
                      </span>{' '}
                      of <span className="font-medium">{permitsData.total}</span> results
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                      <button
                        onClick={() => setPage(Math.max(0, page - 1))}
                        disabled={page === 0}
                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => setPage(page + 1)}
                        disabled={(page + 1) * pageSize >= permitsData.total}
                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                      >
                        Next
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default GeocivixPermitsList;
