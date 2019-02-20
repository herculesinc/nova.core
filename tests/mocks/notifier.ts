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
    target = 'target';
    payload = { foo: 'bar' };

    merge(notice: Notice): Notice {
        return notice;
    }
}
