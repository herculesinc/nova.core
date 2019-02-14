"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// ACTION DEFINITION
// =================================================================================================
exports.clearCache = async function clearCache(inputs) {
    if (inputs && inputs.length > 0) {
        this.cache.clear(inputs);
    }
};
exports.clearCache.merge = function (i1, i2) {
    if (i1 == i2)
        return i1;
    if (!i1)
        return i2;
    if (!i2)
        return i1;
    return Array.from(new Set([...i1, ...i2]));
};
//# sourceMappingURL=ClearCache.js.map