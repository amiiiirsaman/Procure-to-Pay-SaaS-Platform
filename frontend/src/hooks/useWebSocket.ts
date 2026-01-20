import { useEffect, useRef, useCallback, useState } from 'react';

interface WebSocketMessage {
  type: string;
  workflow_id?: string;
  agent?: string;
  action?: string;
  details?: Record<string, any>;
  data?: Record<string, any>;
  message?: string;
}

type WebSocketCallback = (message: WebSocketMessage) => void;

const WS_BASE_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000';

export const useWebSocket = (workflowId: string, onMessage?: WebSocketCallback) => {
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const callbackRef = useRef(onMessage);

  // Update callback ref when it changes
  useEffect(() => {
    callbackRef.current = onMessage;
  }, [onMessage]);

  const connect = useCallback(() => {
    try {
      const url = `${WS_BASE_URL}/ws/workflow/${workflowId}`;
      console.log('Connecting to WebSocket:', url);

      wsRef.current = new WebSocket(url);

      wsRef.current.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setError(null);
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as WebSocketMessage;
          console.log('Received WebSocket message:', message);
          callbackRef.current?.(message);
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
        }
      };

      wsRef.current.onerror = (event) => {
        console.error('WebSocket error:', event);
        setError('WebSocket connection error');
        setIsConnected(false);
      };

      wsRef.current.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('WebSocket connection error:', message);
      setError(message);
      setIsConnected(false);
    }
  }, [workflowId]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
      setIsConnected(false);
    }
  }, []);

  const send = useCallback((message: Record<string, any>) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected, cannot send message');
    }
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    isConnected,
    error,
    send,
    disconnect,
    reconnect: connect,
  };
};

/**
 * Hook to listen for specific agent updates
 */
export const useAgentUpdates = (
  workflowId: string,
  agentName?: string,
  onUpdate?: (update: WebSocketMessage) => void
) => {
  const handleMessage = useCallback(
    (message: WebSocketMessage) => {
      if (message.type === 'agent_update') {
        if (!agentName || message.agent === agentName) {
          onUpdate?.(message);
        }
      }
    },
    [agentName, onUpdate]
  );

  return useWebSocket(workflowId, handleMessage);
};

/**
 * Hook to listen for workflow status updates
 */
export const useWorkflowStatus = (
  workflowId: string,
  onStatusChange?: (status: Record<string, any>) => void
) => {
  const handleMessage = useCallback(
    (message: WebSocketMessage) => {
      if (message.type === 'workflow_status' || message.type === 'status_update') {
        onStatusChange?.(message.data || message);
      }
    },
    [onStatusChange]
  );

  return useWebSocket(workflowId, handleMessage);
};
