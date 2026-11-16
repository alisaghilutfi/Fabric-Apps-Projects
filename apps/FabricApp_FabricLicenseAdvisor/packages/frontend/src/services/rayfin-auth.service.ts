//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import type { OpaqueSession } from '@microsoft/rayfin-auth';
import {
  ensureSignedInWithFabric,
  initEmbeddedAuth as sdkInitEmbeddedAuth,
  signInWithBrokeredToken,
  type FabricAuthOptions,
} from '@microsoft/rayfin-auth-provider-fabric';
import type RayfinClient from '@microsoft/rayfin-client';

import { getRayfinClient, MissingRayfinConfigError } from '@/lib/rayfin-client';

export type AuthConfig =
  | { readonly kind: 'ready' }
  | { readonly kind: 'not-deployed' }
  | { readonly kind: 'incomplete'; readonly missing: readonly string[] }
  | { readonly kind: 'config-error'; readonly message: string };

export interface IAuthService {
  readonly config: AuthConfig;
  readonly canSignIn: boolean;
  resolveSession(): Promise<OpaqueSession | null>;
  signIn(): Promise<OpaqueSession>;
  onSessionChange?(
    listener: (session: OpaqueSession | null) => void
  ): () => void;
}

export async function bootstrapAuth(): Promise<IAuthService> {
  let client: Awaited<ReturnType<typeof getRayfinClient>>;
  try {
    client = await getRayfinClient();
  } catch (error) {
    if (error instanceof MissingRayfinConfigError) {
      return new UnconfiguredAuthService({
        kind: 'incomplete',
        missing: error.missing,
      });
    }

    return new UnconfiguredAuthService({
      kind: 'config-error',
      message: error instanceof Error ? error.message : String(error),
    });
  }

  const {
    workspaceId,
    itemId: projectId,
    portalUrl: fabricPortalUrl,
  } = client.runtimeConfig ?? {};

  if (!workspaceId || !projectId || !fabricPortalUrl) {
    return new UnconfiguredAuthService({ kind: 'not-deployed' });
  }

  const fabricOptions: FabricAuthOptions = {
    workspaceId,
    projectId,
    fabricPortalUrl,
    returnOrigin: window.location.origin,
  };

  return new RayfinAuthService(client, fabricOptions);
}

class UnconfiguredAuthService implements IAuthService {
  readonly canSignIn = false;

  constructor(readonly config: AuthConfig) {}

  async resolveSession(): Promise<OpaqueSession | null> {
    return null;
  }

  async signIn(): Promise<OpaqueSession> {
    throw new Error('Sign-in is unavailable until Rayfin is configured.');
  }
}

class RayfinAuthService implements IAuthService {
  readonly config: AuthConfig = { kind: 'ready' };
  readonly canSignIn = true;

  constructor(
    private readonly client: Pick<RayfinClient, 'auth'>,
    private readonly fabricOptions: FabricAuthOptions
  ) {}

  async resolveSession(): Promise<OpaqueSession | null> {
    const embeddedSession = await sdkInitEmbeddedAuth(
      this.client.auth,
      this.fabricOptions
    );
    if (embeddedSession) return embeddedSession;

    const currentSession = this.client.auth.getSession();
    if (currentSession.isAuthenticated && !currentSession.isAnonymous)
      return currentSession;
    if (currentSession.isAnonymous) await this.client.auth.signOut();

    if (this.client.auth.hasRefreshToken()) {
      try {
        await this.client.auth.refreshSession();
        const refreshedSession = this.client.auth.getSession();
        if (refreshedSession.isAuthenticated && !refreshedSession.isAnonymous)
          return refreshedSession;
      } catch {
        // Continue to the environment-specific silent paths.
      }
    }

    if (import.meta.env.DEV) {
      const localDev = await import('@microsoft/rayfin-local-dev');
      if (localDev.isRayfinLocalAutoLoginEnabled()) {
        const sessionToken = await localDev.fetchRayfinLocalSessionToken();
        if (!sessionToken) {
          throw new Error(
            'Local automatic sign-in is enabled, but no session token was returned.'
          );
        }
        return signInWithBrokeredToken(this.client.auth, sessionToken);
      }
    }
    return null;
  }

  async signIn(): Promise<OpaqueSession> {
    if (this.client.auth.getSession().isAnonymous)
      await this.client.auth.signOut();
    return ensureSignedInWithFabric(this.client.auth, this.fabricOptions);
  }

  onSessionChange(
    listener: (session: OpaqueSession | null) => void
  ): () => void {
    return this.client.auth.onSessionChange(listener);
  }
}
