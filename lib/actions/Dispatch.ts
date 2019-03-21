// IMPORTS
// =================================================================================================
import { Action, Task } from '@nova/core';

// INTERFACES
// =================================================================================================
type Inputs = Task | Task[];

// ACTION DEFINITION
// =================================================================================================
export const dispatch: Action<Inputs,any> = async function dispatch(inputs: Inputs): Promise<any> {
    if (inputs) {
        await this.dispatch(inputs as any);
    }
};

dispatch.merge = function(i1: Inputs, i2: Inputs): Inputs {
    if (i1 == i2) return i1;
    if (!i1) return i2;
    if (!i2) return i1;

    let merged = Array.isArray(i1) ? [...i1] : [i1];
    if (!Array.isArray(i2)) {
        i2 = [i2];
    }

    for (let t2 of i2) {
        for (let i = 0; i < merged.length; i++) {
            let m = merge(merged[i], t2);
            if (m) {
                merged[i] = m;
                t2 = undefined as any;
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
function merge(t1: Task, t2: Task): Task | undefined {
    if (t1 == t2) return t1;
    if (!t1) return t2;
    if (!t2) return t1;

    let merged: Task | undefined;
    if (t1.merge) {
        merged = t1.merge(t2);
    }

    if (!merged && t2.merge) {
        t2.merge(t1);
    }

    return merged;
}
