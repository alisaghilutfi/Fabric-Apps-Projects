//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import react from '@vitejs/plugin-react-swc';
import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    react({
      useAtYourOwnRisk_mutateSwcOptions(options) {
        options.jsc.parser.decorators = true;
        options.jsc.transform.decoratorVersion = '2022-03';
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: ['src/test/setup.ts'],
    globals: true,
    testTimeout: 15_000,
    include: ['src/**/*.spec.{ts,tsx}'],
    passWithNoTests: true,
  },
  resolve: {
    alias: { '@': resolve(import.meta.dirname, 'src') },
  },
});
