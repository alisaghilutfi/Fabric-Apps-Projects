//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import type {
  ExecuteQueryInput,
  FabricSemanticModelTabularResponse,
  SemanticModelQueryResult,
} from '@microsoft/rayfin-connector-fabric-semanticmodel';
import { toQueryResult } from '@microsoft/rayfin-connector-fabric-semanticmodel';
import { useCallback, useEffect, useRef, useState } from 'react';

import { getRayfinClient } from '@/lib/rayfin-client';

type ExecuteQueryClient = {
  executeQuery(
    input: ExecuteQueryInput
  ): Promise<FabricSemanticModelTabularResponse>;
};

interface UseSemanticModelQueryOptions {
  connection: string;
  query: string;
}

interface UseSemanticModelQueryResult {
  data: SemanticModelQueryResult | undefined;
  isLoading: boolean;
  error: Error | undefined;
  refetch: () => Promise<void>;
}

interface QueryState {
  connection: string;
  query: string;
  data: SemanticModelQueryResult | undefined;
  isLoading: boolean;
  error: Error | undefined;
}

function notRegistered(connection: string): string {
  return (
    `No connector named "${connection}". Register it in connectorConfigs and ` +
    `connectorRuntimes (packages/frontend/src/lib/connectors.ts), and check the name matches ` +
    `rayfin/rayfin.yml.`
  );
}

async function executeSemanticModelQuery(
  connection: string,
  query: string
): Promise<SemanticModelQueryResult> {
  const client = await getRayfinClient();
  const connectors = (client as { connectors?: unknown }).connectors;

  if (!connectors) {
    throw new Error(
      `This app's Rayfin client has no "connectors". ` +
        `packages/frontend/src/lib/rayfin-client.ts ` +
        `builds a plain RayfinClient; querying a semantic model needs ` +
        `ConnectorsRayfinClient constructed with connectorConfigs and ` +
        `connectorRuntimes from packages/frontend/src/lib/connectors.ts.`
    );
  }

  let connector: ExecuteQueryClient | undefined;
  try {
    connector = (connectors as Record<string, ExecuteQueryClient | undefined>)[
      connection
    ];
  } catch (err) {
    throw new Error(notRegistered(connection), { cause: err });
  }

  if (!connector) throw new Error(notRegistered(connection));

  return toQueryResult(await connector.executeQuery({ query }));
}

export function useSemanticModelQuery(
  options: UseSemanticModelQueryOptions
): UseSemanticModelQueryResult {
  const { connection, query } = options;
  const canExecute = Boolean(connection && query);
  const [state, setState] = useState<QueryState>(() => ({
    connection,
    query,
    data: undefined,
    isLoading: canExecute,
    error: undefined,
  }));

  if (state.connection !== connection || state.query !== query) {
    setState({
      connection,
      query,
      data: canExecute ? state.data : undefined,
      isLoading: canExecute,
      error: undefined,
    });
  }

  const latestRequest = useRef(0);

  const execute = useCallback(async () => {
    const requestId = ++latestRequest.current;
    if (!canExecute) return;

    let result: SemanticModelQueryResult | undefined;
    let thrown: Error | undefined;
    try {
      result = await executeSemanticModelQuery(connection, query);
    } catch (err) {
      thrown =
        err instanceof Error ? err : new Error(String(err), { cause: err });
    }

    if (requestId !== latestRequest.current) return;

    setState((current) => {
      if (current.connection !== connection || current.query !== query) {
        return current;
      }
      return {
        connection,
        query,
        data: thrown ? undefined : (result ?? current.data),
        isLoading: false,
        error: thrown,
      };
    });
  }, [connection, query, canExecute]);

  const refetch = useCallback(async () => {
    setState((current) => ({
      ...current,
      data: canExecute ? current.data : undefined,
      isLoading: canExecute,
      error: undefined,
    }));
    await execute();
  }, [execute, canExecute]);

  useEffect(() => {
    void execute();
    return () => {
      latestRequest.current += 1;
    };
  }, [execute]);

  return {
    data: state.data,
    isLoading: state.isLoading,
    error: state.error,
    refetch,
  };
}
