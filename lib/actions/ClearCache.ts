// IMPORTS
// =================================================================================================
import { Action } from '@nova/core';

// INTERFACES
// =================================================================================================
type Inputs = string[];

// ACTION DEFINITION
// =================================================================================================
export const clearCache: Action<Inputs,any> = async function clearCache(inputs: Inputs) {
    if (inputs && inputs.length > 0) {
        this.cache.clear(inputs);
    }
};

clearCache.merge = function(i1: Inputs, i2: Inputs): Inputs {
    if (i1 == i2) return i1;
    if (!i1) return i2;
    if (!i2) return i1;

    return Array.from(new Set([...i1, ...i2]));
};
