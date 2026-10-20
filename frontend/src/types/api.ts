/** API types matching backend models */

export type ContentType = 'text' | 'json' | 'code' | 'log' | 'markdown' | 'yaml';

export type CompressionAlgorithm =
  | 'trim_whitespace'
  | 'remove_comments'
  | 'minify_json'
  | 'minify_code'
  | 'log_summarize'
  | 'deduplicate'
  | 'semantic_merge'
  | 'aggressive'
  | 'balanced'
  | 'conservative';

export interface CompressionRequest {
  content: string;
  content_type: ContentType;
  algorithm: CompressionAlgorithm;
  target_reduction?: number;
  preserve_structure: boolean;
}

export interface CompressionResponse {
  original_content: string;
  compressed_content: string;
  original_tokens: number;
  compressed_tokens: number;
  compression_ratio: number;
  tokens_saved: number;
  reduction_percentage: number;
  algorithm_used: CompressionAlgorithm;
  content_type: ContentType;
  processing_time_ms: number;
}

export interface TokenEstimateRequest {
  content: string;
  model?: string;
}

export interface TokenEstimateResponse {
  estimated_tokens: number;
  character_count: number;
  model: string;
}

export interface CompressionHistoryItem {
  id: number;
  user_id: string;
  original_content: string;
  compressed_content: string;
  original_tokens: number;
  compressed_tokens: number;
  compression_ratio: number;
  content_type: ContentType;
  algorithm: CompressionAlgorithm;
  created_at: string; // ISO datetime
}

export interface CompressionHistoryResponse {
  items: CompressionHistoryItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface AuthUrlResponse {
  auth_url: string;
  state: string;
  nonce: string;
  code_verifier: string;
}

export interface TokenExchangeRequest {
  code: string;
  code_verifier: string;
  redirect_uri: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  id_token?: string;
}

export interface UserInfo {
  sub: string;
  email?: string;
  username?: string;
  roles: string[];
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LogoutResponse {
  message: string;
  logout_url?: string;
}

export interface HealthResponse {
  status: string;
  app: string;
  version: string;
  environment: string;
}