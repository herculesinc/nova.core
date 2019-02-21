// IMPORTS
// =================================================================================================
import { Notice, Notifier } from '@nova/core';

// CLASS DEFINITION
// =================================================================================================
export class MockNotifier implements Notifier {
    send(notice: Notice | Notice[]): Promise<any> {
        return Promise.resolve();
    }
}

export class MockNotice implements Notice {
    readonly target: string;
    readonly payload: object;

    constructor(target: string = 'target', payload?: any) {
        this.target = target;
        this.payload = payload;
    }

    merge(notice: Notice): Notice {
        return undefined;
    }

    toJSON() {
        return this.target.charAt(0).toUpperCase() + this.target.slice(1);
    }
}
