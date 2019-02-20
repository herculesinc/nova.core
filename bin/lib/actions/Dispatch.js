"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// ACTION DEFINITION
// =================================================================================================
exports.dispatch = async function dispatch(inputs) {
    if (inputs) {
        await this.dispatch(inputs);
    }
};
exports.dispatch.merge = function (i1, i2) {
    if (i1 == i2)
        return i1;
    if (!i1)
        return i2;
    if (!i2)
        return i1;
    let merged = Array.isArray(i1) ? [...i1] : [i1];
    if (!Array.isArray(i2)) {
        i2 = [i2];
    }
    for (let t2 of i2) {
        for (let i = 0; i < merged.length; i++) {
            let m = merge(merged[i], t2);
            if (m) {
                merged[i] = m;
                t2 = undefined;
                break;
            }
        }
        if (t2) {
            merged.push(t2);
        }
    }
    return merged;
};
// HELPER FUNCTIONS
// =================================================================================================
function merge(t1, t2) {
    if (t1 == t2)
        return t1;
    if (!t1)
        return t2;
    if (!t2)
        return t1;
    let merged;
    if (t1.merge) {
        merged = t1.merge(t2);
    }
    if (!merged && t2.merge) {
        t2.merge(t1);
    }
    return merged;
}
//# sourceMappingURL=Dispatch.js.map