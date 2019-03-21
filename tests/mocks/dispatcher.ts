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
    readonly name       : string;
    readonly payload    : object;
    readonly delay?     : number;
    readonly ttl?       : number;

    constructor(name: string = 'task', payload?: any) {
        this.name = name;
        this.payload = payload;
    }

    merge(notice: Task): Task | undefined {
        return undefined;
    }

    toJSON() {
        return this.name.charAt(0).toUpperCase() + this.name.slice(1);
    }
}
