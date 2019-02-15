// IMPORTS
// =================================================================================================
import {Dispatcher, Task} from '@nova/core';

// CLASS DEFINITION
// =================================================================================================
export class MockDispatcher implements Dispatcher {
    send(task: Task | Task[]): Promise<any> {
        return Promise.resolve();
    }
}

export class MockTask implements Task {
    name = 'task';
    payload = {foo: 'bar'};

    merge(notice: Task): Task {
        return notice;
    }
}
