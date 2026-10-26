//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { Item } from './Item.js';
import { AlertSubscription } from './AlertSubscription.js';
import type { UniversalAppSchema } from '@rayfin-app/shared';

export type { UniversalAppSchema };
export { Item, AlertSubscription };

export const schema = [Item, AlertSubscription];
