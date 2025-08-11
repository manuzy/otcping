// Shared response utilities for Supabase Edge Functions

export interface StandardSuccessResponse<T = any> {
  success: true;
  data: T;
  requestId?: string;
  timestamp: string;
  processingTimeMs?: number;
}

export interface PaginatedResponse<T = any> {
  success: true;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
  timestamp: string;
}

export class ResponseBuilder {
  private corsHeaders: Record<string, string>;
  private startTime: number;

  constructor(corsHeaders: Record<string, string>, startTime?: number) {
    this.corsHeaders = corsHeaders;
    this.startTime = startTime || Date.now();
  }

  // Create successful response
  success<T>(data: T, statusCode: number = 200): Response {
    const response: StandardSuccessResponse<T> = {
      success: true,
      data,
      timestamp: new Date().toISOString(),
      processingTimeMs: Date.now() - this.startTime
    };

    return new Response(
      JSON.stringify(response),
      {
        status: statusCode,
        headers: { ...this.corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  // Create paginated response
  paginated<T>(
    data: T[],
    page: number,
    limit: number,
    total: number,
    statusCode: number = 200
  ): Response {
    const response: PaginatedResponse<T> = {
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        hasMore: (page * limit) < total
      },
      timestamp: new Date().toISOString()
    };

    return new Response(
      JSON.stringify(response),
      {
        status: statusCode,
        headers: { ...this.corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  // Create simple data response (for backward compatibility)
  json<T>(data: T, statusCode: number = 200): Response {
    return new Response(
      JSON.stringify(data),
      {
        status: statusCode,
        headers: { ...this.corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  // Handle CORS preflight
  static cors(corsHeaders: Record<string, string>): Response {
    return new Response(null, { headers: corsHeaders });
  }
}

// Standard CORS headers for all functions
export const defaultCorsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
};