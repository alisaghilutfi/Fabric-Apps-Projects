//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import type { OpaqueSession } from '@microsoft/rayfin-auth';
import { createContext, useContext } from 'react';

import type { AuthConfig } from '@/services/rayfin-auth.service';

export interface AuthContextValue {
  session: OpaqueSession | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  canSignIn: boolean;
  signIn: () => Promise<void>;
  isSigningIn: boolean;
  signInError: Error | null;
  config: AuthConfig;
  error: Error | null;
}

export const AuthContext = createContext<AuthContextValue | undefined>(
  undefined
);

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
