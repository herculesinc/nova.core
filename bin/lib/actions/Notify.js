"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// ACTION DEFINITION
// =================================================================================================
exports.notify = async function notify(inputs) {
    if (inputs) {
        await this.notify(inputs);
    }
};
exports.notify.merge = function (i1, i2) {
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
    for (let n2 of i2) {
        for (let i = 0; i < merged.length; i++) {
            let m = merge(merged[i], n2);
            if (m) {
                merged[i] = m;
                n2 = undefined;
                break;
            }
        }
        if (n2) {
            merged.push(n2);
        }
    }
    return merged;
};
// HELPER FUNCTIONS
// =================================================================================================
function merge(n1, n2) {
    if (n1 == n2)
        return n1;
    if (!n1)
        return n2;
    if (!n2)
        return n1;
    let merged;
    if (n1.merge) {
        merged = n1.merge(n2);
    }
    if (!merged && n2.merge) {
        n2.merge(n1);
    }
    return merged;
}
//# sourceMappingURL=Notify.js.map