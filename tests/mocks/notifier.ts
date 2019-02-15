// IMPORTS
// =================================================================================================
import {Notice, Notifier} from '@nova/core';

// CLASS DEFINITION
// =================================================================================================
export class MockNotifier implements Notifier {
    send(target: string, notice: Notice | Notice[]): Promise<any> {
        return Promise.resolve();
    }
}

export class MockNotice implements Notice {
    event = 'event';
    payload = {foo: 'bar'};

    merge(notice: Notice): Notice {
        return notice;
    }
}
