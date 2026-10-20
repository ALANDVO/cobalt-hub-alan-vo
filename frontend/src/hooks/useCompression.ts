/** Compression operations hook */

import { useState, useCallback } from 'react';
import { apiClient } from '../api/client';
import { useToast } from './useToast';
import type { CompressionRequest, CompressionResponse, TokenEstimateRequest, CompressionHistoryResponse, ContentType, CompressionAlgorithm } from '../types/api';

export function useCompression() {
  const [isCompressing, setIsCompressing] = useState(false);
  const [isEstimating, setIsEstimating] = useState(false);
  const [lastResult, setLastResult] = useState<CompressionResponse | null>(null);
  const { success, error } = useToast();

  const compress = useCallback(async (request: CompressionRequest): Promise<CompressionResponse | null> => {
    setIsCompressing(true);
    try {
      const result = await apiClient.compress(request);
      setLastResult(result);
      success('Compression complete', `Saved ${result.tokens_saved} tokens (${result.reduction_percentage.toFixed(1)}% reduction)`);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Compression failed';
      error('Compression failed', message);
      return null;
    } finally {
      setIsCompressing(false);
    }
  }, [success, error]);

  const estimateTokens = useCallback(async (request: TokenEstimateRequest) => {
    setIsEstimating(true);
    try {
      const result = await apiClient.estimateTokens(request);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Token estimation failed';
      error('Estimation failed', message);
      return null;
    } finally {
      setIsEstimating(false);
    }
  }, [error]);

  return {
    compress,
    estimateTokens,
    isCompressing,
    isEstimating,
    lastResult,
    clearResult: () => setLastResult(null),
  };
}

export function useHistory() {
  const [history, setHistory] = useState<CompressionHistoryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const { error } = useToast();

  const fetchHistory = useCallback(async (
    pageNum: number = 1,
    pageSize: number = 20,
    contentType?: ContentType,
    algorithm?: CompressionAlgorithm
  ) => {
    setIsLoading(true);
    try {
      const result = await apiClient.getHistory(pageNum, pageSize, contentType, algorithm);
      setHistory(result);
      setPage(pageNum);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load history';
      error('History load failed', message);
    } finally {
      setIsLoading(false);
    }
  }, [error]);

  const deleteItem = useCallback(async (itemId: number) => {
    try {
      await apiClient.deleteHistoryItem(itemId);
      // Refresh current page
      await fetchHistory(page);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Delete failed';
      error('Delete failed', message);
    }
  }, [error, fetchHistory, page]);

  const clearAll = useCallback(async () => {
    try {
      await apiClient.clearHistory();
      setHistory(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Clear failed';
      error('Clear failed', message);
    }
  }, [error]);

  return {
    history,
    isLoading,
    page,
    fetchHistory,
    deleteItem,
    clearAll,
  };
}